import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = process.env.AVA_STORAGE_DIR ?? path.join(process.cwd(), "storage");

export const CONTRACT_MAX_BYTES = 8 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getStoragePath(relativePath: string) {
  const normalized = path.normalize(relativePath);

  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("Caminho de arquivo invalido.");
  }

  return path.join(STORAGE_ROOT, normalized);
}

async function saveFileBuffer(directory: string, extension: string, buffer: Buffer) {
  const fileName = `${randomUUID()}${extension}`;
  const relativePath = path.join(directory, fileName);
  const fullPath = getStoragePath(relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer, { flag: "wx" });

  return relativePath;
}

export async function saveContractPdf(file: File) {
  if (file.type !== "application/pdf") {
    throw new Error("Envie um arquivo PDF.");
  }

  if (file.size <= 0 || file.size > CONTRACT_MAX_BYTES) {
    throw new Error("O contrato precisa ter ate 8 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = await saveFileBuffer("contracts", ".pdf", buffer);

  return {
    mimeType: file.type,
    originalName: file.name,
    relativePath,
    sizeBytes: file.size,
  };
}

export async function saveAvatarImage(file: File) {
  if (!allowedAvatarTypes.has(file.type)) {
    throw new Error("Envie uma imagem PNG, JPG ou WebP.");
  }

  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    throw new Error("A foto precisa ter ate 2 MB.");
  }

  const extension = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = await saveFileBuffer("avatars", extension, buffer);

  return {
    mimeType: file.type,
    relativePath,
  };
}
