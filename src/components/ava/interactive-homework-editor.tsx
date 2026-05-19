"use client";

import {
  FileText,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteInteractiveHomework,
  saveInteractiveHomeworkFields,
} from "@/app/ava/teacher/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export type EditableHomeworkField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  placeholder: string | null;
  required: boolean;
  sortOrder: number;
  type: "SHORT_TEXT" | "LONG_TEXT" | "CHECKBOX";
  width: number;
  x: number;
  y: number;
};

export type InteractiveHomeworkEditorRow = {
  assetFileName: string | null;
  assetMimeType: string | null;
  assetSizeBytes: number | null;
  fieldDetectionSource: string | null;
  fields: EditableHomeworkField[];
  id: string;
  lessonTitle: string;
  studentName: string | null;
  title: string;
};

function fieldTemplate(): EditableHomeworkField {
  return {
    height: 10,
    id: `new-${crypto.randomUUID()}`,
    label: "Novo campo",
    page: 1,
    placeholder: "Escreva aqui",
    required: false,
    sortOrder: 0,
    type: "LONG_TEXT",
    width: 36,
    x: 8,
    y: 22,
  };
}

function formatSize(sizeBytes?: number | null) {
  if (!sizeBytes) {
    return "Arquivo";
  }

  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

function AssetPreview({
  fields,
  homework,
}: {
  fields: EditableHomeworkField[];
  homework: InteractiveHomeworkEditorRow;
}) {
  const assetUrl = `/ava/homework-assets/${homework.id}`;

  return (
    <div className="relative isolate aspect-[4/3] min-h-72 overflow-hidden rounded-lg border-2 border-primary/25 bg-white shadow-inner">
      {homework.assetMimeType?.startsWith("image/") ? (
        <img
          alt={`Previa da homework ${homework.title}`}
          className="absolute inset-0 z-0 size-full object-contain"
          src={assetUrl}
        />
      ) : (
        <object
          aria-label={`Previa da homework ${homework.title}`}
          className="absolute inset-0 z-0 size-full bg-white"
          data={`${assetUrl}#toolbar=0&navpanes=0&view=FitH`}
          type={homework.assetMimeType ?? "application/pdf"}
        />
      )}
      <div className="pointer-events-none absolute inset-0 z-10">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="absolute rounded-[3px] border border-dashed border-primary/65 bg-primary/[0.035] shadow-[inset_0_0_0_1px_rgba(65,42,76,0.08)]"
            style={{
              height: `${field.height}%`,
              left: `${field.x}%`,
              top: `${field.y}%`,
              width: `${field.width}%`,
            }}
            title={field.label || `Campo ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <Input
        className="h-9"
        max={100}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
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
  const [fields, setFields] = useState<EditableHomeworkField[]>(
    homework.fields.length > 0 ? homework.fields : [fieldTemplate()],
  );

  function updateField(
    fieldId: string,
    patch: Partial<EditableHomeworkField>,
  ) {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    );
  }

  function removeField(fieldId: string) {
    setFields((current) =>
      current.length <= 1
        ? current
        : current.filter((field) => field.id !== fieldId),
    );
  }

  function addField() {
    setFields((current) => [
      ...current,
      { ...fieldTemplate(), sortOrder: current.length, y: 18 + current.length * 8 },
    ]);
  }

  function saveFields() {
    setMessage(null);
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
            {fields.length} campo(s)
          </span>
          <span className="rounded-full border border-primary/20 px-2 py-1">
            {homework.fieldDetectionSource === "openai" ? "IA" : "Manual"}
          </span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isDeleting || isSaving}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              deleteHomework();
            }}
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

      <div className="grid gap-4 border-t border-primary/15 p-4 xl:grid-cols-[minmax(360px,0.95fr)_1.05fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Wand2 aria-hidden="true" />
              {homework.assetFileName ?? "Arquivo da homework"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatSize(homework.assetSizeBytes)}
            </span>
          </div>
          <AssetPreview fields={fields} homework={homework} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm">Campos de resposta</strong>
            <Button type="button" size="sm" variant="outline" onClick={addField}>
              <Plus data-icon="inline-start" />
              Campo
            </Button>
          </div>

          <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-primary/20 bg-muted/20 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <strong className="text-sm">Campo {index + 1}</strong>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Remover campo"
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Rotulo
                    <Input
                      className="h-9"
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                      value={field.label ?? ""}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Placeholder
                    <Input
                      className="h-9"
                      onChange={(event) =>
                        updateField(field.id, {
                          placeholder: event.target.value,
                        })
                      }
                      value={field.placeholder ?? ""}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Tipo
                    <NativeSelect
                      className="h-9"
                      onChange={(event) =>
                        updateField(field.id, {
                          type: event.target.value as EditableHomeworkField["type"],
                        })
                      }
                      value={field.type}
                    >
                      <option value="LONG_TEXT">Texto longo</option>
                      <option value="SHORT_TEXT">Texto curto</option>
                      <option value="CHECKBOX">Marcar</option>
                    </NativeSelect>
                  </label>
                  <label className="flex h-full min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <input
                      checked={field.required}
                      className="size-4 accent-primary"
                      onChange={(event) =>
                        updateField(field.id, {
                          required: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    Obrigatorio
                  </label>
                  <NumberInput
                    label="X %"
                    value={field.x}
                    onChange={(value) => updateField(field.id, { x: value })}
                  />
                  <NumberInput
                    label="Y %"
                    value={field.y}
                    onChange={(value) => updateField(field.id, { y: value })}
                  />
                  <NumberInput
                    label="Largura %"
                    value={field.width}
                    onChange={(value) =>
                      updateField(field.id, { width: value })
                    }
                  />
                  <NumberInput
                    label="Altura %"
                    value={field.height}
                    onChange={(value) =>
                      updateField(field.id, { height: value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {message ? (
            <p className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <Button type="button" onClick={saveFields} disabled={isSaving || isDeleting}>
            {isSaving ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Salvar campos
          </Button>
        </div>
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
