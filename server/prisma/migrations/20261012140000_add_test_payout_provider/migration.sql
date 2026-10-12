CREATE TYPE "PayoutProvider" AS ENUM ('DEMO', 'RAZORPAYX_TEST');

ALTER TABLE "PayoutBatch" ADD COLUMN "provider" "PayoutProvider" NOT NULL DEFAULT 'DEMO';
