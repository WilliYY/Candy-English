import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { CattyWidget } from "@/components/site/catty-widget";
import { WhatsAppWidget } from "@/components/site/whatsapp-widget";
import { auth } from "@/lib/auth";
import { getCattyUserArtifactContext } from "@/lib/catty-user-artifacts";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
  },
  title: {
    default: "Candy English",
    template: "%s | Candy English",
  },
  description:
    "Site institucional e AVA da Candy English para aulas, materiais, homeworks e feedbacks.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const cattyArtifacts = session?.user?.id
    ? await getCattyUserArtifactContext({
        userId: session.user.id,
      }).catch(() => [])
    : [];
  const cattySessionUser = session?.user?.id
    ? {
        artifacts: cattyArtifacts,
        name: session.user.name ?? null,
      }
    : null;

  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <WhatsAppWidget />
          <CattyWidget sessionUser={cattySessionUser} />
        </Providers>
      </body>
    </html>
  );
}
