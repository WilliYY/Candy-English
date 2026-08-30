import { getPrisma } from "../src/lib/prisma";
import { anonymizeExpiredUsers } from "../src/lib/user-retention-service";

const apply = process.argv.includes("--apply");

try {
  const result = await anonymizeExpiredUsers({ apply });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await getPrisma().$disconnect();
}
