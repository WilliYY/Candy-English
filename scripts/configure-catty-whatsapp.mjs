import { randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Explicit operator step. Generates only missing dedicated keys; never prints values.
if (!process.argv.includes("--apply")) throw new Error("Use --apply after validation and backup. This enables infrastructure, not replies.");
const path = resolve(".env");
const original = readFileSync(path, "utf8");
const keys = ["CATTY_WHATSAPP_ENCRYPTION_KEY", "CATTY_WHATSAPP_WEBHOOK_SECRET", "CATTY_WHATSAPP_WORKER_SECRET", "CATTY_EVOLUTION_API_KEY", "CATTY_EVOLUTION_DB_PASSWORD"];
let updated = original;
const values = [];
for (const name of keys) {
  const pattern = new RegExp(`^${name}=(.*)$`, "gm");
  const matches = [...updated.matchAll(pattern)];
  if (matches.length > 1) throw new Error(`Duplicate configuration key: ${name}`);
  const existing = matches[0]?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  if (existing && !/^[a-f\d]{64}$/i.test(existing)) throw new Error(`Invalid existing value: ${name}. Review without revealing it.`);
  const value = existing || randomBytes(32).toString("hex");
  values.push(value);
  updated = matches.length ? updated.replace(pattern, `${name}="${value}"`) : `${updated.trimEnd()}\n${name}="${value}"\n`;
}
if (new Set(values).size !== keys.length) throw new Error("Dedicated keys must be independent");
const enabledPattern = /^CATTY_WHATSAPP_ENABLED=.*$/gm;
if ([...updated.matchAll(enabledPattern)].length > 1) throw new Error("Duplicate enable flag");
updated = enabledPattern.test(updated) ? updated.replace(enabledPattern, 'CATTY_WHATSAPP_ENABLED="true"') : `${updated.trimEnd()}\nCATTY_WHATSAPP_ENABLED="true"\n`;
// Keep future plain docker compose deployments on the required app network.
const composePattern = /^COMPOSE_FILE=.*$/gm;
const compose = 'COMPOSE_FILE="docker-compose.yml:docker-compose.whatsapp.yml"';
const existingCompose = updated.match(composePattern);
if (existingCompose && (existingCompose.length !== 1 || existingCompose[0] !== compose)) throw new Error("Existing COMPOSE_FILE differs; review before changing deployment workflow");
if (!existingCompose) updated = `${updated.trimEnd()}\n${compose}\n`;
const backup = `${path}.catty-before-${Date.now()}`;
copyFileSync(path, backup); chmodSync(backup, 0o600);
const temporary = `${path}.catty-pending`;
writeFileSync(temporary, updated, { mode: 0o600, flag: "wx" });
renameSync(temporary, path); chmodSync(path, 0o600);
console.log("Dedicated Catty configuration saved. Protected previous .env preserved. No QR generated or messages sent. Database pause unchanged.");
