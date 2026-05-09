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
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      {avatarPath && userId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/ava/avatar/${userId}`}
          alt="Foto do perfil"
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound aria-hidden="true" className={cn("size-5", iconClassName)} />
      )}
    </span>
  );
}
