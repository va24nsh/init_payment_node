import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const initDatabase = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL database via Prisma");

    // You can run any initial database operations here if needed
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
};
