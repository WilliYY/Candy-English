import { STUDENT_PROFILE_COMPLETION_MAX_XP } from "@/lib/student-profile-completion";

export type CandyXpRole = "admin" | "student" | "teacher";

export const CANDY_XP_REWARDS = {
  admin: {
    activeUser: 12,
    agendaHandledLesson: 8,
    assignment: 24,
    contract: 20,
    credential: 15,
    financialStudent: 18,
    paidPayment: 10,
    profileReady: 15,
    student: 16,
    teacher: 30,
  },
  student: {
    candyXpActivityCompleted: 80,
    feedbackReviewed: 25,
    homeworkSubmitted: 150,
    lessonActivitySubmitted: 80,
    profileReady: STUDENT_PROFILE_COMPLETION_MAX_XP,
  },
  teacher: {
    feedbackReviewed: 60,
    homeworkCreated: 30,
    lessonCreated: 35,
    liveSession: 25,
    profileReady: 15,
    studentLinked: 30,
  },
} as const;

export const CANDY_XP_FIRST_LEVEL_REQUIREMENT = 120;

export type CandyXpSubmissionStatus = string | null | undefined;

export type CandyXpActivityInput = {
  status?: CandyXpSubmissionStatus;
};

export type CandyXpSource = {
  description: string;
  label: string;
  preserveValue?: boolean;
  value: number;
  valueSuffix?: string;
  xp: number;
};

export type CandyXpRoadmapItem = {
  description: string;
  level: number;
  status: "active" | "done" | "locked";
  title: string;
};

export type CandyXpTrackItem = {
  level: number;
  requiredXp: number;
  status: "current" | "done" | "next";
};

export type CandyXpSpotlightCard = {
  description: string;
  status: string;
  title: string;
  unlocked: boolean;
};

export type CandyXpRecentEvent = {
  occurredAt: string;
  sourceLabel: string;
  xp: number;
};

export type CandyXpPersistenceSnapshot = {
  badgeCount: number;
  longestStreakDays: number;
  recentEvents: CandyXpRecentEvent[];
  sourceStats: Record<
    string,
    {
      value: number;
      xp: number;
    }
  >;
  streakDays: number;
  totalXp: number;
};

export type CandyXpSnapshot = {
  badgeCount: number;
  level: number;
  levelStartXp: number;
  longestStreakDays: number;
  nextGoals: string[];
  nextLevel: number;
  nextLevelTotalXp: number;
  percent: number;
  persisted: boolean;
  progressXp: number;
  recentEvents: CandyXpRecentEvent[];
  requiredXp: number;
  roadmap: CandyXpRoadmapItem[];
  role: CandyXpRole;
  sources: CandyXpSource[];
  spotlightCard: CandyXpSpotlightCard;
  streakDays: number;
  totalXp: number;
  track: CandyXpTrackItem[];
};

export type BuildCandyStudentXpSnapshotInput = {
  candyXpActivities?: CandyXpActivityInput[];
  homeworks: CandyXpActivityInput[];
  lessonActivities: CandyXpActivityInput[];
  profileCompletionPercent: number;
  profileCompletionXp: number;
};

export type BuildCandyTeacherXpSnapshotInput = {
  homeworksCount: number;
  lessonsCount: number;
  liveSessionsCount: number;
  pendingSubmissionsCount: number;
  profileReady: boolean;
  reviewedSubmissionsCount: number;
  studentsCount: number;
};

export type BuildCandyAdminXpSnapshotInput = {
  activeUsersCount: number;
  agendaHandledLessonsCount: number;
  agendaPendingLessonsCount: number;
  assignmentsCount: number;
  contractsCount: number;
  credentialsCount: number;
  financeStudentsCount: number;
  paidPaymentsCount: number;
  profileReady: boolean;
  studentsCount: number;
  teachersCount: number;
  unpaidPaymentsCount: number;
  usersCount: number;
};

type CandyXpRoadmapBaseItem = Omit<CandyXpRoadmapItem, "status">;

type BuildCandyXpSnapshotInput = {
  nextGoals: string[];
  roadmap: CandyXpRoadmapBaseItem[];
  role: CandyXpRole;
  sources: CandyXpSource[];
  spotlightCard: CandyXpSpotlightCard;
};

const STUDENT_XP_ROADMAP = [
  {
    description: "O resumo student mostra nivel, progresso e fontes de XP.",
    level: 1,
    title: "XP no AVA",
  },
  {
    description: "Homework entregue e aula concluida puxam a barra amarela.",
    level: 2,
    title: "Missoes de estudo",
  },
  {
    description: "Espaco visual reservado para minijogos de vocabulario e listening.",
    level: 3,
    title: "Card de jogos",
  },
  {
    description: "Badges para sequencia, feedbacks lidos e revisoes completas.",
    level: 5,
    title: "Conquistas Candy",
  },
  {
    description: "Evolucao pessoal por temporada sem expor ranking publico.",
    level: 8,
    title: "Temporadas",
  },
] satisfies CandyXpRoadmapBaseItem[];

const TEACHER_XP_ROADMAP = [
  {
    description: "Resumo teacher mostra operacao, alunos e XP pedagogico.",
    level: 1,
    title: "XP teacher",
  },
  {
    description: "Aulas, homeworks e correcoes aumentam a barra amarela.",
    level: 2,
    title: "Rotina ativa",
  },
  {
    description: "Missoes de turma e jogos aparecem como proxima camada.",
    level: 3,
    title: "Missoes teacher",
  },
  {
    description: "Badges por feedback, criacao de aula e acompanhamento.",
    level: 5,
    title: "Conquistas teacher",
  },
  {
    description: "Temporadas podem comparar evolucao da propria rotina.",
    level: 8,
    title: "Temporadas",
  },
] satisfies CandyXpRoadmapBaseItem[];

const ADMIN_XP_ROADMAP = [
  {
    description: "Painel admin mostra XP operacional sem ranking publico.",
    level: 1,
    title: "XP admin",
  },
  {
    description: "Usuarios ativos, vinculos, contratos e financeiro contam XP.",
    level: 2,
    title: "Operacao organizada",
  },
  {
    description: "Agenda e financeiro viram missoes semanais da gestao.",
    level: 3,
    title: "Missoes admin",
  },
  {
    description: "Badges podem marcar manutencao, cofre e rotina em dia.",
    level: 5,
    title: "Conquistas admin",
  },
  {
    description: "Temporadas ajudam a acompanhar maturidade operacional.",
    level: 8,
    title: "Temporadas",
  },
] satisfies CandyXpRoadmapBaseItem[];

function normalizeStatus(status: CandyXpSubmissionStatus) {
  return typeof status === "string" ? status.toUpperCase() : "";
}

function isSubmittedLike(status: CandyXpSubmissionStatus) {
  return ["RETURNED", "REVIEWED", "SUBMITTED"].includes(
    normalizeStatus(status),
  );
}

function isReviewed(status: CandyXpSubmissionStatus) {
  return normalizeStatus(status) === "REVIEWED";
}

export function requiredForCandyLevel(level: number) {
  const normalized = Math.max(1, Math.floor(level));
  const extra = Math.pow(Math.max(0, normalized - 1), 1.42) * 55;

  return Math.max(
    CANDY_XP_FIRST_LEVEL_REQUIREMENT,
    Math.round(CANDY_XP_FIRST_LEVEL_REQUIREMENT + extra),
  );
}

export function progressFromCandyXp(totalXp: number) {
  const safeTotal = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeTotal;
  let levelStartXp = 0;
  let requiredXp = requiredForCandyLevel(level);

  while (remaining >= requiredXp) {
    remaining -= requiredXp;
    levelStartXp += requiredXp;
    level += 1;
    requiredXp = requiredForCandyLevel(level);
  }

  const percent =
    requiredXp === 0
      ? 0
      : Math.min(100, Math.round((remaining / requiredXp) * 100));

  return {
    level,
    levelStartXp,
    nextLevel: level + 1,
    nextLevelTotalXp: levelStartXp + requiredXp,
    percent,
    progressXp: remaining,
    requiredXp,
  };
}

function getRoadmap(
  level: number,
  roadmap: CandyXpRoadmapBaseItem[],
): CandyXpRoadmapItem[] {
  return roadmap.map((item) => ({
    ...item,
    status:
      item.level < level ? "done" : item.level === level ? "active" : "locked",
  }));
}

function getInfiniteTrack(level: number): CandyXpTrackItem[] {
  const startLevel = Math.max(1, level - 2);

  return Array.from({ length: 7 }, (_, index) => {
    const trackLevel = startLevel + index;

    return {
      level: trackLevel,
      requiredXp: requiredForCandyLevel(trackLevel),
      status:
        trackLevel < level ? "done" : trackLevel === level ? "current" : "next",
    };
  });
}

function buildCandyXpSnapshot({
  nextGoals,
  roadmap,
  role,
  sources,
  spotlightCard,
}: BuildCandyXpSnapshotInput): CandyXpSnapshot {
  const totalXp = sources.reduce((total, source) => total + source.xp, 0);
  const progress = progressFromCandyXp(totalXp);

  return {
    badgeCount: 0,
    ...progress,
    longestStreakDays: 0,
    nextGoals,
    persisted: false,
    recentEvents: [],
    roadmap: getRoadmap(progress.level, roadmap),
    role,
    sources,
    spotlightCard,
    streakDays: 0,
    totalXp,
    track: getInfiniteTrack(progress.level),
  };
}

export function applyCandyXpPersistence(
  snapshot: CandyXpSnapshot,
  persistence?: CandyXpPersistenceSnapshot | null,
): CandyXpSnapshot {
  if (!persistence) {
    return snapshot;
  }

  const progress = progressFromCandyXp(persistence.totalXp);

  return {
    ...snapshot,
    ...progress,
    badgeCount: persistence.badgeCount,
    longestStreakDays: persistence.longestStreakDays,
    persisted: true,
    recentEvents: persistence.recentEvents,
    sources: snapshot.sources.map((source) => {
      const persistedSource = persistence.sourceStats[source.label];

      if (!persistedSource) {
        return source;
      }

      return {
        ...source,
        value: source.preserveValue ? source.value : persistedSource.value,
        xp: persistedSource.xp,
      };
    }),
    streakDays: persistence.streakDays,
    totalXp: persistence.totalXp,
    track: getInfiniteTrack(progress.level),
  };
}

function getStudentNextGoals(input: BuildCandyStudentXpSnapshotInput) {
  const candyXpActivities = input.candyXpActivities ?? [];
  const pendingHomeworks = input.homeworks.filter(
    (homework) => !isSubmittedLike(homework.status),
  ).length;
  const pendingLessonActivities = input.lessonActivities.filter(
    (activity) => !isSubmittedLike(activity.status),
  ).length;
  const pendingCandyXpActivities = candyXpActivities.filter(
    (activity) => !isReviewed(activity.status),
  ).length;
  const goals: string[] = [];

  if (pendingCandyXpActivities > 0) {
    goals.push("Concluir uma missao Candy XP publicada.");
  }

  if (pendingLessonActivities > 0) {
    goals.push("Concluir uma atividade em Aulas e Materiais.");
  }

  if (pendingHomeworks > 0) {
    goals.push("Entregar uma homework pendente.");
  }

  if (input.profileCompletionPercent < 100) {
    goals.push(
      "Completar dados principais e responsavel para liberar ate 350 XP.",
    );
  }

  if (goals.length === 0) {
    goals.push("Manter a sequencia: revisar feedbacks e esperar a proxima aula.");
  }

  return goals;
}

function getTeacherNextGoals(input: BuildCandyTeacherXpSnapshotInput) {
  const goals: string[] = [];

  if (input.pendingSubmissionsCount > 0) {
    goals.push("Corrigir respostas pendentes e devolver feedback.");
  }

  if (input.studentsCount === 0) {
    goals.push("Vincular alunos para liberar a rotina teacher.");
  }

  if (input.lessonsCount === 0) {
    goals.push("Criar uma primeira aula interativa.");
  }

  if (!input.profileReady) {
    goals.push("Completar perfil e avatar da teacher.");
  }

  if (goals.length === 0) {
    goals.push("Planejar a proxima missao de aula ou homework.");
  }

  return goals;
}

function getAdminNextGoals(input: BuildCandyAdminXpSnapshotInput) {
  const goals: string[] = [];

  if (input.assignmentsCount < input.studentsCount) {
    goals.push("Conferir alunos sem teacher vinculada.");
  }

  if (input.unpaidPaymentsCount > 0) {
    goals.push("Revisar pendencias do financeiro no mes atual.");
  }

  if (input.agendaPendingLessonsCount > 0) {
    goals.push("Acompanhar aulas da agenda ainda sem acao.");
  }

  if (!input.profileReady) {
    goals.push("Completar perfil e avatar do admin.");
  }

  if (goals.length === 0) {
    goals.push("Manter usuarios, agenda, financeiro e cofre revisados.");
  }

  return goals;
}

export function buildCandyStudentXpSnapshot(
  input: BuildCandyStudentXpSnapshotInput,
): CandyXpSnapshot {
  const candyXpActivities = input.candyXpActivities ?? [];
  const completedCandyXpActivities = candyXpActivities.filter((activity) =>
    isReviewed(activity.status),
  ).length;
  const submittedLessonActivities = input.lessonActivities.filter((activity) =>
    isSubmittedLike(activity.status),
  ).length;
  const submittedHomeworks = input.homeworks.filter((homework) =>
    isSubmittedLike(homework.status),
  ).length;
  const reviewedFeedbacks = [...input.lessonActivities, ...input.homeworks].filter(
    (activity) => isReviewed(activity.status),
  ).length;
  const profileCompletionPercent = Math.min(
    100,
    Math.max(0, Math.round(input.profileCompletionPercent)),
  );
  const profileXp = Math.min(
    CANDY_XP_REWARDS.student.profileReady,
    Math.max(0, Math.round(input.profileCompletionXp)),
  );
  const sources: CandyXpSource[] = [
    {
      description: "Historias e missoes Candy XP concluidas.",
      label: "Candy XP",
      value: completedCandyXpActivities,
      xp:
        completedCandyXpActivities *
        CANDY_XP_REWARDS.student.candyXpActivityCompleted,
    },
    {
      description: "Atividades respondidas dentro das aulas.",
      label: "Aulas finalizadas",
      value: submittedLessonActivities,
      xp:
        submittedLessonActivities *
        CANDY_XP_REWARDS.student.lessonActivitySubmitted,
    },
    {
      description: "Homeworks entregues ou devolvidas para refazer.",
      label: "Homeworks enviadas",
      value: submittedHomeworks,
      xp: submittedHomeworks * CANDY_XP_REWARDS.student.homeworkSubmitted,
    },
    {
      description: "Feedbacks corrigidos pela teacher.",
      label: "Feedbacks recebidos",
      value: reviewedFeedbacks,
      xp: reviewedFeedbacks * CANDY_XP_REWARDS.student.feedbackReviewed,
    },
    {
      description: "150 XP em dados principais + 200 XP em responsavel.",
      label: "Perfil preparado",
      preserveValue: true,
      value: profileCompletionPercent,
      valueSuffix: "%",
      xp: profileXp,
    },
  ];
  const progress = progressFromCandyXp(
    sources.reduce((total, source) => total + source.xp, 0),
  );
  const gamesUnlocked = progress.level >= 3;

  return buildCandyXpSnapshot({
    nextGoals: getStudentNextGoals(input),
    roadmap: STUDENT_XP_ROADMAP,
    role: "student",
    sources,
    spotlightCard: {
      description: gamesUnlocked
        ? "Pronto para receber minijogos de vocabulario, listening e revisao."
        : "O espaco ja esta preparado; os jogos entram na proxima fase.",
      status: gamesUnlocked ? "Preparado" : "Em preparacao",
      title: "Jogos Candy",
      unlocked: gamesUnlocked,
    },
  });
}

export function buildCandyTeacherXpSnapshot(
  input: BuildCandyTeacherXpSnapshotInput,
): CandyXpSnapshot {
  const profileXp = input.profileReady
    ? CANDY_XP_REWARDS.teacher.profileReady
    : 0;
  const sources: CandyXpSource[] = [
    {
      description: "Alunos vinculados a esta area teacher.",
      label: "Alunos vinculados",
      value: input.studentsCount,
      xp: input.studentsCount * CANDY_XP_REWARDS.teacher.studentLinked,
    },
    {
      description: "Aulas criadas para rotina e materiais.",
      label: "Aulas criadas",
      value: input.lessonsCount,
      xp: input.lessonsCount * CANDY_XP_REWARDS.teacher.lessonCreated,
    },
    {
      description: "Atividades preparadas para pratica.",
      label: "Homeworks criadas",
      value: input.homeworksCount,
      xp: input.homeworksCount * CANDY_XP_REWARDS.teacher.homeworkCreated,
    },
    {
      description: "Correcoes finalizadas com devolutiva ao aluno.",
      label: "Feedbacks dados",
      value: input.reviewedSubmissionsCount,
      xp:
        input.reviewedSubmissionsCount *
        CANDY_XP_REWARDS.teacher.feedbackReviewed,
    },
    {
      description: "Salas ao vivo abertas ou registradas.",
      label: "Aulas ao vivo",
      value: input.liveSessionsCount,
      xp: input.liveSessionsCount * CANDY_XP_REWARDS.teacher.liveSession,
    },
    {
      description: "Perfil com dados basicos ou avatar.",
      label: "Perfil preparado",
      value: input.profileReady ? 1 : 0,
      xp: profileXp,
    },
  ];

  return buildCandyXpSnapshot({
    nextGoals: getTeacherNextGoals(input),
    roadmap: TEACHER_XP_ROADMAP,
    role: "teacher",
    sources,
    spotlightCard: {
      description:
        input.pendingSubmissionsCount > 0
          ? "Corrigir respostas pendentes gera XP e libera o proximo passo do aluno."
          : "A rotina esta pronta para novas missoes de aula, homework e jogos.",
      status:
        input.pendingSubmissionsCount > 0
          ? `${input.pendingSubmissionsCount} pendente(s)`
          : "Em dia",
      title: "Missoes teacher",
      unlocked: input.pendingSubmissionsCount === 0,
    },
  });
}

export function buildCandyAdminXpSnapshot(
  input: BuildCandyAdminXpSnapshotInput,
): CandyXpSnapshot {
  const sources: CandyXpSource[] = [
    {
      description: "Usuarios ativos mantidos no AVA.",
      label: "Usuarios ativos",
      value: input.activeUsersCount,
      xp: input.activeUsersCount * CANDY_XP_REWARDS.admin.activeUser,
    },
    {
      description: "Teachers e alunos cadastrados.",
      label: "Comunidade",
      value: input.teachersCount + input.studentsCount,
      xp:
        input.teachersCount * CANDY_XP_REWARDS.admin.teacher +
        input.studentsCount * CANDY_XP_REWARDS.admin.student,
    },
    {
      description: "Vinculos aluno-teacher organizados.",
      label: "Vinculos",
      value: input.assignmentsCount,
      xp: input.assignmentsCount * CANDY_XP_REWARDS.admin.assignment,
    },
    {
      description: "Contratos enviados e controle financeiro cadastrado.",
      label: "Operacao",
      value: input.contractsCount + input.financeStudentsCount,
      xp:
        input.contractsCount * CANDY_XP_REWARDS.admin.contract +
        input.financeStudentsCount * CANDY_XP_REWARDS.admin.financialStudent,
    },
    {
      description: "Pagamentos marcados como pagos em 2026.",
      label: "Pagamentos",
      value: input.paidPaymentsCount,
      xp: input.paidPaymentsCount * CANDY_XP_REWARDS.admin.paidPayment,
    },
    {
      description: "Presencas, faltas ou reposicoes ja registradas.",
      label: "Agenda cuidada",
      value: input.agendaHandledLessonsCount,
      xp:
        input.agendaHandledLessonsCount *
        CANDY_XP_REWARDS.admin.agendaHandledLesson,
    },
    {
      description: "Credenciais organizadas no cofre admin.",
      label: "Cofre admin",
      value: input.credentialsCount,
      xp: input.credentialsCount * CANDY_XP_REWARDS.admin.credential,
    },
    {
      description: "Perfil admin com avatar pronto para o AVA.",
      label: "Perfil preparado",
      value: input.profileReady ? 1 : 0,
      xp: input.profileReady ? CANDY_XP_REWARDS.admin.profileReady : 0,
    },
  ];

  return buildCandyXpSnapshot({
    nextGoals: getAdminNextGoals(input),
    roadmap: ADMIN_XP_ROADMAP,
    role: "admin",
    sources,
    spotlightCard: {
      description:
        input.unpaidPaymentsCount > 0 || input.agendaPendingLessonsCount > 0
          ? "A gestao tem pontos de atencao em financeiro ou agenda."
          : "Usuarios, agenda e financeiro estao prontos para a proxima fase.",
      status:
        input.unpaidPaymentsCount > 0 || input.agendaPendingLessonsCount > 0
          ? "Revisar rotina"
          : "Operacao em dia",
      title: "Gestao Candy",
      unlocked:
        input.unpaidPaymentsCount === 0 && input.agendaPendingLessonsCount === 0,
    },
  });
}
