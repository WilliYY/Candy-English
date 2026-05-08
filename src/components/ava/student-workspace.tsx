import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
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
    dueDate: Date | null;
    id: string;
    instructions: string | null;
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
    description: "Entre no Google Meet quando a teacher abrir a aula.",
    icon: Radio,
    title: "Aula ao vivo",
  },
  aulas: {
    description: "Veja materiais, links e vocabulario das suas aulas.",
    icon: BookOpen,
    title: "Aulas e materiais",
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
  const homeworkCount = lessons.reduce(
    (total, lesson) => total + lesson.homeworks.length,
    0,
  );
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
    { icon: BookOpen, label: "Aulas", value: lessons.length },
    { icon: ClipboardCheck, label: "Homeworks", value: homeworkCount },
    { icon: MessageSquareText, label: "Feedbacks", value: reviewedCount },
  ];

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 overflow-hidden px-6 py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_15%_25%,rgba(229,124,216,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.9),transparent_26%),linear-gradient(180deg,rgba(252,241,248,0.95),rgba(254,251,250,0))]" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-sm text-muted-foreground">
            <BookOpen aria-hidden="true" />
            Area student
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Seu AVA Candy
            </h1>
          </div>
        </div>

        <UserSummaryPanel
          email={currentUser.email}
          name={currentUser.name}
          role={currentUser.role}
        />
      </div>

      <Card className="overflow-hidden bg-white/92 backdrop-blur">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TaskIcon aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-xl">{task.title}</CardTitle>
            </div>
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
              <div className="grid gap-3 md:grid-cols-2">
                {liveSessions
                  .filter((session) => session.isLive)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col gap-4 rounded-lg bg-primary p-5 text-primary-foreground"
                    >
                      <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white/15 px-2 py-1 text-xs font-semibold">
                        <Radio aria-hidden="true" />
                        Ao vivo agora
                      </span>
                      <div className="flex flex-col gap-1">
                        <strong>{session.title}</strong>
                        <span className="text-sm text-primary-foreground/70">
                          Teacher: {session.teacherName}
                        </span>
                      </div>
                      <Link
                        href={session.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary"
                      >
                        Entrar no Google Meet
                      </Link>
                    </div>
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
              <ProfileForm
                defaultValues={{
                  address: currentUser.address ?? "",
                  birthDate: formatDateInput(studentProfile.birthDate),
                  guardianDocument: studentProfile.guardianDocument ?? "",
                  level: studentProfile.level ?? "",
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
            lessons.length === 0 ? (
              <EmptyState>Nenhuma aula foi vinculada ao seu perfil ainda.</EmptyState>
            ) : (
              <div className="grid gap-5">
                {lessons.map((lesson) => (
                  <article key={lesson.id} className="rounded-lg border p-5">
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
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays aria-hidden="true" />
                          {lesson.scheduledAt
                            ? dateFormatter.format(lesson.scheduledAt)
                            : "Sem data"}
                        </span>
                      </div>
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
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}

          {activeTask === "homeworks" ? (
            homeworkCount === 0 ? (
              <EmptyState>Nenhuma homework disponivel no momento.</EmptyState>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {lessons.flatMap((lesson) =>
                  lesson.homeworks.map((homework) => {
                    const submission = homework.submissions[0];

                    return (
                      <article key={homework.id} className="rounded-lg border p-5">
                        <div className="flex flex-col gap-4">
                          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                            <CheckCircle2 aria-hidden="true" />
                            {submission?.status === "REVIEWED"
                              ? "Corrigida"
                              : submission
                                ? "Enviada"
                                : "Pendente"}
                          </div>
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
                      </article>
                    );
                  }),
                )}
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
