export type AdminUserPoloUnit = "IVATE" | "DOURADINA";

export type AdminUserPoloTone =
  | "all"
  | "ivate"
  | "douradina"
  | "multiple"
  | "none";

export type AdminUserPoloScope = {
  label: string;
  tone: AdminUserPoloTone;
  units: AdminUserPoloUnit[];
};

type GetAdminUserPoloScopeInput = {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  studentUnit?: AdminUserPoloUnit | null;
  teacherStudentUnits?: AdminUserPoloUnit[];
};

const POLO_LABELS: Record<AdminUserPoloUnit, string> = {
  IVATE: "Polo 1 · Ivaté",
  DOURADINA: "Polo 2 · Douradina",
};

function scopeForUnit(unit: AdminUserPoloUnit): AdminUserPoloScope {
  return {
    label: POLO_LABELS[unit],
    tone: unit === "IVATE" ? "ivate" : "douradina",
    units: [unit],
  };
}

export function getAdminUserPoloScope({
  role,
  studentUnit,
  teacherStudentUnits = [],
}: GetAdminUserPoloScopeInput): AdminUserPoloScope {
  if (role === "ADMIN") {
    return {
      label: "Todos os polos",
      tone: "all",
      units: ["IVATE", "DOURADINA"],
    };
  }

  if (role === "STUDENT") {
    if (studentUnit) {
      return scopeForUnit(studentUnit);
    }

    return {
      label: "Sem polo definido",
      tone: "none",
      units: [],
    };
  }

  const unitSet = new Set(teacherStudentUnits);
  const units = (["IVATE", "DOURADINA"] as const).filter((unit) =>
    unitSet.has(unit),
  );

  if (units.length === 1) {
    return scopeForUnit(units[0]);
  }

  if (units.length === 2) {
    return {
      label: "Ivaté + Douradina",
      tone: "multiple",
      units,
    };
  }

  return {
    label: "Sem polo vinculado",
    tone: "none",
    units: [],
  };
}
