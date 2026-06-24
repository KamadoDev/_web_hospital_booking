import nodemailer from "nodemailer";
import { Resend } from "resend";
import { AppError } from "../utils/appError.js";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const getBooleanEnv = (value?: string) => value === "true";
const isProductionLike = () =>
  process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

class EmailService {
  private getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;

    return apiKey ? new Resend(apiKey) : null;
  }

  private getTransporter() {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT || 587);
    const secure = getBooleanEnv(process.env.MAIL_SECURE);
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (!host || !user || !pass) {
      if (!isProductionLike()) {
        return null;
      }

      throw new AppError("Chưa cấu hình SMTP hoặc Resend để gửi email", 500);
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  private async sendWithResend(input: SendMailInput) {
    const resend = this.getResendClient();
    if (!resend) return false;

    const from =
      process.env.RESEND_FROM ||
      process.env.MAIL_FROM ||
      "Hospital Booking <onboarding@resend.dev>";
    const { error } = await resend.emails.send({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (error) {
      throw new AppError(
        error.message || "Resend gửi email không thành công",
        502,
      );
    }

    return true;
  }

  async sendMail(input: SendMailInput) {
    const sentByResend = await this.sendWithResend(input);
    if (sentByResend) return;

    const transporter = this.getTransporter();
    const from =
      process.env.MAIL_FROM || process.env.MAIL_USER || "Hospital Booking";

    if (!transporter) {
      console.log("=================================");
      console.log("EMAIL DEV MOCK");
      console.log(`To: ${input.to}`);
      console.log(`Subject: ${input.subject}`);
      console.log(input.text);
      console.log("=================================");
      return;
    }

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}

export default new EmailService();
