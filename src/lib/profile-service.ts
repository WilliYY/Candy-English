import { createHash } from "node:crypto";

import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export type PersistOwnProfileInput = {
  address?: string;
  birthDate?: Date;
  gender?: string;
  guardianDocument?: string;
  motherName?: string;
  motherPhone?: string;
  name: string;
  notes?: string;
  phone?: string;
  studentPhone?: string;
  studentPhoneAlt?: string;
};

export type MobileStudentProfile = {
  address: string | null;
  avatarRevision: string | null;
  birthDate: string | null;
  email: string;
  gender: string | null;
  guardianDocument: string | null;
  hasAvatar: boolean;
  level: string | null;
  motherName: string | null;
  motherPhone: string | null;
  name: string;
  notes: string | null;
  phone: string | null;
  studentPhone: string | null;
  studentPhoneAlt: string | null;
};

type MobileStudentProfileRecord = {
  address: string | null;
  avatarPath: string | null;
  email: string;
  name: string;
  phone: string | null;
  studentProfile: {
    birthDate: Date | null;
    gender: string | null;
    guardianDocument: string | null;
    level: string | null;
    motherName: string | null;
    motherPhone: string | null;
    notes: string | null;
    studentPhone: string | null;
    studentPhoneAlt: string | null;
  } | null;
};

function toNullable<TValue>(value: TValue | undefined) {
  return value ?? null;
}

function avatarRevision(avatarPath: string | null) {
  return avatarPath
    ? createHash("sha256").update(avatarPath).digest("hex").slice(0, 16)
    : null;
}

export function toMobileStudentProfile(
  user: MobileStudentProfileRecord,
): MobileStudentProfile {
  const profile = user.studentProfile;

  return {
    address: user.address,
    avatarRevision: avatarRevision(user.avatarPath),
    birthDate: profile?.birthDate?.toISOString().slice(0, 10) ?? null,
    email: user.email,
    gender: profile?.gender ?? null,
    guardianDocument: profile?.guardianDocument ?? null,
    hasAvatar: Boolean(user.avatarPath),
    level: profile?.level ?? null,
    motherName: profile?.motherName ?? null,
    motherPhone: profile?.motherPhone ?? null,
    name: user.name,
    notes: profile?.notes ?? null,
    phone: user.phone,
    studentPhone: profile?.studentPhone ?? null,
    studentPhoneAlt: profile?.studentPhoneAlt ?? null,
  };
}

export async function getMobileStudentProfile(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      role: "STUDENT",
    },
    select: {
      address: true,
      avatarPath: true,
      email: true,
      name: true,
      phone: true,
      studentProfile: {
        select: {
          birthDate: true,
          gender: true,
          guardianDocument: true,
          level: true,
          motherName: true,
          motherPhone: true,
          notes: true,
          studentPhone: true,
          studentPhoneAlt: true,
        },
      },
    },
  });

  return user ? toMobileStudentProfile(user) : null;
}

export async function persistOwnProfile(
  actor: { role: Role; userId: string },
  input: PersistOwnProfileInput,
) {
  const prisma = getPrisma();
  const {
    address,
    birthDate,
    gender,
    guardianDocument,
    motherName,
    motherPhone,
    name,
    notes,
    phone,
    studentPhone,
    studentPhoneAlt,
  } = input;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.userId },
      data: {
        address: toNullable(address),
        name,
        phone: toNullable(phone),
      },
    });

    if (actor.role === "STUDENT") {
      const studentData = {
        birthDate: toNullable(birthDate),
        gender: toNullable(gender),
        guardianDocument: toNullable(guardianDocument),
        motherName: toNullable(motherName),
        motherPhone: toNullable(motherPhone),
        notes: toNullable(notes),
        studentPhone: toNullable(studentPhone),
        studentPhoneAlt: toNullable(studentPhoneAlt),
      };

      await tx.studentProfile.upsert({
        where: { userId: actor.userId },
        create: {
          ...studentData,
          userId: actor.userId,
        },
        update: studentData,
      });
    }
  });
}
