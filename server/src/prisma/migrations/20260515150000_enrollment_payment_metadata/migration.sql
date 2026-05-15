-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BKASH', 'NAGAD', 'BANK', 'MANUAL');

-- AlterTable
ALTER TABLE "Enrollment"
  ADD COLUMN     "paymentMethod" "PaymentMethod",
  ADD COLUMN     "amountPaid" DOUBLE PRECISION,
  ADD COLUMN     "rejectedAt" TIMESTAMP(3),
  ADD COLUMN     "rejectedBy" TEXT,
  ADD COLUMN     "rejectionReason" TEXT;
