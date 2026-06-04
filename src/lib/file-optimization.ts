import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PDF_OPTIMIZATION_TIMEOUT_MS = 25_000;
const PDF_MIN_REDUCTION_RATIO = 0.98;

const pdfPresets = new Set(["screen", "ebook", "printer", "prepress"]);

export type FileOptimizationStatus =
  | "disabled"
  | "failed"
  | "not_smaller"
  | "optimized"
  | "skipped";

export type FileOptimizationResult = {
  buffer: Buffer;
  message: string | null;
  optimizedSizeBytes: number;
  originalSizeBytes: number;
  preset: string | null;
  status: FileOptimizationStatus;
};

function isEnabled(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function formatFileSize(sizeBytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted =
    value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}

export function estimatePdfPageCount(buffer: Buffer) {
  const pdfText = buffer.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);

  return Math.max(1, pageMatches?.length ?? 1);
}

function getPdfPreset() {
  const preset = process.env.PDF_OPTIMIZATION_PRESET?.trim().toLowerCase();

  return preset && pdfPresets.has(preset) ? preset : "ebook";
}

async function optimizePdfWithGhostscript(input: {
  buffer: Buffer;
  preset: string;
}) {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "candy-pdf-opt-"),
  );
  const inputPath = path.join(temporaryDirectory, "input.pdf");
  const outputPath = path.join(temporaryDirectory, "output.pdf");

  try {
    await writeFile(inputPath, input.buffer, { flag: "wx" });
    await execFileAsync(
      "gs",
      [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=/${input.preset}`,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dSAFER",
        `-sOutputFile=${outputPath}`,
        inputPath,
      ],
      {
        timeout: PDF_OPTIMIZATION_TIMEOUT_MS,
      },
    );

    const outputStats = await stat(outputPath);

    if (outputStats.size <= 0) {
      throw new Error("Ghostscript gerou um PDF vazio.");
    }

    return readFile(outputPath);
  } finally {
    await rm(temporaryDirectory, {
      force: true,
      recursive: true,
    }).catch(() => undefined);
  }
}

export async function optimizeFileForStorage(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<FileOptimizationResult> {
  const originalSizeBytes = input.buffer.length;

  if (input.mimeType !== "application/pdf") {
    return {
      buffer: input.buffer,
      message: null,
      optimizedSizeBytes: originalSizeBytes,
      originalSizeBytes,
      preset: null,
      status: "skipped",
    };
  }

  if (!isEnabled(process.env.PDF_OPTIMIZATION_ENABLED, true)) {
    return {
      buffer: input.buffer,
      message: "Arquivo salvo sem otimizacao; otimizacao de PDF desativada.",
      optimizedSizeBytes: originalSizeBytes,
      originalSizeBytes,
      preset: null,
      status: "disabled",
    };
  }

  const preset = getPdfPreset();

  try {
    const optimizedBuffer = await optimizePdfWithGhostscript({
      buffer: input.buffer,
      preset,
    });
    const originalPages = estimatePdfPageCount(input.buffer);
    const optimizedPages = estimatePdfPageCount(optimizedBuffer);

    if (optimizedPages < originalPages) {
      return {
        buffer: input.buffer,
        message:
          "Arquivo salvo sem otimizacao; a versao otimizada parecia perder paginas.",
        optimizedSizeBytes: originalSizeBytes,
        originalSizeBytes,
        preset,
        status: "failed",
      };
    }

    if (optimizedBuffer.length >= originalSizeBytes * PDF_MIN_REDUCTION_RATIO) {
      return {
        buffer: input.buffer,
        message: `Arquivo salvo sem otimizacao; a versao otimizada nao ficou menor (${formatFileSize(
          originalSizeBytes,
        )} -> ${formatFileSize(optimizedBuffer.length)}).`,
        optimizedSizeBytes: originalSizeBytes,
        originalSizeBytes,
        preset,
        status: "not_smaller",
      };
    }

    return {
      buffer: optimizedBuffer,
      message: `PDF otimizado: ${formatFileSize(
        originalSizeBytes,
      )} -> ${formatFileSize(optimizedBuffer.length)}.`,
      optimizedSizeBytes: optimizedBuffer.length,
      originalSizeBytes,
      preset,
      status: "optimized",
    };
  } catch (error) {
    console.warn(
      `Candy PDF optimization fallback: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`,
    );

    return {
      buffer: input.buffer,
      message:
        "Arquivo salvo sem otimizacao porque a otimizacao do PDF falhou.",
      optimizedSizeBytes: originalSizeBytes,
      originalSizeBytes,
      preset,
      status: "failed",
    };
  }
}
