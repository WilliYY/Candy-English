"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, LoaderCircle, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateMyProfile, uploadMyAvatar } from "@/app/ava/actions";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/ava-operations";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type ProfileFormProps = {
  defaultValues: UpdateProfileInput;
  showStudentFields?: boolean;
};

export function ProfileForm({
  defaultValues,
  showStudentFields = false,
}: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateProfileInput>({
    defaultValues,
    resolver: zodResolver(updateProfileSchema, undefined, { raw: true }),
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateMyProfile(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof UpdateProfileInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FieldGroup>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Dados principais</h3>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="profile-name">Nome completo</FieldLabel>
              <Input
                id="profile-name"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.name)}
                disabled={isPending}
                placeholder="Nome e sobrenome"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.phone)}>
              <FieldLabel htmlFor="profile-phone">Telefone geral</FieldLabel>
              <Input
                id="profile-phone"
                autoComplete="tel"
                aria-invalid={Boolean(form.formState.errors.phone)}
                disabled={isPending}
                placeholder="(00) 00000-0000"
                {...form.register("phone")}
              />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>

            <Field
              className="md:col-span-2"
              data-invalid={Boolean(form.formState.errors.address)}
            >
              <FieldLabel htmlFor="profile-address">Endereco</FieldLabel>
              <Input
                id="profile-address"
                autoComplete="street-address"
                aria-invalid={Boolean(form.formState.errors.address)}
                disabled={isPending}
                placeholder="Cidade, bairro ou endereco"
                {...form.register("address")}
              />
              <FieldError errors={[form.formState.errors.address]} />
            </Field>
          </div>
        </div>

        {showStudentFields ? (
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold">
                Dados do aluno e responsavel
              </h3>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.studentPhone)}>
                <FieldLabel htmlFor="profile-student-phone">
                  Telefone do aluno
                </FieldLabel>
                <Input
                  id="profile-student-phone"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.studentPhone)}
                  disabled={isPending}
                  placeholder="(00) 00000-0000"
                  {...form.register("studentPhone")}
                />
                <FieldError errors={[form.formState.errors.studentPhone]} />
              </Field>

              <Field
                data-invalid={Boolean(form.formState.errors.studentPhoneAlt)}
              >
                <FieldLabel htmlFor="profile-student-phone-alt">
                  Segundo contato do aluno
                </FieldLabel>
                <Input
                  id="profile-student-phone-alt"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.studentPhoneAlt)}
                  disabled={isPending}
                  placeholder="(00) 00000-0000"
                  {...form.register("studentPhoneAlt")}
                />
                <FieldError errors={[form.formState.errors.studentPhoneAlt]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.birthDate)}>
                <FieldLabel htmlFor="profile-birth-date">
                  Data de nascimento
                </FieldLabel>
                <Input
                  id="profile-birth-date"
                  type="date"
                  aria-invalid={Boolean(form.formState.errors.birthDate)}
                  disabled={isPending}
                  {...form.register("birthDate")}
                />
                <FieldDescription>
                  O sistema calcula sua idade com base nessa data.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.birthDate]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.gender)}>
                <FieldLabel htmlFor="profile-gender">
                  Identificacao de sexo
                </FieldLabel>
                <NativeSelect
                  id="profile-gender"
                  aria-invalid={Boolean(form.formState.errors.gender)}
                  disabled={isPending}
                  {...form.register("gender")}
                >
                  <option value="">Prefiro nao informar</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="outro">Outro</option>
                </NativeSelect>
                <FieldError errors={[form.formState.errors.gender]} />
              </Field>

              <Field
                data-invalid={Boolean(form.formState.errors.guardianDocument)}
              >
                <FieldLabel htmlFor="profile-guardian-document">
                  Documento ou responsavel
                </FieldLabel>
                <Input
                  id="profile-guardian-document"
                  aria-invalid={Boolean(form.formState.errors.guardianDocument)}
                  disabled={isPending}
                  placeholder="CPF/RG do aluno ou responsavel"
                  {...form.register("guardianDocument")}
                />
                <FieldError
                  errors={[form.formState.errors.guardianDocument]}
                />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.motherName)}>
                <FieldLabel htmlFor="profile-mother-name">Nome da mae</FieldLabel>
                <Input
                  id="profile-mother-name"
                  autoComplete="name"
                  aria-invalid={Boolean(form.formState.errors.motherName)}
                  disabled={isPending}
                  placeholder="Nome completo da mae"
                  {...form.register("motherName")}
                />
                <FieldError errors={[form.formState.errors.motherName]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.motherPhone)}>
                <FieldLabel htmlFor="profile-mother-phone">
                  Telefone da mae
                </FieldLabel>
                <Input
                  id="profile-mother-phone"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.motherPhone)}
                  disabled={isPending}
                  placeholder="(00) 00000-0000"
                  {...form.register("motherPhone")}
                />
                <FieldError errors={[form.formState.errors.motherPhone]} />
              </Field>

              <Field
                className="md:col-span-2"
                data-invalid={Boolean(form.formState.errors.notes)}
              >
                <FieldLabel htmlFor="profile-notes">Observacoes</FieldLabel>
                <Textarea
                  id="profile-notes"
                  aria-invalid={Boolean(form.formState.errors.notes)}
                  disabled={isPending}
                  placeholder="Preferencias, observacoes ou dados complementares."
                  {...form.register("notes")}
                />
                <FieldError errors={[form.formState.errors.notes]} />
              </Field>
            </div>
          </div>
        ) : null}
      </FieldGroup>

      {message ? (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        Salvar perfil
      </Button>
    </form>
  );
}

type AvatarUploadFormProps = {
  avatarPath?: string | null;
  userId?: string | null;
};

export function AvatarUploadForm({ avatarPath, userId }: AvatarUploadFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await uploadMyAvatar(formData);
          setMessage(result.message);

          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-primary">
          {avatarPath && userId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/ava/avatar/${userId}`}
              alt="Foto atual do perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound aria-hidden="true" className="size-9" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Foto do perfil</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use uma foto quadrada ou centralizada para aparecer bem no AVA.
          </p>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="avatar">Escolher imagem</FieldLabel>
        <Input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isPending}
        />
        <FieldDescription>PNG, JPG ou WebP ate 2 MB.</FieldDescription>
      </Field>

      {message ? (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Camera data-icon="inline-start" />
        )}
        Atualizar foto
      </Button>
    </form>
  );
}
