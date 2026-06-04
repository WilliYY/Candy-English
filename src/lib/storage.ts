import { randomUUID } from "node:crypto";
import type { Dirent } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  estimatePdfPageCount,
  optimizeFileForStorage,
} from "@/lib/file-optimization";

const STORAGE_ROOT = process.env.AVA_STORAGE_DIR ?? path.join(process.cwd(), "storage");

export const CONTRACT_MAX_BYTES = 8 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const HOMEWORK_ASSET_MAX_BYTES = 14 * 1024 * 1024;

const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedHomeworkAssetTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function getStoragePath(relativePath: string) {
  const normalized = path.normalize(relativePath);

  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("Caminho de arquivo invalido.");
  }

  return path.join(STORAGE_ROOT, normalized);
}

async function getDirectorySize(directory: string): Promise<number> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return 0;
    }

    throw error;
  }

  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getDirectorySize(fullPath);
      }

      if (!entry.isFile()) {
        return 0;
      }

      const file = await stat(fullPath);
      return file.size;
    }),
  );

  return sizes.reduce((total, size) => total + size, 0);
}

export async function getStorageUsageBytes() {
  return getDirectorySize(STORAGE_ROOT);
}

async function saveFileBuffer(directory: string, extension: string, buffer: Buffer) {
  const fileName = `${randomUUID()}${extension}`;
  const relativePath = path.join(directory, fileName);
  const fullPath = getStoragePath(relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer, { flag: "wx" });

  return relativePath;
}

function getPdfMaxUploadBytes() {
  const rawValue = process.env.PDF_MAX_UPLOAD_MB?.trim();

  if (!rawValue) {
    return HOMEWORK_ASSET_MAX_BYTES;
  }

  const value = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(value) || value <= 0) {
    return HOMEWORK_ASSET_MAX_BYTES;
  }

  return Math.round(value * 1024 * 1024);
}

function formatUploadLimit(bytes: number) {
  const value = bytes / (1024 * 1024);

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
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

export async function saveHomeworkAsset(file: File) {
  if (!allowedHomeworkAssetTypes.has(file.type)) {
    throw new Error("Envie um PDF ou imagem PNG, JPG ou WebP.");
  }

  if (file.size <= 0 || file.size > HOMEWORK_ASSET_MAX_BYTES) {
    throw new Error("O arquivo da homework precisa ter ate 14 MB.");
  }

  const extension =
    file.type === "application/pdf"
      ? ".pdf"
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : ".jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = await saveFileBuffer("homework-assets", extension, buffer);

  return {
    mimeType: file.type,
    originalName: file.name,
    relativePath,
    sizeBytes: file.size,
  };
}

export async function saveCandyXpAsset(file: File) {
  if (!allowedHomeworkAssetTypes.has(file.type)) {
    throw new Error("Envie um PDF ou imagem PNG, JPG ou WebP.");
  }

  const maxUploadBytes =
    file.type === "application/pdf"
      ? getPdfMaxUploadBytes()
      : HOMEWORK_ASSET_MAX_BYTES;

  if (file.size <= 0 || file.size > maxUploadBytes) {
    throw new Error(
      `O arquivo Candy XP precisa ter ate ${formatUploadLimit(
        maxUploadBytes,
      )} MB.`,
    );
  }

  const extension =
    file.type === "application/pdf"
      ? ".pdf"
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : ".jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const optimization = await optimizeFileForStorage({
    buffer,
    mimeType: file.type,
  });
  const relativePath = await saveFileBuffer(
    "candy-xp-assets",
    extension,
    optimization.buffer,
  );

  return {
    mimeType: file.type,
    optimizationMessage: optimization.message,
    optimizationPreset: optimization.preset,
    optimizationStatus: optimization.status,
    optimizedSizeBytes: optimization.optimizedSizeBytes,
    originalName: file.name,
    originalSizeBytes: optimization.originalSizeBytes,
    pageCount:
      file.type === "application/pdf"
        ? estimatePdfPageCount(optimization.buffer)
        : 1,
    relativePath,
    sizeBytes: optimization.optimizedSizeBytes,
  };
}
