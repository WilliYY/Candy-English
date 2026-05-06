import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageSquareText,
} from "lucide-react";
import {
  CreateHomeworkForm,
  CreateLessonForm,
  ReviewSubmissionForm,
} from "@/components/ava/teacher-forms";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = {
  id: string;
  label: string;
};

type TeacherLesson = {
  createdAt: Date;
  description: string | null;
  homeworks: {
    id: string;
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

type TeacherWorkspaceProps = {
  currentUser: {
    email: string;
    name?: string | null;
    role: Role;
  };
  lessons: TeacherLesson[];
  students: Option[];
  submissions: TeacherSubmission[];
  teachers: Option[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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

export function TeacherWorkspace({
  currentUser,
  lessons,
  students,
  submissions,
  teachers,
}: TeacherWorkspaceProps) {
  const lessonOptions = lessons.map((lesson) => ({
    id: lesson.id,
    label: `${lesson.title}${lesson.studentProfile ? ` - ${lesson.studentProfile.user.name}` : ""}`,
  }));

  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === "SUBMITTED",
  ).length;

  const stats = [
    { icon: BookOpen, label: "Aulas", value: lessons.length },
    {
      icon: ClipboardCheck,
      label: "Homeworks",
      value: lessons.reduce((total, lesson) => total + lesson.homeworks.length, 0),
    },
    {
      icon: MessageSquareText,
      label: "Pendentes",
      value: pendingSubmissions,
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <GraduationCap aria-hidden="true" />
            Area teacher
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Aulas, homeworks e feedbacks
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Organize aulas, entregue materiais, acompanhe respostas e devolva
              feedback em um fluxo unico.
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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Criar aula</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLessonForm students={students} teachers={teachers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Criar homework</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateHomeworkForm lessons={lessonOptions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aulas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
              Nenhuma aula cadastrada ainda.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {lessons.map((lesson) => (
                <article key={lesson.id} className="rounded-lg border p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-semibold">{lesson.title}</h2>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {lesson.description ?? "Sem resumo cadastrado."}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <span>
                        Teacher: {lesson.teacherProfile.user.name}
                      </span>
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
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <strong className="text-sm">Materiais</strong>
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                          {lesson.materials.length === 0 ? (
                            <li>Nenhum material.</li>
                          ) : (
                            lesson.materials.map((material) => (
                              <li key={material.id}>{material.title}</li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <strong className="text-sm">Vocabulario</strong>
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                          {lesson.vocabularyItems.length === 0 ? (
                            <li>Nenhum vocabulario.</li>
                          ) : (
                            lesson.vocabularyItems.map((item) => (
                              <li key={item.id}>
                                {item.term} - {item.translation}
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respostas para corrigir</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
              Nenhuma resposta enviada ainda.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {submissions.map((submission) => (
                <article key={submission.id} className="rounded-lg border p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 aria-hidden="true" />
                        {submission.status === "REVIEWED"
                          ? "Corrigida"
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
                      <strong>Pergunta:</strong>{" "}
                      {submission.homework.questions[0]?.prompt ??
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
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
