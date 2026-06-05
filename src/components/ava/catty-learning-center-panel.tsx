"use client";

import {
  Archive,
  BrainCircuit,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { type FormEvent, useMemo, useState, useTransition } from "react";
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
        className="ava-soft-card flex flex-col gap-4 rounded-lg border p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Catty Learning Center</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Sugira uma memoria curta. A Catty so usa itens aprovados por Admin.
            </p>
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
          Nao salve senha, pagamento, contrato, documento, telefone, token,
          chave, email ou dados privados. A memoria deve ser exemplo curto e
          aprovado.
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
          <p className="rounded-lg border bg-white/80 p-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </form>

      <div className="flex flex-col gap-4">
        <section className="ava-soft-card rounded-lg border p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Inbox aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Feedbacks recebidos</h2>
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
                  className="rounded-full bg-primary/8 px-2 py-1 font-semibold text-primary"
                >
                  {feedbackKindLabels[kind]}: {feedbackKindCounts[kind]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {cattyLearningStatusValues.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFeedbackStatusFilter(status)}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  feedbackStatusFilter === status
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white/70 text-muted-foreground"
                }`}
              >
                <span className="block font-semibold">
                  {statusLabels[status]}
                </span>
                <span>{feedbackCounts[status]} feedback(s)</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFeedbackStatusFilter("ALL")}
            className={`mt-3 w-fit rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              feedbackStatusFilter === "ALL"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-white/70 text-muted-foreground"
            }`}
          >
            Ver todos os feedbacks
          </button>

          <div className="mt-4 grid gap-3">
            {filteredFeedbacks.length === 0 ? (
              <div className="rounded-lg border bg-white/70 p-4 text-sm text-muted-foreground">
                Nenhum feedback nesta fila ainda.
              </div>
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

        <div className="flex items-center gap-2 pt-2">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          <h2 className="text-lg font-semibold">Aprendizados da Catty</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {cattyLearningStatusValues.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                statusFilter === status
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white/70 text-muted-foreground"
              }`}
            >
              <span className="block font-semibold">{statusLabels[status]}</span>
              <span>{counts[status]} item(ns)</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`w-fit rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            statusFilter === "ALL"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-white/70 text-muted-foreground"
          }`}
        >
          Ver todos
        </button>

        {filteredItems.length === 0 ? (
          <div className="ava-soft-card rounded-lg border p-5 text-sm text-muted-foreground">
            Nenhum aprendizado nesta categoria ainda.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="ava-soft-card rounded-lg border p-5"
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
    <div className="rounded-lg border bg-white/70 p-3 text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className={strong ? "font-medium text-primary" : "text-muted-foreground"}>
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
    <article className="rounded-lg border bg-white/75 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">
                {feedbackKindLabels[feedback.kind]}
              </h3>
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
          <span className="rounded-full bg-primary/8 px-2 py-1 text-xs font-semibold text-primary">
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

        <details className="rounded-lg border bg-white/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            {isAdmin ? "Editar e aprovar aprendizado" : "Editar e sugerir"}
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
