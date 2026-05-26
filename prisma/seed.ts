import { PrismaClient } from "@prisma/client";
import { normalizeUsername } from "../lib/usernames";

const prisma = new PrismaClient();

async function main() {
  await prisma.employeeLogin.upsert({
    where: {
      username: normalizeUsername("admin"),
    },
    update: {
      password: "admin",
      isAdmin: true,
    },
    create: {
      username: normalizeUsername("admin"),
      password: "admin",
      isAdmin: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
