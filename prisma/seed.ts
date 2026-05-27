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

  const accountingChargeServices = [
    {
      name: "Core Charge",
      description: "Core charge billed on applicable parts.",
      salesCategory: "cores",
      taxable: true,
    },
    {
      name: "Sublet Work",
      description: "Outside vendor work billed through the shop.",
      salesCategory: "sublet",
      taxable: false,
    },
    {
      name: "Hazardous Materials Fee",
      description: "Environmental or hazardous materials handling fee.",
      salesCategory: "hazardous_materials",
      taxable: true,
    },
    {
      name: "Tire Disposal Fee",
      description: "Tire disposal fee.",
      salesCategory: "tire_disposal",
      taxable: true,
    },
  ];

  for (const service of accountingChargeServices) {
    const existingService = await prisma.serviceItem.findFirst({
      where: {
        name: service.name,
      },
    });

    if (existingService) {
      await prisma.serviceItem.update({
        where: {
          id: existingService.id,
        },
        data: {
          category: "general-repair",
          description: service.description,
          pricingMethod: "flat",
          flatPrice: existingService.flatPrice ?? 0,
          hourlyRate: null,
          estimatedHours: null,
          taxable: service.taxable,
          salesCategory: service.salesCategory,
          active: true,
        },
      });
    } else {
      await prisma.serviceItem.create({
        data: {
          category: "general-repair",
          name: service.name,
          description: service.description,
          pricingMethod: "flat",
          flatPrice: 0,
          hourlyRate: null,
          estimatedHours: null,
          taxable: service.taxable,
          salesCategory: service.salesCategory,
          active: true,
        },
      });
    }
  }
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
