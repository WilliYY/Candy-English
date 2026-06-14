export const STUDENT_PROFILE_MAIN_XP = 150;
export const STUDENT_PROFILE_RESPONSIBLE_XP = 200;
export const STUDENT_PROFILE_PHOTO_XP = 500;
export const STUDENT_PROFILE_COMPLETION_MAX_XP =
  STUDENT_PROFILE_MAIN_XP + STUDENT_PROFILE_RESPONSIBLE_XP;

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
  groupKey: StudentProfileCompletionGroupKey;
  key: keyof StudentProfileCompletionInput;
  label: string;
};

type StudentProfileCompletionGroupKey = "main" | "studentResponsible";

type StudentProfileCompletionGroupDefinition = {
  description: string;
  key: StudentProfileCompletionGroupKey;
  label: string;
  maxXp: number;
};

const STUDENT_PROFILE_COMPLETION_GROUPS = [
  {
    description: "Nome, telefone e endereco deixam seu AVA pronto.",
    key: "main",
    label: "Dados principais",
    maxXp: STUDENT_PROFILE_MAIN_XP,
  },
  {
    description: "Dados do aluno e responsavel ajudam a equipe Candy.",
    key: "studentResponsible",
    label: "Aluno e responsavel",
    maxXp: STUDENT_PROFILE_RESPONSIBLE_XP,
  },
] satisfies StudentProfileCompletionGroupDefinition[];

const STUDENT_PROFILE_COMPLETION_FIELDS = [
  { groupKey: "main", key: "name", label: "Nome completo" },
  { groupKey: "main", key: "phone", label: "Telefone geral" },
  { groupKey: "main", key: "address", label: "Endereco" },
  {
    groupKey: "studentResponsible",
    key: "studentPhone",
    label: "Telefone do aluno",
  },
  {
    groupKey: "studentResponsible",
    key: "birthDate",
    label: "Data de nascimento",
  },
  {
    groupKey: "studentResponsible",
    key: "guardianDocument",
    label: "Documento ou responsavel",
  },
  {
    groupKey: "studentResponsible",
    key: "motherName",
    label: "Responsavel",
  },
  {
    groupKey: "studentResponsible",
    key: "motherPhone",
    label: "Telefone do responsavel",
  },
] satisfies StudentProfileCompletionField[];

function hasCompletionValue(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return typeof value === "string" && value.trim().length > 0;
}

function calculateGroupXp(completedCount: number, totalCount: number, maxXp: number) {
  if (totalCount <= 0) {
    return 0;
  }

  return Math.round((completedCount / totalCount) * maxXp);
}

function calculateFieldXp(
  fieldIndex: number,
  totalCount: number,
  maxXp: number,
) {
  if (fieldIndex < 0 || totalCount <= 0) {
    return 0;
  }

  return (
    calculateGroupXp(fieldIndex + 1, totalCount, maxXp) -
    calculateGroupXp(fieldIndex, totalCount, maxXp)
  );
}

export function getStudentProfileCompletion(
  input: StudentProfileCompletionInput,
) {
  const items = STUDENT_PROFILE_COMPLETION_FIELDS.map((field) => {
    const group = STUDENT_PROFILE_COMPLETION_GROUPS.find(
      (candidate) => candidate.key === field.groupKey,
    );
    const groupFields = STUDENT_PROFILE_COMPLETION_FIELDS.filter(
      (candidate) => candidate.groupKey === field.groupKey,
    );
    const fieldIndex = groupFields.findIndex(
      (candidate) => candidate.key === field.key,
    );
    const completed = hasCompletionValue(input[field.key]);
    const completedGroupCount = groupFields.filter((candidate) =>
      hasCompletionValue(input[candidate.key]),
    ).length;
    const currentGroupXp = calculateGroupXp(
      completedGroupCount,
      groupFields.length,
      group?.maxXp ?? 0,
    );
    const nextGroupXp = calculateGroupXp(
      Math.min(completedGroupCount + 1, groupFields.length),
      groupFields.length,
      group?.maxXp ?? 0,
    );
    const fieldXp = calculateFieldXp(
      fieldIndex,
      groupFields.length,
      group?.maxXp ?? 0,
    );

    return {
      completed,
      groupKey: field.groupKey,
      key: field.key,
      label: field.label,
      xp: completed ? fieldXp : Math.max(0, nextGroupXp - currentGroupXp),
    };
  });
  const groups = STUDENT_PROFILE_COMPLETION_GROUPS.map((group) => {
    const groupItems = items.filter((item) => item.groupKey === group.key);
    const completedGroupItems = groupItems.filter((item) => item.completed);
    const totalGroupItems = groupItems.length;
    const groupXp = calculateGroupXp(
      completedGroupItems.length,
      totalGroupItems,
      group.maxXp,
    );

    return {
      completedCount: completedGroupItems.length,
      description: group.description,
      isComplete: completedGroupItems.length === totalGroupItems,
      items: groupItems,
      key: group.key,
      label: group.label,
      maxXp: group.maxXp,
      percent:
        totalGroupItems > 0
          ? Math.round((completedGroupItems.length / totalGroupItems) * 100)
          : 0,
      totalCount: totalGroupItems,
      xp: groupXp,
    };
  });
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const xp = groups.reduce((total, group) => total + group.xp, 0);
  const percent = Math.round((xp / STUDENT_PROFILE_COMPLETION_MAX_XP) * 100);

  return {
    completedCount,
    groups,
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
