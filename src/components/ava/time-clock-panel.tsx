"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  LogIn,
  LogOut,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  correctTimeClockEntry,
  createManualTimeClockEntry,
  createTimeClockProfile,
  registerTimeClockPunch,
  updateTimeClockProfileStatus,
} from "@/app/ava/ponto/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  formatSaoPauloDateTimeInput,
  formatWorkedDuration,
  parseSaoPauloDateTimeInput,
  TIME_CLOCK_TIME_ZONE,
  type TimeClockEntryTypeValue,
} from "@/lib/time-clock-domain";
import {
  timeClockEntryCorrectionSchema,
  timeClockManualEntrySchema,
  timeClockProfileCreateSchema,
  timeClockPunchSchema,
  type TimeClockEntryCorrectionInput,
  type TimeClockManualEntryInput,
  type TimeClockProfileCreateInput,
  type TimeClockPunchInput,
} from "@/lib/validations/time-clock";

type TimeClockEntryView = {
  correctedAt: string | null;
  correctedByName: string | null;
  id: string;
  justification: string | null;
  occurredAt: string;
  recordedByName: string;
  revisionCount: number;
  source: "SELF" | "ADMIN";
  type: TimeClockEntryTypeValue;
  updatedAt: string;
};

type TimeClockProfileView = {
  id: string;
  isActive: boolean;
  updatedAt: string;
  user: {
    email: string;
    id: string;
    name: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
  };
};

type TimeClockPanelProps = {
  actor: {
    canPunch: boolean;
    isAdmin: boolean;
    name: string;
    nextType: TimeClockEntryTypeValue;
    ownProfileId: string | null;
  };
  availableUsers: TimeClockProfileView["user"][];
  entries: TimeClockEntryView[];
  period: { month: number; year: number };
  profiles: TimeClockProfileView[];
  selectedProfileId: string | null;
  summary: {
    completedPairs: number;
    inconsistentEntries: number;
    openEntryAt: string | null;
    workedMilliseconds: number;
  };
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: TIME_CLOCK_TIME_ZONE,
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function getNewOperationId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function entryTypeLabel(type: TimeClockEntryTypeValue) {
  return type === "ENTRY" ? "Entrada" : "Saida";
}

function ActionNotice({
  message,
  ok,
}: {
  message: string | null;
  ok: boolean;
}) {
  if (!message) return null;

  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      {message}
    </p>
  );
}

function PunchForm({ nextType }: { nextType: TimeClockEntryTypeValue }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState({ message: null as string | null, ok: false });
  const form = useForm<TimeClockPunchInput>({
    defaultValues: {
      justification: "",
      operationId: getNewOperationId(),
      type: nextType,
    },
    resolver: zodResolver(timeClockPunchSchema, undefined, { raw: true }),
  });

  const submit = form.handleSubmit(async (values) => {
    const result = await registerTimeClockPunch({ ...values, type: nextType });
    setFeedback({ message: result.message, ok: result.ok });

    if (result.ok) {
      form.reset({
        justification: "",
        operationId: getNewOperationId(),
        type: nextType === "ENTRY" ? "EXIT" : "ENTRY",
      });
      router.refresh();
    }
  });
  const Icon = nextType === "ENTRY" ? LogIn : LogOut;

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
      <div className="grid gap-2">
        <Label htmlFor="punch-justification">Justificativa (opcional)</Label>
        <Input
          id="punch-justification"
          placeholder="Ex.: retorno de atendimento externo"
          {...form.register("justification")}
        />
        {form.formState.errors.justification ? (
          <p className="text-xs font-semibold text-red-700">
            {form.formState.errors.justification.message}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className={`h-14 text-base font-extrabold ${
          nextType === "ENTRY"
            ? "bg-emerald-700 hover:bg-emerald-800"
            : "bg-rose-700 hover:bg-rose-800"
        }`}
      >
        {form.formState.isSubmitting ? (
          <RefreshCw aria-hidden="true" className="size-5 animate-spin" />
        ) : (
          <Icon aria-hidden="true" className="size-5" />
        )}
        Registrar {entryTypeLabel(nextType)}
      </Button>
      <div className="lg:col-span-2">
        <ActionNotice {...feedback} />
      </div>
    </form>
  );
}

function AddPersonForm({
  availableUsers,
}: {
  availableUsers: TimeClockPanelProps["availableUsers"];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState({ message: null as string | null, ok: false });
  const form = useForm<TimeClockProfileCreateInput>({
    defaultValues: { userId: "" },
    resolver: zodResolver(timeClockProfileCreateSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    const result = await createTimeClockProfile(values);
    setFeedback({ message: result.message, ok: result.ok });
    if (result.ok) {
      form.reset();
      router.refresh();
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="time-clock-user">Usuario da equipe</Label>
        <NativeSelect id="time-clock-user" {...form.register("userId")}>
          <option value="">Selecione uma pessoa</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} - {user.role === "ADMIN" ? "Admin" : "Teacher"}
            </option>
          ))}
        </NativeSelect>
        {form.formState.errors.userId ? (
          <p className="text-xs font-semibold text-red-700">
            {form.formState.errors.userId.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting || availableUsers.length === 0}>
        <UserPlus aria-hidden="true" />
        Adicionar pessoa
      </Button>
      <div className="sm:col-span-2">
        <ActionNotice {...feedback} />
      </div>
    </form>
  );
}

function ProfileStatusButton({ profile }: { profile: TimeClockProfileView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function toggleStatus() {
    setPending(true);
    const result = await updateTimeClockProfileStatus({
      isActive: !profile.isActive,
      profileId: profile.id,
    });
    setFeedback(result.message);
    setPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={profile.isActive ? "outline" : "default"}
        disabled={pending}
        onClick={toggleStatus}
      >
        {profile.isActive ? "Desativar" : "Reativar"}
      </Button>
      {feedback ? <span className="max-w-48 text-right text-xs text-muted-foreground">{feedback}</span> : null}
    </div>
  );
}

function ManualEntryForm({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState({ message: null as string | null, ok: false });
  const form = useForm<TimeClockManualEntryInput>({
    defaultValues: {
      justification: "",
      occurredAt: new Date().toISOString(),
      profileId,
      type: "ENTRY",
    },
    resolver: zodResolver(timeClockManualEntrySchema, undefined, { raw: true }),
  });
  const [localDateTime, setLocalDateTime] = useState(() =>
    formatSaoPauloDateTimeInput(new Date()),
  );

  const submit = form.handleSubmit(async (values) => {
    const occurredAt = parseSaoPauloDateTimeInput(localDateTime);
    if (!occurredAt) {
      setFeedback({ message: "Informe uma data e hora validas.", ok: false });
      return;
    }

    const result = await createManualTimeClockEntry({
      ...values,
      occurredAt: occurredAt.toISOString(),
      profileId,
    });
    setFeedback({ message: result.message, ok: result.ok });
    if (result.ok) router.refresh();
  });

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[10rem_13rem_minmax(0,1fr)_auto] xl:items-end">
      <div className="grid gap-2">
        <Label htmlFor="manual-type">Tipo</Label>
        <NativeSelect id="manual-type" {...form.register("type")}>
          <option value="ENTRY">Entrada</option>
          <option value="EXIT">Saida</option>
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="manual-occurred-at">Data e hora</Label>
        <Input
          id="manual-occurred-at"
          type="datetime-local"
          value={localDateTime}
          onChange={(event) => setLocalDateTime(event.target.value)}
        />
      </div>
      <div className="grid gap-2 md:col-span-2 xl:col-span-1">
        <Label htmlFor="manual-justification">Justificativa</Label>
        <Input
          id="manual-justification"
          placeholder="Ex.: esquecimento informado"
          {...form.register("justification")}
        />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        <Plus aria-hidden="true" />
        Adicionar batida
      </Button>
      <div className="md:col-span-2 xl:col-span-4">
        <ActionNotice {...feedback} />
      </div>
    </form>
  );
}

function EditEntryForm({ entry }: { entry: TimeClockEntryView }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState({ message: null as string | null, ok: false });
  const [localDateTime, setLocalDateTime] = useState(() =>
    formatSaoPauloDateTimeInput(new Date(entry.occurredAt)),
  );
  const form = useForm<TimeClockEntryCorrectionInput>({
    defaultValues: {
      correctionReason: "",
      entryId: entry.id,
      expectedUpdatedAt: entry.updatedAt,
      justification: entry.justification ?? "",
      occurredAt: entry.occurredAt,
      type: entry.type,
    },
    resolver: zodResolver(timeClockEntryCorrectionSchema, undefined, { raw: true }),
  });

  const submit = form.handleSubmit(async (values) => {
    const occurredAt = parseSaoPauloDateTimeInput(localDateTime);
    if (!occurredAt) {
      setFeedback({ message: "Informe uma data e hora validas.", ok: false });
      return;
    }

    const result = await correctTimeClockEntry({
      ...values,
      occurredAt: occurredAt.toISOString(),
    });
    setFeedback({ message: result.message, ok: result.ok });
    if (result.ok) router.refresh();
  });

  return (
    <form onSubmit={submit} className="grid gap-3 border-t border-primary/10 pt-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`edit-type-${entry.id}`}>Tipo</Label>
        <NativeSelect id={`edit-type-${entry.id}`} {...form.register("type")}>
          <option value="ENTRY">Entrada</option>
          <option value="EXIT">Saida</option>
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`edit-time-${entry.id}`}>Data e hora</Label>
        <Input
          id={`edit-time-${entry.id}`}
          type="datetime-local"
          value={localDateTime}
          onChange={(event) => setLocalDateTime(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`edit-note-${entry.id}`}>Justificativa da batida</Label>
        <Input id={`edit-note-${entry.id}`} {...form.register("justification")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`edit-reason-${entry.id}`}>Motivo da correcao</Label>
        <Input
          id={`edit-reason-${entry.id}`}
          placeholder="Obrigatorio para auditoria"
          {...form.register("correctionReason")}
        />
        {form.formState.errors.correctionReason ? (
          <p className="text-xs font-semibold text-red-700">
            {form.formState.errors.correctionReason.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          <PencilLine aria-hidden="true" />
          Salvar correcao
        </Button>
        <span className="text-xs text-muted-foreground">
          A versao anterior sera preservada.
        </span>
      </div>
      <div className="md:col-span-2">
        <ActionNotice {...feedback} />
      </div>
    </form>
  );
}

export function TimeClockPanel({
  actor,
  availableUsers,
  entries,
  period,
  profiles,
  selectedProfileId,
  summary,
}: TimeClockPanelProps) {
  const [view, setView] = useState<"records" | "people">("records");
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const periodLabel = monthFormatter.format(
    new Date(Date.UTC(period.year, period.month - 1, 1)),
  );
  const reportHref = selectedProfile
    ? `/ava/ponto/relatorio?profileId=${encodeURIComponent(selectedProfile.id)}&year=${period.year}&month=${period.month}`
    : null;

  return (
    <main className="min-h-screen bg-[#fffafe] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-primary/15 pb-5 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary/60">
              <FileClock aria-hidden="true" className="size-4" />
              Controle interno
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-primary">
              Ponto
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Entradas, saidas, intervalos e espelho mensal da equipe.
            </p>
          </div>
          {actor.isAdmin ? (
            <div className="inline-flex w-full rounded-lg border border-primary/15 bg-white p-1 shadow-sm md:w-auto">
              <Button
                type="button"
                variant={view === "records" ? "default" : "ghost"}
                onClick={() => setView("records")}
                className="flex-1 md:flex-none"
              >
                <Clock3 aria-hidden="true" />
                Registros
              </Button>
              <Button
                type="button"
                variant={view === "people" ? "default" : "ghost"}
                onClick={() => setView("people")}
                className="flex-1 md:flex-none"
              >
                <UsersRound aria-hidden="true" />
                Pessoas
              </Button>
            </div>
          ) : null}
        </header>

        {actor.canPunch ? (
          <section className="border-y border-emerald-200 bg-emerald-50/70 px-4 py-5 sm:px-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-emerald-950">Meu ponto</h2>
                <p className="text-sm text-emerald-900/70">{actor.name}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Proxima: {entryTypeLabel(actor.nextType)}
              </span>
            </div>
            <PunchForm nextType={actor.nextType} />
          </section>
        ) : actor.isAdmin ? (
          <section className="border-y border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            Habilite seu usuario em Pessoas para tambem registrar o proprio ponto.
          </section>
        ) : null}

        {actor.isAdmin && view === "people" ? (
          <section className="grid gap-6">
            <div className="border-b border-primary/12 pb-5">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
                <UserPlus aria-hidden="true" className="size-5" />
                Adicionar pessoa
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Habilite um Admin ou Teacher que ja possui login no AVA.
              </p>
              <div className="mt-4">
                <AddPersonForm availableUsers={availableUsers} />
              </div>
            </div>
            <div className="grid gap-3">
              <h2 className="text-xl font-extrabold text-primary">Equipe no ponto</h2>
              {profiles.length === 0 ? (
                <p className="rounded-lg border border-dashed border-primary/20 bg-white p-6 text-sm text-muted-foreground">
                  Nenhuma pessoa foi habilitada ainda.
                </p>
              ) : (
                <div className="divide-y divide-primary/10 rounded-lg border border-primary/15 bg-white">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-primary">{profile.user.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{profile.user.email}</p>
                        <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-bold ${profile.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>
                          {profile.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <ProfileStatusButton profile={profile} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 border-b border-primary/12 pb-5">
              <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(13rem,1fr)_9rem_9rem_auto_auto] lg:items-end">
                {actor.isAdmin ? (
                  <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="profile-filter">Pessoa</Label>
                    <NativeSelect id="profile-filter" name="profileId" defaultValue={selectedProfileId ?? ""}>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.user.name}{profile.isActive ? "" : " (inativo)"}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : (
                  <input type="hidden" name="profileId" value={selectedProfileId ?? ""} />
                )}
                <div className="grid gap-2">
                  <Label htmlFor="month-filter">Mes</Label>
                  <NativeSelect id="month-filter" name="month" defaultValue={String(period.month)}>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                      <option key={month} value={month}>{String(month).padStart(2, "0")}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year-filter">Ano</Label>
                  <Input id="year-filter" name="year" type="number" min={2020} max={2200} defaultValue={period.year} />
                </div>
                <Button type="submit" variant="outline">
                  <CalendarDays aria-hidden="true" />
                  Consultar
                </Button>
                {reportHref ? (
                  <Button asChild>
                    <Link href={reportHref} prefetch={false}>
                      <Download aria-hidden="true" />
                      Baixar PDF
                    </Link>
                  </Button>
                ) : null}
              </form>
            </section>

            {selectedProfile ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-primary/12 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Pessoa</p>
                    <p className="mt-2 truncate text-lg font-extrabold text-primary">{selectedProfile.user.name}</p>
                  </div>
                  <div className="rounded-lg border border-primary/12 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Periodo</p>
                    <p className="mt-2 text-lg font-extrabold capitalize text-primary">{periodLabel}</p>
                  </div>
                  <div className="rounded-lg border border-primary/12 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Horas concluidas</p>
                    <p className="mt-2 text-lg font-extrabold text-primary">{formatWorkedDuration(summary.workedMilliseconds)}</p>
                  </div>
                  <div className="rounded-lg border border-primary/12 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Batidas</p>
                    <p className="mt-2 text-lg font-extrabold text-primary">{entries.length}</p>
                  </div>
                </section>

                {summary.openEntryAt || summary.inconsistentEntries > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    {summary.openEntryAt ? `Ha uma entrada aberta desde ${formatDateTime(summary.openEntryAt)}. ` : ""}
                    {summary.inconsistentEntries > 0 ? `${summary.inconsistentEntries} batida(s) precisam de revisao de sequencia.` : ""}
                  </div>
                ) : null}

                {actor.isAdmin ? (
                  <section className="border-y border-primary/12 bg-white px-4 py-5">
                    <h2 className="text-lg font-extrabold text-primary">Adicionar batida manual</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Use para corrigir um esquecimento informado pela pessoa.</p>
                    <div className="mt-4"><ManualEntryForm profileId={selectedProfile.id} /></div>
                  </section>
                ) : null}

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold text-primary">Batidas do mes</h2>
                    <span className="text-xs font-semibold text-muted-foreground">{summary.completedPairs} periodo(s) concluido(s)</span>
                  </div>
                  {entries.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-primary/20 bg-white p-8 text-center text-sm text-muted-foreground">Nenhuma batida neste mes.</p>
                  ) : (
                    <div className="grid gap-3">
                      {entries.map((entry) => (
                        <article key={entry.id} className="rounded-lg border border-primary/12 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${entry.type === "ENTRY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                {entry.type === "ENTRY" ? <LogIn aria-hidden="true" className="size-5" /> : <LogOut aria-hidden="true" className="size-5" />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-extrabold text-primary">{entryTypeLabel(entry.type)} - {formatDateTime(entry.occurredAt)}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{entry.justification || "Sem justificativa"}</p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {entry.source === "SELF" ? "Registrado pela pessoa" : `Incluido pelo Admin: ${entry.recordedByName}`}
                                  {entry.correctedAt ? ` | Corrigido por ${entry.correctedByName ?? "Admin"}` : ""}
                                  {entry.revisionCount > 0 ? ` | ${entry.revisionCount} revisao(oes)` : ""}
                                </p>
                              </div>
                            </div>
                            {actor.isAdmin ? (
                              <details className="group w-full rounded-lg border border-primary/10 bg-[#fffafe] px-3 py-2 sm:w-auto sm:min-w-44">
                                <summary className="flex cursor-pointer list-none items-center justify-center gap-2 text-sm font-bold text-primary">
                                  <PencilLine aria-hidden="true" className="size-4" />
                                  Corrigir
                                </summary>
                                <div className="mt-3 w-full sm:w-[34rem] sm:max-w-[70vw]">
                                  <EditEntryForm entry={entry} />
                                </div>
                              </details>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="rounded-lg border border-dashed border-primary/20 bg-white p-10 text-center">
                <ShieldCheck aria-hidden="true" className="mx-auto size-8 text-primary/55" />
                <h2 className="mt-3 text-lg font-extrabold text-primary">Nenhuma pessoa no ponto</h2>
                <p className="mt-1 text-sm text-muted-foreground">Abra Pessoas e habilite o primeiro usuario da equipe.</p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
