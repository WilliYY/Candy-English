"use client";

import { usePathname } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  Heart,
  Lightbulb,
  LoaderCircle,
  MessageSquarePlus,
  PencilLine,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { submitCattyReplyFeedback } from "@/app/ava/catty-learning/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildFallbackCattyReply,
  type CattyMessage,
  type CattyPageContext,
} from "@/lib/catty";
import { pickCattyLoggedInBalloon } from "@/lib/catty-artifact-balloons";
import type { CattyArtifactCustomItem } from "@/lib/catty-artifacts";
import {
  CATTY_AUTH_REQUIRED_REPLY,
  CATTY_INITIAL_MESSAGE,
  CATTY_PUBLIC_BALLOON_TEMPLATES,
  CATTY_PUBLIC_LOCKED_REPLY,
} from "@/lib/catty-personality";

type QuickReply = {
  icon: "book" | "check" | "heart" | "lightbulb" | "pencil" | "practice";
  label: string;
  text: string;
};

type CattyContextCopy = {
  eyebrow: string;
};

type CattyWidgetProps = {
  sessionUser?: {
    artifacts?: CattyArtifactCustomItem[];
    name: string | null;
  } | null;
};

type CattyWidgetFeedbackKind =
  | "CONFUSING"
  | "DISLIKED"
  | "LIKED"
  | "SHOULD_ANSWER";

const LOGGED_IN_BALLOON_INTERVAL_MS = 10_000;
const CATTY_COMPACT_BALLOON_BREAKPOINT_PX = 1024;
const COMPACT_BALLOON_MAX_COUNT = 3;
const COMPACT_BALLOON_HIDE_DELAY_MS = 4_000;
const CATTY_LOOP_POSTER = "/brand/catty-loop-poster.jpg";
const CATTY_LOOP_MP4 = "/brand/catty-loop.mp4";
const CATTY_LOOP_WEBM = "/brand/catty-loop.webm";

const initialCattyMessages: CattyMessage[] = [
  {
    from: "catty",
    text: CATTY_INITIAL_MESSAGE,
  },
];

const defaultQuickReplies: QuickReply[] = [
  {
    icon: "practice",
    label: "Praticar ingles",
    text: "Me faz uma pergunta simples em ingles para eu responder.",
  },
  {
    icon: "pencil",
    label: "Corrigir frase",
    text: "Quero corrigir uma frase em ingles.",
  },
  {
    icon: "book",
    label: "Explicar palavra",
    text: "Me ajuda a entender uma palavra em ingles.",
  },
  {
    icon: "heart",
    label: "Me anima",
    text: "Me anima a estudar ingles hoje.",
  },
];

const quickReplyIcons = {
  book: BookOpen,
  check: CheckCircle2,
  heart: Heart,
  lightbulb: Lightbulb,
  pencil: PencilLine,
  practice: GraduationCap,
} satisfies Record<QuickReply["icon"], typeof BookOpen>;

function readReply(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const reply = (payload as { reply?: unknown }).reply;

  return typeof reply === "string" ? reply.trim() : "";
}

function readMessageId(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const messageId = (payload as { messageId?: unknown }).messageId;

  return typeof messageId === "string" && messageId.trim()
    ? messageId.trim()
    : undefined;
}

function readMessages(payload: unknown): CattyMessage[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const messages = (payload as { messages?: unknown }).messages;

  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message): CattyMessage | null => {
      if (typeof message !== "object" || message === null) {
        return null;
      }

      const from = (message as { from?: unknown }).from;
      const id = (message as { id?: unknown }).id;
      const text = (message as { text?: unknown }).text;

      if (
        (from !== "catty" && from !== "user") ||
        typeof text !== "string" ||
        text.trim().length === 0
      ) {
        return null;
      }

      const parsedMessage: CattyMessage = {
        from,
        text: text.trim(),
      };

      if (typeof id === "string" && id.trim()) {
        parsedMessage.id = id.trim();
      }

      return parsedMessage;
    })
    .filter((message): message is CattyMessage => message !== null)
    .slice(-50);
}

function isInitialCattyMessageList(messages: CattyMessage[]) {
  return (
    messages.length === initialCattyMessages.length &&
    messages.every(
      (message, index) =>
        message.from === initialCattyMessages[index]?.from &&
        message.text === initialCattyMessages[index]?.text,
    )
  );
}

function getCurrentPageContext(): CattyPageContext {
  if (typeof window === "undefined") {
    return {
      area: "unknown",
    };
  }

  const { pathname, search } = window.location;
  const task = new URLSearchParams(search).get("task") ?? undefined;

  if (pathname.startsWith("/ava/login")) {
    return { area: "login", task };
  }

  if (pathname.startsWith("/ava/admin")) {
    return { area: "admin", task };
  }

  if (pathname.startsWith("/ava/teacher")) {
    return { area: "teacher", task };
  }

  if (pathname.startsWith("/ava/student")) {
    return { area: "student", task };
  }

  if (pathname.startsWith("/ava")) {
    return { area: "unknown", task };
  }

  return { area: "site", task };
}

function getContextCopy(context: CattyPageContext): CattyContextCopy {
  if (context.area === "student" && context.task === "homeworks") {
    return {
      eyebrow: "Homework",
    };
  }

  if (context.area === "student" && context.task === "aulas") {
    return {
      eyebrow: "Aula",
    };
  }

  if (context.task === "mensagens") {
    return {
      eyebrow: "Mensagens",
    };
  }

  if (context.area === "teacher") {
    return {
      eyebrow: "Teacher",
    };
  }

  if (context.area === "admin") {
    return {
      eyebrow: "Study mode",
    };
  }

  return {
    eyebrow: "English",
  };
}

function getQuickReplies(context: CattyPageContext): QuickReply[] {
  if (context.area === "student" && context.task === "homeworks") {
    return [
      {
        icon: "lightbulb",
        label: "Dica do homework",
        text: "Estou no homework. Me ajuda a entender o enunciado sem dar a resposta.",
      },
      {
        icon: "pencil",
        label: "Corrigir frase",
        text: "Corrige esta frase em ingles para mim.",
      },
      {
        icon: "practice",
        label: "Treinar parecido",
        text: "Cria um exemplo parecido para eu praticar antes de responder.",
      },
      {
        icon: "heart",
        label: "Me destravar",
        text: "Estou travado no homework. Me ajuda com calma.",
      },
    ];
  }

  if (context.area === "student" && context.task === "aulas") {
    return [
      {
        icon: "book",
        label: "Vocabulario",
        text: "Me explica uma palavra da aula em ingles simples.",
      },
      {
        icon: "practice",
        label: "Pergunta em ingles",
        text: "Me faz uma pergunta simples sobre a aula em ingles.",
      },
      {
        icon: "pencil",
        label: "Frase exemplo",
        text: "Cria uma frase exemplo com uma palavra da aula.",
      },
      {
        icon: "heart",
        label: "Revisar leve",
        text: "Me ajuda a revisar a aula em 2 minutos.",
      },
    ];
  }

  if (context.task === "mensagens") {
    return [
      {
        icon: "pencil",
        label: "Mensagem em ingles",
        text: "Me ajuda a escrever uma mensagem curta em ingles para a teacher.",
      },
      {
        icon: "check",
        label: "Deixar educada",
        text: "Melhora esta mensagem para ficar educada e clara.",
      },
      {
        icon: "book",
        label: "Traduzir ideia",
        text: "Quero dizer uma ideia simples em ingles.",
      },
      {
        icon: "heart",
        label: "Pedir ajuda",
        text: "Me ajuda a pedir ajuda sem vergonha.",
      },
    ];
  }

  if (context.area === "teacher") {
    return [
      {
        icon: "pencil",
        label: "Instrucao clara",
        text: "Me ajuda a escrever uma instrucao curta para uma atividade.",
      },
      {
        icon: "heart",
        label: "Feedback fofo",
        text: "Cria um feedback carinhoso e curto para um aluno.",
      },
      {
        icon: "book",
        label: "Exemplo de aula",
        text: "Cria uma frase exemplo simples para aula de ingles.",
      },
      {
        icon: "check",
        label: "Simplificar",
        text: "Simplifica este texto para aluno iniciante.",
      },
    ];
  }

  return defaultQuickReplies;
}

function getFirstDisplayName(name?: string | null) {
  const cleaned = name?.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "aluno Candy";
  }

  if (cleaned.includes("@")) {
    const localName = cleaned
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")[0];

    return localName || "aluno Candy";
  }

  if (cleaned.length <= 18) {
    return cleaned;
  }

  const firstName = cleaned.split(" ")[0]?.trim() || cleaned;

  if (firstName.length > 18) {
    return `${firstName.slice(0, 18)}...`;
  }

  return firstName;
}

function getCattyGreeting() {
  const hour = new Date().getHours();

  if (hour < 5) {
    return "Good night";
  }

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  if (hour >= 22) {
    return "Good night";
  }

  return "Good evening";
}

function getRandomLoggedInBalloon(
  name: string,
  artifacts: CattyArtifactCustomItem[],
  current?: string,
) {
  const greeting = getCattyGreeting();

  return pickCattyLoggedInBalloon({
    artifacts,
    current,
    greeting,
    name,
  });
}

function getRandomPublicBalloon(current?: string) {
  const availableTemplates = CATTY_PUBLIC_BALLOON_TEMPLATES.filter(
    (template) => template !== current,
  );
  const templates =
    availableTemplates.length > 0
      ? availableTemplates
      : CATTY_PUBLIC_BALLOON_TEMPLATES;

  return templates[Math.floor(Math.random() * templates.length)];
}

function isCompactCattyBalloonViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth < CATTY_COMPACT_BALLOON_BREAKPOINT_PX;
}

function isLoggedInAvaArea(context: CattyPageContext) {
  return (
    context.area === "admin" ||
    context.area === "teacher" ||
    context.area === "student"
  );
}

function isPublicCattyArea(context: CattyPageContext) {
  return context.area === "site" || context.area === "login";
}

export function CattyWidget({ sessionUser = null }: CattyWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CattyPageContext>({
    area: "unknown",
  });
  const [messages, setMessages] = useState<CattyMessage[]>(
    initialCattyMessages,
  );
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [loggedInBalloon, setLoggedInBalloon] = useState("");
  const [publicBalloon, setPublicBalloon] = useState("");
  const [isCompactBalloonViewport, setIsCompactBalloonViewport] =
    useState(false);
  const [publicNoticeVisible, setPublicNoticeVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>(
    {},
  );
  const [feedbackOpenMessageId, setFeedbackOpenMessageId] = useState<
    string | null
  >(null);
  const [feedbackStatus, setFeedbackStatus] = useState<
    Record<string, "error" | "saved" | "sending">
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loggedInBalloonCount = useRef(0);
  const publicBalloonCount = useRef(0);
  const contextCopy = useMemo(() => getContextCopy(context), [context]);
  const quickReplies = useMemo(() => getQuickReplies(context), [context]);
  const displayName = useMemo(
    () => getFirstDisplayName(sessionUser?.name),
    [sessionUser?.name],
  );
  const sessionArtifacts = useMemo(
    () => sessionUser?.artifacts ?? [],
    [sessionUser?.artifacts],
  );
  const hasSessionUser = Boolean(sessionUser);
  const canUseCattyChat = Boolean(hasSessionUser && isLoggedInAvaArea(context));
  const showLoggedInBalloons = canUseCattyChat;
  const showPublicBalloons = Boolean(
    !hasSessionUser && isPublicCattyArea(context) && !open,
  );
  const visiblePublicBalloon = publicNoticeVisible
    ? CATTY_PUBLIC_LOCKED_REPLY
    : publicBalloon;
  const publicBalloonTone = publicNoticeVisible
    ? "catty-speech--notice"
    : "catty-speech--public";
  const publicBalloonLabel = publicNoticeVisible
    ? "Acesso Candy"
    : "Catty chama";
  const hasWhatsAppWidget =
    !pathname.startsWith("/ava") || pathname.startsWith("/ava/login");
  const lockedContextCopy: CattyContextCopy = {
    eyebrow: "Acesso Candy",
  };
  const visibleContextCopy: CattyContextCopy = canUseCattyChat
    ? contextCopy
    : lockedContextCopy;

  useEffect(() => {
    if (!open) return;

    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [isThinking, messages, open]);

  useEffect(() => {
    if (!open || !canUseCattyChat) {
      return;
    }

    const area = context.area ?? "unknown";
    const task = context.task;
    let cancelled = false;

    async function loadHistory() {
      const params = new URLSearchParams();

      params.set("area", area);

      if (task) {
        params.set("task", task);
      }

      try {
        const response = await fetch(`/api/catty/chat?${params.toString()}`, {
          cache: "no-store",
          method: "GET",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        const storedMessages = readMessages(payload);

        if (cancelled) {
          return;
        }

        setMessages((current) => {
          if (!isInitialCattyMessageList(current)) {
            return current;
          }

          return storedMessages.length > 0
            ? storedMessages
            : initialCattyMessages;
        });
      } catch {
        // History is a convenience layer; the chat must keep working without it.
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [canUseCattyChat, context.area, context.task, open]);

  useEffect(() => {
    function refreshContext() {
      setContext(getCurrentPageContext());
    }

    refreshContext();
    window.addEventListener("popstate", refreshContext);
    window.addEventListener("focus", refreshContext);

    return () => {
      window.removeEventListener("popstate", refreshContext);
      window.removeEventListener("focus", refreshContext);
    };
  }, [pathname]);

  useEffect(() => {
    function refreshCompactBalloonViewport() {
      setIsCompactBalloonViewport(isCompactCattyBalloonViewport());
    }

    refreshCompactBalloonViewport();
    window.addEventListener("resize", refreshCompactBalloonViewport);
    window.addEventListener("orientationchange", refreshCompactBalloonViewport);

    return () => {
      window.removeEventListener("resize", refreshCompactBalloonViewport);
      window.removeEventListener(
        "orientationchange",
        refreshCompactBalloonViewport,
      );
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function refreshReducedMotion() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    refreshReducedMotion();
    mediaQuery.addEventListener("change", refreshReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", refreshReducedMotion);
    };
  }, []);

  useEffect(() => {
    loggedInBalloonCount.current = 0;
    publicBalloonCount.current = 0;
    setLoggedInBalloon("");
    setPublicBalloon("");
  }, [
    context.area,
    context.task,
    hasSessionUser,
    isCompactBalloonViewport,
    pathname,
  ]);

  useEffect(() => {
    if (!showLoggedInBalloons) {
      loggedInBalloonCount.current = 0;
      setLoggedInBalloon("");
      return;
    }

    if (open) {
      return;
    }

    let hideTimeoutId: number | undefined;
    let intervalId: number | undefined;

    function scheduleCompactBalloonHide() {
      if (!isCompactBalloonViewport) {
        return;
      }

      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
      }

      hideTimeoutId = window.setTimeout(() => {
        setLoggedInBalloon("");
      }, COMPACT_BALLOON_HIDE_DELAY_MS);
    }

    function showNextLoggedInBalloon() {
      if (
        isCompactBalloonViewport &&
        loggedInBalloonCount.current >= COMPACT_BALLOON_MAX_COUNT
      ) {
        scheduleCompactBalloonHide();
        return false;
      }

      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
        hideTimeoutId = undefined;
      }

      if (isCompactBalloonViewport) {
        loggedInBalloonCount.current += 1;
      }

      setLoggedInBalloon((current) =>
        getRandomLoggedInBalloon(displayName, sessionArtifacts, current),
      );

      if (
        isCompactBalloonViewport &&
        loggedInBalloonCount.current >= COMPACT_BALLOON_MAX_COUNT
      ) {
        scheduleCompactBalloonHide();
        return false;
      }

      return true;
    }

    const shouldContinue = showNextLoggedInBalloon();

    if (shouldContinue) {
      intervalId = window.setInterval(() => {
        if (!showNextLoggedInBalloon() && intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, LOGGED_IN_BALLOON_INTERVAL_MS);
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }

      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
      }
    };
  }, [
    context.area,
    context.task,
    displayName,
    isCompactBalloonViewport,
    open,
    pathname,
    sessionArtifacts,
    showLoggedInBalloons,
  ]);

  useEffect(() => {
    if (!showPublicBalloons) {
      setPublicBalloon("");
      return;
    }

    if (publicNoticeVisible) {
      return;
    }

    let hideTimeoutId: number | undefined;
    let intervalId: number | undefined;

    function scheduleCompactBalloonHide() {
      if (!isCompactBalloonViewport) {
        return;
      }

      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
      }

      hideTimeoutId = window.setTimeout(() => {
        setPublicBalloon("");
      }, COMPACT_BALLOON_HIDE_DELAY_MS);
    }

    function showNextPublicBalloon() {
      if (
        isCompactBalloonViewport &&
        publicBalloonCount.current >= COMPACT_BALLOON_MAX_COUNT
      ) {
        scheduleCompactBalloonHide();
        return false;
      }

      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
        hideTimeoutId = undefined;
      }

      if (isCompactBalloonViewport) {
        publicBalloonCount.current += 1;
      }

      setPublicBalloon((current) => getRandomPublicBalloon(current));

      if (
        isCompactBalloonViewport &&
        publicBalloonCount.current >= COMPACT_BALLOON_MAX_COUNT
      ) {
        scheduleCompactBalloonHide();
        return false;
      }

      return true;
    }

    const shouldContinue = showNextPublicBalloon();

    if (shouldContinue) {
      intervalId = window.setInterval(() => {
        if (!showNextPublicBalloon() && intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, LOGGED_IN_BALLOON_INTERVAL_MS);
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }

      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
      }
    };
  }, [
    context.area,
    context.task,
    isCompactBalloonViewport,
    pathname,
    publicNoticeVisible,
    showPublicBalloons,
  ]);

  useEffect(() => {
    if (!publicNoticeVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPublicNoticeVisible(false);
    }, 7000);

    return () => window.clearTimeout(timeoutId);
  }, [publicNoticeVisible]);

  function openCatty() {
    const currentContext = getCurrentPageContext();

    setContext(currentContext);

    if (!sessionUser || !isLoggedInAvaArea(currentContext)) {
      setOpen(false);
      setPublicNoticeVisible(true);
      return;
    }

    setMessages(initialCattyMessages);
    setOpen(true);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();

    if (!clean || isThinking) return;

    const currentContext = getCurrentPageContext();

    if (!canUseCattyChat) {
      setContext(currentContext);
      setDraft("");
      setMessages((current) => {
        const lastMessage = current.at(-1);

        if (
          lastMessage?.from === "catty" &&
          lastMessage.text === CATTY_AUTH_REQUIRED_REPLY
        ) {
          return current;
        }

        return [
          ...current,
          {
            from: "catty",
            text: CATTY_AUTH_REQUIRED_REPLY,
          },
        ];
      });
      return;
    }

    const userMessage: CattyMessage = { from: "user", text: clean };
    const outgoingHistory = [...messages, userMessage].slice(-8);

    setContext(currentContext);
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/catty/chat", {
        body: JSON.stringify({
          context: currentContext,
          history: outgoingHistory,
          message: clean,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      const reply =
        response.status === 401
          ? readReply(payload) || CATTY_AUTH_REQUIRED_REPLY
          : readReply(payload) || buildFallbackCattyReply(clean, currentContext);
      const messageId = readMessageId(payload);

      setMessages((current) => [
        ...current,
        {
          from: "catty",
          id: messageId,
          text: reply,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          from: "catty",
          text: buildFallbackCattyReply(clean, currentContext),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  async function sendFeedback(
    message: CattyMessage,
    kind: CattyWidgetFeedbackKind,
    idealReply?: string,
  ) {
    if (!message.id) {
      return;
    }

    setFeedbackStatus((current) => ({
      ...current,
      [message.id as string]: "sending",
    }));

    const result = await submitCattyReplyFeedback({
      cattyMessageId: message.id,
      idealReply,
      kind,
    });

    setFeedbackStatus((current) => ({
      ...current,
      [message.id as string]: result.ok ? "saved" : "error",
    }));

    if (result.ok) {
      setFeedbackOpenMessageId((current) =>
        current === message.id ? null : current,
      );
      setFeedbackDrafts((current) => ({
        ...current,
        [message.id as string]: "",
      }));
    }
  }

  return (
    <div
      className={`pointer-events-none fixed right-2.5 z-50 flex max-w-[calc(100vw-1rem)] flex-col items-end gap-2.5 sm:right-5 sm:max-w-none sm:gap-3 ${
        hasWhatsAppWidget ? "bottom-44 sm:bottom-24" : "bottom-4 sm:bottom-5"
      }`}
    >
      {open && canUseCattyChat ? (
        <section className="catty-chat-panel pointer-events-auto grid h-[min(590px,calc(100dvh-6.75rem))] w-[min(430px,calc(100vw-1rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[1.35rem] border border-primary/15 bg-card shadow-2xl shadow-primary/20 sm:h-[min(620px,calc(100dvh-7.25rem))] sm:w-[min(430px,calc(100vw-2rem))]">
          <header className="relative overflow-hidden bg-[linear-gradient(135deg,#412a4c_0%,#55315f_58%,#6d3971_100%)] px-4 py-3 text-primary-foreground">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CattyLoopFrame
                  className="catty-breathe size-12 shrink-0 rounded-2xl border border-white/45 bg-white p-0.5 shadow-lg shadow-black/10 ring-1 ring-white/20"
                  prefersReducedMotion={prefersReducedMotion}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-lg leading-none">Catty</strong>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground/85">
                      <Sparkles aria-hidden="true" className="size-3" />
                      {visibleContextCopy.eyebrow}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" />
                <span className="sr-only">Fechar Catty</span>
              </Button>
            </div>
          </header>

          <div
            className="min-h-0 flex flex-col gap-3 overflow-y-auto overscroll-contain bg-[#fff8fb] p-3.5 sm:p-4"
            aria-busy={isThinking}
            aria-live="polite"
          >
            {canUseCattyChat ? (
              messages.map((message, index) => {
                const canFeedback = message.from === "catty" && Boolean(message.id);
                const messageStatus = message.id
                  ? feedbackStatus[message.id]
                  : undefined;
                const idealDraft = message.id
                  ? feedbackDrafts[message.id] ?? ""
                  : "";

                return (
                  <div
                    key={`${message.from}-${message.id ?? index}`}
                    className={
                      message.from === "catty"
                        ? "max-w-[92%] break-words sm:max-w-[88%]"
                        : "ml-auto max-w-[92%] break-words sm:max-w-[88%]"
                    }
                  >
                    <p
                      className={
                        message.from === "catty"
                          ? "whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-foreground shadow-sm"
                          : "whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-primary p-3 text-sm leading-6 text-primary-foreground shadow-sm"
                      }
                    >
                      {message.text}
                    </p>

                    {canFeedback ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1 pl-2 text-[0.68rem] text-muted-foreground">
                        <FeedbackIconButton
                          disabled={messageStatus === "sending"}
                          label="Gostei"
                          onClick={() => {
                            void sendFeedback(message, "LIKED");
                          }}
                        >
                          <ThumbsUp aria-hidden="true" className="size-3" />
                        </FeedbackIconButton>
                        <FeedbackIconButton
                          disabled={messageStatus === "sending"}
                          label="Nao gostei"
                          onClick={() => {
                            void sendFeedback(message, "DISLIKED");
                          }}
                        >
                          <ThumbsDown aria-hidden="true" className="size-3" />
                        </FeedbackIconButton>
                        <FeedbackIconButton
                          disabled={messageStatus === "sending"}
                          label="Resposta confusa"
                          onClick={() => {
                            void sendFeedback(message, "CONFUSING");
                          }}
                        >
                          <CircleHelp aria-hidden="true" className="size-3" />
                        </FeedbackIconButton>
                        <FeedbackIconButton
                          disabled={messageStatus === "sending"}
                          label="Deveria responder assim"
                          onClick={() => {
                            setFeedbackOpenMessageId((current) =>
                              current === message.id ? null : (message.id ?? null),
                            );
                          }}
                        >
                          <MessageSquarePlus
                            aria-hidden="true"
                            className="size-3"
                          />
                        </FeedbackIconButton>
                        {messageStatus === "sending" ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="ml-1 size-3 animate-spin"
                          />
                        ) : null}
                        {messageStatus === "saved" ? (
                          <span className="ml-1">recebido</span>
                        ) : null}
                        {messageStatus === "error" ? (
                          <span className="ml-1 text-rose-600">
                            tente de novo
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {message.id && feedbackOpenMessageId === message.id ? (
                      <form
                        className="mt-2 rounded-xl border border-primary/10 bg-white/80 p-2 shadow-sm"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void sendFeedback(
                            message,
                            "SHOULD_ANSWER",
                            idealDraft,
                          );
                        }}
                      >
                        <textarea
                          value={idealDraft}
                          onChange={(event) => {
                            const value = event.target.value;

                            setFeedbackDrafts((current) => ({
                              ...current,
                              [message.id as string]: value,
                            }));
                          }}
                          className="min-h-16 w-full resize-none rounded-lg border bg-white px-3 py-2 text-xs leading-5 outline-none transition focus:border-primary"
                          maxLength={1000}
                          placeholder="Escreva como a Catty deveria responder..."
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setFeedbackOpenMessageId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={
                              messageStatus === "sending" || !idealDraft.trim()
                            }
                          >
                            Enviar
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p
                className="max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-foreground shadow-sm sm:max-w-[88%]"
              >
                {CATTY_AUTH_REQUIRED_REPLY}
              </p>
            )}
            {isThinking && canUseCattyChat ? (
              <div className="flex max-w-[92%] items-center gap-2 rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-muted-foreground shadow-sm sm:max-w-[88%]">
                <span>Catty esta pensando</span>
                <span className="catty-typing-dot" aria-hidden="true" />
                <span className="catty-typing-dot [animation-delay:140ms]" aria-hidden="true" />
                <span className="catty-typing-dot [animation-delay:280ms]" aria-hidden="true" />
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex min-h-0 flex-col gap-3 border-t bg-white/95 p-3">
            <div className="catty-quick-replies flex flex-wrap items-center gap-2 pb-1">
              <span className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Estudo
              </span>
              {quickReplies.map((reply) => {
                const Icon = quickReplyIcons[reply.icon];

                return (
                  <Button
                    key={reply.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 max-w-[12rem] shrink-0 justify-start rounded-full border border-primary/10 bg-[#fce5d8] px-3 text-xs font-semibold text-primary shadow-none hover:bg-primary/10"
                    disabled={isThinking || !canUseCattyChat}
                    onClick={() => {
                      void sendMessage(reply.text);
                    }}
                  >
                    <Icon data-icon="inline-start" className="size-3.5 shrink-0" />
                    <span className="truncate">{reply.label}</span>
                  </Button>
                );
              })}
            </div>
            <form
              className="flex min-w-0 gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(draft);
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Digite em portugues ou English"
                className="min-w-0 rounded-xl"
                disabled={isThinking || !canUseCattyChat}
                maxLength={600}
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 rounded-xl"
                disabled={isThinking || !canUseCattyChat}
              >
                <Send aria-hidden="true" />
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      {!open && showLoggedInBalloons && loggedInBalloon ? (
        <div
          className="catty-speech catty-speech--logged pointer-events-none mr-1 mb-10 sm:mb-0"
          role="status"
          aria-live="polite"
        >
          <span className="catty-speech__eyebrow">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Study mode
          </span>
          <span className="catty-speech__text">{loggedInBalloon}</span>
        </div>
      ) : null}

      {!open &&
      !showLoggedInBalloons &&
      (showPublicBalloons || publicNoticeVisible) &&
      visiblePublicBalloon ? (
        <div
          className={`catty-speech ${publicBalloonTone} pointer-events-none mr-1 mb-10 sm:mb-0`}
          role="status"
          aria-live="polite"
        >
          <span className="catty-speech__eyebrow">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {publicBalloonLabel}
          </span>
          <span className="catty-speech__text">{visiblePublicBalloon}</span>
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className={`catty-launcher catty-launcher-card pointer-events-auto overflow-hidden border border-white/70 p-1.5 shadow-2xl shadow-primary/20 ${
          open && canUseCattyChat
            ? "h-14 w-14 rounded-2xl sm:h-16 sm:w-16"
            : "h-[4.75rem] w-[4.75rem] rounded-[1.35rem] sm:h-[5.5rem] sm:w-[5.5rem]"
        }`}
        onClick={() => {
          if (open && canUseCattyChat) {
            setOpen(false);
          } else {
            openCatty();
          }
        }}
        aria-expanded={open || publicNoticeVisible}
        aria-label={open && canUseCattyChat ? "Fechar Catty" : "Abrir Catty"}
      >
        <CattyLoopFrame
          className="size-full rounded-[1.05rem]"
          prefersReducedMotion={prefersReducedMotion}
          showLabel={!open || !canUseCattyChat}
        />
        <span className="sr-only">Catty</span>
      </Button>
    </div>
  );
}

function CattyLoopFrame({
  className = "",
  prefersReducedMotion,
  showLabel = false,
}: {
  className?: string;
  prefersReducedMotion: boolean;
  showLabel?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`catty-loop-frame ${
        prefersReducedMotion ? "catty-loop-frame--static" : ""
      } ${className}`}
    >
      {!prefersReducedMotion ? (
        <video
          className="catty-loop-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={CATTY_LOOP_POSTER}
        >
          <source src={CATTY_LOOP_WEBM} type="video/webm" />
          <source src={CATTY_LOOP_MP4} type="video/mp4" />
        </video>
      ) : null}
      <span className="catty-loop-poster" />
      {showLabel ? <span className="catty-launcher-name">Catty</span> : null}
    </span>
  );
}

function FeedbackIconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-6 items-center justify-center rounded-full border border-transparent text-muted-foreground/75 transition hover:border-primary/15 hover:bg-white hover:text-primary disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}
