const CANDY_WHATSAPP_FALLBACK_PHONE = "5544997382355";

export const CANDY_WHATSAPP_DISPLAY_PHONE = "+55 44 99738-2355";
export const CANDY_STUDENT_WHATSAPP_MESSAGE =
  "Ol\u00e1! Quero ser aluno Candy English. Pode me passar as informa\u00e7\u00f5es?";
export const CANDY_SITE_WHATSAPP_MESSAGE =
  "Ol\u00e1! Tenho interesse em mais informa\u00e7\u00f5es";

function normalizeWhatsappPhone(phone: string | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";

  // Fallback keeps the public WhatsApp CTA working if the env var is absent.
  return digits || CANDY_WHATSAPP_FALLBACK_PHONE;
}

export const CANDY_WHATSAPP_PHONE = normalizeWhatsappPhone(
  process.env.NEXT_PUBLIC_CANDY_WHATSAPP_PHONE,
);

export function buildCandyWhatsappUrl(message: string) {
  return `https://wa.me/${CANDY_WHATSAPP_PHONE}?text=${encodeURIComponent(
    message,
  )}`;
}

export const CANDY_SITE_WHATSAPP_URL = buildCandyWhatsappUrl(
  CANDY_SITE_WHATSAPP_MESSAGE,
);

export const CANDY_STUDENT_WHATSAPP_URL = buildCandyWhatsappUrl(
  CANDY_STUDENT_WHATSAPP_MESSAGE,
);
