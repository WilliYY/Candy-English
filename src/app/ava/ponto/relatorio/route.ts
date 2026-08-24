import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getSaoPauloMonthRange,
  summarizeTimeClockEntries,
} from "@/lib/time-clock-domain";
import { buildTimeClockPdf } from "@/lib/time-clock-pdf";
import { timeClockReportQuerySchema } from "@/lib/validations/time-clock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "pessoa";
}
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = timeClockReportQuerySchema.safeParse({
    month: url.searchParams.get("month"),
    profileId: url.searchParams.get("profileId"),
    year: url.searchParams.get("year"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Periodo ou pessoa invalida." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const profile = await prisma.timeClockProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: {
      id: true,
      isActive: true,
      user: { select: { email: true, id: true, name: true } },
    },
  });

  if (
    !profile ||
    (session.user.role !== "ADMIN" &&
      (profile.user.id !== session.user.id || !profile.isActive))
  ) {
    return NextResponse.json({ error: "Relatorio indisponivel." }, { status: 403 });
  }

  const range = getSaoPauloMonthRange(parsed.data.year, parsed.data.month);
  const entries = await prisma.timeClockEntry.findMany({
    where: {
      occurredAt: { gte: range.start, lt: range.end },
      profileId: profile.id,
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: {
      correctedAt: true,
      justification: true,
      occurredAt: true,
      source: true,
      type: true,
    },
  });
  const summary = summarizeTimeClockEntries(entries);
  const pdf = await buildTimeClockPdf({
    entries,
    period: parsed.data,
    person: profile.user,
    summary,
  });
  const fileName = `ponto-${safeFileName(profile.user.name)}-${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
