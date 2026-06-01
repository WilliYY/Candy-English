export const CANDY_XP_REWARDS = {
  feedbackReviewed: 25,
  homeworkSubmitted: 50,
  lessonActivitySubmitted: 40,
  profileReady: 15,
} as const;

export const CANDY_XP_FIRST_LEVEL_REQUIREMENT = 120;

export type CandyXpSubmissionStatus = string | null | undefined;

export type CandyXpActivityInput = {
  status?: CandyXpSubmissionStatus;
};

export type CandyXpSource = {
  description: string;
  label: string;
  value: number;
  xp: number;
};

export type CandyXpRoadmapItem = {
  description: string;
  level: number;
  status: "active" | "done" | "locked";
  title: string;
};

export type CandyXpSnapshot = {
  gamesCard: {
    description: string;
    status: string;
    unlocked: boolean;
  };
  level: number;
  levelStartXp: number;
  nextGoals: string[];
  nextLevel: number;
  nextLevelTotalXp: number;
  percent: number;
  progressXp: number;
  requiredXp: number;
  roadmap: CandyXpRoadmapItem[];
  sources: CandyXpSource[];
  totalXp: number;
};

export type BuildCandyStudentXpSnapshotInput = {
  homeworks: CandyXpActivityInput[];
  lessonActivities: CandyXpActivityInput[];
  profileReady: boolean;
};

const CANDY_XP_ROADMAP_BASE = [
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
    description: "Badges para streaks, feedbacks lidos e revisoes completas.",
    level: 5,
    title: "Conquistas Candy",
  },
  {
    description: "Evolucao pessoal por temporada sem expor ranking publico.",
    level: 8,
    title: "Temporadas",
  },
] as const;

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
    requiredXp === 0 ? 0 : Math.min(100, Math.round((remaining / requiredXp) * 100));

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

function getRoadmap(level: number): CandyXpRoadmapItem[] {
  return CANDY_XP_ROADMAP_BASE.map((item) => ({
    ...item,
    status:
      item.level < level ? "done" : item.level === level ? "active" : "locked",
  }));
}

function getNextGoals(input: BuildCandyStudentXpSnapshotInput) {
  const pendingHomeworks = input.homeworks.filter(
    (homework) => !isSubmittedLike(homework.status),
  ).length;
  const pendingLessonActivities = input.lessonActivities.filter(
    (activity) => !isSubmittedLike(activity.status),
  ).length;
  const goals: string[] = [];

  if (pendingLessonActivities > 0) {
    goals.push("Concluir uma atividade em Aulas e Materiais.");
  }

  if (pendingHomeworks > 0) {
    goals.push("Entregar uma homework pendente.");
  }

  if (!input.profileReady) {
    goals.push("Completar perfil e avatar para deixar o AVA pronto.");
  }

  if (goals.length === 0) {
    goals.push("Manter a sequencia: revisar feedbacks e esperar a proxima aula.");
  }

  return goals;
}

export function buildCandyStudentXpSnapshot(
  input: BuildCandyStudentXpSnapshotInput,
): CandyXpSnapshot {
  const submittedLessonActivities = input.lessonActivities.filter((activity) =>
    isSubmittedLike(activity.status),
  ).length;
  const submittedHomeworks = input.homeworks.filter((homework) =>
    isSubmittedLike(homework.status),
  ).length;
  const reviewedFeedbacks = [...input.lessonActivities, ...input.homeworks].filter(
    (activity) => isReviewed(activity.status),
  ).length;
  const profileXp = input.profileReady ? CANDY_XP_REWARDS.profileReady : 0;
  const sources: CandyXpSource[] = [
    {
      description: "Atividades respondidas dentro das aulas.",
      label: "Aulas finalizadas",
      value: submittedLessonActivities,
      xp: submittedLessonActivities * CANDY_XP_REWARDS.lessonActivitySubmitted,
    },
    {
      description: "Homeworks entregues ou devolvidas para refazer.",
      label: "Homeworks enviadas",
      value: submittedHomeworks,
      xp: submittedHomeworks * CANDY_XP_REWARDS.homeworkSubmitted,
    },
    {
      description: "Feedbacks corrigidos pela teacher.",
      label: "Feedbacks recebidos",
      value: reviewedFeedbacks,
      xp: reviewedFeedbacks * CANDY_XP_REWARDS.feedbackReviewed,
    },
    {
      description: "Perfil com dados basicos ou avatar.",
      label: "Perfil preparado",
      value: input.profileReady ? 1 : 0,
      xp: profileXp,
    },
  ];
  const totalXp = sources.reduce((total, source) => total + source.xp, 0);
  const progress = progressFromCandyXp(totalXp);
  const gamesUnlocked = progress.level >= 3;

  return {
    ...progress,
    gamesCard: {
      description: gamesUnlocked
        ? "Pronto para receber minijogos de vocabulario, listening e revisao."
        : "O espaco ja esta preparado; os jogos entram na proxima fase.",
      status: gamesUnlocked ? "Preparado" : "Em preparacao",
      unlocked: gamesUnlocked,
    },
    nextGoals: getNextGoals(input),
    roadmap: getRoadmap(progress.level),
    sources,
    totalXp,
  };
}
