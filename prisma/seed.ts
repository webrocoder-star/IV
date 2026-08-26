import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Main Admin
  const existingAdmin = await prisma.admin.findUnique({
    where: { loginId: "mainAdmin" },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("IV@Admin2025", 12);
    await prisma.admin.create({
      data: {
        adminName: "Main Administrator",
        loginId: "mainAdmin",
        passwordHash,
        role: "main_admin",
        status: "active",
      },
    });
    console.log("✅ Main Admin created: loginId=mainAdmin, password=IV@Admin2025");
  } else {
    console.log("ℹ️ Main Admin already exists, skipping.");
  }

  // Seed Default Shifts
  const shifts = [
    { shiftLabel: "10 AM - 7 PM", startTime: "10:00", endTime: "19:00", colorHex: "#92D050", sortOrder: 1 },
    { shiftLabel: "2 PM - 11 PM", startTime: "14:00", endTime: "23:00", colorHex: "#FF99CC", sortOrder: 2 },
    { shiftLabel: "5 AM - 2 PM", startTime: "05:00", endTime: "14:00", colorHex: "#FFFF00", sortOrder: 3 },
    { shiftLabel: "9 PM - 6 AM", startTime: "21:00", endTime: "06:00", colorHex: "#00B0F0", sortOrder: 4 },
    { shiftLabel: "6 PM - 3 AM", startTime: "18:00", endTime: "03:00", colorHex: "#0070C0", sortOrder: 5 },
    { shiftLabel: "9 AM - 6 PM", startTime: "09:00", endTime: "18:00", colorHex: "#E2EFDA", sortOrder: 6 },
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { shiftLabel: shift.shiftLabel },
      update: {},
      create: shift,
    });
  }
  console.log("✅ Default shifts seeded.");

  // Seed App Settings
  const settings = [
    { key: "smtp_host", value: "" },
    { key: "smtp_port", value: "587" },
    { key: "smtp_user", value: "" },
    { key: "smtp_pass", value: "" },
    { key: "smtp_from", value: "" },
    { key: "financial_year_start_month", value: "4" }, // April
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✅ App settings seeded.");

  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
