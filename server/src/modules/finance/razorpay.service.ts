import { createHmac, timingSafeEqual } from "crypto";
import { PayoutBatchStatus } from "@prisma/client";

type RazorpayEntity = {
  id: string;
  status?: string;
};

export class RazorpayConfigurationError extends Error {}

export class RazorpayRequestError extends Error {
  constructor(
    message: string,
    readonly payoutMayHaveBeenCreated = false
  ) {
    super(message);
  }
}

const getTestCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const sourceAccountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  const beneficiaryAccountNumber =
    process.env.RAZORPAYX_TEST_BENEFICIARY_ACCOUNT_NUMBER;
  const beneficiaryIfsc = process.env.RAZORPAYX_TEST_BENEFICIARY_IFSC;

  if (!keyId?.startsWith("rzp_test_")) {
    throw new RazorpayConfigurationError(
      "Payouts are restricted to Razorpay test credentials. RAZORPAY_KEY_ID must start with rzp_test_."
    );
  }
  if (
    !keySecret ||
    !sourceAccountNumber ||
    !/^\d{8,18}$/.test(beneficiaryAccountNumber ?? "") ||
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(beneficiaryIfsc ?? "")
  ) {
    throw new RazorpayConfigurationError(
      "Configure Razorpay test credentials, the RazorpayX test source account, and the test beneficiary account number and IFSC."
    );
  }

  return {
    keyId,
    keySecret,
    sourceAccountNumber,
    beneficiaryAccountNumber,
    beneficiaryIfsc,
  };
};

export const assertRazorpayTestConfigured = (): void => {
  getTestCredentials();
};

const razorpayRequest = async <T>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey?: string
): Promise<T> => {
  const { keyId, keySecret } = getTestCredentials();
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["X-Payout-Idempotency"] = idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new RazorpayRequestError(
      "Could not reach Razorpay. Check the test payout status before retrying.",
      path === "payouts"
    );
  }

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const description =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "error" in responseBody &&
      typeof responseBody.error === "object" &&
      responseBody.error !== null &&
      "description" in responseBody.error &&
      typeof responseBody.error.description === "string"
        ? responseBody.error.description
        : "Razorpay rejected the test payout request.";
    throw new RazorpayRequestError(
      description,
      path === "payouts" &&
        (response.status >= 500 || response.status === 409)
    );
  }

  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("id" in responseBody) ||
    typeof responseBody.id !== "string" ||
    ("status" in responseBody && typeof responseBody.status !== "string")
  ) {
    throw new RazorpayRequestError(
      "Razorpay returned an invalid test payout response.",
      path === "payouts"
    );
  }

  return responseBody as T;
};

export const createRazorpayTestPayout = async (
  employeeId: string,
  amountInPaise: number,
  referenceId: string,
  batchId: string
): Promise<{ payoutId: string; status: PayoutBatchStatus }> => {
  if (amountInPaise < 100) {
    throw new RazorpayRequestError(
      "Razorpay payouts must be at least ₹1.00."
    );
  }
  const {
    sourceAccountNumber,
    beneficiaryAccountNumber,
    beneficiaryIfsc,
  } = getTestCredentials();

  const contact = await razorpayRequest<{ id: string }>("contacts", {
    name: "Demo Employee",
    email: `employee-${employeeId.slice(0, 8)}@example.test`,
    type: "employee",
    reference_id: referenceId,
    notes: { environment: "test" },
  });

  const fundAccount = await razorpayRequest<{ id: string }>("fund_accounts", {
    contact_id: contact.id,
    account_type: "bank_account",
    bank_account: {
      name: "Demo Employee",
      ifsc: beneficiaryIfsc,
      account_number: beneficiaryAccountNumber,
    },
  });

  const payout = await razorpayRequest<RazorpayEntity>(
    "payouts",
    {
      account_number: sourceAccountNumber,
      fund_account_id: fundAccount.id,
      amount: amountInPaise,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: referenceId,
      narration: "Test reimbursement",
      notes: { payout_batch_id: batchId, environment: "test" },
    },
    referenceId
  );

  return {
    payoutId: payout.id,
    status: mapRazorpayStatus(payout.status ?? "queued"),
  };
};

export const mapRazorpayStatus = (status: string): PayoutBatchStatus => {
  if (status === "processed") return PayoutBatchStatus.COMPLETED;
  if (["failed", "rejected", "reversed"].includes(status)) {
    return PayoutBatchStatus.FAILED;
  }
  return PayoutBatchStatus.PROCESSING;
};

export const isValidRazorpayWebhookSignature = (
  body: Buffer,
  signature: string | undefined
): boolean => {
  const secret = process.env.RAZORPAYX_WEBHOOK_SECRET;
  if (!secret || !signature || !/^[a-f\d]{64}$/i.test(signature)) return false;

  const expected = createHmac("sha256", secret).update(body).digest();
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};
