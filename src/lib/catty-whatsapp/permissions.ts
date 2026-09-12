export function isActiveWhatsappAdmin(user: { role: string; isActive: boolean; deletedAt: Date | null } | null) {
  return Boolean(user && user.role === "ADMIN" && user.isActive && !user.deletedAt);
}
