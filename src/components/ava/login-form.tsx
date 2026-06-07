"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  HeartHandshake,
  LoaderCircle,
  LogIn,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { StudentPreRegistrationForm } from "@/components/ava/student-pre-registration-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function getSafeCallbackUrl(callbackUrl: string | null) {
  if (
    callbackUrl &&
    (callbackUrl === "/ava" || callbackUrl.startsWith("/ava/")) &&
    !callbackUrl.startsWith("/ava/login")
  ) {
    return callbackUrl;
  }

  return "/ava";
}

export function LoginForm({
  maintenanceMode,
}: {
  maintenanceMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPreRegistration, setShowPreRegistration] = useState(false);
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
            : "Email ou senha invalidos.",
        );
        return;
      }

      router.replace(getSafeCallbackUrl(searchParams.get("callbackUrl")));
      router.refresh();
    } catch {
      setAuthError("Nao foi possivel entrar agora.");
    }
  });

  const emailError = form.formState.errors.email;
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
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => setShowPreRegistration((current) => !current)}
          aria-expanded={showPreRegistration}
        >
          <HeartHandshake data-icon="inline-start" />
          {showPreRegistration
            ? "Fechar pre-cadastro"
            : "Quero ser aluno Candy"}
        </Button>
      </div>

      {showPreRegistration ? <StudentPreRegistrationForm /> : null}
    </div>
  );
}
