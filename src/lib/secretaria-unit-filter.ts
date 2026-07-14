export const SECRETARIA_UNIT_FILTER_VALUES = [
  "all",
  "IVATE",
  "DOURADINA",
] as const;

export type SecretariaUnitFilter = (typeof SECRETARIA_UNIT_FILTER_VALUES)[number];
export type SecretariaSpecificUnit = Exclude<SecretariaUnitFilter, "all">;

export const SECRETARIA_UNIT_FILTER_OPTIONS: ReadonlyArray<{
  description: string;
  label: string;
  value: SecretariaUnitFilter;
}> = [
  {
    description: "Mostra informacoes de Ivaté e Douradina.",
    label: "Todos os polos",
    value: "all",
  },
  {
    description: "Unidade 1 Ivaté.",
    label: "Polo 1 — Ivaté",
    value: "IVATE",
  },
  {
    description: "Unidade 2 Douradina.",
    label: "Polo 2 — Douradina",
    value: "DOURADINA",
  },
];

export const SECRETARIA_UNIT_LABELS: Record<SecretariaUnitFilter, string> = {
  DOURADINA: "Polo 2 — Douradina",
  IVATE: "Polo 1 — Ivaté",
  all: "Todos os polos",
};

export function normalizeSecretariaUnitFilter(
  value: string | string[] | null | undefined,
): SecretariaUnitFilter {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim().toUpperCase();

  if (normalizedValue === "IVATE" || normalizedValue === "DOURADINA") {
    return normalizedValue;
  }

  return "all";
}

export function getSecretariaSelectedUnit(
  filter: SecretariaUnitFilter,
): SecretariaSpecificUnit | null {
  return filter === "all" ? null : filter;
}

export function withSecretariaUnitParam(
  href: string,
  filter: SecretariaUnitFilter | null | undefined,
) {
  if (!filter || filter === "all") {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";

  return `${href}${separator}unit=${filter}`;
}
