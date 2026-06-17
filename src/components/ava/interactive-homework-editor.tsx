"use client";

import {
  BookOpen,
  CaseUpper,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  FileText,
  HardDrive,
  Layers2,
  LoaderCircle,
  Pencil,
  Save,
  Trash2,
  Type,
  UserPlus,
  UserRound,
  UsersRound,
  Volume2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import {
  deleteInteractiveHomework,
  replicateInteractiveHomeworkForStudent,
  saveInteractiveHomeworkFields,
} from "@/app/ava/teacher/actions";
import { saveCandyXpActivityInteractiveFields } from "@/app/ava/candy-xp/actions";
import {
  type DrawingStroke,
  InteractiveHomeworkDrawingStrokes,
} from "@/components/ava/interactive-homework-drawing";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";
import { InteractiveHomeworkListeningPreview } from "@/components/ava/interactive-homework-listening";
import { InteractiveHomeworkMark } from "@/components/ava/interactive-homework-mark";
import {
  InteractiveHomeworkTinyTextPreview,
  InteractiveHomeworkTextLineGuide,
} from "@/components/ava/interactive-homework-text";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  LISTENING_SENTENCE_MAX_LENGTH,
  normalizeListeningSentence,
  type InteractiveHomeworkFieldType,
} from "@/lib/interactive-homework-fields";
import { cn } from "@/lib/utils";

export type EditableHomeworkField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  placeholder: string | null;
  required: boolean;
  sortOrder: number;
  type: InteractiveHomeworkFieldType;
  width: number;
  x: number;
  y: number;
};

export type InteractiveHomeworkEditorRow = {
  assetFileName: string | null;
  assetMimeType: string | null;
  assetPageCount: number | null;
  assetSizeBytes: number | null;
  assetUrl?: string;
  canDelete?: boolean;
  fieldDetectionSource: string | null;
  fields: EditableHomeworkField[];
  id: string;
  lessonTitle: string;
  primaryStudentEmail?: string | null;
  primaryStudentId?: string | null;
  replicatedStudents?: {
    assignedAt: string;
    email: string;
    id: string;
    name: string;
  }[];
  source?: "CANDY_XP" | "HOMEWORK" | "LESSON";
  studentName: string | null;
  title: string;
};

type HomeworkShareStudentOption = {
  id: string;
  label: string;
};

type FieldTool = EditableHomeworkField["type"];
type CandyXpSupportedFieldType = Exclude<InteractiveHomeworkFieldType, "LISTENING">;
type EditorFieldTool =
  | "CHECKBOX"
  | "DRAWING"
  | "LISTENING"
  | "TEXT"
  | "TINY_TEXT";

type FieldToolMeta = {
  defaultAnchor?: "center" | "top-left";
  Icon: LucideIcon;
  defaultHeight: number;
  defaultPixelSize?: number;
  defaultWidth: number;
  label: string;
  minHeight: number;
  minPixelSize?: number;
  minWidth: number;
  placeholder: string | null;
  resizeMode?: "free" | "square";
};

type PagePoint = {
  x: number;
  y: number;
};

type PageRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type FieldGeometry = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type EditorSaveStatus =
  | "idle"
  | "saving"
  | "manual-saved"
  | "auto-saved"
  | "error";

type ListeningDetectionResponse = {
  confidence?: "high" | "medium" | "low";
  message?: string;
  text?: string;
};

function isCandyXpSupportedField<TField extends { type: InteractiveHomeworkFieldType }>(
  field: TField,
): field is TField & { type: CandyXpSupportedFieldType } {
  return field.type !== "LISTENING";
}

type EditorAction =
  | {
      current: PagePoint;
      kind: "create";
      page: number;
      pageRect: PageRect;
      start: PagePoint;
    }
  | {
      fieldId: string;
      kind: "move";
      original: EditableHomeworkField;
      pageRect: PageRect;
      start: PagePoint;
    }
  | {
      fieldId: string;
      kind: "resize";
      original: EditableHomeworkField;
      pageRect: PageRect;
      start: PagePoint;
    };

const TEXT_FIELD_LONG_THRESHOLD = 4.2;
const POINTER_CLICK_THRESHOLD_PIXELS = 10;
const AUTOSAVE_FIELDS_DELAY_MS = 1400;
const AUTOSAVE_QUEUED_SAVE_DELAY_MS = 450;
const LISTENING_AUTO_DETECTION_DELAY_MS = 300;
const LISTENING_CROP_MAX_DIMENSION = 1600;
const LISTENING_CROP_MAX_DATA_URL_LENGTH = 1_900_000;
const DRAWING_PREVIEW_STROKES: DrawingStroke[] = [
  [
    [14, 62],
    [26, 44],
    [39, 55],
    [55, 35],
    [73, 48],
    [86, 28],
  ],
];

type PdfTextItemLike = {
  height?: number;
  str?: string;
  transform?: number[];
  width?: number;
};

type ListeningTextCandidate = {
  bottom: number;
  heightPercent: number;
  left: number;
  right: number;
  text: string;
  top: number;
  widthPercent: number;
};

const FIELD_TOOL_OPTIONS: EditorFieldTool[] = [
  "TEXT",
  "TINY_TEXT",
  "CHECKBOX",
  "DRAWING",
  "LISTENING",
];

const FIELD_TOOL_META: Record<EditorFieldTool, FieldToolMeta> = {
  CHECKBOX: {
    Icon: CheckSquare,
    defaultHeight: 1.6,
    defaultPixelSize: 18,
    defaultWidth: 1.6,
    label: "Marcar",
    minHeight: 1,
    minPixelSize: 14,
    minWidth: 1,
    placeholder: null,
    resizeMode: "square",
  },
  TINY_TEXT: {
    Icon: CaseUpper,
    defaultHeight: 2.4,
    defaultPixelSize: 30,
    defaultWidth: 2.4,
    label: "Letra/Num",
    minHeight: 1.2,
    minPixelSize: 22,
    minWidth: 1.2,
    placeholder: null,
    resizeMode: "square",
  },
  DRAWING: {
    defaultAnchor: "center",
    Icon: Pencil,
    defaultHeight: 12,
    defaultWidth: 32,
    label: "Desenho",
    minHeight: 6,
    minWidth: 8,
    placeholder: null,
  },
  LISTENING: {
    Icon: Volume2,
    defaultHeight: 2.8,
    defaultWidth: 24,
    label: "Listening",
    minHeight: 1.6,
    minWidth: 4,
    placeholder: null,
  },
  TEXT: {
    Icon: Type,
    defaultHeight: 2.8,
    defaultWidth: 22,
    label: "Texto",
    minHeight: 1.2,
    minWidth: 4,
    placeholder: "Texto",
  },
};

function isTextFieldType(type: FieldTool): type is "LONG_TEXT" | "SHORT_TEXT" {
  return type === "SHORT_TEXT" || type === "LONG_TEXT";
}

function isTinyTextFieldType(type: FieldTool): type is "TINY_TEXT" {
  return type === "TINY_TEXT";
}

function textFieldTypeForGeometry(
  geometry: Pick<FieldGeometry, "height">,
): "LONG_TEXT" | "SHORT_TEXT" {
  return geometry.height >= TEXT_FIELD_LONG_THRESHOLD
    ? "LONG_TEXT"
    : "SHORT_TEXT";
}

function metaForFieldType(type: FieldTool) {
  return FIELD_TOOL_META[
    isTextFieldType(type)
      ? "TEXT"
      : isTinyTextFieldType(type)
        ? "TINY_TEXT"
        : type
  ];
}

function normalizeTextFieldType(field: EditableHomeworkField) {
  if (!isTextFieldType(field.type)) {
    return field;
  }

  const type = textFieldTypeForGeometry(field);

  if (type === field.type && field.label === "Texto") {
    return field;
  }

  return {
    ...field,
    label: "Texto",
    placeholder: "Texto",
    type,
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function cleanGeometry(geometry: FieldGeometry): FieldGeometry {
  return {
    height: roundPercent(geometry.height),
    width: roundPercent(geometry.width),
    x: roundPercent(geometry.x),
    y: roundPercent(geometry.y),
  };
}

function getFieldsSignature(fields: EditableHomeworkField[]) {
  return JSON.stringify(
    fields.map((field, index) => ({
      height: roundPercent(field.height),
      id: field.id,
      index,
      label: field.label ?? null,
      page: field.page,
      placeholder: field.placeholder ?? null,
      required: field.required,
      sortOrder: index,
      type: field.type,
      width: roundPercent(field.width),
      x: roundPercent(field.x),
      y: roundPercent(field.y),
    })),
  );
}

function getFieldGeometrySignature(field: EditableHomeworkField) {
  return [
    field.page,
    roundPercent(field.x),
    roundPercent(field.y),
    roundPercent(field.width),
    roundPercent(field.height),
  ].join(":");
}

function formatSize(sizeBytes?: number | null) {
  if (!sizeBytes) {
    return "Arquivo";
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} MB`;
  }

  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

function getStudentInitials(name?: string | null) {
  if (!name) {
    return "A";
  }

  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return initials || "A";
}

function getFieldCountClassName(count: number) {
  if (count === 0) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (count >= 10) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "SELECT" ||
    target.tagName === "TEXTAREA"
  );
}

function joinListeningTextSegments(segments: string[]) {
  return normalizeListeningSentence(
    segments
      .join(" ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([([{])\s+/g, "$1")
      .replace(/\s+([)\]}])/g, "$1"),
  );
}

function waitForListeningCrop(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function hasVisibleCropContent(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const sampleWidth = Math.min(width, 260);
  const sampleHeight = Math.min(height, 180);
  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!sampleContext) {
    return true;
  }

  sampleCanvas.width = sampleWidth;
  sampleCanvas.height = sampleHeight;
  sampleContext.drawImage(
    context.canvas,
    0,
    0,
    width,
    height,
    0,
    0,
    sampleWidth,
    sampleHeight,
  );

  const pixels = sampleContext.getImageData(
    0,
    0,
    sampleWidth,
    sampleHeight,
  ).data;
  let visiblePixels = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    const red = pixels[index] ?? 255;
    const green = pixels[index + 1] ?? 255;
    const blue = pixels[index + 2] ?? 255;

    if (alpha > 12 && (red < 244 || green < 244 || blue < 244)) {
      visiblePixels += 1;
    }
  }

  return visiblePixels / (sampleWidth * sampleHeight) > 0.0018;
}

function getListeningFieldCropDataUrl(field: EditableHomeworkField) {
  if (typeof document === "undefined") {
    return undefined;
  }

  const pageElement = document.querySelector<HTMLElement>(
    `[data-homework-page="${field.page}"]`,
  );
  const mediaElement = pageElement?.querySelector<
    HTMLCanvasElement | HTMLImageElement
  >("[data-homework-page-media]");

  if (!mediaElement) {
    return undefined;
  }

  const isCanvas = mediaElement instanceof HTMLCanvasElement;
  const sourceWidth = isCanvas ? mediaElement.width : mediaElement.naturalWidth;
  const sourceHeight = isCanvas
    ? mediaElement.height
    : mediaElement.naturalHeight;

  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    (!isCanvas && !mediaElement.complete)
  ) {
    return undefined;
  }

  try {
    const rawX = (field.x / 100) * sourceWidth;
    const rawY = (field.y / 100) * sourceHeight;
    const rawWidth = (field.width / 100) * sourceWidth;
    const rawHeight = (field.height / 100) * sourceHeight;
    const paddingX = clampNumber(rawWidth * 0.05, 4, 18);
    const paddingY = clampNumber(rawHeight * 0.2, 3, 12);
    const sx = clampNumber(rawX - paddingX, 0, sourceWidth - 1);
    const sy = clampNumber(rawY - paddingY, 0, sourceHeight - 1);
    const sw = clampNumber(rawWidth + paddingX * 2, 1, sourceWidth - sx);
    const sh = clampNumber(rawHeight + paddingY * 2, 1, sourceHeight - sy);
    const maxSide = Math.max(sw, sh);
    const scale =
      maxSide > LISTENING_CROP_MAX_DIMENSION
        ? LISTENING_CROP_MAX_DIMENSION / maxSide
        : Math.min(3, LISTENING_CROP_MAX_DIMENSION / maxSide);
    const targetWidth = Math.max(1, Math.round(sw * scale));
    const targetHeight = Math.max(1, Math.round(sh * scale));
    const cropCanvas = document.createElement("canvas");
    const context = cropCanvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    cropCanvas.width = targetWidth;
    cropCanvas.height = targetHeight;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.filter = "grayscale(1) contrast(1.42) brightness(1.06)";
    context.drawImage(
      mediaElement,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    context.filter = "none";

    if (!hasVisibleCropContent(context, targetWidth, targetHeight)) {
      return undefined;
    }

    const jpegDataUrl = cropCanvas.toDataURL("image/jpeg", 0.94);

    if (jpegDataUrl.length <= LISTENING_CROP_MAX_DATA_URL_LENGTH) {
      return jpegDataUrl;
    }

    const pngDataUrl = cropCanvas.toDataURL("image/png");

    return pngDataUrl.length <= LISTENING_CROP_MAX_DATA_URL_LENGTH
      ? pngDataUrl
      : undefined;
  } catch {
    return undefined;
  }
}

async function getListeningFieldCropDataUrlWithRetry(
  field: EditableHomeworkField,
) {
  let imageDataUrl = getListeningFieldCropDataUrl(field);

  if (imageDataUrl) {
    return imageDataUrl;
  }

  for (const delay of [220, 420]) {
    await waitForListeningCrop(delay);
    imageDataUrl = getListeningFieldCropDataUrl(field);

    if (imageDataUrl) {
      return imageDataUrl;
    }
  }

  return undefined;
}

async function getListeningPdfTextCandidates({
  assetMimeType,
  assetUrl,
  pageNumber,
}: {
  assetMimeType: string | null;
  assetUrl: string;
  pageNumber: number;
}) {
  if (assetMimeType !== "application/pdf") {
    return [];
  }

  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    url: assetUrl,
    withCredentials: true,
  });

  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const candidates: ListeningTextCandidate[] = [];

    for (const item of textContent.items as PdfTextItemLike[]) {
      const text = normalizeListeningSentence(item.str ?? "");

      if (!text || !Array.isArray(item.transform)) {
        continue;
      }

      const [, , , rawTextHeight = 0, x = 0, y = 0] = item.transform;
      const width = Math.max(item.width ?? 0, text.length * 3);
      const height = Math.max(item.height ?? 0, Math.abs(rawTextHeight), 8);
      const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
        x,
        y,
        x + width,
        y + height,
      ]);
      const left = (Math.min(x1, x2) / viewport.width) * 100;
      const right = (Math.max(x1, x2) / viewport.width) * 100;
      const top = (Math.min(y1, y2) / viewport.height) * 100;
      const bottom = (Math.max(y1, y2) / viewport.height) * 100;
      const widthPercent = Math.max(0, right - left);
      const heightPercent = Math.max(0, bottom - top);

      candidates.push({
        bottom,
        heightPercent,
        left,
        right,
        text,
        top,
        widthPercent,
      });
    }

    page.cleanup();
    void pdf.destroy();

    return candidates;
  } catch {
    await loadingTask.destroy().catch(() => undefined);
    return [];
  }
}

function getListeningFieldPdfText({
  candidates,
  field,
}: {
  candidates: ListeningTextCandidate[];
  field: EditableHomeworkField;
}) {
  if (candidates.length === 0) {
    return "";
  }

  const fieldLeft = field.x;
  const fieldRight = field.x + field.width;
  const fieldTop = field.y;
  const fieldBottom = field.y + field.height;
  const horizontalTolerance = clampNumber(field.width * 0.04, 0.25, 1.2);
  const verticalTolerance = clampNumber(field.height * 0.16, 0.15, 0.75);
  const softLeft = clampNumber(fieldLeft - horizontalTolerance, 0, 100);
  const softRight = clampNumber(fieldRight + horizontalTolerance, 0, 100);
  const softTop = clampNumber(fieldTop - verticalTolerance, 0, 100);
  const softBottom = clampNumber(fieldBottom + verticalTolerance, 0, 100);
  const fieldCandidates = candidates.filter((candidate) => {
    const centerX = (candidate.left + candidate.right) / 2;
    const centerY = (candidate.top + candidate.bottom) / 2;
    const overlapX = Math.max(
      0,
      Math.min(candidate.right, fieldRight) -
        Math.max(candidate.left, fieldLeft),
    );
    const overlapY = Math.max(
      0,
      Math.min(candidate.bottom, fieldBottom) -
        Math.max(candidate.top, fieldTop),
    );
    const candidateWidth = Math.max(candidate.widthPercent, 0.1);
    const candidateHeight = Math.max(candidate.heightPercent, 0.1);
    const horizontalOverlapRatio =
      overlapX / Math.min(candidateWidth, Math.max(field.width, 0.1));
    const verticalOverlapRatio =
      overlapY / Math.min(candidateHeight, Math.max(field.height, 0.1));
    const meaningfulOverlap =
      horizontalOverlapRatio >= 0.34 && verticalOverlapRatio >= 0.42;
    const centerInside =
      centerX >= softLeft &&
      centerX <= softRight &&
      centerY >= softTop &&
      centerY <= softBottom;

    if (
      candidate.widthPercent > field.width * 2.35 &&
      candidate.text.length > 28
    ) {
      return false;
    }

    return meaningfulOverlap || centerInside;
  });

  if (fieldCandidates.length === 0) {
    return "";
  }

  const lineTolerance = Math.max(1.2, field.height * 0.55);
  const lines = fieldCandidates
    .sort((first, second) =>
      Math.abs(first.top - second.top) > lineTolerance
        ? first.top - second.top
        : first.left - second.left,
    )
    .reduce<ListeningTextCandidate[][]>((groups, candidate) => {
      const currentGroup = groups[groups.length - 1];

      if (
        currentGroup &&
        Math.abs(currentGroup[0].top - candidate.top) <= lineTolerance
      ) {
        currentGroup.push(candidate);
        return groups;
      }

      return [...groups, [candidate]];
    }, []);

  return joinListeningTextSegments(
    lines.map((line) =>
      joinListeningTextSegments(
        line
          .sort((first, second) => first.left - second.left)
          .map((candidate) => candidate.text),
      ),
    ),
  );
}

function getPageRect(element: Element): PageRect | null {
  const pageElement = element.closest("[data-homework-page]");

  if (!(pageElement instanceof HTMLElement)) {
    return null;
  }

  const rect = pageElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function pagePointFromEvent(
  event: { clientX: number; clientY: number },
  pageRect: PageRect,
): PagePoint {
  return {
    x: clampNumber(
      ((event.clientX - pageRect.left) / pageRect.width) * 100,
      0,
      100,
    ),
    y: clampNumber(
      ((event.clientY - pageRect.top) / pageRect.height) * 100,
      0,
      100,
    ),
  };
}

function geometryFromPixelSize(
  type: EditorFieldTool,
  point: PagePoint,
  pageRect: PageRect,
  sizePixels: number,
) {
  const meta = FIELD_TOOL_META[type];
  const safeSizePixels = clampNumber(
    sizePixels,
    meta.minPixelSize ?? 1,
    Math.min(pageRect.width, pageRect.height),
  );
  const width = clampNumber(
    (safeSizePixels / pageRect.width) * 100,
    meta.minWidth,
    100,
  );
  const height = clampNumber(
    (safeSizePixels / pageRect.height) * 100,
    meta.minHeight,
    100,
  );

  return cleanGeometry({
    height,
    width,
    x: clampNumber(point.x - width / 2, 0, 100 - width),
    y: clampNumber(point.y - height / 2, 0, 100 - height),
  });
}

function defaultGeometryFromPoint(
  type: EditorFieldTool,
  point: PagePoint,
  pageRect?: PageRect,
) {
  const meta = FIELD_TOOL_META[type];

  if (meta.resizeMode === "square" && pageRect && meta.defaultPixelSize) {
    return geometryFromPixelSize(type, point, pageRect, meta.defaultPixelSize);
  }

  const width = meta.defaultWidth;
  const height = meta.defaultHeight;
  const x = meta.defaultAnchor === "center" ? point.x - width / 2 : point.x;
  const y = meta.defaultAnchor === "center" ? point.y - height / 2 : point.y;

  return cleanGeometry({
    height,
    width,
    x: clampNumber(x, 0, 100 - width),
    y: clampNumber(y, 0, 100 - height),
  });
}

function geometryFromPoints(
  type: EditorFieldTool,
  start: PagePoint,
  current: PagePoint,
  pageRect: PageRect,
) {
  const meta = FIELD_TOOL_META[type];
  const rawWidth = Math.abs(current.x - start.x);
  const rawHeight = Math.abs(current.y - start.y);
  const rawWidthPixels = (rawWidth / 100) * pageRect.width;
  const rawHeightPixels = (rawHeight / 100) * pageRect.height;

  if (
    Math.max(rawWidthPixels, rawHeightPixels) < POINTER_CLICK_THRESHOLD_PIXELS
  ) {
    return defaultGeometryFromPoint(type, start, pageRect);
  }

  if (meta.resizeMode === "square") {
    const sizePixels = Math.max(
      meta.minPixelSize ?? 18,
      rawWidthPixels,
      rawHeightPixels,
    );
    const width = clampNumber(
      (sizePixels / pageRect.width) * 100,
      meta.minWidth,
      100,
    );
    const height = clampNumber(
      (sizePixels / pageRect.height) * 100,
      meta.minHeight,
      100,
    );

    return cleanGeometry({
      height,
      width,
      x: clampNumber(Math.min(start.x, current.x), 0, 100 - width),
      y: clampNumber(Math.min(start.y, current.y), 0, 100 - height),
    });
  }

  const width = Math.min(100, Math.max(meta.minWidth, rawWidth));
  const height = Math.min(100, Math.max(meta.minHeight, rawHeight));
  const x = clampNumber(Math.min(start.x, current.x), 0, 100 - width);
  const y = clampNumber(Math.min(start.y, current.y), 0, 100 - height);

  return cleanGeometry({
    height,
    width,
    x,
    y,
  });
}

function moveFieldGeometry(
  field: EditableHomeworkField,
  start: PagePoint,
  current: PagePoint,
) {
  const meta = metaForFieldType(field.type);
  const width = clampNumber(field.width, meta.minWidth, 100);
  const height = clampNumber(field.height, meta.minHeight, 100);
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;

  return cleanGeometry({
    height,
    width,
    x: clampNumber(field.x + deltaX, 0, 100 - width),
    y: clampNumber(field.y + deltaY, 0, 100 - height),
  });
}

function resizeFieldGeometry(
  field: EditableHomeworkField,
  current: PagePoint,
  pageRect: PageRect,
) {
  const meta = metaForFieldType(field.type);
  const minWidth = isTextFieldType(field.type) ? 4 : meta.minWidth;
  const minHeight = isTextFieldType(field.type) ? 4 : meta.minHeight;
  const x = clampNumber(field.x, 0, 100 - minWidth);
  const y = clampNumber(field.y, 0, 100 - minHeight);

  if (meta.resizeMode === "square") {
    const rawWidthPixels = Math.max(
      0,
      ((current.x - x) / 100) * pageRect.width,
    );
    const rawHeightPixels = Math.max(
      0,
      ((current.y - y) / 100) * pageRect.height,
    );
    const sizePixels = Math.max(
      meta.minPixelSize ?? 18,
      rawWidthPixels,
      rawHeightPixels,
    );
    const width = clampNumber(
      (sizePixels / pageRect.width) * 100,
      minWidth,
      100 - x,
    );
    const height = clampNumber(
      (sizePixels / pageRect.height) * 100,
      minHeight,
      100 - y,
    );

    return cleanGeometry({
      height,
      width,
      x,
      y,
    });
  }

  return cleanGeometry({
    height: clampNumber(current.y - y, meta.minHeight, 100 - y),
    width: clampNumber(current.x - x, meta.minWidth, 100 - x),
    x,
    y,
  });
}

function FieldTextGuide({
  kind,
  selected = false,
  showCount = false,
}: {
  kind: "LONG_TEXT" | "SHORT_TEXT";
  selected?: boolean;
  showCount?: boolean;
}) {
  return (
    <InteractiveHomeworkTextLineGuide
      kind={kind}
      selected={selected}
      showCount={showCount}
    />
  );
}

function FieldAnswerPreview({
  field,
  selected = false,
}: {
  field: EditableHomeworkField;
  selected?: boolean;
}) {
  if (field.type === "CHECKBOX") {
    return (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <InteractiveHomeworkMark className="text-primary/90" />
      </span>
    );
  }

  if (field.type === "TINY_TEXT") {
    return (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <InteractiveHomeworkTinyTextPreview
          className={
            selected
              ? "border-primary/55 bg-white/92 shadow-[0_4px_10px_rgba(65,42,76,0.14),inset_0_0_0_1px_rgba(255,255,255,0.86)]"
              : "border-primary/32 bg-white/68 shadow-[0_2px_6px_rgba(65,42,76,0.10)]"
          }
          selected={selected}
          value="A"
        />
      </span>
    );
  }

  if (field.type === "LISTENING") {
    return (
      <InteractiveHomeworkListeningPreview
        selected={selected}
        sentence={field.placeholder}
      />
    );
  }

  if (field.type === "SHORT_TEXT") {
    return (
      <FieldTextGuide
        kind="SHORT_TEXT"
        selected={selected}
        showCount={selected}
      />
    );
  }

  if (field.type === "LONG_TEXT") {
    return (
      <FieldTextGuide
        kind="LONG_TEXT"
        selected={selected}
        showCount={selected}
      />
    );
  }

  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]">
      <span className="absolute inset-2 rounded border border-dashed border-primary/25 bg-white/20" />
      <svg
        aria-hidden="true"
        className="absolute inset-[12%] size-[76%] text-primary/45"
        viewBox="0 0 100 100"
      >
        <InteractiveHomeworkDrawingStrokes
          strokeWidth={3}
          strokes={DRAWING_PREVIEW_STROKES}
        />
      </svg>
      {selected ? (
        <span className="absolute bottom-1 left-1 rounded-full border border-primary/15 bg-white/85 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary/70 shadow-sm">
          desenhar
        </span>
      ) : null}
    </span>
  );
}

function getFieldPreviewLabel(field: EditableHomeworkField) {
  if (field.type === "CHECKBOX") {
    return "Marcar";
  }

  if (field.type === "TINY_TEXT") {
    return "Letra/Num";
  }

  if (field.type === "DRAWING") {
    return "Desenho";
  }

  if (field.type === "LISTENING") {
    return "Listening";
  }

  return "Texto";
}

function getFieldSelectionBadge(field: EditableHomeworkField) {
  if (field.type === "TINY_TEXT") {
    return "A1";
  }

  return getFieldPreviewLabel(field);
}

function getSelectionPanelHint({
  selectedField,
  selectedTool,
}: {
  selectedField: EditableHomeworkField | null;
  selectedTool: EditorFieldTool;
}) {
  const type = selectedField?.type ?? selectedTool;

  if (selectedField) {
    if (type === "TINY_TEXT") {
      return "Caixinha para V/F, A/B/C ou numero curto. Clique para posicionar, arraste para ampliar e ajuste pela bolinha.";
    }

    return "Mova no PDF, ajuste pela bolinha roxa ou use Delete para excluir.";
  }

  if (type === "TINY_TEXT") {
    return "Clique no centro do parenteses ou da lacuna para criar uma caixinha alinhada.";
  }

  return "Desenhe a area no arquivo para criar o campo.";
}

function createEditableField({
  geometry,
  id,
  page,
  sortOrder,
  type,
}: {
  geometry: FieldGeometry;
  id: string;
  page: number;
  sortOrder: number;
  type: EditorFieldTool;
}): EditableHomeworkField {
  const meta = FIELD_TOOL_META[type];
  const fieldType = type === "TEXT" ? textFieldTypeForGeometry(geometry) : type;

  return normalizeTextFieldType({
    height: geometry.height,
    id,
    label: `${meta.label} ${sortOrder + 1}`,
    page,
    placeholder: meta.placeholder,
    required: fieldType !== "CHECKBOX" && fieldType !== "LISTENING",
    sortOrder,
    type: fieldType,
    width: geometry.width,
    x: geometry.x,
    y: geometry.y,
  });
}

function InteractiveHomeworkCanvasEditor({
  fields,
  homework,
  selectedFieldId,
  selectedTool,
  setFields,
  setIsEditingGesture,
  setSelectedFieldId,
}: {
  fields: EditableHomeworkField[];
  homework: InteractiveHomeworkEditorRow;
  selectedFieldId: string | null;
  selectedTool: EditorFieldTool;
  setFields: Dispatch<SetStateAction<EditableHomeworkField[]>>;
  setIsEditingGesture: Dispatch<SetStateAction<boolean>>;
  setSelectedFieldId: Dispatch<SetStateAction<string | null>>;
}) {
  const assetUrl = homework.assetUrl ?? `/ava/homework-assets/${homework.id}`;
  const [activeAction, setActiveAction] = useState<EditorAction | null>(null);
  const hasActiveAction = Boolean(activeAction);

  const draftGeometry = useMemo(() => {
    if (!activeAction || activeAction.kind !== "create") {
      return null;
    }

    return geometryFromPoints(
      selectedTool,
      activeAction.start,
      activeAction.current,
      activeAction.pageRect,
    );
  }, [activeAction, selectedTool]);

  useEffect(() => {
    setIsEditingGesture(hasActiveAction);

    return () => {
      if (hasActiveAction) {
        setIsEditingGesture(false);
      }
    };
  }, [hasActiveAction, setIsEditingGesture]);

  function beginCreate(
    event: ReactPointerEvent<HTMLDivElement>,
    pageNumber: number,
  ) {
    if (event.button !== 0) {
      return;
    }

    const pageRect = getPageRect(event.currentTarget);

    if (!pageRect) {
      return;
    }

    event.preventDefault();
    const start = pagePointFromEvent(event.nativeEvent, pageRect);

    setSelectedFieldId(null);
    setActiveAction({
      current: start,
      kind: "create",
      page: pageNumber,
      pageRect,
      start,
    });
  }

  function beginMove(
    event: ReactPointerEvent<HTMLDivElement>,
    field: EditableHomeworkField,
  ) {
    if (event.button !== 0) {
      return;
    }

    const pageRect = getPageRect(event.currentTarget);

    if (!pageRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedFieldId(field.id);
    setActiveAction({
      fieldId: field.id,
      kind: "move",
      original: field,
      pageRect,
      start: pagePointFromEvent(event.nativeEvent, pageRect),
    });
  }

  function beginResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    field: EditableHomeworkField,
  ) {
    if (event.button !== 0) {
      return;
    }

    const pageRect = getPageRect(event.currentTarget);

    if (!pageRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedFieldId(field.id);
    setActiveAction({
      fieldId: field.id,
      kind: "resize",
      original: field,
      pageRect,
      start: pagePointFromEvent(event.nativeEvent, pageRect),
    });
  }

  useEffect(() => {
    if (!activeAction) {
      return undefined;
    }

    const action = activeAction;

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      const current = pagePointFromEvent(event, action.pageRect);

      if (action.kind === "create") {
        setActiveAction({
          ...action,
          current,
        });
        return;
      }

      if (action.kind === "move") {
        const geometry = moveFieldGeometry(
          action.original,
          action.start,
          current,
        );

        setFields((currentFields) =>
          currentFields.map((field) =>
            field.id === action.fieldId
              ? normalizeTextFieldType({ ...field, ...geometry })
              : field,
          ),
        );
        return;
      }

      const geometry = resizeFieldGeometry(
        action.original,
        current,
        action.pageRect,
      );

      setFields((currentFields) =>
        currentFields.map((field) =>
          field.id === action.fieldId
            ? normalizeTextFieldType({ ...field, ...geometry })
            : field,
        ),
      );
    }

    function finishPointerAction(event: PointerEvent) {
      event.preventDefault();

      if (action.kind === "create") {
        const current = pagePointFromEvent(event, action.pageRect);
        const geometry = geometryFromPoints(
          selectedTool,
          action.start,
          current,
          action.pageRect,
        );
        const fieldId = `new-${crypto.randomUUID()}`;

        setFields((currentFields) => [
          ...currentFields,
          createEditableField({
            geometry,
            id: fieldId,
            page: action.page,
            sortOrder: currentFields.length,
            type: selectedTool,
          }),
        ]);
        setSelectedFieldId(fieldId);
      }

      setActiveAction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishPointerAction);
    window.addEventListener("pointercancel", finishPointerAction);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishPointerAction);
      window.removeEventListener("pointercancel", finishPointerAction);
    };
  }, [activeAction, selectedTool, setFields, setSelectedFieldId]);

  return (
    <InteractiveHomeworkDocument
      assetMimeType={homework.assetMimeType}
      assetUrl={assetUrl}
      expectedPageCount={homework.assetPageCount}
      fields={fields}
      pageClassName="max-w-[860px]"
      renderPageOverlay={(pageNumber) => (
        <div
          className="absolute inset-0 z-0 cursor-crosshair touch-none"
          onPointerDown={(event) => beginCreate(event, pageNumber)}
        >
          {activeAction?.kind === "create" &&
          activeAction.page === pageNumber &&
          draftGeometry ? (
            <div
              className={cn(
                "absolute rounded-[4px] border-2 border-primary shadow-[0_0_0_1px_rgba(65,42,76,0.16)]",
                selectedTool === "CHECKBOX"
                  ? "flex items-center justify-center bg-white/50"
                  : selectedTool === "TINY_TEXT"
                    ? "flex items-center justify-center rounded-[6px] bg-white/55 shadow-[0_8px_18px_rgba(65,42,76,0.14),inset_0_0_0_1px_rgba(255,255,255,0.8)]"
                    : selectedTool === "DRAWING"
                      ? "bg-white/35"
                      : selectedTool === "LISTENING"
                        ? "bg-white/30 shadow-[0_8px_22px_rgba(65,42,76,0.14)]"
                        : "bg-white/45 shadow-[0_14px_34px_rgba(65,42,76,0.14),inset_0_0_0_1px_rgba(255,255,255,0.72)]",
              )}
              style={{
                containerType: "size",
                height: `${draftGeometry.height}%`,
                left: `${draftGeometry.x}%`,
                top: `${draftGeometry.y}%`,
                width: `${draftGeometry.width}%`,
              }}
            >
              {selectedTool === "CHECKBOX" ? (
                <InteractiveHomeworkMark className="text-primary/85" />
              ) : null}
              {selectedTool === "TINY_TEXT" ? (
                <InteractiveHomeworkTinyTextPreview
                  className="border-primary/55 bg-white/92 shadow-[0_4px_10px_rgba(65,42,76,0.12)]"
                  selected
                  value="A"
                />
              ) : null}
              {selectedTool === "TEXT" ? (
                <FieldTextGuide
                  kind={textFieldTypeForGeometry(draftGeometry)}
                  selected
                  showCount
                />
              ) : null}
              {selectedTool === "LISTENING" ? (
                <InteractiveHomeworkListeningPreview selected />
              ) : null}
              {selectedTool === "DRAWING" ? (
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]">
                  <span className="absolute inset-2 rounded border border-dashed border-primary/25 bg-white/20" />
                  <svg
                    aria-hidden="true"
                    className="absolute inset-[12%] size-[76%] text-primary/45"
                    viewBox="0 0 100 100"
                  >
                    <InteractiveHomeworkDrawingStrokes
                      strokeWidth={3}
                      strokes={DRAWING_PREVIEW_STROKES}
                    />
                  </svg>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      renderField={(field, index, style) => {
        const selected = selectedFieldId === field.id;
        const isMarkField = field.type === "CHECKBOX";
        const isTinyTextField = field.type === "TINY_TEXT";
        const isDrawingField = field.type === "DRAWING";
        const isListeningField = field.type === "LISTENING";
        const isSmallBoxField = isMarkField || isTinyTextField;

        return (
          <div
            key={field.id}
            className={cn(
              "absolute z-10 cursor-move touch-none rounded-[4px] border-2 transition-[border-color,background-color,box-shadow] duration-200 ease-out",
              isMarkField
                ? "bg-white/35 shadow-[0_1px_4px_rgba(65,42,76,0.14)]"
                : isTinyTextField
                  ? "rounded-[6px] bg-white/28 shadow-[0_4px_10px_rgba(65,42,76,0.12)]"
                  : isDrawingField
                    ? "bg-white/30 shadow-[inset_0_0_0_1px_rgba(65,42,76,0.06)]"
                    : isListeningField
                      ? "bg-white/20 shadow-[0_6px_18px_rgba(65,42,76,0.12)]"
                      : "bg-primary/[0.045] shadow-[inset_0_0_0_1px_rgba(65,42,76,0.08)]",
              selected
                ? isTinyTextField
                  ? "border-primary bg-white/48 shadow-[0_8px_18px_rgba(65,42,76,0.18),inset_0_0_0_1px_rgba(255,255,255,0.72)] ring-2 ring-primary/16"
                  : "border-primary bg-white/40 shadow-[0_16px_34px_rgba(65,42,76,0.18),inset_0_0_0_1px_rgba(255,255,255,0.75)] ring-4 ring-primary/15"
                : "border-dashed border-primary/55 hover:border-primary",
            )}
            onPointerDown={(event) => beginMove(event, field)}
            style={{
              ...style,
              containerType: "size",
            }}
            aria-label={field.label || `Area ${index + 1}`}
          >
            {selected ? (
              <span
                className={cn(
                  "pointer-events-none absolute z-20 rounded-[3px] border border-white/70 bg-primary font-bold uppercase leading-none text-primary-foreground shadow-[0_8px_18px_rgba(65,42,76,0.22)]",
                  isTinyTextField
                    ? "-top-4 left-1/2 -translate-x-1/2 rounded-full border-primary/20 bg-white/95 px-1.5 py-0.5 text-[8px] text-primary shadow-sm"
                    : "-top-7 left-0 px-2 py-1 text-[10px] tracking-[0.12em]",
                )}
              >
                {getFieldSelectionBadge(field)}
              </span>
            ) : null}
            <FieldAnswerPreview field={field} selected={selected} />
            {selected ? (
              <button
                aria-label="Redimensionar area"
                className={cn(
                  "absolute cursor-nwse-resize rounded-full border-2 border-white bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(65,42,76,0.22)] ring-2 ring-primary/20 transition-transform duration-200 hover:scale-110",
                  isTinyTextField
                    ? "-bottom-2.5 -right-2.5 size-5"
                    : isSmallBoxField
                      ? "-bottom-1.5 -right-1.5 size-4"
                      : "-bottom-2.5 -right-2.5 size-5",
                )}
                onPointerDown={(event) => beginResize(event, field)}
                type="button"
              />
            ) : null}
          </div>
        );
      }}
      title={homework.title}
    />
  );
}

function InteractiveHomeworkEditorItem({
  homework,
  studentOptions = [],
}: {
  homework: InteractiveHomeworkEditorRow;
  studentOptions?: HomeworkShareStudentOption[];
}) {
  const router = useRouter();
  const initialFieldsSignature = useMemo(
    () => getFieldsSignature(homework.fields),
    [homework.fields],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareStudentIds, setShareStudentIds] = useState<string[]>([]);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isSharing, startShareTransition] = useTransition();
  const [fields, setFields] = useState<EditableHomeworkField[]>(
    homework.fields,
  );
  const [savedFieldsSignature, setSavedFieldsSignature] = useState(
    initialFieldsSignature,
  );
  const [saveStatus, setSaveStatus] = useState<EditorSaveStatus>("idle");
  const [isEditingGesture, setIsEditingGesture] = useState(false);
  const [selectedTool, setSelectedTool] = useState<EditorFieldTool>("TEXT");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    homework.fields[0]?.id ?? null,
  );
  const [listeningDetectionFieldId, setListeningDetectionFieldId] = useState<
    string | null
  >(null);
  const [listeningDetectionMessage, setListeningDetectionMessage] = useState<
    string | null
  >(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const queuedSaveModeRef = useRef<"auto" | "manual" | null>(null);
  const saveInFlightRef = useRef(false);
  const listeningDetectionAbortRef = useRef<AbortController | null>(null);
  const listeningPdfTextCacheRef = useRef<
    Map<string, Promise<ListeningTextCandidate[]>>
  >(new Map());
  const listeningDetectionRequestsRef = useRef<Set<string>>(new Set());
  const listeningDetectionSequenceRef = useRef(0);
  const currentFieldsSignature = useMemo(
    () => getFieldsSignature(fields),
    [fields],
  );
  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  );
  const fieldsRef = useRef(fields);
  const currentFieldsSignatureRef = useRef(currentFieldsSignature);
  const savedFieldsSignatureRef = useRef(savedFieldsSignature);
  const hasUnsavedChanges = currentFieldsSignature !== savedFieldsSignature;
  const isCandyXpActivity = homework.source === "CANDY_XP";
  const isInteractiveLesson = homework.source === "LESSON";
  const isShareableHomework = homework.source === "HOMEWORK";
  const replicatedStudents = useMemo(
    () => homework.replicatedStudents ?? [],
    [homework.replicatedStudents],
  );
  const entityLabel = isCandyXpActivity
    ? "atividade Candy XP"
    : isInteractiveLesson
      ? "aula interativa"
      : "homework";
  const shareableStudentOptions = useMemo(() => {
    const blockedStudentIds = new Set([
      ...(homework.primaryStudentId ? [homework.primaryStudentId] : []),
      ...replicatedStudents.map((student) => student.id),
    ]);

    return studentOptions.filter(
      (student) => !blockedStudentIds.has(student.id),
    );
  }, [homework.primaryStudentId, replicatedStudents, studentOptions]);
  const shareStudentIdSet = useMemo(
    () => new Set(shareStudentIds),
    [shareStudentIds],
  );
  const allShareStudentsSelected =
    shareableStudentOptions.length > 0 &&
    shareStudentIds.length === shareableStudentOptions.length;
  const sharePreviewStudents = shareableStudentOptions.filter((student) =>
    shareStudentIdSet.has(student.id),
  );
  const sharePreviewLabel =
    sharePreviewStudents.length === 0
      ? "Nenhum aluno selecionado"
      : sharePreviewStudents.length <= 2
        ? sharePreviewStudents.map((student) => student.label).join(", ")
        : `${sharePreviewStudents
            .slice(0, 2)
            .map((student) => student.label)
            .join(", ")} +${sharePreviewStudents.length - 2}`;
  const isPersisting = isSaving || saveStatus === "saving";
  const assetUrl = homework.assetUrl ?? `/ava/homework-assets/${homework.id}`;
  const availableFieldToolOptions = isCandyXpActivity
    ? FIELD_TOOL_OPTIONS.filter((tool) => tool !== "LISTENING")
    : FIELD_TOOL_OPTIONS;
  const saveStatusLabel = isPersisting
    ? "Salvando..."
    : saveStatus === "error"
      ? "Salvar novamente"
      : hasUnsavedChanges
        ? "Alteracoes pendentes"
        : saveStatus === "auto-saved"
          ? "Salvo automaticamente"
          : "Salvo";
  const showSaveErrorMessage = saveStatus === "error" && Boolean(message);
  const isDetectingSelectedListening =
    selectedField?.type === "LISTENING" &&
    listeningDetectionFieldId === selectedField.id;
  const selectedListeningSentence = normalizeListeningSentence(
    selectedField?.type === "LISTENING"
      ? (selectedField.placeholder ?? "")
      : "",
  );
  const selectionPanelMeta = selectedField
    ? metaForFieldType(selectedField.type)
    : FIELD_TOOL_META[selectedTool];
  const SelectionPanelIcon = selectionPanelMeta.Icon;
  const selectionPanelTitle = selectedField
    ? `Selecionado: ${getFieldPreviewLabel(selectedField)}`
    : `Ferramenta ativa: ${selectionPanelMeta.label}`;
  const selectionPanelHint = getSelectionPanelHint({
    selectedField,
    selectedTool,
  });

  useEffect(() => {
    if (isCandyXpActivity && selectedTool === "LISTENING") {
      setSelectedTool("TEXT");
    }
  }, [isCandyXpActivity, selectedTool]);

  useEffect(() => {
    setShareStudentIds((currentStudentIds) => {
      const availableStudentIds = new Set(
        shareableStudentOptions.map((student) => student.id),
      );
      const keptStudentIds = currentStudentIds.filter((studentId) =>
        availableStudentIds.has(studentId),
      );

      if (keptStudentIds.length === currentStudentIds.length) {
        return currentStudentIds;
      }

      return keptStudentIds;
    });
  }, [shareableStudentOptions]);

  useEffect(() => {
    return () => {
      listeningDetectionAbortRef.current?.abort();
    };
  }, []);

  function updateSelectedListeningSentence(value: string) {
    if (!selectedFieldId) {
      return;
    }

    const sentence = value
      .replace(/\r\n?/g, "\n")
      .slice(0, LISTENING_SENTENCE_MAX_LENGTH);

    setListeningDetectionMessage(null);
    setFields((current) =>
      current.map((field) =>
        field.id === selectedFieldId && field.type === "LISTENING"
          ? {
              ...field,
              placeholder: sentence,
              required: false,
            }
          : field,
      ),
    );
    setSaveStatus("idle");
  }

  const getListeningPdfTextCandidatesForPage = useCallback(
    (pageNumber: number) => {
      const cacheKey = `${homework.id}:${pageNumber}`;
      const cached = listeningPdfTextCacheRef.current.get(cacheKey);

      if (cached) {
        return cached;
      }

      const request = getListeningPdfTextCandidates({
        assetMimeType: homework.assetMimeType,
        assetUrl,
        pageNumber,
      });

      listeningPdfTextCacheRef.current.set(cacheKey, request);

      return request;
    },
    [assetUrl, homework.assetMimeType, homework.id],
  );

  const detectListeningSentenceForField = useCallback(
    async (field: EditableHomeworkField, mode: "auto" | "manual" = "auto") => {
      if (field.type !== "LISTENING") {
        return;
      }

      const requestId = listeningDetectionSequenceRef.current + 1;
      const controller = new AbortController();
      const fieldGeometrySignature = getFieldGeometrySignature(field);

      listeningDetectionSequenceRef.current = requestId;
      listeningDetectionAbortRef.current?.abort();
      listeningDetectionAbortRef.current = controller;
      setListeningDetectionFieldId(field.id);
      setListeningDetectionMessage(
        mode === "auto"
          ? "Procurando o texto no PDF..."
          : "Relendo o texto do box...",
      );

      const localTextCandidates = await getListeningPdfTextCandidatesForPage(
        field.page,
      );
      const localText = getListeningFieldPdfText({
        candidates: localTextCandidates,
        field,
      });

      if (listeningDetectionSequenceRef.current !== requestId) {
        return;
      }

      if (localText) {
        setFields((current) =>
          current.map((currentField) => {
            if (
              currentField.id !== field.id ||
              currentField.type !== "LISTENING"
            ) {
              return currentField;
            }

            if (
              getFieldGeometrySignature(currentField) !== fieldGeometrySignature
            ) {
              return currentField;
            }

            if (
              mode === "auto" &&
              normalizeListeningSentence(currentField.placeholder ?? "")
            ) {
              return currentField;
            }

            return {
              ...currentField,
              placeholder: localText,
              required: false,
            };
          }),
        );
        setSaveStatus("idle");
        setListeningDetectionMessage(
          "Texto encontrado no PDF. Confira antes de salvar.",
        );
        listeningDetectionAbortRef.current = null;
        setListeningDetectionFieldId((current) =>
          current === field.id ? null : current,
        );
        return;
      }

      const imageDataUrl = await getListeningFieldCropDataUrlWithRetry(field);

      setListeningDetectionMessage(
        mode === "auto"
          ? imageDataUrl
            ? "Lendo o recorte do box..."
            : "Lendo o texto dentro do box..."
          : imageDataUrl
            ? "Relendo o recorte marcado..."
            : "Relendo o texto marcado no box...",
      );

      try {
        const response = await fetch("/ava/homework-listening-detect", {
          body: JSON.stringify({
            height: field.height,
            homeworkId: homework.id,
            imageDataUrl,
            page: field.page,
            width: field.width,
            x: field.x,
            y: field.y,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        });
        const payload = (await response
          .json()
          .catch(() => ({}))) as ListeningDetectionResponse;

        if (listeningDetectionSequenceRef.current !== requestId) {
          return;
        }

        if (!response.ok) {
          setListeningDetectionMessage(
            payload.message ??
              "Nao consegui ler automaticamente. Digite o texto do listening.",
          );
          return;
        }

        const sentence = normalizeListeningSentence(payload.text ?? "");

        if (!sentence) {
          setListeningDetectionMessage(
            payload.message ??
              "Nao encontrei texto claro nesse box. Digite manualmente.",
          );
          return;
        }

        setFields((current) =>
          current.map((currentField) => {
            if (
              currentField.id !== field.id ||
              currentField.type !== "LISTENING"
            ) {
              return currentField;
            }

            if (
              getFieldGeometrySignature(currentField) !== fieldGeometrySignature
            ) {
              return currentField;
            }

            if (
              mode === "auto" &&
              normalizeListeningSentence(currentField.placeholder ?? "")
            ) {
              return currentField;
            }

            return {
              ...currentField,
              placeholder: sentence,
              required: false,
            };
          }),
        );
        setSaveStatus("idle");
        setListeningDetectionMessage(
          payload.confidence === "high"
            ? "Gemini leu o texto do box. Confira antes de salvar."
            : "Gemini leu com baixa confianca. Confira o texto acima antes de salvar.",
        );
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setListeningDetectionMessage(
          "Nao consegui ler automaticamente. Digite o texto do listening.",
        );
      } finally {
        if (listeningDetectionSequenceRef.current === requestId) {
          listeningDetectionAbortRef.current = null;
          setListeningDetectionFieldId((current) =>
            current === field.id ? null : current,
          );
        }
      }
    },
    [getListeningPdfTextCandidatesForPage, homework.id],
  );

  const retrySelectedListeningDetection = useCallback(() => {
    if (!selectedField || selectedField.type !== "LISTENING") {
      return;
    }

    listeningDetectionRequestsRef.current.delete(selectedField.id);
    void detectListeningSentenceForField(selectedField, "manual");
  }, [detectListeningSentenceForField, selectedField]);

  useEffect(() => {
    fieldsRef.current = fields;
    currentFieldsSignatureRef.current = currentFieldsSignature;
  }, [currentFieldsSignature, fields]);

  useEffect(() => {
    savedFieldsSignatureRef.current = savedFieldsSignature;
  }, [savedFieldsSignature]);

  useEffect(() => {
    const localSignature = currentFieldsSignatureRef.current;
    const localHasPendingChanges =
      localSignature !== savedFieldsSignatureRef.current;

    if (localHasPendingChanges && initialFieldsSignature !== localSignature) {
      setMessage(
        (current) =>
          current ??
          "Mantive as areas pendentes na tela. O autosave vai confirmar as alteracoes antes de sincronizar com o servidor.",
      );
      return;
    }

    setFields(homework.fields);
    setSavedFieldsSignature(initialFieldsSignature);
    setSelectedFieldId((current) =>
      current && homework.fields.some((field) => field.id === current)
        ? current
        : (homework.fields[0]?.id ?? null),
    );
    setSaveStatus((current) =>
      current === "auto-saved" || current === "manual-saved" ? current : "idle",
    );
    listeningDetectionRequestsRef.current.clear();
    setListeningDetectionFieldId(null);
    setListeningDetectionMessage(null);
  }, [homework.fields, initialFieldsSignature]);

  useEffect(() => {
    if (
      !selectedField ||
      selectedField.type !== "LISTENING" ||
      isEditingGesture ||
      normalizeListeningSentence(selectedField.placeholder ?? "")
    ) {
      return;
    }

    if (listeningDetectionRequestsRef.current.has(selectedField.id)) {
      return;
    }

    const field = selectedField;
    const timer = window.setTimeout(() => {
      listeningDetectionRequestsRef.current.add(field.id);
      void detectListeningSentenceForField(field, "auto");
    }, LISTENING_AUTO_DETECTION_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [detectListeningSentenceForField, isEditingGesture, selectedField]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [hasUnsavedChanges]);

  const removeSelectedField = useCallback(
    (source: "button" | "keyboard" = "button") => {
      if (!selectedFieldId || isSaving || isDeleting) {
        return;
      }

      setFields((current) =>
        current.filter((field) => field.id !== selectedFieldId),
      );
      setSelectedFieldId(null);
      setMessage(
        source === "keyboard"
          ? "Area removida pelo teclado. O autosave vai aplicar a mudanca."
          : "Area removida. O autosave vai aplicar a mudanca.",
      );
      setSaveStatus("idle");
    },
    [isDeleting, isSaving, selectedFieldId],
  );

  function clearFields() {
    const confirmed = window.confirm("Deseja mesmo limpar todas as areas?");

    if (!confirmed) {
      return;
    }

    setFields([]);
    setSelectedFieldId(null);
    setMessage("Areas removidas. Desenhe novas areas no PDF e salve.");
    setSaveStatus("idle");
  }

  useEffect(() => {
    function removeSelectedFieldByKeyboard(event: KeyboardEvent) {
      const isDeleteShortcut =
        event.key === "Delete" || event.key === "Backspace";

      if (
        !isDeleteShortcut ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !selectedFieldId ||
        isSaving ||
        isDeleting ||
        isEditableKeyboardTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      removeSelectedField("keyboard");
    }

    window.addEventListener("keydown", removeSelectedFieldByKeyboard);

    return () => {
      window.removeEventListener("keydown", removeSelectedFieldByKeyboard);
    };
  }, [isDeleting, isSaving, removeSelectedField, selectedFieldId]);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const persistFields = useCallback(
    (mode: "auto" | "manual") => {
      if (saveInFlightRef.current || isDeleting) {
        queuedSaveModeRef.current =
          mode === "manual" || queuedSaveModeRef.current === "manual"
            ? "manual"
            : "auto";

        if (mode === "manual") {
          setMessage(
            "Ja estou salvando. Vou confirmar novamente assim que essa gravacao terminar.",
          );
        }

        return;
      }

      if (mode === "manual") {
        clearAutosaveTimer();
      }

      setMessage(null);

      const fieldsSnapshot = fieldsRef.current;
      const attemptSignature = getFieldsSignature(fieldsSnapshot);

      if (attemptSignature === savedFieldsSignatureRef.current) {
        setSaveStatus(mode === "auto" ? "auto-saved" : "manual-saved");
        setMessage(mode === "manual" ? "Areas ja estavam salvas." : null);
        return;
      }

      const fieldsToSave = fieldsSnapshot.map((field, index) => {
        const normalizedField = normalizeTextFieldType(field);

        return {
          ...normalizedField,
          label: normalizedField.label ?? undefined,
          placeholder: normalizedField.placeholder ?? undefined,
          sortOrder: index,
        };
      });
      const candyXpFieldsToSave = fieldsToSave.filter(isCandyXpSupportedField);
      const fieldsForAction =
        homework.source === "CANDY_XP" ? candyXpFieldsToSave : fieldsToSave;
      const expectedCount = fieldsForAction.length;
      const selectedIndex = selectedFieldId
        ? fieldsSnapshot.findIndex((field) => field.id === selectedFieldId)
        : -1;

      queuedSaveModeRef.current = null;
      saveInFlightRef.current = true;
      setSaveStatus("saving");

      if (mode === "manual") {
        setMessage(`Salvando ${expectedCount} area(s)...`);
      }

      startSaveTransition(async () => {
        try {
          const result =
            homework.source === "CANDY_XP"
              ? await saveCandyXpActivityInteractiveFields({
                  activityId: homework.id,
                  fields: candyXpFieldsToSave,
                })
              : await saveInteractiveHomeworkFields({
                  fields: fieldsForAction,
                  homeworkId: homework.id,
                });

          if (!result.ok || !result.fields) {
            setSaveStatus("error");
            setMessage(
              mode === "auto"
                ? `Nao consegui confirmar o autosave. ${result.message}`
                : result.message,
            );
            return;
          }

          if (result.savedCount !== expectedCount) {
            setSaveStatus("error");
            setMessage(
              `${result.savedCount ?? 0} de ${expectedCount} area(s) foram confirmadas. Revise antes de sair e tente salvar novamente.`,
            );
            return;
          }

          const persistedSignature = getFieldsSignature(result.fields);
          const saveStillMatchesScreen =
            currentFieldsSignatureRef.current === attemptSignature;
          const idByDraftId = new Map(
            fieldsForAction
              .map((field, index) => [field.id, result.fields?.[index]?.id])
              .filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === "string" && typeof entry[1] === "string",
              ),
          );

          if (saveStillMatchesScreen) {
            setFields(result.fields);
            setSelectedFieldId(
              result.fields[selectedIndex]?.id ??
                result.fields[result.fields.length - 1]?.id ??
                null,
            );
            setSaveStatus(mode === "auto" ? "auto-saved" : "manual-saved");
            setSavedFieldsSignature(persistedSignature);
            setMessage(mode === "auto" ? null : result.message);
            if (mode === "manual") {
              router.refresh();
            }
          } else {
            setFields((current) =>
              current.map((field) => {
                const persistedId = idByDraftId.get(field.id);

                return persistedId && persistedId !== field.id
                  ? { ...field, id: persistedId }
                  : field;
              }),
            );
            setSelectedFieldId((current) =>
              current ? (idByDraftId.get(current) ?? current) : current,
            );
            setSavedFieldsSignature(persistedSignature);
            setSaveStatus("idle");
            setMessage(
              "Salvei uma versao anterior e vou confirmar automaticamente as areas que voce continuou criando.",
            );
            queuedSaveModeRef.current =
              queuedSaveModeRef.current === "manual" || mode === "manual"
                ? "manual"
                : "auto";
          }
        } catch {
          setSaveStatus("error");
          setMessage(
            mode === "auto"
              ? "O autosave nao confirmou as alteracoes. As areas continuam na tela; salve manualmente antes de sair."
              : "Erro ao salvar areas. Tente novamente antes de sair da pagina.",
          );
        } finally {
          saveInFlightRef.current = false;
          const queuedSaveMode = queuedSaveModeRef.current;

          if (queuedSaveMode) {
            queuedSaveModeRef.current = null;
            window.setTimeout(() => {
              if (
                currentFieldsSignatureRef.current !==
                savedFieldsSignatureRef.current
              ) {
                persistFields(queuedSaveMode);
              }
            }, AUTOSAVE_QUEUED_SAVE_DELAY_MS);
          }
        }
      });
    },
    [
      clearAutosaveTimer,
      homework.id,
      homework.source,
      isDeleting,
      router,
      selectedFieldId,
    ],
  );

  useEffect(() => {
    clearAutosaveTimer();

    if (!hasUnsavedChanges || isDeleting || isEditingGesture || isPersisting) {
      return undefined;
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      persistFields("auto");
    }, AUTOSAVE_FIELDS_DELAY_MS);

    return clearAutosaveTimer;
  }, [
    clearAutosaveTimer,
    hasUnsavedChanges,
    isDeleting,
    isEditingGesture,
    isPersisting,
    persistFields,
  ]);

  function saveFields() {
    if (isDeleting) {
      return;
    }

    persistFields("manual");
  }

  function toggleAllShareStudents() {
    setShareStudentIds(
      allShareStudentsSelected
        ? []
        : shareableStudentOptions.map((student) => student.id),
    );
  }

  function toggleShareStudent(studentId: string) {
    setShareStudentIds((currentStudentIds) =>
      currentStudentIds.includes(studentId)
        ? currentStudentIds.filter((currentStudentId) => currentStudentId !== studentId)
        : [...currentStudentIds, studentId],
    );
  }

  function shareHomework(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShareMessage(null);

    if (shareStudentIds.length === 0) {
      setShareMessage("Selecione pelo menos um aluno para replicar.");
      return;
    }

    if (hasUnsavedChanges || isPersisting) {
      setShareMessage(
        "Salve as areas antes de replicar para copiar a versao mais recente.",
      );
      return;
    }

    startShareTransition(async () => {
      const result = await replicateInteractiveHomeworkForStudent({
        homeworkId: homework.id,
        studentProfileIds: shareStudentIds,
      });

      setShareMessage(result.message);

      if (result.ok) {
        setShareStudentIds([]);
        router.refresh();
      }
    });
  }

  function deleteHomework() {
    setMessage(null);

    const confirmed = window.confirm(
      `Excluir a ${entityLabel} "${homework.title}"? As respostas e campos desta atividade tambem serao removidos.`,
    );

    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteInteractiveHomework({
        homeworkId: homework.id,
      });

      setMessage(result.message);

      if (!result.ok) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  const fieldCountClassName = getFieldCountClassName(fields.length);
  const saveStatusClassName = isPersisting
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : saveStatus === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : hasUnsavedChanges
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const itemTone = isInteractiveLesson
    ? {
        avatar:
          "border-sky-200 bg-sky-50 text-sky-900 shadow-[0_8px_18px_rgba(14,165,233,0.12)]",
        badge: "border-sky-200 bg-sky-50 text-sky-800",
        fileInfo: "border-indigo-200/80 bg-indigo-50/70",
        info: "border-sky-200/70 bg-white/82",
        label: "text-sky-700/80",
        shell:
          "border-sky-200/80 bg-gradient-to-br from-white via-sky-50/55 to-secondary/25 shadow-[0_14px_34px_rgba(14,165,233,0.08)] before:bg-sky-500",
        scopeInfo: "border-sky-200/80 bg-sky-50/75",
        summary: "hover:bg-sky-50/70",
      }
    : isCandyXpActivity
      ? {
          avatar:
            "border-amber-200 bg-amber-50 text-amber-900 shadow-[0_8px_18px_rgba(245,158,11,0.12)]",
          badge: "border-amber-200 bg-amber-50 text-amber-900",
          fileInfo: "border-fuchsia-200/80 bg-fuchsia-50/60",
          info: "border-amber-200/70 bg-white/84",
          label: "text-amber-800/80",
          shell:
            "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/60 to-secondary/30 shadow-[0_14px_34px_rgba(245,158,11,0.08)] before:bg-amber-400",
          scopeInfo: "border-amber-200/80 bg-amber-50/75",
          summary: "hover:bg-amber-50/65",
        }
    : {
        avatar:
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 shadow-[0_8px_18px_rgba(229,124,216,0.12)]",
        badge: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
        fileInfo: "border-sky-200/80 bg-sky-50/75",
        info: "border-primary/10 bg-white/78",
        label: "text-primary/65",
        shell:
          "border-fuchsia-200/75 bg-gradient-to-br from-white via-fuchsia-50/45 to-amber-50/35 shadow-[0_14px_34px_rgba(229,124,216,0.08)] before:bg-fuchsia-500",
        scopeInfo: "border-amber-200/80 bg-amber-50/75",
        summary: "hover:bg-fuchsia-50/45",
      };
  const entityBadgeLabel = isCandyXpActivity
    ? "Candy XP"
    : isInteractiveLesson
      ? "Aula interativa"
      : "Homework";
  const scopeLabel = isCandyXpActivity ? "Liberacao" : "Aula";
  const fileName =
    homework.assetFileName ??
    (isCandyXpActivity
      ? "Arquivo Candy XP"
      : isInteractiveLesson
        ? "Arquivo da aula"
        : "Arquivo da homework");

  return (
    <details
      className={cn(
        "group relative overflow-hidden rounded-lg border before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        itemTone.shell,
      )}
    >
      <summary
        className={cn(
          "cursor-pointer list-none px-4 py-4 text-sm transition-colors sm:px-5 [&::-webkit-details-marker]:hidden",
          itemTone.summary,
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(260px,0.95fr)_auto] xl:items-center">
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg border text-sm font-bold",
                itemTone.avatar,
              )}
            >
              {getStudentInitials(homework.studentName)}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em]",
                  itemTone.badge,
                )}
              >
                <FileText aria-hidden="true" className="size-3.5" />
                {entityBadgeLabel}
              </span>
              <span className="mt-2 block truncate text-base font-semibold text-primary sm:text-lg">
                {homework.title}
              </span>
              <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <UserRound aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">
                  {homework.studentName ?? "Aluno geral"}
                </span>
              </span>
              {isShareableHomework ? (
                <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.72rem] font-semibold text-emerald-800">
                  <UsersRound aria-hidden="true" className="size-3.5" />
                  <span className="truncate">
                    {replicatedStudents.length > 0
                      ? `${replicatedStudents.length} replica(s) criada(s)`
                      : "Sem replicas"}
                  </span>
                </span>
              ) : null}
            </span>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <span
              className={cn(
                "min-w-0 rounded-lg border p-3 shadow-sm",
                itemTone.scopeInfo,
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]",
                  itemTone.label,
                )}
              >
                <BookOpen aria-hidden="true" className="size-3.5" />
                {scopeLabel}
              </span>
              <span className="mt-1 block truncate font-semibold text-primary">
                {homework.lessonTitle}
              </span>
            </span>
            <span
              className={cn(
                "min-w-0 rounded-lg border p-3 shadow-sm",
                itemTone.fileInfo,
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]",
                  itemTone.label,
                )}
              >
                <HardDrive aria-hidden="true" className="size-3.5" />
                Arquivo
              </span>
              <span className="mt-1 block truncate font-semibold text-primary">
                {fileName}
              </span>
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground xl:justify-end">
            <span
              className={cn(
                "rounded-full border px-3 py-1 font-semibold",
                fieldCountClassName,
              )}
            >
              {fields.length} area(s)
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 font-semibold",
                saveStatusClassName,
              )}
            >
              {saveStatusLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-background px-3 py-1 font-semibold text-primary/70">
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform duration-200 group-open:rotate-180"
              />
              <span className="group-open:hidden">Abrir editor</span>
              <span className="hidden group-open:inline">Fechar editor</span>
            </span>
            {homework.canDelete !== false ? (
              <Button
                disabled={isDeleting || isPersisting}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteHomework();
                }}
                size="sm"
                type="button"
                variant="destructive"
              >
                {isDeleting ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 data-icon="inline-start" />
                )}
                Excluir
              </Button>
            ) : null}
          </div>
        </div>
      </summary>

      <div className="flex flex-col gap-4 border-t border-primary/15 p-4">
        {isShareableHomework ? (
          <section className="grid gap-3 rounded-lg border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-fuchsia-50/55 p-3 shadow-sm lg:grid-cols-[minmax(180px,0.75fr)_minmax(220px,0.9fr)_minmax(260px,1fr)] lg:items-stretch">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm">
              <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-emerald-700">
                <UserRound aria-hidden="true" className="size-3.5" />
                Aluno principal
              </span>
              <strong className="mt-2 block truncate text-sm text-primary">
                {homework.studentName ?? "Aluno nao definido"}
              </strong>
              {homework.primaryStudentEmail ? (
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {homework.primaryStudentEmail}
                </span>
              ) : null}
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-sky-700">
                  <UsersRound aria-hidden="true" className="size-3.5" />
                  Replicas criadas
                </span>
                <strong className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-sky-900">
                  {replicatedStudents.length}
                </strong>
              </div>
              {replicatedStudents.length > 0 ? (
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-sky-200 bg-white/86 px-3 py-2 text-xs font-semibold text-sky-900 [&::-webkit-details-marker]:hidden">
                    Ver replicas
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                    {replicatedStudents.map((student) => (
                      <span
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-900"
                        key={student.id}
                        title={student.email}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[0.65rem] font-bold text-sky-700 shadow-sm">
                          {getStudentInitials(student.name)}
                        </span>
                        <span className="min-w-0 truncate">{student.name}</span>
                      </span>
                    ))}
                  </div>
                </details>
              ) : (
                <span className="mt-2 block rounded-md border border-dashed border-sky-200 bg-white/72 px-3 py-2 text-xs font-medium text-sky-800">
                  Nenhuma replica criada ainda.
                </span>
              )}
            </div>

            <form
              className="grid gap-3 rounded-lg border border-fuchsia-200 bg-white/90 p-3 shadow-sm"
              onSubmit={shareHomework}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-primary/70">
                  <UserPlus aria-hidden="true" className="size-3.5" />
                  Replicar para alunos
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em]",
                    shareStudentIds.length > 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-primary/10 bg-white text-muted-foreground",
                  )}
                >
                  {shareStudentIds.length}/{shareableStudentOptions.length}
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-primary/10 bg-white">
                <div className="grid gap-2 border-b border-primary/10 bg-gradient-to-r from-white via-emerald-50/50 to-fuchsia-50/45 p-2">
                  <label
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm",
                      isSharing || shareableStudentOptions.length === 0
                        ? "cursor-not-allowed opacity-70"
                        : "",
                    )}
                    htmlFor={`share-homework-${homework.id}-all`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <input
                        checked={allShareStudentsSelected}
                        className="size-4 accent-emerald-600"
                        disabled={
                          isSharing || shareableStudentOptions.length === 0
                        }
                        id={`share-homework-${homework.id}-all`}
                        onChange={toggleAllShareStudents}
                        type="checkbox"
                      />
                      Selecionar todos
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {shareableStudentOptions.length > 0
                        ? `${shareableStudentOptions.length} disponiveis`
                        : "Todos ja tem replica"}
                    </span>
                  </label>
                  <span
                    className={cn(
                      "block truncate rounded-md border border-primary/10 bg-white/86 px-3 py-2 text-sm font-semibold",
                      sharePreviewStudents.length > 0
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                    title={sharePreviewStudents
                      .map((student) => student.label)
                      .join(", ")}
                  >
                    {sharePreviewLabel}
                  </span>
                </div>

                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/[0.035] [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <UsersRound aria-hidden="true" className="size-4 text-fuchsia-700" />
                      Escolher alunos
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  {shareableStudentOptions.length > 0 ? (
                    <div className="grid max-h-36 gap-2 overflow-y-auto border-t border-primary/10 p-2 sm:grid-cols-2">
                      {shareableStudentOptions.map((student) => {
                        const isSelected = shareStudentIdSet.has(student.id);

                        return (
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition",
                              isSelected
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : "border-primary/10 bg-white text-primary hover:border-fuchsia-200 hover:bg-fuchsia-50/45",
                              isSharing ? "cursor-not-allowed" : "",
                            )}
                            htmlFor={`share-homework-${homework.id}-${student.id}`}
                            key={student.id}
                            title={student.label}
                          >
                            <input
                              checked={isSelected}
                              className="size-4 shrink-0 accent-emerald-600"
                              disabled={isSharing}
                              id={`share-homework-${homework.id}-${student.id}`}
                              onChange={() => toggleShareStudent(student.id)}
                              type="checkbox"
                            />
                            <span className="min-w-0 truncate">
                              {student.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="border-t border-primary/10 px-3 py-3 text-sm text-muted-foreground">
                      Todos os alunos disponiveis ja possuem replica.
                    </p>
                  )}
                </details>
              </div>
              <Button
                disabled={
                  isSharing ||
                  shareableStudentOptions.length === 0 ||
                  shareStudentIds.length === 0 ||
                  hasUnsavedChanges ||
                  isPersisting
                }
                size="sm"
                type="submit"
              >
                {isSharing ? (
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                {isSharing ? "Replicando..." : "Replicar homework"}
              </Button>
              {hasUnsavedChanges ? (
                <p className="text-xs font-medium text-amber-700">
                  Salve as areas antes de replicar.
                </p>
              ) : null}
              {shareMessage ? (
                <p className="rounded-md border border-primary/10 bg-primary/[0.035] px-3 py-2 text-xs font-medium text-primary/75">
                  {shareMessage}
                </p>
              ) : null}
            </form>
          </section>
        ) : null}

        <div className="flex flex-col gap-3 rounded-lg border border-primary/15 bg-muted/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <Wand2
                aria-hidden="true"
                className="size-4 shrink-0 text-primary"
              />
              <span className="min-w-0 truncate font-semibold">{fileName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(homework.assetSizeBytes)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableFieldToolOptions.map((tool) => {
                const meta = FIELD_TOOL_META[tool];
                const Icon = meta.Icon;

                return (
                  <Button
                    aria-pressed={selectedTool === tool}
                    key={tool}
                    onClick={() => setSelectedTool(tool)}
                    size="sm"
                    title={meta.label}
                    type="button"
                    variant={selectedTool === tool ? "default" : "outline"}
                  >
                    <Icon data-icon="inline-start" />
                    {meta.label}
                  </Button>
                );
              })}

              <Button
                disabled={!selectedFieldId || isPersisting || isDeleting}
                onClick={() => removeSelectedField()}
                size="sm"
                title="Excluir area selecionada (Del ou Backspace)"
                type="button"
                variant="outline"
              >
                <Trash2 data-icon="inline-start" />
                Excluir selecionado
              </Button>

              <Button
                disabled={fields.length === 0 || isPersisting || isDeleting}
                onClick={clearFields}
                size="sm"
                title="Remover todas as areas"
                type="button"
                variant="outline"
              >
                <Trash2 data-icon="inline-start" />
                Limpar tudo
              </Button>

              <Button
                disabled={isPersisting || isDeleting || saveInFlightRef.current}
                onClick={saveFields}
                size="sm"
                type="button"
              >
                {isPersisting ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                {isPersisting ? "Salvando..." : "Salvar areas"}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border border-primary/15 bg-white/82 shadow-[0_8px_22px_rgba(65,42,76,0.06)]",
              selectedField?.type === "LISTENING"
                ? "grid min-h-[148px] p-3"
                : "flex items-center px-3 py-2.5",
            )}
          >
            {selectedField?.type === "LISTENING" ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-start">
                <label className="grid min-w-0 gap-1 text-sm font-semibold text-primary">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="shrink-0">Texto do listening</span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-sky-700">
                      Gemini
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.08em]",
                        isDetectingSelectedListening
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : selectedListeningSentence
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-primary/15 bg-primary/[0.04] text-primary/70",
                      )}
                    >
                      {isDetectingSelectedListening
                        ? "lendo"
                        : selectedListeningSentence
                          ? "pronto"
                          : "auto"}
                    </span>
                  </span>
                  <Textarea
                    className="min-h-28 max-h-64 resize-y overflow-auto bg-white/95 px-3 py-2 font-medium leading-6 shadow-inner shadow-primary/[0.03]"
                    maxLength={LISTENING_SENTENCE_MAX_LENGTH}
                    onChange={(event) =>
                      updateSelectedListeningSentence(event.target.value)
                    }
                    placeholder="Digite ou confira aqui uma ou mais frases em ingles"
                    rows={4}
                    value={selectedField.placeholder ?? ""}
                  />
                </label>
                <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end lg:pt-7">
                  <Button
                    className="shrink-0"
                    disabled={isDetectingSelectedListening}
                    onClick={retrySelectedListeningDetection}
                    size="sm"
                    title="Ler novamente o texto dentro do box selecionado"
                    type="button"
                    variant="outline"
                  >
                    {isDetectingSelectedListening ? (
                      <LoaderCircle
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <Wand2 data-icon="inline-start" />
                    )}
                    {isDetectingSelectedListening ? "Lendo..." : "Ler box"}
                  </Button>
                  <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-3 py-1 text-xs font-semibold text-primary/70">
                    {selectedListeningSentence.length}/
                    {LISTENING_SENTENCE_MAX_LENGTH}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-xs font-medium leading-5 lg:col-span-2",
                    isDetectingSelectedListening
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : selectedListeningSentence
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-primary/10 bg-primary/[0.035] text-muted-foreground",
                  )}
                  role="status"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      isDetectingSelectedListening
                        ? "bg-amber-500"
                        : selectedListeningSentence
                          ? "bg-emerald-500"
                          : "bg-primary/35",
                    )}
                  />
                  <span className="min-w-0">
                    {listeningDetectionMessage ??
                      "Campo pronto para texto manual ou leitura automatica."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <SelectionPanelIcon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary">
                        {selectionPanelTitle}
                      </span>
                      {selectedField ? (
                        <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-primary/70">
                          {Math.round(selectedField.width)}% x{" "}
                          {Math.round(selectedField.height)}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {selectionPanelHint}
                    </p>
                  </div>
                </div>
                <span className="w-fit rounded-full border border-primary/10 bg-primary/[0.04] px-3 py-1 text-xs font-semibold text-primary/70">
                  {fields.length} area(s)
                </span>
              </div>
            )}
          </div>

          {message ? (
            showSaveErrorMessage ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50/90 p-3 text-sm text-red-900 shadow-sm"
                role="alert"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-red-700 shadow-sm ring-1 ring-red-200">
                      <CircleAlert aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        As areas ainda nao foram confirmadas
                      </p>
                      <p className="mt-1 leading-5 text-red-800/85">
                        {message}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="shrink-0 border-red-200 bg-white text-red-800 hover:bg-red-100 hover:text-red-900"
                    disabled={
                      isPersisting || isDeleting || saveInFlightRef.current
                    }
                    onClick={saveFields}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isPersisting ? (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <Save data-icon="inline-start" />
                    )}
                    Salvar agora
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground"
                role="status"
              >
                {message}
              </p>
            )
          ) : null}
        </div>

        <InteractiveHomeworkCanvasEditor
          fields={fields}
          homework={homework}
          selectedFieldId={selectedFieldId}
          selectedTool={selectedTool}
          setFields={setFields}
          setIsEditingGesture={setIsEditingGesture}
          setSelectedFieldId={setSelectedFieldId}
        />
      </div>
    </details>
  );
}

export function InteractiveHomeworkEditor({
  heading = "Homeworks interativas",
  homeworks,
  studentOptions = [],
}: {
  heading?: string;
  homeworks: InteractiveHomeworkEditorRow[];
  studentOptions?: HomeworkShareStudentOption[];
}) {
  if (homeworks.length === 0) {
    return null;
  }

  const totalFields = homeworks.reduce(
    (total, homework) => total + homework.fields.length,
    0,
  );
  const readyItems = homeworks.filter(
    (homework) => homework.fields.length > 0,
  ).length;
  const isLessonEditor = homeworks.every(
    (homework) => homework.source === "LESSON",
  );
  const isCandyXpEditor = homeworks.every(
    (homework) => homework.source === "CANDY_XP",
  );
  const editorTone = isLessonEditor
    ? {
        accent: "bg-sky-600 shadow-[0_10px_24px_rgba(14,165,233,0.22)]",
        eyebrow: "Editor manual de aulas",
        firstMetric: "border-sky-200 bg-sky-50 text-sky-900",
        firstMetricLabel: "Aulas",
        readyMetricLabel: "Com areas",
        shell:
          "border-sky-200/80 bg-gradient-to-br from-white via-sky-50/55 to-secondary/35 shadow-[0_18px_44px_rgba(14,165,233,0.08)]",
        subtitle:
          "Abra um card para preparar o material da aula e marcar areas interativas.",
      }
    : isCandyXpEditor
      ? {
          accent: "bg-amber-400 text-primary shadow-[0_10px_24px_rgba(245,158,11,0.22)]",
          eyebrow: "Editor Candy XP",
          firstMetric: "border-amber-200 bg-amber-50 text-amber-900",
          firstMetricLabel: "Missoes",
          readyMetricLabel: "Com areas",
          shell:
            "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/55 to-secondary/35 shadow-[0_18px_44px_rgba(245,158,11,0.08)]",
          subtitle:
            "Abra o card para posicionar texto, letra, marca e desenho sobre o PDF/imagem.",
        }
    : {
        accent: "bg-primary shadow-[0_10px_24px_rgba(65,42,76,0.18)]",
        eyebrow: "Editor manual de areas",
        firstMetric: "border-primary/15 bg-primary/[0.055] text-primary",
        firstMetricLabel: "Itens",
        readyMetricLabel: "Prontos",
        shell:
          "border-primary/15 bg-gradient-to-br from-white via-primary/[0.025] to-secondary/35 shadow-[0_18px_44px_rgba(65,42,76,0.08)]",
        subtitle:
          "Abra um card para posicionar textos, marcas, desenho e listening no PDF.",
      };

  return (
    <div className={cn("overflow-hidden rounded-lg border", editorTone.shell)}>
      <div className="border-b border-primary/10 bg-white/70 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg text-primary-foreground",
                editorTone.accent,
              )}
            >
              <Layers2 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/60">
                {editorTone.eyebrow}
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold text-primary">
                {heading}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {editorTone.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            <div
              className={cn(
                "rounded-lg border p-3 shadow-sm",
                editorTone.firstMetric,
              )}
            >
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                {editorTone.firstMetricLabel}
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {homeworks.length}
              </strong>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900 shadow-sm">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                Areas
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {totalFields}
              </strong>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 shadow-sm">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                {editorTone.readyMetricLabel}
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {readyItems}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3 sm:p-4">
        {homeworks.map((homework) => (
          <InteractiveHomeworkEditorItem
            key={homework.id}
            homework={homework}
            studentOptions={studentOptions}
          />
        ))}
      </div>
    </div>
  );
}
