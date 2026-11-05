import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export const MAINTENANCE_SETTING_KEY = "maintenanceMode";

export async function isMaintenanceModeEnabled() {
  const prisma = getPrisma();
  const setting = await prisma.appSetting.findUnique({
    where: { key: MAINTENANCE_SETTING_KEY },
    select: { value: true },
  });

  return setting?.value === "on";
}

export async function isStudentMaintenanceBlocked(role: Role) {
  return role === "STUDENT" && await isMaintenanceModeEnabled();
}

export async function setMaintenanceMode(enabled: boolean) {
  const prisma = getPrisma();

  await prisma.appSetting.upsert({
    where: { key: MAINTENANCE_SETTING_KEY },
    create: {
      key: MAINTENANCE_SETTING_KEY,
      value: enabled ? "on" : "off",
    },
    update: {
      value: enabled ? "on" : "off",
    },
  });
}
