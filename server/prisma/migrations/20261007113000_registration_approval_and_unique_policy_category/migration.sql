CREATE TYPE "RegistrationStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'BLACKLISTED'
);

ALTER TABLE "User"
ADD COLUMN "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'APPROVED';

CREATE UNIQUE INDEX "PolicyRule_category_key" ON "PolicyRule"("category");
