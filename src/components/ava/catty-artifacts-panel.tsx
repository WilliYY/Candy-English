"use client";

import {
  Archive,
  Ban,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Palette,
  PencilLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  changeCattyUserArtifactStatus,
  saveCattyUserArtifact,
} from "@/app/ava/catty-artifacts/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CattyArtifactManagementData } from "@/lib/catty-user-artifacts";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  cattyUserArtifactStatusValues,
  type CattyUserArtifactStatusInput,
  type CattyUserArtifactUpsertInput,
} from "@/lib/validations/catty-artifacts";

type CattyArtifactsPanelProps = {
  data: CattyArtifactManagementData;
  viewerRole: Role;
};

const statusLabels = {
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
  DISABLED: "Nao usar",
  PENDING: "Pendente",
} satisfies Record<CattyUserArtifactStatusInput, string>;

const statusStyles = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-600",
  DISABLED: "border-rose-200 bg-rose-50 text-rose-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
} satisfies Record<CattyUserArtifactStatusInput, string>;

const alertStyles = {
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
});

function formatDateTime(value?: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Nunca";
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function listToText(items: string[]) {
  return items.join(", ");
}

function getUserOptionLabel(user: CattyArtifactManagementData["users"][number]) {
  return `${user.label} - ${user.role}`;
}

export function CattyArtifactsPanel({
  data,
  viewerRole,
}: CattyArtifactsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CattyUserArtifactStatusInput | "ALL">("ACTIVE");
  const [userFilter, setUserFilter] = useState("ALL");
  const canManage = viewerRole === "ADMIN" || viewerRole === "TEACHER";
  const filteredArtifacts = useMemo(
    () =>
      data.artifacts.filter((artifact) => {
        if (statusFilter !== "ALL" && artifact.status !== statusFilter) {
          return false;
        }

        if (userFilter !== "ALL" && artifact.userId !== userFilter) {
          return false;
        }

        return true;
      }),
    [data.artifacts, statusFilter, userFilter],
  );
  const filteredRecentUsages = useMemo(
    () =>
      userFilter === "ALL"
        ? data.recentUsages
        : data.recentUsages.filter((usage) => usage.userId === userFilter),
    [data.recentUsages, userFilter],
  );
  const selectedUser =
    userFilter === "ALL"
      ? null
      : data.users.find((user) => user.id === userFilter) ?? null;
  const counts = useMemo(
    () =>
      cattyUserArtifactStatusValues.reduce(
        (accumulator, status) => ({
          ...accumulator,
          [status]: data.artifacts.filter((artifact) => artifact.status === status)
            .length,
        }),
        {} as Record<CattyUserArtifactStatusInput, number>,
      ),
    [data.artifacts],
  );

  function buildInput(formData: FormData): CattyUserArtifactUpsertInput {
    return {
      blockedReason: getText(formData, "blockedReason"),
      catchphrasesText: getText(formData, "catchphrasesText"),
      emojisText: getText(formData, "emojisText"),
      example: getText(formData, "example"),
      label: getText(formData, "label"),
      soundsText: getText(formData, "soundsText"),
      status: canManage
        ? (getText(formData, "status") as CattyUserArtifactStatusInput)
        : "PENDING",
      targetUserId: getText(formData, "targetUserId"),
      themeId: getText(formData, "themeId"),
      toneRule: getText(formData, "toneRule"),
    };
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await saveCattyUserArtifact(buildInput(formData));

      setMessage(result.message);

      if (result.ok) {
        form.reset();
      }
    });
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveCattyUserArtifact(buildInput(formData));

      setMessage(result.message);
    });
  }

  function updateStatus(
    artifactId: string,
    status: CattyUserArtifactStatusInput,
    blockedReason?: string,
  ) {
    startTransition(async () => {
      const result = await changeCattyUserArtifactStatus({
        artifactId,
        blockedReason,
        status,
      });

      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Palette aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Estilo da Catty</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Ajuste temas, emojis e bordoes por aluno. So estilos ativos
                entram nas respostas reais da Catty.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {cattyUserArtifactStatusValues.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition",
                  statusFilter === status
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white/70 text-muted-foreground",
                )}
              >
                <span className="block font-semibold">
                  {statusLabels[status]}
                </span>
                <span>{counts[status]} tema(s)</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-sm font-semibold transition",
              statusFilter === "ALL"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-white/70 text-muted-foreground",
            )}
          >
            Ver todos
          </button>
        </section>

        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ShieldAlert aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Sinais de repeticao</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Alertas aparecem quando ha sugestao pendente, repeticao demais
                ou possivel tema sensivel.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {data.alerts.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-white/70 p-4 text-sm text-muted-foreground">
                Tudo leve por aqui. Sem repeticao excessiva no momento.
              </p>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg border p-3 text-sm leading-6",
                    alertStyles[alert.severity],
                  )}
                >
                  {alert.message}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Sparkles aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">
                {canManage ? "Cadastrar tema" : "Sugerir tema"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Use interesses leves: carros, capivara, games, futebol,
                princesa ou outro tema seguro.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="mt-4 grid gap-3">
            <datalist id="catty-artifact-theme-options">
              {data.themeOptions.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </datalist>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="catty-artifact-user">Aluno</FieldLabel>
                <NativeSelect
                  id="catty-artifact-user"
                  name="targetUserId"
                  disabled={isPending || data.users.length <= 1}
                >
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserOptionLabel(user)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-artifact-status">Status</FieldLabel>
                {canManage ? (
                  <NativeSelect
                    id="catty-artifact-status"
                    name="status"
                    defaultValue="ACTIVE"
                    disabled={isPending}
                  >
                    {cattyUserArtifactStatusValues.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <>
                    <Input value="Pendente de aprovacao" disabled />
                    <input type="hidden" name="status" value="PENDING" />
                  </>
                )}
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="catty-artifact-theme">
                  Chave do tema
                </FieldLabel>
                <Input
                  id="catty-artifact-theme"
                  name="themeId"
                  list="catty-artifact-theme-options"
                  placeholder="capybara, cars, games"
                  disabled={isPending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-artifact-label">
                  Nome visivel
                </FieldLabel>
                <Input
                  id="catty-artifact-label"
                  name="label"
                  placeholder="capivara"
                  disabled={isPending}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="catty-artifact-emojis">Emojis</FieldLabel>
                <Input
                  id="catty-artifact-emojis"
                  name="emojisText"
                  placeholder="🦫 🌿 ✨"
                  disabled={isPending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-artifact-sounds">
                  Sons
                </FieldLabel>
                <Input
                  id="catty-artifact-sounds"
                  name="soundsText"
                  placeholder="vruum vruum, pling"
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="catty-artifact-catchphrases">
                Bordoes
              </FieldLabel>
              <Textarea
                id="catty-artifact-catchphrases"
                name="catchphrasesText"
                rows={3}
                placeholder="modo capivara calma, passinho tranquilo"
                disabled={isPending}
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="catty-artifact-example">
                  Exemplo curto
                </FieldLabel>
                <Input
                  id="catty-artifact-example"
                  name="example"
                  placeholder="The capybara is drinking water."
                  disabled={isPending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-artifact-blocked-reason">
                  Motivo se nao usar
                </FieldLabel>
                <Input
                  id="catty-artifact-blocked-reason"
                  name="blockedReason"
                  placeholder="Aluno pediu para parar"
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="catty-artifact-tone">Regra de tom</FieldLabel>
              <Textarea
                id="catty-artifact-tone"
                name="toneRule"
                rows={2}
                placeholder="Usar como toque leve, sem repetir em toda resposta."
                disabled={isPending}
              />
            </Field>

            <Button type="submit" disabled={isPending} className="w-fit gap-2">
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {canManage ? "Salvar tema" : "Enviar sugestao"}
            </Button>
          </form>
        </section>

        {message ? (
          <p className="rounded-lg border bg-white/85 p-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-lg border p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="catty-artifact-user-filter">
                Aluno
              </FieldLabel>
              <NativeSelect
                id="catty-artifact-user-filter"
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
              >
                <option value="ALL">Todos</option>
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="catty-artifact-status-filter">
                Status
              </FieldLabel>
              <NativeSelect
                id="catty-artifact-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as CattyUserArtifactStatusInput | "ALL",
                  )
                }
              >
                <option value="ALL">Todos</option>
                {cattyUserArtifactStatusValues.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {selectedUser?.detectedInterests.length ? (
            <div className="mt-4 rounded-lg border bg-primary/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Interesses detectados
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUser.detectedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-3">
          {filteredArtifacts.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-white/70 p-5 text-sm text-muted-foreground">
              Nenhum tema encontrado para estes filtros.
            </p>
          ) : (
            filteredArtifacts.map((artifact) => (
              <article
                key={artifact.id}
                className="ava-soft-card rounded-lg border p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusStyles[artifact.status],
                        )}
                      >
                        {statusLabels[artifact.status]}
                      </span>
                      <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                        {artifact.themeId}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">
                      {artifact.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {artifact.userName} - {artifact.userEmail}
                    </p>
                  </div>
                  <div className="grid gap-1 text-sm text-muted-foreground md:text-right">
                    <span>Usado {artifact.usageCount} vez(es)</span>
                    <span>Ultimo uso: {formatDateTime(artifact.lastUsedAt)}</span>
                    <span>Atualizado: {formatDateTime(artifact.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Emojis
                    </p>
                    <p className="mt-2 text-lg">
                      {artifact.emojis.join(" ") || "Sem emojis"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Sons
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {artifact.sounds.join(", ") || "Sem sons"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Bordoes
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {artifact.catchphrases.join(", ") || "Sem bordoes"}
                    </p>
                  </div>
                </div>

                {artifact.example || artifact.toneRule || artifact.blockedReason ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {artifact.example ? (
                      <p className="rounded-lg border bg-white/75 p-3 text-sm leading-6">
                        <strong>Exemplo:</strong> {artifact.example}
                      </p>
                    ) : null}
                    {artifact.toneRule ? (
                      <p className="rounded-lg border bg-white/75 p-3 text-sm leading-6">
                        <strong>Tom:</strong> {artifact.toneRule}
                      </p>
                    ) : null}
                    {artifact.blockedReason ? (
                      <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                        <strong>Motivo:</strong> {artifact.blockedReason}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {canManage ? (
                  <details className="mt-4 rounded-lg border bg-primary/[0.03] p-3">
                    <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                      Editar tema
                    </summary>
                    <form
                      onSubmit={handleUpdate}
                      className="mt-4 grid gap-3"
                    >
                      <input
                        type="hidden"
                        name="targetUserId"
                        value={artifact.userId}
                      />
                      <input
                        type="hidden"
                        name="themeId"
                        value={artifact.themeId}
                      />

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor={`artifact-label-${artifact.id}`}>
                            Nome
                          </FieldLabel>
                          <Input
                            id={`artifact-label-${artifact.id}`}
                            name="label"
                            defaultValue={artifact.label}
                            disabled={isPending}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`artifact-status-${artifact.id}`}>
                            Status
                          </FieldLabel>
                          <NativeSelect
                            id={`artifact-status-${artifact.id}`}
                            name="status"
                            defaultValue={artifact.status}
                            disabled={isPending}
                          >
                            {cattyUserArtifactStatusValues.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor={`artifact-emojis-${artifact.id}`}>
                            Emojis
                          </FieldLabel>
                          <Input
                            id={`artifact-emojis-${artifact.id}`}
                            name="emojisText"
                            defaultValue={listToText(artifact.emojis)}
                            disabled={isPending}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`artifact-sounds-${artifact.id}`}>
                            Sons
                          </FieldLabel>
                          <Input
                            id={`artifact-sounds-${artifact.id}`}
                            name="soundsText"
                            defaultValue={listToText(artifact.sounds)}
                            disabled={isPending}
                          />
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel
                          htmlFor={`artifact-catchphrases-${artifact.id}`}
                        >
                          Bordoes
                        </FieldLabel>
                        <Textarea
                          id={`artifact-catchphrases-${artifact.id}`}
                          name="catchphrasesText"
                          defaultValue={listToText(artifact.catchphrases)}
                          rows={2}
                          disabled={isPending}
                        />
                      </Field>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor={`artifact-example-${artifact.id}`}>
                            Exemplo
                          </FieldLabel>
                          <Input
                            id={`artifact-example-${artifact.id}`}
                            name="example"
                            defaultValue={artifact.example ?? ""}
                            disabled={isPending}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`artifact-reason-${artifact.id}`}>
                            Motivo se nao usar
                          </FieldLabel>
                          <Input
                            id={`artifact-reason-${artifact.id}`}
                            name="blockedReason"
                            defaultValue={artifact.blockedReason ?? ""}
                            disabled={isPending}
                          />
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel htmlFor={`artifact-tone-${artifact.id}`}>
                          Regra de tom
                        </FieldLabel>
                        <Textarea
                          id={`artifact-tone-${artifact.id}`}
                          name="toneRule"
                          defaultValue={artifact.toneRule ?? ""}
                          rows={2}
                          disabled={isPending}
                        />
                      </Field>

                      <Button
                        type="submit"
                        variant="outline"
                        disabled={isPending}
                        className="w-fit"
                      >
                        <PencilLine aria-hidden="true" />
                        Salvar ajustes
                      </Button>
                    </form>
                  </details>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {canManage ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending || artifact.status === "ACTIVE"}
                        onClick={() => updateStatus(artifact.id, "ACTIVE")}
                      >
                        <CheckCircle2 aria-hidden="true" />
                        Ativar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending || artifact.status === "DISABLED"}
                        onClick={() =>
                          updateStatus(
                            artifact.id,
                            "DISABLED",
                            "Marcado para nao usar neste aluno.",
                          )
                        }
                      >
                        <Ban aria-hidden="true" />
                        Nao usar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending || artifact.status === "ARCHIVED"}
                        onClick={() =>
                          updateStatus(
                            artifact.id,
                            "ARCHIVED",
                            "Artefato arquivado por revisao humana.",
                          )
                        }
                      >
                        <Archive aria-hidden="true" />
                        Arquivar
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending || artifact.status === "DISABLED"}
                      onClick={() =>
                        updateStatus(
                          artifact.id,
                          "DISABLED",
                          "Aluno pediu para a Catty parar de usar este tema.",
                        )
                      }
                    >
                      <Ban aria-hidden="true" />
                      Pedir para nao usar
                    </Button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>

        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock3 aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Uso recente</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Amostra dos artefatos que apareceram nas ultimas respostas da
                Catty.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {filteredRecentUsages.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-white/70 p-4 text-sm text-muted-foreground">
                Ainda nao encontrei uso recente destes temas.
              </p>
            ) : (
              filteredRecentUsages.map((usage) => (
                <div
                  key={usage.id}
                  className="rounded-lg border bg-white/80 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                      {usage.artifactLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(usage.createdAt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      elemento: {usage.matchedElement}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {usage.textPreview}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
