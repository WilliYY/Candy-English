export const ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

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
  if (role === "ADMIN" || role === "TEACHER") return "/ava/secretaria";
  return "/ava/student";
}

export function canAccessRole(userRole: Role, allowedRoles: readonly Role[]) {
  return allowedRoles.includes(userRole);
}

export function isRole(role: unknown): role is Role {
  return role === "ADMIN" || role === "TEACHER" || role === "STUDENT";
}
