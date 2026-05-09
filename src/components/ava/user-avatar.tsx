import { UserRound } from "lucide-react";
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

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt="Foto do perfil"
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound aria-hidden="true" className={cn("size-5", iconClassName)} />
      )}
    </span>
  );
}
