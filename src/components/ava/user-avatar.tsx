"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  avatarPath?: string | null;
  className?: string;
  iconClassName?: string;
  userId?: string | null;
};

export function UserAvatar({
  avatarPath,
  className,
  iconClassName,
  userId,
}: UserAvatarProps) {
  const avatarUrl =
    avatarPath && userId
      ? `/ava/avatar/${userId}?v=${encodeURIComponent(avatarPath)}`
      : null;
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const canShowAvatar = avatarUrl && failedAvatarUrl !== avatarUrl;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/70 bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/12",
        className,
      )}
    >
      {canShowAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt="Foto do perfil"
          className="h-full w-full object-cover"
          onError={() => setFailedAvatarUrl(avatarUrl)}
        />
      ) : (
        <UserRound aria-hidden="true" className={cn("size-5", iconClassName)} />
      )}
    </span>
  );
}
