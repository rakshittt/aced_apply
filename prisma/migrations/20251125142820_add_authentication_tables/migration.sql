-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FitLevel" AS ENUM ('FIT', 'BORDERLINE', 'NOT_FIT');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "InterviewStage" AS ENUM ('RECRUITER', 'TECH_SCREEN', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'HIRING_MANAGER', 'ONSITE', 'OFFER');

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "jdUrl" TEXT,
    "jdText" TEXT NOT NULL,
    "resumeS3Key" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PROCESSING',
    "ttfi" INTEGER,
    "totalDuration" INTEGER,
    "modelVersion" TEXT NOT NULL DEFAULT 'gpt-4o-2024-08-06',
    "rulesetVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "jdId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "requirements" TEXT[],
    "responsibilities" TEXT[],
    "qualifications" TEXT[],
    "keywords" TEXT[],
    "behaviorCues" JSONB NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sections" JSONB NOT NULL,
    "bullets" JSONB[],

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "analysisCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 3,
    "lastReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "FitMap" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT NOT NULL,
    "overallFit" "FitLevel" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "overlap" JSONB[],
    "underEvidenced" JSONB[],
    "gaps" JSONB[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeAdvisor" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT NOT NULL,
    "atsWarnings" JSONB[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeAdvisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeAdvisorSuggestion" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "targetSection" TEXT NOT NULL,
    "currentBullet" TEXT NOT NULL,
    "suggestedBullet" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requiredMetric" TEXT,
    "evidenceToAttach" TEXT,
    "keywordMirror" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL,
    "jdSpans" JSONB[],
    "resumeSpans" JSONB[],
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ChangeAdvisorSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewerLens" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT NOT NULL,
    "competencies" JSONB[],
    "likelyFormats" JSONB[],
    "behaviorCues" JSONB[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewerLens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepKit" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepDay" (
    "id" TEXT NOT NULL,
    "prepKitId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "gapRef" TEXT NOT NULL,
    "companyBehaviorRef" TEXT,
    "inputs" TEXT NOT NULL,
    "practiceTask" TEXT NOT NULL,
    "rubric" JSONB NOT NULL,
    "expectedArtifact" TEXT NOT NULL,
    "timeboxMin" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PrepDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachCard" (
    "id" TEXT NOT NULL,
    "stage" "InterviewStage" NOT NULL,
    "whatMeasured" TEXT[],
    "scaffold" TEXT NOT NULL,
    "failureModes" TEXT[],
    "followUps" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_userId_createdAt_idx" ON "JobRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JobRun_expiresAt_idx" ON "JobRun"("expiresAt");

-- CreateIndex
CREATE INDEX "JobRun_status_idx" ON "JobRun"("status");

-- CreateIndex
CREATE INDEX "JobDescription_company_idx" ON "JobDescription"("company");

-- CreateIndex
CREATE INDEX "JobDescription_parsedAt_idx" ON "JobDescription"("parsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_s3Key_key" ON "Resume"("s3Key");

-- CreateIndex
CREATE INDEX "Resume_uploadedAt_idx" ON "Resume"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "FitMap_jobRunId_key" ON "FitMap"("jobRunId");

-- CreateIndex
CREATE INDEX "FitMap_generatedAt_idx" ON "FitMap"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeAdvisor_jobRunId_key" ON "ChangeAdvisor"("jobRunId");

-- CreateIndex
CREATE INDEX "ChangeAdvisor_generatedAt_idx" ON "ChangeAdvisor"("generatedAt");

-- CreateIndex
CREATE INDEX "ChangeAdvisorSuggestion_advisorId_idx" ON "ChangeAdvisorSuggestion"("advisorId");

-- CreateIndex
CREATE INDEX "ChangeAdvisorSuggestion_status_idx" ON "ChangeAdvisorSuggestion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewerLens_jobRunId_key" ON "InterviewerLens"("jobRunId");

-- CreateIndex
CREATE INDEX "InterviewerLens_generatedAt_idx" ON "InterviewerLens"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrepKit_jobRunId_key" ON "PrepKit"("jobRunId");

-- CreateIndex
CREATE INDEX "PrepKit_generatedAt_idx" ON "PrepKit"("generatedAt");

-- CreateIndex
CREATE INDEX "PrepDay_prepKitId_idx" ON "PrepDay"("prepKitId");

-- CreateIndex
CREATE INDEX "PrepDay_completed_idx" ON "PrepDay"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "PrepDay_prepKitId_dayNumber_key" ON "PrepDay"("prepKitId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CoachCard_stage_key" ON "CoachCard"("stage");

-- CreateIndex
CREATE INDEX "CoachCard_stage_idx" ON "CoachCard"("stage");

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JobDescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitMap" ADD CONSTRAINT "FitMap_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeAdvisor" ADD CONSTRAINT "ChangeAdvisor_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeAdvisorSuggestion" ADD CONSTRAINT "ChangeAdvisorSuggestion_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "ChangeAdvisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewerLens" ADD CONSTRAINT "InterviewerLens_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepKit" ADD CONSTRAINT "PrepKit_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepDay" ADD CONSTRAINT "PrepDay_prepKitId_fkey" FOREIGN KEY ("prepKitId") REFERENCES "PrepKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
