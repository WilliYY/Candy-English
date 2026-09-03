export const INTERACTIVE_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const INTERACTIVE_DRAFT_PREFIX = "candy:interactive-";
const INTERACTIVE_DRAFT_MARKER = "-draft:";

type DraftValues = Record<string, string>;

type BrowserStorage = {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

export function getInteractiveDraftStorageKey(
  activityId: string,
  context = "homework",
) {
  if (context === "homework") {
    return `${INTERACTIVE_DRAFT_PREFIX}homework-draft:${activityId}`;
  }

  return `${INTERACTIVE_DRAFT_PREFIX}${context}-draft:${activityId}`;
}

function isInteractiveDraftKey(key: string) {
  return key.startsWith(INTERACTIVE_DRAFT_PREFIX) && key.includes(INTERACTIVE_DRAFT_MARKER);
}

function parseDraft(rawDraft: string, now: number): DraftValues | null {
  const parsed: unknown = JSON.parse(rawDraft);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("savedAt" in parsed) ||
    !("values" in parsed)
  ) {
    return null;
  }

  const savedAt = Date.parse(String(parsed.savedAt));
  const maybeValues = parsed.values;

  if (
    !Number.isFinite(savedAt) ||
    savedAt > now ||
    now - savedAt > INTERACTIVE_DRAFT_MAX_AGE_MS ||
    !maybeValues ||
    typeof maybeValues !== "object" ||
    Array.isArray(maybeValues)
  ) {
    return null;
  }

  const values = Object.entries(maybeValues).reduce<DraftValues>(
    (draft, [fieldId, value]) => {
      if (typeof value === "string") {
        draft[fieldId] = value;
      }

      return draft;
    },
    {},
  );

  return values;
}

export function readInteractiveDraft(
  storage: BrowserStorage,
  activityId: string,
  context = "homework",
  now = Date.now(),
) {
  const key = getInteractiveDraftStorageKey(activityId, context);

  try {
    const rawDraft = storage.getItem(key);

    if (!rawDraft) {
      return null;
    }

    const values = parseDraft(rawDraft, now);

    if (!values) {
      storage.removeItem(key);
    }

    return values;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }

    return null;
  }
}

export function writeInteractiveDraft(
  storage: BrowserStorage,
  activityId: string,
  values: DraftValues,
  context = "homework",
  now = Date.now(),
) {
  const key = getInteractiveDraftStorageKey(activityId, context);

  try {
    const hasContent = Object.values(values).some((value) => value.length > 0);

    if (!hasContent) {
      storage.removeItem(key);
      return;
    }

    storage.setItem(
      key,
      JSON.stringify({
        savedAt: new Date(now).toISOString(),
        values,
      }),
    );
  } catch {
    // The server autosave remains the primary copy when storage is unavailable.
  }
}

export function clearInteractiveDraft(
  storage: BrowserStorage,
  activityId: string,
  context = "homework",
) {
  try {
    storage.removeItem(getInteractiveDraftStorageKey(activityId, context));
  } catch {
    // Cleanup must not block the activity flow.
  }
}

export function clearAllInteractiveDrafts(storage: BrowserStorage) {
  const keysToRemove: string[] = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key && isInteractiveDraftKey(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
    return keysToRemove.length;
  } catch {
    return 0;
  }
}
