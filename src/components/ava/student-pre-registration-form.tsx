"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { requestStudentPreRegistration } from "@/app/ava/login/actions";
import {
  studentPreRegistrationSchema,
  type StudentPreRegistrationInput,
} from "@/lib/validations/pre-registration";
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

const defaultValues: StudentPreRegistrationInput = {
  address: "",
  birthDate: "",
  email: "",
  englishGoal: "",
  fullName: "",
  guardianDocument: "",
  guardianName: "",
  guardianPhone: "",
  notes: "",
  phone: "",
  secondaryContact: "",
  studentPhone: "",
};

export function StudentPreRegistrationForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<StudentPreRegistrationInput>({
    resolver: zodResolver(studentPreRegistrationSchema, undefined, {
      raw: true,
    }),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await requestStudentPreRegistration(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof StudentPreRegistrationInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset(defaultValues);
      router.replace("/?cadastro=sucesso");
    });
  });

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-primary">
            Solicitar cadastro
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Preencha seus dados. A equipe Candy analisa antes de liberar acesso.
          </p>
        </div>
      </div>

      {message ? (
        <p
          className="mb-4 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm leading-6 text-destructive"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FieldSet>
          <FieldLegend>Dados principais</FieldLegend>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(form.formState.errors.fullName)}>
              <FieldLabel htmlFor="pre-registration-full-name">
                Nome completo
              </FieldLabel>
              <Input
                id="pre-registration-full-name"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.fullName)}
                disabled={isPending}
                placeholder="Nome e sobrenome"
                {...form.register("fullName")}
              />
              <FieldError errors={[form.formState.errors.fullName]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="pre-registration-email">Email</FieldLabel>
              <Input
                id="pre-registration-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                disabled={isPending}
                placeholder="seuemail@exemplo.com"
                {...form.register("email")}
              />
              <FieldDescription>
                Esse email nao cria login automaticamente.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.email]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.phone)}>
              <FieldLabel htmlFor="pre-registration-phone">Telefone</FieldLabel>
              <Input
                id="pre-registration-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(form.formState.errors.phone)}
                disabled={isPending}
                placeholder="(00) 00000-0000"
                {...form.register("phone")}
              />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.englishGoal)}>
              <FieldLabel htmlFor="pre-registration-goal">
                Objetivo com o ingles
              </FieldLabel>
              <Textarea
                id="pre-registration-goal"
                aria-invalid={Boolean(form.formState.errors.englishGoal)}
                disabled={isPending}
                placeholder="Ex.: conversacao, viagem, escola, trabalho..."
                rows={3}
                {...form.register("englishGoal")}
              />
              <FieldError errors={[form.formState.errors.englishGoal]} />
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Dados complementares</FieldLegend>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(form.formState.errors.address)}>
              <FieldLabel htmlFor="pre-registration-address">
                Cidade/endereco
              </FieldLabel>
              <Input
                id="pre-registration-address"
                autoComplete="street-address"
                aria-invalid={Boolean(form.formState.errors.address)}
                disabled={isPending}
                placeholder="Cidade, bairro ou endereco"
                {...form.register("address")}
              />
              <FieldError errors={[form.formState.errors.address]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.birthDate)}>
              <FieldLabel htmlFor="pre-registration-birth-date">
                Data de nascimento
              </FieldLabel>
              <Input
                id="pre-registration-birth-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.birthDate)}
                disabled={isPending}
                {...form.register("birthDate")}
              />
              <FieldError errors={[form.formState.errors.birthDate]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.studentPhone)}>
              <FieldLabel htmlFor="pre-registration-student-phone">
                Telefone do aluno
              </FieldLabel>
              <Input
                id="pre-registration-student-phone"
                type="tel"
                aria-invalid={Boolean(form.formState.errors.studentPhone)}
                disabled={isPending}
                placeholder="Se for diferente do contato principal"
                {...form.register("studentPhone")}
              />
              <FieldError errors={[form.formState.errors.studentPhone]} />
            </Field>

            <Field
              data-invalid={Boolean(form.formState.errors.secondaryContact)}
            >
              <FieldLabel htmlFor="pre-registration-secondary-contact">
                Segundo contato
              </FieldLabel>
              <Input
                id="pre-registration-secondary-contact"
                aria-invalid={Boolean(form.formState.errors.secondaryContact)}
                disabled={isPending}
                placeholder="Nome e telefone"
                {...form.register("secondaryContact")}
              />
              <FieldError errors={[form.formState.errors.secondaryContact]} />
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Responsavel</FieldLegend>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(form.formState.errors.guardianName)}>
              <FieldLabel htmlFor="pre-registration-guardian-name">
                Responsavel
              </FieldLabel>
              <Input
                id="pre-registration-guardian-name"
                aria-invalid={Boolean(form.formState.errors.guardianName)}
                disabled={isPending}
                {...form.register("guardianName")}
              />
              <FieldError errors={[form.formState.errors.guardianName]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.guardianPhone)}>
              <FieldLabel htmlFor="pre-registration-guardian-phone">
                Telefone do responsavel
              </FieldLabel>
              <Input
                id="pre-registration-guardian-phone"
                type="tel"
                aria-invalid={Boolean(form.formState.errors.guardianPhone)}
                disabled={isPending}
                {...form.register("guardianPhone")}
              />
              <FieldError errors={[form.formState.errors.guardianPhone]} />
            </Field>

            <Field
              data-invalid={Boolean(form.formState.errors.guardianDocument)}
            >
              <FieldLabel htmlFor="pre-registration-document">
                Documento do aluno ou responsavel
              </FieldLabel>
              <Input
                id="pre-registration-document"
                aria-invalid={Boolean(form.formState.errors.guardianDocument)}
                disabled={isPending}
                placeholder="CPF, RG ou documento informado"
                {...form.register("guardianDocument")}
              />
              <FieldError errors={[form.formState.errors.guardianDocument]} />
            </Field>
          </FieldGroup>
        </FieldSet>

        <Field data-invalid={Boolean(form.formState.errors.notes)}>
          <FieldLabel htmlFor="pre-registration-notes">Observacoes</FieldLabel>
          <Textarea
            id="pre-registration-notes"
            aria-invalid={Boolean(form.formState.errors.notes)}
            disabled={isPending}
            placeholder="Horarios, necessidades, contexto do aluno..."
            rows={3}
            {...form.register("notes")}
          />
          <FieldError errors={[form.formState.errors.notes]} />
        </Field>

        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          Enviar pre-cadastro
        </Button>
      </form>
    </div>
  );
}
