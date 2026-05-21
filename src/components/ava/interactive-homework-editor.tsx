"use client";

import {
  AlignLeft,
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
  studentName: string | null;
  title: string;
};

type FieldTool = EditableHomeworkField["type"];

type FieldToolMeta = {
  Icon: LucideIcon;
  defaultHeight: number;
  defaultWidth: number;
  label: string;
  minHeight: number;
  minWidth: number;
  placeholder: string | null;
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

const FIELD_TOOL_OPTIONS: FieldTool[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "CHECKBOX",
  "DRAWING",
];

const FIELD_TOOL_META: Record<FieldTool, FieldToolMeta> = {
  CHECKBOX: {
    Icon: CheckSquare,
    defaultHeight: 5,
    defaultWidth: 5,
    label: "Marcar",
    minHeight: 4,
    minWidth: 4,
    placeholder: null,
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
  LONG_TEXT: {
    Icon: AlignLeft,
    defaultHeight: 9,
    defaultWidth: 36,
    label: "Texto longo",
    minHeight: 5,
    minWidth: 10,
    placeholder: "Resposta",
  },
  SHORT_TEXT: {
    Icon: Type,
    defaultHeight: 5,
    defaultWidth: 24,
    label: "Texto curto",
    minHeight: 4,
    minWidth: 8,
    placeholder: "Resposta curta",
  },
};

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

function defaultGeometryFromPoint(type: FieldTool, point: PagePoint) {
  const meta = FIELD_TOOL_META[type];
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
  type: FieldTool,
  start: PagePoint,
  current: PagePoint,
) {
  const meta = FIELD_TOOL_META[type];
  const rawWidth = Math.abs(current.x - start.x);
  const rawHeight = Math.abs(current.y - start.y);

  if (rawWidth < 1.5 && rawHeight < 1.5) {
    return defaultGeometryFromPoint(type, start);
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
  const width = clampNumber(field.width, 4, 100);
  const height = clampNumber(field.height, 4, 100);
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;

  return cleanGeometry({
    height,
    width,
    x: clampNumber(field.x + deltaX, 0, 100 - width),
    y: clampNumber(field.y + deltaY, 0, 100 - height),
  });
}

function resizeFieldGeometry(field: EditableHomeworkField, current: PagePoint) {
  const meta = FIELD_TOOL_META[field.type];
  const x = clampNumber(field.x, 0, 96);
  const y = clampNumber(field.y, 0, 96);

  return cleanGeometry({
    height: clampNumber(current.y - y, meta.minHeight, 100 - y),
    width: clampNumber(current.x - x, meta.minWidth, 100 - x),
    x,
    y,
  });
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
  type: FieldTool;
}): EditableHomeworkField {
  const meta = FIELD_TOOL_META[type];

  return {
    height: geometry.height,
    id,
    label: `${meta.label} ${sortOrder + 1}`,
    page,
    placeholder: meta.placeholder,
    required: type !== "CHECKBOX",
    sortOrder,
    type,
    width: geometry.width,
    x: geometry.x,
    y: geometry.y,
  };
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
  selectedTool: FieldTool;
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
              ? { ...field, ...geometry }
              : field,
          ),
        );
        return;
      }

      const geometry = resizeFieldGeometry(action.original, current);

      setFields((currentFields) =>
        currentFields.map((field) =>
          field.id === action.fieldId ? { ...field, ...geometry } : field,
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
              className="absolute rounded-[3px] border-2 border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(65,42,76,0.16)]"
              style={{
                height: `${draftGeometry.height}%`,
                left: `${draftGeometry.x}%`,
                top: `${draftGeometry.y}%`,
                width: `${draftGeometry.width}%`,
              }}
            />
          ) : null}
        </div>
      )}
      renderField={(field, index, style) => {
        const meta = FIELD_TOOL_META[field.type];
        const Icon = meta.Icon;
        const selected = selectedFieldId === field.id;

        return (
          <div
            key={field.id}
            className={cn(
              "absolute z-10 cursor-move touch-none rounded-[3px] border-2 bg-primary/[0.045] shadow-[inset_0_0_0_1px_rgba(65,42,76,0.08)]",
              selected
                ? "border-primary ring-2 ring-primary/25"
                : "border-dashed border-primary/55 hover:border-primary",
            )}
            onPointerDown={(event) => beginMove(event, field)}
            style={style}
            title={field.label || `Area ${index + 1}`}
          >
            <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded bg-white/90 text-primary shadow-sm">
              <Icon aria-hidden="true" className="size-3" />
            </span>
            <button
              aria-label="Redimensionar area"
              className="absolute -bottom-2 -right-2 size-5 cursor-nwse-resize rounded-full border border-primary/30 bg-white text-primary shadow-sm"
              onPointerDown={(event) => beginResize(event, field)}
              type="button"
            />
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
  const [selectedTool, setSelectedTool] = useState<FieldTool>("SHORT_TEXT");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    homework.fields[0]?.id ?? null,
  );

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
        fields: fields.map((field, index) => ({
          ...field,
          label: field.label ?? undefined,
          placeholder: field.placeholder ?? undefined,
          sortOrder: index,
        })),
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
      `Excluir a homework "${homework.title}"? As respostas e campos desta atividade tambem serao removidos.`,
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
                {homework.assetFileName ?? "Arquivo da homework"}
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
  homeworks,
}: {
  homeworks: InteractiveHomeworkEditorRow[];
}) {
  if (homeworks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Homeworks interativas</h2>
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
