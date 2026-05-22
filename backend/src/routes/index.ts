import { Router } from "express";
import authOtpRouter from "./authOtp.route.js";
import departmentRouter from "./department.route.js";
import dashboardAuthRouter from "./dashboardAuth.route.js";
import dashboardUserRouter from "./dashboardUser.route.js";
import doctorRouter from "./doctor.route.js";
import doctorScheduleRouter from "./doctorSchedule.route.js";
import doctorTimeSlotRouter from "./doctorTimeSlot.route.js";
import publicDepartmentRouter from "./publicDepartment.route.js";
import publicDoctorRouter from "./publicDoctor.route.js";
import uploadRouter from "./upload.route.js";

const router = Router();

router.use("/otp", authOtpRouter);
router.use("/auth/dashboard", dashboardAuthRouter);
router.use("/dashboard/users", dashboardUserRouter);
router.use("/dashboard/departments", departmentRouter);
router.use("/dashboard/doctors", doctorRouter);
router.use("/dashboard/doctor-schedules", doctorScheduleRouter);
router.use("/dashboard/doctor-time-slots", doctorTimeSlotRouter);
router.use("/departments", publicDepartmentRouter);
// router.use("/doctor", publicDoctorRouter);
router.use("/doctors", publicDoctorRouter);
router.use("/uploads", uploadRouter);

export default router;
