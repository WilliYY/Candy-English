"use client";

import { CircleAlert, House, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function AvaError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("AVA route error", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <section
        aria-labelledby="ava-error-title"
        className="w-full max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-lg sm:p-8"
      >
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-red-50 text-red-700">
          <CircleAlert aria-hidden="true" className="size-6" />
        </div>
        <p className="text-xs font-bold uppercase text-red-700">
          Nao foi possivel abrir esta area
        </p>
        <h1
          id="ava-error-title"
          className="mt-2 text-2xl font-extrabold text-primary"
        >
          O AVA encontrou um erro inesperado
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Seus dados nao foram apagados. Tente carregar novamente e, se o
          problema continuar, volte ao inicio do AVA.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Codigo do erro: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Tentar novamente
          </button>
          <a
            href="/ava"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <House aria-hidden="true" className="size-4" />
            Voltar ao inicio
          </a>
        </div>
      </section>
    </main>
  );
}
