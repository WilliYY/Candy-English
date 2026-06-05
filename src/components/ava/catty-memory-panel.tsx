"use client";

import {
  Archive,
  BrainCircuit,
  CheckCircle2,
  Database,
  Eraser,
  Flag,
  LoaderCircle,
  PencilLine,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  changeCattyUserMemoryStatus,
  clearCattyConversationHistory,
  correctCattyUserMemory,
  removeSensitiveCattyUserMemory,
  saveCattyUserMemory,
} from "@/app/ava/catty-memory/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CattyMemoryManagementData } from "@/lib/catty-memory-management";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  cattyUserMemoryCategoryValues,
  cattyUserMemoryStatusValues,
  type CattyUserMemoryCategoryInput,
  type CattyUserMemoryStatusInput,
  type CattyUserMemoryUpsertInput,
} from "@/lib/validations/catty-user-memory";

type CattyMemoryPanelProps = {
  data: CattyMemoryManagementData;
  viewerRole: Role;
};

const categoryLabels = {
  DIFFICULTY: "Dificuldade",
  EMOJI_PREFERENCE: "Emoji/bordao",
  FAVORITE_THEME: "Tema favorito",
  INTEREST: "Interesse",
  LEARNING_GOAL: "Objetivo",
  NOTE: "Nota leve",
  STYLE: "Estilo",
} satisfies Record<CattyUserMemoryCategoryInput, string>;

const statusLabels = {
  ACTIVE: "Ativa",
  ARCHIVED: "Arquivada",
  FLAGGED: "Revisao",
  PENDING: "Pendente",
} satisfies Record<CattyUserMemoryStatusInput, string>;

const statusStyles = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-600",
  FLAGGED: "border-rose-200 bg-rose-50 text-rose-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
} satisfies Record<CattyUserMemoryStatusInput, string>;

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
  year: "numeric",
});

function formatDateTime(value?: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Nunca";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function CattyMemoryPanel({ data, viewerRole }: CattyMemoryPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof CattyUserMemoryUpsertInput, string>>
  >({});
  const [statusFilter, setStatusFilter] =
    useState<CattyUserMemoryStatusInput | "ALL">("ACTIVE");
  const [categoryFilter, setCategoryFilter] =
    useState<CattyUserMemoryCategoryInput | "ALL">("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const canManage = viewerRole === "ADMIN" || viewerRole === "TEACHER";
  const filteredMemories = useMemo(
    () =>
      data.memories.filter((memory) => {
        if (statusFilter !== "ALL" && memory.status !== statusFilter) {
          return false;
        }

        if (categoryFilter !== "ALL" && memory.category !== categoryFilter) {
          return false;
        }

        if (userFilter !== "ALL" && memory.userId !== userFilter) {
          return false;
        }

        return true;
      }),
    [categoryFilter, data.memories, statusFilter, userFilter],
  );
  const filteredConversations = useMemo(
    () =>
      userFilter === "ALL"
        ? data.conversations
        : data.conversations.filter(
            (conversation) => conversation.userId === userFilter,
          ),
    [data.conversations, userFilter],
  );
  const counts = useMemo(
    () =>
      cattyUserMemoryStatusValues.reduce(
        (accumulator, status) => ({
          ...accumulator,
          [status]: data.memories.filter((memory) => memory.status === status)
            .length,
        }),
        {} as Record<CattyUserMemoryStatusInput, number>,
      ),
    [data.memories],
  );

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const input: CattyUserMemoryUpsertInput = {
      category: getText(formData, "category") as CattyUserMemoryCategoryInput,
      confidence: Number(getText(formData, "confidence") || 70),
      key: getText(formData, "key"),
      source: viewerRole === "ADMIN" ? "ADMIN_NOTE" : "TEACHER_NOTE",
      status: getText(formData, "status") as CattyUserMemoryStatusInput,
      targetUserId: getText(formData, "targetUserId"),
      value: getText(formData, "value"),
    };

    startTransition(async () => {
      const result = await saveCattyUserMemory(input);

      setMessage(result.message);
      setErrors({});

      if (result.ok) {
        form.reset();
      }
    });
  }

  function handleCorrect(event: FormEvent<HTMLFormElement>, memoryId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await correctCattyUserMemory({
        confidence: Number(getText(formData, "confidence") || 75),
        memoryId,
        value: getText(formData, "value"),
      });

      setMessage(result.message);
    });
  }

  function updateStatus(
    memoryId: string,
    status: CattyUserMemoryStatusInput,
    flaggedReason?: string,
  ) {
    startTransition(async () => {
      const result = await changeCattyUserMemoryStatus({
        flaggedReason,
        memoryId,
        status,
      });

      setMessage(result.message);
    });
  }

  function handleRemoveSensitive(memoryId: string) {
    startTransition(async () => {
      const result = await removeSensitiveCattyUserMemory({ memoryId });

      setMessage(result.message);
    });
  }

  function handleClearHistory(conversationId: string) {
    startTransition(async () => {
      const result = await clearCattyConversationHistory({ conversationId });

      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrainCircuit aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Memoria da Catty</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Preferencias leves, dificuldades e estilo por usuario. Apenas
                memorias ativas entram no prompt da Catty.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {cattyUserMemoryStatusValues.map((status) => (
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
                <span>{counts[status]} item(ns)</span>
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
            Ver todas
          </button>
        </section>

        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ShieldAlert aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Alertas de contexto</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Sinais de memoria pesada, contradicao, dado sensivel ou itens
                antigos sem uso.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {data.alerts.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-white/70 p-4 text-sm text-muted-foreground">
                Tudo calmo por aqui. Sem alertas de memoria no momento.
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

        {canManage ? (
          <form
            onSubmit={handleCreate}
            className="ava-soft-card rounded-lg border p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Sparkles aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Adicionar memoria</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use resumo curto. Nao registre telefone, documento, endereco,
                  pagamento, contrato, email, token ou chave.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="catty-memory-user">Usuario</FieldLabel>
                <NativeSelect
                  id="catty-memory-user"
                  name="targetUserId"
                  disabled={isPending}
                >
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.label} - {user.role}
                    </option>
                  ))}
                </NativeSelect>
                {errors.targetUserId ? (
                  <FieldError>{errors.targetUserId}</FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-memory-category">
                  Categoria
                </FieldLabel>
                <NativeSelect
                  id="catty-memory-category"
                  name="category"
                  disabled={isPending}
                >
                  {cattyUserMemoryCategoryValues.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </NativeSelect>
                {errors.category ? (
                  <FieldError>{errors.category}</FieldError>
                ) : null}
              </Field>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="catty-memory-key">Chave</FieldLabel>
                <Input
                  id="catty-memory-key"
                  name="key"
                  placeholder="animal, grammar, examples"
                  disabled={isPending}
                />
                {errors.key ? <FieldError>{errors.key}</FieldError> : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-memory-status">Status</FieldLabel>
                <NativeSelect
                  id="catty-memory-status"
                  name="status"
                  disabled={isPending}
                  defaultValue="ACTIVE"
                >
                  {cattyUserMemoryStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </NativeSelect>
                {errors.status ? <FieldError>{errors.status}</FieldError> : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-memory-confidence">
                  Confianca
                </FieldLabel>
                <Input
                  id="catty-memory-confidence"
                  name="confidence"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={75}
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field className="mt-3">
              <FieldLabel htmlFor="catty-memory-value">Resumo</FieldLabel>
              <Textarea
                id="catty-memory-value"
                name="value"
                rows={3}
                placeholder="Ex.: gosta de exemplos com capivara"
                disabled={isPending}
              />
              {errors.value ? <FieldError>{errors.value}</FieldError> : null}
            </Field>

            <Button type="submit" disabled={isPending} className="mt-4 gap-2">
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              Salvar memoria
            </Button>
          </form>
        ) : null}

        {message ? (
          <p className="rounded-lg border bg-white/85 p-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-lg border p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="catty-memory-user-filter">
                Usuario
              </FieldLabel>
              <NativeSelect
                id="catty-memory-user-filter"
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
              <FieldLabel htmlFor="catty-memory-category-filter">
                Categoria
              </FieldLabel>
              <NativeSelect
                id="catty-memory-category-filter"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value as CattyUserMemoryCategoryInput | "ALL",
                  )
                }
              >
                <option value="ALL">Todas</option>
                {cattyUserMemoryCategoryValues.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="catty-memory-status-filter">
                Status
              </FieldLabel>
              <NativeSelect
                id="catty-memory-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as CattyUserMemoryStatusInput | "ALL",
                  )
                }
              >
                <option value="ALL">Todos</option>
                {cattyUserMemoryStatusValues.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </section>

        <section className="grid gap-3">
          {filteredMemories.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-white/70 p-5 text-sm text-muted-foreground">
              Nenhuma memoria encontrada para estes filtros.
            </p>
          ) : (
            filteredMemories.map((memory) => (
              <article
                key={memory.id}
                className="ava-soft-card rounded-lg border p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusStyles[memory.status],
                        )}
                      >
                        {statusLabels[memory.status]}
                      </span>
                      <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                        {categoryLabels[memory.category]}
                      </span>
                      <span className="rounded-full bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                        {memory.userRole}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">
                      {memory.userName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {memory.userEmail}
                    </p>
                  </div>
                  <div className="grid gap-1 text-sm text-muted-foreground md:text-right">
                    <span>Usada {memory.usageCount} vez(es)</span>
                    <span>Ultimo uso: {formatDateTime(memory.lastUsedAt)}</span>
                    <span>Atualizada: {formatDateTime(memory.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {memory.key} - confianca {memory.confidence}%
                  </p>
                  <p className="mt-2 text-sm leading-6">{memory.value}</p>
                  {memory.flaggedReason ? (
                    <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                      {memory.flaggedReason}
                    </p>
                  ) : null}
                </div>

                {canManage ? (
                  <form
                    onSubmit={(event) => handleCorrect(event, memory.id)}
                    className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]"
                  >
                    <Field>
                      <FieldLabel htmlFor={`memory-value-${memory.id}`}>
                        Corrigir resumo
                      </FieldLabel>
                      <Input
                        id={`memory-value-${memory.id}`}
                        name="value"
                        defaultValue={memory.value}
                        disabled={isPending}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`memory-confidence-${memory.id}`}>
                        Conf.
                      </FieldLabel>
                      <Input
                        id={`memory-confidence-${memory.id}`}
                        name="confidence"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={memory.confidence}
                        disabled={isPending}
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isPending}
                      className="self-end"
                    >
                      <PencilLine aria-hidden="true" />
                      Salvar
                    </Button>
                  </form>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {canManage ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending || memory.status === "ACTIVE"}
                        onClick={() => updateStatus(memory.id, "ACTIVE")}
                      >
                        <CheckCircle2 aria-hidden="true" />
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending || memory.status === "ARCHIVED"}
                        onClick={() => updateStatus(memory.id, "ARCHIVED")}
                      >
                        <Archive aria-hidden="true" />
                        Arquivar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending || memory.status === "FLAGGED"}
                        onClick={() =>
                          updateStatus(
                            memory.id,
                            "FLAGGED",
                            "Marcada como errada para revisao humana.",
                          )
                        }
                      >
                        <Flag aria-hidden="true" />
                        Errada
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleRemoveSensitive(memory.id)}
                      >
                        <Eraser aria-hidden="true" />
                        Remover dado sensivel
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending || memory.status === "FLAGGED"}
                      onClick={() =>
                        updateStatus(
                          memory.id,
                          "FLAGGED",
                          "Aluno pediu correcao desta memoria.",
                        )
                      }
                    >
                      <Flag aria-hidden="true" />
                      Pedir correcao
                    </Button>
                  )}
                </div>

                {memory.recentEvents.length > 0 ? (
                  <details className="mt-4 rounded-lg border bg-primary/[0.03] p-3">
                    <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                      Eventos recentes
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {memory.recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg bg-white/80 p-3 text-xs text-muted-foreground"
                        >
                          <strong className="text-foreground">
                            {event.action}
                          </strong>{" "}
                          em {formatDateTime(event.createdAt)}
                          {event.createdByName
                            ? ` por ${event.createdByName}`
                            : ""}
                          {event.note ? (
                            <span className="mt-1 block">{event.note}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            ))
          )}
        </section>

        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Historico da Catty</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                O banco pode guardar contexto por anos, mas so as ultimas 8
                mensagens entram no prompt da IA. Limpe manualmente se sair do
                controle.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {filteredConversations.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-white/70 p-4 text-sm text-muted-foreground">
                Nenhum historico de conversa para estes filtros.
              </p>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "rounded-lg border bg-white/80 p-4",
                    conversation.isHeavy
                      ? "border-amber-200 bg-amber-50"
                      : "border-border",
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                          {conversation.area}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                          {conversation.task ?? "default"}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">
                        {conversation.userName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conversation.contextKey}
                      </p>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground md:text-right">
                      <span>{conversation.messageCount} mensagem(ns)</span>
                      <span>{formatBytes(conversation.approxBytes)} estimados</span>
                      <span>{formatDateTime(conversation.updatedAt)}</span>
                    </div>
                  </div>

                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending || conversation.messageCount === 0}
                      onClick={() => handleClearHistory(conversation.id)}
                      className="mt-3"
                    >
                      <Trash2 aria-hidden="true" />
                      Limpar historico
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
