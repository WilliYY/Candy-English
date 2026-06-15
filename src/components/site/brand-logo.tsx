import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  animated?: boolean;
  className?: string;
  imageClassName?: string;
  markClassName?: string;
  variant?: "light" | "dark";
};

export function BrandLogo({
  animated = true,
  className,
  imageClassName,
  markClassName,
  variant = "dark",
}: BrandLogoProps) {
  const mediaClassName = cn(
    "absolute left-1/2 top-1/2 h-auto w-[280px] -translate-x-1/2 -translate-y-1/2 object-contain transition-transform duration-300 group-hover:scale-[1.04]",
    variant === "light"
      ? "brightness-[1.35] saturate-[1.18] drop-shadow-[0_14px_28px_rgb(255_255_255_/_0.16)]"
      : "drop-shadow-[0_10px_22px_rgb(44_19_56_/_0.1)]",
    imageClassName,
  );

  return (
    <Link
      href="/"
      className={cn(
        "group relative inline-flex h-16 w-[230px] items-center rounded-lg",
        variant === "light" ? "text-white" : "text-foreground",
        className,
      )}
      aria-label="Candy English"
      data-candy-logo="true"
    >
      <span className={cn("relative block h-full w-full", markClassName)}>
        {animated ? (
          <video
            aria-hidden="true"
            autoPlay
            className={cn("candy-brand-logo-video", mediaClassName)}
            data-candy-logo-video="true"
            disablePictureInPicture
            loop
            muted
            playsInline
            poster="/brand/candy-logo-animated-poster.png"
            preload="metadata"
          >
            <source src="/brand/candy-logo-animated.webm" type="video/webm" />
          </video>
        ) : null}
        <Image
          aria-hidden="true"
          src="/brand/candy-logo-animated-poster.png"
          alt=""
          width={720}
          height={315}
          unoptimized
          data-candy-logo-static={animated ? undefined : "true"}
          className={cn(
            "candy-brand-logo-poster",
            animated ? "hidden" : null,
            mediaClassName,
          )}
        />
      </span>
    </Link>
  );
}
