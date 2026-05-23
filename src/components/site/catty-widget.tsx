"use client";

import Image from "next/image";
import {
  BookOpen,
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CattyMessage = {
  from: "catty" | "user";
  text: string;
};

const quickReplies = [
  {
    label: "Me anima",
    text: "Me anima a estudar ingles hoje.",
  },
  {
    label: "Practice English",
    text: "Can you help me practice English?",
  },
  {
    label: "Aula ao vivo",
    text: "Como entro na aula ao vivo?",
  },
  {
    label: "Homework",
    text: "Como faco meu homework?",
  },
];

const portugueseSignals = [
  "aula",
  "como",
  "contrato",
  "dever",
  "estudar",
  "faco",
  "falar",
  "homework",
  "ingles",
  "mensagem",
  "senha",
  "teacher",
  "voce",
];

const englishSignals = [
  "am",
  "are",
  "can",
  "could",
  "do",
  "does",
  "english",
  "good",
  "grammar",
  "hello",
  "help",
  "hi",
  "how",
  "is",
  "learn",
  "mean",
  "practice",
  "say",
  "sentence",
  "should",
  "study",
  "what",
  "why",
  "word",
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function isEnglishMessage(text: string) {
  const normalized = normalizeText(text);
  const englishMatches = englishSignals.filter((term) =>
    normalized.includes(term),
  ).length;
  const portugueseMatches = portugueseSignals.filter((term) =>
    normalized.includes(term),
  ).length;
  const onlySimpleLatin = /^[a-z0-9\s?'".,!:-]+$/.test(normalized);

  return englishMatches > 0 && (englishMatches >= portugueseMatches || onlySimpleLatin);
}

function buildEnglishReply(text: string) {
  const normalized = normalizeText(text);

  if (hasAny(normalized, ["how are you", "hello", "hi"])) {
    return "Hi, sweet learner. I am ready to study with you. Try this: I can learn a little English every day.";
  }

  if (hasAny(normalized, ["practice", "study", "learn", "english"])) {
    return "Yes. Let us practice gently. Say this out loud: I am getting better at English one step at a time.";
  }

  if (hasAny(normalized, ["what does", "mean", "word"])) {
    return "Send me the word and I will help with a simple meaning. Small words, big progress.";
  }

  if (hasAny(normalized, ["grammar", "sentence", "say"])) {
    return "Send one sentence and I will help make it clearer. You are already practicing, and that counts.";
  }

  return "I like that you wrote in English. Keep going. Try one more sentence and make it a tiny bit clearer.";
}

function buildPortugueseReply(text: string) {
  const normalized = normalizeText(text);

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
  }

  if (hasAny(normalized, ["homework", "atividade", "dever"])) {
    return "Abra Responder homework, escolha a atividade e faca um pedacinho por vez. Sem pressa: consistencia ganha de correria.";
  }

  if (hasAny(normalized, ["senha", "login", "entrar"])) {
    return "Se o acesso travar, peca para o admin redefinir sua senha. Depois volte com calma para continuar estudando.";
  }

  if (hasAny(normalized, ["contrato", "contratos"])) {
    return "Os contratos ficam em Meus contratos dentro do AVA. Se algo nao aparecer, avise a Candy para conferir seu cadastro.";
  }

  if (hasAny(normalized, ["plano", "planos", "preco", "valor"])) {
    return "Para planos e valores, o melhor caminho e falar direto com a Candy. Eu fico aqui cuidando do seu animo de estudo.";
  }

  if (hasAny(normalized, ["anima", "estudar", "ingles", "ringles", "cansad"])) {
    return "Combinado: hoje vale uma meta pequena. Leia uma frase em ingles, repita em voz alta e comemore. Pequeno tambem e progresso.";
  }

  if (hasAny(normalized, ["teacher", "prof", "mensagem", "falar"])) {
    return "Para falar com a teacher, use Mensagens no AVA. Escreva simples e direto; a parte dificil voce ja fez: pediu ajuda.";
  }

  return "Estou aqui para deixar o estudo mais leve. Me pergunte sobre homework, aula ao vivo ou mande uma frase em ingles para praticar.";
}

function buildCattyReply(text: string) {
  return isEnglishMessage(text)
    ? buildEnglishReply(text)
    : buildPortugueseReply(text);
}

export function CattyWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CattyMessage[]>([
    {
      from: "catty",
      text: "Oi, eu sou a Catty. Vamos estudar ingles do jeitinho Candy: leve, fofo e sem medo de errar.",
    },
  ]);
  const [draft, setDraft] = useState("");

  function sendMessage(text: string) {
    const clean = text.trim();

    if (!clean) return;

    setMessages((current) => [
      ...current,
      { from: "user", text: clean },
      {
        from: "catty",
        text: buildCattyReply(clean),
      },
    ]);
    setDraft("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open ? (
        <section className="grid h-[min(560px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-2xl shadow-primary/20">
          <header className="bg-primary px-4 py-4 text-primary-foreground">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative flex size-14 shrink-0 overflow-hidden rounded-2xl border border-white/30 bg-white">
                  <Image
                    src="/brand/catty.png"
                    alt=""
                    width={96}
                    height={96}
                    sizes="56px"
                    className="size-full object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="truncate text-base">Catty</strong>
                    <Sparkles aria-hidden="true" className="size-4" />
                  </div>
                  <span className="text-xs text-primary-foreground/80">
                    study buddy da Candy
                  </span>
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
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                <Heart aria-hidden="true" className="size-3.5" />
                animo de estudo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                <BookOpen aria-hidden="true" className="size-3.5" />
                responde em English
              </span>
            </div>
          </header>

          <div
            className="flex flex-col gap-3 overflow-y-auto bg-[#fff8fb] p-4"
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
          </div>

          <div className="flex flex-col gap-3 border-t bg-white p-4">
            <div className="grid grid-cols-2 gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-auto justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-xs leading-5"
                  onClick={() => sendMessage(reply.text)}
                >
                  {reply.label}
                </Button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(draft);
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Portugues ou English"
                className="rounded-xl"
              />
              <Button type="submit" size="icon" className="shrink-0 rounded-xl">
                <Send aria-hidden="true" />
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-14 rounded-full px-3 shadow-2xl shadow-primary/20 sm:px-4"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="relative mr-2 flex size-9 overflow-hidden rounded-full border border-white/40 bg-white">
          <Image
            src="/brand/catty.png"
            alt=""
            width={72}
            height={72}
            sizes="36px"
            className="size-full object-cover"
          />
        </span>
        <span className="sr-only">Catty</span>
        <span aria-hidden="true" className="hidden sm:inline">
          Catty
        </span>
        <MessageCircle aria-hidden="true" className="size-4 sm:ml-1" />
      </Button>
    </div>
  );
}
