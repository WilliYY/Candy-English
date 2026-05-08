import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultAvaPath, isRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AvaHomePage() {
  const session = await auth();
  const role = session?.user?.role;

  if (isRole(role)) {
    redirect(getDefaultAvaPath(role));
  }

  redirect("/ava/login");
}
