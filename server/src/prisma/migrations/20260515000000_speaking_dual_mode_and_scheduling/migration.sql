-- CreateEnum
CREATE TYPE "SpeakingMode" AS ENUM ('RECORDED', 'LIVE');

-- CreateEnum
CREATE TYPE "MeetingProvider" AS ENUM ('GOOGLE_MEET', 'ZOOM', 'OTHER');

-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERIC', 'LIVE_SPEAKING_REQUESTED', 'LIVE_SPEAKING_SCHEDULED', 'LIVE_SPEAKING_RESCHEDULED', 'LIVE_SPEAKING_CANCELLED', 'LIVE_SPEAKING_REMINDER', 'RESULT_RELEASED', 'ENROLLMENT_UPDATE');

-- AlterEnum
ALTER TYPE "ModuleSessionStatus" ADD VALUE 'AWAITING_LIVE';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'EXAMINER';

-- AlterTable
ALTER TABLE "Module" ADD COLUMN "speakingMode" "SpeakingMode" NOT NULL DEFAULT 'RECORDED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
ALTER TABLE "Notification" ADD COLUMN "meta" JSONB;
ALTER TABLE "Notification" ADD COLUMN "type" "NotificationType" DEFAULT 'GENERIC';

-- AlterTable
ALTER TABLE "SpeakingSubmission" ALTER COLUMN "audioUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SpeakingResponse" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "audioPublicId" TEXT,
    "duration" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpeakingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSpeakingSession" (
    "id" TEXT NOT NULL,
    "moduleSessionId" TEXT NOT NULL,
    "examinerId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 15,
    "meetingUrl" TEXT,
    "meetingProvider" "MeetingProvider" NOT NULL DEFAULT 'GOOGLE_MEET',
    "meetingExternalId" TEXT,
    "recordingUrl" TEXT,
    "recordingPublicId" TEXT,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'REQUESTED',
    "studentPreferredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LiveSpeakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExaminerIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MeetingProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "externalAccountEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExaminerIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingResponse_submissionId_questionId_key" ON "SpeakingResponse"("submissionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSpeakingSession_moduleSessionId_key" ON "LiveSpeakingSession"("moduleSessionId");

-- CreateIndex
CREATE INDEX "LiveSpeakingSession_examinerId_scheduledAt_idx" ON "LiveSpeakingSession"("examinerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "LiveSpeakingSession_status_idx" ON "LiveSpeakingSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExaminerIntegration_userId_provider_key" ON "ExaminerIntegration"("userId", "provider");

-- AddForeignKey
ALTER TABLE "SpeakingResponse" ADD CONSTRAINT "SpeakingResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SpeakingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingResponse" ADD CONSTRAINT "SpeakingResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveSpeakingSession" ADD CONSTRAINT "LiveSpeakingSession_moduleSessionId_fkey" FOREIGN KEY ("moduleSessionId") REFERENCES "ModuleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveSpeakingSession" ADD CONSTRAINT "LiveSpeakingSession_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExaminerIntegration" ADD CONSTRAINT "ExaminerIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
