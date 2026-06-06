"use client";

import {
  AlertTriangle,
  Archive,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  XCircle,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  createCattyLearningFromFeedback,
  createCattyLearningItem,
  updateCattyLearningFeedbackStatus,
  updateCattyLearningItemStatus,
} from "@/app/ava/catty-learning/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/roles";
import {
  cattyLearningCategoryValues,
  cattyLearningFeedbackKindValues,
  cattyLearningIntentValues,
  cattyLearningStatusValues,
  type CattyLearningCategoryInput,
  type CattyLearningCreateInput,
  type CattyLearningFeedbackKindInput,
  type CattyLearningFromFeedbackInput,
  type CattyLearningIntentInput,
  type CattyLearningStatusInput,
} from "@/lib/validations/catty-learning";

export type CattyLearningItemRow = {
  approvedAt: string | null;
  approvedByName: string | null;
  badReply: string | null;
  category: CattyLearningCategoryInput;
  createdAt: string;
  createdByName: string | null;
  id: string;
  idealReply: string | null;
  intent: CattyLearningIntentInput | null;
  notes: string | null;
  status: CattyLearningStatusInput;
  tags: string[];
  title: string;
  userPrompt: string | null;
};

export type CattyLearningFeedbackRow = {
  cattyReply: string | null;
  contextArea: string | null;
  contextTask: string | null;
  createdAt: string;
  createdByName: string | null;
  createdByRole: string | null;
  id: string;
  idealReply: string | null;
  itemTitle: string | null;
  kind: CattyLearningFeedbackKindInput;
  note: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  status: CattyLearningStatusInput;
  suggestedCategory: CattyLearningCategoryInput | null;
  suggestedIntent: CattyLearningIntentInput | null;
  suggestedTitle: string | null;
  userPrompt: string | null;
};

type CattyLearningCenterPanelProps = {
  feedbacks: CattyLearningFeedbackRow[];
  items: CattyLearningItemRow[];
  viewerRole: Extract<Role, "ADMIN" | "TEACHER">;
};

const categoryLabels = {
  APPROVED_CORRECTION: "Correcao aprovada",
  BAD_REPLY: "Resposta ruim",
  CANDY_CONTEXT: "Contexto Candy English",
  CATTY_PHRASE: "Frase/bordao da Catty",
  COMMON_QUESTION: "Duvida comum",
  HOMEWORK_EXAMPLE: "Exemplo de homework",
  IDEAL_REPLY: "Resposta ideal",
  PERSONALITY_RULE: "Regra de personalidade",
  STUDENT_GUIDANCE: "Orientacao para aluno",
  TEACHER_GUIDANCE: "Orientacao para teacher",
  VOCABULARY: "Vocabulario",
} satisfies Record<CattyLearningCategoryInput, string>;

const statusLabels = {
  APPROVED: "Aprovado",
  ARCHIVED: "Arquivado",
  PENDING: "Pendente",
  REJECTED: "Recusado",
} satisfies Record<CattyLearningStatusInput, string>;

const feedbackKindLabels = {
  CONFUSING: "Resposta confusa",
  DISLIKED: "Nao gostei",
  LIKED: "Gostei",
  PATTERN_SUGGESTION: "Padrao sugerido",
  SHOULD_ANSWER: "Deveria responder assim",
} satisfies Record<CattyLearningFeedbackKindInput, string>;

const intentLabels = {
  ava_help: "Ajuda no AVA",
  candy_xp: "Candy XP",
  code_api_request: "Codigo/API",
  complex_question: "Pergunta grande",
  confusing_question: "Pergunta confusa",
  correct_sentence: "Corrigir frase",
  explain_word: "Explicar palavra",
  homework_hint: "Dica de homework",
  lesson_material: "Aula/material",
  motivation: "Motivacao",
  out_of_scope: "Fora do tema",
  practice_english: "Praticar ingles",
  ready_answer_request: "Resposta pronta",
  teacher_activity_creation: "Criar atividade",
  teacher_feedback: "Feedback teacher",
  teacher_message: "Mensagem teacher",
  translate_sentence: "Traduzir frase",
} satisfies Record<CattyLearningIntentInput, string>;

const statusStyles = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-600",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
} satisfies Record<CattyLearningStatusInput, string>;

const statusToneStyles = {
  APPROVED: {
    bar: "bg-emerald-400",
    buttonActive: "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm",
    buttonIdle:
      "border-emerald-100 bg-white/85 text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50/80",
    hint: "Liberado para entrar no contexto.",
    icon: "bg-emerald-100 text-emerald-700",
  },
  ARCHIVED: {
    bar: "bg-slate-400",
    buttonActive: "border-slate-300 bg-slate-50 text-slate-900 shadow-sm",
    buttonIdle:
      "border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    hint: "Guardado, nao entra no prompt.",
    icon: "bg-slate-100 text-slate-600",
  },
  PENDING: {
    bar: "bg-amber-400",
    buttonActive: "border-amber-300 bg-amber-50 text-amber-900 shadow-sm",
    buttonIdle:
      "border-amber-100 bg-white/85 text-amber-800 hover:border-amber-200 hover:bg-amber-50/80",
    hint: "Precisa de revisao humana.",
    icon: "bg-amber-100 text-amber-700",
  },
  REJECTED: {
    bar: "bg-rose-400",
    buttonActive: "border-rose-300 bg-rose-50 text-rose-900 shadow-sm",
    buttonIdle:
      "border-rose-100 bg-white/85 text-rose-800 hover:border-rose-200 hover:bg-rose-50/80",
    hint: "Nao sera usado pela Catty.",
    icon: "bg-rose-100 text-rose-700",
  },
} satisfies Record<
  CattyLearningStatusInput,
  {
    bar: string;
    buttonActive: string;
    buttonIdle: string;
    hint: string;
    icon: string;
  }
>;

const statusAccentStyles = {
  APPROVED: "border-l-emerald-300",
  ARCHIVED: "border-l-slate-300",
  PENDING: "border-l-amber-300",
  REJECTED: "border-l-rose-300",
} satisfies Record<CattyLearningStatusInput, string>;

const feedbackKindStyles = {
  CONFUSING: "border-amber-200 bg-amber-50 text-amber-800",
  DISLIKED: "border-rose-200 bg-rose-50 text-rose-800",
  LIKED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PATTERN_SUGGESTION: "border-sky-200 bg-sky-50 text-sky-800",
  SHOULD_ANSWER: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
} satisfies Record<CattyLearningFeedbackKindInput, string>;

const feedbackKindAccentStyles = {
  CONFUSING: "border-l-amber-300",
  DISLIKED: "border-l-rose-300",
  LIKED: "border-l-emerald-300",
  PATTERN_SUGGESTION: "border-l-sky-300",
  SHOULD_ANSWER: "border-l-fuchsia-300",
} satisfies Record<CattyLearningFeedbackKindInput, string>;

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getFormText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function StatusIcon({ status }: { status: CattyLearningStatusInput }) {
  if (status === "APPROVED") {
    return <CheckCircle2 className="size-4" aria-hidden="true" />;
  }

  if (status === "REJECTED") {
    return <XCircle className="size-4" aria-hidden="true" />;
  }

  if (status === "ARCHIVED") {
    return <Archive className="size-4" aria-hidden="true" />;
  }

  return <Clock3 className="size-4" aria-hidden="true" />;
}

function StatusFilterButton({
  active,
  count,
  onClick,
  status,
  unit,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  status: CattyLearningStatusInput;
  unit: string;
}) {
  const tone = statusToneStyles[status];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
        active ? tone.buttonActive : tone.buttonIdle
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
        >
          <StatusIcon status={status} />
        </span>
        {active ? (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
            Fila ativa
          </span>
        ) : null}
      </div>
      <span className="mt-3 block font-semibold">{statusLabels[status]}</span>
      <span className="mt-1 block text-xs">
        {count} {unit}
      </span>
      <span className="mt-2 block text-xs leading-5 opacity-80">{tone.hint}</span>
      <span className={`mt-3 block h-1 rounded-full ${tone.bar}`} />
    </button>
  );
}

function AllFilterButton({
  active,
  label,
  onClick,
  total,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  total: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-fit rounded-lg border px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-white/80 text-muted-foreground hover:border-primary/25 hover:text-primary"
      }`}
    >
      {label} <span className="ml-1 text-xs opacity-75">({total})</span>
    </button>
  );
}

function EmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-white/70 p-5 text-sm text-muted-foreground">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
          {icon}
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 leading-6">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function CattyLearningCenterPanel({
  feedbacks,
  items,
  viewerRole,
}: CattyLearningCenterPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof CattyLearningCreateInput, string>>
  >({});
  const [statusFilter, setStatusFilter] =
    useState<CattyLearningStatusInput | "ALL">("PENDING");
  const [feedbackStatusFilter, setFeedbackStatusFilter] =
    useState<CattyLearningStatusInput | "ALL">("PENDING");
  const isAdmin = viewerRole === "ADMIN";
  const filteredFeedbacks = useMemo(
    () =>
      feedbackStatusFilter === "ALL"
        ? feedbacks
        : feedbacks.filter((feedback) => feedback.status === feedbackStatusFilter),
    [feedbacks, feedbackStatusFilter],
  );
  const filteredItems = useMemo(
    () =>
      statusFilter === "ALL"
        ? items
        : items.filter((item) => item.status === statusFilter),
    [items, statusFilter],
  );
  const counts = useMemo(
    () =>
      cattyLearningStatusValues.reduce(
        (accumulator, status) => ({
          ...accumulator,
          [status]: items.filter((item) => item.status === status).length,
        }),
        {} as Record<CattyLearningStatusInput, number>,
      ),
    [items],
  );
  const feedbackCounts = useMemo(
    () =>
      cattyLearningStatusValues.reduce(
        (accumulator, status) => ({
          ...accumulator,
          [status]: feedbacks.filter((feedback) => feedback.status === status)
            .length,
        }),
        {} as Record<CattyLearningStatusInput, number>,
      ),
    [feedbacks],
  );
  const feedbackKindCounts = useMemo(
    () =>
      cattyLearningFeedbackKindValues.reduce(
        (accumulator, kind) => ({
          ...accumulator,
          [kind]: feedbacks.filter((feedback) => feedback.kind === kind).length,
        }),
        {} as Record<CattyLearningFeedbackKindInput, number>,
      ),
    [feedbacks],
  );

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: CattyLearningCreateInput = {
      badReply: getFormText(formData, "badReply"),
      category: getFormText(formData, "category") as CattyLearningCategoryInput,
      idealReply: getFormText(formData, "idealReply"),
      intent: getFormText(formData, "intent") as CattyLearningIntentInput | "",
      notes: getFormText(formData, "notes"),
      tags: parseTags(formData.get("tags")),
      title: getFormText(formData, "title"),
      userPrompt: getFormText(formData, "userPrompt"),
    };
    const form = event.currentTarget;

    startTransition(async () => {
      const result = await createCattyLearningItem(input);

      setMessage(result.message);
      setErrors(result.errors ?? {});

      if (result.ok) {
        form.reset();
      }
    });
  }

  function updateStatus(itemId: string, status: CattyLearningStatusInput) {
    startTransition(async () => {
      const result = await updateCattyLearningItemStatus({
        itemId,
        status,
      });

      setMessage(result.message);
    });
  }

  function updateFeedbackStatus(
    feedbackId: string,
    status: CattyLearningStatusInput,
  ) {
    startTransition(async () => {
      const result = await updateCattyLearningFeedbackStatus({
        feedbackId,
        status,
      });

      setMessage(result.message);
    });
  }

  function createFromFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: CattyLearningFromFeedbackInput = {
      badReply: getFormText(formData, "badReply"),
      category: getFormText(formData, "category") as CattyLearningCategoryInput,
      feedbackId: getFormText(formData, "feedbackId"),
      idealReply: getFormText(formData, "idealReply"),
      intent: getFormText(formData, "intent") as CattyLearningIntentInput | "",
      notes: getFormText(formData, "notes"),
      tags: parseTags(formData.get("tags")),
      title: getFormText(formData, "title"),
      userPrompt: getFormText(formData, "userPrompt"),
    };

    startTransition(async () => {
      const result = await createCattyLearningFromFeedback(input);

      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
      <form
        onSubmit={handleCreate}
        className="ava-soft-card flex flex-col gap-4 rounded-lg border p-5 shadow-sm"
      >
        <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-fuchsia-50/70 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <BrainCircuit aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Nova memoria
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">
                  Revisao humana
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">
                Catty Learning Center
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Sugira uma regra, exemplo ou resposta curta. A Catty so usa
                memoria aprovada por Admin.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="catty-learning-title">Titulo</FieldLabel>
            <Input
              id="catty-learning-title"
              name="title"
              placeholder="Ex.: resposta para aluno travado"
              disabled={isPending}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="catty-learning-category">Categoria</FieldLabel>
            <NativeSelect
              id="catty-learning-category"
              name="category"
              disabled={isPending}
            >
              {cattyLearningCategoryValues.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </NativeSelect>
            {errors.category ? <FieldError>{errors.category}</FieldError> : null}
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="catty-learning-intent">
              Intencao opcional
            </FieldLabel>
            <NativeSelect
              id="catty-learning-intent"
              name="intent"
              disabled={isPending}
            >
              <option value="">Geral</option>
              {cattyLearningIntentValues.map((intent) => (
                <option key={intent} value={intent}>
                  {intentLabels[intent]}
                </option>
              ))}
            </NativeSelect>
            {errors.intent ? <FieldError>{errors.intent}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="catty-learning-tags">Tags</FieldLabel>
            <Input
              id="catty-learning-tags"
              name="tags"
              placeholder="homework, vocabulario, fofura"
              disabled={isPending}
            />
            {errors.tags ? <FieldError>{errors.tags}</FieldError> : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="catty-learning-prompt">
            Pergunta do usuario
          </FieldLabel>
          <Textarea
            id="catty-learning-prompt"
            name="userPrompt"
            rows={3}
            placeholder="Ex.: nao entendi esse exercicio"
            disabled={isPending}
          />
          {errors.userPrompt ? <FieldError>{errors.userPrompt}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="catty-learning-bad">Resposta ruim</FieldLabel>
          <Textarea
            id="catty-learning-bad"
            name="badReply"
            rows={3}
            placeholder="Opcional: algo que a Catty deve evitar"
            disabled={isPending}
          />
          {errors.badReply ? <FieldError>{errors.badReply}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="catty-learning-ideal">
            Resposta ideal
          </FieldLabel>
          <Textarea
            id="catty-learning-ideal"
            name="idealReply"
            rows={4}
            placeholder="Ex.: Awnn, vamos por partes..."
            disabled={isPending}
          />
          {errors.idealReply ? <FieldError>{errors.idealReply}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="catty-learning-notes">Observacao</FieldLabel>
          <Textarea
            id="catty-learning-notes"
            name="notes"
            rows={3}
            placeholder="Regra curta para a Catty seguir"
            disabled={isPending}
          />
          {errors.notes ? <FieldError>{errors.notes}</FieldError> : null}
        </Field>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden="true" />
            <p>
              Nao salve senha, pagamento, contrato, documento, telefone, token,
              chave, email ou dados privados. A memoria deve ser exemplo curto e
              aprovado.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit gap-2">
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Enviar aprendizado
        </Button>

        {message ? (
          <p className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm font-medium text-primary">
            {message}
          </p>
        ) : null}
      </form>

      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-lg border p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Inbox aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">Feedbacks recebidos</h2>
                  <span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    Fila do chat
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Avaliacoes discretas feitas no chat da Catty. Edite antes de
                  transformar em aprendizado.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {cattyLearningFeedbackKindValues.map((kind) => (
                <span
                  key={kind}
                  className={`rounded-full border px-2 py-1 font-semibold ${feedbackKindStyles[kind]}`}
                >
                  {feedbackKindLabels[kind]}: {feedbackKindCounts[kind]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cattyLearningStatusValues.map((status) => (
              <StatusFilterButton
                key={status}
                active={feedbackStatusFilter === status}
                count={feedbackCounts[status]}
                onClick={() => setFeedbackStatusFilter(status)}
                status={status}
                unit="feedback(s)"
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AllFilterButton
              active={feedbackStatusFilter === "ALL"}
              label="Ver todos os feedbacks"
              onClick={() => setFeedbackStatusFilter("ALL")}
              total={feedbacks.length}
            />
            <span className="text-xs text-muted-foreground">
              Use pendentes primeiro; aprovados viram referencia da Catty.
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {filteredFeedbacks.length === 0 ? (
              <EmptyState
                title="Nenhum feedback nesta fila"
                description="Quando alguem avaliar uma resposta da Catty, ela aparece aqui com status e contexto."
                icon={<MessageSquareText className="size-4" aria-hidden="true" />}
              />
            ) : (
              filteredFeedbacks.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  isAdmin={isAdmin}
                  isPending={isPending}
                  onCreateFromFeedback={createFromFeedback}
                  onUpdateStatus={updateFeedbackStatus}
                />
              ))
            )}
          </div>
        </section>

        <section className="ava-soft-card rounded-lg border p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-primary">
                <Sparkles aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    Aprendizados da Catty
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    Memoria aprovada
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Itens aprovados entram no contexto. Pendentes ficam separados
                  para revisao.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <span>{counts.APPROVED} aprovado(s) em uso</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cattyLearningStatusValues.map((status) => (
              <StatusFilterButton
                key={status}
                active={statusFilter === status}
                count={counts[status]}
                onClick={() => setStatusFilter(status)}
                status={status}
                unit="item(ns)"
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AllFilterButton
              active={statusFilter === "ALL"}
              label="Ver todos"
              onClick={() => setStatusFilter("ALL")}
              total={items.length}
            />
            <span className="text-xs text-muted-foreground">
              Aprovado usa, pendente revisa, recusado bloqueia, arquivado guarda.
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nenhum aprendizado neste filtro"
                description="Crie um aprendizado ou transforme um feedback em memoria para treinar a Catty com seguranca."
                icon={<WandSparkles className="size-4" aria-hidden="true" />}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className={`ava-soft-card rounded-lg border border-l-4 p-5 shadow-sm ${statusAccentStyles[item.status]}`}
                >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                        >
                          {statusLabels[item.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {categoryLabels[item.category]}
                        {item.intent ? ` - ${intentLabels[item.intent]}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {item.userPrompt ? (
                    <Block label="Pergunta" value={item.userPrompt} />
                  ) : null}
                  {item.badReply ? (
                    <Block label="Evitar" value={item.badReply} />
                  ) : null}
                  {item.idealReply ? (
                    <Block label="Ideal" value={item.idealReply} strong />
                  ) : null}
                  {item.notes ? (
                    <Block label="Observacao" value={item.notes} />
                  ) : null}

                  {item.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
                    <span>
                      Criado por {item.createdByName ?? "usuario removido"}
                    </span>
                    <span>
                      {item.approvedByName
                        ? `Aprovado por ${item.approvedByName}`
                        : "Ainda sem aprovacao global"}
                    </span>
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      {item.status !== "APPROVED" ? (
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          disabled={isPending}
                          onClick={() => updateStatus(item.id, "APPROVED")}
                        >
                          <CheckCircle2 aria-hidden="true" />
                          Aprovar
                        </Button>
                      ) : null}
                      {item.status !== "REJECTED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isPending}
                          onClick={() => updateStatus(item.id, "REJECTED")}
                        >
                          <XCircle aria-hidden="true" />
                          Recusar
                        </Button>
                      ) : null}
                      {item.status !== "ARCHIVED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isPending}
                          onClick={() => updateStatus(item.id, "ARCHIVED")}
                        >
                          <Archive aria-hidden="true" />
                          Arquivar
                        </Button>
                      ) : null}
                      {item.status !== "PENDING" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isPending}
                          onClick={() => updateStatus(item.id, "PENDING")}
                        >
                          <RotateCcw aria-hidden="true" />
                          Voltar para pendente
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Block({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm shadow-sm ${
        strong
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-border bg-white/75"
      }`}
    >
      <span
        className={`mb-1 block text-xs font-semibold uppercase tracking-[0.14em] ${
          strong ? "text-emerald-700" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <p
        className={`whitespace-pre-wrap break-words leading-6 ${
          strong ? "font-medium text-emerald-900" : "text-muted-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function categoryFromFeedbackKind(kind: CattyLearningFeedbackKindInput) {
  return kind === "DISLIKED" || kind === "CONFUSING"
    ? "BAD_REPLY"
    : "IDEAL_REPLY";
}

function compactTags(feedback: CattyLearningFeedbackRow) {
  return [
    "feedback",
    feedback.kind.toLowerCase().replace(/_/g, "-"),
    feedback.suggestedIntent?.replace(/_/g, "-") ?? "",
  ].filter(Boolean);
}

function FeedbackCard({
  feedback,
  isAdmin,
  isPending,
  onCreateFromFeedback,
  onUpdateStatus,
}: {
  feedback: CattyLearningFeedbackRow;
  isAdmin: boolean;
  isPending: boolean;
  onCreateFromFeedback: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateStatus: (
    feedbackId: string,
    status: CattyLearningStatusInput,
  ) => void;
}) {
  const defaultCategory =
    feedback.suggestedCategory ?? categoryFromFeedbackKind(feedback.kind);
  const defaultTitle =
    feedback.suggestedTitle ??
    `${feedbackKindLabels[feedback.kind]} da Catty`;
  const defaultIdealReply =
    feedback.idealReply ??
    (feedback.kind === "LIKED" ? feedback.cattyReply : null) ??
    "";
  const defaultBadReply =
    feedback.kind === "DISLIKED" || feedback.kind === "CONFUSING"
      ? feedback.cattyReply ?? ""
      : "";
  const defaultTags = compactTags(feedback).join(", ");

  return (
    <article
      className={`rounded-lg border border-l-4 bg-white/80 p-4 shadow-sm ${feedbackKindAccentStyles[feedback.kind]}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-xs font-semibold ${feedbackKindStyles[feedback.kind]}`}
              >
                Tipo: {feedbackKindLabels[feedback.kind]}
              </span>
              <span
                className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[feedback.status]}`}
              >
                {statusLabels[feedback.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Enviado por {feedback.createdByName ?? "usuario removido"}
              {feedback.createdByRole ? ` (${feedback.createdByRole})` : ""} em{" "}
              {formatDate(feedback.createdAt)}
            </p>
          </div>
          <span className="w-fit rounded-full border border-primary/10 bg-primary/8 px-2 py-1 text-xs font-semibold text-primary">
            {feedback.contextArea ?? "AVA"}
            {feedback.contextTask ? ` / ${feedback.contextTask}` : ""}
          </span>
        </div>

        {feedback.userPrompt ? (
          <Block label="Pergunta avaliada" value={feedback.userPrompt} />
        ) : null}
        {feedback.cattyReply ? (
          <Block label="Resposta da Catty" value={feedback.cattyReply} />
        ) : null}
        {feedback.idealReply ? (
          <Block label="Sugestao ideal" value={feedback.idealReply} strong />
        ) : null}

        <p className="text-sm leading-6 text-muted-foreground">
          {feedback.note}
        </p>

        {feedback.itemTitle ? (
          <span className="w-fit rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            Ligado ao aprendizado: {feedback.itemTitle}
          </span>
        ) : null}

        <details className="rounded-lg border bg-white/75 p-3 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            <span className="inline-flex items-center gap-2">
              <WandSparkles className="size-4" aria-hidden="true" />
              {isAdmin ? "Editar e aprovar aprendizado" : "Editar e sugerir"}
            </span>
          </summary>
          <form
            onSubmit={onCreateFromFeedback}
            className="mt-4 grid gap-3"
          >
            <input type="hidden" name="feedbackId" value={feedback.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`feedback-title-${feedback.id}`}>
                  Titulo
                </FieldLabel>
                <Input
                  id={`feedback-title-${feedback.id}`}
                  name="title"
                  defaultValue={defaultTitle}
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`feedback-category-${feedback.id}`}>
                  Categoria
                </FieldLabel>
                <NativeSelect
                  id={`feedback-category-${feedback.id}`}
                  name="category"
                  defaultValue={defaultCategory}
                  disabled={isPending}
                >
                  {cattyLearningCategoryValues.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`feedback-intent-${feedback.id}`}>
                  Intencao
                </FieldLabel>
                <NativeSelect
                  id={`feedback-intent-${feedback.id}`}
                  name="intent"
                  defaultValue={feedback.suggestedIntent ?? ""}
                  disabled={isPending}
                >
                  <option value="">Geral</option>
                  {cattyLearningIntentValues.map((intent) => (
                    <option key={intent} value={intent}>
                      {intentLabels[intent]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`feedback-tags-${feedback.id}`}>
                  Tags
                </FieldLabel>
                <Input
                  id={`feedback-tags-${feedback.id}`}
                  name="tags"
                  defaultValue={defaultTags}
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor={`feedback-prompt-${feedback.id}`}>
                Pergunta do usuario
              </FieldLabel>
              <Textarea
                id={`feedback-prompt-${feedback.id}`}
                name="userPrompt"
                rows={2}
                defaultValue={feedback.userPrompt ?? ""}
                disabled={isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`feedback-bad-${feedback.id}`}>
                Resposta ruim a evitar
              </FieldLabel>
              <Textarea
                id={`feedback-bad-${feedback.id}`}
                name="badReply"
                rows={2}
                defaultValue={defaultBadReply}
                disabled={isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`feedback-ideal-${feedback.id}`}>
                Resposta ideal
              </FieldLabel>
              <Textarea
                id={`feedback-ideal-${feedback.id}`}
                name="idealReply"
                rows={3}
                defaultValue={defaultIdealReply}
                disabled={isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`feedback-notes-${feedback.id}`}>
                Observacao
              </FieldLabel>
              <Textarea
                id={`feedback-notes-${feedback.id}`}
                name="notes"
                rows={2}
                defaultValue={feedback.note}
                disabled={isPending}
              />
            </Field>

            <Button type="submit" disabled={isPending} className="w-fit gap-2">
              <CheckCircle2 aria-hidden="true" />
              {isAdmin ? "Aprovar como aprendizado" : "Sugerir aprendizado"}
            </Button>
          </form>
        </details>

        <div className="flex flex-wrap gap-2">
          {feedback.status !== "REJECTED" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={isPending}
              onClick={() => onUpdateStatus(feedback.id, "REJECTED")}
            >
              <XCircle aria-hidden="true" />
              Recusar
            </Button>
          ) : null}
          {feedback.status !== "ARCHIVED" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={isPending}
              onClick={() => onUpdateStatus(feedback.id, "ARCHIVED")}
            >
              <Archive aria-hidden="true" />
              Arquivar
            </Button>
          ) : null}
          {feedback.status !== "PENDING" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={isPending}
              onClick={() => onUpdateStatus(feedback.id, "PENDING")}
            >
              <RotateCcw aria-hidden="true" />
              Voltar para pendente
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
