"use client";

import { LoaderCircle, ShieldAlert, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleMaintenanceMode } from "@/app/ava/admin/actions";
import { Button } from "@/components/ui/button";

export function AdminMaintenancePanel({
  enabled,
}: {
  enabled: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-lg border bg-muted/40 p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className="text-2xl font-semibold">Modo manutencao</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Quando ativado, alunos nao conseguem entrar no AVA e veem uma tela
              de manutencao Candy. Admins e teachers continuam entrando para
              ajustar aulas, cadastros e conteudos.
            </p>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <ShieldAlert aria-hidden="true" />
              Status:{" "}
              <strong>{enabled ? "manutencao ativa" : "acesso normal"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-5 rounded-lg border bg-background p-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">
            {enabled ? "Liberar alunos" : "Colocar em manutencao"}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Use este botao antes de mexer no AVA com o Codex para evitar aluno
            acessando area em ajuste.
          </p>
        </div>

        {message ? (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <Button
          type="button"
          size="lg"
          variant={enabled ? "secondary" : "default"}
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await toggleMaintenanceMode({ enabled: !enabled });
              setMessage(result.message);

              if (result.ok) {
                router.refresh();
              }
            });
          }}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Wrench data-icon="inline-start" />
          )}
          {enabled ? "Desativar manutencao" : "Ativar manutencao"}
        </Button>
      </div>
    </div>
  );
}
