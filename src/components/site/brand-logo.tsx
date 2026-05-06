import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  markClassName?: string;
  variant?: "light" | "dark";
};

export function BrandLogo({
  className,
  imageClassName,
  markClassName,
  variant = "dark",
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group relative inline-flex h-16 w-[230px] items-center overflow-hidden rounded-lg",
        variant === "light" ? "text-white" : "text-foreground",
        className,
      )}
      aria-label="Candy English"
    >
      {variant === "light" ? (
        <span className="absolute inset-1 rounded-lg bg-white/95" />
      ) : null}
      <span className={cn("relative block h-full w-full", markClassName)}>
        <Image
          src="/brand/logo-2.svg"
          alt="Candy English"
          width={320}
          height={400}
          priority
          unoptimized
          className={cn(
            "absolute left-1/2 top-1/2 h-auto w-[280px] -translate-x-1/2 -translate-y-1/2 scale-[1.18] object-contain transition-transform duration-300 group-hover:scale-[1.24]",
            imageClassName,
          )}
        />
      </span>
    </Link>
  );
}
