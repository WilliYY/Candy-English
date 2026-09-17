import { morningBodySchema } from "@/lib/validations/catty-morning";
import { routineDateKey } from "./routine-domain";

export const MORNING_ID = "morning-interno";
export const MORNING_ZONE = "America/Sao_Paulo";
const clock = new Intl.DateTimeFormat("en-US", { timeZone: MORNING_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const weekdayFormat = new Intl.DateTimeFormat("en-US", { timeZone: MORNING_ZONE, weekday: "long" });
const openings = [
  "Good morning, everyone! It's DAY!", "Morning, team! Happy DAY!", "Happy DAY! Morning, everyone!",
  "Good morning! DAY is here!", "Morning, everyone! It's DAY today!", "Good morning, team! Hello, DAY!",
  "Happy DAY, everyone!", "Morning! Here's to a good DAY!", "Good morning, all! It's DAY!",
  "Hello, team! Good morning this DAY!", "Good morning! Happy DAY, team!", "Morning, everyone! Hello, DAY!",
  "Happy DAY, team! Good morning!", "Good morning, everyone! A new DAY is here!", "Morning, all! Happy DAY!",
  "Good morning, team! It's DAY today!", "Hello, everyone! Happy DAY morning!",
];
const emojis = ["☀️", "🌿", "💛", "☕", "🐾", "✨", "🌻", "🍀", "😊", "🌤️", "🧡", "🙌", "🌼", "💚", "🫶", "🌞", "💫", "🦋", "🌈"];
const themes = ["small wins", "patience with learners", "taking a short break", "a busy day without pressure", "helping each other", "enjoying a class", "being kind to yourself", "keeping lessons simple", "a calm start", "noticing student progress", "ending the day with time to rest"];

/** Resolve local 08:00 with IANA timezone rules, not a fixed UTC offset. */
export function morningAt(date: string) {
  const target = Date.parse(`${date}T08:00:00Z`);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(clock.formatToParts(new Date(guess)).map(v => [v.type, v.value]));
    const local = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    guess += target - local;
  }
  return new Date(guess);
}
export function nextMorningAt(now: Date) {
  const today = routineDateKey(now);
  const current = morningAt(today);
  if (current > now) return current;
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return morningAt(tomorrow);
}
export function morningContext(now: Date) {
  const date = routineDateKey(now);
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
  const weekday = weekdayFormat.format(now);
  return { date, weekday, opening: openings[day % openings.length].replace("DAY", weekday), emoji: emojis[day % emojis.length], theme: themes[day % themes.length], weekend: weekday === "Saturday" || weekday === "Sunday" };
}
type Schedule = { enabled: boolean; startsAt: Date; lateDate: string | null; lateUntil: Date | null };
export function morningDue(routine: Schedule, now: Date) {
  if (!routine.enabled) return false;
  const today = routineDateKey(now);
  if (routine.lateDate === today && routine.lateUntil && now < routine.lateUntil) return true;
  const at = morningAt(today);
  return now >= routine.startsAt && now >= at && now.getTime() < at.getTime() + 15 * 60_000;
}
const normalized = (text: string) => text.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
export function validateMorningBody(value: unknown, recent: string[]) {
  const { sentences } = morningBodySchema.parse(value);
  const seen = recent.map(normalized);
  for (const sentence of sentences) {
    if (/\b(bom|dia|professores|voce|você|aulas|obrigad[oa]|nao|não|hoje|amanha|amanhã|pessoal|senhores|financeiro|senha|payment|invoice|password)\b/i.test(sentence) ||
      !/\b(the|a|your|you|we|our|it|to|and|have|hope|take|let|be|can|is)\b/i.test(sentence) ||
      seen.some(previous => previous.includes(normalized(sentence)))) throw new Error("MORNING_CONTENT_INVALID");
  }
  if (new Set(sentences.map(normalized)).size !== sentences.length) throw new Error("MORNING_CONTENT_REPEATED");
  return sentences;
}
