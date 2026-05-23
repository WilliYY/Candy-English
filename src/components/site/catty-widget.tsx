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
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildFallbackCattyReply,
  type CattyMessage,
} from "@/lib/catty";

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

function readReply(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const reply = (payload as { reply?: unknown }).reply;

  return typeof reply === "string" ? reply.trim() : "";
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
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [isThinking, messages, open]);

  async function sendMessage(text: string) {
    const clean = text.trim();

    if (!clean || isThinking) return;

    const userMessage: CattyMessage = { from: "user", text: clean };
    const outgoingHistory = [...messages, userMessage].slice(-8);

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/catty/chat", {
        body: JSON.stringify({
          history: outgoingHistory,
          message: clean,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      const reply = readReply(payload) || buildFallbackCattyReply(clean);

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
          text: buildFallbackCattyReply(clean),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
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
              <p className="max-w-[88%] rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3 text-sm leading-6 text-muted-foreground shadow-sm">
                Catty esta pensando numa resposta docinha para voce...
              </p>
            ) : null}
            <div ref={messagesEndRef} />
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
                  disabled={isThinking}
                  onClick={() => {
                    void sendMessage(reply.text);
                  }}
                >
                  {reply.label}
                </Button>
              ))}
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
                placeholder="Portugues ou English"
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
