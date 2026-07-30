import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMobileStudentProfileXpEvents,
  toMobileCandyXpActivity,
  toMobileCandyXpRanking,
} from "@/lib/mobile-candy-xp";

test("builds stable profile and avatar XP events for a student", () => {
  const events = buildMobileStudentProfileXpEvents({
    address: "Rua Candy, 10",
    avatarPath: "private/avatars/student.jpg",
    birthDate: new Date("2010-05-20T00:00:00.000Z"),
    guardianDocument: "12345678900",
    id: "student-profile-1",
    motherName: "Responsavel",
    motherPhone: "44999999999",
    name: "Candy Student",
    phone: "44988888888",
    studentPhone: "44977777777",
  });

  assert.deepEqual(
    events.map((event) => event.sourceKey),
    [
      "student:profile-ready:student-profile-1",
      "student:profile-photo:first:student-profile-1",
    ],
  );
  assert.ok(events.every((event) => event.xp > 0));
});

test("maps ranking without exposing user IDs or avatar storage paths", () => {
  const ranking = toMobileCandyXpRanking({
    currentUserEntry: null,
    currentUserRanking: {
      categoryLabel: "alunos",
      categoryTitle: "Ranking Candy",
      hasXp: true,
      position: 2,
      totalInCategory: 5,
      totalXp: 500,
      xpToNextLevel: 20,
    },
    generatedAt: "2026-07-30T12:00:00.000Z",
    topEntries: [
      {
        avatarPath: "private/avatars/student.jpg",
        isCurrentUser: true,
        lastXpEventAt: "2026-07-30T11:00:00.000Z",
        level: 3,
        name: "Candy Student",
        position: 1,
        progressPercent: 70,
        progressXp: 70,
        requiredXp: 100,
        role: "STUDENT",
        roleLabel: "Aluno",
        totalXp: 500,
        userId: "private-user-id",
        xpToNextLevel: 30,
      },
    ],
    totalRanked: 5,
  });
  const serialized = JSON.stringify(ranking);

  assert.equal(ranking.topEntries[0]?.name, "Candy Student");
  assert.doesNotMatch(serialized, /avatarPath|private\/avatars|private-user-id|userId/);
});

test("maps only the activity summary required before submission", () => {
  const activity = toMobileCandyXpActivity({
    _count: {
      interactiveFields: 4,
      questions: 2,
    },
    assetMimeType: "application/pdf",
    assetPageCount: 3,
    category: "Vocabulary",
    description: "Revise as palavras da aula.",
    id: "activity-1",
    level: "A1",
    submissions: [
      {
        autoScorePercent: null,
        awardedXp: null,
        feedback: null,
        id: "submission-1",
        status: "DRAFT",
        submittedAt: null,
      },
    ],
    title: "Candy Colors",
    xpReward: 80,
  });

  assert.deepEqual(activity, {
    assetKind: "PDF",
    assetPageCount: 3,
    category: "Vocabulary",
    description: "Revise as palavras da aula.",
    id: "activity-1",
    interactiveFieldCount: 4,
    level: "A1",
    questionCount: 2,
    submission: {
      autoScorePercent: null,
      awardedXp: null,
      feedback: null,
      id: "submission-1",
      status: "DRAFT",
      submittedAt: null,
    },
    title: "Candy Colors",
    xpReward: 80,
  });
});
