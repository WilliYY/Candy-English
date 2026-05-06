"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, LoaderCircle, Save } from "lucide-react";
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

type ProfileFormProps = {
  defaultValues: UpdateProfileInput;
};

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateProfileInput>({
    defaultValues,
    resolver: zodResolver(updateProfileSchema),
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
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="profile-name">Nome</FieldLabel>
          <Input
            id="profile-name"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.name)}
            disabled={isPending}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.phone)}>
          <FieldLabel htmlFor="profile-phone">Telefone</FieldLabel>
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

        <Field data-invalid={Boolean(form.formState.errors.address)}>
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

export function AvatarUploadForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
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
      <Field>
        <FieldLabel htmlFor="avatar">Foto do perfil</FieldLabel>
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
