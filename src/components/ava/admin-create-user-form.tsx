"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createAvaUser } from "@/app/ava/admin/actions";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import {
  adminCreateUserSchema,
  type AdminCreateUserInput,
} from "@/lib/validations/admin-users";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const roleDescriptions: Record<Role, string> = {
  ADMIN: "Acesso total ao AVA.",
  TEACHER: "Organiza aulas e acompanha alunos.",
  STUDENT: "Acessa materiais e atividades.",
};

const defaultValues: AdminCreateUserInput = {
  bio: "",
  birthDate: "",
  email: "",
  level: "",
  name: "",
  notes: "",
  password: "",
  role: "STUDENT",
};

export function AdminCreateUserForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminCreateUserInput>({
    resolver: zodResolver(adminCreateUserSchema, undefined, { raw: true }),
    defaultValues,
  });

  const role = form.watch("role");

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createAvaUser(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminCreateUserInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset(defaultValues);
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="admin-user-name">Nome</FieldLabel>
          <Input
            id="admin-user-name"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.name)}
            disabled={isPending}
            placeholder="Nome do usuario"
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="admin-user-email">Email</FieldLabel>
          <Input
            id="admin-user-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            disabled={isPending}
            placeholder="usuario@email.com"
            {...form.register("email")}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="admin-user-password">Senha temporaria</FieldLabel>
          <Input
            id="admin-user-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            disabled={isPending}
            placeholder="Minimo 8 caracteres"
            {...form.register("password")}
          />
          <FieldDescription>
            Envie essa senha ao usuario por um canal seguro.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.password]} />
        </Field>

        <FieldSet>
          <FieldLegend>Perfil</FieldLegend>
          <div className="grid gap-3">
            {ROLES.map((item) => (
              <label
                key={item}
                className="group grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3 rounded-lg border bg-background p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  value={item}
                  className="sr-only"
                  disabled={isPending}
                  {...form.register("role")}
                />
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground">
                  {item === "ADMIN" ? (
                    <ShieldCheck aria-hidden="true" />
                  ) : (
                    <UserRound aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {ROLE_LABELS[item]}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {roleDescriptions[item]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError errors={[form.formState.errors.role]} />
        </FieldSet>

        {role === "STUDENT" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.level)}>
              <FieldLabel htmlFor="admin-user-level">Nivel do aluno</FieldLabel>
              <Input
                id="admin-user-level"
                aria-invalid={Boolean(form.formState.errors.level)}
                disabled={isPending}
                placeholder="Ex: A2, B1, iniciante"
                {...form.register("level")}
              />
              <FieldError errors={[form.formState.errors.level]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.birthDate)}>
              <FieldLabel htmlFor="admin-user-birth-date">
                Data de nascimento
              </FieldLabel>
              <Input
                id="admin-user-birth-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.birthDate)}
                disabled={isPending}
                {...form.register("birthDate")}
              />
              <FieldError errors={[form.formState.errors.birthDate]} />
            </Field>

            <Field
              className="md:col-span-2"
              data-invalid={Boolean(form.formState.errors.notes)}
            >
              <FieldLabel htmlFor="admin-user-notes">
                Observacoes iniciais
              </FieldLabel>
              <Textarea
                id="admin-user-notes"
                aria-invalid={Boolean(form.formState.errors.notes)}
                disabled={isPending}
                placeholder="Objetivos, rotina ou pontos de atencao."
                {...form.register("notes")}
              />
              <FieldError errors={[form.formState.errors.notes]} />
            </Field>
          </div>
        ) : null}

        {role === "TEACHER" ? (
          <Field data-invalid={Boolean(form.formState.errors.bio)}>
            <FieldLabel htmlFor="admin-user-bio">Bio da teacher</FieldLabel>
            <Textarea
              id="admin-user-bio"
              aria-invalid={Boolean(form.formState.errors.bio)}
              disabled={isPending}
              placeholder="Resumo breve para uso interno."
              {...form.register("bio")}
            />
            <FieldError errors={[form.formState.errors.bio]} />
          </Field>
        ) : null}
      </FieldGroup>

      {message ? (
        <p
          className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Plus data-icon="inline-start" />
        )}
        Cadastrar usuario
      </Button>
    </form>
  );
}
