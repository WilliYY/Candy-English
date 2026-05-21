"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AvaNavAlertLinkProps = {
  activeClassName?: string;
  children: React.ReactNode;
  className?: string;
  href: string;
  signature?: string;
};
type SearchParamsSnapshot = Pick<URLSearchParams, "get" | "toString">;

function storageKey(href: string) {
  return `candy-ava-seen:${href}`;
}

function isActiveHref(
  pathname: string,
  searchParams: SearchParamsSnapshot,
  href: string,
) {
  const [hrefPath, hrefQuery = ""] = href.split("?");

  if (pathname !== hrefPath) {
    return false;
  }

  const hrefParams = new URLSearchParams(hrefQuery);
  const hrefTask = hrefParams.get("task");

  if (hrefTask) {
    return searchParams.get("task") === hrefTask;
  }

  return searchParams.toString() === hrefParams.toString();
}

export function AvaNavAlertLink({
  activeClassName,
  children,
  className,
  href,
  signature,
}: AvaNavAlertLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasAlert, setHasAlert] = useState(false);
  const isActive = isActiveHref(pathname, searchParams, href);
  const showsActiveState = Boolean(activeClassName);

  useEffect(() => {
    if (!signature) {
      setHasAlert(false);
      return;
    }

    const currentQuery = searchParams.toString();
    const currentHref = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
    const key = storageKey(href);

    if (currentHref === href || isActiveHref(pathname, searchParams, href)) {
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
      aria-current={isActive && showsActiveState ? "page" : undefined}
      className={cn("relative", className, isActive && activeClassName)}
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
