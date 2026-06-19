"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const VISIT_COOLDOWN_MS = 30 * 60 * 1000;
const STORED_TOTAL_KEY = "candy_site_visit_total_v1";
const LAST_COUNTED_AT_KEY = "candy_site_visit_last_counted_at_v1";

function readStoredNumber(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredNumber(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // O contador nao deve atrapalhar o site se o navegador bloquear storage.
  }
}

function formatVisitTotal(total: number) {
  return new Intl.NumberFormat("pt-BR").format(total);
}

export function SiteVisitCounter() {
  const pathname = usePathname();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const cachedTotal = readStoredNumber(STORED_TOTAL_KEY);

    if (cachedTotal !== null) {
      setTotal(cachedTotal);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      const now = Date.now();
      const lastCountedAt = readStoredNumber(LAST_COUNTED_AT_KEY);
      const shouldCount =
        lastCountedAt === null || now - lastCountedAt > VISIT_COOLDOWN_MS;
      const requestInit: RequestInit = shouldCount
        ? {
            body: JSON.stringify({ pathname }),
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            keepalive: true,
            method: "POST",
          }
        : {
            cache: "no-store",
            method: "GET",
          };

      try {
        const response = await fetch("/api/site-visits", requestInit);

        if (!response.ok) {
          return;
        }

        const data: unknown = await response.json();

        if (
          !cancelled &&
          data &&
          typeof data === "object" &&
          "total" in data &&
          typeof data.total === "number"
        ) {
          setTotal(data.total);
          writeStoredNumber(STORED_TOTAL_KEY, data.total);

          if (
            shouldCount &&
            "counted" in data &&
            data.counted === true
          ) {
            writeStoredNumber(LAST_COUNTED_AT_KEY, now);
          }
        }
      } catch {
        // Falha silenciosa: o site continua normal sem depender do contador.
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <p
      aria-live="polite"
      className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-center text-xs font-semibold text-white/75 shadow-[0_14px_36px_rgb(0_0_0_/_0.12)] backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/15 hover:text-white sm:text-sm"
    >
      <span aria-hidden="true">{"\u{1F36C}"}</span>
      <span className="truncate">
        {total === null
          ? "Candy English recebendo visitas"
          : `Candy English j\u00e1 recebeu ${formatVisitTotal(total)} visitas`}
      </span>
    </p>
  );
}
