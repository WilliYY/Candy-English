import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Gift,
  MessageSquareText,
  Radio,
  Send,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  ChatThreadPanel,
  type ChatThreadRow,
} from "@/components/ava/chat-thread-panel";
import { AvatarUploadForm, ProfileForm } from "@/components/ava/profile-forms";
import { LiveClassMaintenancePanel } from "@/components/ava/live-class-maintenance-panel";
import { LiveClassRoom } from "@/components/ava/live-class-room";
import { ProfilePhotoPopup } from "@/components/ava/profile-photo-popup";
import { InteractiveHomeworkStudent } from "@/components/ava/interactive-homework-student";
import { StudentHomeworkForm } from "@/components/ava/student-homework-form";
import {
  StudentCandyXpActivitiesPanel,
  type StudentCandyXpActivity,
} from "@/components/ava/student-candy-xp-activities-panel";
import { CandyXpRankingCard } from "@/components/ava/candy-xp-ranking-card";
import { StudentXpCard } from "@/components/ava/student-xp-card";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyCandyXpPersistence,
  buildCandyStudentXpSnapshot,
  CANDY_XP_REWARDS,
  type CandyXpPersistenceSnapshot,
} from "@/lib/candy-xp";
import type { CandyXpRankingSnapshot } from "@/lib/candy-xp-ranking";
import type { InteractiveHomeworkFieldType } from "@/lib/interactive-homework-fields";
import { LIVE_CLASS_MAINTENANCE_ENABLED } from "@/lib/live-class";
import type { Role } from "@/lib/roles";
import type { StudentProfileCompletion } from "@/lib/student-profile-completion";

export const studentTaskIds = [
  "resumo",
  "aula-ao-vivo",
  "aulas",
  "homeworks",
  "candy-ranking",
  "candy-xp",
  "catty-memory",
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
      type: InteractiveHomeworkFieldType;
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
  candyXpPersistence?: CandyXpPersistenceSnapshot | null;
  candyXpRanking: CandyXpRankingSnapshot;
  candyXpActivities: StudentCandyXpActivity[];
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
  profileCompletion: StudentProfileCompletion;
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
const xpFormatter = new Intl.NumberFormat("pt-BR");

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
  "candy-xp": {
    description: "Historias e missoes para ganhar XP.",
    icon: Sparkles,
    title: "Candy XP",
  },
  "candy-ranking": {
    description: "Veja sua posicao e quem mais juntou XP no AVA.",
    icon: Trophy,
    title: "Candy Ranking",
  },
  "catty-memory": {
    description: "Entenda como a Catty aprende com voce de forma segura.",
    icon: BrainCircuit,
    title: "Catty aprendendo",
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

function ProfileCompletionCard({
  completion,
}: {
  completion: StudentProfileCompletion;
}) {
  const missingItems = completion.missingItems.slice(0, 3);

  return (
    <section className="ava-profile-completion-card overflow-hidden rounded-2xl border p-5">
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900 shadow-sm">
              <Zap aria-hidden="true" className="size-3.5" />
              Perfil + XP
            </span>
            <h3 className="mt-3 text-xl font-semibold text-primary">
              Complete seu perfil e ganhe 350 XP
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Dados principais garantem 150 XP. Dados do aluno e responsavel
              completam mais 200 XP para deixar tudo pronto.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/70 bg-white/85 px-4 py-3 text-primary shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gift aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Ativo agora
              </span>
              <strong className="block text-xl leading-none">
                +{xpFormatter.format(completion.xp)} XP
              </strong>
              <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                meta +350 XP
              </span>
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <span className="text-sm font-semibold text-primary">
              {completion.completedCount}/{completion.totalCount} campos
            </span>
            <strong className="text-lg text-amber-900">
              {completion.percent}%
            </strong>
          </div>
          <div
            aria-label={`Perfil ${completion.percent}% completo`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={completion.percent}
            className="h-4 overflow-hidden rounded-full border border-amber-500/25 bg-white/70 p-0.5"
            role="progressbar"
          >
            <div
              aria-hidden="true"
              className="candy-xp-progress-fill candy-profile-progress-fill h-full rounded-full"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {completion.groups.map((group) => {
            const groupRemainingXp = Math.max(0, group.maxXp - group.xp);

            return (
              <div
                key={group.key}
                className={`rounded-xl border p-4 shadow-sm ${
                  group.isComplete
                    ? "border-emerald-300 bg-emerald-50/95 text-emerald-950"
                    : group.xp > 0
                      ? "border-amber-300 bg-amber-50/95 text-amber-950"
                      : "border-primary/10 bg-white/72 text-primary"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    {group.isComplete ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-5 shrink-0 text-emerald-600"
                      />
                    ) : (
                      <Target
                        aria-hidden="true"
                        className="size-5 shrink-0 text-amber-700"
                      />
                    )}
                    <span className="min-w-0">
                      <strong className="block text-sm">{group.label}</strong>
                      <span className="mt-1 block text-xs leading-5 opacity-80">
                        {group.description}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-bold shadow-sm">
                    +{xpFormatter.format(group.maxXp)} XP
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold">
                  <span>
                    {group.completedCount}/{group.totalCount} campos
                  </span>
                  <span>
                    {group.isComplete
                      ? "completo"
                      : `faltam ${xpFormatter.format(groupRemainingXp)} XP`}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/80 bg-white/70">
                  <div
                    aria-hidden="true"
                    className={`h-full rounded-full ${
                      group.isComplete
                        ? "bg-emerald-500"
                        : "candy-xp-progress-fill"
                    }`}
                    style={{ width: `${group.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {completion.items.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                item.completed
                  ? "border-emerald-300/80 bg-emerald-50 text-emerald-800"
                  : "border-primary/10 bg-white/66 text-muted-foreground"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.completed ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                ) : (
                  <Target aria-hidden="true" className="size-4 shrink-0" />
                )}
                <span className="min-w-0 truncate">{item.label}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${
                  item.completed
                    ? "bg-white/80 text-emerald-800"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                +{xpFormatter.format(item.xp)} XP
              </span>
            </div>
          ))}
        </div>

        <p className="rounded-xl border border-white/70 bg-white/72 px-4 py-3 text-sm leading-6 text-muted-foreground">
          {completion.isComplete
            ? "Perfil completo. Seu bonus maximo de 350 XP ja esta ativo no Candy XP."
            : missingItems.length > 0
              ? `Proximos campos: ${missingItems.map((item) => item.label).join(", ")}.`
              : "Preencha os campos importantes e salve para atualizar seu Candy XP."}
        </p>
      </div>
    </section>
  );
}

function StudentCattyLearningCard() {
  const learningPillars = [
    {
      className: "border-emerald-200 bg-emerald-50/85 text-emerald-900",
      icon: CheckCircle2,
      label: "Seguro",
      text: "Nada de senha, contrato, documento ou dado sensivel.",
    },
    {
      className: "border-sky-200 bg-sky-50/85 text-sky-900",
      icon: BrainCircuit,
      label: "Leve",
      text: "So pequenos resumos entram nas respostas da Catty.",
    },
    {
      className: "border-amber-200 bg-amber-50/85 text-amber-950",
      icon: UserRound,
      label: "Humano",
      text: "Admin e teacher revisam quando precisar ajustar algo.",
    },
  ];

  const exampleCards = [
    {
      label: "Gosto",
      text: "Se voce curte games, carros ou desenhos, ela pode usar exemplos nesse tema.",
    },
    {
      label: "Dificuldade",
      text: "Se voce trava em perguntas, ela pode explicar devagar e pedir uma frase curta.",
    },
    {
      label: "Estilo",
      text: "Se um tema ficar estranho, sua teacher pode ajustar o jeito da Catty falar.",
    },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white/92 shadow-xl shadow-primary/10">
        <div className="border-b border-primary/10 bg-[linear-gradient(135deg,#fff_0%,#fbf2ff_58%,#fff4e9_100%)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Image
                alt=""
                aria-hidden="true"
                className="size-12 rounded-2xl object-cover ring-2 ring-white/80"
                height={48}
                src="/brand/catty.png"
                width={48}
              />
              <span className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-amber-300 text-primary shadow-sm ring-2 ring-white">
                <BrainCircuit aria-hidden="true" className="size-4" />
              </span>
            </span>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-primary/10 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Study mode
              </span>
              <h3 className="mt-3 text-2xl font-semibold leading-tight text-primary">
                A Catty aprende seu jeito de estudar
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Ela usa memorias leves para deixar exemplos, perguntas e
                incentivos mais proximos de voce. A equipe Candy revisa tudo
                quando precisar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {learningPillars.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`rounded-xl border p-4 shadow-sm ${item.className}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/80 shadow-sm">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-5 opacity-85">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-2xl border border-primary/10 bg-primary/[0.035] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Target aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">
                Voce continua no controle
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Se a Catty usar um exemplo estranho ou um tema que voce nao
                curte, avise sua teacher para ela ajustar o estilo por voce.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 shadow-lg shadow-amber-200/30">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                Como isso aparece
              </p>
              <h4 className="mt-2 text-lg font-semibold text-primary">
                Respostas mais com a sua cara
              </h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Com o tempo, a Catty pode escolher exemplos melhores para seu
                estudo, sem mostrar a lista tecnica de memorias.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {exampleCards.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-primary/10 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  <Zap aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-primary/10 bg-white/88 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen aria-hidden="true" className="size-5" />
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              A ideia e simples: praticar ingles com exemplos pequenos, seguros
              e mais faceis de lembrar.
            </p>
          </div>
        </div>
      </div>
    </section>
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

function isStudentHomeworkComplete(homework: StudentHomework) {
  const status = homework.submissions[0]?.status;

  return status === "SUBMITTED" || status === "REVIEWED";
}

function getStudentSubmissionStatusMeta(status?: string) {
  if (status === "REVIEWED") {
    return {
      accentClassName: "bg-emerald-500",
      badgeClassName: "border-emerald-500/40 bg-emerald-50 text-emerald-900",
      helper: "Feedback liberado",
      iconClassName: "bg-emerald-100 text-emerald-700",
      label: "Corrigida",
    };
  }

  if (status === "SUBMITTED") {
    return {
      accentClassName: "bg-primary",
      badgeClassName: "border-primary/30 bg-primary/10 text-primary",
      helper: "Aguardando correcao",
      iconClassName: "bg-primary/10 text-primary",
      label: "Entregue",
    };
  }

  if (status === "RETURNED") {
    return {
      accentClassName: "bg-amber-500",
      badgeClassName: "border-amber-500/40 bg-amber-50 text-amber-900",
      helper: "Teacher pediu ajuste",
      iconClassName: "bg-amber-100 text-amber-700",
      label: "Refazer",
    };
  }

  if (status === "DRAFT") {
    return {
      accentClassName: "bg-sky-500",
      badgeClassName: "border-sky-500/30 bg-sky-50 text-sky-900",
      helper: "Rascunho salvo",
      iconClassName: "bg-sky-100 text-sky-700",
      label: "Rascunho",
    };
  }

  return {
    accentClassName: "bg-rose-500",
    badgeClassName: "border-rose-500/40 bg-rose-50 text-rose-900",
    helper: "Ainda nao entregue",
    iconClassName: "bg-rose-100 text-rose-700",
    label: "Pendente",
  };
}

const studentHomeworkSubmittedXp = CANDY_XP_REWARDS.student.homeworkSubmitted;
const studentHomeworkFeedbackXp = CANDY_XP_REWARDS.student.feedbackReviewed;
const studentHomeworkReviewedXp =
  studentHomeworkSubmittedXp + studentHomeworkFeedbackXp;

function getStudentHomeworkXpMeta(status?: string) {
  const amount =
    status === "REVIEWED"
      ? studentHomeworkReviewedXp
      : studentHomeworkSubmittedXp;
  const label =
    status === "REVIEWED" || status === "SUBMITTED" || status === "RETURNED"
      ? `Ganhou +${xpFormatter.format(amount)} XP`
      : `Vale +${xpFormatter.format(amount)} XP`;

  if (status === "REVIEWED") {
    return {
      className: "border-emerald-300 bg-emerald-50 text-emerald-900",
      helper: "envio + feedback",
      label,
    };
  }

  if (status === "SUBMITTED") {
    return {
      className: "border-amber-300 bg-amber-50 text-amber-950",
      helper: "envio registrado",
      label,
    };
  }

  if (status === "RETURNED") {
    return {
      className: "border-amber-300 bg-amber-50 text-amber-950",
      helper: "XP preservado",
      label,
    };
  }

  return {
    className: "border-primary/15 bg-white text-primary",
    helper: "ao entregar",
    label,
  };
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
  candyXpPersistence,
  candyXpRanking,
  candyXpActivities,
  chatThreads,
  contracts,
  currentUser,
  lessons,
  liveSessions,
  studentProfileId,
  profileCompletion,
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
  const lessonActivityItems = visibleLessons.flatMap((lesson) =>
    lesson.homeworks.filter(isInteractiveLessonHomework),
  );
  const completedLessonActivityCount = lessonActivityItems.filter(
    isStudentHomeworkComplete,
  ).length;
  const lessonActivityXpReward =
    CANDY_XP_REWARDS.student.lessonActivitySubmitted;
  const completedLessonActivityXp =
    completedLessonActivityCount * lessonActivityXpReward;
  const lessonMaterialCount = visibleLessons.reduce(
    (total, lesson) => total + lesson.materials.length,
    0,
  );
  const lessonVocabularyCount = visibleLessons.reduce(
    (total, lesson) => total + lesson.vocabularyItems.length,
    0,
  );
  const homeworkCount = homeworkItems.length;
  const homeworkStatusTotals = homeworkItems.reduce(
    (totals, { homework }) => {
      const status = homework.submissions[0]?.status;

      if (status === "REVIEWED") {
        totals.reviewed += 1;
      } else if (status === "SUBMITTED") {
        totals.submitted += 1;
      } else if (status === "RETURNED") {
        totals.returned += 1;
      } else if (status === "DRAFT") {
        totals.draft += 1;
      } else {
        totals.pending += 1;
      }

      return totals;
    },
    { draft: 0, pending: 0, returned: 0, reviewed: 0, submitted: 0 },
  );
  const homeworkActionCount =
    homeworkStatusTotals.pending +
    homeworkStatusTotals.draft +
    homeworkStatusTotals.returned;
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
  const xpSnapshot = applyCandyXpPersistence(
    buildCandyStudentXpSnapshot({
      candyXpActivities: candyXpActivities.map((activity) => ({
        status: activity.submission?.status,
      })),
      homeworks: homeworkItems.map(({ homework }) => ({
        status: homework.submissions[0]?.status,
      })),
      lessonActivities: lessonActivityItems.map((homework) => ({
        status: homework.submissions[0]?.status,
      })),
      profileCompletionPercent: profileCompletion.percent,
      profileCompletionXp: profileCompletion.xp,
    }),
    candyXpPersistence,
  );
  const stats = [
    { icon: BookOpen, label: "Aulas", value: visibleLessons.length },
    { icon: ClipboardCheck, label: "Homeworks", value: homeworkCount },
    { icon: Sparkles, label: "Candy XP", value: candyXpActivities.length },
    { icon: MessageSquareText, label: "Feedbacks", value: reviewedCount },
  ];
  const lessonSummaryStats = [
    {
      accentClassName: "border-sky-200 bg-sky-50 text-sky-950",
      helper: "aulas liberadas",
      icon: BookOpen,
      iconClassName: "bg-sky-100 text-sky-700",
      label: "Aulas",
      value: visibleLessons.length,
    },
    {
      accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-950",
      helper: `${completedLessonActivityCount} concluida(s)`,
      icon: Zap,
      iconClassName: "bg-emerald-100 text-emerald-700",
      label: "XP aulas",
      value: `+${xpFormatter.format(completedLessonActivityXp)} XP`,
    },
    {
      accentClassName: "border-amber-200 bg-amber-50 text-amber-950",
      helper: "arquivos e links",
      icon: FileText,
      iconClassName: "bg-amber-100 text-amber-700",
      label: "Materiais",
      value: lessonMaterialCount,
    },
    {
      accentClassName: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950",
      helper: "palavras de apoio",
      icon: Sparkles,
      iconClassName: "bg-fuchsia-100 text-fuchsia-700",
      label: "Vocabulario",
      value: lessonVocabularyCount,
    },
  ];
  const homeworkSummaryStats = [
    {
      accentClassName: "border-primary/15 bg-primary/5 text-primary",
      helper: "no seu AVA",
      icon: ClipboardCheck,
      iconClassName: "bg-primary/10 text-primary",
      label: "Atividades",
      value: homeworkCount,
    },
    {
      accentClassName: "border-rose-200 bg-rose-50 text-rose-950",
      helper: "para responder",
      icon: Target,
      iconClassName: "bg-rose-100 text-rose-700",
      label: "Para fazer",
      value: homeworkActionCount,
    },
    {
      accentClassName: "border-violet-200 bg-violet-50 text-violet-950",
      helper: "aguardando teacher",
      icon: Send,
      iconClassName: "bg-violet-100 text-violet-700",
      label: "Entregues",
      value: homeworkStatusTotals.submitted,
    },
    {
      accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-950",
      helper: "com feedback",
      icon: CheckCircle2,
      iconClassName: "bg-emerald-100 text-emerald-700",
      label: "Corrigidas",
      value: homeworkStatusTotals.reviewed,
    },
  ];
  const needsProfilePhoto = !currentUser.avatarPath;
  const profilePhotoXp =
    profileCompletion.items.find((item) => item.key === "avatarPath")?.xp ?? 0;

  return (
    <section className="relative isolate mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 text-white sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
      <ProfilePhotoPopup
        markSeen={needsProfilePhoto && activeTask === "perfil"}
        photoXp={profilePhotoXp}
        show={needsProfilePhoto && activeTask !== "perfil"}
        userId={currentUser.id}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(460px,560px)]">
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
          ranking={candyXpRanking.currentUserRanking}
          role={currentUser.role}
          userId={currentUser.id}
          xp={xpSnapshot}
        />
      </div>

      <Card className="overflow-hidden border-white/20 bg-white/92 text-foreground shadow-2xl shadow-primary/20 backdrop-blur">
        <CardHeader className="ava-task-header border-b bg-white/78 px-4 py-5 sm:px-7">
          <div className="flex min-h-12 flex-col items-center justify-center gap-3 text-center sm:relative sm:flex-row">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:absolute sm:left-0">
              <TaskIcon aria-hidden="true" />
            </span>
            <CardTitle className="px-0 text-center text-lg sm:px-14 sm:text-xl">
              {task.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          {activeTask === "resumo" ? (
            <div className="grid gap-5">
              <StudentXpCard xp={xpSnapshot} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            </div>
          ) : null}

          {activeTask === "candy-ranking" ? (
            <CandyXpRankingCard ranking={candyXpRanking} />
          ) : null}

          {activeTask === "aula-ao-vivo" ? (
            LIVE_CLASS_MAINTENANCE_ENABLED ? (
              <LiveClassMaintenancePanel audience="student" />
            ) : liveSessions.some((session) => session.isLive) ? (
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
            <div className="mx-auto grid w-full max-w-6xl gap-5">
              <section className="overflow-hidden rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,#fff_0%,#f9efff_54%,#fff4e7_100%)] shadow-xl shadow-primary/10">
                <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-center">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                      <UserRound aria-hidden="true" className="size-7" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
                        Meu perfil Candy
                      </span>
                      <h3 className="mt-1 text-2xl font-semibold leading-tight text-primary">
                        {currentUser.name ?? "Aluno Candy"}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Confira seus contatos, dados do aluno e foto. Esses
                        dados ajudam a equipe Candy a acompanhar seu estudo com
                        mais cuidado.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-primary/10 bg-white/80 p-3 shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Campos
                      </span>
                      <strong className="mt-1 block text-2xl text-primary">
                        {profileCompletion.completedCount}/
                        {profileCompletion.totalCount}
                      </strong>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-amber-900">
                        Perfil
                      </span>
                      <strong className="mt-1 block text-2xl text-amber-950">
                        {profileCompletion.percent}%
                      </strong>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-emerald-900">
                        XP ativo
                      </span>
                      <strong className="mt-1 block text-2xl text-emerald-950">
                        +{xpFormatter.format(profileCompletion.xp)}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex flex-col gap-5">
                  <ProfileCompletionCard completion={profileCompletion} />
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
                    profileCompletion={profileCompletion}
                    showStudentFields
                  />
                </div>

                <aside className="grid content-start gap-4 xl:sticky xl:top-6">
                  <AvatarUploadForm
                    avatarPath={currentUser.avatarPath}
                    profileCompletion={profileCompletion}
                    userId={currentUser.id}
                  />
                </aside>
              </div>
            </div>
          ) : null}

          {activeTask === "catty-memory" ? <StudentCattyLearningCard /> : null}

          {activeTask === "contratos" ? (
            contracts.length === 0 ? (
              <EmptyState>Contrato ainda nao adicionado.</EmptyState>
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
              <EmptyState>
                Nenhuma aula foi vinculada ao seu perfil ainda.
              </EmptyState>
            ) : (
              <div className="mx-auto grid w-full max-w-6xl gap-5">
                <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-primary/5 shadow-sm">
                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 shadow-sm">
                        <BookOpen aria-hidden="true" className="size-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                          Area de estudo
                        </span>
                        <strong className="mt-1 block text-xl font-semibold text-primary">
                          Aulas organizadas para revisar sem se perder
                        </strong>
                        <span className="mt-2 block max-w-2xl text-sm leading-6 text-muted-foreground">
                          Abra uma aula para ver o material, revisar vocabulario
                          e responder a atividade interativa quando existir.
                        </span>
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lessonSummaryStats.map((stat) => {
                        const StatIcon = stat.icon;

                        return (
                          <div
                            key={stat.label}
                            className={`flex items-center justify-between gap-3 rounded-xl border p-3 shadow-sm ${stat.accentClassName}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold uppercase tracking-[0.12em] opacity-75">
                                {stat.label}
                              </span>
                              <strong className="mt-1 block text-2xl font-semibold">
                                {stat.value}
                              </strong>
                              <span className="block text-xs opacity-75">
                                {stat.helper}
                              </span>
                            </span>
                            <span
                              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.iconClassName}`}
                            >
                              <StatIcon aria-hidden="true" className="size-5" />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {visibleLessons.map((lesson) => {
                  const lessonActivities = lesson.homeworks.filter(
                    isInteractiveLessonHomework,
                  );
                  const completedLessonActivities = lessonActivities.filter(
                    isStudentHomeworkComplete,
                  );
                  const hasLessonActivities = lessonActivities.length > 0;
                  const isLessonComplete =
                    hasLessonActivities &&
                    completedLessonActivities.length ===
                      lessonActivities.length;
                  const earnedLessonXp =
                    completedLessonActivities.length * lessonActivityXpReward;
                  const availableLessonXp =
                    lessonActivities.length * lessonActivityXpReward;
                  const lessonXpLabel =
                    earnedLessonXp > 0
                      ? `Ganhou +${xpFormatter.format(earnedLessonXp)} XP`
                      : availableLessonXp > 0
                        ? `Vale +${xpFormatter.format(availableLessonXp)} XP`
                        : "Sem XP";
                  const lessonXpHelper =
                    earnedLessonXp > 0
                      ? "ao completar"
                      : availableLessonXp > 0
                        ? "ao concluir"
                        : "sem atividade";
                  const lessonXpClass =
                    earnedLessonXp > 0
                      ? "border-amber-300 bg-amber-50 text-amber-950 shadow-amber-100/80"
                      : availableLessonXp > 0
                        ? "border-primary/20 bg-primary/5 text-primary shadow-primary/5"
                        : "border-muted bg-muted/50 text-muted-foreground shadow-transparent";
                  const hasStudyAssets =
                    lesson.materials.length > 0 ||
                    lesson.vocabularyItems.length > 0 ||
                    hasLessonActivities;
                  const lessonStatusLabel = hasLessonActivities
                    ? isLessonComplete
                      ? "Concluido"
                      : "Nao concluido"
                    : "Material";
                  const lessonStatusClass = hasLessonActivities
                    ? isLessonComplete
                      ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
                      : "border-rose-500/40 bg-rose-50 text-rose-900"
                    : "border-sky-500/30 bg-sky-50 text-sky-900";
                  const lessonStatusDotClass = hasLessonActivities
                    ? isLessonComplete
                      ? "bg-emerald-500"
                      : "bg-rose-600"
                    : "bg-sky-500";
                  const lessonAccentClass = hasLessonActivities
                    ? isLessonComplete
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                    : "bg-sky-500";
                  const lessonIconClass = hasLessonActivities
                    ? isLessonComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                    : "bg-sky-100 text-sky-700";

                  return (
                    <details
                      key={lesson.id}
                      className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/95 shadow-sm transition hover:border-primary/25 hover:shadow-md"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 top-0 h-1 ${lessonAccentClass}`}
                      />
                      <summary className="flex cursor-pointer list-none flex-col gap-4 px-5 py-5 hover:bg-primary/5 sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-start gap-3 sm:items-center">
                          <span
                            className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${lessonIconClass}`}
                          >
                            <BookOpen aria-hidden="true" className="size-6" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-lg font-semibold text-primary">
                              {lesson.title}
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-muted-foreground sm:line-clamp-2">
                              {lesson.description ??
                                "Resumo da aula ainda nao cadastrado."}
                            </span>
                            <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1">
                                <UserRound
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                Teacher: {lesson.teacherProfile.user.name}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-2.5 py-1">
                                <CalendarDays
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {lesson.scheduledAt
                                  ? dateFormatter.format(lesson.scheduledAt)
                                  : "Sem data"}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900">
                                <FileText
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {lesson.materials.length} material(is)
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-fuchsia-900">
                                <Sparkles
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {lesson.vocabularyItems.length} vocabulario(s)
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
                          <span
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm ${lessonXpClass}`}
                          >
                            <Zap aria-hidden="true" className="size-3.5" />
                            <span className="flex flex-col leading-tight">
                              <span>{lessonXpLabel}</span>
                              <span className="text-[10px] font-medium opacity-70">
                                {lessonXpHelper}
                              </span>
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${lessonStatusClass}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`size-2.5 rounded-full ${lessonStatusDotClass}`}
                            />
                            {lessonStatusLabel}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                            {hasStudyAssets ? "Abrir aula" : "Ver detalhes"}
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className="size-4 text-muted-foreground transition group-open:rotate-180"
                          />
                        </span>
                      </summary>

                      <div className="flex flex-col gap-5 border-t border-primary/10 px-5 pb-5 pt-4 md:px-6 md:pb-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-950">
                                <FileText
                                  aria-hidden="true"
                                  className="size-4"
                                />
                                Materiais da aula
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-900">
                                {lesson.materials.length}
                              </span>
                            </div>
                            <ul className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
                              {lesson.materials.length === 0 ? (
                                <li className="rounded-lg border border-dashed border-amber-200 bg-white/70 p-3">
                                  Nenhum material extra cadastrado nesta aula.
                                </li>
                              ) : (
                                lesson.materials.map((material) => (
                                  <li
                                    key={material.id}
                                    className="rounded-lg border border-amber-100 bg-white/90 p-3 leading-6 shadow-sm"
                                  >
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
                                          className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-100"
                                          href={material.url}
                                          rel="noreferrer"
                                          target="_blank"
                                        >
                                          Abrir material
                                        </a>
                                      </div>
                                    ) : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-fuchsia-200/70 bg-fuchsia-50/70 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-950">
                                <Sparkles
                                  aria-hidden="true"
                                  className="size-4"
                                />
                                Vocabulario de apoio
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-fuchsia-900">
                                {lesson.vocabularyItems.length}
                              </span>
                            </div>
                            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                              {lesson.vocabularyItems.length === 0 ? (
                                <li className="rounded-lg border border-dashed border-fuchsia-200 bg-white/70 p-3">
                                  Nenhum vocabulario extra cadastrado.
                                </li>
                              ) : (
                                lesson.vocabularyItems.map((item) => (
                                  <li
                                    key={item.id}
                                    className="rounded-lg border border-fuchsia-100 bg-white/90 p-3 leading-6 shadow-sm"
                                  >
                                    <span className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-fuchsia-100 px-2.5 py-1 font-medium text-fuchsia-950">
                                        {item.term}
                                      </span>
                                      <span className="font-medium text-foreground">
                                        {item.translation}
                                      </span>
                                    </span>
                                    {item.example ? (
                                      <p className="mt-2">{item.example}</p>
                                    ) : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </div>
                        {lessonActivities.length > 0 ? (
                          <div className="mx-auto flex w-full flex-col gap-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-white via-sky-50/60 to-white p-4 shadow-sm md:p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-sky-950">
                                <ClipboardCheck
                                  aria-hidden="true"
                                  className="size-4"
                                />
                                Atividade interativa da aula
                              </span>
                              <span className="w-fit rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-900">
                                {completedLessonActivities.length}/
                                {lessonActivities.length} concluida(s)
                              </span>
                              <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">
                                +{xpFormatter.format(lessonActivityXpReward)} XP
                                cada
                              </span>
                            </div>
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
              <div className="mx-auto grid w-full max-w-6xl gap-5">
                <div className="overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-white via-rose-50/70 to-primary/5 shadow-sm">
                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <ClipboardCheck aria-hidden="true" className="size-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                          Responder homework
                        </span>
                        <strong className="mt-1 block text-xl font-semibold text-primary">
                          Atividades para entregar e acompanhar feedback
                        </strong>
                        <span className="mt-2 block max-w-2xl text-sm leading-6 text-muted-foreground">
                          Abra a atividade, responda no PDF ou no campo simples
                          e acompanhe se ela esta pendente, entregue ou
                          corrigida.
                        </span>
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {homeworkSummaryStats.map((stat) => {
                        const StatIcon = stat.icon;

                        return (
                          <div
                            key={stat.label}
                            className={`flex items-center justify-between gap-3 rounded-xl border p-3 shadow-sm ${stat.accentClassName}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold uppercase tracking-[0.12em] opacity-75">
                                {stat.label}
                              </span>
                              <strong className="mt-1 block text-2xl font-semibold">
                                {stat.value}
                              </strong>
                              <span className="block text-xs opacity-75">
                                {stat.helper}
                              </span>
                            </span>
                            <span
                              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.iconClassName}`}
                            >
                              <StatIcon aria-hidden="true" className="size-5" />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {homeworkItems.map(({ homework }) => {
                  const submission = homework.submissions[0];
                  const statusMeta = getStudentSubmissionStatusMeta(
                    submission?.status,
                  );
                  const xpMeta = getStudentHomeworkXpMeta(submission?.status);

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
                      className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/95 shadow-sm transition hover:border-primary/25 hover:shadow-md"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 top-0 h-1 ${statusMeta.accentClassName}`}
                      />
                      <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-start gap-3 sm:items-center">
                          <span
                            className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${statusMeta.iconClassName}`}
                          >
                            <ClipboardCheck
                              aria-hidden="true"
                              className="size-6"
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-lg font-semibold text-primary">
                              {homework.title}
                            </span>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              {homework.instructions ??
                                "Atividade simples para responder online."}
                            </span>
                            <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1">
                                <FileText
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                Homework simples
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-2.5 py-1">
                                <CalendarDays
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {homework.dueDate
                                  ? `Prazo ${dateFormatter.format(homework.dueDate)}`
                                  : "Sem prazo"}
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
                          <span
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm ${xpMeta.className}`}
                          >
                            <Zap
                              aria-hidden="true"
                              className="size-3.5 shrink-0"
                            />
                            <span className="leading-tight">
                              <span className="block">{xpMeta.label}</span>
                              <span className="block text-[10px] font-semibold opacity-70">
                                {xpMeta.helper}
                              </span>
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`size-2.5 rounded-full ${statusMeta.accentClassName}`}
                            />
                            {statusMeta.label}
                          </span>
                          <span className="hidden rounded-full border border-primary/10 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm sm:inline-flex">
                            Abrir atividade
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className="size-4 text-muted-foreground transition group-open:rotate-180"
                          />
                        </span>
                      </summary>
                      <div className="flex flex-col gap-4 border-t border-primary/15 bg-gradient-to-b from-white to-primary/[0.03] p-4 md:p-5">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                          <div>
                            <h3 className="font-semibold text-primary">
                              {homework.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {homework.instructions ??
                                "Sem instrucoes adicionais."}
                            </p>
                          </div>
                          <span className="flex flex-wrap items-center gap-2 md:justify-end">
                            <span
                              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${xpMeta.className}`}
                            >
                              <Zap aria-hidden="true" className="size-3.5" />
                              {xpMeta.label}
                            </span>
                            <span
                              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}
                            >
                              {statusMeta.helper}
                            </span>
                          </span>
                        </div>
                        <div className="rounded-xl border border-primary/10 bg-white p-4 text-sm leading-6 shadow-sm">
                          <strong className="text-primary">Pergunta:</strong>{" "}
                          <span className="text-muted-foreground">
                            {homework.questions[0]?.prompt ?? "Resposta livre"}
                          </span>
                        </div>
                        <StudentHomeworkForm
                          homeworkId={homework.id}
                          initialAnswer={getAnswerText(submission?.answers)}
                          isReviewed={submission?.status === "REVIEWED"}
                        />
                        {submission?.feedback ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
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

          {activeTask === "candy-xp" ? (
            <StudentCandyXpActivitiesPanel activities={candyXpActivities} />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
