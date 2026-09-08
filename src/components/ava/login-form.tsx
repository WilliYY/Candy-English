"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getSafeAvaCallbackUrl } from "@/lib/ava-callback-url";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { CANDY_STUDENT_WHATSAPP_URL } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  maintenanceMode,
}: {
  maintenanceMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setAuthError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError(
          maintenanceMode
            ? "Acesso de alunos pausado durante a manutencao. Admins e teachers podem entrar."
            : "E-mail ou senha inválidos. Confira seus dados e tente novamente.",
        );
        return;
      }

      router.replace(getSafeAvaCallbackUrl(searchParams.get("callbackUrl")));
      router.refresh();
    } catch {
      setAuthError("Não foi possível entrar agora. Tente novamente em instantes.");
    }
  });

  const emailError = form.formState.errors.email;
  const passwordError = form.formState.errors.password;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate aria-busy={isSubmitting}>
        <FieldGroup className="gap-5">
          <Field data-invalid={Boolean(emailError)}>
            <FieldLabel htmlFor="email" className="font-semibold">E-mail</FieldLabel>
            <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Seu e-mail cadastrado"
              className="h-12 rounded-xl pl-11 md:text-base"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "email-error" : undefined}
              disabled={isSubmitting}
              {...form.register("email")}
            />
            </div>
            <FieldError id="email-error" errors={[emailError]} />
          </Field>

          <Field data-invalid={Boolean(passwordError)}>
            <FieldLabel htmlFor="password" className="font-semibold">Senha</FieldLabel>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={Boolean(passwordError)}
                className="h-12 rounded-xl pl-11 pr-12 md:text-base"
                placeholder="Digite sua senha"
                aria-describedby={passwordError ? "password-error" : undefined}
                disabled={isSubmitting}
                {...form.register("password")}
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar senha" : "Mostrar senha"
                }
                aria-pressed={showPassword}
                className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-45"
                disabled={isSubmitting}
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
            <FieldError id="password-error" errors={[passwordError]} />
          </Field>
        </FieldGroup>

        {authError ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive" role="alert">
            {authError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="group h-12 rounded-xl text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
          {isSubmitting ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <ArrowRight aria-hidden="true" className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1" />
          )}
        </Button>
      </form>

      <div className="rounded-xl bg-secondary/45 p-4">
        <p className="mb-3 text-center text-xs font-medium text-muted-foreground">Ainda não faz parte da Candy?</p>
        <Button asChild variant="secondary" size="lg" className="h-auto min-h-11 w-full whitespace-normal rounded-lg py-3 font-semibold">
          <a
            href={CANDY_STUDENT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon data-icon="inline-start" />
            Quero ser aluno Candy
          </a>
        </Button>
        <p className="mt-2 text-center text-[11px] leading-5 text-muted-foreground">
          Converse com a equipe pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}
