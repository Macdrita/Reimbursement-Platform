import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const logAction = (
  userId: string,
  action: string,
  metadata: Prisma.InputJsonObject,
  ipAddress?: string
): void => {
  void prisma.auditLog
    .create({
      data: {
        userId,
        action,
        metadata,
        ipAddress,
      },
    })
    .catch((error: unknown) => {
      console.error("Audit log write failed:", error);
    });
};
