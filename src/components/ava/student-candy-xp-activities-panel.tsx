"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Save,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  saveCandyXpActivityDraft,
  submitCandyXpActivity,
} from "@/app/ava/candy-xp/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type StudentCandyXpQuestion = {
  id: string;
  options: unknown;
  prompt: string;
  required: boolean;
  sortOrder: number;
  type: "CHECKBOX" | "LONG_TEXT" | "MATCHING" | "MULTIPLE_CHOICE" | "SHORT_TEXT";
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
  category: string;
  description: string | null;
  id: string;
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

function ActivityCard({ activity }: { activity: StudentCandyXpActivity }) {
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
  const answeredCount = activity.questions.filter((question) =>
    hasAnswer(question, values[question.id]),
  ).length;
  const progressPercent =
    activity.questions.length === 0
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
    <details className="group overflow-hidden rounded-lg border border-primary/15 bg-white shadow-lg shadow-primary/10">
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
                Progresso da missao
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
              {answeredCount}/{activity.questions.length} pergunta(s)
              respondida(s)
            </p>
          </div>

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
                          onChange={() => setQuestionValue(question.id, option.text)}
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
                                : selected.filter((item) => item !== option.text);

                              setQuestionValue(question.id, JSON.stringify(next));
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
              <Trophy aria-hidden="true" />
              +{activity.submission.awardedXp} XP recebido
            </div>
          ) : null}

          {message ? (
            <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || isLocked}
              onClick={saveDraft}
            >
              {isPending ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Salvar progresso
            </Button>
            <Button
              type="button"
              disabled={isPending || isLocked}
              onClick={submitActivity}
            >
              {isPending ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
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
  const completed = activities.filter(
    (activity) => activity.submission?.status === "REVIEWED",
  ).length;

  if (activities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-primary/75">
        Nenhuma missao Candy XP publicada para voce ainda.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-primary/15 bg-[linear-gradient(135deg,rgba(255,244,214,0.96),rgba(255,255,255,0.95))] p-5 shadow-lg shadow-primary/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Candy XP
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Missoes de historias
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Leia o material, responda as perguntas e ganhe XP quando concluir.
            </p>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 text-amber-950">
            <strong className="block text-2xl">
              {completed}/{activities.length}
            </strong>
            <span className="text-sm">missoes concluidas</span>
          </div>
        </div>
      </div>

      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
