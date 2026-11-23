export const FIRST_SCHOOL_YEAR = 2026;
export const LAST_SCHOOL_YEAR = 2100;

export function currentSchoolYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo", year: "numeric",
  }).format(now));
}

export function isSchoolYear(value: number) {
  return Number.isInteger(value) && value >= FIRST_SCHOOL_YEAR && value <= LAST_SCHOOL_YEAR;
}

export function selectedSchoolYear(value: unknown, fallback = currentSchoolYear()) {
  const year = Number(Array.isArray(value) ? value[0] : value);
  return isSchoolYear(year) ? year : Math.max(FIRST_SCHOOL_YEAR, fallback);
}
