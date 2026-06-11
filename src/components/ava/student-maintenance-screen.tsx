import Image from "next/image";
import { Wrench } from "lucide-react";
import { BrandLogo } from "@/components/site/brand-logo";

export function StudentMaintenanceScreen() {
  return (
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#fefbfa] px-6 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(229,124,216,0.22),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(252,229,216,0.9),transparent_30%),linear-gradient(180deg,#fff_0%,#fcf1f8_100%)]" />
      <div className="absolute inset-x-0 top-16 -z-10 h-44 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.95),rgba(255,255,255,0)_68%)] blur-sm" />
      <div className="grid w-full max-w-5xl gap-8 rounded-lg border bg-white/82 p-6 shadow-2xl backdrop-blur md:grid-cols-[1fr_0.9fr] md:p-10">
        <div className="flex flex-col justify-between gap-10">
          <BrandLogo
            className="h-[4.6rem] w-[280px] overflow-visible"
            imageClassName="w-[360px]"
          />
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              <Wrench aria-hidden="true" />
              Manutencao Candy
            </span>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-6xl">
              Estamos deixando seu AVA mais doce.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
              A area do aluno esta em manutencao agora. Daqui a pouco suas
              aulas, homeworks e feedbacks voltam para voce continuar estudando.
            </p>
          </div>
        </div>

        <div className="relative min-h-72 overflow-hidden rounded-lg bg-primary text-primary-foreground">
          <div className="candy-kinetic-grid absolute inset-0 opacity-70" />
          <div className="absolute inset-x-6 top-10 h-28 rounded-[999px] bg-white/20 blur-2xl" />
          <Image
            src="/brand/catty.png"
            alt=""
            width={420}
            height={420}
            className="absolute bottom-0 left-1/2 w-[min(86%,360px)] -translate-x-1/2"
            priority
          />
        </div>
      </div>
    </section>
  );
}
