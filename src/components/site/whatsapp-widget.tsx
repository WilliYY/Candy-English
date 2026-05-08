"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

const whatsappUrl =
  "https://wa.me/5544997382355?text=Ol%C3%A1%21%20Tenho%20interesse%20em%20mais%20informa%C3%A7%C3%B5es";

export function WhatsAppWidget() {
  const pathname = usePathname();

  if (pathname.startsWith("/ava") && pathname !== "/ava/login") {
    return null;
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a Candy English pelo WhatsApp"
      className="fixed bottom-20 right-4 z-50 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 sm:bottom-24 sm:right-5 sm:h-14 sm:px-5"
    >
      <WhatsAppIcon className="size-5 sm:size-6" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
