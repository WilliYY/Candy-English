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
import { getCandyXpRankingSnapshot } from "@/lib/candy-xp-ranking";
import { getCattyArtifactManagementData } from "@/lib/catty-user-artifacts";
import { getCattyMemoryManagementData } from "@/lib/catty-memory-management";
import { getPrisma } from "@/lib/prisma";
import { getStorageUsageBytes } from "@/lib/storage";
import type {
  CattyLearningCategoryInput,
  CattyLearningFeedbackKindInput,
  CattyLearningIntentInput,
} from "@/lib/validations/catty-learning";
import {
  PRE_REGISTRATION_STATUSES,
  studentPreRegistrationStatusSchema,
} from "@/lib/validations/pre-registration";

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
  const preRegistrationStatuses = PRE_REGISTRATION_STATUSES;

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
    financeExpenses,
    agendaStudents,
    agendaLessons,
    agendaLogs,
    maintenanceMode,
    storageUsageBytes,
    adminCredentials,
    cattyLearningFeedbacks,
    cattyLearningItems,
    cattyMemoryData,
    cattyArtifactData,
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
        phone: true,
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
            studentPhone: true,
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
                email: true,
                name: true,
              },
            },
          },
        },
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
        installmentsTotal: true,
        name: true,
        paymentMethod: true,
        paymentDay: true,
        phone: true,
        unit: true,
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
            snapshotInstallmentNumber: true,
            snapshotInstallmentsTotal: true,
            snapshotName: true,
            snapshotPaymentDay: true,
            snapshotPaymentMethod: true,
            snapshotPhone: true,
            snapshotUnit: true,
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
    prisma.financialExpense.findMany({
      orderBy: [
        {
          purchasedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        actorName: true,
        amountCents: true,
        createdAt: true,
        id: true,
        itemName: true,
        month: true,
        note: true,
        purchasedAt: true,
        unit: true,
        year: true,
      },
      where: {
        year: 2026,
      },
    }),
    prisma.agendaStudent.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        defaultTime: true,
        id: true,
        isActive: true,
        name: true,
        notes: true,
        phone: true,
        unit: true,
        weekdayMask: true,
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
            unit: true,
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
    getCattyMemoryManagementData({
      viewerRole: "ADMIN",
      viewerUserId: session.user.id,
    }),
    getCattyArtifactManagementData({
      actorRole: "ADMIN",
      actorUserId: session.user.id,
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
        assetMimeType: true,
        assetPageCount: true,
        assetSizeBytes: true,
        category: true,
        createdAt: true,
        description: true,
        id: true,
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
      orderBy: {
        createdAt: "desc",
      },
      select: {
        address: true,
        birthDate: true,
        assignedTeacherProfile: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        assignedTeacherProfileId: true,
        city: true,
        convertedAgendaStudentId: true,
        convertedFinancialStudentId: true,
        convertedStudentProfileId: true,
        convertedUser: {
          select: {
            email: true,
            name: true,
          },
        },
        createdAt: true,
        createdByUser: {
          select: {
            name: true,
            role: true,
          },
        },
        email: true,
        englishGoal: true,
        estimatedLevel: true,
        fullName: true,
        guardianDocument: true,
        guardianName: true,
        guardianPhone: true,
        id: true,
        installmentsTotal: true,
        intendedTime: true,
        intendedWeekdayMask: true,
        notes: true,
        paymentDay: true,
        paymentMethod: true,
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
        tuitionCents: true,
        unit: true,
      },
    }),
    Promise.all(
      preRegistrationStatuses.map((status) =>
        prisma.studentPreRegistration.count({ where: { status } }),
      ),
    ),
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
  const candyXpRanking = await getCandyXpRankingSnapshot({
    currentUserId: session.user.id,
    limit: 100,
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
        assetMimeType: activity.assetMimeType,
        assetPageCount: activity.assetPageCount,
        assetSizeBytes: activity.assetSizeBytes,
        category: activity.category,
        createdAt: activity.createdAt.toISOString(),
        description: activity.description,
        id: activity.id,
        interactiveFields: activity.interactiveFields.map((field) => ({
          height: field.height,
          id: field.id,
          label: field.label,
          page: field.page,
          placeholder: field.placeholder,
          required: field.required,
          sortOrder: field.sortOrder,
          type: field.type,
          width: field.width,
          x: field.x,
          y: field.y,
        })),
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
      cattyArtifactData={cattyArtifactData}
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
      cattyMemoryData={cattyMemoryData}
      candyXpPersistence={candyXpPersistence}
      candyXpRanking={candyXpRanking}
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
        studentUnit: lesson.student.unit,
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
        defaultTime: student.defaultTime,
        id: student.id,
        isActive: student.isActive,
        name: student.name,
        notes: student.notes,
        phone: student.phone,
        unit: student.unit,
        weekdayMask: student.weekdayMask,
      }))}
      assignments={assignments.map((assignment) => ({
        createdAt: assignment.createdAt,
        id: assignment.id,
        studentEmail: assignment.studentProfile.user.email,
        studentName: assignment.studentProfile.user.name,
        studentProfileId: assignment.studentProfileId,
        teacherEmail: assignment.teacherProfile.user.email,
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
      financeExpenses={financeExpenses.map((expense) => ({
        actorName: expense.actorName,
        amountCents: expense.amountCents,
        createdAt: expense.createdAt.toISOString(),
        id: expense.id,
        itemName: expense.itemName,
        month: expense.month,
        note: expense.note,
        purchasedAt: expense.purchasedAt.toISOString(),
        unit: expense.unit,
        year: expense.year,
      }))}
      financeStudents={financeStudents.map((student) => ({
        address: student.address,
        amountCents: student.amountCents,
        cpf: student.cpf,
        email: student.email,
        id: student.id,
        installmentsTotal: student.installmentsTotal,
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
          snapshotInstallmentNumber: payment.snapshotInstallmentNumber,
          snapshotInstallmentsTotal: payment.snapshotInstallmentsTotal,
          snapshotName: payment.snapshotName,
          snapshotPaymentDay: payment.snapshotPaymentDay,
          snapshotPaymentMethod: payment.snapshotPaymentMethod,
          snapshotPhone: payment.snapshotPhone,
          snapshotUnit: payment.snapshotUnit,
          updatedAt: payment.updatedAt.toISOString(),
          year: payment.year,
        })),
        phone: student.phone,
        unit: student.unit,
      }))}
      initialAgendaMonth={initialAgendaMonth}
      initialFinanceMonth={initialFinanceMonth}
      maintenanceMode={maintenanceMode}
      preRegistrationStatus={preRegistrationStatus}
      preRegistrationStatusCounts={Object.fromEntries(
        preRegistrationStatuses.map((status, index) => [
          status,
          studentPreRegistrationStatusCounts[index] ?? 0,
        ]),
      ) as Record<(typeof preRegistrationStatuses)[number], number>}
      students={students.map((student) => ({
        email: student.user.email,
        id: student.id,
        isActive: student.user.isActive,
        label: `${student.user.name}${student.level ? ` - ${student.level}` : ""}`,
      }))}
      storageUsageBytes={storageUsageBytes}
      studentPreRegistrations={studentPreRegistrations.map((request) => ({
        address: request.address,
        assignedTeacherEmail:
          request.assignedTeacherProfile?.user.email ?? null,
        assignedTeacherId: request.assignedTeacherProfileId,
        assignedTeacherName: request.assignedTeacherProfile?.user.name ?? null,
        birthDate: request.birthDate?.toISOString() ?? null,
        city: request.city,
        convertedAgendaStudentId: request.convertedAgendaStudentId,
        convertedFinancialStudentId: request.convertedFinancialStudentId,
        convertedStudentProfileId: request.convertedStudentProfileId,
        convertedUserEmail: request.convertedUser?.email ?? null,
        convertedUserName: request.convertedUser?.name ?? null,
        createdAt: request.createdAt.toISOString(),
        createdByName: request.createdByUser?.name ?? null,
        createdByRole: request.createdByUser?.role ?? null,
        email: request.email,
        englishGoal: request.englishGoal,
        estimatedLevel: request.estimatedLevel,
        fullName: request.fullName,
        guardianDocument: request.guardianDocument,
        guardianName: request.guardianName,
        guardianPhone: request.guardianPhone,
        id: request.id,
        installmentsTotal: request.installmentsTotal,
        intendedTime: request.intendedTime,
        intendedWeekdayMask: request.intendedWeekdayMask,
        notes: request.notes,
        paymentDay: request.paymentDay,
        paymentMethod: request.paymentMethod,
        phone: request.phone,
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        reviewedByName: request.reviewedByUser?.name ?? null,
        secondaryContact: request.secondaryContact,
        status: request.status,
        statusNote: request.statusNote,
        studentPhone: request.studentPhone,
        tuitionCents: request.tuitionCents,
        unit: request.unit,
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
