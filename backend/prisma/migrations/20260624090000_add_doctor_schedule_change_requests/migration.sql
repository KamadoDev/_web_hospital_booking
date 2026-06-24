CREATE TYPE "ScheduleChangeRequestType" AS ENUM ('CREATE_WEEKLY_SCHEDULE', 'UPDATE_WEEKLY_SCHEDULE', 'DEACTIVATE_WEEKLY_SCHEDULE');
CREATE TYPE "ScheduleChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "ScheduleChangeRequest" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "type" "ScheduleChangeRequestType" NOT NULL,
    "status" "ScheduleChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL,
    "maxPatients" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleChangeRequest_doctorId_status_idx" ON "ScheduleChangeRequest"("doctorId", "status");
CREATE INDEX "ScheduleChangeRequest_requestedById_status_idx" ON "ScheduleChangeRequest"("requestedById", "status");
CREATE INDEX "ScheduleChangeRequest_status_createdAt_idx" ON "ScheduleChangeRequest"("status", "createdAt");

ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DoctorSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
