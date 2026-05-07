import { getPrisma } from "@/lib/prisma";

const MAINTENANCE_KEY = "maintenanceMode";

export async function isMaintenanceModeEnabled() {
  const prisma = getPrisma();
  const setting = await prisma.appSetting.findUnique({
    where: { key: MAINTENANCE_KEY },
    select: { value: true },
  });

  return setting?.value === "on";
}

export async function setMaintenanceMode(enabled: boolean) {
  const prisma = getPrisma();

  await prisma.appSetting.upsert({
    where: { key: MAINTENANCE_KEY },
    create: {
      key: MAINTENANCE_KEY,
      value: enabled ? "on" : "off",
    },
    update: {
      value: enabled ? "on" : "off",
    },
  });
}
