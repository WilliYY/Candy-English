import assert from "node:assert/strict";
import test from "node:test";

import {
  candyXpAnswersAreEqual,
  readCandyXpSubmissionAnswers,
  toMobileCandyXpQuestion,
} from "@/lib/candy-xp-submission-service";

test("sanitizes stored Candy XP answers", () => {
  assert.deepEqual(
    readCandyXpSubmissionAnswers([
      { questionId: "question-1", value: "Hello" },
      { questionId: "", value: "ignored" },
      { questionId: "question-2", value: 42 },
      null,
    ]),
    [{ questionId: "question-1", value: "Hello" }],
  );
});

test("compares Candy XP answers in their persisted order", () => {
  const answers = [{ questionId: "question-1", value: "Hello" }];

  assert.equal(candyXpAnswersAreEqual(answers, answers), true);
  assert.equal(
    candyXpAnswersAreEqual(answers, [
      { questionId: "question-1", value: "Different" },
    ]),
    false,
  );
});

test("maps a student question without exposing its correct answer", () => {
  assert.deepEqual(
    toMobileCandyXpQuestion({
      correctAnswer: { values: ["Blue"] },
      id: "question-1",
      options: {
        items: [{ text: "Blue" }, { text: "Green" }],
      },
      prompt: "Choose a color",
      required: true,
      sortOrder: 0,
      type: "MULTIPLE_CHOICE",
    }),
    {
      id: "question-1",
      options: [{ text: "Blue" }, { text: "Green" }],
      prompt: "Choose a color",
      required: true,
      sortOrder: 0,
      type: "MULTIPLE_CHOICE",
    },
  );
});
