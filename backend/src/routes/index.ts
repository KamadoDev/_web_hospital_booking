import { Router } from "express";
import authOtpRouter from "./authOtp.route.js";

const router = Router();

router.use("/otp", authOtpRouter);

export default router;
