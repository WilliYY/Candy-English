"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import {
  createAdminCredential,
  deleteAdminCredential,
  revealAdminCredential,
  updateAdminCredential,
} from "@/app/ava/admin/actions";
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
import {
  ADMIN_CREDENTIAL_KIND_LABELS,
  ADMIN_CREDENTIAL_KINDS,
  adminCredentialCreateSchema,
  adminCredentialUpdateSchema,
  type AdminCredentialCreateInput,
  type AdminCredentialUpdateInput,
} from "@/lib/validations/admin-credentials";

export type AdminCredentialRow = {
  createdAt: string;
  id: string;
  kind: (typeof ADMIN_CREDENTIAL_KINDS)[number];
  label: string;
  notes: string | null;
  secretPreview: string;
  service: string;
  source: "MANUAL" | "ENV";
  sourceKey: string | null;
  updatedAt: string;
  url: string | null;
  username: string | null;
};

type FormErrorMap<TInput extends FieldValues> = Partial<
  Record<keyof TInput, string>
>;

type AdminCredentialPanelProps = {
  credentials: AdminCredentialRow[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function applyServerErrors<TInput extends FieldValues>(
  form: UseFormReturn<TInput>,
  errors?: FormErrorMap<TInput>,
) {
  if (!errors) {
    return;
  }

  Object.entries(errors).forEach(([field, message]) => {
    if (message) {
      form.setError(field as Path<TInput>, { message });
    }
  });
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function CreateCredentialForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminCredentialCreateInput>({
    resolver: zodResolver(adminCredentialCreateSchema),
    defaultValues: {
      kind: "API_KEY",
      label: "",
      notes: "",
      secret: "",
      service: "",
      url: "",
      username: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createAdminCredential(values);

      if (!result.ok) {
        applyServerErrors(form, result.errors);
        setMessage(result.message);
        return;
      }

      form.reset({
        kind: "API_KEY",
        label: "",
        notes: "",
        secret: "",
        service: "",
        url: "",
        username: "",
      });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border bg-background p-5 shadow-sm"
      noValidate
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Plus aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Registrar novo acesso</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Salve chaves, tokens ou senhas que precisam ficar documentados para
            o admin.
          </p>
        </div>
      </div>

      <FieldGroup className="gap-4">
        <div className="grid gap-4">
          <Field data-invalid={Boolean(form.formState.errors.label)}>
            <FieldLabel htmlFor="credential-label">Rotulo</FieldLabel>
            <Input
              id="credential-label"
              placeholder="Ex.: OpenAI producao"
              aria-invalid={Boolean(form.formState.errors.label)}
              disabled={isPending}
              {...form.register("label")}
            />
            <FieldError errors={[form.formState.errors.label]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.service)}>
            <FieldLabel htmlFor="credential-service">Servico</FieldLabel>
            <Input
              id="credential-service"
              placeholder="Ex.: OpenAI, Google, Jitsi"
              aria-invalid={Boolean(form.formState.errors.service)}
              disabled={isPending}
              {...form.register("service")}
            />
            <FieldError errors={[form.formState.errors.service]} />
          </Field>
        </div>

        <div className="grid gap-4">
          <Field data-invalid={Boolean(form.formState.errors.kind)}>
            <FieldLabel htmlFor="credential-kind">Tipo</FieldLabel>
            <NativeSelect
              id="credential-kind"
              aria-invalid={Boolean(form.formState.errors.kind)}
              disabled={isPending}
              {...form.register("kind")}
            >
              {ADMIN_CREDENTIAL_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {ADMIN_CREDENTIAL_KIND_LABELS[kind]}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={[form.formState.errors.kind]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.username)}>
            <FieldLabel htmlFor="credential-username">Usuario</FieldLabel>
            <Input
              id="credential-username"
              placeholder="Opcional"
              aria-invalid={Boolean(form.formState.errors.username)}
              disabled={isPending}
              {...form.register("username")}
            />
            <FieldError errors={[form.formState.errors.username]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(form.formState.errors.secret)}>
          <FieldLabel htmlFor="credential-secret">Valor sensivel</FieldLabel>
          <Textarea
            id="credential-secret"
            className="min-h-24 font-mono text-xs"
            placeholder="Cole aqui a chave, token ou senha"
            aria-invalid={Boolean(form.formState.errors.secret)}
            disabled={isPending}
            {...form.register("secret")}
          />
          <FieldDescription>
            O valor sera criptografado no banco; nunca aparece em logs.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.secret]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.url)}>
          <FieldLabel htmlFor="credential-url">URL</FieldLabel>
          <Input
            id="credential-url"
            placeholder="Opcional"
            aria-invalid={Boolean(form.formState.errors.url)}
            disabled={isPending}
            {...form.register("url")}
          />
          <FieldError errors={[form.formState.errors.url]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.notes)}>
          <FieldLabel htmlFor="credential-notes">Notas</FieldLabel>
          <Textarea
            id="credential-notes"
            placeholder="Onde usa, quando renovar, observacoes importantes"
            aria-invalid={Boolean(form.formState.errors.notes)}
            disabled={isPending}
            {...form.register("notes")}
          />
          <FieldError errors={[form.formState.errors.notes]} />
        </Field>
      </FieldGroup>

      {message ? (
        <p
          className="mt-4 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" className="mt-5" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        Salvar credencial
      </Button>
    </form>
  );
}

function CredentialCard({ credential }: { credential: AdminCredentialRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isRevealing, startRevealTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const form = useForm<AdminCredentialUpdateInput>({
    resolver: zodResolver(adminCredentialUpdateSchema),
    defaultValues: {
      credentialId: credential.id,
      kind: credential.kind,
      label: credential.label,
      notes: credential.notes ?? "",
      secret: "",
      service: credential.service,
      url: credential.url ?? "",
      username: credential.username ?? "",
    },
  });

  const sourceLabel = credential.source === "ENV" ? ".env" : "manual";
  const canEditSecret = credential.source !== "ENV";

  function handleReveal() {
    setMessage(null);
    startRevealTransition(async () => {
      const result = await revealAdminCredential({
        credentialId: credential.id,
      });

      if (!result.ok || !result.secret) {
        setMessage(result.message);
        return;
      }

      setRevealedSecret(result.secret);
      setShowSecret(true);
      setMessage(result.message);
    });
  }

  function handleCopy() {
    if (!revealedSecret) {
      return;
    }

    navigator.clipboard
      .writeText(revealedSecret)
      .then(() => setMessage("Valor copiado."))
      .catch(() => setMessage("Nao foi possivel copiar automaticamente."));
  }

  function handleDelete() {
    setMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteAdminCredential({
        credentialId: credential.id,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startSaveTransition(async () => {
      const result = await updateAdminCredential({
        ...values,
        credentialId: credential.id,
      });

      if (!result.ok) {
        applyServerErrors(form, result.errors);
        setMessage(result.message);
        return;
      }

      form.reset({
        credentialId: credential.id,
        kind: values.kind,
        label: values.label,
        notes: values.notes ?? "",
        secret: "",
        service: values.service,
        url: values.url ?? "",
        username: values.username ?? "",
      });
      setRevealedSecret(null);
      setShowSecret(false);
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <article className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{credential.label}</h3>
            <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {ADMIN_CREDENTIAL_KIND_LABELS[credential.kind]}
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {sourceLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {credential.service}
            {credential.sourceKey ? (
              <> - {credential.sourceKey.replace("env:", "")}</>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isRevealing}
            onClick={revealedSecret ? () => setShowSecret(!showSecret) : handleReveal}
          >
            {isRevealing ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : showSecret ? (
              <EyeOff data-icon="inline-start" />
            ) : (
              <Eye data-icon="inline-start" />
            )}
            {revealedSecret ? (showSecret ? "Ocultar" : "Mostrar") : "Revelar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!revealedSecret}
            onClick={handleCopy}
          >
            <Copy data-icon="inline-start" />
            Copiar
          </Button>
          {credential.source === "MANUAL" ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              Excluir
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Valor salvo
          </span>
          {revealedSecret ? (
            <Input
              className="mt-2 font-mono text-xs"
              type={showSecret ? "text" : "password"}
              readOnly
              value={revealedSecret}
            />
          ) : (
            <span className="mt-1 block font-mono text-xs">
              {credential.secretPreview}
            </span>
          )}
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Atualizado
          </span>
          <span className="mt-1 block">{formatDate(credential.updatedAt)}</span>
        </div>
      </div>

      {credential.username || credential.url || credential.notes ? (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          {credential.username ? (
            <p className="rounded-lg border bg-muted/30 p-3">
              <span className="block text-xs font-semibold text-muted-foreground">
                Usuario
              </span>
              <span className="break-words">{credential.username}</span>
            </p>
          ) : null}
          {credential.url ? (
            <p className="rounded-lg border bg-muted/30 p-3">
              <span className="block text-xs font-semibold text-muted-foreground">
                URL
              </span>
              <a
                className="break-words text-primary underline-offset-4 hover:underline"
                href={credential.url}
                target="_blank"
                rel="noreferrer"
              >
                {credential.url}
              </a>
            </p>
          ) : null}
          {credential.notes ? (
            <p className="rounded-lg border bg-muted/30 p-3 md:col-span-3">
              <span className="block text-xs font-semibold text-muted-foreground">
                Notas
              </span>
              <span className="whitespace-pre-wrap">{credential.notes}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p
          className="mt-4 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <details className="group/edit mt-4 border-t border-primary/10 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Pencil aria-hidden="true" className="size-4" />
            Editar registro
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em]">
            <span className="group-open/edit:hidden">abrir</span>
            <span className="hidden group-open/edit:inline">minimizar</span>
          </span>
        </summary>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4" noValidate>
          <input
            type="hidden"
            defaultValue={credential.id}
            {...form.register("credentialId")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.label)}>
              <FieldLabel htmlFor={`credential-label-${credential.id}`}>
                Rotulo
              </FieldLabel>
              <Input
                id={`credential-label-${credential.id}`}
                aria-invalid={Boolean(form.formState.errors.label)}
                disabled={isSaving}
                {...form.register("label")}
              />
              <FieldError errors={[form.formState.errors.label]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.service)}>
              <FieldLabel htmlFor={`credential-service-${credential.id}`}>
                Servico
              </FieldLabel>
              <Input
                id={`credential-service-${credential.id}`}
                aria-invalid={Boolean(form.formState.errors.service)}
                disabled={isSaving}
                {...form.register("service")}
              />
              <FieldError errors={[form.formState.errors.service]} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.kind)}>
              <FieldLabel htmlFor={`credential-kind-${credential.id}`}>
                Tipo
              </FieldLabel>
              <NativeSelect
                id={`credential-kind-${credential.id}`}
                aria-invalid={Boolean(form.formState.errors.kind)}
                disabled={isSaving}
                {...form.register("kind")}
              >
                {ADMIN_CREDENTIAL_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {ADMIN_CREDENTIAL_KIND_LABELS[kind]}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={[form.formState.errors.kind]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.username)}>
              <FieldLabel htmlFor={`credential-username-${credential.id}`}>
                Usuario
              </FieldLabel>
              <Input
                id={`credential-username-${credential.id}`}
                aria-invalid={Boolean(form.formState.errors.username)}
                disabled={isSaving}
                {...form.register("username")}
              />
              <FieldError errors={[form.formState.errors.username]} />
            </Field>
          </div>

          <Field data-invalid={Boolean(form.formState.errors.secret)}>
            <FieldLabel htmlFor={`credential-secret-${credential.id}`}>
              Novo valor sensivel
            </FieldLabel>
            <Textarea
              id={`credential-secret-${credential.id}`}
              className="min-h-20 font-mono text-xs"
              placeholder={
                canEditSecret
                  ? "Deixe vazio para manter o valor atual"
                  : "Altere no .env do servidor"
              }
              aria-invalid={Boolean(form.formState.errors.secret)}
              disabled={isSaving || !canEditSecret}
              {...form.register("secret")}
            />
            <FieldDescription>
              {canEditSecret
                ? "Preencha somente quando precisar trocar o valor salvo."
                : "Credenciais importadas do ambiente acompanham o .env."}
            </FieldDescription>
            <FieldError errors={[form.formState.errors.secret]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.url)}>
            <FieldLabel htmlFor={`credential-url-${credential.id}`}>
              URL
            </FieldLabel>
            <Input
              id={`credential-url-${credential.id}`}
              aria-invalid={Boolean(form.formState.errors.url)}
              disabled={isSaving}
              {...form.register("url")}
            />
            <FieldError errors={[form.formState.errors.url]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.notes)}>
            <FieldLabel htmlFor={`credential-notes-${credential.id}`}>
              Notas
            </FieldLabel>
            <Textarea
              id={`credential-notes-${credential.id}`}
              aria-invalid={Boolean(form.formState.errors.notes)}
              disabled={isSaving}
              {...form.register("notes")}
            />
            <FieldError errors={[form.formState.errors.notes]} />
          </Field>

          <Button type="submit" className="w-fit" disabled={isSaving}>
            {isSaving ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Salvar alteracoes
          </Button>
        </form>
      </details>
    </article>
  );
}

export function AdminCredentialsPanel({
  credentials,
}: AdminCredentialPanelProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Cofre administrativo</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Somente ADMIN acessa esta area. Os valores ficam criptografados
                no banco e so aparecem quando voce clica em revelar.
              </p>
            </div>
          </div>
        </div>
        <CreateCredentialForm />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">APIs e senhas salvas</h2>
            <p className="text-sm text-muted-foreground">
              {credentials.length} registro(s), incluindo integrações do
              ambiente quando configuradas.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <KeyRound aria-hidden="true" className="size-4" />
            ADMIN only
          </span>
        </div>

        {credentials.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 text-center">
            <KeyRound aria-hidden="true" className="size-6 text-primary" />
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Nenhuma API ou senha registrada ainda. Use o formulario ao lado
              para criar o primeiro registro.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {credentials.map((credential) => (
              <CredentialCard key={credential.id} credential={credential} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
