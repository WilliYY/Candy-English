import type { Prisma } from "@/generated/prisma/client";
import {
  isLiveClassJitsiHost,
  LIVE_CLASS_MAINTENANCE_ENABLED,
  LIVE_CLASS_MAINTENANCE_MESSAGE,
} from "@/lib/live-class";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getPrisma } from "@/lib/prisma";

const liveSessionSelect = {
  createdAt: true,
  endsAt: true,
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
} satisfies Prisma.LiveSessionSelect;

type LiveSessionRow = Prisma.LiveSessionGetPayload<{
  select: typeof liveSessionSelect;
}>;

export type MobileLiveClassStore = Pick<
  ReturnType<typeof getPrisma>,
  "liveSession" | "studentProfile" | "teacherProfile"
>;

type MobileLiveClassOptions = {
  maintenanceEnabled?: boolean;
  now?: Date;
  store?: MobileLiveClassStore;
};

export type MobileLiveClassSession = {
  createdAt: string;
  endsAt: string | null;
  id: string;
  isLive: boolean;
  joinUrl: string | null;
  startsAt: string | null;
  studentName: string | null;
  teacherName: string;
  title: string;
};

export type MobileLiveClassOverview = {
  generatedAt: string;
  maintenance: {
    enabled: boolean;
    message: string | null;
  };
  role: MobileAuthUser["role"];
  sessions: MobileLiveClassSession[];
};

function toSafeJoinUrl(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost =
      hostname === "meet.google.com" ||
      hostname.endsWith(".meet.google.com") ||
      isLiveClassJitsiHost(hostname);

    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      isAllowedHost
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function toMobileLiveClassSession(
  session: LiveSessionRow,
): MobileLiveClassSession {
  return {
    createdAt: session.createdAt.toISOString(),
    endsAt: session.endsAt?.toISOString() ?? null,
    id: session.id,
    isLive: session.isLive,
    joinUrl: toSafeJoinUrl(session.meetUrl),
    startsAt: session.startsAt?.toISOString() ?? null,
    studentName: session.studentProfile?.user.name ?? null,
    teacherName: session.teacherProfile.user.name,
    title: session.title,
  };
}

async function getLiveSessionWhere(
  user: MobileAuthUser,
  store: MobileLiveClassStore,
): Promise<Prisma.LiveSessionWhereInput | null> {
  if (user.role === "STUDENT") {
    const profile = await store.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return null;
    }

    return {
      isLive: true,
      OR: [
        { studentProfileId: null },
        { studentProfileId: profile.id },
      ],
    };
  }

  if (user.role === "TEACHER") {
    const profile = await store.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    return profile ? { teacherProfileId: profile.id } : null;
  }

  return {};
}

export async function getMobileLiveClassOverview(
  user: MobileAuthUser,
  options: MobileLiveClassOptions = {},
): Promise<MobileLiveClassOverview> {
  const maintenanceEnabled =
    options.maintenanceEnabled ?? LIVE_CLASS_MAINTENANCE_ENABLED;
  const generatedAt = (options.now ?? new Date()).toISOString();

  if (maintenanceEnabled) {
    return {
      generatedAt,
      maintenance: {
        enabled: true,
        message: LIVE_CLASS_MAINTENANCE_MESSAGE,
      },
      role: user.role,
      sessions: [],
    };
  }

  const store = options.store ?? getPrisma();
  const where = await getLiveSessionWhere(user, store);

  if (!where) {
    return {
      generatedAt,
      maintenance: {
        enabled: false,
        message: null,
      },
      role: user.role,
      sessions: [],
    };
  }

  const sessions = await store.liveSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: liveSessionSelect,
    take: 50,
  });

  return {
    generatedAt,
    maintenance: {
      enabled: false,
      message: null,
    },
    role: user.role,
    sessions: sessions.map(toMobileLiveClassSession),
  };
}
