import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultAvaPath } from "@/lib/roles";

export const metadata: Metadata = {
  title: "AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AvaHomePage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(getDefaultAvaPath(session.user.role));
  }

  redirect("/ava/login");
}
