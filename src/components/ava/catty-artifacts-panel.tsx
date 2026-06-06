"use client";

import {
  Archive,
  Ban,
  BrainCircuit,
  Cat,
  CheckCircle2,
  Clock3,
  Heart,
  LoaderCircle,
  MessageSquareText,
  Palette,
  PencilLine,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
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
  changeCattyUserArtifactStatus,
  approveCattyArtifactSuggestion,
  changeCattyArtifactEnrichmentStatus,
  enrichCattyArtifactTheme,
  saveCattyUserArtifact,
} from "@/app/ava/catty-artifacts/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CattyArtifactManagementData } from "@/lib/catty-user-artifacts";
import type { CattyMemoryManagementData } from "@/lib/catty-memory-management";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  cattyUserArtifactStatusValues,
  type CattyArtifactEnrichmentReviewInput,
  type CattyArtifactEnrichmentStatusInput,
  type CattyUserArtifactStatusInput,
  type CattyUserArtifactUpsertInput,
} from "@/lib/validations/catty-artifacts";

type CattyArtifactsPanelProps = {
  data: CattyArtifactManagementData;
  memoryData?: CattyMemoryManagementData;
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

const enrichmentStatusLabels = {
  APPROVED: "Aprovada",
  ARCHIVED: "Arquivada",
  FAILED: "Erro/aviso",
  PENDING: "Pendente",
  READY_FOR_REVIEW: "Sugestao pronta",
  REJECTED: "Recusada",
} satisfies Record<CattyArtifactEnrichmentStatusInput, string>;

const enrichmentStatusStyles = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-600",
  FAILED: "border-amber-200 bg-amber-50 text-amber-800",
  PENDING: "border-sky-200 bg-sky-50 text-sky-700",
  READY_FOR_REVIEW: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
} satisfies Record<CattyArtifactEnrichmentStatusInput, string>;

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

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function normalizeThemeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugifyThemeLabel(value: string) {
  const slug = normalizeThemeText(value)
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return slug || "tema_candy";
}

function listToText(items: string[]) {
  return items.join(", ");
}

function getUserOptionLabel(user: CattyArtifactManagementData["users"][number]) {
  return `${user.label} - ${user.role}`;
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

type ArtifactDraft = {
  catchphrasesText: string;
  emojisText: string;
  example: string;
  label: string;
  soundsText: string;
  themeId: string;
  toneRule: string;
};

const emptyDraft: ArtifactDraft = {
  catchphrasesText: "",
  emojisText: "",
  example: "",
  label: "",
  soundsText: "",
  themeId: "",
  toneRule: "",
};

function buildGenericSuggestion(label: string): Omit<ArtifactDraft, "label"> {
  const cleanLabel = label.trim() || "English";

  return {
    catchphrasesText:
      "modo Candy, passinho de English, energia de estudo, uma frase por vez",
    emojisText: "🐱, 🍬, ✨",
    example: `I like ${cleanLabel}.`,
    soundsText: "miauw, plim, pss pss",
    themeId: slugifyThemeLabel(cleanLabel),
    toneRule:
      "Usar como toque leve quando combinar, sem repetir em toda resposta.",
  };
}

function getThemeSuggestion(
  label: string,
  themes: CattyArtifactManagementData["themeOptions"],
) {
  const normalized = normalizeThemeText(label);
  const matchedTheme = themes.find((theme) => {
    const themeText = normalizeThemeText(`${theme.id} ${theme.label}`);

    return (
      themeText.includes(normalized) ||
      normalized.includes(normalizeThemeText(theme.id)) ||
      normalized.includes(normalizeThemeText(theme.label))
    );
  });

  if (!matchedTheme) {
    return buildGenericSuggestion(label);
  }

  return {
    catchphrasesText: listToText(matchedTheme.catchphrases),
    emojisText: listToText(matchedTheme.emojis),
    example: `I like ${matchedTheme.label}.`,
    soundsText: listToText(matchedTheme.sounds),
    themeId: matchedTheme.id,
    toneRule:
      "Usar como toque leve quando combinar, sem repetir em toda resposta.",
  };
}

export function CattyArtifactsPanel({
  data,
  memoryData,
  viewerRole,
}: CattyArtifactsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<ArtifactDraft>(emptyDraft);
  const [statusFilter, setStatusFilter] =
    useState<CattyUserArtifactStatusInput | "ALL">("ACTIVE");
  const [userFilter, setUserFilter] = useState(
    data.users.length === 1 ? data.users[0]?.id ?? "ALL" : "ALL",
  );
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
  const filteredEnrichments = useMemo(
    () =>
      userFilter === "ALL"
        ? data.enrichments
        : data.enrichments.filter(
            (enrichment) => enrichment.targetUserId === userFilter,
          ),
    [data.enrichments, userFilter],
  );
  const selectedUser =
    userFilter === "ALL"
      ? null
      : data.users.find((user) => user.id === userFilter) ?? null;
  const activeUserLabel = selectedUser?.label ?? "Todos os alunos";
  const selectedActiveMemories = useMemo(
    () =>
      userFilter === "ALL" || !memoryData
        ? []
        : memoryData.memories
            .filter(
              (memory) =>
                memory.userId === userFilter && memory.status === "ACTIVE",
            )
            .slice(0, 5),
    [memoryData, userFilter],
  );
  const activeMemoryCount =
    memoryData?.memories.filter((memory) => memory.status === "ACTIVE").length ??
    0;
  const activeArtifactCount = data.artifacts.filter(
    (artifact) => artifact.status === "ACTIVE",
  ).length;
  const readyEnrichmentCount = filteredEnrichments.filter(
    (enrichment) => enrichment.status === "READY_FOR_REVIEW",
  ).length;
  const pendingEnrichmentCount = filteredEnrichments.filter((enrichment) =>
    ["FAILED", "PENDING", "READY_FOR_REVIEW"].includes(enrichment.status),
  ).length;

  function buildInput(formData: FormData): CattyUserArtifactUpsertInput {
    return {
      blockedReason: getText(formData, "blockedReason"),
      catchphrasesText: getText(formData, "catchphrasesText"),
      emojisText: getText(formData, "emojisText"),
      example: getText(formData, "example"),
      isPrimary: getBoolean(formData, "isPrimary"),
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

  function updateDraft(key: keyof ArtifactDraft, value: string) {
    setDraft((current) => {
      if (key === "label") {
        return {
          ...current,
          label: value,
          themeId:
            current.themeId && current.themeId !== slugifyThemeLabel(current.label)
              ? current.themeId
              : slugifyThemeLabel(value),
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function generateDraftSuggestion() {
    const label = draft.label.trim();
    const suggestion = getThemeSuggestion(label, data.themeOptions);

    setDraft({
      ...suggestion,
      label,
    });
  }

  function buildReviewInput(
    formData: FormData,
  ): CattyArtifactEnrichmentReviewInput {
    return {
      ...buildInput(formData),
      enrichmentId: getText(formData, "enrichmentId"),
      status: "ACTIVE",
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
        setDraft(emptyDraft);
      }
    });
  }

  function handleEnrich(form: HTMLFormElement, forceRefresh = false) {
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await enrichCattyArtifactTheme({
        forceRefresh,
        label: getText(formData, "label"),
        targetUserId: getText(formData, "targetUserId"),
        themeId: getText(formData, "themeId"),
      });

      setMessage(result.message);
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
    isPrimary?: boolean,
  ) {
    startTransition(async () => {
      const result = await changeCattyUserArtifactStatus({
        artifactId,
        blockedReason,
        isPrimary,
        status,
      });

      setMessage(result.message);
    });
  }

  function handleApproveEnrichment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await approveCattyArtifactSuggestion(
        buildReviewInput(formData),
      );

      setMessage(result.message);
    });
  }

  function updateEnrichmentStatus(
    enrichmentId: string,
    status: "ARCHIVED" | "REJECTED",
  ) {
    startTransition(async () => {
      const result = await changeCattyArtifactEnrichmentStatus({
        enrichmentId,
        status,
      });

      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.86fr)_minmax(0,1.14fr)]">
      <div className="flex flex-col gap-4">
        <section className="ava-soft-card relative overflow-hidden rounded-2xl border p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/12 via-secondary/55 to-fuchsia-100/70"
          />
          <div className="relative flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Cat aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Catty por aluno
              </span>
              <h2 className="mt-3 text-2xl font-semibold text-primary">
                Catty Learning simples
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Escolha o aluno, escreva o que ele gosta e gere emojis, sons e
                bordoes para a Catty usar de forma leve.
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary/12 bg-white/78 p-4 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <UserRound aria-hidden="true" className="size-4" />
              </span>
              <strong className="mt-3 block text-2xl text-primary">
                {data.users.length}
              </strong>
              <span className="text-xs text-muted-foreground">
                alunos disponiveis
              </span>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white text-emerald-700">
                <Heart aria-hidden="true" className="size-4" />
              </span>
              <strong className="mt-3 block text-2xl text-emerald-800">
                {activeArtifactCount}
              </strong>
              <span className="text-xs text-emerald-800/75">
                gostos ativos
              </span>
            </div>
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/70 p-4 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white text-fuchsia-700">
                <BrainCircuit aria-hidden="true" className="size-4" />
              </span>
              <strong className="mt-3 block text-2xl text-fuchsia-800">
                {activeMemoryCount}
              </strong>
              <span className="text-xs text-fuchsia-800/75">
                memorias ativas
              </span>
            </div>
          </div>

          <div className="relative mt-4 grid gap-2">
            <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 text-muted-foreground shadow-sm">
              <strong className="block text-primary">1. Aluno</strong>
              Escolha para quem a Catty vai personalizar.
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 text-muted-foreground shadow-sm">
              <strong className="block text-primary">2. Gosto</strong>
              Ex.: capivara, carros, games, futebol, princesa.
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 text-muted-foreground shadow-sm">
              <strong className="block text-primary">3. Estilo</strong>
              A Catty gera emojis, sons, bordoes e salva como memoria leve.
            </div>
          </div>
        </section>

        <section className="ava-soft-card rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
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
              <EmptyCard icon={CheckCircle2} title="Tudo leve por aqui">
                Tudo leve por aqui. Sem repeticao excessiva no momento.
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

        <section className="ava-soft-card rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
              <WandSparkles aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">
                {canManage ? "Adicionar gosto do aluno" : "Sugerir gosto"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Simples assim: escolha o aluno, escreva o gosto e clique para
                a Catty sugerir emojis, sons e bordoes.
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
                  onChange={(event) => setUserFilter(event.target.value)}
                >
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserOptionLabel(user)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-artifact-label">
                  O que o aluno gosta?
                </FieldLabel>
                <Input
                  id="catty-artifact-label"
                  name="label"
                  placeholder="Ex.: capivara, carros, games"
                  value={draft.label}
                  disabled={isPending}
                  onChange={(event) => updateDraft("label", event.target.value)}
                />
              </Field>
            </div>

            <input
              type="hidden"
              name="themeId"
              value={draft.themeId || slugifyThemeLabel(draft.label)}
            />
            <input
              type="hidden"
              name="status"
              value={canManage ? "ACTIVE" : "PENDING"}
            />

            <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <RefreshCw aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <strong className="block text-primary">
                    Gerar estilo da Catty
                  </strong>
                  A geracao usa temas seguros ja conhecidos. Se o tema for novo,
                  ela cria um estilo Candy generico e voce pode enriquecer depois.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || draft.label.trim().length < 2}
                className="mt-3 gap-2"
                onClick={generateDraftSuggestion}
              >
                <WandSparkles aria-hidden="true" />
                Gerar emojis, sons e bordoes
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="catty-artifact-emojis">Emojis</FieldLabel>
                <Input
                  id="catty-artifact-emojis"
                  name="emojisText"
                  placeholder="A Catty pode gerar, ex.: 🐱, 🍬, ✨"
                  value={draft.emojisText}
                  disabled={isPending}
                  onChange={(event) =>
                    updateDraft("emojisText", event.target.value)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="catty-artifact-sounds">
                  Sons
                </FieldLabel>
                <Input
                  id="catty-artifact-sounds"
                  name="soundsText"
                  placeholder="miauw, vruum vruum, plim"
                  value={draft.soundsText}
                  disabled={isPending}
                  onChange={(event) =>
                    updateDraft("soundsText", event.target.value)
                  }
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
                value={draft.catchphrasesText}
                disabled={isPending}
                onChange={(event) =>
                  updateDraft("catchphrasesText", event.target.value)
                }
              />
            </Field>

            <div className="grid gap-3">
              <Field>
                <FieldLabel htmlFor="catty-artifact-example">
                  Exemplo curto
                </FieldLabel>
                <Input
                  id="catty-artifact-example"
                  name="example"
                  placeholder="The capybara is drinking water."
                  value={draft.example}
                  disabled={isPending}
                  onChange={(event) => updateDraft("example", event.target.value)}
                />
              </Field>
            </div>

            <details className="rounded-2xl border border-primary/10 bg-white/72 p-3">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                Ajustes avancados
              </summary>
              <div className="mt-3 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="catty-artifact-theme">
                      Chave tecnica
                    </FieldLabel>
                    <Input
                      id="catty-artifact-theme"
                      list="catty-artifact-theme-options"
                      value={draft.themeId || slugifyThemeLabel(draft.label)}
                      disabled={isPending}
                      onChange={(event) =>
                        updateDraft("themeId", event.target.value)
                      }
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
                  <FieldLabel htmlFor="catty-artifact-tone">
                    Regra de tom
                  </FieldLabel>
                  <Textarea
                    id="catty-artifact-tone"
                    name="toneRule"
                    rows={2}
                    placeholder="Usar como toque leve, sem repetir em toda resposta."
                    value={draft.toneRule}
                    disabled={isPending}
                    onChange={(event) =>
                      updateDraft("toneRule", event.target.value)
                    }
                  />
                </Field>
              </div>
            </details>

            {canManage ? (
              <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 text-muted-foreground shadow-sm">
                <input
                  type="checkbox"
                  name="isPrimary"
                  className="mt-1 size-4 accent-primary"
                  disabled={isPending}
                />
                <span>
                  <strong className="block text-foreground">
                    Marcar como gosto principal
                  </strong>
                  A Catty prioriza este tema quando ele combinar naturalmente
                  com a mensagem.
                </span>
              </label>
            ) : null}

            <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <MessageSquareText aria-hidden="true" className="size-4" />
                </span>
                <p>
                  <strong className="block text-primary">
                    Preview de uso
                  </strong>
                  A Catty usa esse tema como toque leve: nome do aluno,
                  bordao curto, emoji e exemplo em English quando combinar.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                {canManage ? "Salvar gosto ativo" : "Enviar sugestao"}
              </Button>

              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  className="gap-2"
                  onClick={(event) => {
                    if (event.currentTarget.form) {
                      handleEnrich(event.currentTarget.form);
                    }
                  }}
                >
                  <Sparkles aria-hidden="true" />
                  Enriquecer tema
                </Button>
              ) : null}
            </div>
          </form>
        </section>

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
              <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-primary">
                <UserRound aria-hidden="true" className="size-4" />
                {activeUserLabel}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="rounded-full border border-primary/10 bg-white/75 px-3 py-1.5">
                {filteredArtifacts.length} tema(s)
              </span>
              <span className="rounded-full border border-primary/10 bg-white/75 px-3 py-1.5">
                {filteredEnrichments.length} sugestoes
              </span>
              {readyEnrichmentCount > 0 ? (
                <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-fuchsia-700">
                  {readyEnrichmentCount} pronta(s)
                </span>
              ) : null}
            </div>
          </div>
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
            <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 shadow-sm">
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

          {userFilter !== "ALL" ? (
            <div className="mt-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-fuchsia-700 shadow-sm">
                  <BrainCircuit aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-primary">
                    Memoria simples da Catty
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Gostos salvos aqui tambem viram memoria leve para a Catty.
                    A tela tecnica fica escondida do aluno.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {selectedActiveMemories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-primary/15 bg-white/70 p-3 text-sm text-muted-foreground">
                    Nenhuma memoria ativa para este aluno ainda.
                  </p>
                ) : (
                  selectedActiveMemories.map((memory) => (
                    <div
                      key={memory.id}
                      className="rounded-xl border border-primary/10 bg-white/78 p-3 text-sm shadow-sm"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {memory.category}
                      </span>
                      <p className="mt-1 font-medium text-primary">
                        {memory.value}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </section>

        {canManage ? (
          <section className="grid gap-3">
            <div className="ava-soft-card rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700 shadow-sm">
                  <Sparkles aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    Sugestoes de busca e enriquecimento
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Status: pendente, sugestao pronta, aprovada, recusada,
                    arquivada ou erro. Nada entra na Catty sem revisao humana.
                  </p>
                  {pendingEnrichmentCount > 0 ? (
                    <p className="mt-2 inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                      {pendingEnrichmentCount} item(ns) pedem atencao
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {filteredEnrichments.length === 0 ? (
              <EmptyCard icon={Sparkles} title="Nenhuma sugestao por aqui">
                Nenhuma sugestao de enriquecimento para estes filtros.
              </EmptyCard>
            ) : (
              filteredEnrichments.map((enrichment) => {
                const canReview = [
                  "FAILED",
                  "PENDING",
                  "READY_FOR_REVIEW",
                ].includes(enrichment.status);
                const defaultTone =
                  enrichment.cautions[0] ||
                  "Usar como toque leve, sem repetir em toda resposta.";

                return (
                  <article
                    key={enrichment.id}
                    className="ava-soft-card overflow-hidden rounded-2xl border p-0"
                  >
                    <div className="border-b border-primary/10 bg-white/62 px-5 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                              enrichmentStatusStyles[enrichment.status],
                            )}
                          >
                            {enrichmentStatusLabels[enrichment.status]}
                          </span>
                          <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                            {enrichment.themeId}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {enrichment.provider}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">
                          {enrichment.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {enrichment.targetUserName ?? "Aluno nao informado"}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground md:text-right">
                        <span>Criado: {formatDateTime(enrichment.createdAt)}</span>
                        <span>
                          Atualizado: {formatDateTime(enrichment.updatedAt)}
                        </span>
                        {enrichment.cacheId ? <span>cache ativo</span> : null}
                        {enrichment.reviewedByName ? (
                          <span>Revisado por: {enrichment.reviewedByName}</span>
                        ) : null}
                        {enrichment.reviewedAt ? (
                          <span>
                            Revisado: {formatDateTime(enrichment.reviewedAt)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    </div>

                    <div className="p-5">

                    {enrichment.safeSummary ? (
                      <p className="rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 text-muted-foreground shadow-sm">
                        {enrichment.safeSummary}
                      </p>
                    ) : null}

                    {enrichment.failureReason ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 shadow-sm">
                        {enrichment.failureReason}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Emojis
                        </p>
                        <p className="mt-2 text-lg">
                          {enrichment.suggestedEmojis.join(" ") ||
                            "Sem emojis"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Sons
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          {enrichment.suggestedSounds.join(", ") ||
                            "Sem sons"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Bordoes
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          {enrichment.suggestedCatchphrases.join(", ") ||
                            "Sem bordoes"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border bg-white/75 p-3 text-sm leading-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Exemplos
                        </p>
                        <p className="mt-2 text-muted-foreground">
                          {enrichment.suggestedExamples.join(" | ") ||
                            "Sem exemplos"}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-white/75 p-3 text-sm leading-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Cuidados
                        </p>
                        <p className="mt-2 text-muted-foreground">
                          {enrichment.cautions.join(" | ") ||
                            "Sem cuidados extras"}
                        </p>
                      </div>
                    </div>

                    {enrichment.suggestedVocabulary.length > 0 ? (
                      <div className="mt-3 rounded-lg border bg-white/75 p-3 text-sm leading-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Vocabulario sugerido
                        </p>
                        <div className="mt-2 grid gap-2">
                          {enrichment.suggestedVocabulary.map((item) => (
                            <p key={`${enrichment.id}-${item.word}`}>
                              <strong>{item.word}</strong>: {item.meaning}
                              {item.example ? ` - ${item.example}` : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {enrichment.sources.length > 0 ? (
                      <details className="mt-3 rounded-lg border bg-primary/[0.03] p-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                          Fontes da busca
                        </summary>
                        <div className="mt-3 grid gap-2">
                          {enrichment.sources.map((source) => (
                            <a
                              key={`${enrichment.id}-${source.url}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border bg-white/80 p-3 text-sm leading-6 transition hover:border-primary/30"
                            >
                              <strong className="block text-foreground">
                                {source.title || source.url}
                              </strong>
                              {source.snippet ? (
                                <span className="text-muted-foreground">
                                  {source.snippet}
                                </span>
                              ) : null}
                            </a>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    {canReview ? (
                      <details className="mt-4 rounded-lg border bg-fuchsia-50/40 p-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                          Aprovar editando
                        </summary>
                        <form
                          onSubmit={handleApproveEnrichment}
                          className="mt-4 grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="enrichmentId"
                            value={enrichment.id}
                          />
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={enrichment.targetUserId ?? ""}
                          />
                          <input
                            type="hidden"
                            name="themeId"
                            value={enrichment.themeId}
                          />
                          <input type="hidden" name="status" value="ACTIVE" />

                          <div className="grid gap-3 md:grid-cols-2">
                            <Field>
                              <FieldLabel
                                htmlFor={`enrichment-label-${enrichment.id}`}
                              >
                                Nome
                              </FieldLabel>
                              <Input
                                id={`enrichment-label-${enrichment.id}`}
                                name="label"
                                defaultValue={enrichment.label}
                                disabled={isPending}
                              />
                            </Field>
                            <Field>
                              <FieldLabel
                                htmlFor={`enrichment-emojis-${enrichment.id}`}
                              >
                                Emojis
                              </FieldLabel>
                              <Input
                                id={`enrichment-emojis-${enrichment.id}`}
                                name="emojisText"
                                defaultValue={listToText(
                                  enrichment.suggestedEmojis,
                                )}
                                disabled={isPending}
                              />
                            </Field>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <Field>
                              <FieldLabel
                                htmlFor={`enrichment-sounds-${enrichment.id}`}
                              >
                                Sons
                              </FieldLabel>
                              <Input
                                id={`enrichment-sounds-${enrichment.id}`}
                                name="soundsText"
                                defaultValue={listToText(
                                  enrichment.suggestedSounds,
                                )}
                                disabled={isPending}
                              />
                            </Field>
                            <Field>
                              <FieldLabel
                                htmlFor={`enrichment-example-${enrichment.id}`}
                              >
                                Exemplo curto
                              </FieldLabel>
                              <Input
                                id={`enrichment-example-${enrichment.id}`}
                                name="example"
                                defaultValue={
                                  enrichment.suggestedExamples[0] ?? ""
                                }
                                disabled={isPending}
                              />
                            </Field>
                          </div>

                          <Field>
                            <FieldLabel
                              htmlFor={`enrichment-catchphrases-${enrichment.id}`}
                            >
                              Bordoes
                            </FieldLabel>
                            <Textarea
                              id={`enrichment-catchphrases-${enrichment.id}`}
                              name="catchphrasesText"
                              defaultValue={listToText(
                                enrichment.suggestedCatchphrases,
                              )}
                              rows={2}
                              disabled={isPending}
                            />
                          </Field>

                          <Field>
                            <FieldLabel
                              htmlFor={`enrichment-tone-${enrichment.id}`}
                            >
                              Regra de tom
                            </FieldLabel>
                            <Textarea
                              id={`enrichment-tone-${enrichment.id}`}
                              name="toneRule"
                              defaultValue={defaultTone}
                              rows={2}
                              disabled={isPending}
                            />
                          </Field>

                          <label className="flex items-start gap-3 rounded-lg border bg-white/75 p-3 text-sm leading-6 text-muted-foreground">
                            <input
                              type="checkbox"
                              name="isPrimary"
                              className="mt-1 size-4 accent-primary"
                              disabled={isPending}
                            />
                            <span>
                              <strong className="block text-foreground">
                                Aprovar como gosto principal
                              </strong>
                              Use se este for o tema que a Catty deve priorizar
                              para esse aluno.
                            </span>
                          </label>

                          <input type="hidden" name="blockedReason" value="" />

                          <Button
                            type="submit"
                            variant="outline"
                            disabled={isPending}
                            className="w-fit"
                          >
                            <CheckCircle2 aria-hidden="true" />
                            Aprovar e ativar
                          </Button>
                        </form>
                      </details>
                    ) : null}

                    {canReview ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            updateEnrichmentStatus(enrichment.id, "REJECTED")
                          }
                        >
                          <Ban aria-hidden="true" />
                          Recusar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            updateEnrichmentStatus(enrichment.id, "ARCHIVED")
                          }
                        >
                          <Archive aria-hidden="true" />
                          Arquivar
                        </Button>
                      </div>
                    ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        ) : null}

        <section className="grid gap-3">
          {filteredArtifacts.length === 0 ? (
            <EmptyCard icon={Palette} title="Nenhum tema encontrado">
              Nenhum tema encontrado para estes filtros.
            </EmptyCard>
          ) : (
            filteredArtifacts.map((artifact) => (
              <article
                key={artifact.id}
                className="ava-soft-card overflow-hidden rounded-2xl border p-0"
              >
                <div className="border-b border-primary/10 bg-white/62 px-5 py-4">
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
                      {artifact.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <Star className="size-3.5" aria-hidden="true" />
                          Principal
                        </span>
                      ) : null}
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
                    <span className="inline-flex items-center justify-start gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1 md:justify-end">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      Usado {artifact.usageCount} vez(es)
                    </span>
                    <span>Ultimo uso: {formatDateTime(artifact.lastUsedAt)}</span>
                    <span>Atualizado: {formatDateTime(artifact.updatedAt)}</span>
                  </div>
                </div>
                </div>

                <div className="p-5">
                <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 text-sm leading-6 text-muted-foreground shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                      <MessageSquareText aria-hidden="true" className="size-4" />
                    </span>
                    <p>
                      <strong className="block text-primary">
                        Preview Candy
                      </strong>
                      Miauw, {artifact.userName.split(" ")[0]}{" "}
                      {artifact.emojis[0] ?? "✨"}{" "}
                      {artifact.catchphrases[0] ??
                        "uma frase por vez ja conta."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Emojis
                    </p>
                    <p className="mt-2 text-lg">
                      {artifact.emojis.join(" ") || "Sem emojis"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Sons
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {artifact.sounds.join(", ") || "Sem sons"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-white/78 p-3 shadow-sm">
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
                      <p className="rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 shadow-sm">
                        <strong>Exemplo:</strong> {artifact.example}
                      </p>
                    ) : null}
                    {artifact.toneRule ? (
                      <p className="rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 shadow-sm">
                        <strong>Tom:</strong> {artifact.toneRule}
                      </p>
                    ) : null}
                    {artifact.blockedReason ? (
                      <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700 shadow-sm">
                        <strong>Motivo:</strong> {artifact.blockedReason}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {canManage ? (
                  <details className="mt-4 rounded-2xl border border-primary/10 bg-primary/[0.03] p-3">
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

                      <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-white/78 p-3 text-sm leading-6 text-muted-foreground">
                        <input
                          type="checkbox"
                          name="isPrimary"
                          defaultChecked={artifact.isPrimary}
                          className="mt-1 size-4 accent-primary"
                          disabled={isPending || artifact.status !== "ACTIVE"}
                        />
                        <span>
                          <strong className="block text-foreground">
                            Gosto principal
                          </strong>
                          Use para priorizar este artefato quando houver mais
                          de um tema ativo do aluno.
                        </span>
                      </label>

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
                        disabled={
                          isPending ||
                          artifact.status !== "ACTIVE" ||
                          artifact.isPrimary
                        }
                        onClick={() =>
                          updateStatus(artifact.id, "ACTIVE", undefined, true)
                        }
                      >
                        <Star aria-hidden="true" />
                        Principal
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
                </div>
              </article>
            ))
          )}
        </section>

        <section className="ava-soft-card rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
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
              <EmptyCard icon={Clock3} title="Sem uso recente">
                Ainda nao encontrei uso recente destes temas.
              </EmptyCard>
            ) : (
              filteredRecentUsages.map((usage) => (
                <div
                  key={usage.id}
                  className="rounded-2xl border border-primary/10 bg-white/82 p-3 text-sm shadow-sm"
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
