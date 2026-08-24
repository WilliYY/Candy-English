export type SuggestedStudentAccess = {
  email: string;
  password: string;
};

function normalizeAccessPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function suggestStudentAccess(name: string): SuggestedStudentAccess {
  const normalizedName = normalizeAccessPart(name);
  const loginName = normalizedName || "aluno";
  const firstName = loginName.split(".")[0] || "aluno";
  const basePassword = `${firstName}candy`;

  return {
    email: `${loginName}@candy.local`,
    password:
      basePassword.length >= 8
        ? basePassword
        : `${basePassword}${"1".repeat(8 - basePassword.length)}`,
  };
}
