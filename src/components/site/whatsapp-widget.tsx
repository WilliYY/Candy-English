"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { CANDY_SITE_WHATSAPP_URL } from "@/lib/whatsapp";

export function WhatsAppWidget() {
  const pathname = usePathname();

  if (pathname.startsWith("/ava") && pathname !== "/ava/login") {
    return null;
  }

  return (
    <a
      href={CANDY_SITE_WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a Candy English pelo WhatsApp"
      className="fixed bottom-4 right-4 z-50 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 sm:bottom-5 sm:right-5 sm:h-14 sm:px-5"
    >
      <WhatsAppIcon className="size-5 sm:size-6" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
