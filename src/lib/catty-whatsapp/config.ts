export function getWhatsappConfig() {
  const env = process.env;
  const encryptionKey = env.CATTY_WHATSAPP_ENCRYPTION_KEY ?? "";
  const webhookSecret = env.CATTY_WHATSAPP_WEBHOOK_SECRET ?? "";
  const workerSecret = env.CATTY_WHATSAPP_WORKER_SECRET ?? "";
  const apiKey = env.CATTY_EVOLUTION_API_KEY ?? "";
  if (env.CATTY_WHATSAPP_ENABLED !== "true" || !/^[a-f\d]{64}$/i.test(encryptionKey) ||
    [webhookSecret, workerSecret, apiKey].some(value => value.length < 32) ||
    new Set([encryptionKey, webhookSecret, workerSecret, apiKey]).size !== 4) return null;
  return { encryptionKey, webhookSecret, workerSecret, apiKey,
    // Dedicated internal Docker endpoint: never taken from an inbound payload or UI.
    baseUrl: "http://catty-evolution:8080", instance: "candy-catty" };
}
export type WhatsappConfig = NonNullable<ReturnType<typeof getWhatsappConfig>>;
