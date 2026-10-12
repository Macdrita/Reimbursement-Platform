import {
  ClaimStatus,
  PayoutBatchStatus,
  PayoutProvider,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import * as auditService from "../../services/audit.service";
import * as financeRepository from "./finance.repository";
import {
  assertRazorpayTestConfigured,
  createRazorpayTestPayout,
  mapRazorpayStatus,
  RazorpayConfigurationError,
  RazorpayRequestError,
} from "./razorpay.service";

export class ClaimSelectionError extends Error {}

export const getApprovedClaimsList = () =>
  financeRepository.findApprovedUnbatchedClaims();

export const getRecentPayoutBatches = () =>
  financeRepository.findRecentPayoutBatches();

export const executeRazorpayTestPayoutBatch = async (
  claimIds: string[],
  executorId: string,
  ipAddress?: string
) => {
  if (claimIds.length === 0 || new Set(claimIds).size !== claimIds.length) {
    throw new ClaimSelectionError(
      "Provide a non-empty list of unique claim IDs."
    );
  }

  assertRazorpayTestConfigured();

  const { batch, recipients } = await financeRepository.withTransaction(
    async (transaction) => {
      const claims = await transaction.claim.findMany({
        where: {
          id: { in: claimIds },
          status: ClaimStatus.APPROVED,
          payoutBatchId: null,
        },
        select: { id: true, amount: true, employeeId: true },
      });

      if (claims.length !== claimIds.length) {
        throw new ClaimSelectionError(
          "Every requested claim must be approved and not assigned to a payout batch."
        );
      }

      const amountByEmployee = new Map<string, number>();
      for (const claim of claims) {
        if (!Number.isFinite(claim.amount) || claim.amount <= 0) {
          throw new ClaimSelectionError(
            "Every claim must have a valid positive amount."
          );
        }
        const amountInPaise = Math.round(claim.amount * 100);
        amountByEmployee.set(
          claim.employeeId,
          (amountByEmployee.get(claim.employeeId) ?? 0) + amountInPaise
        );
      }

      const totalAmountInPaise = [...amountByEmployee.values()].reduce(
        (total, amount) => total + amount,
        0
      );
      if (!Number.isSafeInteger(totalAmountInPaise)) {
        throw new ClaimSelectionError("The total payout amount is too large.");
      }
      for (const amount of amountByEmployee.values()) {
        if (amount < 100) {
          throw new ClaimSelectionError(
            "Each employee payout must be at least ₹1.00."
          );
        }
      }

      const payoutBatch = await transaction.payoutBatch.create({
        data: {
          status: PayoutBatchStatus.PROCESSING,
          provider: PayoutProvider.RAZORPAYX_TEST,
          totalAmount: totalAmountInPaise / 100,
          executedById: executorId,
        },
      });

      const updateResult = await transaction.claim.updateMany({
        where: {
          id: { in: claimIds },
          status: ClaimStatus.APPROVED,
          payoutBatchId: null,
        },
        data: { payoutBatchId: payoutBatch.id },
      });
      if (updateResult.count !== claimIds.length) {
        throw new ClaimSelectionError(
          "One or more claims were assigned to another payout batch."
        );
      }

      const payoutRecipients = [...amountByEmployee.entries()].map(
        ([employeeId, amountInPaise]) => ({
          employeeId,
          amountInPaise,
          referenceId: randomUUID(),
        })
      );
      await transaction.payoutTransaction.createMany({
        data: payoutRecipients.map((recipient) => ({
          id: randomUUID(),
          batchId: payoutBatch.id,
          employeeId: recipient.employeeId,
          amount: recipient.amountInPaise / 100,
          referenceId: recipient.referenceId,
          status: PayoutBatchStatus.PROCESSING,
        })),
      });

      return { batch: payoutBatch, recipients: payoutRecipients };
    }
  );

  const failures: { employeeId: string; message: string }[] = [];
  for (const recipient of recipients) {
    let payout: Awaited<ReturnType<typeof createRazorpayTestPayout>>;
    try {
      payout = await createRazorpayTestPayout(
        recipient.employeeId,
        recipient.amountInPaise,
        recipient.referenceId,
        batch.id
      );
    } catch (error) {
      const payoutMayHaveBeenCreated =
        error instanceof RazorpayRequestError &&
        error.payoutMayHaveBeenCreated;
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit the test payout.";
      failures.push({ employeeId: recipient.employeeId, message });

      await financeRepository.withTransaction(async (transaction) => {
        await transaction.payoutTransaction.update({
          where: { referenceId: recipient.referenceId },
          data: {
            status: payoutMayHaveBeenCreated
              ? PayoutBatchStatus.PROCESSING
              : PayoutBatchStatus.FAILED,
          },
        });
        if (!payoutMayHaveBeenCreated) {
          await transaction.claim.updateMany({
            where: {
              payoutBatchId: batch.id,
              employeeId: recipient.employeeId,
            },
            data: { payoutBatchId: null },
          });
        }
        await updateBatchStatus(transaction, batch.id);
      });
      continue;
    }

    const nextStatus = await financeRepository.withTransaction(
      async (transaction) => {
        const existing = await transaction.payoutTransaction.findUniqueOrThrow({
          where: { referenceId: recipient.referenceId },
          select: { status: true },
        });
        const status =
          existing.status === PayoutBatchStatus.PROCESSING
            ? payout.status
            : existing.status;
        await transaction.payoutTransaction.update({
          where: { referenceId: recipient.referenceId },
          data: { razorpayPayoutId: payout.payoutId, status },
        });
        if (status === PayoutBatchStatus.FAILED) {
          await transaction.claim.updateMany({
            where: {
              payoutBatchId: batch.id,
              employeeId: recipient.employeeId,
            },
            data: { payoutBatchId: null },
          });
        }
        await updateBatchStatus(transaction, batch.id);
        return status;
      }
    );
    if (nextStatus === PayoutBatchStatus.FAILED) {
      failures.push({
        employeeId: recipient.employeeId,
        message: "Razorpay marked this test payout as failed.",
      });
    }
  }

  const completedBatch = await financeRepository.withTransaction(
    async (transaction) => {
      await updateBatchStatus(transaction, batch.id);
      return transaction.payoutBatch.findUniqueOrThrow({
        where: { id: batch.id },
        include: {
          transactions: {
            include: {
              employee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    }
  );

  auditService.logAction(
    executorId,
    "RAZORPAYX_TEST_PAYOUT_BATCH_SUBMITTED",
    {
      payoutBatchId: completedBatch.id,
      claimIds,
      totalAmount: completedBatch.totalAmount,
      status: completedBatch.status,
      failedPayoutCount: failures.length,
    } satisfies Prisma.InputJsonObject,
    ipAddress
  );

  return { payoutBatch: completedBatch, failures };
};

const updateBatchStatus = async (
  transaction: Prisma.TransactionClient,
  batchId: string
): Promise<void> => {
  const payouts = await transaction.payoutTransaction.findMany({
    where: { batchId },
    select: { status: true },
  });
  const status = payouts.some(
    (payout) => payout.status === PayoutBatchStatus.PROCESSING
  )
    ? PayoutBatchStatus.PROCESSING
    : payouts.some((payout) => payout.status === PayoutBatchStatus.FAILED)
      ? PayoutBatchStatus.FAILED
      : PayoutBatchStatus.COMPLETED;
  await transaction.payoutBatch.update({
    where: { id: batchId },
    data: { status },
  });
};

export const applyRazorpayWebhookUpdate = async (
  referenceId: string,
  razorpayPayoutId: string,
  providerStatus: string
): Promise<boolean> =>
  financeRepository.withTransaction(async (transaction) => {
    const payout = await transaction.payoutTransaction.findUnique({
      where: { referenceId },
      select: { batchId: true, employeeId: true },
    });
    if (!payout) return false;

    const status = mapRazorpayStatus(providerStatus);
    await transaction.payoutTransaction.update({
      where: { referenceId },
      data: { razorpayPayoutId, status },
    });
    if (status === PayoutBatchStatus.FAILED) {
      await transaction.claim.updateMany({
        where: {
          payoutBatchId: payout.batchId,
          employeeId: payout.employeeId,
        },
        data: { payoutBatchId: null },
      });
    }
    await updateBatchStatus(transaction, payout.batchId);
    return true;
  });

export { RazorpayConfigurationError };
