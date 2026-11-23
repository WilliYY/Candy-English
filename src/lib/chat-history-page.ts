const PAGE_SIZE = 200;

type Cursor = { createdAt: Date; id: string };

export function parseChatHistoryCursor(value: string): Cursor | null {
  const [timestamp, id, extra] = value.split("|");
  if (!timestamp || !id || extra !== undefined || !/^[\w-]{1,128}$/.test(id)) return null;
  const createdAt = new Date(timestamp);
  if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== timestamp) return null;
  return { createdAt, id };
}

export function chatHistoryQuery(before?: Cursor) {
  return {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: PAGE_SIZE + 1,
    where: before && {
      OR: [{ createdAt: { lt: before.createdAt } }, { createdAt: before.createdAt, id: { lt: before.id } }],
    },
  };
}

export function chatHistoryPage<T extends Cursor>(rows: T[]) {
  const messages = rows.slice(0, PAGE_SIZE).reverse();
  const oldest = messages[0];
  const nextBefore = rows.length > PAGE_SIZE ? `${oldest.createdAt.toISOString()}|${oldest.id}` : null;
  return { messages, nextBefore };
}

export function mobileChatHistoryResponse<T>(page: { messages: T[]; nextBefore: string | null }, query: URLSearchParams) {
  if (query.get("pagination") === "1") return { ok: true, messages: page.messages, nextBefore: page.nextBefore };
  return { ok: true, messages: page.messages };
}
