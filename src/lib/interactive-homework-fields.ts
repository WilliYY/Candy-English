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

export function hasInteractiveHomeworkDrawingContent(value: string) {
  try {
    const parsed = JSON.parse(value) as { strokes?: unknown };

    return (
      Array.isArray(parsed.strokes) &&
      parsed.strokes.some(
        (stroke) =>
          Array.isArray(stroke) &&
          stroke.some(
            (point) =>
              Array.isArray(point) &&
              point.length >= 2 &&
              typeof point[0] === "number" &&
              Number.isFinite(point[0]) &&
              point[0] >= 0 &&
              point[0] <= 100 &&
              typeof point[1] === "number" &&
              Number.isFinite(point[1]) &&
              point[1] >= 0 &&
              point[1] <= 100,
          ),
      )
    );
  } catch {
    return false;
  }
}
