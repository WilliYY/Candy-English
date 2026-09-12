import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function keyBuffer(key: string) {
  if (!/^[a-f\d]{64}$/i.test(key)) throw new Error("CATTY_WHATSAPP_ENCRYPTION_KEY_INVALID");
  return Buffer.from(key, "hex");
}
export function encrypt(text: string, purpose: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(key), iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}
export function decrypt(value: string, purpose: string, key: string) {
  const [version, iv, tag, body, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !body || extra) throw new Error("CATTY_CIPHERTEXT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer(key), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}
export function phoneHash(phone: string, key: string) {
  return createHmac("sha256", keyBuffer(key)).update(`catty-whatsapp:phone:${phone}`).digest("hex");
}
