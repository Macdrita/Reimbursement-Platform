CREATE TABLE "PayoutTransaction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "referenceId" TEXT NOT NULL,
    "razorpayPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayoutTransaction_referenceId_key" ON "PayoutTransaction"("referenceId");
CREATE UNIQUE INDEX "PayoutTransaction_razorpayPayoutId_key" ON "PayoutTransaction"("razorpayPayoutId");
CREATE INDEX "PayoutTransaction_batchId_idx" ON "PayoutTransaction"("batchId");

ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
