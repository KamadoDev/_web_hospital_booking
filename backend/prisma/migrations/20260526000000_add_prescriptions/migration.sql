CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "prescriptionCode" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "quantity" INTEGER,
    "unit" TEXT,
    "instruction" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Prescription_prescriptionCode_key" ON "Prescription"("prescriptionCode");

CREATE UNIQUE INDEX "Prescription_medicalRecordId_key" ON "Prescription"("medicalRecordId");

CREATE UNIQUE INDEX "Prescription_appointmentId_key" ON "Prescription"("appointmentId");

CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

CREATE INDEX "Prescription_doctorId_idx" ON "Prescription"("doctorId");

CREATE INDEX "Prescription_prescriptionCode_idx" ON "Prescription"("prescriptionCode");

CREATE INDEX "Prescription_status_idx" ON "Prescription"("status");

CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

CREATE INDEX "PrescriptionItem_sortOrder_idx" ON "PrescriptionItem"("sortOrder");

ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
