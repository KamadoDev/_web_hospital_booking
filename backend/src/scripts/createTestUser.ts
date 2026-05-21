import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

async function createTestUser() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  const user = await prisma.user.create({
    data: {
      fullName: "Doctor Test",
      phone: "0352147251",
      email: "doctor@test.com",
      password: hashedPassword,

      role: "DOCTOR",

      isActive: true,
      isPhoneVerified: true,
    },
  });

  console.log("Created:", user);
}

createTestUser()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });