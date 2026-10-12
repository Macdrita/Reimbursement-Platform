# Server configuration

## RazorpayX test payouts

The finance dashboard sends payout requests to RazorpayX in test mode when a
finance admin executes a selected batch. Live credentials are rejected by the
API; test-mode payouts do not transfer real funds. The app uses fixed test
beneficiary details configured on the server, not employee bank details, and
sends synthetic employee contact information to Razorpay.

1. Copy `.env.example` to `.env`.
2. Add Razorpay **test-mode** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
   The key ID must start with `rzp_test_`.
3. Set `RAZORPAYX_ACCOUNT_NUMBER` to the source/customer identifier from the
   RazorpayX test dashboard. The beneficiary account and IFSC in `.env.example`
   are documentation sample values; use the test values supported by your
   RazorpayX test account if those samples are not accepted.
4. Apply the Prisma migration.
5. Configure a Razorpay webhook at
   `https://<your-api-host>/api/finance/webhooks/razorpay`, subscribe to
   `payout.processed`, `payout.failed`, and `payout.reversed`, and set its signing
   secret as `RAZORPAYX_WEBHOOK_SECRET`.

Payout creation uses Razorpay's required `X-Payout-Idempotency` header. The
webhook signature is verified against the raw request body, and payout status
updates are persisted in the batch history. See Razorpay's
[bank payout API](https://razorpay.com/docs/api/x/payouts/create/) and
[bank fund-account API](https://razorpay.com/docs/api/x/fund-accounts/create/bank-account/).
