"use client";

import {
  CheckCircle2,
  ClipboardCopy,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  beginAdminMfaEnrollment,
  cancelAdminMfaEnrollment,
  confirmAdminMfaEnrollment,
  disableAdminMfa,
  type AdminMfaActionResult,
} from "@/app/ava/admin/mfa-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Enrollment = NonNullable<AdminMfaActionResult["enrollment"]>;

export function AdminMfaPanel({
  email,
  enabledAt,
}: {
  email: string;
  enabledAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [enrollmentPassword, setEnrollmentPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [isEnabled, setIsEnabled] = useState(Boolean(enabledAt));
  const [feedback, setFeedback] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  function applyResult(result: AdminMfaActionResult) {
    setFeedback({ message: result.message, ok: result.ok });
    return result.ok;
  }

  function reportUnexpectedError() {
    setFeedback({
      message: "Nao foi possivel concluir agora. Tente novamente.",
      ok: false,
    });
  }

  function beginEnrollment() {
    startTransition(async () => {
      try {
        const result = await beginAdminMfaEnrollment({
          password: enrollmentPassword,
        });

        if (applyResult(result) && result.enrollment) {
          setEnrollment(result.enrollment);
          setEnrollmentPassword("");
          setRecoveryCodes(null);
          setConfirmCode("");
        }
      } catch {
        reportUnexpectedError();
      }
    });
  }

  function cancelEnrollment() {
    startTransition(async () => {
      try {
        const result = await cancelAdminMfaEnrollment();

        if (applyResult(result)) {
          setEnrollment(null);
          setConfirmCode("");
          router.refresh();
        }
      } catch {
        reportUnexpectedError();
      }
    });
  }

  function confirmEnrollment() {
    startTransition(async () => {
      try {
        const result = await confirmAdminMfaEnrollment({ code: confirmCode });

        if (applyResult(result)) {
          setIsEnabled(true);
          setEnrollment(null);
          setConfirmCode("");
          setRecoveryCodes(result.recoveryCodes ?? null);
          router.refresh();
        }
      } catch {
        reportUnexpectedError();
      }
    });
  }

  function disableMfa() {
    startTransition(async () => {
      try {
        const result = await disableAdminMfa({
          code: disableCode,
          password: disablePassword,
        });

        if (applyResult(result)) {
          setIsEnabled(false);
          setDisableCode("");
          setDisablePassword("");
          await signOut({ callbackUrl: "/ava/login" });
        }
      } catch {
        reportUnexpectedError();
      }
    });
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ message: successMessage, ok: true });
    } catch {
      setFeedback({
        message: "Nao foi possivel copiar automaticamente. Selecione o texto.",
        ok: false,
      });
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm">
      <div className="grid gap-5 bg-[linear-gradient(135deg,#362044_0%,#5c2c67_55%,#7b356c_100%)] p-5 text-white lg:grid-cols-[1fr_auto] lg:items-center sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 shadow-inner">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-100">
              Protecao da conta administrativa
            </p>
            <h2 className="mt-1 text-xl font-bold">Autenticacao em duas etapas</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/78">
              Exige senha e um codigo temporario no login. Cada admin configura a
              propria conta.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
            isEnabled
              ? "border-emerald-200/45 bg-emerald-300/16 text-emerald-50"
              : "border-amber-200/45 bg-amber-300/14 text-amber-50",
          )}
        >
          {isEnabled ? (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          ) : (
            <ShieldOff aria-hidden="true" className="size-4" />
          )}
          {isEnabled ? "2FA ativo" : "Ativacao recomendada"}
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        {feedback ? (
          <p
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              feedback.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            )}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}

        {!isEnabled && !enrollment ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(15rem,20rem)_auto] lg:items-end">
            <div>
              <h3 className="font-semibold text-primary">Proteja {email}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use Google Authenticator, Microsoft Authenticator, 1Password ou
                outro aplicativo TOTP. A ativacao nao encerra esta sessao.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-primary">
              Confirme sua senha atual
              <Input
                type="password"
                autoComplete="current-password"
                value={enrollmentPassword}
                onChange={(event) => setEnrollmentPassword(event.target.value)}
                disabled={isPending}
              />
            </label>
            <Button
              onClick={beginEnrollment}
              disabled={isPending || enrollmentPassword.length < 8}
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <Smartphone data-icon="inline-start" />
              )}
              Configurar 2FA
            </Button>
          </div>
        ) : null}

        {enrollment ? (
          <div className="grid gap-5 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/55 p-4 sm:p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-800">
                Etapa 1 de 2
              </p>
              <h3 className="mt-1 font-semibold text-primary">
                Adicione uma chave manual no autenticador
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Tipo baseado em tempo (TOTP), 6 digitos, periodo de 30 segundos.
                Esta chave expira em 10 minutos se nao for confirmada.
              </p>
            </div>

            <div className="grid gap-3 rounded-xl border border-fuchsia-200 bg-white p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Conta</p>
                <p className="mt-1 break-all text-sm font-medium text-primary">{email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Chave secreta</p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 break-all rounded-lg bg-primary/5 px-3 py-2 text-sm font-bold tracking-[0.12em] text-primary">
                    {enrollment.secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      copyText(enrollment.secret, "Chave copiada com seguranca.")
                    }
                  >
                    <ClipboardCopy data-icon="inline-start" />
                    Copiar
                  </Button>
                </div>
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer font-semibold text-primary">
                  URI tecnica para outro gerenciador
                </summary>
                <code className="mt-2 block break-all rounded-lg bg-primary/5 p-3">
                  {enrollment.provisioningUri}
                </code>
              </details>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm font-semibold text-primary">
                Codigo exibido no aplicativo
                <Input
                  value={confirmCode}
                  onChange={(event) => setConfirmCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="000000"
                  disabled={isPending}
                />
              </label>
              <Button
                onClick={confirmEnrollment}
                disabled={isPending || confirmCode.trim().length < 6}
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <LockKeyhole data-icon="inline-start" />
                )}
                Ativar 2FA
              </Button>
              <Button
                variant="outline"
                onClick={cancelEnrollment}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {recoveryCodes ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-800" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-amber-950">
                  Salve estes codigos agora
                </h3>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  Cada codigo funciona uma unica vez se o celular nao estiver
                  disponivel. Depois que sair desta tela, eles nao serao mostrados.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {recoveryCodes.map((code) => (
                    <code
                      key={code}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center text-sm font-bold tracking-wider text-amber-950"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() =>
                    copyText(
                      recoveryCodes.join("\n"),
                      "Codigos de recuperacao copiados.",
                    )
                  }
                >
                  <ClipboardCopy data-icon="inline-start" />
                  Copiar todos
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isEnabled ? (
          <details className="rounded-xl border border-red-200 bg-red-50/45 p-4">
            <summary className="cursor-pointer font-semibold text-red-900">
              Desativar 2FA desta conta
            </summary>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="grid gap-1.5 text-sm font-semibold text-primary">
                Senha atual
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.target.value)}
                  disabled={isPending}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-primary">
                Codigo 2FA ou recuperacao
                <Input
                  autoComplete="one-time-code"
                  value={disableCode}
                  onChange={(event) => setDisableCode(event.target.value)}
                  disabled={isPending}
                  maxLength={32}
                />
              </label>
              <Button
                variant="destructive"
                onClick={disableMfa}
                disabled={
                  isPending ||
                  disablePassword.length < 8 ||
                  disableCode.trim().length < 6
                }
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <ShieldOff data-icon="inline-start" />
                )}
                Desativar e sair
              </Button>
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
