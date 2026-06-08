"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  FileUp,
  ImageUp,
  LoaderCircle,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createCandyXpActivity,
  reviewCandyXpActivitySubmission,
  updateCandyXpActivity,
} from "@/app/ava/candy-xp/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CandyXpActivityReviewInput,
  CandyXpActivityUpdateInput,
} from "@/lib/validations/candy-xp-activities";

export type CandyXpStudentOption = {
  email: string;
  id: string;
  isActive: boolean;
  label: string;
};

export type AdminCandyXpQuestionRow = {
  correctAnswer: unknown;
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

export type AdminCandyXpSubmissionRow = {
  answers: unknown;
  autoScorePercent: number | null;
  awardedXp: number | null;
  feedback: string | null;
  id: string;
  reviewedAt: string | null;
  status: "DRAFT" | "RETURNED" | "REVIEWED" | "SUBMITTED";
  studentEmail: string;
  studentName: string;
  submittedAt: string | null;
};

export type AdminCandyXpActivityRow = {
  assignments: {
    studentEmail: string;
    studentName: string;
  }[];
  assetFileName: string | null;
  category: string;
  createdAt: string;
  description: string | null;
  id: string;
  level: string;
  publishedAt: string | null;
  questions: AdminCandyXpQuestionRow[];
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  submissions: AdminCandyXpSubmissionRow[];
  title: string;
  xpReward: number;
};

type AdminCandyXpPanelProps = {
  activities: AdminCandyXpActivityRow[];
  students: CandyXpStudentOption[];
};

type QuestionDraft = {
  answerGuide: string;
  id: string;
  prompt: string;
  required: boolean;
  type: AdminCandyXpQuestionRow["type"];
};

const questionTypeLabels: Record<AdminCandyXpQuestionRow["type"], string> = {
  CHECKBOX: "Marcar X / checkbox",
  LONG_TEXT: "Resposta longa",
  MATCHING: "Ligar pares",
  MULTIPLE_CHOICE: "Multipla escolha",
  SHORT_TEXT: "Resposta curta",
};

const statusLabels: Record<AdminCandyXpActivityRow["status"], string> = {
  ARCHIVED: "Arquivada",
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
};

const submissionStatusLabels: Record<
  AdminCandyXpSubmissionRow["status"],
  string
> = {
  DRAFT: "Rascunho",
  RETURNED: "Refazer",
  REVIEWED: "Concluida",
  SUBMITTED: "Aguardando correcao",
};

function createQuestionDraft(index: number): QuestionDraft {
  return {
    answerGuide: "",
    id: `${Date.now()}-${index}`,
    prompt: "",
    required: true,
    type: "MULTIPLE_CHOICE",
  };
}

function parseAnswerGuide(draft: QuestionDraft) {
  const lines = draft.answerGuide
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (draft.type === "MATCHING") {
    return {
      correctAnswers: [],
      options: lines
        .map((line) => {
          const [left, ...rightParts] = line.split("=");
          const right = rightParts.join("=").trim();

          return {
            match: right,
            text: left.trim(),
          };
        })
        .filter((option) => option.text && option.match),
    };
  }

  if (draft.type === "MULTIPLE_CHOICE" || draft.type === "CHECKBOX") {
    const options = lines.map((line) => ({
      text: line.replace(/^\*/, "").trim(),
    }));
    const correctAnswers = lines
      .filter((line) => line.startsWith("*"))
      .map((line) => line.replace(/^\*/, "").trim())
      .filter(Boolean);

    return {
      correctAnswers,
      options,
    };
  }

  return {
    correctAnswers: lines,
    options: [],
  };
}

function buildQuestionsPayload(drafts: QuestionDraft[]) {
  return drafts.map((draft) => {
    const parsed = parseAnswerGuide(draft);

    return {
      correctAnswers: parsed.correctAnswers,
      options: parsed.options,
      prompt: draft.prompt,
      required: draft.required,
      type: draft.type,
    };
  });
}

function getQuestionHelp(type: QuestionDraft["type"]) {
  if (type === "MATCHING") {
    return "Use uma linha por par: apple = maca";
  }

  if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX") {
    return "Use uma alternativa por linha. Comece com * para marcar a correta.";
  }

  return "Opcional: escreva uma resposta guia para o admin corrigir depois.";
}

function getAnswerRows(answers: unknown) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .map((answer) => {
      if (
        typeof answer !== "object" ||
        answer === null ||
        !("questionId" in answer) ||
        !("value" in answer) ||
        typeof answer.questionId !== "string" ||
        typeof answer.value !== "string"
      ) {
        return null;
      }

      return {
        questionId: answer.questionId,
        value: answer.value,
      };
    })
    .filter((answer): answer is { questionId: string; value: string } =>
      Boolean(answer),
    );
}

function formatAnswer(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.join(", ");
    }

    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed)
        .map(([left, right]) => `${left} -> ${String(right)}`)
        .join("; ");
    }
  } catch {
    return value || "Sem resposta";
  }

  return value || "Sem resposta";
}

function ActivityCreateForm({
  students,
}: {
  students: CandyXpStudentOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    createQuestionDraft(0),
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function updateQuestion(id: string, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  }

  function removeQuestion(id: string) {
    setQuestions((current) =>
      current.length === 1
        ? current
        : current.filter((question) => question.id !== id),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    formData.set(
      "questionsJson",
      JSON.stringify(buildQuestionsPayload(questions)),
    );
    setErrors({});
    setMessage(null);

    startTransition(async () => {
      const result = await createCandyXpActivity(formData);

      setMessage(result.message);
      setErrors((result.errors as Record<string, string>) ?? {});

      if (result.ok) {
        formRef.current?.reset();
        setQuestions([createQuestionDraft(0)]);
        router.refresh();
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="overflow-hidden rounded-lg border border-primary/15 bg-white/95 shadow-[0_18px_45px_rgba(65,42,76,0.08)]"
      noValidate
    >
      <div className="flex flex-col gap-3 border-b border-primary/10 bg-[linear-gradient(135deg,rgba(65,42,76,0.08),rgba(229,124,216,0.08),rgba(252,229,216,0.24))] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(65,42,76,0.18)]">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-primary">
              Nova atividade Candy XP
            </div>
            <p className="text-sm text-muted-foreground">
              Historia, perguntas e XP em um card mais claro.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
          <Coins aria-hidden="true" className="size-3.5" />
          {questions.length} pergunta(s)
        </span>
      </div>

      <div className="p-4">
        <div className="grid gap-3 rounded-lg border border-primary/10 bg-primary/[0.025] p-3 lg:grid-cols-[1fr_0.75fr_0.75fr_0.45fr]">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="candy-xp-title">Titulo</FieldLabel>
            <Input
              id="candy-xp-title"
              name="title"
              disabled={isPending}
              placeholder="Ex: Sweet story - playground"
            />
            <FieldError errors={[{ message: errors.title }]} />
          </Field>
          <Field data-invalid={Boolean(errors.level)}>
            <FieldLabel htmlFor="candy-xp-level">Nivel</FieldLabel>
            <Input
              id="candy-xp-level"
              name="level"
              disabled={isPending}
              placeholder="A1, A2, Kids..."
            />
            <FieldError errors={[{ message: errors.level }]} />
          </Field>
          <Field data-invalid={Boolean(errors.category)}>
            <FieldLabel htmlFor="candy-xp-category">Categoria</FieldLabel>
            <Input
              id="candy-xp-category"
              name="category"
              disabled={isPending}
              placeholder="Stories, vocabulary..."
            />
            <FieldError errors={[{ message: errors.category }]} />
          </Field>
          <Field data-invalid={Boolean(errors.xpReward)}>
            <FieldLabel htmlFor="candy-xp-xp">XP</FieldLabel>
            <Input
              id="candy-xp-xp"
              name="xpReward"
              type="number"
              min={1}
              max={500}
              defaultValue={80}
              disabled={isPending}
            />
            <FieldError errors={[{ message: errors.xpReward }]} />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(320px,1fr)_minmax(280px,0.78fr)_minmax(260px,0.72fr)]">
          <Field
            className="rounded-lg border border-primary/10 bg-white p-3 shadow-sm"
            data-invalid={Boolean(errors.description)}
          >
            <FieldLabel htmlFor="candy-xp-description">
              <BookOpenCheck aria-hidden="true" className="size-4" />
              Descricao
            </FieldLabel>
            <Textarea
              id="candy-xp-description"
              name="description"
              className="min-h-24 resize-y bg-white/95"
              disabled={isPending}
              placeholder="Resumo da missao para o aluno."
            />
            <FieldError errors={[{ message: errors.description }]} />
          </Field>

          <Field
            className="rounded-lg border border-primary/10 bg-white p-3 shadow-sm"
            data-invalid={Boolean(
              errors.releaseMode || errors.studentProfileId,
            )}
          >
            <FieldLabel htmlFor="candy-xp-release">
              <Users aria-hidden="true" className="size-4" />
              Liberacao
            </FieldLabel>
            <NativeSelect
              id="candy-xp-release"
              name="releaseMode"
              disabled={isPending}
            >
              <option value="ALL">Todos os alunos</option>
              <option value="STUDENT">Um aluno especifico</option>
            </NativeSelect>
            <NativeSelect
              className="mt-2"
              name="studentProfileId"
              disabled={isPending || students.length === 0}
            >
              <option value="">Selecione se for individual</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError
              errors={[
                { message: errors.releaseMode },
                { message: errors.studentProfileId },
              ]}
            />
          </Field>

          <div className="grid gap-3 rounded-lg border border-primary/10 bg-white p-3 shadow-sm">
            <Field data-invalid={Boolean(errors.status)}>
              <FieldLabel htmlFor="candy-xp-status">
                <Target aria-hidden="true" className="size-4" />
                Status inicial
              </FieldLabel>
              <NativeSelect
                id="candy-xp-status"
                name="status"
                disabled={isPending}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
              </NativeSelect>
              <FieldError errors={[{ message: errors.status }]} />
            </Field>
            <Field data-invalid={Boolean(errors.asset)}>
              <FieldLabel htmlFor="candy-xp-asset">
                <ImageUp aria-hidden="true" className="size-4" />
                PDF/imagem Canva
              </FieldLabel>
              <Input
                id="candy-xp-asset"
                name="asset"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="bg-white file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                disabled={isPending}
              />
              <FieldError errors={[{ message: errors.asset }]} />
            </Field>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-primary/10 bg-primary/[0.025] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
                <ClipboardList aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Perguntas</p>
                <p className="text-xs text-muted-foreground">
                  {questions.length} card(s) de pergunta
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                setQuestions((current) => [
                  ...current,
                  createQuestionDraft(current.length),
                ])
              }
            >
              <Plus data-icon="inline-start" />
              Pergunta
            </Button>
          </div>

          <div className="grid gap-3">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="grid gap-3 rounded-lg border border-primary/15 bg-white p-3 shadow-sm lg:grid-cols-[minmax(220px,0.42fr)_1fr]"
              >
                <div className="grid gap-3 rounded-lg border border-primary/10 bg-primary/[0.025] p-3">
                  <span className="inline-flex w-fit rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1 text-xs font-semibold text-primary/75">
                    Pergunta {index + 1}
                  </span>
                  <Field>
                    <FieldLabel>Tipo</FieldLabel>
                    <NativeSelect
                      value={question.type}
                      disabled={isPending}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          answerGuide: "",
                          type: event.target.value as QuestionDraft["type"],
                        })
                      }
                    >
                      {Object.entries(questionTypeLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </NativeSelect>
                  </Field>
                  <label className="flex items-center gap-2 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={question.required}
                      disabled={isPending}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          required: event.target.checked,
                        })
                      }
                    />
                    Obrigatoria
                  </label>
                </div>
                <div className="grid gap-3">
                  <Field>
                    <FieldLabel>Enunciado</FieldLabel>
                    <Textarea
                      value={question.prompt}
                      className="min-h-24 resize-y bg-white/95"
                      disabled={isPending}
                      placeholder="Escreva o enunciado que o aluno vai responder."
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          prompt: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Alternativas / resposta guia</FieldLabel>
                    <Textarea
                      value={question.answerGuide}
                      className="min-h-24 resize-y bg-white/95"
                      disabled={isPending}
                      placeholder={getQuestionHelp(question.type)}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          answerGuide: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending || questions.length === 1}
                      onClick={() => removeQuestion(question.id)}
                    >
                      Remover pergunta
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-lg border border-primary/10 bg-background px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <Button type="submit" className="mt-4 h-10" disabled={isPending}>
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <FileUp data-icon="inline-start" />
          )}
          Criar Candy XP
        </Button>
      </div>
    </form>
  );
}

function ActivityEditForm({ activity }: { activity: AdminCandyXpActivityRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: CandyXpActivityUpdateInput = {
      activityId: activity.id,
      category: String(formData.get("category") ?? ""),
      description: String(formData.get("description") ?? ""),
      level: String(formData.get("level") ?? ""),
      status: String(
        formData.get("status") ?? "DRAFT",
      ) as CandyXpActivityUpdateInput["status"],
      title: String(formData.get("title") ?? ""),
      xpReward: String(formData.get("xpReward") ?? ""),
    };

    setMessage(null);
    startTransition(async () => {
      const result = await updateCandyXpActivity(payload);

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg bg-muted/30 p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_0.6fr_0.6fr_0.35fr_0.55fr]">
        <Input
          name="title"
          defaultValue={activity.title}
          disabled={isPending}
        />
        <Input
          name="level"
          defaultValue={activity.level}
          disabled={isPending}
        />
        <Input
          name="category"
          defaultValue={activity.category}
          disabled={isPending}
        />
        <Input
          name="xpReward"
          type="number"
          min={1}
          max={500}
          defaultValue={activity.xpReward}
          disabled={isPending}
        />
        <NativeSelect
          name="status"
          defaultValue={activity.status}
          disabled={isPending}
        >
          <option value="DRAFT">Rascunho</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="ARCHIVED">Arquivado</option>
        </NativeSelect>
      </div>
      <Textarea
        name="description"
        defaultValue={activity.description ?? ""}
        disabled={isPending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <PencilLine data-icon="inline-start" />
          )}
          Salvar ficha
        </Button>
        {message ? (
          <span className="text-sm text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </form>
  );
}

function SubmissionReviewForm({
  submission,
}: {
  submission: AdminCandyXpSubmissionRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [isPending, startTransition] = useTransition();

  function submit(outcome: CandyXpActivityReviewInput["outcome"]) {
    const payload: CandyXpActivityReviewInput = {
      feedback,
      outcome,
      submissionId: submission.id,
    };

    setMessage(null);
    startTransition(async () => {
      const result = await reviewCandyXpActivitySubmission(payload);

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2 rounded-lg border border-primary/10 bg-white p-3 shadow-sm">
      <Textarea
        value={feedback}
        disabled={isPending}
        placeholder="Feedback para o aluno."
        onChange={(event) => setFeedback(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => submit("APPROVE")}
        >
          <Trophy data-icon="inline-start" />
          Aprovar e liberar XP
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => submit("RETURN")}
        >
          <RotateCcw data-icon="inline-start" />
          Devolver
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

function ActivityCard({ activity }: { activity: AdminCandyXpActivityRow }) {
  const answerLabelByQuestion = new Map(
    activity.questions.map((question) => [question.id, question.prompt]),
  );
  const submissionCount = activity.submissions.length;
  const completedCount = activity.submissions.filter(
    (submission) => submission.status === "REVIEWED",
  ).length;

  return (
    <details className="group overflow-hidden rounded-lg border border-primary/15 bg-white/95 shadow-[0_14px_34px_rgba(65,42,76,0.07)]">
      <summary className="flex cursor-pointer list-none flex-col gap-3 bg-[linear-gradient(135deg,rgba(65,42,76,0.05),rgba(252,229,216,0.22))] p-4 transition-colors hover:bg-primary/[0.035] lg:flex-row lg:items-center lg:justify-between [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(65,42,76,0.18)]">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-primary">
              {activity.title}
            </span>
            <span className="mt-1 block text-sm font-medium text-muted-foreground">
              {activity.level} - {activity.category}
            </span>
            <span className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-primary">
                {statusLabels[activity.status]}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                {activity.xpReward} XP
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                {completedCount}/{submissionCount} concluidas
              </span>
              <span className="rounded-full border border-primary/10 bg-white px-3 py-1 text-primary/70">
                {activity.questions.length} pergunta(s)
              </span>
            </span>
          </span>
        </span>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-semibold text-primary transition group-open:bg-primary group-open:text-primary-foreground">
          Abrir
        </span>
      </summary>

      <div className="grid gap-5 border-t border-primary/10 p-4">
        <ActivityEditForm activity={activity} />

        <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="grid gap-3">
            <div className="rounded-lg border border-primary/10 bg-white p-3 text-sm leading-6 text-muted-foreground shadow-sm">
              <strong className="flex items-center gap-2 text-primary">
                <FileText aria-hidden="true" className="size-4" />
                Arquivo
              </strong>
              <span className="mt-1 block break-words">
                {activity.assetFileName ?? "Sem arquivo"}
              </span>
              <div className="mt-3">
                <a
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  href={`/ava/candy-xp-assets/${activity.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText aria-hidden="true" className="size-4" />
                  Abrir PDF
                </a>
              </div>
            </div>
            <div className="rounded-lg border border-primary/10 bg-white p-3 text-sm leading-6 shadow-sm">
              <strong className="flex items-center gap-2 text-primary">
                <Users aria-hidden="true" className="size-4" />
                Liberacao
              </strong>
              {activity.assignments.length === 0
                ? "Todos os alunos publicados"
                : activity.assignments
                    .map((assignment) => assignment.studentName)
                    .join(", ")}
            </div>
            <div className="rounded-lg border border-primary/10 bg-white p-3 shadow-sm">
              <strong className="flex items-center gap-2 text-sm text-primary">
                <ClipboardList aria-hidden="true" className="size-4" />
                Perguntas
              </strong>
              <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
                {activity.questions.map((question, index) => (
                  <li
                    key={question.id}
                    className="rounded-md border border-primary/10 bg-primary/[0.025] p-2"
                  >
                    <span className="font-semibold text-foreground">
                      {index + 1}. {questionTypeLabels[question.type]}
                    </span>
                    <p>{question.prompt}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                Respostas dos alunos
              </p>
              <p className="text-sm text-muted-foreground">
                Objetivas podem fechar sozinhas; escritas ficam aqui para
                correcao.
              </p>
            </div>
            {activity.submissions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-5 text-sm text-primary/75">
                Nenhum progresso de aluno ainda.
              </p>
            ) : (
              activity.submissions.map((submission) => {
                const answerRows = getAnswerRows(submission.answers);

                return (
                  <details
                    key={submission.id}
                    className="overflow-hidden rounded-lg border border-primary/10 bg-white shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                      <span>
                        <strong className="block">
                          {submission.studentName}
                        </strong>
                        <span className="text-sm text-muted-foreground">
                          {submissionStatusLabels[submission.status]}
                          {submission.autoScorePercent !== null
                            ? ` - ${submission.autoScorePercent}% auto`
                            : ""}
                        </span>
                      </span>
                      {submission.awardedXp ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                          <Trophy aria-hidden="true" className="size-3.5" />
                          <span>+{submission.awardedXp} XP</span>
                        </span>
                      ) : null}
                    </summary>
                    <div className="grid gap-3 border-t border-primary/10 p-3">
                      <div className="grid gap-2">
                        {answerRows.map((answer) => (
                          <div
                            key={answer.questionId}
                            className="rounded-md bg-white p-3 text-sm"
                          >
                            <strong className="block text-primary">
                              {answerLabelByQuestion.get(answer.questionId) ??
                                "Pergunta"}
                            </strong>
                            <span className="text-muted-foreground">
                              {formatAnswer(answer.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {submission.feedback ? (
                        <p className="rounded-md bg-secondary/70 p-3 text-sm">
                          <strong>Feedback:</strong> {submission.feedback}
                        </p>
                      ) : null}
                      {submission.status === "SUBMITTED" ? (
                        <SubmissionReviewForm submission={submission} />
                      ) : null}
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

export function AdminCandyXpPanel({
  activities,
  students,
}: AdminCandyXpPanelProps) {
  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [activities],
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-lg border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(252,229,216,0.55))] p-4 text-amber-950 shadow-[0_12px_30px_rgba(120,78,0,0.08)] lg:grid-cols-[auto_1fr]">
        <span className="flex size-11 items-center justify-center rounded-lg bg-amber-400 text-primary shadow-[0_10px_22px_rgba(245,158,11,0.18)]">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Esqueleto do game Candy XP</h2>
          <p className="mt-1 text-sm leading-6">
            Crie uma historia em PDF, cadastre perguntas e publique. Se a missao
            tiver apenas questoes objetivas e o aluno acertar, o XP entra na
            hora. Se tiver escrita, fica pendente para sua correcao.
          </p>
        </div>
      </div>

      <ActivityCreateForm students={students} />

      <div className="rounded-lg border border-primary/15 bg-white/80 p-3 shadow-[0_16px_36px_rgba(65,42,76,0.06)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
              <Trophy aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-primary">
                Atividades Candy XP
              </h2>
              <p className="text-sm text-muted-foreground">
                Fichas, publicacao e respostas
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1 text-xs font-semibold text-primary/70">
            {sortedActivities.length} atividade(s)
          </span>
        </div>

        {sortedActivities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-primary/75">
            Nenhuma atividade Candy XP criada ainda.
          </p>
        ) : (
          <div className="grid gap-4">
            {sortedActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
