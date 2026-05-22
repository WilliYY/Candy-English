"use client";

import { ExternalLink, LoaderCircle, Radio } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type JitsiApi = {
  dispose: () => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>,
    ) => JitsiApi;
  }
}

type LiveClassRoomProps = {
  className?: string;
  displayName?: string | null;
  meetingUrl: string;
  title: string;
};

function getJitsiRoomName(meetingUrl: string) {
  try {
    const url = new URL(meetingUrl);

    if (url.hostname.toLowerCase() !== "meet.jit.si") {
      return null;
    }

    return decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim() || null;
  } catch {
    return null;
  }
}

function loadJitsiScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://meet.jit.si/external_api.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://meet.jit.si/external_api.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function LiveClassRoom({
  className,
  displayName,
  meetingUrl,
  title,
}: LiveClassRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roomName = useMemo(() => getJitsiRoomName(meetingUrl), [meetingUrl]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    roomName ? "loading" : "ready",
  );

  useEffect(() => {
    if (!roomName || !containerRef.current) {
      return;
    }

    let disposed = false;
    let api: JitsiApi | null = null;

    setStatus("loading");

    loadJitsiScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) {
          return;
        }

        api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          configOverwrite: {
            disableDeepLinking: true,
            prejoinPageEnabled: true,
            startWithAudioMuted: true,
          },
          height: "100%",
          interfaceConfigOverwrite: {
            DEFAULT_BACKGROUND: "#2d1038",
          },
          parentNode: containerRef.current,
          roomName,
          userInfo: {
            displayName: displayName ?? "Candy English",
          },
          width: "100%",
        });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      disposed = true;
      api?.dispose();
    };
  }, [displayName, roomName]);

  if (!roomName) {
    return (
      <div
        className={cn(
          "mx-auto w-full rounded-2xl border border-white/20 bg-white/90 p-5 shadow-sm",
          className,
        )}
      >
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <Radio aria-hidden="true" className="size-4" />
            Sala externa
          </span>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Este link abre fora do AVA. Para aula embutida, deixe o campo de
              link vazio ao criar a aula.
            </p>
          </div>
          <Link
            href={meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Entrar na sala
            <ExternalLink aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-xl shadow-primary/10",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b bg-white/80 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            Camera, microfone, chat e compartilhamento de tela
          </p>
        </div>
        <Link
          href={meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-primary"
        >
          Nova aba
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <div className="relative h-[520px] bg-primary md:h-[620px]">
        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center text-primary-foreground">
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Preparando sala...
              </span>
            ) : (
              <Link
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary"
              >
                Abrir sala em nova aba
              </Link>
            )}
          </div>
        ) : null}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
