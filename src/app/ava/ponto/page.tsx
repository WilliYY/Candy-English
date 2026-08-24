import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { TimeClockPanel } from "@/components/ava/time-clock-panel";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
import {
  getCurrentSaoPauloYearMonth,
  getNextTimeClockEntryType,
  getSaoPauloMonthRange,
  summarizeTimeClockEntries,
} from "@/lib/time-clock-domain";

export const metadata: Metadata = {
  title: "Ponto",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TimeClockPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
    profileId?: string | string[];
    year?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
export default async function TimeClockPage({
  searchParams,
}: TimeClockPageProps) {
  const session = await requireAvaRole(["ADMIN", "TEACHER"], "/ava/ponto");
  const prisma = getPrisma();
  const params = searchParams ? await searchParams : undefined;
  const ownProfile = await prisma.timeClockProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, isActive: true },
  });

  if (session.user.role === "TEACHER" && !ownProfile?.isActive) {
    redirect("/ava/escolha");
  }

  const currentPeriod = getCurrentSaoPauloYearMonth();
  const requestedYear = Number(firstParam(params?.year));
  const requestedMonth = Number(firstParam(params?.month));
  const period = {
    month:
      Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
        ? requestedMonth
        : currentPeriod.month,
    year:
      Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2200
        ? requestedYear
        : currentPeriod.year,
  };
  const profiles = await prisma.timeClockProfile.findMany({
    where:
      session.user.role === "ADMIN"
        ? {}
        : { id: ownProfile?.id ?? "__missing_time_clock_profile__" },
    orderBy: [{ isActive: "desc" }, { user: { name: "asc" } }],
    select: {
      id: true,
      isActive: true,
      updatedAt: true,
      user: {
        select: { email: true, id: true, name: true, role: true },
      },
    },
  });
  const requestedProfileId = firstParam(params?.profileId);
  const selectedProfile =
    profiles.find((profile) => profile.id === requestedProfileId) ??
    profiles.find((profile) => profile.id === ownProfile?.id) ??
    profiles[0] ??
    null;
  const range = getSaoPauloMonthRange(period.year, period.month);
  const [entries, availableUsers, lastOwnEntry] = await Promise.all([
    selectedProfile
      ? prisma.timeClockEntry.findMany({
          where: {
            occurredAt: { gte: range.start, lt: range.end },
            profileId: selectedProfile.id,
          },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          select: {
            correctedAt: true,
            correctedByUser: { select: { name: true } },
            id: true,
            justification: true,
            occurredAt: true,
            recordedByUser: { select: { name: true } },
            revisions: { select: { id: true } },
            source: true,
            type: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    session.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: {
            isActive: true,
            role: { in: ["ADMIN", "TEACHER"] },
            timeClockProfile: null,
          },
          orderBy: { name: "asc" },
          select: { email: true, id: true, name: true, role: true },
        })
      : Promise.resolve([]),
    ownProfile?.isActive
      ? prisma.timeClockEntry.findFirst({
          where: { profileId: ownProfile.id },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          select: { type: true },
        })
      : Promise.resolve(null),
  ]);
  const summary = summarizeTimeClockEntries(entries);

  return (
    <AvaWorkspaceShell area="PONTO">
      <TimeClockPanel
        actor={{
          canPunch: Boolean(ownProfile?.isActive),
          isAdmin: session.user.role === "ADMIN",
          name: session.user.name ?? "Equipe Candy",
          nextType: getNextTimeClockEntryType(lastOwnEntry?.type),
          ownProfileId: ownProfile?.id ?? null,
        }}
        availableUsers={availableUsers}
        entries={entries.map((entry) => ({
          correctedAt: entry.correctedAt?.toISOString() ?? null,
          correctedByName: entry.correctedByUser?.name ?? null,
          id: entry.id,
          justification: entry.justification,
          occurredAt: entry.occurredAt.toISOString(),
          recordedByName: entry.recordedByUser?.name ?? "Usuario removido",
          revisionCount: entry.revisions.length,
          source: entry.source,
          type: entry.type,
          updatedAt: entry.updatedAt.toISOString(),
        }))}
        period={period}
        profiles={profiles.map((profile) => ({
          id: profile.id,
          isActive: profile.isActive,
          updatedAt: profile.updatedAt.toISOString(),
          user: profile.user,
        }))}
        selectedProfileId={selectedProfile?.id ?? null}
        summary={{
          completedPairs: summary.completedPairs,
          inconsistentEntries: summary.inconsistentEntries,
          openEntryAt: summary.openEntryAt?.toISOString() ?? null,
          workedMilliseconds: summary.workedMilliseconds,
        }}
      />
    </AvaWorkspaceShell>
  );
}
