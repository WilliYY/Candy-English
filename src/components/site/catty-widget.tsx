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
const CATTY_AUTH_REQUIRED_REPLY =
  "Awnn, eu sou só para alunos Candy. Entra na sua conta do AVA para conversar comigo.";
const CATTY_PUBLIC_LOCKED_REPLY =
  "Awnn, meu chat e so para alunos Candy. Entra no AVA ou vem virar aluno para conversar comigo.";

const publicBalloonTemplates = [
  "Miaww, a Catty ta aqui e a profa tambem. Vem ser aluno Candy!",
  "Pss pss, quer aprender ingles de um jeito mais docinho?",
  "Miaww, eu guardo as melhores dicas para alunos Candy.",
  "A Catty ta feliz porque hoje tem English!",
  "Vem estudar com a gente. Eu prometo miar motivacao.",
  "Ingles pode ser leve, fofo e poderoso. Vem pra Candy!",
  "Miaww, voce ainda nao e aluno Candy? Ta esperando o que?",
  "A profa ensina, eu acompanho e voce evolui.",
  "Aqui tem aula, carinho e um pouquinho de magia Candy.",
  "Quer destravar o ingles? A Catty te chama!",
  "Vem ser aluno Candy e ganhar sua parceira de estudos.",
  "Miaww, seu futuro bilingue ta piscando pra voce.",
  "Eu sou pequena, mas minha vontade de te ver falando ingles e gigante.",
  "English fica mais facil quando tem Candy no caminho.",
  "A Catty ta te esperando do lado de dentro do AVA.",
  "Entre para a Candy e venha estudar comigo.",
  "Miau miau, aula boa e aula com Candy.",
  "Voce traz a vontade, a Candy traz o metodo.",
  "Quer aprender sem aquele ingles travado? Vem!",
  "A profa prepara a aula e eu preparo o incentivo.",
  "Hoje e um otimo dia para comecar ingles.",
  "Miaww, eu tenho dicas, mas so libero para alunos Candy.",
  "Candy English: porque estudar tambem pode ser gostoso.",
  "Vem virar aluno Candy e desbloquear a Catty.",
  "Aqui a gente aprende ingles sem cara de escola chata.",
  "Eu vi um aluno evoluindo hoje. O proximo pode ser voce.",
  "Miaww, seu ingles merece um upgrade fofo.",
  "A Catty ta online, mas so alunos Candy conversam comigo.",
  "Quer praticar ingles com uma gatinha estudiosa?",
  "Vem para a Candy. Eu ja deixei seu cantinho preparado.",
] as const;

const loggedInBalloonTemplates = [
  "Miaww, {name}! Catty ta on. Let's practice! 🐱",
  "{greeting}, {name}! Vamos estudar ingles um pouquinho?",
  "Miaww, {name}! Como foi seu dia ate agora?",
  "Catty chegou, {name}. Bora destravar esse English?",
  "Ei, {name}, let's study together!",
  "Miaww, hoje e dia de evoluir no ingles.",
  "{name}, sua parceira de estudos esta online.",
  "Good to see you, {name}! Ready to practice?",
  "Miaww, {name}, abre uma atividade e vamos juntos.",
  "Um pouquinho por dia, {name}. English fica mais facil.",
  "Catty ta feliz porque voce entrou no AVA.",
  "{name}, quer praticar uma frase em ingles agora?",
  "Miaww, vamos aquecer o cerebro com English?",
  "{greeting}! A Catty ja separou energia de estudo.",
  "{name}, hoje seu ingles vai ganhar XP.",
  "Bora, {name}! Uma frase nova ja conta.",
  "Miaww, nao precisa ser perfeito. Precisa praticar.",
  "Catty mode on. Study mode on. Vamos!",
  "{name}, me chama se travar em alguma atividade.",
  "Quer revisar rapidinho, {name}?",
  "Miaww, estou aqui para te ajudar sem dar resposta pronta.",
  "{name}, cada mini pratica vira progresso.",
  "Let's go, {name}! Seu ingles agradece.",
  "Catty ta pronta. E voce, {name}?",
  "{greeting}, aluno Candy! Hoje tem evolucao.",
  "Miaww, {name}, vamos deixar esse ingles mais leve.",
  "Uma pergunta em English agora, {name}?",
  "Catty acredita em voce, {name}. Bora estudar!",
  "{name}, abre o Candy XP e vamos ganhar progresso.",
  "Miaww, o AVA fica mais fofo quando voce entra.",
  "Hoje e um bom dia para praticar listening, reading ou speaking.",
  "{name}, quer uma dica sem spoiler da resposta?",
  "Catty ta aqui: calma, foco e English.",
  "Miaww, vamos transformar duvida em pratica.",
  "{name}, seu futuro bilingue mandou um oi.",
  "Estudar 5 minutinhos ja vale, {name}.",
  "Good vibes, good English, {name}.",
  "Miaww, escolha uma missao e vamos comecar.",
  "{name}, quer treinar uma frase curtinha?",
  "Catty feliz, aluno online, English acontecendo!",
] as const;

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
  const availableTemplates = loggedInBalloonTemplates.filter((template) => {
    const rendered = template
      .replace(/\{name\}/g, name)
      .replace(/\{greeting\}/g, greeting);

    return rendered !== current;
  });
  const templates =
    availableTemplates.length > 0
      ? availableTemplates
      : loggedInBalloonTemplates;
  const template = templates[Math.floor(Math.random() * templates.length)];

  return template.replace(/\{name\}/g, name).replace(/\{greeting\}/g, greeting);
}

function getRandomPublicBalloon(current?: string) {
  const availableTemplates = publicBalloonTemplates.filter(
    (template) => template !== current,
  );
  const templates =
    availableTemplates.length > 0
      ? availableTemplates
      : publicBalloonTemplates;

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
  const [messages, setMessages] = useState<CattyMessage[]>([
    {
      from: "catty",
      text: "Oi, eu sou a Catty. Me chama para praticar ingles, corrigir uma frase ou destravar uma atividade.",
    },
  ]);
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
      className={`fixed right-4 z-50 flex flex-col items-end gap-3 sm:right-5 ${
        hasWhatsAppWidget ? "bottom-20 sm:bottom-24" : "bottom-4 sm:bottom-5"
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
          className="catty-speech catty-speech--logged pointer-events-none mr-1"
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
          className={`catty-speech ${publicBalloonTone} pointer-events-none mr-1`}
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
        className="catty-launcher h-16 rounded-full px-3 shadow-2xl shadow-primary/20 sm:px-4"
        onClick={() => {
          if (open && canUseCattyChat) {
            setOpen(false);
          } else {
            openCatty();
          }
        }}
        aria-expanded={open || publicNoticeVisible}
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
