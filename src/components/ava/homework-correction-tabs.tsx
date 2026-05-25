"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  RotateCcw,
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
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Corrigida",
    };
  }

  if (status === "RETURNED") {
    return {
      Icon: RotateCcw,
      className: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Liberada para refazer",
    };
  }

  return {
    Icon: ClipboardCheck,
    className: "border-primary/20 bg-primary/10 text-primary",
    label: "Aguardando correcao",
  };
}

function EmptyQueue({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-primary/75">
      {children}
    </div>
  );
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

  return (
    <details className="group overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none flex-col gap-4 px-4 py-4 hover:bg-primary/5 lg:flex-row lg:items-start lg:justify-between [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                statusMeta.className,
              )}
            >
              <StatusIcon aria-hidden="true" className="size-3.5" />
              {statusMeta.label}
            </div>
            <h2 className="truncate text-base font-semibold text-primary">
              {submission.homework.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aluno: {submission.studentProfile.user.name} -{" "}
              {submission.studentProfile.user.email}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Professor: {teacherName} - {teacherEmail}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 text-sm text-muted-foreground lg:min-w-[360px]">
          <div className="grid gap-2 sm:grid-cols-2">
            <span>Enviada: {formatDateTime(submission.submittedAt)}</span>
            <span className="truncate">
              Arquivo: {submission.homework.assetFileName ?? "sem arquivo"}
            </span>
            {submission.reviewedAt ? (
              <span>Corrigida: {formatDateTime(submission.reviewedAt)}</span>
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
            <div>
              <p className="text-sm font-semibold text-primary">
                Nota/feedback para o aluno
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                O texto enviado aqui aparece para o aluno na tela de homework.
              </p>
            </div>

            <dl className="grid gap-3 rounded-lg bg-muted/25 p-3 text-sm">
              <div>
                <dt className="font-semibold text-primary">Aluno</dt>
                <dd className="text-muted-foreground">
                  {submission.studentProfile.user.name}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-primary">
                  {isAdmin ? "Professor responsavel" : "Professor"}
                </dt>
                <dd className="text-muted-foreground">{teacherName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-primary">Aula</dt>
                <dd className="text-muted-foreground">
                  {submission.homework.lesson.title}
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            Fila de correcao
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abra a entrega no arquivo e avalie pelo painel lateral.
          </p>
        </div>
        <div
          aria-label="Filtrar entregas de homework"
          className="flex flex-wrap gap-2"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              aria-selected={activeTab === tab.id}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-primary/15 bg-white text-muted-foreground hover:text-primary",
              )}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {tab.id === "pending"
                  ? grouped.pending.length
                  : grouped.reviewed.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {tabs.find((tab) => tab.id === activeTab)?.summary}
      </p>

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
