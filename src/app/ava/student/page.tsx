import type { Metadata } from "next";
import { AvaDashboard } from "@/components/ava/ava-dashboard";
import {
  normalizeStudentTask,
  StudentWorkspace,
} from "@/components/ava/student-workspace";
import { StudentMaintenanceScreen } from "@/components/ava/student-maintenance-screen";
import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { requireAvaRole } from "@/lib/authorization";
import { CANDY_XP_REWARDS } from "@/lib/candy-xp";
import {
  recordCandyXpEventsForUser,
  type CandyXpEventInput,
} from "@/lib/candy-xp-persistence";
import { getCattyMemoryManagementData } from "@/lib/catty-memory-management";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Student AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StudentPageProps = {
  searchParams?: Promise<{
    task?: string | string[];
  }>;
};

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER", "STUDENT"],
    "/ava/student",
  );
  const params = searchParams ? await searchParams : undefined;
  const requestedTask = Array.isArray(params?.task)
    ? params?.task[0]
    : params?.task;
  const activeTask = normalizeStudentTask(requestedTask);
  const maintenanceMode = await isMaintenanceModeEnabled();

  if (session.user.role === "STUDENT" && maintenanceMode) {
    return <StudentMaintenanceScreen />;
  }

  if (session.user.role !== "STUDENT") {
    return (
      <AvaDashboard
        title="Student"
        description="Area do aluno. Use uma conta STUDENT para visualizar aulas, homeworks e feedbacks como aluno."
        items={[
          "Materiais disponiveis",
          "Atividades online",
          "Feedbacks recebidos",
        ]}
        user={session.user}
      />
    );
  }

  const prisma = getPrisma();
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      birthDate: true,
      gender: true,
      guardianDocument: true,
      id: true,
      level: true,
      motherName: true,
      motherPhone: true,
      notes: true,
      studentPhone: true,
      studentPhoneAlt: true,
      user: {
        select: {
          address: true,
          avatarPath: true,
          email: true,
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  if (!studentProfile) {
    return (
      <AvaDashboard
        title="Student"
        description="Seu usuario ainda nao possui perfil de aluno vinculado."
        items={["Entre em contato com a administracao do AVA."]}
        user={session.user}
      />
    );
  }

  const [
    lessons,
    liveSessions,
    contracts,
    teacherAssignments,
    chatThreads,
    candyXpActivities,
    cattyMemoryData,
  ] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        status: "PUBLISHED",
        studentProfileId: studentProfile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        description: true,
        homeworks: {
          where: {
            status: "PUBLISHED",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            assetFileName: true,
            assetMimeType: true,
            assetPageCount: true,
            dueDate: true,
            fieldDetectionSource: true,
            id: true,
            instructions: true,
            interactiveFields: {
              orderBy: {
                sortOrder: "asc",
              },
              select: {
                height: true,
                id: true,
                label: true,
                page: true,
                placeholder: true,
                required: true,
                sortOrder: true,
                type: true,
                width: true,
                x: true,
                y: true,
              },
            },
            kind: true,
            questions: {
              orderBy: {
                sortOrder: "asc",
              },
              select: {
                id: true,
                prompt: true,
              },
              take: 1,
            },
            submissions: {
              where: {
                studentProfileId: studentProfile.id,
              },
              select: {
                answers: true,
                feedback: true,
                id: true,
                status: true,
                submittedAt: true,
              },
              take: 1,
            },
            title: true,
          },
        },
        id: true,
        materials: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            content: true,
            id: true,
            title: true,
            type: true,
            url: true,
          },
        },
        scheduledAt: true,
        teacherProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        title: true,
        vocabularyItems: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            example: true,
            id: true,
            term: true,
            translation: true,
          },
        },
      },
    }),
    prisma.liveSession.findMany({
      where: {
        isLive: true,
        OR: [
          { studentProfileId: null },
          { studentProfileId: studentProfile.id },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        isLive: true,
        meetUrl: true,
        startsAt: true,
        teacherProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        title: true,
      },
    }),
    prisma.contractDocument.findMany({
      where: {
        OR: [
          { studentProfileId: null },
          { studentProfileId: studentProfile.id },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        sizeBytes: true,
        title: true,
      },
    }),
    prisma.studentTeacherAssignment.findMany({
      where: {
        studentProfileId: studentProfile.id,
      },
      orderBy: {
        teacherProfile: {
          user: {
            name: "asc",
          },
        },
      },
      select: {
        teacherProfileId: true,
        teacherProfile: {
          select: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.chatThread.findMany({
      where: {
        studentProfileId: studentProfile.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            body: true,
            createdAt: true,
            id: true,
            senderUser: {
              select: {
                name: true,
                role: true,
              },
            },
          },
          take: 50,
        },
        studentProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        studentProfileId: true,
        teacherProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        teacherProfileId: true,
      },
    }),
    prisma.candyXpActivity.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          {
            assignments: {
              none: {},
            },
          },
          {
            assignments: {
              some: {
                studentProfileId: studentProfile.id,
              },
            },
          },
        ],
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        assetFileName: true,
        category: true,
        description: true,
        id: true,
        level: true,
        questions: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            id: true,
            options: true,
            prompt: true,
            required: true,
            sortOrder: true,
            type: true,
          },
        },
        submissions: {
          where: {
            studentProfileId: studentProfile.id,
          },
          select: {
            answers: true,
            autoScorePercent: true,
            awardedXp: true,
            feedback: true,
            id: true,
            status: true,
            submittedAt: true,
          },
          take: 1,
        },
        title: true,
        xpReward: true,
      },
    }),
    getCattyMemoryManagementData({
      viewerRole: "STUDENT",
      viewerUserId: session.user.id,
    }),
  ]);
  const profileReady = Boolean(
    studentProfile.user.avatarPath ||
      studentProfile.user.phone ||
      studentProfile.level ||
      studentProfile.studentPhone,
  );
  const studentXpEvents: CandyXpEventInput[] = [];

  if (profileReady) {
    studentXpEvents.push({
      kind: "PROFILE_READY",
      sourceKey: `student:profile-ready:${studentProfile.id}`,
      sourceLabel: "Perfil preparado",
      xp: CANDY_XP_REWARDS.student.profileReady,
    });
  }

  for (const lesson of lessons) {
    for (const homework of lesson.homeworks) {
      const submission = homework.submissions[0];
      const status = submission?.status;
      const isSubmittedLike =
        status === "RETURNED" || status === "REVIEWED" || status === "SUBMITTED";
      const isLessonActivity =
        homework.kind === "INTERACTIVE" &&
        homework.fieldDetectionSource === "lesson-manual";

      if (isSubmittedLike) {
        studentXpEvents.push({
          kind: isLessonActivity
            ? "LESSON_ACTIVITY_SUBMITTED"
            : "HOMEWORK_SUBMITTED",
          sourceKey: isLessonActivity
            ? `student:lesson-activity-submitted:${homework.id}`
            : `student:homework-submitted:${homework.id}`,
          sourceLabel: isLessonActivity
            ? "Aulas finalizadas"
            : "Homeworks enviadas",
          xp: isLessonActivity
            ? CANDY_XP_REWARDS.student.lessonActivitySubmitted
            : CANDY_XP_REWARDS.student.homeworkSubmitted,
        });
      }

      if (status === "REVIEWED" && submission) {
        studentXpEvents.push({
          kind: "FEEDBACK_REVIEWED",
          sourceKey: `student:feedback-reviewed:${submission.id}`,
          sourceLabel: "Feedbacks recebidos",
          xp: CANDY_XP_REWARDS.student.feedbackReviewed,
        });
      }
    }
  }

  const candyXpPersistence = await recordCandyXpEventsForUser({
    events: studentXpEvents,
    role: "STUDENT",
    userId: session.user.id,
  });

  return (
    <StudentWorkspace
      activeTask={activeTask}
      candyXpActivities={candyXpActivities.map((activity) => ({
        assetFileName: activity.assetFileName,
        category: activity.category,
        description: activity.description,
        id: activity.id,
        level: activity.level,
        questions: activity.questions.map((question) => ({
          id: question.id,
          options: question.options,
          prompt: question.prompt,
          required: question.required,
          sortOrder: question.sortOrder,
          type: question.type,
        })),
        submission: activity.submissions[0]
          ? {
              answers: activity.submissions[0].answers,
              autoScorePercent: activity.submissions[0].autoScorePercent,
              awardedXp: activity.submissions[0].awardedXp,
              feedback: activity.submissions[0].feedback,
              id: activity.submissions[0].id,
              status: activity.submissions[0].status,
              submittedAt:
                activity.submissions[0].submittedAt?.toISOString() ?? null,
            }
          : null,
        title: activity.title,
        xpReward: activity.xpReward,
      }))}
      candyXpPersistence={candyXpPersistence}
      cattyMemoryData={cattyMemoryData}
      chatThreads={chatThreads.map((thread) => ({
        id: thread.id,
        messages: thread.messages.map((message) => ({
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          id: message.id,
          senderName: message.senderUser.name,
          senderRole: message.senderUser.role,
        })),
        studentName: thread.studentProfile.user.name,
        studentProfileId: thread.studentProfileId,
        teacherName: thread.teacherProfile.user.name,
        teacherProfileId: thread.teacherProfileId,
      }))}
      contracts={contracts}
      currentUser={studentProfile.user}
      lessons={lessons}
      liveSessions={liveSessions.map((liveSession) => ({
        id: liveSession.id,
        isLive: liveSession.isLive,
        meetUrl: liveSession.meetUrl,
        startsAt: liveSession.startsAt,
        teacherName: liveSession.teacherProfile.user.name,
        title: liveSession.title,
      }))}
      studentProfileId={studentProfile.id}
      studentProfile={{
        birthDate: studentProfile.birthDate,
        gender: studentProfile.gender,
        guardianDocument: studentProfile.guardianDocument,
        level: studentProfile.level,
        motherName: studentProfile.motherName,
        motherPhone: studentProfile.motherPhone,
        notes: studentProfile.notes,
        studentPhone: studentProfile.studentPhone,
        studentPhoneAlt: studentProfile.studentPhoneAlt,
      }}
      teachers={teacherAssignments.map((assignment) => ({
        id: assignment.teacherProfileId,
        label: `${assignment.teacherProfile.user.name} - ${assignment.teacherProfile.user.email}`,
      }))}
    />
  );
}
