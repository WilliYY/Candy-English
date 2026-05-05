import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/ava/login" });
      }}
    >
      <Button type="submit" variant="outline">
        <LogOut data-icon="inline-start" />
        Sair
      </Button>
    </form>
  );
}
