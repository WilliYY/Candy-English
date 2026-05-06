import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CandyField } from "@/components/site/candy-field";
import { CattyWidget } from "@/components/site/catty-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <CandyField />
          <CattyWidget />
        </Providers>
      </body>
    </html>
  );
}
