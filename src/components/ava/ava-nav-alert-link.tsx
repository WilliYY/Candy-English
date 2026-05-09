"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AvaNavAlertLinkProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  signature?: string;
};

function storageKey(href: string) {
  return `candy-ava-seen:${href}`;
}

export function AvaNavAlertLink({
  children,
  className,
  href,
  signature,
}: AvaNavAlertLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasAlert, setHasAlert] = useState(false);

  useEffect(() => {
    if (!signature) {
      setHasAlert(false);
      return;
    }

    const currentQuery = searchParams.toString();
    const currentHref = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
    const key = storageKey(href);

    if (currentHref === href) {
      window.localStorage.setItem(key, signature);
      setHasAlert(false);
      return;
    }

    const seenSignature = window.localStorage.getItem(key);

    if (!seenSignature) {
      window.localStorage.setItem(key, signature);
      setHasAlert(false);
      return;
    }

    setHasAlert(seenSignature !== signature);
  }, [href, pathname, searchParams, signature]);

  return (
    <Link
      href={href}
      className={cn("relative", className)}
      onClick={() => {
        if (signature) {
          window.localStorage.setItem(storageKey(href), signature);
          setHasAlert(false);
        }
      }}
    >
      {children}
      {hasAlert ? (
        <span
          aria-label="Novidade neste modulo"
          className="absolute right-2 top-2 size-2.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(229_124_216_/_0.22)]"
        />
      ) : null}
    </Link>
  );
}
