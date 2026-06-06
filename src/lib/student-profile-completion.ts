export const STUDENT_PROFILE_COMPLETION_MAX_XP = 300;

export type StudentProfileCompletionInput = {
  address?: string | null;
  avatarPath?: string | null;
  birthDate?: Date | string | null;
  guardianDocument?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  name?: string | null;
  phone?: string | null;
  studentPhone?: string | null;
};

type StudentProfileCompletionField = {
  key: keyof StudentProfileCompletionInput;
  label: string;
};

const STUDENT_PROFILE_COMPLETION_FIELDS = [
  { key: "avatarPath", label: "Foto do perfil" },
  { key: "name", label: "Nome completo" },
  { key: "phone", label: "Telefone geral" },
  { key: "address", label: "Endereco" },
  { key: "studentPhone", label: "Telefone do aluno" },
  { key: "birthDate", label: "Data de nascimento" },
  { key: "guardianDocument", label: "Documento/responsavel" },
  { key: "motherName", label: "Nome da mae/responsavel" },
  { key: "motherPhone", label: "Telefone da mae/responsavel" },
] satisfies StudentProfileCompletionField[];

function hasCompletionValue(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function getStudentProfileCompletion(
  input: StudentProfileCompletionInput,
) {
  const items = STUDENT_PROFILE_COMPLETION_FIELDS.map((field) => ({
    completed: hasCompletionValue(input[field.key]),
    key: field.key,
    label: field.label,
  }));
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const xp = Math.round(
    (percent / 100) * STUDENT_PROFILE_COMPLETION_MAX_XP,
  );

  return {
    completedCount,
    isComplete: percent >= 100,
    items,
    missingItems: items.filter((item) => !item.completed),
    percent,
    totalCount,
    xp,
  };
}

export type StudentProfileCompletion = ReturnType<
  typeof getStudentProfileCompletion
>;
