-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('MD', 'DO', 'PA', 'NP', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('AMA_PRA_1', 'AMA_PRA_2', 'AAFP_PRESCRIBED', 'AAFP_ELECTIVE', 'AOA_1_A', 'AOA_1_B', 'AOA_2_A', 'AOA_2_B', 'OTHER');

-- CreateEnum
CREATE TYPE "SpecialTopic" AS ENUM ('OPIOID_PRESCRIBING', 'PAIN_MANAGEMENT', 'IMPLICIT_BIAS', 'END_OF_LIFE_CARE', 'DOMESTIC_VIOLENCE', 'CHILD_ABUSE', 'ELDER_ABUSE', 'HUMAN_TRAFFICKING', 'INFECTION_CONTROL', 'PATIENT_SAFETY', 'ETHICS', 'CULTURAL_COMPETENCY', 'SUBSTANCE_USE', 'SUICIDE_PREVENTION', 'OTHER_MANDATORY');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

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
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "licenseType" "LicenseType",
    "specialty" TEXT,
    "npi" TEXT,
    "pushToken" TEXT,
    "pushPlatform" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicianLicense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseType" "LicenseType" NOT NULL,
    "issueDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deaNumber" TEXT,
    "deaRegisteredAt" TIMESTAMP(3),
    "deaExpiresAt" TIMESTAMP(3),
    "mateActRequired" BOOLEAN,
    "mateActCompleted" BOOLEAN,
    "npiNumber" TEXT,

    CONSTRAINT "PhysicianLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "extractedAt" TIMESTAMP(3),
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractionError" TEXT,
    "extractionConfidence" DOUBLE PRECISION,
    "title" TEXT,
    "provider" TEXT,
    "activityDate" TIMESTAMP(3),
    "creditHours" DOUBLE PRECISION,
    "creditType" "CreditType",
    "accreditation" TEXT,
    "topics" TEXT[],
    "specialTopics" "SpecialTopic"[],
    "manuallyVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "renewalCycle" INTEGER NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandatoryRequirement" (
    "id" TEXT NOT NULL,
    "complianceRuleId" TEXT NOT NULL,
    "topic" "SpecialTopic" NOT NULL,
    "hoursRequired" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "firstRenewalOnly" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "MandatoryRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalHoursEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHoursNeeded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "gapHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatoryGaps" JSONB,

    CONSTRAINT "ComplianceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "state" TEXT,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "stripeSubId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_npi_key" ON "User"("npi");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "PhysicianLicense_userId_idx" ON "PhysicianLicense"("userId");

-- CreateIndex
CREATE INDEX "PhysicianLicense_state_idx" ON "PhysicianLicense"("state");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicianLicense_userId_state_licenseType_key" ON "PhysicianLicense"("userId", "state", "licenseType");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_activityDate_idx" ON "Certificate"("activityDate");

-- CreateIndex
CREATE INDEX "ComplianceRule_state_idx" ON "ComplianceRule"("state");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRule_state_licenseType_key" ON "ComplianceRule"("state", "licenseType");

-- CreateIndex
CREATE INDEX "MandatoryRequirement_complianceRuleId_idx" ON "MandatoryRequirement"("complianceRuleId");

-- CreateIndex
CREATE INDEX "ComplianceStatus_userId_idx" ON "ComplianceStatus"("userId");

-- CreateIndex
CREATE INDEX "ComplianceStatus_licenseState_idx" ON "ComplianceStatus"("licenseState");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceStatus_userId_licenseState_licenseType_cycleStart_key" ON "ComplianceStatus"("userId", "licenseState", "licenseType", "cycleStart");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicianLicense" ADD CONSTRAINT "PhysicianLicense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandatoryRequirement" ADD CONSTRAINT "MandatoryRequirement_complianceRuleId_fkey" FOREIGN KEY ("complianceRuleId") REFERENCES "ComplianceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceStatus" ADD CONSTRAINT "ComplianceStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
