import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  variant?: "light" | "dark";
};

export function BrandLogo({
  className,
  markClassName,
  variant = "dark",
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-3 font-semibold tracking-normal",
        variant === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-11 overflow-hidden rounded-lg bg-white p-1 shadow-sm",
          markClassName,
        )}
      >
        <Image
          src="/brand/logo-1.svg"
          alt=""
          width={44}
          height={44}
          priority
          unoptimized
          className="h-full w-full object-contain"
        />
      </span>
      <span className="leading-tight">
        Candy
        <span className="block text-sm font-medium opacity-75">English</span>
      </span>
    </Link>
  );
}
