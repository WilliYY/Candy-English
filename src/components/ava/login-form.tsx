"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
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
  googleEnabled,
  maintenanceMode,
}: {
  googleEnabled?: boolean;
  maintenanceMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
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
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(passwordError)}
            disabled={isSubmitting}
            {...form.register("password")}
          />
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

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={!googleEnabled || isSubmitting}
          onClick={() => {
            void signIn("google", {
              callbackUrl: getSafeCallbackUrl(searchParams.get("callbackUrl")),
            });
          }}
        >
          <span aria-hidden="true" className="text-base font-semibold">
            G
          </span>
          Entrar com Google
        </Button>
        {!googleEnabled ? (
          <p className="break-words text-xs leading-5 text-muted-foreground">
            O acesso com Google sera ativado quando a conta Google da Candy
            estiver conectada ao AVA.
          </p>
        ) : null}
      </div>
    </form>
  );
}
