import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
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
import { ContractUploadForm } from "@/components/ava/contract-upload-form";
import {
  LiveSessionForm,
  ToggleLiveSessionButton,
} from "@/components/ava/live-session-forms";
import { LiveClassRoom } from "@/components/ava/live-class-room";
import {
  AvatarUploadForm,
  ProfileForm,
} from "@/components/ava/profile-forms";
import {
  AllowHomeworkRedoButton,
  CreateHomeworkForm,
  CreateLessonForm,
  ReviewSubmissionForm,
} from "@/components/ava/teacher-forms";
import { StudentLevelForm } from "@/components/ava/student-level-form";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/roles";

export const teacherTaskIds = [
  "resumo",
  "aula-ao-vivo",
  "criar-aula",
  "criar-homework",
  "aulas",
  "mensagens",
  "corrigir-respostas",
  "contratos",
  "perfil",
] as const;

export type TeacherTask = (typeof teacherTaskIds)[number];

type Option = {
  id: string;
  label: string;
  level?: string | null;
};

type TeacherLesson = {
  createdAt: Date;
  description: string | null;
  homeworks: {
    assetFileName: string | null;
    assetMimeType: string | null;
    assetSizeBytes: number | null;
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
      type: "SHORT_TEXT" | "LONG_TEXT" | "CHECKBOX";
      width: number;
      x: number;
      y: number;
    }[];
    kind: string;
    submissions: {
      id: string;
      status: string;
    }[];
    title: string;
  }[];
  id: string;
  materials: {
    id: string;
    title: string;
    type: string;
  }[];
  scheduledAt: Date | null;
  studentProfile: {
    user: {
      name: string;
    };
  } | null;
  teacherProfile: {
    user: {
      name: string;
    };
  };
  title: string;
  vocabularyItems: {
    id: string;
    term: string;
    translation: string;
  }[];
};

type TeacherSubmission = {
  answers: unknown;
  feedback: string | null;
  homework: {
    assetFileName: string | null;
    assetMimeType: string | null;
    id: string;
    interactiveFields: {
      id: string;
      label: string | null;
      sortOrder: number;
      type: string;
    }[];
    kind: string;
    lesson: {
      title: string;
    };
    questions: {
      prompt: string;
    }[];
    title: string;
  };
  id: string;
  status: string;
  studentProfile: {
    user: {
      email: string;
      name: string;
    };
  };
  submittedAt: Date;
};

type LiveSessionRow = {
  id: string;
  isLive: boolean;
  meetUrl: string;
  startsAt: Date | null;
  studentName: string | null;
  teacherName: string;
  title: string;
};

type ContractRow = {
  createdAt: Date;
  id: string;
  sizeBytes: number;
  studentName: string | null;
  title: string;
};

type TeacherWorkspaceProps = {
  activeTask: TeacherTask;
  chatThreads: ChatThreadRow[];
  currentUser: {
    address?: string | null;
    avatarPath?: string | null;
    email: string;
    id: string;
    name?: string | null;
    phone?: string | null;
    role: Role;
  };
  contracts: ContractRow[];
  lessons: TeacherLesson[];
  liveSessions: LiveSessionRow[];
  students: Option[];
  submissions: TeacherSubmission[];
  teachers: Option[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const taskMeta = {
  "aula-ao-vivo": {
    description: "Abra ou encerre salas ao vivo para alunos.",
    icon: Radio,
    title: "Aula ao vivo",
  },
  aulas: {
    description: "Leia rapidamente as aulas, materiais e vocabularios criados.",
    icon: BookOpen,
    title: "Aulas cadastradas",
  },
  contratos: {
    description: "Envie e visualize contratos PDF de alunos.",
    icon: FileText,
    title: "Contratos PDF",
  },
  "corrigir-respostas": {
    description: "Corrija homeworks enviadas e devolva feedback ao aluno.",
    icon: ClipboardCheck,
    title: "Corrigir homework",
  },
  "criar-aula": {
    description: "Crie uma aula com material e vocabulario inicial.",
    icon: BookOpen,
    title: "Criar aula",
  },
  "criar-homework": {
    description: "Crie uma atividade online ligada a uma aula.",
    icon: ClipboardCheck,
    title: "Criar homework",
  },
  mensagens: {
    description: "Espaco de conversa com alunos vinculados a teacher.",
    icon: MessageSquareText,
    title: "Mensagens",
  },
  perfil: {
    description: "Atualize nome, telefone, endereco e foto.",
    icon: UserRound,
    title: "Perfil da teacher",
  },
  resumo: {
    description: "Resumo operacional da area teacher.",
    icon: GraduationCap,
    title: "Resumo teacher",
  },
} satisfies Record<
  TeacherTask,
  {
    description: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
  }
>;

export function normalizeTeacherTask(value: unknown): TeacherTask {
  return typeof value === "string" &&
    teacherTaskIds.includes(value as TeacherTask)
    ? (value as TeacherTask)
    : "resumo";
}

function getAnswerText(answers: unknown) {
  if (!Array.isArray(answers)) {
    return "Resposta registrada.";
  }

  const interactiveAnswers = answers
    .map((answer) => {
      if (
        typeof answer === "object" &&
        answer !== null &&
        "value" in answer &&
        typeof answer.value === "string" &&
        answer.value.trim()
      ) {
        return answer.value.trim();
      }

      return null;
    })
    .filter(Boolean);

  if (interactiveAnswers.length > 0) {
    return interactiveAnswers.join(" | ");
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-6 text-sm text-primary/75">
      {children}
    </p>
  );
}

export function TeacherWorkspace({
  activeTask,
  chatThreads,
  currentUser,
  contracts,
  lessons,
  liveSessions,
  students,
  submissions,
  teachers,
}: TeacherWorkspaceProps) {
  const lessonOptions = lessons.map((lesson) => ({
    id: lesson.id,
    label: `${lesson.title}${lesson.studentProfile ? ` - ${lesson.studentProfile.user.name}` : ""}`,
  }));
  const interactiveHomeworks = lessons.flatMap((lesson) =>
    lesson.homeworks
      .filter((homework) => homework.kind === "INTERACTIVE")
      .map((homework) => ({
        assetFileName: homework.assetFileName,
        assetMimeType: homework.assetMimeType,
        assetSizeBytes: homework.assetSizeBytes,
        fieldDetectionSource: homework.fieldDetectionSource,
        fields: homework.interactiveFields,
        id: homework.id,
        lessonTitle: lesson.title,
        studentName: lesson.studentProfile?.user.name ?? null,
        title: homework.title,
      })),
  );
  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === "SUBMITTED",
  ).length;
  const task = taskMeta[activeTask];
  const TaskIcon = task.icon;
  const stats = [
    { icon: BookOpen, label: "Aulas", value: lessons.length },
    {
      icon: ClipboardCheck,
      label: "Homeworks",
      value: lessons.reduce(
        (total, lesson) => total + lesson.homeworks.length,
        0,
      ),
    },
    {
      icon: MessageSquareText,
      label: "Pendentes",
      value: pendingSubmissions,
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <GraduationCap aria-hidden="true" />
            Area teacher
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Teacher Candy English
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

      <Card className="ava-panel-card overflow-hidden">
        <CardHeader className="ava-task-header border-b border-primary/15 bg-primary/10 px-7 py-5">
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
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="ava-stat-card flex items-center justify-between gap-4 rounded-lg border p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                      <strong className="text-3xl font-semibold">
                        {stat.value}
                      </strong>
                    </div>
                    <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <stat.icon aria-hidden="true" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Nivel dos alunos</h2>
                {students.length === 0 ? (
                  <EmptyState>Nenhum aluno vinculado a esta teacher.</EmptyState>
                ) : (
                  <div className="grid gap-3">
                    {students.map((student) => (
                      <StudentLevelForm
                        key={student.id}
                        currentLevel={student.level}
                        studentLabel={student.label}
                        studentProfileId={student.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTask === "aula-ao-vivo" ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <LiveSessionForm students={students} teachers={teachers} />
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Salas ao vivo</h2>
                {liveSessions.length === 0 ? (
                  <EmptyState>Nenhuma sala ao vivo aberta ainda.</EmptyState>
                ) : (
                  <div className="grid gap-3">
                    {liveSessions.map((session) => (
                      <article key={session.id} className="ava-soft-card rounded-lg border p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 flex-col gap-2">
                            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                              <Radio aria-hidden="true" />
                              {session.isLive ? "Ao vivo" : "Encerrada"}
                            </span>
                            <h2 className="font-semibold">{session.title}</h2>
                            <p className="text-sm text-muted-foreground">
                              Teacher: {session.teacherName}
                              {session.studentName
                                ? ` - Aluno: ${session.studentName}`
                                : " - Turma geral"}
                            </p>
                            {session.isLive ? (
                              <LiveClassRoom
                                displayName={currentUser.name ?? currentUser.email}
                                meetingUrl={session.meetUrl}
                                title={session.title}
                              />
                            ) : (
                              <Link
                                href={session.meetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-primary underline"
                              >
                                Abrir sala em nova aba
                              </Link>
                            )}
                          </div>
                          <ToggleLiveSessionButton
                            isLive={session.isLive}
                            liveSessionId={session.id}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTask === "criar-aula" ? (
            <CreateLessonForm students={students} teachers={teachers} />
          ) : null}

          {activeTask === "criar-homework" ? (
            <CreateHomeworkForm
              interactiveHomeworks={interactiveHomeworks}
              lessons={lessonOptions}
            />
          ) : null}

          {activeTask === "aulas" ? (
            lessons.length === 0 ? (
              <EmptyState>Nenhuma aula cadastrada ainda.</EmptyState>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {lessons.map((lesson) => (
                  <article key={lesson.id} className="ava-soft-card rounded-lg border p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <h2 className="text-lg font-semibold">
                          {lesson.title}
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {lesson.description ?? "Sem resumo cadastrado."}
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <span>Teacher: {lesson.teacherProfile.user.name}</span>
                        <span>
                          Aluno: {lesson.studentProfile?.user.name ?? "Geral"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays aria-hidden="true" />
                          {lesson.scheduledAt
                            ? dateFormatter.format(lesson.scheduledAt)
                            : "Sem data"}
                        </span>
                        <span>{lesson.homeworks.length} homework(s)</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}

          {activeTask === "perfil" ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <ProfileForm
                defaultValues={{
                  address: currentUser.address ?? "",
                  name: currentUser.name ?? "",
                  phone: currentUser.phone ?? "",
                }}
              />
              <AvatarUploadForm
                avatarPath={currentUser.avatarPath}
                userId={currentUser.id}
              />
            </div>
          ) : null}

          {activeTask === "contratos" ? (
            <div className="flex flex-col gap-6">
              <ContractUploadForm students={students} />
              {contracts.length === 0 ? (
                <EmptyState>Nenhum contrato enviado ainda.</EmptyState>
              ) : (
                <div className="grid gap-3">
                  {contracts.map((contract) => (
                    <Link
                      key={contract.id}
                      href={`/ava/contracts/${contract.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ava-soft-card flex items-center justify-between gap-4 rounded-lg border p-4 text-sm hover:border-primary"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <FileText aria-hidden="true" />
                        <span className="truncate">
                          {contract.title}
                          {contract.studentName
                            ? ` - ${contract.studentName}`
                            : ""}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {Math.ceil(contract.sizeBytes / 1024)} KB
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeTask === "mensagens" ? (
            <ChatThreadPanel
              defaultTeacherProfileId={
                teachers.length === 1 ? teachers[0].id : undefined
              }
              mode="teacher"
              students={students}
              teachers={teachers}
              threads={chatThreads}
            />
          ) : null}

          {activeTask === "corrigir-respostas" ? (
            submissions.length === 0 ? (
              <EmptyState>Nenhuma resposta enviada ainda.</EmptyState>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {submissions.map((submission) => (
                  <article key={submission.id} className="ava-soft-card rounded-lg border p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 aria-hidden="true" />
                          {submission.status === "REVIEWED"
                            ? "Corrigida"
                            : submission.status === "RETURNED"
                              ? "Liberada para refazer"
                            : "Aguardando feedback"}
                        </div>
                        <h2 className="font-semibold">
                          {submission.homework.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {submission.studentProfile.user.name} -{" "}
                          {submission.studentProfile.user.email}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-sm leading-6">
                        <strong>
                          {submission.homework.kind === "INTERACTIVE"
                            ? "Homework interativa:"
                            : "Pergunta:"}
                        </strong>{" "}
                        {submission.homework.kind === "INTERACTIVE"
                          ? `${submission.homework.interactiveFields.length} campo(s) no arquivo ${submission.homework.assetFileName ?? ""}`
                          : submission.homework.questions[0]?.prompt ??
                            "Resposta livre"}
                      </div>
                      <div className="rounded-lg bg-background p-3 text-sm leading-6">
                        <strong>Resposta:</strong>{" "}
                        <span className="text-muted-foreground">
                          {getAnswerText(submission.answers)}
                        </span>
                      </div>
                      {submission.feedback ? (
                        <div className="rounded-lg bg-secondary p-3 text-sm leading-6">
                          <strong>Feedback enviado:</strong>{" "}
                          {submission.feedback}
                        </div>
                      ) : null}
                      <ReviewSubmissionForm submissionId={submission.id} />
                      {submission.status !== "DRAFT" &&
                      submission.status !== "RETURNED" ? (
                        <AllowHomeworkRedoButton submissionId={submission.id} />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
