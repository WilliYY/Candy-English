"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
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
      mfaCode: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setAuthError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        mfaCode: values.mfaCode,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError(
          maintenanceMode
            ? "Acesso de alunos pausado durante a manutencao. Admins e teachers podem entrar."
            : "Email, senha ou codigo de seguranca invalidos.",
        );
        return;
      }

      router.replace(getSafeAvaCallbackUrl(searchParams.get("callbackUrl")));
      router.refresh();
    } catch {
      setAuthError("Nao foi possivel entrar agora.");
    }
  });

  const emailError = form.formState.errors.email;
  const mfaCodeError = form.formState.errors.mfaCode;
  const passwordError = form.formState.errors.password;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(emailError)}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(emailError)}
              disabled={isSubmitting}
              {...form.register("email")}
            />
            <FieldError errors={[emailError]} />
          </Field>

          <Field data-invalid={Boolean(passwordError)}>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={Boolean(passwordError)}
                className="pr-12"
                disabled={isSubmitting}
                {...form.register("password")}
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar senha" : "Mostrar senha"
                }
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-primary/62 transition hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-45"
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
            <FieldError errors={[passwordError]} />
          </Field>

          <Field data-invalid={Boolean(mfaCodeError)}>
            <FieldLabel htmlFor="mfaCode">
              Codigo de seguranca
              <span className="font-normal text-muted-foreground">
                (somente admins com 2FA)
              </span>
            </FieldLabel>
            <Input
              id="mfaCode"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              aria-invalid={Boolean(mfaCodeError)}
              disabled={isSubmitting}
              maxLength={32}
              placeholder="000000 ou codigo de recuperacao"
              {...form.register("mfaCode")}
            />
            <FieldError errors={[mfaCodeError]} />
          </Field>
        </FieldGroup>

        {authError ? (
          <p className="text-sm text-destructive" role="alert">
            {authError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <LogIn data-icon="inline-start" />
          )}
          Entrar
        </Button>
      </form>

      <div className="border-t border-primary/10 pt-5">
        <Button asChild variant="secondary" size="lg" className="w-full">
          <a
            href={CANDY_STUDENT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon data-icon="inline-start" />
            Quero ser aluno Candy
          </a>
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
          Abre o WhatsApp com uma mensagem pronta para a equipe Candy.
        </p>
      </div>
    </div>
  );
}
