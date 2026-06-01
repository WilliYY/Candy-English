export type CandyXpActivityQuestionType =
  | "CHECKBOX"
  | "LONG_TEXT"
  | "MATCHING"
  | "MULTIPLE_CHOICE"
  | "SHORT_TEXT";

export type CandyXpActivityQuestionForEvaluation = {
  correctAnswer: unknown;
  id: string;
  options: unknown;
  required: boolean;
  type: CandyXpActivityQuestionType;
};

export type CandyXpActivityAnswerForEvaluation = {
  questionId: string;
  value: string;
};

type CandyXpQuestionOption = {
  match?: string;
  text: string;
};

type CandyXpCorrectAnswer = {
  pairs?: {
    left: string;
    right: string;
  }[];
  values?: string[];
};

export function estimateCandyXpAssetPageCount(buffer: Buffer, mimeType: string) {
  if (mimeType !== "application/pdf") {
    return 1;
  }

  const pdfText = buffer.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);

  return Math.max(1, pageMatches?.length ?? 1);
}

export function getCandyXpQuestionOptions(
  options: unknown,
): CandyXpQuestionOption[] {
  if (
    typeof options !== "object" ||
    options === null ||
    !("items" in options) ||
    !Array.isArray((options as { items?: unknown }).items)
  ) {
    return [];
  }

  return (options as { items: unknown[] }).items
    .map((item): CandyXpQuestionOption | null => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("text" in item) ||
        typeof item.text !== "string"
      ) {
        return null;
      }

      const option: CandyXpQuestionOption = {
        text: item.text,
      };

      if ("match" in item && typeof item.match === "string") {
        option.match = item.match;
      }

      return option;
    })
    .filter((item): item is CandyXpQuestionOption => item !== null);
}

function getCorrectAnswer(value: unknown): CandyXpCorrectAnswer {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const source = value as {
    pairs?: unknown;
    values?: unknown;
  };
  const values = Array.isArray(source.values)
    ? source.values.filter((item): item is string => typeof item === "string")
    : undefined;
  const pairs = Array.isArray(source.pairs)
    ? source.pairs
        .map((pair) => {
          if (
            typeof pair !== "object" ||
            pair === null ||
            !("left" in pair) ||
            !("right" in pair) ||
            typeof pair.left !== "string" ||
            typeof pair.right !== "string"
          ) {
            return null;
          }

          return {
            left: pair.left,
            right: pair.right,
          };
        })
        .filter((pair): pair is { left: string; right: string } => pair !== null)
    : undefined;

  return {
    pairs,
    values,
  };
}

function normalizeForComparison(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function parseMatchingMap(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function hasAnswerValue(
  question: CandyXpActivityQuestionForEvaluation,
  value: string,
) {
  if (question.type === "CHECKBOX") {
    return parseStringArray(value).length > 0;
  }

  if (question.type === "MATCHING") {
    return Object.keys(parseMatchingMap(value)).length > 0;
  }

  return value.trim().length > 0;
}

function areStringSetsEqual(left: string[], right: string[]) {
  const normalizedLeft = left.map(normalizeForComparison).sort();
  const normalizedRight = right.map(normalizeForComparison).sort();

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((item, index) => item === normalizedRight[index])
  );
}

function isObjectiveQuestionCorrect(
  question: CandyXpActivityQuestionForEvaluation,
  value: string,
) {
  const correctAnswer = getCorrectAnswer(question.correctAnswer);

  if (question.type === "MULTIPLE_CHOICE") {
    const expected = correctAnswer.values?.[0];

    return Boolean(
      expected &&
        normalizeForComparison(value) === normalizeForComparison(expected),
    );
  }

  if (question.type === "CHECKBOX") {
    return areStringSetsEqual(parseStringArray(value), correctAnswer.values ?? []);
  }

  if (question.type === "MATCHING") {
    const answerMap = parseMatchingMap(value);
    const pairs = correctAnswer.pairs ?? [];

    return (
      pairs.length > 0 &&
      pairs.every(
        (pair) =>
          normalizeForComparison(answerMap[pair.left] ?? "") ===
          normalizeForComparison(pair.right),
      )
    );
  }

  return false;
}

export function evaluateCandyXpActivityAnswers(input: {
  answers: CandyXpActivityAnswerForEvaluation[];
  questions: CandyXpActivityQuestionForEvaluation[];
}) {
  const answerMap = new Map(
    input.answers.map((answer) => [answer.questionId, answer.value]),
  );
  const hasManualQuestions = input.questions.some(
    (question) => question.type === "SHORT_TEXT" || question.type === "LONG_TEXT",
  );
  const objectiveQuestions = input.questions.filter(
    (question) =>
      question.type === "MULTIPLE_CHOICE" ||
      question.type === "CHECKBOX" ||
      question.type === "MATCHING",
  );
  const hasMissingRequired = input.questions.some((question) => {
    if (!question.required) {
      return false;
    }

    return !hasAnswerValue(question, answerMap.get(question.id) ?? "");
  });
  const correctObjectiveCount = objectiveQuestions.filter((question) =>
    isObjectiveQuestionCorrect(question, answerMap.get(question.id) ?? ""),
  ).length;
  const autoScorePercent =
    objectiveQuestions.length === 0
      ? null
      : Math.round((correctObjectiveCount / objectiveQuestions.length) * 100);

  return {
    allObjectiveCorrect:
      objectiveQuestions.length === 0 ||
      correctObjectiveCount === objectiveQuestions.length,
    autoScorePercent,
    correctObjectiveCount,
    hasManualQuestions,
    hasMissingRequired,
    objectiveCount: objectiveQuestions.length,
  };
}
