"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  reopenInteractiveHomeworkDraft,
  saveInteractiveHomeworkDraft,
  submitInteractiveHomework,
} from "@/app/ava/student/actions";
import { Button } from "@/components/ui/button";

export type StudentInteractiveField = {
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

export type StudentInteractiveSubmission = {
  answers: unknown;
  feedback: string | null;
  id: string;
  status: string;
  submittedAt: Date;
};

export type StudentInteractiveHomework = {
  assetFileName: string | null;
  assetMimeType: string | null;
  dueDate: Date | null;
  fields: StudentInteractiveField[];
  id: string;
  instructions: string | null;
  submission?: StudentInteractiveSubmission;
  title: string;
};

function answersToMap(answers: unknown) {
  const values: Record<string, string> = {};

  if (!Array.isArray(answers)) {
    return values;
  }

  for (const answer of answers) {
    if (
      typeof answer === "object" &&
      answer !== null &&
      "fieldId" in answer &&
      "value" in answer &&
      typeof answer.fieldId === "string" &&
      typeof answer.value === "string"
    ) {
      values[answer.fieldId] = answer.value;
    }
  }

  return values;
}

function statusLabel(status?: string) {
  if (status === "REVIEWED") {
    return "Corrigida";
  }

  if (status === "SUBMITTED") {
    return "Entregue";
  }

  if (status === "RETURNED") {
    return "Refazer";
  }

  if (status === "DRAFT") {
    return "Rascunho";
  }

  return "Pendente";
}

function statusClass(status?: string) {
  if (status === "REVIEWED") {
    return "border-emerald-700 bg-emerald-600 text-white";
  }

  if (status === "SUBMITTED") {
    return "border-primary bg-primary text-primary-foreground";
  }

  if (status === "RETURNED") {
    return "border-amber-600 bg-amber-100 text-amber-900";
  }

  return "border-red-700 bg-red-600 text-white";
}

export function InteractiveHomeworkStudent({
  homework,
}: {
  homework: StudentInteractiveHomework;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isPending, startTransition] = useTransition();
  const initialValues = useMemo(
    () => answersToMap(homework.submission?.answers),
    [homework.submission?.answers],
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const mounted = useRef(false);
  const status = homework.submission?.status;
  const isLocked = status === "SUBMITTED" || status === "REVIEWED";
  const canReopen = status === "SUBMITTED";
  const assetUrl = `/ava/homework-assets/${homework.id}`;

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (isLocked) {
      return;
    }

    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      const result = await saveInteractiveHomeworkDraft({
        answers: homework.fields.map((field) => ({
          fieldId: field.id,
          value: values[field.id] ?? "",
        })),
        homeworkId: homework.id,
      });

      setMessage(result.ok ? null : result.message);
      setSaveState(result.ok ? "saved" : "idle");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [homework.fields, homework.id, isLocked, values]);

  function updateValue(fieldId: string, value: string) {
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await submitInteractiveHomework({
        answers: homework.fields.map((field) => ({
          fieldId: field.id,
          value: values[field.id] ?? "",
        })),
        homeworkId: homework.id,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function reopen() {
    setMessage(null);
    startTransition(async () => {
      const result = await reopenInteractiveHomeworkDraft({
        homeworkId: homework.id,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <details className="group rounded-lg border-2 border-primary/20 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-primary/5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ClipboardCheck aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {homework.title}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {homework.assetFileName ?? "Homework interativa"}
            </span>
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
            status,
          )}`}
        >
          {statusLabel(status)}
        </span>
      </summary>

      <div className="border-t border-primary/15 p-4">
        <div className="mb-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-start">
          <p className="leading-6">
            {homework.instructions ?? "Complete a atividade e entregue."}
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-semibold">
            <Save aria-hidden="true" />
            {saveState === "saving"
              ? "Salvando"
              : saveState === "saved"
                ? "Salvo"
                : "Autosave"}
          </span>
        </div>

        <div className="relative aspect-[4/3] min-h-[480px] overflow-hidden rounded-lg border-2 border-primary/25 bg-white shadow-inner">
          {homework.assetMimeType?.startsWith("image/") ? (
            <img
              alt={`Homework ${homework.title}`}
              className="absolute inset-0 size-full object-contain"
              src={assetUrl}
            />
          ) : (
            <object
              aria-label={`Homework ${homework.title}`}
              className="absolute inset-0 size-full bg-white"
              data={`${assetUrl}#toolbar=0&navpanes=0&view=FitH`}
              type={homework.assetMimeType ?? "application/pdf"}
            />
          )}

          <div className="absolute inset-0">
            {homework.fields.map((field, index) => {
              const commonClass =
                "absolute rounded-md border-2 border-primary/45 bg-white/92 px-2 py-1 text-sm font-medium shadow-lg outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:bg-muted/80";
              const style = {
                height: `${field.height}%`,
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
              };

              if (field.type === "CHECKBOX") {
                return (
                  <label
                    key={field.id}
                    className={`${commonClass} flex items-center justify-center`}
                    style={style}
                  >
                    <input
                      aria-label={field.label ?? `Campo ${index + 1}`}
                      checked={values[field.id] === "true"}
                      className="size-5 accent-primary"
                      disabled={isLocked}
                      onChange={(event) =>
                        updateValue(
                          field.id,
                          event.target.checked ? "true" : "false",
                        )
                      }
                      type="checkbox"
                    />
                  </label>
                );
              }

              if (field.type === "SHORT_TEXT") {
                return (
                  <input
                    key={field.id}
                    aria-label={field.label ?? `Campo ${index + 1}`}
                    className={commonClass}
                    disabled={isLocked}
                    onChange={(event) =>
                      updateValue(field.id, event.target.value)
                    }
                    placeholder={field.placeholder ?? "Resposta"}
                    style={style}
                    value={values[field.id] ?? ""}
                  />
                );
              }

              return (
                <textarea
                  key={field.id}
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className={`${commonClass} resize-none leading-5`}
                  disabled={isLocked}
                  onChange={(event) => updateValue(field.id, event.target.value)}
                  placeholder={field.placeholder ?? "Resposta"}
                  style={style}
                  value={values[field.id] ?? ""}
                />
              );
            })}
          </div>
        </div>

        {homework.submission?.feedback ? (
          <div className="mt-4 rounded-lg border border-primary/20 bg-secondary p-3 text-sm leading-6">
            <strong>Feedback:</strong> {homework.submission.feedback}
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={submit} disabled={isPending || isLocked}>
            {isPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Entregar
          </Button>
          {canReopen ? (
            <Button
              type="button"
              variant="outline"
              onClick={reopen}
              disabled={isPending}
            >
              <RotateCcw data-icon="inline-start" />
              Refazer
            </Button>
          ) : null}
          {status === "REVIEWED" ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 aria-hidden="true" />
              Corrigida
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
