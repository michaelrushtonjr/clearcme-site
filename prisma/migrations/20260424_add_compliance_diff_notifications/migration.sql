-- CreateTable
CREATE TABLE "ComplianceRuleChange" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "changeType" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,

    CONSTRAINT "ComplianceRuleChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserComplianceDiff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changeId" TEXT NOT NULL,
    "impactDescription" TEXT NOT NULL,
    "additionalHoursNeeded" DOUBLE PRECISION,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserComplianceDiff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceRuleChange_state_licenseType_idx" ON "ComplianceRuleChange"("state", "licenseType");

-- CreateIndex
CREATE INDEX "ComplianceRuleChange_detectedAt_idx" ON "ComplianceRuleChange"("detectedAt");

-- CreateIndex
CREATE INDEX "UserComplianceDiff_userId_isRead_isDismissed_idx" ON "UserComplianceDiff"("userId", "isRead", "isDismissed");

-- CreateIndex
CREATE INDEX "UserComplianceDiff_changeId_idx" ON "UserComplianceDiff"("changeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserComplianceDiff_userId_changeId_key" ON "UserComplianceDiff"("userId", "changeId");

-- AddForeignKey
ALTER TABLE "UserComplianceDiff" ADD CONSTRAINT "UserComplianceDiff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserComplianceDiff" ADD CONSTRAINT "UserComplianceDiff_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "ComplianceRuleChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
