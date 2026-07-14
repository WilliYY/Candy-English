export const ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

export const SECRETARIA_FEATURES = [
  "pre-registrations",
  "contracts",
  "finance",
  "agenda",
  "expenses",
  "reports",
  "units",
  "administration",
  "credentials",
] as const;

export type SecretariaFeature = (typeof SECRETARIA_FEATURES)[number];

export type SecretariaAccessScope =
  | "ALL"
  | "OWN_OR_ASSIGNED"
  | "NONE"
  | "NECESSARY_ONLY";

export const SECRETARIA_PERMISSION_MATRIX = {
  ADMIN: {
    access: true,
    agenda: "ALL",
    conversion: "Converte qualquer pre-cadastro e pode escolher teacher.",
    expenses: "ALL",
    features: {
      administration: true,
      agenda: true,
      contracts: true,
      credentials: true,
      expenses: true,
      finance: true,
      "pre-registrations": true,
      reports: true,
      units: true,
    },
    finance: "ALL",
    preRegistrations: "ALL",
    sensitiveData: "Acesso administrativo completo.",
    units: "ALL",
  },
  TEACHER: {
    access: true,
    agenda: "NONE",
    conversion:
      "Converte somente pre-cadastros proprios ou atribuidos a sua teacher.",
    expenses: "NONE",
    features: {
      administration: false,
      agenda: false,
      contracts: true,
      credentials: false,
      expenses: false,
      finance: false,
      "pre-registrations": true,
      reports: false,
      units: false,
    },
    finance: "NONE",
    preRegistrations: "OWN_OR_ASSIGNED",
    sensitiveData: "Apenas dados necessarios do interessado/aluno vinculado.",
    units: "NECESSARY_ONLY",
  },
  STUDENT: {
    access: false,
    agenda: "NONE",
    conversion: "Nao acessa Secretaria.",
    expenses: "NONE",
    features: {
      administration: false,
      agenda: false,
      contracts: false,
      credentials: false,
      expenses: false,
      finance: false,
      "pre-registrations": false,
      reports: false,
      units: false,
    },
    finance: "NONE",
    preRegistrations: "NONE",
    sensitiveData: "Nao acessa Secretaria.",
    units: "NONE",
  },
} satisfies Record<
  Role,
  {
    access: boolean;
    agenda: SecretariaAccessScope;
    conversion: string;
    expenses: SecretariaAccessScope;
    features: Record<SecretariaFeature, boolean>;
    finance: SecretariaAccessScope;
    preRegistrations: SecretariaAccessScope;
    sensitiveData: string;
    units: SecretariaAccessScope;
  }
>;

export function canAccessSecretaria(role: Role) {
  return SECRETARIA_PERMISSION_MATRIX[role].access;
}

export function canAccessSecretariaFeature(
  role: Role,
  feature: SecretariaFeature,
) {
  return SECRETARIA_PERMISSION_MATRIX[role].features[feature];
}

export function getDefaultAvaPath(role: Role) {
  if (role === "ADMIN" || role === "TEACHER") return "/ava/escolha";
  return "/ava/student";
}

export function getPedagogicalAvaPath(role: Role) {
  if (role === "ADMIN") return "/ava/admin?task=usuarios";
  if (role === "TEACHER") return "/ava/teacher?task=resumo";
  return "/ava/student";
}

export function getSecretariaPath(role: Role) {
  if (canAccessSecretaria(role)) return "/ava/secretaria";
  return "/ava/student";
}

export function canAccessRole(userRole: Role, allowedRoles: readonly Role[]) {
  return allowedRoles.includes(userRole);
}

export function isRole(role: unknown): role is Role {
  return role === "ADMIN" || role === "TEACHER" || role === "STUDENT";
}
