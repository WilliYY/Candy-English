import type { Metadata } from "next";
import { AvaDashboard } from "@/components/ava/ava-dashboard";
import { StudentWorkspace } from "@/components/ava/student-workspace";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Student AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StudentPage() {
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER", "STUDENT"],
    "/ava/student",
  );

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
      id: true,
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

  const [lessons, liveSessions, contracts] = await Promise.all([
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
            dueDate: true,
            id: true,
            instructions: true,
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
  ]);

  return (
    <StudentWorkspace
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
    />
  );
}
