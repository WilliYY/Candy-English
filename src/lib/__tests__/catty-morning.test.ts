import assert from "node:assert/strict";
import test from "node:test";
import { morningContext, nextMorningAt, morningDue, validateMorningBody } from "../catty-whatsapp/morning-domain";

const date = (value: string) => new Date(value);
test("morning uses São Paulo weekday and never a fixed weekly opening", () => {
  const first = morningContext(date("2026-09-17T11:00:00Z"));
  const next = morningContext(date("2026-09-24T11:00:00Z"));
  assert.equal(first.weekday, "Thursday");
  assert.match(first.opening, /Thursday/);
  assert.notEqual(first.opening, next.opening);
  assert.equal(morningContext(date("2026-09-18T01:00:00Z")).weekday, "Thursday");
});
test("next morning handles month/year boundaries and does not replay 8am", () => {
  assert.equal(nextMorningAt(date("2026-12-31T12:00:00Z")).toISOString(), "2027-01-01T11:00:00.000Z");
  assert.equal(nextMorningAt(date("2026-09-17T10:59:59Z")).toISOString(), "2026-09-17T11:00:00.000Z");
});
test("daily delivery has a bounded window, no night/backlog delivery", () => {
  const routine = { enabled: true, startsAt: date("2026-09-17T11:00:00Z"), lateDate: null, lateUntil: null };
  assert.equal(morningDue(routine, date("2026-09-17T10:59:59Z")), false);
  assert.equal(morningDue(routine, date("2026-09-17T11:00:00Z")), true);
  assert.equal(morningDue(routine, date("2026-09-17T11:14:59Z")), true);
  assert.equal(morningDue(routine, date("2026-09-17T11:15:00Z")), false);
  assert.equal(morningDue({ ...routine, enabled: false }, date("2026-09-17T11:01:00Z")), false);
});
test("explicit late delivery applies only to the authorized day and deadline", () => {
  const routine = { enabled: true, startsAt: date("2026-09-18T11:00:00Z"), lateDate: "2026-09-17", lateUntil: date("2026-09-17T15:00:00Z") };
  assert.equal(morningDue(routine, date("2026-09-17T14:30:00Z")), true);
  assert.equal(morningDue(routine, date("2026-09-17T15:00:00Z")), false);
  assert.equal(morningDue(routine, date("2026-09-18T14:30:00Z")), false);
});
test("body accepts short English, rejects repetition, other languages and unsafe output", () => {
  const body = ["Hope your classes feel a little easier today.", "Take a breather when you need one!"];
  assert.equal(validateMorningBody({ sentences: body }, []).join(" "), body.join(" "));
  for (const invalid of [
    { sentences: [body[0]] }, { sentences: ["Bom dia professores!", body[1]] },
    { sentences: ["Visit https://example.com now.", body[1]] },
    { sentences: ["Hello! Do this. Then that.", body[1]] },
    { sentences: ["You can do this 😊", body[1]] },
  ]) assert.throws(() => validateMorningBody(invalid, []));
  assert.throws(() => validateMorningBody({ sentences: body }, [body.join(" ")]));
});
