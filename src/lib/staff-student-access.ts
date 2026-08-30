import type { Prisma } from "@/generated/prisma/client";

type StudentUnit = "DOURADINA" | "IVATE";

const activeStudentUserWhere = {
  deletedAt: null,
  isActive: true,
  role: "STUDENT",
} as const;

export function getStaffStudentSelectionWhere(
  unit?: StudentUnit | null,
): Prisma.StudentProfileWhereInput {
  return {
    ...(unit ? { unit } : {}),
    user: activeStudentUserWhere,
  };
}

export function getActiveStudentProfileWhere(
  studentProfileId: string,
): Prisma.StudentProfileWhereInput {
  return {
    id: studentProfileId,
    user: activeStudentUserWhere,
  };
}
