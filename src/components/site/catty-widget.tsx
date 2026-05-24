"use client";

import Image from "next/image";
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

type QuickReply = {
  icon: "book" | "check" | "heart" | "lightbulb" | "pencil" | "practice";
  label: string;
  text: string;
};

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
      line: "Te ajudo a entender o homework, sem entregar resposta pronta.",
      title: "Homework buddy",
    };
  }

  if (context.area === "student" && context.task === "aulas") {
    return {
      line: "Manda uma palavra da aula e eu explico bem simples.",
      title: "Aula buddy",
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
    line: "Pratique um pouquinho de ingles comigo agora.",
    title: "Study buddy",
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

export function CattyWidget() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [context, setContext] = useState<CattyPageContext>({
    area: "unknown",
  });
  const [messages, setMessages] = useState<CattyMessage[]>([
    {
      from: "catty",
      text: "Oi, eu sou a Catty. Me chama para praticar ingles, corrigir uma frase ou destravar uma atividade.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextCopy = useMemo(() => getContextCopy(context), [context]);
  const quickReplies = useMemo(() => getQuickReplies(context), [context]);
  const hasWhatsAppWidget = context.area === "site" || context.area === "login";

  useEffect(() => {
    if (!open) return;

    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [isThinking, messages, open]);

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

  function openCatty() {
    setContext(getCurrentPageContext());
    setHasOpened(true);
    setOpen(true);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();

    if (!clean || isThinking) return;

    const currentContext = getCurrentPageContext();
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
        readReply(payload) || buildFallbackCattyReply(clean, currentContext);

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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open ? (
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
                    {contextCopy.title} da Candy
                  </span>
                  <p className="mt-1 max-w-64 text-xs leading-5 text-primary-foreground/80">
                    {contextCopy.line}
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
            {messages.map((message, index) => (
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
            ))}
            {isThinking ? (
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
                    disabled={isThinking}
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
                disabled={isThinking}
                maxLength={600}
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 rounded-xl"
                disabled={isThinking}
              >
                <Send aria-hidden="true" />
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      {!open && !hasOpened && !hasWhatsAppWidget ? (
        <div className="catty-pop pointer-events-none mr-1 max-w-[230px] rounded-2xl rounded-br-sm border border-primary/15 bg-white px-4 py-3 text-sm leading-5 text-primary shadow-xl shadow-primary/10">
          Hi! Vamos estudar um pouquinho?
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="catty-launcher h-16 rounded-full px-3 shadow-2xl shadow-primary/20 sm:px-4"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openCatty();
          }
        }}
        aria-expanded={open}
      >
        <span className="relative mr-2 flex size-11 overflow-hidden rounded-full border-2 border-white/55 bg-white shadow-sm">
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
        <MessageCircle aria-hidden="true" className="size-4 sm:ml-1" />
      </Button>
    </div>
  );
}
