import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { CattyWidget } from "@/components/site/catty-widget";
import { WhatsAppWidget } from "@/components/site/whatsapp-widget";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <WhatsAppWidget />
          <CattyWidget />
        </Providers>
      </body>
    </html>
  );
}
