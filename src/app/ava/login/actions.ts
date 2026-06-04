"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import {
  studentPreRegistrationSchema,
  type StudentPreRegistrationInput,
} from "@/lib/validations/pre-registration";

export type StudentPreRegistrationResult = {
  errors?: Partial<Record<keyof StudentPreRegistrationInput, string>>;
  message: string;
  ok: boolean;
};

const PRE_REGISTRATION_SUCCESS_MESSAGE =
  "Recebemos seu cadastro. A equipe Candy vai analisar e entrar em contato.";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function fieldErrors<TInput extends Record<string, unknown>>(
  issues: { message: string; path: PropertyKey[] }[],
) {
  return issues.reduce<Partial<Record<keyof TInput, string>>>(
    (accumulator, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        accumulator[fieldName as keyof TInput] = issue.message;
      }

      return accumulator;
    },
    {},
  );
}

export async function requestStudentPreRegistration(
  input: StudentPreRegistrationInput,
): Promise<StudentPreRegistrationResult> {
  const parsed = studentPreRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<StudentPreRegistrationInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do pre-cadastro.",
    };
  }

  const prisma = getPrisma();
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: true,
      message: PRE_REGISTRATION_SUCCESS_MESSAGE,
    };
  }

  const existingRequest = await prisma.studentPreRegistration.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingRequest) {
    return {
      ok: true,
      message: PRE_REGISTRATION_SUCCESS_MESSAGE,
    };
  }

  try {
    await prisma.studentPreRegistration.create({
      data: {
        address: parsed.data.address ?? null,
        birthDate: parsed.data.birthDate ?? null,
        email: parsed.data.email,
        englishGoal: parsed.data.englishGoal,
        fullName: parsed.data.fullName,
        guardianDocument: parsed.data.guardianDocument ?? null,
        guardianName: parsed.data.guardianName ?? null,
        guardianPhone: parsed.data.guardianPhone ?? null,
        notes: parsed.data.notes ?? null,
        phone: parsed.data.phone,
        secondaryContact: parsed.data.secondaryContact ?? null,
        studentPhone: parsed.data.studentPhone ?? null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: true,
        message: PRE_REGISTRATION_SUCCESS_MESSAGE,
      };
    }

    return {
      ok: false,
      message: "Nao foi possivel enviar seu cadastro agora.",
    };
  }

  revalidatePath("/ava/login");

  return {
    ok: true,
    message: PRE_REGISTRATION_SUCCESS_MESSAGE,
  };
}
