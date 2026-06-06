"use client";

import {
  CheckSquare,
  FileText,
  LoaderCircle,
  Pencil,
  Save,
  Trash2,
  Type,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import {
  deleteInteractiveHomework,
  saveInteractiveHomeworkFields,
} from "@/app/ava/teacher/actions";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";
import { InteractiveHomeworkMark } from "@/components/ava/interactive-homework-mark";
import {
  getInteractiveHomeworkTextLineCount,
  getInteractiveHomeworkTextStyle,
} from "@/components/ava/interactive-homework-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EditableHomeworkField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  placeholder: string | null;
  required: boolean;
  sortOrder: number;
  type: "SHORT_TEXT" | "LONG_TEXT" | "CHECKBOX" | "DRAWING";
  width: number;
  x: number;
  y: number;
};

export type InteractiveHomeworkEditorRow = {
  assetFileName: string | null;
  assetMimeType: string | null;
  assetPageCount: number | null;
  assetSizeBytes: number | null;
  fieldDetectionSource: string | null;
  fields: EditableHomeworkField[];
  id: string;
  lessonTitle: string;
  source?: "HOMEWORK" | "LESSON";
  studentName: string | null;
  title: string;
};

type FieldTool = EditableHomeworkField["type"];
type EditorFieldTool = "CHECKBOX" | "DRAWING" | "TEXT";

type FieldToolMeta = {
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

const FIELD_TOOL_OPTIONS: EditorFieldTool[] = [
  "TEXT",
  "CHECKBOX",
  "DRAWING",
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
  DRAWING: {
    Icon: Pencil,
    defaultHeight: 14,
    defaultWidth: 34,
    label: "Desenho",
    minHeight: 6,
    minWidth: 8,
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

function textFieldTypeForGeometry(
  geometry: Pick<FieldGeometry, "height">,
): "LONG_TEXT" | "SHORT_TEXT" {
  return geometry.height >= TEXT_FIELD_LONG_THRESHOLD
    ? "LONG_TEXT"
    : "SHORT_TEXT";
}

function metaForFieldType(type: FieldTool) {
  return FIELD_TOOL_META[isTextFieldType(type) ? "TEXT" : type];
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

function formatSize(sizeBytes?: number | null) {
  if (!sizeBytes) {
    return "Arquivo";
  }

  return `${Math.ceil(sizeBytes / 1024)} KB`;
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
    x: clampNumber(((event.clientX - pageRect.left) / pageRect.width) * 100, 0, 100),
    y: clampNumber(((event.clientY - pageRect.top) / pageRect.height) * 100, 0, 100),
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

  return cleanGeometry({
    height,
    width,
    x: clampNumber(point.x, 0, 100 - width),
    y: clampNumber(point.y, 0, 100 - height),
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
    const width = clampNumber((sizePixels / pageRect.width) * 100, meta.minWidth, 100);
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
  const minWidth = meta.resizeMode === "square" ? meta.minWidth : 4;
  const minHeight = meta.resizeMode === "square" ? meta.minHeight : 4;
  const x = clampNumber(field.x, 0, 100 - minWidth);
  const y = clampNumber(field.y, 0, 100 - minHeight);

  if (meta.resizeMode === "square") {
    const rawWidthPixels = Math.max(0, ((current.x - x) / 100) * pageRect.width);
    const rawHeightPixels = Math.max(0, ((current.y - y) / 100) * pageRect.height);
    const sizePixels = Math.max(
      meta.minPixelSize ?? 18,
      rawWidthPixels,
      rawHeightPixels,
    );
    const width = clampNumber((sizePixels / pageRect.width) * 100, minWidth, 100 - x);
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
  showCount = false,
}: {
  kind: "LONG_TEXT" | "SHORT_TEXT";
  showCount?: boolean;
}) {
  const guideRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const guideElement = guideRef.current;

    if (!guideElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    function updateLineCount() {
      if (!guideElement) {
        return;
      }

      const rect = guideElement.getBoundingClientRect();

      setLineCount(
        getInteractiveHomeworkTextLineCount(kind, {
          height: rect.height,
          width: rect.width,
        }),
      );
    }

    updateLineCount();

    const resizeObserver = new ResizeObserver(updateLineCount);
    resizeObserver.observe(guideElement);

    return () => resizeObserver.disconnect();
  }, [kind]);

  const lineHeight = kind === "LONG_TEXT" ? "1.22em" : "1em";
  const lines = Array.from({ length: lineCount });

  return (
    <span
      ref={guideRef}
      className="pointer-events-none absolute inset-0 block overflow-hidden rounded-[2px] px-[0.3em] py-[0.2em] text-primary/65"
      style={getInteractiveHomeworkTextStyle(kind)}
    >
      <span className="absolute inset-x-[0.3em] top-[0.2em] flex flex-col">
        {lines.map((_, index) => (
          <span
            key={index}
            className="block border-b border-dashed border-primary/35"
            style={{ height: lineHeight }}
          />
        ))}
      </span>
      <span className="absolute left-[0.35em] top-[0.15em] font-semibold text-primary/45">
        texto
      </span>
      {showCount ? (
        <span className="absolute right-1 top-1 rounded-full border border-primary/20 bg-white/85 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary shadow-sm">
          {lineCount} {lineCount === 1 ? "linha" : "linhas"}
        </span>
      ) : null}
    </span>
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

  if (field.type === "SHORT_TEXT") {
    return <FieldTextGuide kind="SHORT_TEXT" showCount={selected} />;
  }

  if (field.type === "LONG_TEXT") {
    return <FieldTextGuide kind="LONG_TEXT" showCount={selected} />;
  }

  return (
    <span className="pointer-events-none absolute inset-2 rounded border border-dashed border-primary/25" />
  );
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
  const fieldType =
    type === "TEXT" ? textFieldTypeForGeometry(geometry) : type;

  return normalizeTextFieldType({
    height: geometry.height,
    id,
    label: `${meta.label} ${sortOrder + 1}`,
    page,
    placeholder: meta.placeholder,
    required: fieldType !== "CHECKBOX",
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
  setSelectedFieldId,
}: {
  fields: EditableHomeworkField[];
  homework: InteractiveHomeworkEditorRow;
  selectedFieldId: string | null;
  selectedTool: EditorFieldTool;
  setFields: Dispatch<SetStateAction<EditableHomeworkField[]>>;
  setSelectedFieldId: Dispatch<SetStateAction<string | null>>;
}) {
  const assetUrl = `/ava/homework-assets/${homework.id}`;
  const [activeAction, setActiveAction] = useState<EditorAction | null>(null);

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
                "absolute rounded-[3px] border-2 border-primary shadow-[0_0_0_1px_rgba(65,42,76,0.16)]",
                selectedTool === "CHECKBOX"
                  ? "flex items-center justify-center bg-white/50"
                  : "bg-primary/10",
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
              {selectedTool === "TEXT" ? (
                <FieldTextGuide
                  kind={textFieldTypeForGeometry(draftGeometry)}
                  showCount
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      renderField={(field, index, style) => {
        const selected = selectedFieldId === field.id;
        const isMarkField = field.type === "CHECKBOX";

        return (
          <div
            key={field.id}
            className={cn(
              "absolute z-10 cursor-move touch-none rounded-[3px] border-2",
              isMarkField
                ? "bg-white/35 shadow-[0_1px_4px_rgba(65,42,76,0.14)]"
                : "bg-primary/[0.045] shadow-[inset_0_0_0_1px_rgba(65,42,76,0.08)]",
              selected
                ? "border-primary ring-2 ring-primary/25"
                : "border-dashed border-primary/55 hover:border-primary",
            )}
            onPointerDown={(event) => beginMove(event, field)}
            style={{
              ...style,
              containerType: "size",
            }}
            title={field.label || `Area ${index + 1}`}
          >
            <FieldAnswerPreview field={field} selected={selected} />
            {selected ? (
              <button
                aria-label="Redimensionar area"
                className={cn(
                  "absolute cursor-nwse-resize rounded-full border border-primary/30 bg-white text-primary shadow-sm",
                  isMarkField
                    ? "-bottom-1.5 -right-1.5 size-3.5"
                    : "-bottom-2 -right-2 size-5",
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
}: {
  homework: InteractiveHomeworkEditorRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [fields, setFields] = useState<EditableHomeworkField[]>(homework.fields);
  const [selectedTool, setSelectedTool] = useState<EditorFieldTool>("TEXT");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    homework.fields[0]?.id ?? null,
  );
  const isInteractiveLesson = homework.source === "LESSON";
  const entityLabel = isInteractiveLesson ? "aula interativa" : "homework";

  function removeSelectedField() {
    if (!selectedFieldId) {
      return;
    }

    setFields((current) =>
      current.filter((field) => field.id !== selectedFieldId),
    );
    setSelectedFieldId(null);
    setMessage("Area removida. Salve para aplicar a mudanca.");
  }

  function clearFields() {
    setFields([]);
    setSelectedFieldId(null);
    setMessage("Areas removidas. Desenhe novas areas no PDF e salve.");
  }

  function saveFields() {
    setMessage(null);

    if (fields.length === 0) {
      setMessage("Desenhe pelo menos uma area antes de salvar.");
      return;
    }

    startSaveTransition(async () => {
      const result = await saveInteractiveHomeworkFields({
        fields: fields.map((field, index) => {
          const normalizedField = normalizeTextFieldType(field);

          return {
            ...normalizedField,
            label: normalizedField.label ?? undefined,
            placeholder: normalizedField.placeholder ?? undefined,
            sortOrder: index,
          };
        }),
        homeworkId: homework.id,
      });

      setMessage(result.message);

      if (result.ok) {
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

  return (
    <details className="group rounded-lg border-2 border-primary/20 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-primary/5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {homework.title}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {homework.studentName ?? "Aluno geral"} - {homework.lessonTitle}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-primary/20 px-2 py-1">
            {fields.length} area(s)
          </span>
          <Button
            disabled={isDeleting || isSaving}
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
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}
            Excluir
          </Button>
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-primary/15 p-4">
        <div className="flex flex-col gap-3 rounded-lg border border-primary/15 bg-muted/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <Wand2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate font-semibold">
                {homework.assetFileName ??
                  (isInteractiveLesson ? "Arquivo da aula" : "Arquivo da homework")}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(homework.assetSizeBytes)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FIELD_TOOL_OPTIONS.map((tool) => {
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
                disabled={!selectedFieldId || isSaving || isDeleting}
                onClick={removeSelectedField}
                size="sm"
                title="Excluir area selecionada"
                type="button"
                variant="outline"
              >
                <Trash2 data-icon="inline-start" />
                Excluir area
              </Button>

              <Button
                disabled={fields.length === 0 || isSaving || isDeleting}
                onClick={clearFields}
                size="sm"
                title="Remover todas as areas"
                type="button"
                variant="outline"
              >
                <Trash2 data-icon="inline-start" />
                Limpar
              </Button>

              <Button
                disabled={isSaving || isDeleting}
                onClick={saveFields}
                size="sm"
                type="button"
              >
                {isSaving ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                Salvar areas
              </Button>
            </div>
          </div>

          {message ? (
            <p className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>

        <InteractiveHomeworkCanvasEditor
          fields={fields}
          homework={homework}
          selectedFieldId={selectedFieldId}
          selectedTool={selectedTool}
          setFields={setFields}
          setSelectedFieldId={setSelectedFieldId}
        />
      </div>
    </details>
  );
}

export function InteractiveHomeworkEditor({
  heading = "Homeworks interativas",
  homeworks,
}: {
  heading?: string;
  homeworks: InteractiveHomeworkEditorRow[];
}) {
  if (homeworks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{heading}</h2>
        <span className="rounded-full border border-primary/20 px-3 py-1 text-xs font-semibold text-muted-foreground">
          {homeworks.length}
        </span>
      </div>
      <div className="grid gap-3">
        {homeworks.map((homework) => (
          <InteractiveHomeworkEditorItem
            key={homework.id}
            homework={homework}
          />
        ))}
      </div>
    </div>
  );
}
