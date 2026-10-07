import { ClaimStatus, PayoutBatchStatus, Prisma } from "@prisma/client";
import * as auditService from "../../services/audit.service";
import * as financeRepository from "./finance.repository";

export class ClaimSelectionError extends Error {}

export const getApprovedClaimsList = () =>
  financeRepository.findApprovedUnbatchedClaims();

export const createPayoutBatch = async (
  claimIds: string[],
  executorId: string
) => {
  if (claimIds.length === 0 || new Set(claimIds).size !== claimIds.length) {
    throw new ClaimSelectionError(
      "Provide a non-empty list of unique claim IDs."
    );
  }

  const batch = await financeRepository.withTransaction(async (transaction) => {
    const claims = await transaction.claim.findMany({
      where: {
        id: { in: claimIds },
        status: ClaimStatus.APPROVED,
        payoutBatchId: null,
      },
      select: { id: true, amount: true },
    });

    if (claims.length !== claimIds.length) {
      throw new ClaimSelectionError(
        "Every requested claim must be approved and not assigned to a payout batch."
      );
    }

    const totalAmount = claims.reduce((total, claim) => total + claim.amount, 0);
    const payoutBatch = await transaction.payoutBatch.create({
      data: {
        status: PayoutBatchStatus.COMPLETED,
        totalAmount,
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

    return { ...payoutBatch, claimIds, totalAmount };
  });

  auditService.logAction(executorId, "PAYOUT_BATCH_EXECUTED", {
    payoutBatchId: batch.id,
    claimIds: batch.claimIds,
    totalAmount: batch.totalAmount,
  } satisfies Prisma.InputJsonObject);

  return batch;
};
