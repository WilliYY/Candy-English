import type { Metadata } from "next";
import { TeacherWorkspace } from "@/components/ava/teacher-workspace";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Teacher AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TeacherPage() {
  const session = await requireAvaRole(["ADMIN", "TEACHER"], "/ava/teacher");
  const prisma = getPrisma();
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
  const studentWhere =
    session.user.role === "TEACHER"
      ? {
          teacherAssignments: {
            some: {
              teacherProfileId: teacherProfileIdForFiltering,
            },
          },
        }
      : {};
  const lessonWhere =
    session.user.role === "TEACHER"
      ? { teacherProfileId: teacherProfileIdForFiltering }
      : {};
  const submissionWhere =
    session.user.role === "TEACHER"
      ? {
          homework: {
            teacherProfileId: teacherProfileIdForFiltering,
          },
        }
      : {};

  const [currentUser, teachers, students, lessons, submissions, liveSessions, contracts] =
    await Promise.all([
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
        id: true,
        level: true,
        user: {
          select: {
            email: true,
            name: true,
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
            id: true,
            submissions: {
              select: {
                id: true,
                status: true,
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
            title: true,
          },
        },
        id: true,
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
      where:
        session.user.role === "TEACHER"
          ? {
              OR: [
                { studentProfileId: null },
                {
                  studentProfile: {
                    teacherAssignments: {
                      some: {
                        teacherProfileId: teacherProfileIdForFiltering,
                      },
                    },
                  },
                },
              ],
            }
          : {},
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
  ]);

  return (
    <TeacherWorkspace
      contracts={contracts.map((contract) => ({
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
        label: `${student.user.name}${student.level ? ` - ${student.level}` : ""}`,
      }))}
      submissions={submissions}
      teachers={teachers.map((teacher) => ({
        id: teacher.id,
        label: `${teacher.user.name} - ${teacher.user.email}`,
      }))}
    />
  );
}
