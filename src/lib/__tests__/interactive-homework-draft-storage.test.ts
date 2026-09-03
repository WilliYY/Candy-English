import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAllInteractiveDrafts,
  getInteractiveDraftStorageKey,
  INTERACTIVE_DRAFT_MAX_AGE_MS,
  readInteractiveDraft,
  writeInteractiveDraft,
} from "../interactive-homework-draft-storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("stores and restores a recent interactive homework draft", () => {
  const storage = new MemoryStorage();
  const now = Date.UTC(2026, 8, 3, 12);

  writeInteractiveDraft(storage, "homework-1", { answer: "Hello" }, "homework", now);

  assert.deepEqual(
    readInteractiveDraft(storage, "homework-1", "homework", now + 60_000),
    { answer: "Hello" },
  );
});

test("removes a draft after the seven-day privacy window", () => {
  const storage = new MemoryStorage();
  const now = Date.UTC(2026, 8, 3, 12);
  const key = getInteractiveDraftStorageKey("homework-2", "homework");

  writeInteractiveDraft(storage, "homework-2", { answer: "Old answer" }, "homework", now);

  assert.equal(
    readInteractiveDraft(
      storage,
      "homework-2",
      "homework",
      now + INTERACTIVE_DRAFT_MAX_AGE_MS + 1,
    ),
    null,
  );
  assert.equal(storage.getItem(key), null);
});

test("rejects malformed drafts and removes them from the device", () => {
  const storage = new MemoryStorage();
  const key = getInteractiveDraftStorageKey("homework-3", "homework");
  storage.setItem(key, JSON.stringify({ savedAt: "invalid", values: ["unsafe"] }));

  assert.equal(readInteractiveDraft(storage, "homework-3"), null);
  assert.equal(storage.getItem(key), null);
});

test("clears only interactive draft keys during logout", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    getInteractiveDraftStorageKey("homework-4", "homework"),
    "draft",
  );
  storage.setItem(
    getInteractiveDraftStorageKey("mission-1", "candy-xp"),
    "draft",
  );
  storage.setItem("candy_site_visit_total_v1", "120");

  assert.equal(clearAllInteractiveDrafts(storage), 2);
  assert.equal(storage.getItem("candy_site_visit_total_v1"), "120");
  assert.equal(storage.length, 1);
});
