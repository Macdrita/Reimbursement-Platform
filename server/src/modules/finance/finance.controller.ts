import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import {
  ClaimSelectionError,
  createPayoutBatch,
  getApprovedClaimsList,
} from "./finance.service";

export const getApprovedClaims = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const claims = await getApprovedClaimsList();
    res.status(200).json({ claims });
  } catch (error) {
    console.error("Get Approved Claims Error:", error);
    res.status(500).json({ message: "Unable to fetch approved claims." });
  }
};

export const executePayoutBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const { claimIds } = req.body as { claimIds?: unknown };
    if (
      !Array.isArray(claimIds) ||
      claimIds.length === 0 ||
      !claimIds.every((claimId): claimId is string => typeof claimId === "string" && claimId.length > 0)
    ) {
      res.status(400).json({
        message: "claimIds must be a non-empty array of claim ID strings.",
      });
      return;
    }

    const payoutBatch = await createPayoutBatch(claimIds, req.user.id);
    res.status(201).json({ payoutBatch });
  } catch (error) {
    if (error instanceof ClaimSelectionError) {
      res.status(409).json({ message: error.message });
      return;
    }
    console.error("Execute Payout Batch Error:", error);
    res.status(500).json({ message: "Unable to execute payout batch." });
  }
};
