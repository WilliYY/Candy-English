import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CIPHER_ALGORITHM = "aes-256-gcm";
const CIPHER_VERSION = "v1";
const MFA_ENCRYPTION_CONTEXT = "candy-english:mfa-secret:v1";
const MFA_RECOVERY_CONTEXT = "candy-english:mfa-recovery:v1";
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres para MFA.");
  }

  return secret;
}

function deriveKey(context: string) {
  return createHash("sha256")
    .update(`${context}:${getAuthSecret()}`, "utf8")
    .digest();
}

export function encodeBase32(value: Uint8Array) {
  let bits = 0;
  let bitCount = 0;
  let output = "";

  for (const byte of value) {
    bits = (bits << 8) | byte;
    bitCount += 8;

    while (bitCount >= 5) {
      output += BASE32_ALPHABET[(bits >>> (bitCount - 5)) & 31];
      bitCount -= 5;
    }
  }

  if (bitCount > 0) {
    output += BASE32_ALPHABET[(bits << (5 - bitCount)) & 31];
  }

  return output;
}

export function decodeBase32(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/=+$/, "");

  if (!normalized || /[^A-Z2-7]/.test(normalized)) {
    throw new Error("Segredo MFA em Base32 invalido.");
  }

  let bits = 0;
  let bitCount = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const alphabetIndex = BASE32_ALPHABET.indexOf(character);

    bits = (bits << 5) | alphabetIndex;
    bitCount += 5;

    if (bitCount >= 8) {
      bytes.push((bits >>> (bitCount - 8)) & 255);
      bitCount -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateMfaSecret() {
  return encodeBase32(randomBytes(20));
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    CIPHER_ALGORITHM,
    deriveKey(MFA_ENCRYPTION_CONTEXT),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    CIPHER_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptMfaSecret(value: string) {
  const [version, ivValue, authTagValue, ciphertextValue] = value.split(".");

  if (
    version !== CIPHER_VERSION ||
    !ivValue ||
    !authTagValue ||
    !ciphertextValue
  ) {
    throw new Error("Segredo MFA criptografado em formato invalido.");
  }

  const decipher = createDecipheriv(
    CIPHER_ALGORITHM,
    deriveKey(MFA_ENCRYPTION_CONTEXT),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function getTotpTimeStep(now = Date.now()) {
  return Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
}

export function createTotpCode(secret: string, timeStep: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1]! & 15;
  const binaryCode =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);

  return String(binaryCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function safeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifyTotpCode(
  secret: string,
  code: string,
  options: { now?: number; window?: number } = {},
) {
  const normalizedCode = code.replace(/\D/g, "");

  if (normalizedCode.length !== TOTP_DIGITS) {
    return null;
  }

  const currentTimeStep = getTotpTimeStep(options.now);
  const window = options.window ?? 1;

  for (let offset = -window; offset <= window; offset += 1) {
    const timeStep = currentTimeStep + offset;

    if (
      timeStep >= 0 &&
      safeStringEqual(createTotpCode(secret, timeStep), normalizedCode)
    ) {
      return timeStep;
    }
  }

  return null;
}

export function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(value: string) {
  return createHmac("sha256", deriveKey(MFA_RECOVERY_CONTEXT))
    .update(normalizeRecoveryCode(value), "utf8")
    .digest("hex");
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8).toString("hex").toUpperCase();
    return raw.match(/.{1,4}/g)!.join("-");
  });
}

export function findRecoveryCodeHash(
  code: string,
  recoveryCodeHashes: string[],
) {
  const normalizedCode = normalizeRecoveryCode(code);

  if (normalizedCode.length !== 16) {
    return null;
  }

  const candidateHash = hashRecoveryCode(normalizedCode);

  return (
    recoveryCodeHashes.find((storedHash) =>
      safeStringEqual(storedHash, candidateHash),
    ) ?? null
  );
}

export function buildMfaProvisioningUri(email: string, secret: string) {
  const issuer = "Candy English";
  const accountLabel = `${issuer}:${email.toLowerCase()}`;

  return `otpauth://totp/${encodeURIComponent(accountLabel)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

export type VerifiedMfaCredential =
  | { kind: "recovery"; recoveryHash: string }
  | { kind: "totp"; timeStep: number };

export function verifyMfaCredential(
  secret: string,
  code: string,
  recoveryCodeHashes: string[],
  now = Date.now(),
): VerifiedMfaCredential | null {
  const timeStep = verifyTotpCode(secret, code, { now });

  if (timeStep !== null) {
    return { kind: "totp", timeStep };
  }

  const recoveryHash = findRecoveryCodeHash(code, recoveryCodeHashes);

  return recoveryHash ? { kind: "recovery", recoveryHash } : null;
}
