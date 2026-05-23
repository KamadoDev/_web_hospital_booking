-- AlterTable
ALTER TABLE "Package" ADD COLUMN "departmentId" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "patientGender" "Gender";
ALTER TABLE "Appointment" ADD COLUMN "patientDateOfBirth" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "patientAddress" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "patientCccd" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "allergies" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "medicalHistory" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "familyHistory" TEXT;

-- CreateIndex
CREATE INDEX "Package_departmentId_idx" ON "Package"("departmentId");

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
