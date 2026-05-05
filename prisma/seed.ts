import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const adminName = process.env.ADMIN_NAME;
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

function getSeedConfig() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL precisa estar definido para executar o seed.");
  }

  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD precisam estar definidos para executar o seed.",
    );
  }

  if (adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");
  }

  return {
    adminEmail,
    adminName,
    adminPassword,
    databaseUrl,
  };
}

const seedConfig = getSeedConfig();
const pool = new Pool({ connectionString: seedConfig.databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash(seedConfig.adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: seedConfig.adminEmail },
    update: {
      name: seedConfig.adminName,
      passwordHash,
      role: "ADMIN",
    },
    create: {
      name: seedConfig.adminName,
      email: seedConfig.adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin inicial pronto: ${admin.email}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
