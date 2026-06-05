import type { Metadata } from "next";
import {
  AdminUsersPanel,
  normalizeAdminTask,
} from "@/components/ava/admin-users-panel";
import { syncEnvironmentAdminCredentials } from "@/lib/admin-credentials";
import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { requireAvaRole } from "@/lib/authorization";
import { CANDY_XP_REWARDS } from "@/lib/candy-xp";
import {
  recordCandyXpEventsForUser,
  type CandyXpEventInput,
} from "@/lib/candy-xp-persistence";
import { getPrisma } from "@/lib/prisma";
import { getStorageUsageBytes } from "@/lib/storage";
import type {
  CattyLearningCategoryInput,
  CattyLearningFeedbackKindInput,
  CattyLearningIntentInput,
} from "@/lib/validations/catty-learning";
import { studentPreRegistrationStatusSchema } from "@/lib/validations/pre-registration";

export const metadata: Metadata = {
  title: "Admin AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminPageProps = {
  searchParams?: Promise<{
    preStatus?: string | string[];
    task?: string | string[];
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireAvaRole(["ADMIN"], "/ava/admin");
  const prisma = getPrisma();
  const params = searchParams ? await searchParams : undefined;
  const requestedTask = Array.isArray(params?.task)
    ? params?.task[0]
    : params?.task;
  const activeTask = normalizeAdminTask(requestedTask);
  const requestedPreRegistrationStatus = Array.isArray(params?.preStatus)
    ? params?.preStatus[0]
    : params?.preStatus;
  const parsedPreRegistrationStatus =
    studentPreRegistrationStatusSchema.safeParse(
      requestedPreRegistrationStatus,
    );
  const preRegistrationStatus = parsedPreRegistrationStatus.success
    ? parsedPreRegistrationStatus.data
    : "PENDING";

  await syncEnvironmentAdminCredentials(session.user.id);

  const [
    currentUser,
    users,
    teachers,
    students,
    assignments,
    contracts,
    financeStudents,
    financeLogs,
    agendaStudents,
    agendaLessons,
    agendaLogs,
    maintenanceMode,
    storageUsageBytes,
    adminCredentials,
    cattyLearningFeedbacks,
    cattyLearningItems,
    candyXpActivities,
    studentPreRegistrations,
    studentPreRegistrationStatusCounts,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        avatarPath: true,
        email: true,
        id: true,
        name: true,
        role: true,
      },
    }),
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        _count: {
          select: {
            sentChatMessages: true,
            uploadedContracts: true,
          },
        },
        createdAt: true,
        email: true,
        id: true,
        isActive: true,
        name: true,
        role: true,
        studentProfile: {
          select: {
            _count: {
              select: {
                chatThreads: true,
                contracts: true,
                lessons: true,
                liveSessions: true,
                submissions: true,
                teacherAssignments: true,
              },
            },
            level: true,
          },
        },
        teacherProfile: {
          select: {
            _count: {
              select: {
                chatThreads: true,
                homeworks: true,
                lessons: true,
                liveSessions: true,
                reviewedSubmissions: true,
                studentAssignments: true,
              },
            },
            bio: true,
          },
        },
      },
    }),
    prisma.teacherProfile.findMany({
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        id: true,
        user: {
          select: {
            email: true,
            isActive: true,
            name: true,
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        id: true,
        level: true,
        user: {
          select: {
            email: true,
            isActive: true,
            name: true,
          },
        },
      },
    }),
    prisma.studentTeacherAssignment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        studentProfileId: true,
        teacherProfileId: true,
        studentProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.contractDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        sizeBytes: true,
        studentProfile: {
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
    prisma.financialStudent.findMany({
      orderBy: [
        {
          paymentDay: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        address: true,
        amountCents: true,
        cpf: true,
        email: true,
        id: true,
        name: true,
        paymentMethod: true,
        paymentDay: true,
        phone: true,
        payments: {
          where: {
            year: 2026,
          },
          select: {
            id: true,
            isActive: true,
            isPaid: true,
            month: true,
            note: true,
            paidAt: true,
            snapshotAddress: true,
            snapshotAmountCents: true,
            snapshotCpf: true,
            snapshotEmail: true,
            snapshotName: true,
            snapshotPaymentDay: true,
            snapshotPaymentMethod: true,
            snapshotPhone: true,
            updatedAt: true,
            year: true,
          },
        },
      },
    }),
    prisma.financialLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        action: true,
        createdAt: true,
        description: true,
        id: true,
        student: {
          select: {
            name: true,
          },
        },
      },
      take: 30,
    }),
    prisma.agendaStudent.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    }),
    prisma.agendaLesson.findMany({
      orderBy: [
        {
          date: "asc",
        },
        {
          time: "asc",
        },
      ],
      where: {
        year: 2026,
      },
      select: {
        date: true,
        id: true,
        isActive: true,
        isMakeup: true,
        makeupForLessonId: true,
        month: true,
        notes: true,
        status: true,
        studentId: true,
        student: {
          select: {
            name: true,
            notes: true,
            phone: true,
          },
        },
        time: true,
        weekday: true,
        year: true,
      },
    }),
    prisma.agendaLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        description: true,
        id: true,
        student: {
          select: {
            name: true,
          },
        },
      },
      take: 30,
    }),
    isMaintenanceModeEnabled(),
    getStorageUsageBytes(),
    prisma.adminCredential.findMany({
      orderBy: [
        {
          source: "asc",
        },
        {
          service: "asc",
        },
        {
          label: "asc",
        },
      ],
      select: {
        createdAt: true,
        id: true,
        kind: true,
        label: true,
        notes: true,
        secretPreview: true,
        service: true,
        source: true,
        sourceKey: true,
        updatedAt: true,
        url: true,
        username: true,
      },
    }),
    prisma.cattyLearningFeedback.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        cattyReply: true,
        contextArea: true,
        contextTask: true,
        createdAt: true,
        createdByUser: {
          select: {
            name: true,
            role: true,
          },
        },
        id: true,
        idealReply: true,
        item: {
          select: {
            title: true,
          },
        },
        kind: true,
        note: true,
        reviewedAt: true,
        reviewedByUser: {
          select: {
            name: true,
          },
        },
        status: true,
        suggestedCategory: true,
        suggestedIntent: true,
        suggestedTitle: true,
        userPrompt: true,
      },
      take: 80,
    }),
    prisma.cattyLearningItem.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        approvedAt: true,
        approvedByUser: {
          select: {
            name: true,
          },
        },
        badReply: true,
        category: true,
        createdAt: true,
        createdByUser: {
          select: {
            name: true,
          },
        },
        id: true,
        idealReply: true,
        intent: true,
        notes: true,
        status: true,
        tags: true,
        title: true,
        userPrompt: true,
      },
      take: 80,
    }),
    prisma.candyXpActivity.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        assignments: {
          select: {
            studentProfile: {
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
        },
        assetFileName: true,
        category: true,
        createdAt: true,
        description: true,
        id: true,
        level: true,
        publishedAt: true,
        questions: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            correctAnswer: true,
            id: true,
            options: true,
            prompt: true,
            required: true,
            sortOrder: true,
            type: true,
          },
        },
        status: true,
        submissions: {
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            answers: true,
            autoScorePercent: true,
            awardedXp: true,
            feedback: true,
            id: true,
            reviewedAt: true,
            status: true,
            studentProfile: {
              select: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
            submittedAt: true,
          },
        },
        title: true,
        xpReward: true,
      },
    }),
    prisma.studentPreRegistration.findMany({
      where: {
        status: preRegistrationStatus,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        address: true,
        birthDate: true,
        convertedUser: {
          select: {
            email: true,
            name: true,
          },
        },
        createdAt: true,
        email: true,
        englishGoal: true,
        fullName: true,
        guardianDocument: true,
        guardianName: true,
        guardianPhone: true,
        id: true,
        notes: true,
        phone: true,
        reviewedAt: true,
        reviewedByUser: {
          select: {
            name: true,
          },
        },
        secondaryContact: true,
        status: true,
        statusNote: true,
        studentPhone: true,
      },
    }),
    Promise.all([
      prisma.studentPreRegistration.count({ where: { status: "PENDING" } }),
      prisma.studentPreRegistration.count({ where: { status: "CONTACTED" } }),
      prisma.studentPreRegistration.count({ where: { status: "APPROVED" } }),
      prisma.studentPreRegistration.count({ where: { status: "REJECTED" } }),
    ]),
  ]);
  const currentDate = new Date();
  const initialFinanceMonth =
    currentDate.getFullYear() === 2026 ? currentDate.getMonth() + 1 : 1;
  const initialAgendaMonth = initialFinanceMonth;
  const adminXpEvents: CandyXpEventInput[] = [];

  if (currentUser?.avatarPath) {
    adminXpEvents.push({
      kind: "PROFILE_READY",
      sourceKey: `admin:profile-ready:${session.user.id}`,
      sourceLabel: "Perfil preparado",
      xp: CANDY_XP_REWARDS.admin.profileReady,
    });
  }

  for (const user of users) {
    if (user.isActive) {
      adminXpEvents.push({
        kind: "ADMIN_ROUTINE",
        sourceKey: `admin:active-user:${user.id}`,
        sourceLabel: "Usuarios ativos",
        xp: CANDY_XP_REWARDS.admin.activeUser,
      });
    }

    if (user.role === "TEACHER") {
      adminXpEvents.push({
        kind: "ADMIN_ROUTINE",
        sourceKey: `admin:teacher:${user.id}`,
        sourceLabel: "Comunidade",
        xp: CANDY_XP_REWARDS.admin.teacher,
      });
    }

    if (user.role === "STUDENT") {
      adminXpEvents.push({
        kind: "ADMIN_ROUTINE",
        sourceKey: `admin:student:${user.id}`,
        sourceLabel: "Comunidade",
        xp: CANDY_XP_REWARDS.admin.student,
      });
    }
  }

  for (const assignment of assignments) {
    adminXpEvents.push({
      kind: "ADMIN_ROUTINE",
      sourceKey: `admin:assignment:${assignment.id}`,
      sourceLabel: "Vinculos",
      xp: CANDY_XP_REWARDS.admin.assignment,
    });
  }

  for (const contract of contracts) {
    adminXpEvents.push({
      kind: "ADMIN_ROUTINE",
      sourceKey: `admin:contract:${contract.id}`,
      sourceLabel: "Operacao",
      xp: CANDY_XP_REWARDS.admin.contract,
    });
  }

  for (const financeStudent of financeStudents) {
    adminXpEvents.push({
      kind: "ADMIN_ROUTINE",
      sourceKey: `admin:financial-student:${financeStudent.id}`,
      sourceLabel: "Operacao",
      xp: CANDY_XP_REWARDS.admin.financialStudent,
    });

    for (const payment of financeStudent.payments) {
      if (payment.isActive && payment.isPaid) {
        adminXpEvents.push({
          kind: "ADMIN_ROUTINE",
          sourceKey: `admin:paid-payment:${payment.id}`,
          sourceLabel: "Pagamentos",
          xp: CANDY_XP_REWARDS.admin.paidPayment,
        });
      }
    }
  }

  for (const agendaLesson of agendaLessons) {
    if (
      agendaLesson.isActive &&
      ["ATTENDED", "MAKEUP_ATTENDED", "MISSED"].includes(agendaLesson.status)
    ) {
      adminXpEvents.push({
        kind: "ADMIN_ROUTINE",
        sourceKey: `admin:agenda-handled:${agendaLesson.id}`,
        sourceLabel: "Agenda cuidada",
        xp: CANDY_XP_REWARDS.admin.agendaHandledLesson,
      });
    }
  }

  for (const credential of adminCredentials) {
    adminXpEvents.push({
      kind: "ADMIN_ROUTINE",
      sourceKey: `admin:credential:${credential.id}`,
      sourceLabel: "Cofre admin",
      xp: CANDY_XP_REWARDS.admin.credential,
    });
  }

  const candyXpPersistence = await recordCandyXpEventsForUser({
    events: adminXpEvents,
    role: "ADMIN",
    userId: session.user.id,
  });

  return (
    <AdminUsersPanel
      activeTask={activeTask}
      adminCredentials={adminCredentials.map((credential) => ({
        createdAt: credential.createdAt.toISOString(),
        id: credential.id,
        kind: credential.kind,
        label: credential.label,
        notes: credential.notes,
        secretPreview: credential.secretPreview,
        service: credential.service,
        source: credential.source,
        sourceKey: credential.sourceKey,
        updatedAt: credential.updatedAt.toISOString(),
        url: credential.url,
        username: credential.username,
      }))}
      candyXpActivities={candyXpActivities.map((activity) => ({
        assignments: activity.assignments.map((assignment) => ({
          studentEmail: assignment.studentProfile.user.email,
          studentName: assignment.studentProfile.user.name,
        })),
        assetFileName: activity.assetFileName,
        category: activity.category,
        createdAt: activity.createdAt.toISOString(),
        description: activity.description,
        id: activity.id,
        level: activity.level,
        publishedAt: activity.publishedAt?.toISOString() ?? null,
        questions: activity.questions.map((question) => ({
          correctAnswer: question.correctAnswer,
          id: question.id,
          options: question.options,
          prompt: question.prompt,
          required: question.required,
          sortOrder: question.sortOrder,
          type: question.type,
        })),
        status: activity.status,
        submissions: activity.submissions.map((submission) => ({
          answers: submission.answers,
          autoScorePercent: submission.autoScorePercent,
          awardedXp: submission.awardedXp,
          feedback: submission.feedback,
          id: submission.id,
          reviewedAt: submission.reviewedAt?.toISOString() ?? null,
          status: submission.status,
          studentEmail: submission.studentProfile.user.email,
          studentName: submission.studentProfile.user.name,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        })),
        title: activity.title,
        xpReward: activity.xpReward,
      }))}
      cattyLearningFeedbacks={cattyLearningFeedbacks.map((feedback) => ({
        cattyReply: feedback.cattyReply,
        contextArea: feedback.contextArea,
        contextTask: feedback.contextTask,
        createdAt: feedback.createdAt.toISOString(),
        createdByName: feedback.createdByUser?.name ?? null,
        createdByRole: feedback.createdByUser?.role ?? null,
        id: feedback.id,
        idealReply: feedback.idealReply,
        itemTitle: feedback.item?.title ?? null,
        kind: feedback.kind as CattyLearningFeedbackKindInput,
        note: feedback.note,
        reviewedAt: feedback.reviewedAt?.toISOString() ?? null,
        reviewedByName: feedback.reviewedByUser?.name ?? null,
        status: feedback.status,
        suggestedCategory:
          feedback.suggestedCategory as CattyLearningCategoryInput | null,
        suggestedIntent:
          feedback.suggestedIntent as CattyLearningIntentInput | null,
        suggestedTitle: feedback.suggestedTitle,
        userPrompt: feedback.userPrompt,
      }))}
      cattyLearningItems={cattyLearningItems.map((item) => ({
        approvedAt: item.approvedAt?.toISOString() ?? null,
        approvedByName: item.approvedByUser?.name ?? null,
        badReply: item.badReply,
        category: item.category,
        createdAt: item.createdAt.toISOString(),
        createdByName: item.createdByUser?.name ?? null,
        id: item.id,
        idealReply: item.idealReply,
        intent: item.intent as CattyLearningIntentInput | null,
        notes: item.notes,
        status: item.status,
        tags: item.tags,
        title: item.title,
        userPrompt: item.userPrompt,
      }))}
      candyXpPersistence={candyXpPersistence}
      agendaLessons={agendaLessons.map((lesson) => ({
        date: lesson.date.toISOString(),
        id: lesson.id,
        isActive: lesson.isActive,
        isMakeup: lesson.isMakeup,
        makeupForLessonId: lesson.makeupForLessonId,
        month: lesson.month,
        notes: lesson.notes,
        status: lesson.status,
        studentId: lesson.studentId,
        studentName: lesson.student.name,
        studentNotes: lesson.student.notes,
        studentPhone: lesson.student.phone,
        time: lesson.time,
        weekday: lesson.weekday,
        year: lesson.year,
      }))}
      agendaLogs={agendaLogs.map((log) => ({
        createdAt: log.createdAt.toISOString(),
        description: log.description,
        id: log.id,
        studentName: log.student?.name ?? null,
      }))}
      agendaStudents={agendaStudents.map((student) => ({
        id: student.id,
        name: student.name,
        phone: student.phone,
      }))}
      assignments={assignments.map((assignment) => ({
        createdAt: assignment.createdAt,
        id: assignment.id,
        studentName: assignment.studentProfile.user.name,
        studentProfileId: assignment.studentProfileId,
        teacherName: assignment.teacherProfile.user.name,
        teacherProfileId: assignment.teacherProfileId,
      }))}
      contracts={contracts.map((contract) => ({
        createdAt: contract.createdAt,
        id: contract.id,
        sizeBytes: contract.sizeBytes,
        studentName: contract.studentProfile?.user.name ?? null,
        title: contract.title,
      }))}
      currentUser={currentUser ?? session.user}
      financeLogs={financeLogs.map((log) => ({
        action: log.action,
        createdAt: log.createdAt.toISOString(),
        description: log.description,
        id: log.id,
        studentName: log.student?.name ?? null,
      }))}
      financeStudents={financeStudents.map((student) => ({
        address: student.address,
        amountCents: student.amountCents,
        cpf: student.cpf,
        email: student.email,
        id: student.id,
        name: student.name,
        paymentDay: student.paymentDay,
        paymentMethod: student.paymentMethod,
        payments: student.payments.map((payment) => ({
          id: payment.id,
          isActive: payment.isActive,
          isPaid: payment.isPaid,
          month: payment.month,
          note: payment.note,
          paidAt: payment.paidAt?.toISOString() ?? null,
          snapshotAddress: payment.snapshotAddress,
          snapshotAmountCents: payment.snapshotAmountCents,
          snapshotCpf: payment.snapshotCpf,
          snapshotEmail: payment.snapshotEmail,
          snapshotName: payment.snapshotName,
          snapshotPaymentDay: payment.snapshotPaymentDay,
          snapshotPaymentMethod: payment.snapshotPaymentMethod,
          snapshotPhone: payment.snapshotPhone,
          updatedAt: payment.updatedAt.toISOString(),
          year: payment.year,
        })),
        phone: student.phone,
      }))}
      initialAgendaMonth={initialAgendaMonth}
      initialFinanceMonth={initialFinanceMonth}
      maintenanceMode={maintenanceMode}
      preRegistrationStatus={preRegistrationStatus}
      preRegistrationStatusCounts={{
        APPROVED: studentPreRegistrationStatusCounts[2],
        CONTACTED: studentPreRegistrationStatusCounts[1],
        PENDING: studentPreRegistrationStatusCounts[0],
        REJECTED: studentPreRegistrationStatusCounts[3],
      }}
      students={students.map((student) => ({
        email: student.user.email,
        id: student.id,
        isActive: student.user.isActive,
        label: `${student.user.name}${student.level ? ` - ${student.level}` : ""}`,
      }))}
      storageUsageBytes={storageUsageBytes}
      studentPreRegistrations={studentPreRegistrations.map((request) => ({
        address: request.address,
        birthDate: request.birthDate?.toISOString() ?? null,
        convertedUserEmail: request.convertedUser?.email ?? null,
        convertedUserName: request.convertedUser?.name ?? null,
        createdAt: request.createdAt.toISOString(),
        email: request.email,
        englishGoal: request.englishGoal,
        fullName: request.fullName,
        guardianDocument: request.guardianDocument,
        guardianName: request.guardianName,
        guardianPhone: request.guardianPhone,
        id: request.id,
        notes: request.notes,
        phone: request.phone,
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        reviewedByName: request.reviewedByUser?.name ?? null,
        secondaryContact: request.secondaryContact,
        status: request.status,
        statusNote: request.statusNote,
        studentPhone: request.studentPhone,
      }))}
      teachers={teachers.map((teacher) => ({
        email: teacher.user.email,
        id: teacher.id,
        isActive: teacher.user.isActive,
        label: `${teacher.user.name} - ${teacher.user.email}`,
      }))}
      users={users}
    />
  );
}
