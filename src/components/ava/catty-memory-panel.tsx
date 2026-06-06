"use client";

import {
  Archive,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Eraser,
  Flag,
  LoaderCircle,
  MessageSquareText,
  PencilLine,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  type SVGProps,
  useMemo,
  useState,
  useTransition,
} from "react";
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

const statusDescriptions = {
  ACTIVE: "Entra no contexto da Catty",
  ARCHIVED: "Guardada fora do prompt",
  FLAGGED: "Precisa de revisao humana",
  PENDING: "Aguardando aprovacao",
} satisfies Record<CattyUserMemoryStatusInput, string>;

const statusIcons = {
  ACTIVE: CheckCircle2,
  ARCHIVED: Archive,
  FLAGGED: ShieldAlert,
  PENDING: Sparkles,
} satisfies Record<
  CattyUserMemoryStatusInput,
  ComponentType<SVGProps<SVGSVGElement>>
>;

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

function EmptyCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-white/72 p-6 text-sm text-muted-foreground shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-primary">{title}</p>
          <p className="mt-1 leading-6">{children}</p>
        </div>
      </div>
    </div>
  );
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
  const activeUserLabel =
    userFilter === "ALL"
      ? "Todos os usuarios"
      : data.users.find((user) => user.id === userFilter)?.label ??
        "Usuario filtrado";
  const heavyConversationCount = filteredConversations.filter(
    (conversation) => conversation.isHeavy,
  ).length;

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
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.88fr)_minmax(0,1.12fr)]">
      <div className="flex flex-col gap-4">
        <section className="ava-soft-card relative overflow-hidden rounded-2xl border p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/12 via-secondary/55 to-amber-100/70"
          />
          <div className="relative flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <BrainCircuit aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Controle seguro
              </span>
              <h2 className="mt-3 text-2xl font-semibold text-primary">
                Memoria da Catty
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Preferencias leves, dificuldades e estilo por usuario. Apenas
                memorias ativas entram no prompt da Catty.
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
            {cattyUserMemoryStatusValues.map((status) => {
              const StatusIcon = statusIcons[status];

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "group rounded-2xl border p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    statusFilter === status
                      ? "border-primary/40 bg-primary text-primary-foreground shadow-lg shadow-primary/18"
                      : "border-primary/12 bg-white/78 text-muted-foreground hover:border-primary/25 hover:bg-white",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-semibold">
                        {statusLabels[status]}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-xs leading-5",
                          statusFilter === status
                            ? "text-primary-foreground/78"
                            : "text-muted-foreground",
                        )}
                      >
                        {statusDescriptions[status]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        statusFilter === status
                          ? "bg-white/15 text-primary-foreground"
                          : "bg-primary/8 text-primary",
                      )}
                    >
                      <StatusIcon aria-hidden="true" className="size-4" />
                    </span>
                  </span>
                  <strong
                    className={cn(
                      "mt-3 block text-2xl",
                      statusFilter === status
                        ? "text-primary-foreground"
                        : "text-primary",
                    )}
                  >
                    {counts[status]}
                  </strong>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "relative mt-3 rounded-full border px-4 py-2 text-sm font-semibold transition",
              statusFilter === "ALL"
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-primary/15 bg-white/75 text-primary hover:border-primary/30 hover:bg-white",
            )}
          >
            Ver todas
          </button>
        </section>

        <section className="ava-soft-card rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
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
              <EmptyCard icon={CheckCircle2} title="Tudo calmo por aqui">
                Sem alertas de memoria no momento.
              </EmptyCard>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-2xl border p-3 text-sm leading-6 shadow-sm",
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
            className="ava-soft-card rounded-2xl border p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
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
          <p className="rounded-2xl border border-primary/15 bg-white/90 p-3 text-sm font-medium text-primary shadow-sm">
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-2xl border p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">
                Filtros e revisao
              </p>
              <h3 className="mt-1 text-lg font-semibold text-primary">
                {activeUserLabel}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="rounded-full border border-primary/10 bg-white/75 px-3 py-1.5">
                {filteredMemories.length} memoria(s)
              </span>
              <span className="rounded-full border border-primary/10 bg-white/75 px-3 py-1.5">
                {filteredConversations.length} historico(s)
              </span>
              {heavyConversationCount > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
                  {heavyConversationCount} pesado(s)
                </span>
              ) : null}
            </div>
          </div>
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
            <EmptyCard icon={BrainCircuit} title="Nenhuma memoria encontrada">
              Ajuste os filtros ou cadastre uma memoria leve para orientar a
              Catty com seguranca.
            </EmptyCard>
          ) : (
            filteredMemories.map((memory) => (
              <article
                key={memory.id}
                className="ava-soft-card overflow-hidden rounded-2xl border p-0"
              >
                <div className="border-b border-primary/10 bg-white/62 px-5 py-4">
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
                    <div className="grid gap-2 text-sm text-muted-foreground md:min-w-44 md:text-right">
                      <span className="inline-flex items-center justify-start gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1 md:justify-end">
                        <Clock3 aria-hidden="true" className="size-3.5" />
                        Usada {memory.usageCount} vez(es)
                      </span>
                      <span>
                        Ultimo uso: {formatDateTime(memory.lastUsedAt)}
                      </span>
                      <span>Atualizada: {formatDateTime(memory.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="rounded-2xl border border-primary/10 bg-white/78 p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {memory.key}
                      </p>
                      <span className="text-xs font-bold text-primary">
                        confianca {memory.confidence}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-400 to-amber-300"
                        style={{ width: `${memory.confidence}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-primary/90">
                      {memory.value}
                    </p>
                    {memory.flaggedReason ? (
                      <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">
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
                  <details className="mt-4 rounded-2xl border border-primary/10 bg-primary/[0.03] p-3">
                    <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                      Eventos recentes
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {memory.recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl bg-white/85 p-3 text-xs text-muted-foreground shadow-sm"
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
                </div>
              </article>
            ))
          )}
        </section>

        <section className="ava-soft-card rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
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
              <EmptyCard icon={MessageSquareText} title="Sem historico filtrado">
                Nenhum historico de conversa para estes filtros.
              </EmptyCard>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "rounded-2xl border bg-white/82 p-4 shadow-sm",
                    conversation.isHeavy
                      ? "border-amber-200 bg-amber-50/90"
                      : "border-primary/10",
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
                      <p className="mt-3 flex items-center gap-2 font-semibold text-primary">
                        <UserRound aria-hidden="true" className="size-4" />
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
