-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "trxId" TEXT,
ALTER COLUMN "assignedBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bkashNumber" TEXT,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0;
