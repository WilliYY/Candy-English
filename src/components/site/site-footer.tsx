import Link from "next/link";
import { BrandLogo } from "@/components/site/brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-[#2c1338] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 md:grid-cols-[1fr_1fr] md:items-end lg:px-8">
        <div className="flex flex-col gap-4">
          <BrandLogo variant="light" />
          <p className="max-w-md text-sm leading-6 text-white/70">
            Site institucional e AVA proprio da Candy English em
            candyenglish.com.br/ava.
          </p>
        </div>
        <nav
          aria-label="Rodape"
          className="flex flex-wrap gap-4 text-sm text-white/70 md:justify-end"
        >
          <Link className="hover:text-white" href="/sobre">
            Sobre
          </Link>
          <Link className="hover:text-white" href="/metodologia">
            Metodologia
          </Link>
          <Link className="hover:text-white" href="/planos">
            Planos
          </Link>
          <Link className="hover:text-white" href="/contato">
            Contato
          </Link>
          <Link className="hover:text-white" href="/ava">
            AVA
          </Link>
        </nav>
      </div>
    </footer>
  );
}
