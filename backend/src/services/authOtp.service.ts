import { prisma } from "../config/prisma.js";
import type { OtpPurpose } from "../../generated/prisma/enums.js";

class AuthOtpService {
  async sendOtp(phone: string, purpose: OtpPurpose, ipAddress: string) {
    if (!phone) {
      throw new Error("Thiếu số điện thoại");
    }

    if (!purpose) {
      throw new Error("Thiếu purpose khi gửi OTP");
    }

    const lastOtp = await prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        ipAddress,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (lastOtp) {
      const seconds = Math.floor(
        (Date.now() - lastOtp.createdAt.getTime()) / 1000,
      );

      if (seconds < 60) {
        throw new Error(
          `Vui lòng đợi ${60 - seconds} giây để gửi lại OTP`,
        );
      }
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const otpCount = await prisma.otpCode.count({
      where: {
        phone,
        purpose,
        ipAddress,
        createdAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    if (otpCount >= 5) {
      throw new Error("Bạn đã gửi OTP quá nhiều lần. Vui lòng thử lại sau.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpRecord = await prisma.otpCode.create({
      data: {
        phone,
        code: otp,
        purpose,
        ipAddress,
        expiresAt,
      },
    });

    console.log("=================================");
    console.log(`OTP DEMO: ${otp}`);
    console.log(`Phone: ${phone}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`IP: ${ipAddress}`);
    console.log(`Expires At: ${otpRecord.expiresAt.toISOString()}`);
    console.log("=================================");

    return {
      id: otpRecord.id,
      phone: otpRecord.phone,
      purpose: otpRecord.purpose,
      expiresAt: otpRecord.expiresAt,
      expiresIn: 300,
      otpDemo: otpRecord.code,
    };
  }

  async verifyOtp(phone: string, otp: string, purpose: OtpPurpose) {
    if (!phone) {
      throw new Error("Thiếu số điện thoại");
    }

    if (!otp) {
      throw new Error("Thiếu mã OTP");
    }

    if (!purpose) {
      throw new Error("Thiếu purpose khi xác thực OTP");
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        code: otp,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new Error("OTP không chính xác, đã hết hạn hoặc đã được sử dụng");
    }

    await prisma.otpCode.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return {
      verified: true,
      phone: otpRecord.phone,
      purpose: otpRecord.purpose,
      verifiedAt: new Date(),
    };
  }
}

export default new AuthOtpService();