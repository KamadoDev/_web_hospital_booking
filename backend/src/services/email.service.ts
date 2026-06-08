import nodemailer from "nodemailer";
import { AppError } from "../utils/appError.js";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const getBooleanEnv = (value?: string) => value === "true";

class EmailService {
  private getTransporter() {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT || 587);
    const secure = getBooleanEnv(process.env.MAIL_SECURE);
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (!host || !user || !pass) {
      if (process.env.NODE_ENV !== "production") {
        return null;
      }

      throw new AppError("Chưa cấu hình SMTP để gửi email", 500);
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

  async sendMail(input: SendMailInput) {
    const transporter = this.getTransporter();
    const from = process.env.MAIL_FROM || process.env.MAIL_USER || "Hospital Booking";

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
