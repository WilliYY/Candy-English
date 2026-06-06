"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SignOutButtonProps = {
  className?: string;
};

const AVA_LOGIN_PATH = "/ava/login";

export function SignOutButton({ className }: SignOutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut({
        redirect: false,
        redirectTo: AVA_LOGIN_PATH,
      });
    } finally {
      window.location.replace(AVA_LOGIN_PATH);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        className="w-full border-primary/20 bg-white text-primary hover:bg-primary hover:text-primary-foreground"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        <LogOut data-icon="inline-start" className="size-4" />
        {isSigningOut ? "Saindo..." : "Sair"}
      </Button>
    </div>
  );
}
