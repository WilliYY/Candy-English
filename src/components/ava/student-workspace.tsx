import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  Radio,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  ChatThreadPanel,
  type ChatThreadRow,
} from "@/components/ava/chat-thread-panel";
import {
  AvatarUploadForm,
  ProfileForm,
} from "@/components/ava/profile-forms";
import { LiveClassRoom } from "@/components/ava/live-class-room";
import { InteractiveHomeworkStudent } from "@/components/ava/interactive-homework-student";
import { StudentHomeworkForm } from "@/components/ava/student-homework-form";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/roles";

export const studentTaskIds = [
  "resumo",
  "aula-ao-vivo",
  "aulas",
  "homeworks",
  "mensagens",
  "contratos",
  "perfil",
] as const;

export type StudentTask = (typeof studentTaskIds)[number];

type StudentLesson = {
  description: string | null;
  homeworks: {
    assetFileName: string | null;
    assetMimeType: string | null;
    assetPageCount: number | null;
    dueDate: Date | null;
    fieldDetectionSource: string | null;
    id: string;
    instructions: string | null;
    interactiveFields: {
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
    }[];
    kind: string;
    questions: {
      id: string;
      prompt: string;
    }[];
    submissions: {
      answers: unknown;
      feedback: string | null;
      id: string;
      status: string;
      submittedAt: Date;
    }[];
    title: string;
  }[];
  id: string;
  materials: {
    content: string | null;
    id: string;
    title: string;
    type: string;
    url: string | null;
  }[];
  scheduledAt: Date | null;
  teacherProfile: {
    user: {
      name: string;
    };
  };
  title: string;
  vocabularyItems: {
    example: string | null;
    id: string;
    term: string;
    translation: string;
  }[];
};
type StudentHomework = StudentLesson["homeworks"][number];

type StudentWorkspaceProps = {
  activeTask: StudentTask;
  chatThreads: ChatThreadRow[];
  contracts: {
    createdAt: Date;
    id: string;
    sizeBytes: number;
    title: string;
  }[];
  currentUser: {
    address?: string | null;
    avatarPath?: string | null;
    email: string;
    id: string;
    name?: string | null;
    phone?: string | null;
    role: Role;
  };
  lessons: StudentLesson[];
  liveSessions: {
    id: string;
    isLive: boolean;
    meetUrl: string;
    startsAt: Date | null;
    teacherName: string;
    title: string;
  }[];
  studentProfileId: string;
  studentProfile: {
    birthDate?: Date | null;
    gender?: string | null;
    guardianDocument?: string | null;
    level?: string | null;
    motherName?: string | null;
    motherPhone?: string | null;
    notes?: string | null;
    studentPhone?: string | null;
    studentPhoneAlt?: string | null;
  };
  teachers: {
    id: string;
    label: string;
  }[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const taskMeta = {
  "aula-ao-vivo": {
    description: "Entre na sala ao vivo quando a teacher abrir a aula.",
    icon: Radio,
    title: "Aula ao vivo",
  },
  aulas: {
    description: "Veja materiais, links e vocabulario das suas aulas.",
    icon: BookOpen,
    title: "Aulas e Materiais",
  },
  contratos: {
    description: "Abra contratos PDF liberados para seu perfil.",
    icon: FileText,
    title: "Meus contratos",
  },
  homeworks: {
    description: "Responda atividades online e acompanhe feedbacks.",
    icon: ClipboardCheck,
    title: "Homeworks",
  },
  mensagens: {
    description: "Espaco de conversa com a teacher dentro do AVA.",
    icon: MessageSquareText,
    title: "Mensagens",
  },
  perfil: {
    description: "Atualize seus dados e sua foto de perfil.",
    icon: UserRound,
    title: "Meu perfil",
  },
  resumo: {
    description: "Resumo rapido do que esta disponivel no seu AVA.",
    icon: BookOpen,
    title: "Resumo student",
  },
} satisfies Record<
  StudentTask,
  {
    description: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
  }
>;

export function normalizeStudentTask(value: unknown): StudentTask {
  return typeof value === "string" &&
    studentTaskIds.includes(value as StudentTask)
    ? (value as StudentTask)
    : "resumo";
}

function getAnswerText(answers: unknown) {
  if (!Array.isArray(answers)) {
    return "";
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

  return "";
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function formatDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function canPreviewUrl(url?: string | null) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isInteractiveLessonHomework(homework: StudentHomework) {
  return (
    homework.kind === "INTERACTIVE" &&
    homework.fieldDetectionSource === "lesson-manual"
  );
}

function isInternalHomeworkLesson(lesson: StudentLesson) {
  return (
    lesson.title.startsWith("Homework - ") &&
    lesson.materials.length === 0 &&
    lesson.vocabularyItems.length === 0 &&
    lesson.homeworks.length > 0 &&
    lesson.homeworks.every((homework) => !isInteractiveLessonHomework(homework))
  );
}

export function StudentWorkspace({
  activeTask,
  chatThreads,
  contracts,
  currentUser,
  lessons,
  liveSessions,
  studentProfileId,
  studentProfile,
  teachers,
}: StudentWorkspaceProps) {
  const visibleLessons = lessons.filter(
    (lesson) => !isInternalHomeworkLesson(lesson),
  );
  const homeworkItems = lessons.flatMap((lesson) =>
    lesson.homeworks
      .filter((homework) => !isInteractiveLessonHomework(homework))
      .map((homework) => ({ homework, lesson })),
  );
  const homeworkCount = homeworkItems.length;
  const reviewedCount = lessons.reduce(
    (total, lesson) =>
      total +
      lesson.homeworks.filter(
        (homework) => homework.submissions[0]?.status === "REVIEWED",
      ).length,
    0,
  );
  const task = taskMeta[activeTask];
  const TaskIcon = task.icon;
  const stats = [
    { icon: BookOpen, label: "Aulas", value: visibleLessons.length },
    { icon: ClipboardCheck, label: "Homeworks", value: homeworkCount },
    { icon: MessageSquareText, label: "Feedbacks", value: reviewedCount },
  ];

  return (
    <section className="relative isolate mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 text-white lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/90 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
            <BookOpen aria-hidden="true" />
            Area student
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-white drop-shadow md:text-5xl">
              Seu AVA Candy
            </h1>
          </div>
        </div>

        <UserSummaryPanel
          avatarPath={currentUser.avatarPath}
          email={currentUser.email}
          name={currentUser.name}
          role={currentUser.role}
          userId={currentUser.id}
        />
      </div>

      <Card className="overflow-hidden border-white/20 bg-white/92 text-foreground shadow-2xl shadow-primary/20 backdrop-blur">
        <CardHeader className="ava-task-header border-b bg-white/78 px-7 py-5">
          <div className="relative flex min-h-12 items-center justify-center text-center">
            <span className="absolute left-0 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <TaskIcon aria-hidden="true" />
            </span>
            <CardTitle className="px-14 text-center text-xl">
              {task.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          {activeTask === "resumo" ? (
            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-background p-5"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                    <strong className="text-3xl font-semibold">
                      {stat.value}
                    </strong>
                  </div>
                  <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <stat.icon aria-hidden="true" />
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {activeTask === "aula-ao-vivo" ? (
            liveSessions.some((session) => session.isLive) ? (
              <div className="mx-auto grid w-full max-w-6xl gap-5">
                {liveSessions
                  .filter((session) => session.isLive)
                  .map((session) => (
                    <article
                      key={session.id}
                      className="overflow-hidden rounded-2xl border border-primary/10 bg-white/90 text-foreground shadow-sm backdrop-blur"
                    >
                      <div className="flex flex-col gap-2 border-b border-primary/10 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 flex-col gap-2">
                          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            <Radio aria-hidden="true" />
                            Ao vivo agora
                          </span>
                          <div>
                            <strong className="block truncate">
                              {session.title}
                            </strong>
                            <span className="text-sm text-muted-foreground">
                              Teacher: {session.teacherName}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays aria-hidden="true" className="size-4" />
                          {session.startsAt
                            ? dateFormatter.format(session.startsAt)
                            : "Aberta agora"}
                        </span>
                      </div>
                      <div className="bg-primary/[0.03] p-4 md:p-6">
                        <LiveClassRoom
                          className="max-w-5xl"
                          displayName={currentUser.name ?? currentUser.email}
                          meetingUrl={session.meetUrl}
                          title={session.title}
                        />
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <EmptyState>
                Nenhuma aula ao vivo aberta para seu usuario neste momento.
              </EmptyState>
            )
          ) : null}

          {activeTask === "perfil" ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-primary/10 bg-secondary/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Nivel definido pela teacher
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {studentProfile.level ?? "Ainda nao definido"}
                  </p>
                </div>
                <ProfileForm
                  defaultValues={{
                    address: currentUser.address ?? "",
                    birthDate: formatDateInput(studentProfile.birthDate),
                    gender: studentProfile.gender ?? "",
                    guardianDocument: studentProfile.guardianDocument ?? "",
                    motherName: studentProfile.motherName ?? "",
                    motherPhone: studentProfile.motherPhone ?? "",
                    name: currentUser.name ?? "",
                    notes: studentProfile.notes ?? "",
                    phone: currentUser.phone ?? "",
                    studentPhone: studentProfile.studentPhone ?? "",
                    studentPhoneAlt: studentProfile.studentPhoneAlt ?? "",
                  }}
                  showStudentFields
                />
              </div>
              <AvatarUploadForm
                avatarPath={currentUser.avatarPath}
                userId={currentUser.id}
              />
            </div>
          ) : null}

          {activeTask === "contratos" ? (
            contracts.length === 0 ? (
              <EmptyState>
                Contrato ainda nao adicionado.
              </EmptyState>
            ) : (
              <div className="grid gap-3">
                {contracts.map((contract, index) => (
                  <details
                    key={contract.id}
                    className="group overflow-hidden rounded-lg border bg-white"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-3">
                        <FileText aria-hidden="true" />
                        <span className="truncate font-semibold">
                          {contract.title}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {Math.ceil(contract.sizeBytes / 1024)} KB
                      </span>
                    </summary>
                    <div className="border-t bg-muted/20 p-3">
                      <iframe
                        src={`/ava/contracts/${contract.id}`}
                        title={`Visualizacao do contrato ${contract.title}`}
                        className="h-[540px] w-full rounded-md border bg-white"
                      />
                      <Link
                        href={`/ava/contracts/${contract.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        Abrir em nova aba
                      </Link>
                    </div>
                  </details>
                ))}
              </div>
            )
          ) : null}

          {activeTask === "mensagens" ? (
            <ChatThreadPanel
              defaultStudentProfileId={studentProfileId}
              mode="student"
              students={[
                {
                  id: studentProfileId,
                  label: currentUser.name ?? currentUser.email,
                },
              ]}
              teachers={teachers}
              threads={chatThreads}
            />
          ) : null}

          {activeTask === "aulas" ? (
            visibleLessons.length === 0 ? (
              <EmptyState>Nenhuma aula foi vinculada ao seu perfil ainda.</EmptyState>
            ) : (
              <div className="mx-auto grid w-full max-w-5xl gap-3">
                {visibleLessons.map((lesson) => {
                  const lessonActivities = lesson.homeworks.filter(
                    isInteractiveLessonHomework,
                  );
                  const completedLessonActivities = lessonActivities.filter(
                    (homework) => {
                      const status = homework.submissions[0]?.status;

                      return status === "SUBMITTED" || status === "REVIEWED";
                    },
                  );
                  const hasLessonActivities = lessonActivities.length > 0;
                  const isLessonComplete =
                    hasLessonActivities &&
                    completedLessonActivities.length === lessonActivities.length;
                  const lessonStatusLabel = hasLessonActivities
                    ? isLessonComplete
                      ? "Concluido"
                      : "Nao concluido"
                    : "Sem aula";
                  const lessonStatusClass = hasLessonActivities
                    ? isLessonComplete
                      ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
                      : "border-red-500/40 bg-red-50 text-red-900"
                    : "border-primary/15 bg-muted/50 text-muted-foreground";
                  const lessonStatusDotClass = hasLessonActivities
                    ? isLessonComplete
                      ? "bg-emerald-500"
                      : "bg-red-600"
                    : "bg-muted-foreground/60";

                  return (
                    <details
                      key={lesson.id}
                      className="group overflow-hidden rounded-xl border border-primary/15 bg-white/95 shadow-sm transition hover:border-primary/25 hover:shadow-md"
                    >
                      <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-start gap-3 sm:items-center">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-base font-semibold">
                              {lesson.title}
                            </span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">
                              {lesson.description ?? "Sem resumo cadastrado."}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Teacher: {lesson.teacherProfile.user.name}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {lesson.scheduledAt
                                  ? dateFormatter.format(lesson.scheduledAt)
                                  : "Sem data"}
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${lessonStatusClass}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`size-2.5 rounded-full ${lessonStatusDotClass}`}
                            />
                            {lessonStatusLabel}
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className="size-4 text-muted-foreground transition group-open:rotate-180"
                          />
                        </span>
                      </summary>

                      <div className="flex flex-col gap-5 border-t border-primary/10 px-5 pb-5 pt-4 md:px-6 md:pb-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-lg bg-muted/50 p-4">
                            <strong className="text-sm">Materiais</strong>
                            <ul className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
                              {lesson.materials.length === 0 ? (
                                <li>Nenhum material cadastrado.</li>
                              ) : (
                                lesson.materials.map((material) => (
                                  <li key={material.id} className="leading-6">
                                    <span className="font-medium text-foreground">
                                      {material.title}
                                    </span>
                                    {material.content ? (
                                      <p>{material.content}</p>
                                    ) : null}
                                    {material.url ? (
                                      <div className="mt-3 flex flex-col gap-2">
                                        {canPreviewUrl(material.url) ? (
                                          <iframe
                                            src={material.url}
                                            title={`Previa do material ${material.title}`}
                                            sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                                            referrerPolicy="no-referrer"
                                            className="h-64 w-full rounded-md border bg-white"
                                          />
                                        ) : null}
                                        <a
                                          className="font-medium text-primary underline"
                                          href={material.url}
                                          rel="noreferrer"
                                          target="_blank"
                                        >
                                          Abrir material em nova aba
                                        </a>
                                      </div>
                                    ) : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-4">
                            <strong className="text-sm">Vocabulario</strong>
                            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                              {lesson.vocabularyItems.length === 0 ? (
                                <li>Nenhum vocabulario cadastrado.</li>
                              ) : (
                                lesson.vocabularyItems.map((item) => (
                                  <li key={item.id} className="leading-6">
                                    <span className="font-medium text-foreground">
                                      {item.term}
                                    </span>{" "}
                                    - {item.translation}
                                    {item.example ? <p>{item.example}</p> : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </div>
                        {lessonActivities.length > 0 ? (
                          <div className="mx-auto flex w-full flex-col gap-4 rounded-xl border border-primary/15 bg-white p-4 shadow-sm md:p-5">
                            <strong className="text-sm">Aulas</strong>
                            {lessonActivities.map((homework) => (
                              <InteractiveHomeworkStudent
                                key={homework.id}
                                context="lesson"
                                homework={{
                                  assetFileName: homework.assetFileName,
                                  assetMimeType: homework.assetMimeType,
                                  assetPageCount: homework.assetPageCount,
                                  dueDate: homework.dueDate,
                                  fields: homework.interactiveFields,
                                  id: homework.id,
                                  instructions: homework.instructions,
                                  submission: homework.submissions[0],
                                  title: homework.title,
                                }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  );
                })}
              </div>
            )
          ) : null}

          {activeTask === "homeworks" ? (
            homeworkCount === 0 ? (
              <EmptyState>Nenhuma homework disponivel no momento.</EmptyState>
            ) : (
              <div className="grid gap-3">
                {homeworkItems.map(({ homework }) => {
                    const submission = homework.submissions[0];

                    if (homework.kind === "INTERACTIVE") {
                      return (
                        <InteractiveHomeworkStudent
                          key={homework.id}
                          homework={{
                            assetFileName: homework.assetFileName,
                            assetMimeType: homework.assetMimeType,
                            assetPageCount: homework.assetPageCount,
                            dueDate: homework.dueDate,
                            fields: homework.interactiveFields,
                            id: homework.id,
                            instructions: homework.instructions,
                            submission,
                            title: homework.title,
                          }}
                        />
                      );
                    }

                    return (
                      <details
                        key={homework.id}
                        className="group rounded-lg border-2 border-primary/20 bg-white shadow-sm"
                      >
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
                                Homework simples
                              </span>
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                            <CheckCircle2 aria-hidden="true" />
                            {submission?.status === "REVIEWED"
                              ? "Corrigida"
                              : submission
                                ? "Enviada"
                                : "Pendente"}
                          </span>
                        </summary>
                        <div className="flex flex-col gap-4 border-t border-primary/15 p-4">
                          <div>
                            <h3 className="font-semibold">{homework.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {homework.instructions ??
                                "Sem instrucoes adicionais."}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 text-sm leading-6">
                            <strong>Pergunta:</strong>{" "}
                            {homework.questions[0]?.prompt ?? "Resposta livre"}
                          </div>
                          <StudentHomeworkForm
                            homeworkId={homework.id}
                            initialAnswer={getAnswerText(submission?.answers)}
                            isReviewed={submission?.status === "REVIEWED"}
                          />
                          {submission?.feedback ? (
                            <div className="rounded-lg bg-secondary p-3 text-sm leading-6">
                              <strong>Feedback:</strong> {submission.feedback}
                            </div>
                          ) : null}
                        </div>
                      </details>
                    );
                  })}
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
