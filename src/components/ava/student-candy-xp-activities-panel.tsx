"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LoaderCircle,
  Save,
  Send,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  saveCandyXpActivityDraft,
  submitCandyXpActivity,
} from "@/app/ava/candy-xp/actions";
import { InteractiveHomeworkStudent } from "@/components/ava/interactive-homework-student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { InteractiveHomeworkFieldType } from "@/lib/interactive-homework-fields";

type StudentCandyXpQuestion = {
  id: string;
  options: unknown;
  prompt: string;
  required: boolean;
  sortOrder: number;
  type:
    | "CHECKBOX"
    | "LONG_TEXT"
    | "MATCHING"
    | "MULTIPLE_CHOICE"
    | "SHORT_TEXT";
};

type StudentCandyXpSubmission = {
  answers: unknown;
  autoScorePercent: number | null;
  awardedXp: number | null;
  feedback: string | null;
  id: string;
  status: "DRAFT" | "RETURNED" | "REVIEWED" | "SUBMITTED";
  submittedAt: string | null;
};

export type StudentCandyXpActivity = {
  assetFileName: string | null;
  assetMimeType: string | null;
  assetPageCount: number | null;
  category: string;
  description: string | null;
  id: string;
  interactiveFields: {
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
  }[];
  level: string;
  questions: StudentCandyXpQuestion[];
  submission: StudentCandyXpSubmission | null;
  title: string;
  xpReward: number;
};

type StudentCandyXpActivitiesPanelProps = {
  activities: StudentCandyXpActivity[];
};

type CandyXpQuestionOption = {
  match?: string;
  text: string;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  RETURNED: "Refazer",
  REVIEWED: "Concluida",
  SUBMITTED: "Aguardando correcao",
};

function getInitialActivityId(activities: StudentCandyXpActivity[]) {
  return (
    activities.find((activity) => activity.submission?.status !== "REVIEWED")
      ?.id ??
    activities[0]?.id ??
    null
  );
}

function getQuestionOptions(options: unknown): CandyXpQuestionOption[] {
  if (
    typeof options !== "object" ||
    options === null ||
    !("items" in options) ||
    !Array.isArray((options as { items?: unknown }).items)
  ) {
    return [];
  }

  return (options as { items: unknown[] }).items
    .map((item): CandyXpQuestionOption | null => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("text" in item) ||
        typeof item.text !== "string"
      ) {
        return null;
      }

      const option: CandyXpQuestionOption = {
        text: item.text,
      };

      if ("match" in item && typeof item.match === "string") {
        option.match = item.match;
      }

      return option;
    })
    .filter((item): item is CandyXpQuestionOption => item !== null);
}

function answersToMap(answers: unknown) {
  const values: Record<string, string> = {};

  if (!Array.isArray(answers)) {
    return values;
  }

  for (const answer of answers) {
    if (
      typeof answer === "object" &&
      answer !== null &&
      "questionId" in answer &&
      "value" in answer &&
      typeof answer.questionId === "string" &&
      typeof answer.value === "string"
    ) {
      values[answer.questionId] = answer.value;
    }
  }

  return values;
}

function parseSelectedArray(value?: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseMatchingValue(value?: string) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function hasAnswer(question: StudentCandyXpQuestion, value?: string) {
  if (question.type === "CHECKBOX") {
    return parseSelectedArray(value).length > 0;
  }

  if (question.type === "MATCHING") {
    return Object.keys(parseMatchingValue(value)).length > 0;
  }

  return Boolean(value?.trim());
}

function statusClass(status?: string) {
  if (status === "REVIEWED") {
    return "border-emerald-600 bg-emerald-50 text-emerald-900";
  }

  if (status === "SUBMITTED") {
    return "border-primary bg-primary text-primary-foreground";
  }

  if (status === "RETURNED") {
    return "border-amber-500 bg-amber-50 text-amber-900";
  }

  return "border-primary/20 bg-white text-primary";
}

function getStatusMeta(status?: string) {
  if (status === "REVIEWED") {
    return {
      accentClassName: "bg-emerald-500",
      badgeClassName: "border-emerald-300 bg-emerald-50 text-emerald-900",
      helper: "XP registrado",
      iconClassName: "bg-emerald-100 text-emerald-700",
      label: "Concluida",
    };
  }

  if (status === "SUBMITTED") {
    return {
      accentClassName: "bg-primary",
      badgeClassName: "border-primary/25 bg-primary/10 text-primary",
      helper: "Aguardando correcao",
      iconClassName: "bg-primary/10 text-primary",
      label: "Enviada",
    };
  }

  if (status === "RETURNED") {
    return {
      accentClassName: "bg-amber-500",
      badgeClassName: "border-amber-300 bg-amber-50 text-amber-950",
      helper: "Refazer liberado",
      iconClassName: "bg-amber-100 text-amber-800",
      label: "Refazer",
    };
  }

  if (status === "DRAFT") {
    return {
      accentClassName: "bg-sky-500",
      badgeClassName: "border-sky-300 bg-sky-50 text-sky-900",
      helper: "Rascunho salvo",
      iconClassName: "bg-sky-100 text-sky-800",
      label: "Rascunho",
    };
  }

  return {
    accentClassName: "bg-rose-500",
    badgeClassName: "border-rose-300 bg-rose-50 text-rose-900",
    helper: "Ainda nao enviada",
    iconClassName: "bg-rose-100 text-rose-800",
    label: "Pendente",
  };
}

function hasInteractiveAnswer(
  field: StudentCandyXpActivity["interactiveFields"][number],
  value?: string,
) {
  if (!value) {
    return false;
  }

  if (field.type === "CHECKBOX") {
    return value === "true";
  }

  return value.trim().length > 0;
}

function getActivityProgress(activity: StudentCandyXpActivity) {
  if (activity.submission?.status === "REVIEWED") {
    return {
      completed: 1,
      label: "concluida",
      percent: 100,
      total: 1,
    };
  }

  const answers = answersToMap(activity.submission?.answers);

  if (activity.interactiveFields.length > 0) {
    const completed = activity.interactiveFields.filter((field) =>
      hasInteractiveAnswer(field, answers[field.id]),
    ).length;

    return {
      completed,
      label: `${completed}/${activity.interactiveFields.length} areas`,
      percent: Math.round(
        (completed / Math.max(1, activity.interactiveFields.length)) * 100,
      ),
      total: activity.interactiveFields.length,
    };
  }

  if (activity.questions.length > 0) {
    const completed = activity.questions.filter((question) =>
      hasAnswer(question, answers[question.id]),
    ).length;

    return {
      completed,
      label: `${completed}/${activity.questions.length} perguntas`,
      percent: Math.round(
        (completed / Math.max(1, activity.questions.length)) * 100,
      ),
      total: activity.questions.length,
    };
  }

  return {
    completed: 0,
    label: "material aberto",
    percent: 0,
    total: 1,
  };
}

function getActivityKindLabel(activity: StudentCandyXpActivity) {
  if (activity.interactiveFields.length > 0) {
    return "PDF interativo";
  }

  if (activity.questions.length > 0) {
    return "Perguntas";
  }

  if (activity.assetMimeType?.startsWith("image/")) {
    return "Imagem";
  }

  return "PDF";
}

function ActivityMissionTile({
  activity,
  isSelected,
  onSelect,
}: {
  activity: StudentCandyXpActivity;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = activity.submission?.status;
  const statusMeta = getStatusMeta(status);
  const progress = getActivityProgress(activity);
  const preview =
    activity.description?.trim() || "Abra, responda no material e envie.";

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`group relative flex aspect-square min-h-[178px] flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        isSelected
          ? "border-primary bg-white shadow-xl shadow-primary/15"
          : "border-primary/12 bg-white/88 hover:border-primary/30"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${
          isSelected
            ? "bg-[linear-gradient(90deg,#412a4c,#e57cd8,#ffbd4a)]"
            : statusMeta.accentClassName
        }`}
      />
      <span
        aria-hidden="true"
        className="absolute -right-10 -top-10 size-28 rounded-full bg-amber-200/35 blur-2xl transition group-hover:bg-amber-200/55"
      />

      <span className="relative flex items-start justify-between gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${statusMeta.iconClassName}`}
        >
          {status === "REVIEWED" ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <Sparkles aria-hidden="true" className="size-5" />
          )}
        </span>
        <span className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-950">
            +{activity.xpReward} XP
          </span>
          {isSelected ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
              aberta
            </span>
          ) : null}
        </span>
      </span>

      <span className="relative min-w-0">
        <span className="block text-sm font-semibold leading-tight text-primary line-clamp-2">
          {activity.title}
        </span>
        <span className="mt-2 block text-xs leading-5 text-muted-foreground line-clamp-3">
          {preview}
        </span>
      </span>

      <span className="relative grid gap-3">
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-primary/80">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5">
            <BookOpen aria-hidden="true" className="size-3" />
            {activity.level}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-white/90 px-2 py-0.5">
            <FileText aria-hidden="true" className="size-3" />
            {getActivityKindLabel(activity)}
          </span>
        </span>
        <span>
          <span className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
            <span>{progress.label}</span>
            <span>{progress.percent}%</span>
          </span>
          <span className="block h-2 overflow-hidden rounded-full bg-primary/10">
            <span
              aria-hidden="true"
              className="block h-full rounded-full bg-[linear-gradient(90deg,#ff9f1c,#ffe66d)]"
              style={{ width: `${progress.percent}%` }}
            />
          </span>
        </span>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeClassName}`}
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${statusMeta.accentClassName}`}
          />
          {statusMeta.label}
        </span>
      </span>
    </button>
  );
}

function ActivityCard({
  activity,
  defaultOpen = false,
}: {
  activity: StudentCandyXpActivity;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const initialValues = useMemo(
    () => answersToMap(activity.submission?.answers),
    [activity.submission?.answers],
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = activity.submission?.status;
  const isLocked = status === "SUBMITTED" || status === "REVIEWED";
  const isPdfOnly = activity.questions.length === 0;
  const answeredCount = activity.questions.filter((question) =>
    hasAnswer(question, values[question.id]),
  ).length;
  const progressPercent = isPdfOnly
    ? status === "REVIEWED"
      ? 100
      : 0
    : activity.questions.length === 0
      ? 0
      : Math.round((answeredCount / activity.questions.length) * 100);

  function setQuestionValue(questionId: string, value: string) {
    setValues((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function saveDraft() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCandyXpActivityDraft({
        activityId: activity.id,
        answers: activity.questions.map((question) => ({
          questionId: question.id,
          value: values[question.id] ?? "",
        })),
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function submitActivity() {
    setMessage(null);
    startTransition(async () => {
      const result = await submitCandyXpActivity({
        activityId: activity.id,
        answers: activity.questions.map((question) => ({
          questionId: question.id,
          value: values[question.id] ?? "",
        })),
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-lg border border-primary/15 bg-white shadow-lg shadow-primary/10"
    >
      <summary className="flex cursor-pointer list-none flex-col gap-4 bg-[linear-gradient(135deg,rgba(255,248,221,0.95),rgba(255,255,255,0.98))] p-5 hover:bg-primary/5 md:flex-row md:items-center md:justify-between [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-300 text-primary shadow-sm">
            <Sparkles aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-primary">
              {activity.title}
            </span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">
              {activity.description ?? "Missao Candy XP liberada para voce."}
            </span>
            <span className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-primary/15 bg-white px-3 py-1 text-primary">
                {activity.level}
              </span>
              <span className="rounded-full border border-primary/15 bg-white px-3 py-1 text-primary">
                {activity.category}
              </span>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-amber-900">
                +{activity.xpReward} XP
              </span>
            </span>
          </span>
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
            status,
          )}`}
        >
          {status === "REVIEWED" ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          ) : (
            <ClipboardCheck aria-hidden="true" className="size-3.5" />
          )}
          {statusLabels[status ?? ""] ?? "Pendente"}
        </span>
      </summary>

      <div className="grid gap-5 border-t border-primary/10 p-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-primary">Historia</p>
            <span className="text-xs text-muted-foreground">
              {activity.assetFileName ?? "Arquivo Candy XP"}
            </span>
          </div>
          <iframe
            src={`/ava/candy-xp-assets/${activity.id}`}
            title={`Historia Candy XP ${activity.title}`}
            className="h-[520px] w-full rounded-lg border border-primary/15 bg-white"
          />
        </section>

        <section className="grid min-w-0 content-start gap-4">
          <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-primary">
                {isPdfOnly ? "Missao em PDF" : "Progresso da missao"}
              </span>
              <span className="font-semibold text-primary">
                {progressPercent}%
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#ff9f1c,#ffe66d)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isPdfOnly
                ? status === "REVIEWED"
                  ? "Missao concluida e XP registrado."
                  : "Abra o material, complete a atividade e envie a missao quando terminar."
                : `${answeredCount}/${activity.questions.length} pergunta(s) respondida(s)`}
            </p>
          </div>

          {isPdfOnly ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
              <strong className="flex items-center gap-2 text-primary">
                <Sparkles aria-hidden="true" className="size-4" />
                Atividade direto no PDF
              </strong>
              <p className="mt-2">
                Use o material ao lado como missao principal. Quando terminar,
                clique em enviar para registrar o Candy XP.
              </p>
            </div>
          ) : null}

          {activity.questions.map((question, index) => {
            const options = getQuestionOptions(question.options);
            const value = values[question.id] ?? "";

            return (
              <div
                key={question.id}
                className="rounded-lg border border-primary/10 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-primary">
                      {question.prompt}
                    </p>
                    {question.required ? (
                      <span className="text-xs text-muted-foreground">
                        Obrigatoria
                      </span>
                    ) : null}
                  </div>
                </div>

                {question.type === "SHORT_TEXT" ? (
                  <Input
                    value={value}
                    disabled={isLocked}
                    placeholder="Sua resposta"
                    onChange={(event) =>
                      setQuestionValue(question.id, event.target.value)
                    }
                  />
                ) : null}

                {question.type === "LONG_TEXT" ? (
                  <Textarea
                    value={value}
                    disabled={isLocked}
                    placeholder="Escreva sua resposta"
                    onChange={(event) =>
                      setQuestionValue(question.id, event.target.value)
                    }
                  />
                ) : null}

                {question.type === "MULTIPLE_CHOICE" ? (
                  <div className="grid gap-2">
                    {options.map((option) => (
                      <label
                        key={option.text}
                        className="flex items-center gap-2 rounded-lg border border-primary/10 bg-muted/20 p-3 text-sm"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={value === option.text}
                          disabled={isLocked}
                          onChange={() =>
                            setQuestionValue(question.id, option.text)
                          }
                        />
                        {option.text}
                      </label>
                    ))}
                  </div>
                ) : null}

                {question.type === "CHECKBOX" ? (
                  <div className="grid gap-2">
                    {options.map((option) => {
                      const selected = parseSelectedArray(value);
                      const checked = selected.includes(option.text);

                      return (
                        <label
                          key={option.text}
                          className="flex items-center gap-2 rounded-lg border border-primary/10 bg-muted/20 p-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isLocked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...selected, option.text]
                                : selected.filter(
                                    (item) => item !== option.text,
                                  );

                              setQuestionValue(
                                question.id,
                                JSON.stringify(next),
                              );
                            }}
                          />
                          {option.text}
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {question.type === "MATCHING" ? (
                  <div className="grid gap-2">
                    {options.map((option) => {
                      const matching = parseMatchingValue(value);
                      const rightOptions = options
                        .map((item) => item.match)
                        .filter((item): item is string => Boolean(item));

                      return (
                        <label
                          key={option.text}
                          className="grid gap-2 rounded-lg border border-primary/10 bg-muted/20 p-3 text-sm md:grid-cols-[1fr_1fr] md:items-center"
                        >
                          <span className="font-semibold text-primary">
                            {option.text}
                          </span>
                          <NativeSelect
                            value={matching[option.text] ?? ""}
                            disabled={isLocked}
                            onChange={(event) => {
                              setQuestionValue(
                                question.id,
                                JSON.stringify({
                                  ...matching,
                                  [option.text]: event.target.value,
                                }),
                              );
                            }}
                          >
                            <option value="">Escolha o par</option>
                            {rightOptions.map((right) => (
                              <option key={right} value={right}>
                                {right}
                              </option>
                            ))}
                          </NativeSelect>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          {activity.submission?.feedback ? (
            <div className="rounded-lg border border-primary/15 bg-secondary/70 p-4 text-sm leading-6">
              <strong>Feedback:</strong> {activity.submission.feedback}
            </div>
          ) : null}

          {activity.submission?.awardedXp ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
              <Trophy aria-hidden="true" />+{activity.submission.awardedXp} XP
              recebido
            </div>
          ) : null}

          {message ? (
            <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!isPdfOnly ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isLocked}
                onClick={saveDraft}
              >
                {isPending ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                Salvar progresso
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={isPending || isLocked}
              onClick={submitActivity}
            >
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Send data-icon="inline-start" />
              )}
              Enviar missao
            </Button>
          </div>
        </section>
      </div>
    </details>
  );
}

export function StudentCandyXpActivitiesPanel({
  activities,
}: StudentCandyXpActivitiesPanelProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    () => getInitialActivityId(activities),
  );
  const completed = activities.filter(
    (activity) => activity.submission?.status === "REVIEWED",
  ).length;
  const pending = Math.max(0, activities.length - completed);
  const totalXp = activities.reduce(
    (sum, activity) => sum + activity.xpReward,
    0,
  );
  const selectedActivity =
    activities.find((activity) => activity.id === selectedActivityId) ??
    activities[0] ??
    null;
  const selectedStatusMeta = selectedActivity
    ? getStatusMeta(selectedActivity.submission?.status)
    : null;

  useEffect(() => {
    if (activities.some((activity) => activity.id === selectedActivityId)) {
      return;
    }

    setSelectedActivityId(getInitialActivityId(activities));
  }, [activities, selectedActivityId]);

  if (activities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-primary/75">
        Nenhuma missao Candy XP publicada para voce ainda.
      </p>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,rgba(255,244,214,0.96),rgba(255,255,255,0.95))] shadow-lg shadow-primary/10">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Candy XP
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Missoes de historias
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Escolha um quadrado, responda no PDF ou nas perguntas e envie
              para registrar seu XP.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm">
              <strong className="block text-2xl">
                {completed}/{activities.length}
              </strong>
              <span className="text-sm">concluidas</span>
            </div>
            <div className="rounded-xl border border-primary/15 bg-white/85 px-4 py-3 text-primary shadow-sm">
              <strong className="block text-2xl">{pending}</strong>
              <span className="text-sm">para fazer</span>
            </div>
            <div className="rounded-xl border border-primary/15 bg-white/85 px-4 py-3 text-primary shadow-sm">
              <strong className="block text-2xl">+{totalXp}</strong>
              <span className="text-sm">XP total</span>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/10 bg-white/88 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-primary/10 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-semibold text-primary">
                Suas missoes
              </strong>
              <span className="block text-xs text-muted-foreground">
                Cada quadrado abre uma atividade Candy XP.
              </span>
            </span>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Zap aria-hidden="true" className="size-3.5" />
            {activities.length} quadrado(s)
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(172px,1fr))] gap-3 p-4 sm:gap-4">
          {activities.map((activity) => (
            <ActivityMissionTile
              key={activity.id}
              activity={activity}
              isSelected={activity.id === selectedActivity?.id}
              onSelect={() => setSelectedActivityId(activity.id)}
            />
          ))}
        </div>
      </section>

      {selectedActivity ? (
        <section className="overflow-hidden rounded-2xl border border-primary/12 bg-white/95 shadow-xl shadow-primary/10">
          <div className="grid gap-4 border-b border-primary/10 bg-[linear-gradient(135deg,#fff_0%,#fff6df_52%,#fbf2ff_100%)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/80 px-2.5 py-1 text-xs font-semibold text-primary">
                  Missao selecionada
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                  {getActivityKindLabel(selectedActivity)}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-primary">
                  {selectedActivity.title}
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {selectedActivity.description ??
                    "Complete a atividade e envie para registrar seu Candy XP."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-bold text-amber-950">
                <Trophy aria-hidden="true" className="size-4" />+
                {selectedActivity.xpReward} XP
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  selectedStatusMeta?.badgeClassName ?? ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${
                    selectedStatusMeta?.accentClassName ?? ""
                  }`}
                />
                {selectedStatusMeta?.label}
              </span>
            </div>
          </div>

          <div
            className={
              selectedActivity.interactiveFields.length > 0
                ? ""
                : "p-4 md:p-5"
            }
          >
            {selectedActivity.interactiveFields.length > 0 ? (
              <InteractiveHomeworkStudent
                key={selectedActivity.id}
                context="candy-xp"
                defaultOpen
                displayMode="panel"
                homework={{
                  assetFileName: selectedActivity.assetFileName,
                  assetMimeType: selectedActivity.assetMimeType,
                  assetPageCount: selectedActivity.assetPageCount,
                  assetUrl: `/ava/candy-xp-assets/${selectedActivity.id}`,
                  dueDate: null,
                  fields: selectedActivity.interactiveFields,
                  id: selectedActivity.id,
                  instructions:
                    selectedActivity.description ??
                    "Complete as areas marcadas no arquivo e envie a missao.",
                  submission: selectedActivity.submission ?? undefined,
                  title: selectedActivity.title,
                  xpReward: selectedActivity.xpReward,
                }}
              />
            ) : (
              <ActivityCard
                key={selectedActivity.id}
                activity={selectedActivity}
                defaultOpen
              />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
