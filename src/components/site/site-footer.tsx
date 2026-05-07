import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-[#2c1338] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 md:grid-cols-[1fr_1fr] md:items-end lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit text-2xl font-semibold tracking-normal text-white"
          >
            Candy English
          </Link>
          <p className="max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-[#e57cd8]">
            Aprender ingles nunca foi tao doce
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
