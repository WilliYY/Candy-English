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
    users,
    teachers,
    students,
    assignments,
    contracts,
    maintenanceMode,
    storageUsageBytes,
  ] = await Promise.all([
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
    isMaintenanceModeEnabled(),
    getStorageUsageBytes(),
  ]);

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
      currentUser={session.user}
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
