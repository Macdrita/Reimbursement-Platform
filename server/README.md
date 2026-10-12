# Server configuration

## Vercel deployment

The repository root `vercel.json` defines two services: the Next.js `client`
and the Express `server`. Requests to `/api/*` and `/uploads/*` are routed to
the server; all other paths are routed to the client. The client uses the
same-origin `/api` path in production, so leave `NEXT_PUBLIC_API_URL` unset on
Vercel. Local development continues to use `http://localhost:5000` by default.
The server build generates Prisma Client before compiling TypeScript.

The current receipt upload middleware writes to local disk. Vercel function
filesystems are not durable across requests, so receipt uploads need persistent
object storage before relying on uploads in a Vercel deployment. The
`/uploads/*` rewrite preserves the app's receipt URL path but does not provide
persistent storage.

Set server secrets and database connection variables in the Vercel project
environment, and apply database migrations as a separate deployment operation.
No service binding is needed: browser requests use the public same-origin
rewrites, and the server currently makes no calls to another Vercel service.

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
