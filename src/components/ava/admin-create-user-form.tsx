"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BrainCircuit,
  CalendarDays,
  GraduationCap,
  LoaderCircle,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  cattyContext: "",
  email: "",
  guardianDocument: "",
  level: "",
  motherName: "",
  motherPhone: "",
  name: "",
  notes: "",
  password: "",
  role: "STUDENT",
  studentPhone: "",
  studentPhoneAlt: "",
};

type AdminCreateUserFormProps = {
  fixedRole?: Role;
  submitLabel?: string;
};

function calculateAge(value?: string) {
  if (!value) {
    return null;
  }

  const birthDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  );

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getRoleIcon(role: Role) {
  if (role === "ADMIN") {
    return ShieldCheck;
  }

  if (role === "TEACHER") {
    return GraduationCap;
  }

  return UserRound;
}

export function AdminCreateUserForm({
  fixedRole,
  submitLabel,
}: AdminCreateUserFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formDefaultValues = useMemo(
    () => ({
      ...defaultValues,
      role: fixedRole ?? defaultValues.role,
    }),
    [fixedRole],
  );
  const form = useForm<AdminCreateUserInput>({
    resolver: zodResolver(adminCreateUserSchema, undefined, { raw: true }),
    defaultValues: formDefaultValues,
  });

  const watchedBirthDate = form.watch("birthDate");
  const role = fixedRole ?? form.watch("role");
  const age = calculateAge(watchedBirthDate);
  const FixedIcon = fixedRole ? getRoleIcon(fixedRole) : null;
  const finalSubmitLabel = submitLabel ?? "Cadastrar usuario";

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createAvaUser({
        ...values,
        role,
      });

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

      form.reset(formDefaultValues);
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FieldGroup className="gap-5">
        <section className="rounded-lg border border-primary/15 bg-white/80 p-4 shadow-[0_16px_44px_rgba(65,42,76,0.08)]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <UserRound aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <strong className="block text-base text-primary">
                  Acesso do usuario
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Dados principais para login no AVA.
                </span>
              </span>
            </span>
            <span className="w-fit rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1 text-xs font-bold uppercase text-primary">
              Login
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(220px,0.8fr)]">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="admin-user-name">Nome completo</FieldLabel>
              <Input
                id="admin-user-name"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.name)}
                disabled={isPending}
                placeholder="Nome e sobrenome"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="admin-user-email">
                Email / usuario de login
              </FieldLabel>
              <Input
                id="admin-user-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                disabled={isPending}
                placeholder="usuario@email.com"
                {...form.register("email")}
              />
              <FieldDescription>
                O email tambem e o usuario de entrada.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.email]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor="admin-user-password">
                Senha provisoria
              </FieldLabel>
              <Input
                id="admin-user-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                disabled={isPending}
                placeholder="Ex: candy123"
                {...form.register("password")}
              />
              <FieldDescription>
                Envie por um canal seguro.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.password]} />
            </Field>
          </div>
        </section>

        {fixedRole && FixedIcon ? (
          <section className="flex items-start gap-3 rounded-lg border border-primary/15 bg-gradient-to-r from-primary/[0.06] to-[#fce5d8]/70 p-4 text-sm text-muted-foreground shadow-sm">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FixedIcon aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <strong className="block text-base text-primary">
                Perfil: {ROLE_LABELS[fixedRole]}
              </strong>
              <span className="mt-1 block">{roleDescriptions[fixedRole]}</span>
            </span>
          </section>
        ) : (
          <FieldSet className="rounded-lg border border-primary/15 bg-white/80 p-4 shadow-sm">
            <FieldLegend>Perfil</FieldLegend>
            <div className="grid gap-3">
              {ROLES.map((item) => {
                const Icon = getRoleIcon(item);

                return (
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
                      <Icon aria-hidden="true" />
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
                );
              })}
            </div>
            <FieldError errors={[form.formState.errors.role]} />
          </FieldSet>
        )}

        {role === "STUDENT" ? (
          <section className="rounded-lg border border-primary/15 bg-white/80 p-4 shadow-[0_16px_44px_rgba(65,42,76,0.07)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fce5d8] text-primary shadow-sm">
                  <Phone aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-base text-primary">
                    Dados do aluno
                  </strong>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Contatos, responsavel e nascimento.
                  </span>
                </span>
              </span>
              <span className="w-fit rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1 text-xs font-bold uppercase text-primary">
                {age === null ? "Complementar" : `${age} anos`}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.studentPhone)}>
                <FieldLabel htmlFor="admin-user-student-phone">
                  Telefone do aluno
                </FieldLabel>
                <Input
                  id="admin-user-student-phone"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.studentPhone)}
                  disabled={isPending}
                  placeholder="(00) 00000-0000"
                  {...form.register("studentPhone")}
                />
                <FieldError errors={[form.formState.errors.studentPhone]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.studentPhoneAlt)}>
                <FieldLabel htmlFor="admin-user-student-phone-alt">
                  Segundo contato do aluno
                </FieldLabel>
                <Input
                  id="admin-user-student-phone-alt"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.studentPhoneAlt)}
                  disabled={isPending}
                  placeholder="(00) 00000-0000"
                  {...form.register("studentPhoneAlt")}
                />
                <FieldError errors={[form.formState.errors.studentPhoneAlt]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.birthDate)}>
                <FieldLabel
                  htmlFor="admin-user-birth-date"
                  className="inline-flex items-center gap-2"
                >
                  <CalendarDays aria-hidden="true" className="size-4" />
                  Data de nascimento
                </FieldLabel>
                <Input
                  id="admin-user-birth-date"
                  type="date"
                  aria-invalid={Boolean(form.formState.errors.birthDate)}
                  disabled={isPending}
                  {...form.register("birthDate")}
                />
                <FieldDescription>
                  {age === null
                    ? "A idade sera calculada automaticamente."
                    : `Idade calculada hoje: ${age} anos.`}
                </FieldDescription>
                <FieldError errors={[form.formState.errors.birthDate]} />
              </Field>

              <Field
                data-invalid={Boolean(form.formState.errors.guardianDocument)}
              >
                <FieldLabel htmlFor="admin-user-guardian-document">
                  Documento ou responsavel
                </FieldLabel>
                <Input
                  id="admin-user-guardian-document"
                  aria-invalid={Boolean(form.formState.errors.guardianDocument)}
                  disabled={isPending}
                  placeholder="CPF/RG do aluno ou nome/documento do responsavel"
                  {...form.register("guardianDocument")}
                />
                <FieldError errors={[form.formState.errors.guardianDocument]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.motherName)}>
                <FieldLabel htmlFor="admin-user-mother-name">
                  Nome da mae
                </FieldLabel>
                <Input
                  id="admin-user-mother-name"
                  autoComplete="name"
                  aria-invalid={Boolean(form.formState.errors.motherName)}
                  disabled={isPending}
                  placeholder="Nome completo da mae"
                  {...form.register("motherName")}
                />
                <FieldError errors={[form.formState.errors.motherName]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.motherPhone)}>
                <FieldLabel htmlFor="admin-user-mother-phone">
                  Telefone da mae
                </FieldLabel>
                <Input
                  id="admin-user-mother-phone"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.motherPhone)}
                  disabled={isPending}
                  placeholder="(00) 00000-0000"
                  {...form.register("motherPhone")}
                />
                <FieldError errors={[form.formState.errors.motherPhone]} />
              </Field>

              <details className="rounded-lg border border-primary/15 bg-primary/[0.03] p-4 text-sm md:col-span-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-primary [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <BrainCircuit aria-hidden="true" className="size-4" />
                    Contexto Catty
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase text-primary/70">
                    opcional
                  </span>
                </summary>
                <Field
                  className="mt-4"
                  data-invalid={Boolean(form.formState.errors.cattyContext)}
                >
                  <FieldLabel htmlFor="admin-user-catty-context">
                    Memoria inicial da Catty
                  </FieldLabel>
                  <Textarea
                    id="admin-user-catty-context"
                    aria-invalid={Boolean(form.formState.errors.cattyContext)}
                    disabled={isPending}
                    placeholder="Ex: gosta de exemplos com jogos; trava em do/does; prefere explicacao curta."
                    className="min-h-24"
                    {...form.register("cattyContext")}
                  />
                  <FieldDescription>
                    Use apenas contexto pedagogico leve.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.cattyContext]} />
                </Field>
              </details>
            </div>
          </section>
        ) : null}

        {role === "TEACHER" ? (
          <section className="rounded-lg border border-primary/15 bg-white/80 p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <strong className="block text-base text-primary">
                  Perfil da teacher
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Bio interna e dados pedagogicos.
                </span>
              </span>
            </div>
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
          </section>
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

      <div className="rounded-lg border border-primary/15 bg-white/80 p-2 shadow-[0_14px_36px_rgba(65,42,76,0.08)]">
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full shadow-sm"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {finalSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
