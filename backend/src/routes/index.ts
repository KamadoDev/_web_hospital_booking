import { Router } from "express";
import appointmentRouter from "./appointment.route.js";
import authOtpRouter from "./authOtp.route.js";
import departmentRouter from "./department.route.js";
import dashboardAppointmentRouter from "./dashboardAppointment.route.js";
import dashboardAuthRouter from "./dashboardAuth.route.js";
import dashboardUserRouter from "./dashboardUser.route.js";
import doctorRouter from "./doctor.route.js";
import doctorScheduleRouter from "./doctorSchedule.route.js";
import doctorTimeSlotRouter from "./doctorTimeSlot.route.js";
import medicalRecordRouter from "./medicalRecord.route.js";
import packageRouter from "./package.route.js";
import prescriptionRouter from "./prescription.route.js";
import publicDepartmentRouter from "./publicDepartment.route.js";
import publicDoctorRouter from "./publicDoctor.route.js";
import publicPackageRouter from "./publicPackage.route.js";
import uploadRouter from "./upload.route.js";

const router = Router();

router.use("/otp", authOtpRouter);
router.use("/auth/dashboard", dashboardAuthRouter);
router.use("/appointments", appointmentRouter);
router.use("/dashboard/appointments", dashboardAppointmentRouter);
router.use("/dashboard/users", dashboardUserRouter);
router.use("/dashboard/departments", departmentRouter);
router.use("/dashboard/doctors", doctorRouter);
router.use("/dashboard/doctor-schedules", doctorScheduleRouter);
router.use("/dashboard/doctor-time-slots", doctorTimeSlotRouter);
router.use("/dashboard/medical-records", medicalRecordRouter);
router.use("/dashboard/packages", packageRouter);
router.use("/dashboard/prescriptions", prescriptionRouter);
router.use("/departments", publicDepartmentRouter);
router.use("/doctors", publicDoctorRouter);
router.use("/packages", publicPackageRouter);
router.use("/uploads", uploadRouter);

export default router;
