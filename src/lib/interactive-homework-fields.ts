export const HOMEWORK_FIELD_TYPES = [
  "TINY_TEXT",
  "SHORT_TEXT",
  "LONG_TEXT",
  "CHECKBOX",
  "DRAWING",
  "LISTENING",
] as const;

export type InteractiveHomeworkFieldType =
  (typeof HOMEWORK_FIELD_TYPES)[number];

export const TINY_TEXT_MAX_LENGTH = 2;
export const LISTENING_SENTENCE_MAX_LENGTH = 2000;

export function normalizeTinyTextAnswer(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, TINY_TEXT_MAX_LENGTH);
}

export function normalizeListeningSentence(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LISTENING_SENTENCE_MAX_LENGTH);
}
