import type { Metadata } from "next";
import {
  AdminUsersPanel,
  normalizeAdminTask,
} from "@/components/ava/admin-users-panel";
import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
import { getStorageUsageBytes } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Admin AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminPageProps = {
  searchParams?: Promise<{
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

  const [
    currentUser,
    users,
    teachers,
    students,
    assignments,
    contracts,
    financeStudents,
    financeLogs,
    maintenanceMode,
    storageUsageBytes,
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
            isPaid: true,
            month: true,
            note: true,
            paidAt: true,
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
    isMaintenanceModeEnabled(),
    getStorageUsageBytes(),
  ]);
  const currentDate = new Date();
  const initialFinanceMonth =
    currentDate.getFullYear() === 2026 ? currentDate.getMonth() + 1 : 1;

  return (
    <AdminUsersPanel
      activeTask={activeTask}
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
          isPaid: payment.isPaid,
          month: payment.month,
          note: payment.note,
          paidAt: payment.paidAt?.toISOString() ?? null,
          updatedAt: payment.updatedAt.toISOString(),
          year: payment.year,
        })),
        phone: student.phone,
      }))}
      initialFinanceMonth={initialFinanceMonth}
      maintenanceMode={maintenanceMode}
      students={students.map((student) => ({
        email: student.user.email,
        id: student.id,
        isActive: student.user.isActive,
        label: `${student.user.name}${student.level ? ` - ${student.level}` : ""}`,
      }))}
      storageUsageBytes={storageUsageBytes}
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
