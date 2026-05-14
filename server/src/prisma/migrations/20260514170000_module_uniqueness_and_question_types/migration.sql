-- Add new QuestionType enum values (canonical IELTS task types per British Council format).
-- PostgreSQL 12+ supports adding enum values without serial migrations.
ALTER TYPE "QuestionType" ADD VALUE 'FORM_COMPLETION';
ALTER TYPE "QuestionType" ADD VALUE 'NOTE_COMPLETION';
ALTER TYPE "QuestionType" ADD VALUE 'TABLE_COMPLETION';
ALTER TYPE "QuestionType" ADD VALUE 'FLOW_CHART_COMPLETION';
ALTER TYPE "QuestionType" ADD VALUE 'SUMMARY_COMPLETION';
ALTER TYPE "QuestionType" ADD VALUE 'MAP_LABELING';
ALTER TYPE "QuestionType" ADD VALUE 'PLAN_LABELING';

-- Enforce one Module per (testId, type) combination at the DB level.
CREATE UNIQUE INDEX "Module_testId_type_key" ON "Module"("testId", "type");
