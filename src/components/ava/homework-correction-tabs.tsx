"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Inbox,
  MessageSquareText,
  RotateCcw,
  UserRound,
} from "lucide-react";
import {
  InteractiveHomeworkReview,
  type ReviewInteractiveField,
} from "@/components/ava/interactive-homework-review";
import {
  AllowHomeworkRedoButton,
  ReviewSubmissionForm,
} from "@/components/ava/teacher-forms";
import { cn } from "@/lib/utils";

export type HomeworkCorrectionSubmission = {
  answers: unknown;
  feedback: string | null;
  homework: {
    assetFileName: string | null;
    assetMimeType: string | null;
    assetPageCount: number | null;
    id: string;
    interactiveFields: ReviewInteractiveField[];
    kind: string;
    lesson: {
      title: string;
    };
    questions: {
      prompt: string;
    }[];
    teacherProfile: {
      user: {
        email: string;
        name: string;
      };
    };
    title: string;
  };
  id: string;
  reviewedAt: string | null;
  status: string;
  studentProfile: {
    user: {
      email: string;
      name: string;
    };
  };
  submittedAt: string;
};

type ReviewTab = "pending" | "reviewed";

type HomeworkCorrectionTabsProps = {
  isAdmin: boolean;
  submissions: HomeworkCorrectionSubmission[];
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return dateTimeFormatter.format(new Date(value));
}

function getAnswerText(answers: unknown) {
  if (!Array.isArray(answers)) {
    return "Resposta registrada.";
  }

  const first = answers[0];

  if (
    typeof first === "object" &&
    first !== null &&
    "answer" in first &&
    typeof first.answer === "string"
  ) {
    return first.answer;
  }

  return "Resposta registrada.";
}

function getStatusMeta(status: string) {
  if (status === "REVIEWED") {
    return {
      Icon: CheckCircle2,
      cardClassName:
        "border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/62 to-white shadow-[0_16px_34px_rgba(4,120,87,0.08)] before:bg-emerald-400",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Corrigida",
      reviewLabel: "Feedback enviado",
    };
  }

  if (status === "RETURNED") {
    return {
      Icon: RotateCcw,
      cardClassName:
        "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/65 to-white shadow-[0_16px_34px_rgba(180,83,9,0.08)] before:bg-amber-400",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Liberada para refazer",
      reviewLabel: "Aluno refazendo",
    };
  }

  return {
    Icon: ClipboardCheck,
    cardClassName:
      "border-primary/18 bg-gradient-to-br from-white via-primary/[0.035] to-secondary/40 shadow-[0_16px_34px_rgba(65,42,76,0.08)] before:bg-primary",
    className: "border-primary/20 bg-primary/10 text-primary",
    label: "Aguardando correcao",
    reviewLabel: "Precisa avaliar",
  };
}

function EmptyQueue({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-6 text-center text-sm text-primary/75">
      <span className="flex size-11 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary shadow-sm">
        <Inbox aria-hidden="true" className="size-5" />
      </span>
      <span>{children}</span>
    </div>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return initials || "A";
}

function getFileName(submission: HomeworkCorrectionSubmission) {
  return submission.homework.assetFileName ?? "sem arquivo";
}

function ReviewLegacyAnswer({
  answers,
  question,
}: {
  answers: unknown;
  question: string;
}) {
  return (
    <div className="rounded-lg border border-primary/15 bg-white p-4">
      <p className="text-sm font-semibold text-primary">Resposta enviada</p>
      <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm leading-6">
        <strong>Pergunta:</strong> {question}
      </div>
      <div className="mt-3 rounded-md bg-background p-3 text-sm leading-6">
        <strong>Resposta:</strong>{" "}
        <span className="text-muted-foreground">{getAnswerText(answers)}</span>
      </div>
    </div>
  );
}

function ReviewSubmissionCard({
  isAdmin,
  submission,
}: {
  isAdmin: boolean;
  submission: HomeworkCorrectionSubmission;
}) {
  const statusMeta = getStatusMeta(submission.status);
  const StatusIcon = statusMeta.Icon;
  const isInteractive = submission.homework.kind === "INTERACTIVE";
  const teacherName = submission.homework.teacherProfile.user.name;
  const teacherEmail = submission.homework.teacherProfile.user.email;
  const studentName = submission.studentProfile.user.name;
  const studentEmail = submission.studentProfile.user.email;
  const fileName = getFileName(submission);

  return (
    <details
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-white before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        statusMeta.cardClassName,
      )}
    >
      <summary className="cursor-pointer list-none px-4 py-4 transition hover:bg-white/76 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.95fr)_minmax(240px,0.9fr)_minmax(310px,0.85fr)] xl:items-start">
          <div className="flex min-w-0 gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-sm font-bold text-primary shadow-sm">
              {getInitials(studentName)}
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                  statusMeta.className,
                )}
              >
                <StatusIcon aria-hidden="true" className="size-3.5" />
                {statusMeta.label}
              </div>
              <h2 className="mt-2 truncate text-lg font-semibold text-primary">
                {studentName}
              </h2>
              <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <UserRound aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{studentEmail}</span>
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-primary/10 bg-white/76 p-3 shadow-sm">
            <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/60">
              <BookOpen aria-hidden="true" className="size-3.5" />
              Homework
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-primary">
              {submission.homework.title}
            </h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              Aula: {submission.homework.lesson.title}
            </p>
            <p className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <GraduationCap aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">
                {isAdmin ? "Professor responsavel" : "Professor"}: {teacherName}{" "}
                - {teacherEmail}
              </span>
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-lg border border-primary/10 bg-white/76 p-3 shadow-sm">
              <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/60">
                <CalendarClock aria-hidden="true" className="size-3.5" />
                Enviada
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {formatDateTime(submission.submittedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-primary/10 bg-white/76 p-3 shadow-sm">
              <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/60">
                <FileText aria-hidden="true" className="size-3.5" />
                Arquivo
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-primary">
                {fileName}
              </p>
            </div>
            {submission.reviewedAt ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/85 p-3 text-emerald-900 shadow-sm sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.12em]">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  Corrigida em
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDateTime(submission.reviewedAt)}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-primary/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
                statusMeta.className,
              )}
            >
              <MessageSquareText aria-hidden="true" className="size-3.5" />
              {statusMeta.reviewLabel}
            </span>
            {submission.feedback ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/10 bg-white/80 px-3 py-1 text-primary">
                Feedback salvo
              </span>
            ) : null}
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1 text-xs font-semibold text-primary transition group-open:bg-primary group-open:text-primary-foreground">
            <span className="group-open:hidden">Abrir correcao</span>
            <span className="hidden group-open:inline">Fechar correcao</span>
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 transition group-open:rotate-180"
            />
          </span>
        </div>
      </summary>

      <div className="grid min-h-[520px] border-t border-primary/10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 bg-muted/10 p-3 sm:p-4">
          {isInteractive ? (
            <InteractiveHomeworkReview
              answers={submission.answers}
              assetMimeType={submission.homework.assetMimeType}
              assetPageCount={submission.homework.assetPageCount}
              className="border-primary/10"
              fields={submission.homework.interactiveFields}
              homeworkId={submission.homework.id}
              pageClassName="max-w-[980px]"
              title={submission.homework.title}
            />
          ) : (
            <ReviewLegacyAnswer
              answers={submission.answers}
              question={
                submission.homework.questions[0]?.prompt ?? "Resposta livre"
              }
            />
          )}
        </section>

        <aside className="border-t border-primary/10 bg-white p-4 xl:border-l xl:border-t-0">
          <div className="flex h-full flex-col gap-4">
            <div className="rounded-lg border border-primary/12 bg-gradient-to-br from-primary/[0.055] via-white to-secondary/55 p-4 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                  {getInitials(studentName)}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/60">
                    Aluno em correcao
                  </p>
                  <h3 className="mt-1 truncate text-base font-semibold text-primary">
                    {studentName}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {studentEmail}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">
                Nota/feedback para o aluno
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                O texto enviado aqui aparece para o aluno na tela de homework.
              </p>
            </div>

            <dl className="grid gap-2 text-sm">
              <div className="rounded-lg border border-primary/10 bg-muted/20 p-3">
                <dt className="flex items-center gap-2 font-semibold text-primary">
                  <GraduationCap aria-hidden="true" className="size-4" />
                  Professor
                </dt>
                <dd className="mt-1 text-muted-foreground">{teacherName}</dd>
              </div>
              <div className="rounded-lg border border-primary/10 bg-muted/20 p-3">
                <dt className="flex items-center gap-2 font-semibold text-primary">
                  <BookOpen aria-hidden="true" className="size-4" />
                  Aula
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {submission.homework.lesson.title}
                </dd>
              </div>
              <div className="rounded-lg border border-primary/10 bg-muted/20 p-3">
                <dt className="flex items-center gap-2 font-semibold text-primary">
                  <FileText aria-hidden="true" className="size-4" />
                  Arquivo
                </dt>
                <dd className="mt-1 break-words text-muted-foreground">
                  {fileName}
                </dd>
              </div>
              <div className="rounded-lg border border-primary/10 bg-muted/20 p-3">
                <dt className="font-semibold text-primary">
                  {submission.reviewedAt ? "Corrigida em" : "Enviada em"}
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {formatDateTime(
                    submission.reviewedAt ?? submission.submittedAt,
                  )}
                </dd>
              </div>
            </dl>

            {submission.status === "RETURNED" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Esta entrega foi liberada para o aluno refazer.
              </div>
            ) : (
              <ReviewSubmissionForm
                defaultFeedback={submission.feedback ?? ""}
                submissionId={submission.id}
              />
            )}

            {submission.feedback ? (
              <div className="rounded-lg border border-primary/10 bg-secondary/70 p-3 text-sm leading-6">
                <strong>Ultima nota enviada:</strong> {submission.feedback}
              </div>
            ) : null}

            {submission.status !== "DRAFT" &&
            submission.status !== "RETURNED" ? (
              <AllowHomeworkRedoButton submissionId={submission.id} />
            ) : null}

            <div className="mt-auto border-t border-primary/10 pt-3 text-xs text-muted-foreground">
              Arquivo protegido pelo AVA.
            </div>
          </div>
        </aside>
      </div>
    </details>
  );
}

export function HomeworkCorrectionTabs({
  isAdmin,
  submissions,
}: HomeworkCorrectionTabsProps) {
  const grouped = useMemo(
    () => ({
      pending: submissions.filter(
        (submission) => submission.status === "SUBMITTED",
      ),
      reviewed: submissions.filter((submission) =>
        ["REVIEWED", "RETURNED"].includes(submission.status),
      ),
    }),
    [submissions],
  );
  const [activeTab, setActiveTab] = useState<ReviewTab>(() =>
    grouped.pending.length > 0 ? "pending" : "reviewed",
  );
  useEffect(() => {
    if (
      activeTab === "pending" &&
      grouped.pending.length === 0 &&
      grouped.reviewed.length > 0
    ) {
      setActiveTab("reviewed");
    }
  }, [activeTab, grouped.pending.length, grouped.reviewed.length]);

  const currentList = grouped[activeTab];
  const reviewedCount = grouped.reviewed.filter(
    (submission) => submission.status === "REVIEWED",
  ).length;
  const returnedCount = grouped.reviewed.filter(
    (submission) => submission.status === "RETURNED",
  ).length;
  const queueStats = [
    {
      Icon: ClipboardCheck,
      className: "border-primary/20 bg-primary/10 text-primary",
      label: "Aguardando",
      value: grouped.pending.length,
    },
    {
      Icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      label: "Corrigidos",
      value: reviewedCount,
    },
    {
      Icon: RotateCcw,
      className: "border-amber-200 bg-amber-50 text-amber-800",
      label: "Devolvidos",
      value: returnedCount,
    },
  ];
  const tabs: {
    id: ReviewTab;
    label: string;
    summary: string;
  }[] = [
    {
      id: "pending",
      label: "Aguardando correcao",
      summary: `${grouped.pending.length} entrega(s) para avaliar`,
    },
    {
      id: "reviewed",
      label: "Corrigidos",
      summary: `${grouped.reviewed.length} entrega(s) corrigida(s) ou devolvida(s)`,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-white via-primary/[0.035] to-secondary/50 p-4 shadow-[0_14px_34px_rgba(65,42,76,0.07)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/78 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary">
              <ClipboardCheck aria-hidden="true" className="size-3.5" />
              Fila de correcao
            </p>
            <h2 className="mt-3 text-xl font-semibold text-primary">
              Revise por aluno, status e arquivo
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Abra a entrega no arquivo, confira o aluno em destaque e avalie
              pelo painel lateral.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {queueStats.map(({ Icon, className, label, value }) => (
              <div
                key={label}
                className={cn("rounded-lg border p-3 shadow-sm", className)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                    {label}
                  </span>
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <strong className="mt-2 block text-2xl leading-none">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-primary/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-semibold text-primary">
            {tabs.find((tab) => tab.id === activeTab)?.summary}
          </p>
          <div
            aria-label="Filtrar entregas de homework"
            className="flex flex-wrap gap-2"
            role="tablist"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const activeClassName =
                tab.id === "pending"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/15"
                  : "bg-emerald-600 text-white shadow-sm shadow-emerald-900/15";
              const count =
                tab.id === "pending"
                  ? grouped.pending.length
                  : grouped.reviewed.length;

              return (
                <button
                  key={tab.id}
                  aria-selected={isActive}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? activeClassName
                      : tab.id === "pending"
                        ? "border-primary/15 bg-white text-primary hover:border-primary/30"
                        : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300",
                  )}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  <span
                    className={cn(
                      "ml-2 rounded-full px-2 py-0.5 text-xs",
                      isActive ? "bg-white/22 text-white" : "bg-primary/8",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-semibold",
            activeTab === "pending"
              ? "border-primary/15 bg-primary/[0.045] text-primary"
              : "border-emerald-200 bg-emerald-50 text-emerald-900",
          )}
        >
          {activeTab === "pending"
            ? "Entregas pendentes aparecem primeiro para acelerar a rotina de correcao."
            : "Corrigidos e devolvidos ficam juntos, com data de correcao e feedback mais visiveis."}
        </div>
      </div>

      {currentList.length === 0 ? (
        <EmptyQueue>
          {activeTab === "pending"
            ? "Nenhuma entrega aguardando correcao."
            : "Nenhuma entrega corrigida ou devolvida ainda."}
        </EmptyQueue>
      ) : (
        <div className="flex flex-col gap-5">
          {currentList.map((submission) => (
            <ReviewSubmissionCard
              key={submission.id}
              isAdmin={isAdmin}
              submission={submission}
            />
          ))}
        </div>
      )}
    </div>
  );
}
