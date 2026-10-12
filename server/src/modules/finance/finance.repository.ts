import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";

export const findApprovedUnbatchedClaims = () =>
  prisma.claim.findMany({
    where: {
      status: "APPROVED",
      payoutBatchId: null,
    },
    include: {
      employee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

export const findRecentPayoutBatches = () =>
  prisma.payoutBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      transactions: {
        include: {
          employee: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

export const withTransaction = <T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
): Promise<T> => prisma.$transaction(operation);
