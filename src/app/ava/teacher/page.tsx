import type { Metadata } from "next";
import {
  normalizeTeacherTask,
  type TeacherTask,
  TeacherWorkspace,
} from "@/components/ava/teacher-workspace";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { buildAvaCallbackUrl } from "@/lib/ava-callback-url";
import { requireAvaRole } from "@/lib/authorization";
import { type CandyXpPersistenceSnapshot } from "@/lib/candy-xp";
import {
  recordCandyXpEventsForUser,
} from "@/lib/candy-xp-persistence";
import { getCandyXpRankingSnapshot } from "@/lib/candy-xp-ranking";
import { getCattyArtifactManagementData } from "@/lib/catty-user-artifacts";
import { getCattyMemoryManagementData } from "@/lib/catty-memory-management";
import { getPrisma } from "@/lib/prisma";
import { getStaffStudentSelectionWhere } from "@/lib/staff-student-access";
import { buildTeacherCandyXpEvents } from "@/lib/mobile-teacher-candy-xp";
import type {
  CattyLearningCategoryInput,
  CattyLearningFeedbackKindInput,
  CattyLearningIntentInput,
} from "@/lib/validations/catty-learning";
import {
  PRE_REGISTRATION_STATUSES,
  studentPreRegistrationStatusSchema,
} from "@/lib/validations/pre-registration";
import {
  getSecretariaSelectedUnit,
  normalizeSecretariaUnitFilter,
} from "@/lib/secretaria-unit-filter";
import {
  getTeacherFinanceDateParts,
  normalizeTeacherFinanceMonth,
  projectTeacherFinanceRow,
  TEACHER_FINANCE_YEAR,
} from "@/lib/teacher-finance";

export const metadata: Metadata = {
  title: "Teacher AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TeacherPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
    preStatus?: string | string[];
    task?: string | string[];
    unit?: string | string[];
  }>;
};

const secretariaTeacherTasks = new Set<TeacherTask>([
  "aceitar-alunos",
  "contratos",
]);

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER"],
    buildAvaCallbackUrl("/ava/teacher", params, [
      "task",
      "unit",
      "preStatus",
      "month",
    ]),
  );
  const prisma = getPrisma();
  const requestedTask = Array.isArray(params?.task)
    ? params?.task[0]
    : params?.task;
  const activeTask = normalizeTeacherTask(requestedTask);
  const workspaceArea =
    activeTask === "financeiro"
      ? "FINANCEIRO"
      : secretariaTeacherTasks.has(activeTask)
        ? "SECRETARIA"
        : "AVA";
  const now = new Date();
  const today = getTeacherFinanceDateParts(now);
  const financeMonth = normalizeTeacherFinanceMonth(
    params?.month,
    today.year === TEACHER_FINANCE_YEAR ? today.month : 1,
  );
  const unitFilter = normalizeSecretariaUnitFilter(params?.unit);
  const selectedUnit = getSecretariaSelectedUnit(unitFilter);
  const preRegistrationUnitWhere = selectedUnit ? { unit: selectedUnit } : {};
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
  const currentTeacherProfile =
    session.user.role === "TEACHER"
      ? await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
      : null;
  const teacherProfileIdForFiltering =
    currentTeacherProfile?.id ?? "__missing_teacher_profile__";
  const teacherWhere =
    session.user.role === "TEACHER"
      ? { id: teacherProfileIdForFiltering }
      : {};
  const studentWhere = getStaffStudentSelectionWhere(selectedUnit);
  const lessonWhere =
    session.user.role === "TEACHER"
      ? { teacherProfileId: teacherProfileIdForFiltering }
      : {};
  const preRegistrationOwnershipWhere =
    session.user.role === "TEACHER"
      ? {
          OR: [
            {
              assignedTeacherProfileId: teacherProfileIdForFiltering,
            },
            {
              createdByUserId: session.user.id,
            },
          ],
        }
      : {};
  const preRegistrationWhere =
    session.user.role === "TEACHER"
      ? {
          AND: [preRegistrationOwnershipWhere, preRegistrationUnitWhere],
        }
      : preRegistrationUnitWhere;
  const submissionWhere =
    session.user.role === "TEACHER"
      ? {
          status: {
            not: "DRAFT" as const,
          },
          homework: {
            teacherProfileId: teacherProfileIdForFiltering,
          },
        }
      : {
          status: {
            not: "DRAFT" as const,
          },
        };
  const chatThreadWhere =
    session.user.role === "TEACHER"
      ? { teacherProfileId: teacherProfileIdForFiltering }
      : {};

  const [
    currentUser,
    teachers,
    students,
    lessons,
    submissions,
    liveSessions,
    contracts,
    chatThreads,
    cattyLearningFeedbacks,
    cattyLearningItems,
    cattyMemoryData,
    cattyArtifactData,
    studentPreRegistrations,
    studentPreRegistrationStatusCounts,
  ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          address: true,
          avatarPath: true,
          email: true,
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      }),
    prisma.teacherProfile.findMany({
      where: teacherWhere,
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
            name: true,
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      where: studentWhere,
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        convertedStudentPreRegistration: {
          select: {
            convertedAgendaStudentId: true,
            convertedFinancialStudentId: true,
          },
        },
        financialStudent: {
          select: {
            payments: {
              orderBy: { createdAt: "desc" },
              select: {
                isActive: true,
                isPaid: true,
                month: true,
                paidAt: true,
                snapshotAmountCents: true,
                snapshotName: true,
                snapshotPaymentDay: true,
                snapshotPaymentMethod: true,
                snapshotUnit: true,
                year: true,
              },
              take: 1,
              where: {
                month: financeMonth,
                year: TEACHER_FINANCE_YEAR,
              },
            },
          },
        },
        id: true,
        level: true,
        teacherAssignments: {
          select: {
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
        },
        unit: true,
        user: {
          select: {
            email: true,
            isActive: true,
            name: true,
            phone: true,
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: lessonWhere,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        description: true,
        homeworks: {
          select: {
            assetFileName: true,
            assetMimeType: true,
            assetPageCount: true,
            assetSizeBytes: true,
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
            submissions: {
              select: {
                id: true,
                status: true,
              },
            },
            homeworkReplicas: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                createdAt: true,
                id: true,
                lesson: {
                  select: {
                    studentProfile: {
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
                  },
                },
              },
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
            id: true,
            title: true,
            type: true,
          },
        },
        scheduledAt: true,
        studentProfile: {
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
            id: true,
            term: true,
            translation: true,
          },
        },
      },
    }),
    prisma.homeworkSubmission.findMany({
      where: submissionWhere,
      orderBy: {
        submittedAt: "desc",
      },
      select: {
        answers: true,
        feedback: true,
        homework: {
          select: {
            assetFileName: true,
            assetMimeType: true,
            assetPageCount: true,
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
            kind: true,
            lesson: {
              select: {
                title: true,
              },
            },
            questions: {
              orderBy: {
                sortOrder: "asc",
              },
              select: {
                prompt: true,
              },
              take: 1,
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
            title: true,
          },
        },
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
        teacherAnnotations: true,
      },
    }),
    prisma.liveSession.findMany({
      where: lessonWhere,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        isLive: true,
        meetUrl: true,
        startsAt: true,
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
        title: true,
      },
    }),
    prisma.contractDocument.findMany({
      where: {},
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        sizeBytes: true,
        studentProfileId: true,
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
    prisma.chatThread.findMany({
      where: chatThreadWhere,
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
      where:
        session.user.role === "TEACHER"
          ? {
              OR: [
                {
                  createdByUserId: session.user.id,
                },
                {
                  createdByUser: {
                    studentProfile: {
                      teacherAssignments: {
                        some: {
                          teacherProfileId: teacherProfileIdForFiltering,
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {},
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
        createdByUserId: true,
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
      where:
        session.user.role === "TEACHER"
          ? {
              OR: [
                {
                  status: "APPROVED",
                },
                {
                  createdByUserId: session.user.id,
                },
              ],
            }
        : {},
    }),
    getCattyMemoryManagementData({
      viewerRole: session.user.role,
      viewerUserId: session.user.id,
    }),
    getCattyArtifactManagementData({
      actorRole: session.user.role,
      actorUserId: session.user.id,
    }),
    prisma.studentPreRegistration.findMany({
      where: preRegistrationWhere,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        address: true,
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
        birthDate: true,
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
        prisma.studentPreRegistration.count({
          where: {
            AND: [{ status }, preRegistrationWhere],
          },
        }),
      ),
    ),
  ]);
  let candyXpPersistence: CandyXpPersistenceSnapshot | null = null;

  if (session.user.role === "TEACHER" && currentTeacherProfile && currentUser) {
    const teacherXpEvents = buildTeacherCandyXpEvents({
      homeworkIds: lessons.flatMap((lesson) =>
        lesson.homeworks.map((homework) => homework.id),
      ),
      lessonIds: lessons.map((lesson) => lesson.id),
      liveSessionIds: liveSessions.map((liveSession) => liveSession.id),
      profileReady: Boolean(currentUser.avatarPath || currentUser.phone),
      reviewedSubmissionIds: submissions
        .filter((submission) => submission.status === "REVIEWED")
        .map((submission) => submission.id),
      studentProfileIds: students.map((student) => student.id),
      teacherProfileId: currentTeacherProfile.id,
    });

    candyXpPersistence = await recordCandyXpEventsForUser({
      events: teacherXpEvents,
      role: "TEACHER",
      userId: session.user.id,
    });
  }
  const candyXpRanking = await getCandyXpRankingSnapshot({
    currentUserId: session.user.id,
    limit: 100,
  });

  return (
    <AvaWorkspaceShell area={workspaceArea} unitFilter={unitFilter}>
      <TeacherWorkspace
      activeTask={activeTask}
      candyXpPersistence={candyXpPersistence}
      candyXpRanking={candyXpRanking}
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
      contracts={contracts.map((contract) => ({
        canDelete:
          session.user.role === "ADMIN" || Boolean(contract.studentProfileId),
        createdAt: contract.createdAt,
        id: contract.id,
        sizeBytes: contract.sizeBytes,
        studentName: contract.studentProfile?.user.name ?? null,
        title: contract.title,
      }))}
      currentUser={currentUser ?? session.user}
      lessons={lessons}
      liveSessions={liveSessions.map((session) => ({
        id: session.id,
        isLive: session.isLive,
        meetUrl: session.meetUrl,
        startsAt: session.startsAt,
        studentName: session.studentProfile?.user.name ?? null,
        teacherName: session.teacherProfile.user.name,
        title: session.title,
      }))}
      students={students.map((student) => ({
        id: student.id,
        label: student.user.name,
        level: student.level,
      }))}
      preRegistrationStatus={preRegistrationStatus}
      preRegistrationStatusCounts={Object.fromEntries(
        preRegistrationStatuses.map((status, index) => [
          status,
          studentPreRegistrationStatusCounts[index] ?? 0,
        ]),
      ) as Record<(typeof preRegistrationStatuses)[number], number>}
      registeredStudents={students.map((student) => {
        const registration = student.convertedStudentPreRegistration;

        return {
          email: student.user.email,
          hasAgendaRecord: Boolean(registration?.convertedAgendaStudentId),
          hasFinancialRecord: Boolean(
            registration?.convertedFinancialStudentId,
          ),
          isActive: student.user.isActive,
          level: student.level,
          name: student.user.name,
          origin: registration
            ? ("PRE_REGISTRATION" as const)
            : ("DIRECT" as const),
          phone: student.user.phone,
          teacherNames: student.teacherAssignments.map(
            (assignment) => assignment.teacherProfile.user.name,
          ),
          unit: student.unit,
          userId: null,
        };
      })}
      secretariaUnitFilter={unitFilter}
      teacherFinanceMonth={financeMonth}
      teacherFinanceRows={students.map((student) =>
        projectTeacherFinanceRow(student, now),
      )}
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
      submissions={submissions}
      teachers={teachers.map((teacher) => ({
        id: teacher.id,
        label: `${teacher.user.name} - ${teacher.user.email}`,
      }))}
      />
    </AvaWorkspaceShell>
  );
}
