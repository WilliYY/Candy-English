import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { assertStorageAvailable } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [database, storage] = await Promise.allSettled([
    (async () => {
      const prisma = getPrisma();

      await prisma.$queryRaw`SELECT 1`;
    })(),
    assertStorageAvailable(),
  ]);
  const checks = {
    database: database.status === "fulfilled",
    storage: storage.status === "fulfilled",
  };
  const ok = checks.database && checks.storage;

  return NextResponse.json(
    {
      checks,
      ok,
      service: "candy-english",
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
