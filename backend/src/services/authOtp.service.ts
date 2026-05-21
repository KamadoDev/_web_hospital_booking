import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import type { OtpPurpose } from "../../generated/prisma/enums.js";

type SendOtpOptions = {
  challengeId?: string;
  userId?: string;
};

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || "dev_otp_secret";
const RESEND_COOLDOWN_SECONDS = 60;
const OTP_WINDOW_MINUTES = 15;
const MAX_OTP_SENDS_PER_WINDOW = 5;
const OTP_EXPIRES_SECONDS = 5 * 60;

const hashOtp = (otp: string) =>
  createHmac("sha256", OTP_SECRET).update(otp).digest("hex");

const isSameOtp = (otp: string, otpHash: string) => {
  const expected = Buffer.from(hashOtp(otp), "hex");
  const actual = Buffer.from(otpHash, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

class AuthOtpService {
  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
    ipAddress: string,
    options: SendOtpOptions = {},
  ) {
    if (!phone) {
      throw new AppError("Thieu so dien thoai", 400);
    }

    if (!purpose) {
      throw new AppError("Thieu purpose khi gui OTP", 400);
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

      if (seconds < RESEND_COOLDOWN_SECONDS) {
        throw new AppError(
          `Vui long doi ${RESEND_COOLDOWN_SECONDS - seconds} giay de gui lai OTP`,
          429,
        );
      }
    }

    const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000);

    const otpCount = await prisma.otpCode.count({
      where: {
        phone,
        purpose,
        ipAddress,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (otpCount >= MAX_OTP_SENDS_PER_WINDOW) {
      throw new AppError("Ban da gui OTP qua nhieu lan. Vui long thu lai sau.", 429);
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_SECONDS * 1000);

    const otpRecord = await prisma.otpCode.create({
      data: {
        phone,
        code: hashOtp(otp),
        purpose,
        ipAddress,
        challengeId: options.challengeId,
        userId: options.userId,
        expiresAt,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("=================================");
      console.log(`OTP DEV: ${otp}`);
      console.log(`Phone: ${phone}`);
      console.log(`Purpose: ${purpose}`);
      console.log(`IP: ${ipAddress}`);
      console.log(`Challenge: ${options.challengeId || "none"}`);
      console.log(`Expires At: ${otpRecord.expiresAt.toISOString()}`);
      console.log("=================================");
    }

    return {
      id: otpRecord.id,
      phone: otpRecord.phone,
      purpose: otpRecord.purpose,
      expiresAt: otpRecord.expiresAt,
      expiresIn: OTP_EXPIRES_SECONDS,
    };
  }

  async verifyOtp(
    phone: string,
    otp: string,
    purpose: OtpPurpose,
    challengeId?: string,
  ) {
    if (!phone) {
      throw new AppError("Thieu so dien thoai", 400);
    }

    if (!otp) {
      throw new AppError("Thieu ma OTP", 400);
    }

    if (!purpose) {
      throw new AppError("Thieu purpose khi xac thuc OTP", 400);
    }

    const candidates = await prisma.otpCode.findMany({
      where: {
        phone,
        purpose,
        challengeId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const otpRecord = candidates.find((candidate) =>
      isSameOtp(otp, candidate.code),
    );

    if (!otpRecord) {
      throw new AppError("OTP khong chinh xac, da het han hoac da duoc su dung", 401);
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
