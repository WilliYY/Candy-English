"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ProfilePhotoPopupProps = {
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

  return `candy-profile-photo-popup:v3:${userId}:${today}`;
}

export function ProfilePhotoPopup({
  profileHref = "/ava/student?task=perfil",
  show,
  userId,
}: ProfilePhotoPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const lastGateRef = useRef<string | null>(null);

  useEffect(() => {
    const gateKey = `${userId}:${show ? "show" : "hide"}`;

    if (lastGateRef.current === gateKey) {
      return;
    }

    lastGateRef.current = gateKey;

    try {
      const storageKey = getDailyStorageKey(userId);

      if (!show || window.localStorage.getItem(storageKey) === "shown") {
        setIsVisible(false);
        return;
      }

      window.localStorage.setItem(storageKey, "shown");
      setIsVisible(true);
    } catch {
      setIsVisible(show);
    }
  }, [show, userId]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-primary/45 p-3 backdrop-blur-[3px] sm:p-6"
      role="dialog"
    >
      <div className="relative w-full max-w-[min(94vw,82svh,760px)] rounded-[22px] bg-gradient-to-br from-fuchsia-300 via-white to-amber-200 p-[2px] shadow-2xl shadow-primary/35">
        <button
          aria-label="Fechar video de foto do perfil"
          className="absolute -right-2 -top-2 z-10 flex size-10 items-center justify-center rounded-full border border-white/85 bg-white text-primary shadow-xl shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:-right-3 sm:-top-3"
          onClick={() => setIsVisible(false)}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <button
          aria-label="Abrir perfil para colocar foto"
          className="block aspect-square w-full overflow-hidden rounded-[20px] border border-white/85 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          onClick={() => router.push(profileHref)}
          type="button"
        >
          <video
            aria-label="Video para lembrar de colocar foto no perfil"
            autoPlay
            className="block size-full bg-white object-contain"
            loop
            muted
            playsInline
            preload="auto"
          >
            <source src="/brand/profile-photo-popup.mp4" type="video/mp4" />
          </video>
        </button>
      </div>
    </div>
  );
}
