import { getPrisma } from "../src/lib/prisma";
import { configureMorningRoutine } from "../src/lib/catty-whatsapp/morning-admin";
import { MORNING_ID } from "../src/lib/catty-whatsapp/morning-domain";

// Explicit operator action only. No embedded recipients or identities in source/migration.
const args = process.argv.slice(2);
if (!args.includes("--confirm") || args.includes("--enable") === args.includes("--pause")) throw new Error("Use --enable or --pause, --actor-email <active admin>, --confirm; optional --send-today requires explicit approval.");
const email = args[args.indexOf("--actor-email") + 1];
if (!args.includes("--actor-email") || !email) throw new Error("ADMIN_IDENTITY_REQUIRED");
const store = getPrisma();
try {
  const actor = await store.user.findUnique({ where: { email }, select: { id: true } });
  if (!actor) throw new Error("ADMIN_NOT_FOUND");
  const current = await store.cattyMorningRoutine.findUnique({ where: { id: MORNING_ID } });
  const result = await configureMorningRoutine(actor.id, { enabled: args.includes("--enable"), expectedVersion: current?.updatedAt.toISOString() ?? null, confirm: true }, { lateToday: args.includes("--send-today") });
  console.log(result.message);
  console.log("Operation recorded. The existing server worker processes authorized sends; this command does not call sendGroup.");
} finally { await store.$disconnect(); }
