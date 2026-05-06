import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  Radio,
} from "lucide-react";
import Link from "next/link";
import {
  AvatarUploadForm,
  ProfileForm,
} from "@/components/ava/profile-forms";
import { StudentHomeworkForm } from "@/components/ava/student-homework-form";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import type { Role } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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

export function StudentWorkspace({
  contracts,
  currentUser,
  lessons,
  liveSessions,
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

  const stats = [
    { icon: BookOpen, label: "Aulas", value: lessons.length },
    { icon: ClipboardCheck, label: "Homeworks", value: homeworkCount },
    { icon: MessageSquareText, label: "Feedbacks", value: reviewedCount },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <BookOpen aria-hidden="true" />
            Area student
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Suas aulas e homeworks
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Consulte materiais, estude vocabulario, envie respostas e acompanhe
              o feedback da teacher.
            </p>
          </div>
        </div>

        <UserSummaryPanel
          email={currentUser.email}
          name={currentUser.name}
          role={currentUser.role}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <strong className="text-3xl font-semibold">{stat.value}</strong>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <stat.icon aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle>Aula ao vivo</CardTitle>
        </CardHeader>
        <CardContent>
          {liveSessions.some((session) => session.isLive) ? (
            <div className="grid gap-3 md:grid-cols-2">
              {liveSessions
                .filter((session) => session.isLive)
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-4 rounded-lg bg-primary-foreground p-5 text-primary"
                  >
                    <span className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                      <Radio aria-hidden="true" />
                      Ao vivo agora
                    </span>
                    <div className="flex flex-col gap-1">
                      <strong>{session.title}</strong>
                      <span className="text-sm text-primary/70">
                        Teacher: {session.teacherName}
                      </span>
                    </div>
                    <Link
                      href={session.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Entrar no Google Meet
                    </Link>
                  </div>
                ))}
            </div>
          ) : (
            <p className="rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 p-5 text-sm text-primary-foreground/75">
              Nenhuma aula ao vivo aberta para seu usuario neste momento.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Meu perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <ProfileForm
                defaultValues={{
                  address: currentUser.address ?? "",
                  name: currentUser.name ?? "",
                  phone: currentUser.phone ?? "",
                }}
              />
              <AvatarUploadForm />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
                Nenhum contrato vinculado ao seu perfil ainda.
              </p>
            ) : (
              <div className="grid gap-3">
                {contracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/ava/contracts/${contract.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 rounded-lg border p-4 text-sm hover:border-primary"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FileText aria-hidden="true" />
                      <span className="truncate">{contract.title}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {Math.ceil(contract.sizeBytes / 1024)} KB
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent>
            <p className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
              Nenhuma aula foi vinculada ao seu perfil ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="flex flex-col gap-4">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {lesson.description ?? "Sem resumo cadastrado."}
                    </p>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <span>Teacher: {lesson.teacherProfile.user.name}</span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays aria-hidden="true" />
                        {lesson.scheduledAt
                          ? dateFormatter.format(lesson.scheduledAt)
                          : "Sem data"}
                      </span>
                    </div>
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
                                <a
                                  className="text-primary underline"
                                  href={material.url}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Abrir link
                                </a>
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

                  <div className="flex flex-col gap-4">
                    {lesson.homeworks.length === 0 ? (
                      <p className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
                        Nenhuma homework para esta aula.
                      </p>
                    ) : (
                      lesson.homeworks.map((homework) => {
                        const submission = homework.submissions[0];

                        return (
                          <article
                            key={homework.id}
                            className="rounded-lg border p-5"
                          >
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2">
                                <div className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                                  <CheckCircle2 aria-hidden="true" />
                                  {submission?.status === "REVIEWED"
                                    ? "Corrigida"
                                    : submission
                                      ? "Enviada"
                                      : "Pendente"}
                                </div>
                                <h3 className="font-semibold">
                                  {homework.title}
                                </h3>
                                <p className="text-sm leading-6 text-muted-foreground">
                                  {homework.instructions ??
                                    "Sem instrucoes adicionais."}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-6">
                                <strong>Pergunta:</strong>{" "}
                                {homework.questions[0]?.prompt ??
                                  "Resposta livre"}
                              </div>
                              <StudentHomeworkForm
                                homeworkId={homework.id}
                                initialAnswer={getAnswerText(
                                  submission?.answers,
                                )}
                                isReviewed={submission?.status === "REVIEWED"}
                              />
                              {submission?.feedback ? (
                                <div className="rounded-lg bg-secondary p-3 text-sm leading-6">
                                  <strong>Feedback:</strong>{" "}
                                  {submission.feedback}
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
