import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <form
      className={className}
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/ava/login" });
      }}
    >
      <Button type="submit" variant="outline" className="w-full bg-white">
        <LogOut data-icon="inline-start" />
        Sair
      </Button>
    </form>
  );
}
