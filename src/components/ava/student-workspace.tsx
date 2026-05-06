import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
} from "lucide-react";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { StudentHomeworkForm } from "@/components/ava/student-homework-form";
import { ROLE_LABELS, type Role } from "@/lib/roles";
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
  currentUser: {
    email: string;
    name?: string | null;
    role: Role;
  };
  lessons: StudentLesson[];
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
  currentUser,
  lessons,
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
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
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

        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Usuario logado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 text-sm">
              <strong>{currentUser.name ?? "Sem nome"}</strong>
              <span className="break-all text-primary-foreground/75">
                {currentUser.email}
              </span>
              <span className="w-fit rounded-md bg-primary-foreground px-2 py-1 text-xs font-semibold text-primary">
                {ROLE_LABELS[currentUser.role]}
              </span>
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
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
