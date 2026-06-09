"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  CheckCircle2,
  ContactRound,
  HeartHandshake,
  ImagePlus,
  LoaderCircle,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateMyProfile } from "@/app/ava/actions";
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
import { UserAvatar } from "@/components/ava/user-avatar";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}

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
      <FieldGroup className="gap-5">
        <div className="ava-profile-card rounded-2xl border p-5">
          <div className="mb-5 flex flex-col gap-3 border-b border-primary/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ContactRound aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
                  Perfil
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  Dados principais
                </h3>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              <ContactRound aria-hidden="true" className="size-5" />
              Login e contato
            </span>
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
          <div className="ava-profile-card rounded-2xl border p-5">
            <div className="mb-5 flex flex-col gap-3 border-b border-primary/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <HeartHandshake aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
                    Student
                  </p>
                  <h3 className="mt-1 text-base font-semibold">
                    Dados do aluno e responsavel
                  </h3>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Visivel para a equipe
              </span>
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
                <FieldError errors={[form.formState.errors.guardianDocument]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.motherName)}>
                <FieldLabel htmlFor="profile-mother-name">
                  Nome da mae
                </FieldLabel>
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
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 justify-center shadow-lg shadow-primary/15"
      >
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

export function AvatarUploadForm({
  avatarPath,
  userId,
}: AvatarUploadFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const clearFile = () => {
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  return (
    <form
      className="ava-profile-card flex flex-col gap-5 overflow-hidden rounded-2xl border p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage(null);

        if (!file) {
          setMessage("Selecione uma imagem para enviar.");
          return;
        }

        const formData = new FormData();
        formData.append("avatar", file);
        setIsPending(true);

        try {
          const response = await fetch("/ava/avatar", {
            body: formData,
            method: "POST",
          });
          const result = (await response.json()) as {
            message?: string;
            ok?: boolean;
          };

          setMessage(result.message ?? "Nao foi possivel enviar a foto.");

          if (response.ok && result.ok) {
            clearFile();
            router.refresh();
          }
        } catch {
          setMessage("Nao foi possivel enviar a foto agora.");
        } finally {
          setIsPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-white via-secondary/40 to-amber-50/70 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="relative shrink-0 rounded-full bg-gradient-to-br from-secondary via-white to-primary/10 p-1 shadow-lg shadow-primary/15 ring-1 ring-primary/10">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Previa da nova foto"
                className="size-28 rounded-full border border-white/80 bg-muted object-cover shadow-inner ring-1 ring-primary/15"
              />
            ) : (
              <UserAvatar
                avatarPath={avatarPath}
                className="size-28 rounded-full bg-muted text-primary"
                iconClassName="size-11"
                userId={userId}
              />
            )}
            <span className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full border border-white/80 bg-primary text-primary-foreground shadow-sm">
              <ImagePlus aria-hidden="true" className="size-4" />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
              Foto
            </p>
            <h3 className="mt-1 text-lg font-semibold text-primary">
              Foto do perfil
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use uma foto quadrada ou centralizada para aparecer bem no AVA.
            </p>
          </div>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="avatar">Escolher imagem</FieldLabel>
        <Input
          id="avatar"
          ref={inputRef}
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="cursor-pointer file:cursor-pointer disabled:cursor-not-allowed"
          disabled={isPending}
          onChange={(event) => {
            setMessage(null);
            const selectedFile = event.target.files?.[0] ?? null;

            if (!selectedFile) {
              setFile(null);
              return;
            }

            if (!allowedAvatarTypes.has(selectedFile.type)) {
              clearFile();
              setMessage("Envie uma imagem PNG, JPG ou WebP.");
              return;
            }

            if (
              selectedFile.size <= 0 ||
              selectedFile.size > AVATAR_MAX_BYTES
            ) {
              clearFile();
              setMessage("A foto precisa ter ate 2 MB.");
              return;
            }

            setFile(selectedFile);
          }}
        />
        <FieldDescription>
          PNG, JPG ou WebP ate 2 MB. A imagem fica protegida no AVA.
        </FieldDescription>
      </Field>

      <div className="grid gap-2 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-2 rounded-xl border border-primary/10 bg-white/75 px-3 py-2">
          <CheckCircle2
            aria-hidden="true"
            className="size-4 text-emerald-600"
          />
          Foto atualiza cards, sidebar e conversas do AVA.
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl border border-primary/10 bg-white/75 px-3 py-2">
          <Sparkles aria-hidden="true" className="size-4 text-amber-600" />
          Foto preenchida tambem ajuda no bonus de perfil.
        </span>
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="flex min-w-0 items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{file.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {formatFileSize(file.size)}
            <Button
              aria-label="Remover imagem selecionada"
              className="size-8 rounded-full"
              disabled={isPending}
              onClick={() => {
                setMessage(null);
                clearFile();
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </span>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="secondary"
        disabled={isPending || !file}
        className="h-11 justify-center"
      >
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
