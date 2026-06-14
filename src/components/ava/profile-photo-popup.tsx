"use client";

import { Camera, ChevronRight, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ProfilePhotoPopupProps = {
  markSeen?: boolean;
  photoXp?: number;
  profileHref?: string;
  show: boolean;
  userId: string;
};

function getDailyStorageKey(userId: string) {
  const today = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date());

  return `candy-profile-photo-popup:${userId}:${today}`;
}

export function ProfilePhotoPopup({
  markSeen = false,
  photoXp = 0,
  profileHref = "/ava/student?task=perfil",
  show,
  userId,
}: ProfilePhotoPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const lastGateRef = useRef<string | null>(null);

  useEffect(() => {
    const gateKey = `${userId}:${show ? "show" : "hide"}:${markSeen ? "mark" : "idle"}`;

    if (lastGateRef.current === gateKey) {
      return;
    }

    lastGateRef.current = gateKey;

    try {
      const storageKey = getDailyStorageKey(userId);

      if (!show) {
        if (markSeen) {
          window.localStorage.setItem(storageKey, "shown");
        }

        setIsVisible(false);
        return;
      }

      if (window.localStorage.getItem(storageKey) === "shown") {
        setIsVisible(false);
        return;
      }

      window.localStorage.setItem(storageKey, "shown");
      setIsVisible(true);
    } catch {
      setIsVisible(show);
    }
  }, [markSeen, show, userId]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-primary/25 p-3 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
    >
      <div className="relative w-full max-w-[390px] rounded-[26px] bg-gradient-to-br from-fuchsia-300 via-white to-amber-200 p-[2px] shadow-2xl shadow-primary/35">
        <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white text-primary">
          <button
            aria-label="Fechar aviso de foto do perfil"
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/92 text-primary shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setIsVisible(false)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>

          <button
            className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
            onClick={() => router.push(profileHref)}
            type="button"
          >
            <div className="relative bg-[linear-gradient(135deg,#fff7fb_0%,#ffffff_48%,#fff3df_100%)] px-3 pt-3">
              <div className="overflow-hidden rounded-[20px] border border-primary/10 bg-white/75 shadow-inner">
                <video
                  aria-label="Aviso visual para completar foto do perfil"
                  autoPlay
                  className="aspect-[16/11] w-full bg-white object-contain"
                  loop
                  muted
                  playsInline
                  preload="metadata"
                >
                  <source src="/brand/profile-photo-popup.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            <div className="space-y-3 px-5 pb-5 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-primary">
                  <Camera aria-hidden="true" className="size-3.5" />
                  Foto do perfil
                </span>
                {photoXp > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">
                    <Sparkles aria-hidden="true" className="size-3.5" />
                    +{photoXp} XP
                  </span>
                ) : null}
              </div>

              <div>
                <h2 className="text-xl font-black leading-tight tracking-normal text-primary">
                  Complete sua foto Candy
                </h2>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
                  Abra seu perfil, envie uma foto e deixe seu AVA com a sua cara.
                </p>
              </div>

              <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition group-hover:-translate-y-0.5 group-hover:shadow-primary/30">
                Abrir meu perfil
                <ChevronRight aria-hidden="true" className="size-4" />
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
