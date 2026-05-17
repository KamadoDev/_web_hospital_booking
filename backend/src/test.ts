import { prisma } from "./config/prisma.js";

async function main() {
  // Create user
  const user = await prisma.user.create({
    data: {
      fullName: "Nguyen Van A",
      email: "vana@gmail.com",
      password: "123456",
      role: "USER",
    },
  });

  console.log("Created User:");
  console.log(user);

  // Get all users
  const users = await prisma.user.findMany();

  console.log("All Users:");
  console.log(users);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });