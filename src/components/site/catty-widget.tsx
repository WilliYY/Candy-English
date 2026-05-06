"use client";

import Image from "next/image";
import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const quickReplies = [
  "Quero conhecer os planos.",
  "Como acesso minha aula ao vivo?",
  "Preciso falar com a teacher.",
];

export function CattyWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "catty",
      text: "Oi, eu sou a Catty. Posso te guiar pelo Candy English.",
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
        text:
          clean.toLowerCase().includes("aula") ||
          clean.toLowerCase().includes("meet")
            ? "A aula ao vivo aparece no AVA quando a teacher abrir o link do Google Meet."
            : "Vou registrar sua mensagem. Em breve a Candy English pode ligar essa conversa a uma IA ou atendimento real.",
      },
    ]);
    setDraft("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <section className="w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-lg border bg-card shadow-2xl">
          <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-3">
              <span className="relative flex size-11 overflow-hidden rounded-lg bg-white">
                <Image
                  src="/brand/catty.png"
                  alt=""
                  width={80}
                  height={80}
                  priority
                  className="size-full object-cover"
                />
              </span>
              <div className="flex flex-col">
                <strong>Catty</strong>
                <span className="text-xs text-primary-foreground/75">
                  Assistente Candy
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
              <span className="sr-only">Fechar Catty</span>
            </Button>
          </header>

          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto bg-muted/40 p-4">
            {messages.map((message, index) => (
              <p
                key={`${message.from}-${index}`}
                className={
                  message.from === "catty"
                    ? "max-w-[88%] rounded-lg bg-white p-3 text-sm leading-6"
                    : "ml-auto max-w-[88%] rounded-lg bg-primary p-3 text-sm leading-6 text-primary-foreground"
                }
              >
                {message.text}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t p-4">
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => sendMessage(reply)}
                >
                  {reply}
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
                placeholder="Escreva para a Catty"
              />
              <Button type="submit" size="icon">
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
        className="h-14 rounded-full px-5 shadow-2xl"
        onClick={() => setOpen((current) => !current)}
      >
        <MessageCircle data-icon="inline-start" />
        Catty
      </Button>
    </div>
  );
}
