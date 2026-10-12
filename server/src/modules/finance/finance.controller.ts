import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import {
  ClaimSelectionError,
  executeRazorpayTestPayoutBatch,
  getApprovedClaimsList,
  getRecentPayoutBatches,
  applyRazorpayWebhookUpdate,
  RazorpayConfigurationError,
} from "./finance.service";
import { isValidRazorpayWebhookSignature } from "./razorpay.service";

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

export const getPayoutBatches = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const batches = await getRecentPayoutBatches();
    res.status(200).json({ batches });
  } catch (error) {
    console.error("Get Payout Batches Error:", error);
    res.status(500).json({ message: "Unable to fetch payout history." });
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

    const body = req.body as { claimIds?: unknown } | null;
    const claimIds = body?.claimIds;
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

    const result = await executeRazorpayTestPayoutBatch(
      claimIds,
      req.user.id,
      req.ip
    );
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ClaimSelectionError) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error instanceof RazorpayConfigurationError) {
      res.status(503).json({ message: error.message });
      return;
    }
    console.error("Execute Payout Batch Error:", error);
    res.status(500).json({ message: "Unable to execute payout batch." });
  }
};

export const handleRazorpayWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ message: "Invalid webhook body." });
    return;
  }
  if (
    !isValidRazorpayWebhookSignature(
      req.body,
      req.header("X-Razorpay-Signature")
    )
  ) {
    res.status(401).json({ message: "Invalid Razorpay webhook signature." });
    return;
  }

  let event: unknown;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    res.status(400).json({ message: "Invalid webhook JSON." });
    return;
  }
  if (
    typeof event !== "object" ||
    event === null ||
    !("event" in event) ||
    typeof event.event !== "string"
  ) {
    res.status(400).json({ message: "Invalid Razorpay webhook event." });
    return;
  }
  if (
    !["payout.processed", "payout.failed", "payout.reversed"].includes(
      event.event
    )
  ) {
    res.status(200).json({ received: true });
    return;
  }

  const payload =
    "payload" in event && typeof event.payload === "object" && event.payload !== null
      ? event.payload
      : null;
  const payoutContainer =
    payload && "payout" in payload && typeof payload.payout === "object" && payload.payout !== null
      ? payload.payout
      : null;
  const entity =
    payoutContainer &&
    "entity" in payoutContainer &&
    typeof payoutContainer.entity === "object" &&
    payoutContainer.entity !== null
      ? payoutContainer.entity
      : null;
  if (
    !entity ||
    !("id" in entity) ||
    typeof entity.id !== "string" ||
    !("reference_id" in entity) ||
    typeof entity.reference_id !== "string" ||
    !("status" in entity) ||
    typeof entity.status !== "string"
  ) {
    res.status(400).json({ message: "Invalid Razorpay payout event payload." });
    return;
  }

  try {
    const updated = await applyRazorpayWebhookUpdate(
      entity.reference_id,
      entity.id,
      entity.status
    );
    if (!updated) {
      res.status(404).json({ message: "Payout transaction was not found." });
      return;
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay Webhook Error:", error);
    res.status(500).json({ message: "Unable to process Razorpay webhook." });
  }
};
