import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import type { ADMIN_CREDENTIAL_KINDS } from "@/lib/validations/admin-credentials";

const CIPHER_ALGORITHM = "aes-256-gcm";
const CIPHER_VERSION = "v1";

type AdminCredentialKind = (typeof ADMIN_CREDENTIAL_KINDS)[number];

type EnvironmentCredentialDefinition = {
  kind: AdminCredentialKind;
  label: string;
  notes: string;
  service: string;
  sourceKey: string;
  url?: string;
  value: string;
};

function getEncryptionSecret() {
  const secret =
    process.env.ADMIN_CREDENTIALS_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();

  if (!secret || secret.length < 16) {
    throw new Error(
      "Configure AUTH_SECRET ou ADMIN_CREDENTIALS_SECRET para proteger APIs e senhas.",
    );
  }

  return secret;
}

function getEncryptionKey() {
  return createHash("sha256").update(getEncryptionSecret(), "utf8").digest();
}

export function encryptAdminCredentialSecret(secret: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    CIPHER_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptAdminCredentialSecret(ciphertext: string) {
  const [version, iv, tag, encrypted] = ciphertext.split(":");

  if (version !== CIPHER_VERSION || !iv || !tag || !encrypted) {
    throw new Error("Formato de credencial invalido.");
  }

  const decipher = createDecipheriv(
    CIPHER_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function getAdminCredentialSecretDigest(secret: string) {
  return createHmac("sha256", getEncryptionKey())
    .update(secret, "utf8")
    .digest("base64url");
}

export function getAdminCredentialSecretPreview(secret: string) {
  const trimmed = secret.trim();

  if (!trimmed) {
    return "valor vazio";
  }

  if (trimmed.length <= 8) {
    return "********";
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function getOptionalEnvValue(key: string) {
  const value = process.env[key]?.trim();

  return value ? value : null;
}

export function getEnvironmentCredentialDefinitions() {
  const definitions: EnvironmentCredentialDefinition[] = [];
  const geminiKey = getOptionalEnvValue("GEMINI_API_KEY");
  const geminiCattyModel = getOptionalEnvValue("GEMINI_CATTY_MODEL");
  const openAiKey = getOptionalEnvValue("OPENAI_API_KEY");
  const openAiCattyModel = getOptionalEnvValue("OPENAI_CATTY_MODEL");
  const homeworkModel = getOptionalEnvValue("OPENAI_HOMEWORK_OCR_MODEL");
  const googleClientId = getOptionalEnvValue("GOOGLE_CLIENT_ID");
  const googleClientSecret = getOptionalEnvValue("GOOGLE_CLIENT_SECRET");
  const jitsiDomain = getOptionalEnvValue("NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN");

  if (geminiKey) {
    definitions.push({
      kind: "API_KEY",
      label: "Gemini API Key",
      notes:
        "Usada pela Catty como provedor padrao de conversa antes do fallback local.",
      service: "Google Gemini",
      sourceKey: "env:GEMINI_API_KEY",
      url: "https://aistudio.google.com/apikey",
      value: geminiKey,
    });
  }

  if (geminiCattyModel) {
    definitions.push({
      kind: "CONFIG",
      label: "Modelo Gemini da Catty",
      notes: "Modelo usado pela Catty nas respostas normais com Gemini.",
      service: "Google Gemini",
      sourceKey: "env:GEMINI_CATTY_MODEL",
      value: geminiCattyModel,
    });
  }

  if (openAiKey) {
    definitions.push({
      kind: "API_KEY",
      label: "OpenAI API Key",
      notes:
        "Usada pela Catty apenas quando a mensagem chama Catty pelo nome e pelos recursos opcionais de IA.",
      service: "OpenAI",
      sourceKey: "env:OPENAI_API_KEY",
      url: "https://platform.openai.com/api-keys",
      value: openAiKey,
    });
  }

  if (openAiCattyModel) {
    definitions.push({
      kind: "CONFIG",
      label: "Modelo OpenAI da Catty",
      notes:
        "Modelo usado pela Catty no modo OpenAI acionado por chamada nominal.",
      service: "OpenAI",
      sourceKey: "env:OPENAI_CATTY_MODEL",
      value: openAiCattyModel,
    });
  }

  if (homeworkModel) {
    definitions.push({
      kind: "CONFIG",
      label: "Modelo OCR homework",
      notes: "Modelo reservado para sugestoes futuras de campos em homework.",
      service: "OpenAI",
      sourceKey: "env:OPENAI_HOMEWORK_OCR_MODEL",
      value: homeworkModel,
    });
  }

  if (googleClientId) {
    definitions.push({
      kind: "CONFIG",
      label: "Google Client ID",
      notes: "Identificador publico do login Google.",
      service: "Google OAuth",
      sourceKey: "env:GOOGLE_CLIENT_ID",
      value: googleClientId,
    });
  }

  if (googleClientSecret) {
    definitions.push({
      kind: "API_KEY",
      label: "Google Client Secret",
      notes: "Segredo do login Google.",
      service: "Google OAuth",
      sourceKey: "env:GOOGLE_CLIENT_SECRET",
      value: googleClientSecret,
    });
  }

  if (jitsiDomain) {
    definitions.push({
      kind: "URL",
      label: "Dominio Jitsi aula ao vivo",
      notes: "Dominio usado para criar e embutir salas de aula ao vivo.",
      service: "Jitsi",
      sourceKey: "env:NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN",
      url: `https://${jitsiDomain}`,
      value: jitsiDomain,
    });
  }

  return definitions;
}

export async function syncEnvironmentAdminCredentials(createdByUserId?: string) {
  const prisma = getPrisma();
  const definitions = getEnvironmentCredentialDefinitions();
  let created = 0;
  let updated = 0;

  for (const definition of definitions) {
    const secretCiphertext = encryptAdminCredentialSecret(definition.value);
    const secretDigest = getAdminCredentialSecretDigest(definition.value);
    const secretPreview = getAdminCredentialSecretPreview(definition.value);
    const existing = await prisma.adminCredential.findUnique({
      where: {
        sourceKey: definition.sourceKey,
      },
      select: {
        id: true,
        secretDigest: true,
      },
    });

    if (!existing) {
      await prisma.adminCredential.create({
        data: {
          createdByUserId,
          kind: definition.kind,
          label: definition.label,
          notes: definition.notes,
          secretCiphertext,
          secretDigest,
          secretPreview,
          service: definition.service,
          source: "ENV",
          sourceKey: definition.sourceKey,
          updatedByUserId: createdByUserId,
          url: definition.url,
        },
      });
      created += 1;
      continue;
    }

    if (existing.secretDigest !== secretDigest) {
      await prisma.adminCredential.update({
        where: {
          id: existing.id,
        },
        data: {
          kind: definition.kind,
          label: definition.label,
          notes: definition.notes,
          secretCiphertext,
          secretDigest,
          secretPreview,
          service: definition.service,
          updatedByUserId: createdByUserId,
          url: definition.url,
        },
      });
      updated += 1;
    }
  }

  return {
    created,
    total: definitions.length,
    updated,
  };
}
