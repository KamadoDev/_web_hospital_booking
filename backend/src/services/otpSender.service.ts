import type { OtpChannel, OtpPurpose } from "../../generated/prisma/enums.js";
import { AppError } from "../utils/appError.js";
import EmailService from "./email.service.js";
import { buildOtpEmailTemplate } from "./emailTemplates/otpEmail.template.js";

type SendOtpInput = {
  target: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  otp: string;
  expiresInSeconds: number;
};

const isProductionLike = () => process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

class OtpSenderService {
  async send(input: SendOtpInput) {
    if (input.channel === "EMAIL") {
      const template = buildOtpEmailTemplate({
        otp: input.otp,
        purpose: input.purpose,
        expiresInSeconds: input.expiresInSeconds,
      });

      await EmailService.sendMail({
        to: input.target,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      return;
    }

    if (!isProductionLike()) {
      console.log("=================================");
      console.log(`SMS OTP DEV: ${input.otp}`);
      console.log(`Phone: ${input.target}`);
      console.log(`Purpose: ${input.purpose}`);
      console.log("=================================");
      return;
    }

    throw new AppError("Chưa cấu hình nhà cung cấp SMS để gửi OTP", 500);
  }
}

export default new OtpSenderService();
