export const ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

export function getDefaultAvaPath(role: Role) {
  if (role === "ADMIN") return "/ava/admin";
  if (role === "TEACHER") return "/ava/teacher";
  return "/ava/student";
}

export function canAccessRole(userRole: Role, allowedRoles: readonly Role[]) {
  return allowedRoles.includes(userRole);
}

export function isRole(role: unknown): role is Role {
  return role === "ADMIN" || role === "TEACHER" || role === "STUDENT";
}
