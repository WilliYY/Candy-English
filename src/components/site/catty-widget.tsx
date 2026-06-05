"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Heart,
  Lightbulb,
  MessageCircle,
  PencilLine,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildFallbackCattyReply,
  type CattyMessage,
  type CattyPageContext,
} from "@/lib/catty";
import {
  CATTY_AUTH_REQUIRED_REPLY,
  CATTY_INITIAL_MESSAGE,
  CATTY_LOGGED_IN_BALLOON_TEMPLATES,
  CATTY_PUBLIC_BALLOON_TEMPLATES,
  CATTY_PUBLIC_LOCKED_REPLY,
} from "@/lib/catty-personality";

type QuickReply = {
  icon: "book" | "check" | "heart" | "lightbulb" | "pencil" | "practice";
  label: string;
  text: string;
};

type CattyWidgetProps = {
  sessionUser?: {
    name: string | null;
  } | null;
};

const LOGGED_IN_BALLOON_INTERVAL_MS = 10_000;

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

function readMessages(payload: unknown): CattyMessage[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const messages = (payload as { messages?: unknown }).messages;

  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => {
      if (typeof message !== "object" || message === null) {
        return null;
      }

      const from = (message as { from?: unknown }).from;
      const text = (message as { text?: unknown }).text;

      if (
        (from !== "catty" && from !== "user") ||
        typeof text !== "string" ||
        text.trim().length === 0
      ) {
        return null;
      }

      return {
        from,
        text: text.trim(),
      } satisfies CattyMessage;
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

function getContextCopy(context: CattyPageContext) {
  if (context.area === "student" && context.task === "homeworks") {
    return {
      line: "Pss pss, te dou dica sem entregar resposta pronta.",
      title: "Homework Catty",
    };
  }

  if (context.area === "student" && context.task === "aulas") {
    return {
      line: "Miauw, manda uma palavra e eu explico simples.",
      title: "Aula Catty",
    };
  }

  if (context.task === "mensagens") {
    return {
      line: "Posso montar uma mensagem educada em ingles ou portugues.",
      title: "Message helper",
    };
  }

  if (context.area === "teacher") {
    return {
      line: "Te ajudo com instrucoes, feedback e exemplos para aula.",
      title: "Teacher helper",
    };
  }

  if (context.area === "admin") {
    return {
      line: "Oriento caminhos do AVA, sem tocar em dados sensiveis.",
      title: "Admin helper",
    };
  }

  return {
    line: "Bora estudar um pouquinho comigo agora.",
    title: "Study Catty",
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

function getRandomLoggedInBalloon(name: string, current?: string) {
  const greeting = getCattyGreeting();
  const availableTemplates = CATTY_LOGGED_IN_BALLOON_TEMPLATES.filter((template) => {
    const rendered = template
      .replace(/\{name\}/g, name)
      .replace(/\{greeting\}/g, greeting);

    return rendered !== current;
  });
  const templates =
    availableTemplates.length > 0
      ? availableTemplates
      : CATTY_LOGGED_IN_BALLOON_TEMPLATES;
  const template = templates[Math.floor(Math.random() * templates.length)];

  return template.replace(/\{name\}/g, name).replace(/\{greeting\}/g, greeting);
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
  const [publicNoticeVisible, setPublicNoticeVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextCopy = useMemo(() => getContextCopy(context), [context]);
  const quickReplies = useMemo(() => getQuickReplies(context), [context]);
  const displayName = useMemo(
    () => getFirstDisplayName(sessionUser?.name),
    [sessionUser?.name],
  );
  const canUseCattyChat = Boolean(sessionUser && isLoggedInAvaArea(context));
  const showLoggedInBalloons = canUseCattyChat;
  const showPublicBalloons = Boolean(
    !sessionUser && isPublicCattyArea(context) && !open,
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
  const visibleContextCopy = canUseCattyChat
    ? contextCopy
    : {
        line: "Entra na sua conta do AVA para conversar comigo.",
        title: "Catty no AVA",
      };

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
  }, []);

  useEffect(() => {
    if (!showLoggedInBalloons) {
      setLoggedInBalloon("");
      return;
    }

    setLoggedInBalloon((current) =>
      getRandomLoggedInBalloon(displayName, current),
    );

    const intervalId = window.setInterval(() => {
      setLoggedInBalloon((current) =>
        getRandomLoggedInBalloon(displayName, current),
      );
    }, LOGGED_IN_BALLOON_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [displayName, showLoggedInBalloons]);

  useEffect(() => {
    if (!showPublicBalloons) {
      setPublicBalloon("");
      return;
    }

    if (publicNoticeVisible) {
      return;
    }

    setPublicBalloon((current) => getRandomPublicBalloon(current));

    const intervalId = window.setInterval(() => {
      setPublicBalloon((current) => getRandomPublicBalloon(current));
    }, LOGGED_IN_BALLOON_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [publicNoticeVisible, showPublicBalloons]);

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

      setMessages((current) => [
        ...current,
        {
          from: "catty",
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

  return (
    <div
      className={`fixed right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:right-5 sm:max-w-none ${
        hasWhatsAppWidget ? "bottom-44 sm:bottom-24" : "bottom-4 sm:bottom-5"
      }`}
    >
      {open && canUseCattyChat ? (
        <section className="grid h-[min(620px,calc(100vh-6rem))] w-[min(420px,calc(100vw-2rem))] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-2xl shadow-primary/20">
          <header className="relative overflow-hidden bg-primary px-4 py-4 text-primary-foreground">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="catty-breathe relative flex size-16 shrink-0 overflow-hidden rounded-2xl border border-white/35 bg-white shadow-lg shadow-black/10">
                  <Image
                    src="/brand/catty.png"
                    alt=""
                    width={112}
                    height={112}
                    sizes="64px"
                    className="size-full object-cover"
                    priority={false}
                  />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="truncate text-lg">Catty</strong>
                    <Sparkles aria-hidden="true" className="size-4" />
                  </div>
                  <span className="text-xs font-medium text-primary-foreground/80">
                    {visibleContextCopy.title} da Candy
                  </span>
                  <p className="mt-1 max-w-64 text-xs leading-5 text-primary-foreground/80">
                    {visibleContextCopy.line}
                  </p>
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
            <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                <Heart aria-hidden="true" className="size-3.5" />
                study mode
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                <BookOpen aria-hidden="true" className="size-3.5" />
                dica sem resposta pronta
              </span>
            </div>
          </header>

          <div
            className="flex flex-col gap-3 overflow-y-auto bg-[#fff8fb] p-4"
            aria-busy={isThinking}
            aria-live="polite"
          >
            {canUseCattyChat ? (
              messages.map((message, index) => (
                <p
                  key={`${message.from}-${index}`}
                  className={
                    message.from === "catty"
                      ? "max-w-[88%] rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-foreground shadow-sm"
                      : "ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-primary p-3 text-sm leading-6 text-primary-foreground shadow-sm"
                  }
                >
                  {message.text}
                </p>
              ))
            ) : (
              <p
                className="max-w-[88%] rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-foreground shadow-sm"
              >
                {CATTY_AUTH_REQUIRED_REPLY}
              </p>
            )}
            {isThinking && canUseCattyChat ? (
              <div className="flex max-w-[88%] items-center gap-2 rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-muted-foreground shadow-sm">
                <span>Catty esta pensando</span>
                <span className="catty-typing-dot" aria-hidden="true" />
                <span className="catty-typing-dot [animation-delay:140ms]" aria-hidden="true" />
                <span className="catty-typing-dot [animation-delay:280ms]" aria-hidden="true" />
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-col gap-3 border-t bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Atalhos de estudo
              </span>
              <span className="rounded-full bg-primary/8 px-2 py-1 text-[0.68rem] font-semibold text-primary">
                2 min
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickReplies.map((reply) => {
                const Icon = quickReplyIcons[reply.icon];

                return (
                  <Button
                    key={reply.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-auto justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-xs leading-5"
                    disabled={isThinking || !canUseCattyChat}
                    onClick={() => {
                      void sendMessage(reply.text);
                    }}
                  >
                    <Icon data-icon="inline-start" />
                    {reply.label}
                  </Button>
                );
              })}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(draft);
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Digite em portugues ou English"
                className="rounded-xl"
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
        className="catty-launcher h-14 w-14 rounded-full p-1 shadow-2xl shadow-primary/20 sm:h-16 sm:w-auto sm:px-4"
        onClick={() => {
          if (open && canUseCattyChat) {
            setOpen(false);
          } else {
            openCatty();
          }
        }}
        aria-expanded={open || publicNoticeVisible}
      >
        <span className="relative flex size-11 overflow-hidden rounded-full border-2 border-white/55 bg-white shadow-sm sm:mr-2">
          <Image
            src="/brand/catty.png"
            alt=""
            width={88}
            height={88}
            sizes="44px"
            className="size-full object-cover"
          />
        </span>
        <span className="sr-only">Catty</span>
        <span aria-hidden="true" className="hidden font-semibold sm:inline">
          Catty
        </span>
        <MessageCircle
          aria-hidden="true"
          className="hidden size-3.5 sm:ml-1 sm:block sm:size-4"
        />
      </Button>
    </div>
  );
}
