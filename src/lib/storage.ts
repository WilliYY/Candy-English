import { randomUUID } from "node:crypto";
import { constants, type Dirent } from "node:fs";
import {
  access,
  mkdir,
  readdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  estimatePdfPageCount,
  optimizeFileForStorage,
} from "@/lib/file-optimization";
import {
  convertSaleProductImageToWebp,
  SALE_PRODUCT_IMAGE_MAX_BYTES,
  SaleProductImageError,
} from "@/lib/sale-product-image";

const STORAGE_ROOT = process.env.AVA_STORAGE_DIR ?? path.join(process.cwd(), "storage");

export const CONTRACT_MAX_BYTES = 8 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const HOMEWORK_ASSET_MAX_BYTES = 14 * 1024 * 1024;

export type AvatarMimeType = "image/jpeg" | "image/png" | "image/webp";

const allowedAvatarTypes = new Set<AvatarMimeType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedHomeworkAssetTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class StorageValidationError extends Error {}

export function detectAvatarMimeType(
  buffer: Uint8Array,
): AvatarMimeType | null {
  if (
    buffer.byteLength >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.byteLength >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.byteLength >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function isMissingStorageFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

export async function assertStorageAvailable() {
  await mkdir(STORAGE_ROOT, { recursive: true });
  await access(STORAGE_ROOT, constants.R_OK | constants.W_OK);
}

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

export async function deleteAvatarImage(relativePath?: string | null) {
  if (!relativePath) {
    return;
  }

  const normalized = path.normalize(relativePath);
  const avatarPrefix = `avatars${path.sep}`;

  if (!normalized.startsWith(avatarPrefix)) {
    throw new Error("Caminho de avatar invalido.");
  }

  try {
    await unlink(getStoragePath(normalized));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
}

export async function deleteSaleProductImage(relativePath?: string | null) {
  if (!relativePath) {
    return;
  }

  const normalized = path.normalize(relativePath);
  const productImagePrefix = `sale-product-images${path.sep}`;

  if (!normalized.startsWith(productImagePrefix)) {
    throw new Error("Caminho de imagem de produto invalido.");
  }

  try {
    await unlink(getStoragePath(normalized));
  } catch (error) {
    if (isMissingStorageFileError(error)) {
      return;
    }

    throw error;
  }
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

async function saveLearningAsset(
  file: File,
  input: {
    directory: "candy-xp-assets" | "homework-assets";
    label: string;
  },
) {
  if (!allowedHomeworkAssetTypes.has(file.type)) {
    throw new Error("Envie um PDF ou imagem PNG, JPG ou WebP.");
  }

  const maxUploadBytes =
    file.type === "application/pdf"
      ? getPdfMaxUploadBytes()
      : HOMEWORK_ASSET_MAX_BYTES;

  if (file.size <= 0 || file.size > maxUploadBytes) {
    throw new Error(
      `O arquivo ${input.label} precisa ter ate ${formatUploadLimit(
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
    input.directory,
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
  if (!allowedAvatarTypes.has(file.type as AvatarMimeType)) {
    throw new StorageValidationError("Envie uma imagem PNG, JPG ou WebP.");
  }

  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    throw new StorageValidationError("A foto precisa ter ate 2 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectAvatarMimeType(buffer);

  if (!mimeType || mimeType !== file.type) {
    throw new StorageValidationError(
      "O conteudo da imagem nao corresponde ao tipo enviado.",
    );
  }

  const extension =
    mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  const relativePath = await saveFileBuffer("avatars", extension, buffer);

  return {
    mimeType,
    relativePath,
  };
}

export async function saveSaleProductImage(file: File) {
  if (!allowedAvatarTypes.has(file.type as AvatarMimeType)) {
    throw new StorageValidationError("Envie uma imagem PNG, JPG ou WebP.");
  }

  if (file.size <= 0 || file.size > SALE_PRODUCT_IMAGE_MAX_BYTES) {
    throw new StorageValidationError("A foto do produto precisa ter ate 8 MB.");
  }

  const source = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectAvatarMimeType(source);

  if (!detectedMimeType || detectedMimeType !== file.type) {
    throw new StorageValidationError(
      "O conteudo da foto nao corresponde ao tipo enviado.",
    );
  }

  let webp: Buffer;

  try {
    webp = await convertSaleProductImageToWebp(source);
  } catch (error) {
    if (error instanceof SaleProductImageError) {
      throw new StorageValidationError(error.message);
    }

    throw error;
  }

  const relativePath = await saveFileBuffer(
    "sale-product-images",
    ".webp",
    webp,
  );

  return {
    mimeType: "image/webp" as const,
    relativePath,
    sizeBytes: webp.byteLength,
  };
}

export async function saveHomeworkAsset(file: File) {
  return saveLearningAsset(file, {
    directory: "homework-assets",
    label: "da homework",
  });
}

export async function saveCandyXpAsset(file: File) {
  return saveLearningAsset(file, {
    directory: "candy-xp-assets",
    label: "Candy XP",
  });
}
