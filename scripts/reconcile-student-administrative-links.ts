import { getPrisma } from "../src/lib/prisma";
import { ensureStudentAdministrativeRecords } from "../src/lib/student-administrative-linkage";

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

const prisma = getPrisma();
const apply = process.argv.includes("--apply");
const actor = await prisma.user.findFirst({
  orderBy: { createdAt: "asc" },
  select: { id: true },
  where: { isActive: true, role: "ADMIN" },
});

if (!actor) {
  throw new Error("Nenhum Admin ativo foi encontrado para auditar os vinculos.");
}

const profiles = await prisma.studentProfile.findMany({
  orderBy: { id: "asc" },
  select: {
    agendaStudent: { select: { id: true } },
    financialStudent: { select: { id: true } },
    id: true,
    studentPhone: true,
    unit: true,
    user: {
      select: {
        email: true,
        isActive: true,
        name: true,
        phone: true,
        role: true,
      },
    },
  },
  where: {
    user: { role: "STUDENT" },
  },
});

const summary = {
  activeStudents: profiles.filter((profile) => profile.user.isActive).length,
  createdAgenda: 0,
  createdFinancial: 0,
  legacyAgendaLinked: 0,
  legacyFinancialLinked: 0,
  missingAgendaBefore: profiles.filter((profile) => !profile.agendaStudent).length,
  missingFinancialBefore: profiles.filter((profile) => !profile.financialStudent)
    .length,
  processed: 0,
  totalStudents: profiles.length,
};

if (!apply) {
  console.log(JSON.stringify({ apply: false, ...summary }, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}

for (const profile of profiles) {
  await prisma.$transaction(async (tx) => {
    let hasFinancial = Boolean(profile.financialStudent);
    let hasAgenda = Boolean(profile.agendaStudent);
    const phone = normalizePhone(profile.studentPhone ?? profile.user.phone);

    if (!hasFinancial) {
      const candidates = await tx.financialStudent.findMany({
        where: {
          studentProfileId: null,
          OR: [
            { email: { equals: profile.user.email, mode: "insensitive" } },
            ...(phone ? [{ phone: { not: null } }] : []),
          ],
        },
        select: { email: true, id: true, phone: true },
      });
      const exactCandidates = candidates.filter(
        (candidate) =>
          candidate.email?.toLocaleLowerCase("pt-BR") ===
            profile.user.email.toLocaleLowerCase("pt-BR") ||
          (phone && normalizePhone(candidate.phone) === phone),
      );

      if (exactCandidates.length === 1) {
        await tx.financialStudent.update({
          where: { id: exactCandidates[0].id },
          data: { studentProfileId: profile.id },
        });
        hasFinancial = true;
        summary.legacyFinancialLinked += 1;
      }
    }

    if (!hasAgenda) {
      const candidates = await tx.agendaStudent.findMany({
        where: {
          studentProfileId: null,
          unit: profile.unit,
          OR: [
            { name: { equals: profile.user.name, mode: "insensitive" } },
            ...(phone ? [{ phone: { not: null } }] : []),
          ],
        },
        select: { id: true, name: true, phone: true },
      });
      const phoneCandidates = phone
        ? candidates.filter(
            (candidate) => normalizePhone(candidate.phone) === phone,
          )
        : [];
      const nameCandidates = candidates.filter(
        (candidate) =>
          candidate.name.trim().toLocaleLowerCase("pt-BR") ===
          profile.user.name.trim().toLocaleLowerCase("pt-BR"),
      );
      const exactCandidates =
        phoneCandidates.length === 1 ? phoneCandidates : nameCandidates;

      if (exactCandidates.length === 1) {
        await tx.agendaStudent.update({
          where: { id: exactCandidates[0].id },
          data: { studentProfileId: profile.id },
        });
        hasAgenda = true;
        summary.legacyAgendaLinked += 1;
      }
    }

    const result = await ensureStudentAdministrativeRecords(tx, {
      actorUserId: actor.id,
      sourceDescription: "reconciliacao administrativa",
      studentProfileId: profile.id,
    });

    summary.createdAgenda += result.createdAgenda ? 1 : 0;
    summary.createdFinancial += result.createdFinancial ? 1 : 0;
    summary.processed += 1;

    void hasAgenda;
    void hasFinancial;
  });
}

console.log(JSON.stringify({ apply: true, ...summary }, null, 2));
await prisma.$disconnect();
