import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const adminName = process.env.ADMIN_NAME;
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminResetPassword = process.env.ADMIN_RESET_PASSWORD === "true";

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
  const existingAdmin = await prisma.user.findUnique({
    where: { email: seedConfig.adminEmail },
  });

  if (existingAdmin) {
    const admin = await prisma.user.update({
      where: { email: seedConfig.adminEmail },
      data: {
        name: seedConfig.adminName,
        role: "ADMIN",
        ...(adminResetPassword
          ? {
              passwordHash: await hash(seedConfig.adminPassword, 12),
              sessionVersion: {
                increment: 1,
              },
            }
          : {}),
      },
    });

    console.log(
      adminResetPassword
        ? `Admin atualizado com senha redefinida: ${admin.email}`
        : `Admin existente preservado sem redefinir senha: ${admin.email}`,
    );
    return;
  }

  const passwordHash = await hash(seedConfig.adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
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
