"use client";

import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  acceptStudentPreRegistration,
  updateStudentPreRegistrationStatus,
} from "@/app/ava/pre-registrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PreRegistrationStatus =
  | "PENDING"
  | "CONTACTED"
  | "APPROVED"
  | "REJECTED";

export type StudentPreRegistrationReviewRow = {
  address: string | null;
  birthDate: string | null;
  convertedUserEmail: string | null;
  convertedUserName: string | null;
  createdAt: string;
  email: string;
  englishGoal: string;
  fullName: string;
  guardianDocument: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  id: string;
  notes: string | null;
  phone: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  secondaryContact: string | null;
  status: PreRegistrationStatus;
  statusNote: string | null;
  studentPhone: string | null;
};

type StudentPreRegistrationReviewPanelProps = {
  activeStatus: PreRegistrationStatus;
  basePath: "/ava/admin" | "/ava/teacher";
  requests: StudentPreRegistrationReviewRow[];
  statusCounts: Record<PreRegistrationStatus, number>;
  viewerRole: "ADMIN" | "TEACHER";
};

const statusMeta = {
  APPROVED: {
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    emptyDescription:
      "Quando uma solicitacao for aceita, o aluno convertido aparece aqui para auditoria rapida.",
    emptyTitle: "Nenhum aluno convertido nesse filtro.",
    icon: CheckCircle2,
    label: "Convertido em aluno",
    summaryLabel: "Convertidos",
  },
  CONTACTED: {
    accentClassName: "border-amber-200 bg-amber-50 text-amber-800",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    emptyDescription:
      "Use esse status para alunos que ja tiveram contato da equipe e ainda nao viraram STUDENT.",
    emptyTitle: "Nenhuma solicitacao em analise.",
    icon: Clock3,
    label: "Em analise",
    summaryLabel: "Em analise",
  },
  PENDING: {
    accentClassName: "border-primary/20 bg-primary/10 text-primary",
    className: "border-primary/20 bg-primary/10 text-primary",
    emptyDescription:
      "Novos pedidos feitos pelo login entram aqui antes da revisao da equipe Candy.",
    emptyTitle: "Nenhuma solicitacao pendente.",
    icon: UserRound,
    label: "Pendente",
    summaryLabel: "Pendentes",
  },
  REJECTED: {
    accentClassName: "border-rose-200 bg-rose-50 text-rose-800",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    emptyDescription:
      "Solicitacoes recusadas ficam separadas para consulta sem misturar com a fila ativa.",
    emptyTitle: "Nenhuma solicitacao recusada nesse filtro.",
    icon: XCircle,
    label: "Recusado",
    summaryLabel: "Recusados",
  },
} satisfies Record<
  PreRegistrationStatus,
  {
    accentClassName: string;
    className: string;
    emptyDescription: string;
    emptyTitle: string;
    icon: typeof UserRound;
    label: string;
    summaryLabel: string;
  }
>;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateFormatter.format(date);
}

function DetailItem({
  icon: Icon,
  label,
  wide,
  value,
}: {
  icon?: typeof UserRound;
  label: string;
  wide?: boolean;
  value: React.ReactNode;
}) {
  if (!value) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/10 bg-white/78 p-3 shadow-sm shadow-primary/5",
        wide && "md:col-span-2",
      )}
    >
      <dt className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/55">
        {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
        <span>{label}</span>
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground/85">{value}</dd>
    </div>
  );
}

function SummaryMetric({
  status,
  value,
}: {
  status: PreRegistrationStatus;
  value: number;
}) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <div className="rounded-lg border border-primary/10 bg-white/82 p-3 shadow-sm shadow-primary/5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border",
            meta.accentClassName,
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <strong className="text-2xl font-semibold leading-none text-primary">
          {value}
        </strong>
      </div>
      <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {meta.summaryLabel}
      </p>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-primary/10 bg-white/82 px-3 py-2 shadow-sm shadow-primary/5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground/85">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PreRegistrationStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
        meta.className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {meta.label}
    </span>
  );
}

function ReviewButton({
  requestId,
  status,
}: {
  requestId: string;
  status: "CONTACTED";
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await updateStudentPreRegistrationStatus({
        requestId,
        status,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Clock3 data-icon="inline-start" />
        )}
        Em analise
      </Button>
      {message ? (
        <p className="text-xs leading-5 text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

function RejectForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await updateStudentPreRegistrationStatus({
        requestId,
        status: "REJECTED",
        statusNote: note,
      });

      setMessage(result.message);

      if (result.ok) {
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        disabled={isPending}
        placeholder="Observacao opcional para controle interno"
        className="min-h-24 resize-y text-sm"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="w-full justify-start border-rose-200 bg-rose-50/75 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
        disabled={isPending}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <XCircle data-icon="inline-start" />
        )}
        Recusar
      </Button>
      {message ? (
        <p className="text-xs leading-5 text-muted-foreground">{message}</p>
      ) : null}
    </form>
  );
}

function AcceptForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [cattyContext, setCattyContext] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [cattyContextError, setCattyContextError] = useState<string | null>(
    null,
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setCattyContextError(null);
    setPasswordError(null);

    startTransition(async () => {
      const result = await acceptStudentPreRegistration({
        cattyContext,
        initialPassword,
        requestId,
      });

      if (!result.ok) {
        setCattyContextError(result.errors?.cattyContext ?? null);
        setPasswordError(result.errors?.initialPassword ?? null);
        setMessage(result.message);
        return;
      }

      setCattyContext("");
      setInitialPassword("");
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <Input
            type="password"
            autoComplete="new-password"
            disabled={isPending}
            aria-invalid={Boolean(passwordError)}
            placeholder="Senha inicial do aluno"
            value={initialPassword}
            onChange={(event) => setInitialPassword(event.target.value)}
            className="bg-white"
          />
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Envie a senha por um canal seguro. Ela nao aparece em logs.
          </p>
          {passwordError ? (
            <p className="mt-1 text-xs font-medium text-destructive">
              {passwordError}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          className="h-11 w-full md:w-auto md:min-w-40"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <UserCheck data-icon="inline-start" />
          )}
          Aceitar aluno
        </Button>
      </div>
      <details className="rounded-lg border border-primary/15 bg-primary/[0.03] p-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-primary [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 font-semibold">
            <BrainCircuit aria-hidden="true" className="size-4" />
            Contexto Catty
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/70">
            opcional
          </span>
        </summary>
        <div className="mt-3">
          <Textarea
            value={cattyContext}
            onChange={(event) => setCattyContext(event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(cattyContextError)}
            placeholder="Ex: gosta de exemplos com jogos; trava em do/does; prefere explicacao curta."
            className="min-h-24 resize-y bg-white text-sm"
          />
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Memoria pedagogica leve para a Catty usar depois. Nao inclua dados
            sensiveis.
          </p>
          {cattyContextError ? (
            <p className="mt-1 text-xs font-medium text-destructive">
              {cattyContextError}
            </p>
          ) : null}
        </div>
      </details>
      {message ? (
        <p
          className="rounded-lg border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function StudentPreRegistrationReviewPanel({
  activeStatus,
  basePath,
  requests,
  statusCounts,
  viewerRole,
}: StudentPreRegistrationReviewPanelProps) {
  const statusOptions = useMemo(
    () =>
      viewerRole === "ADMIN"
        ? (["PENDING", "CONTACTED", "APPROVED", "REJECTED"] as const)
        : (["PENDING", "CONTACTED"] as const),
    [viewerRole],
  );
  const activeMeta = statusMeta[activeStatus];
  const ActiveIcon = activeMeta.icon;
  const visibleRequestsLabel =
    requests.length === 1
      ? "1 solicitacao neste filtro"
      : `${requests.length} solicitacoes neste filtro`;
  const reviewSteps = [
    {
      icon: ClipboardCheck,
      label: "Revisar dados",
    },
    {
      icon: MessageSquareText,
      label: "Registrar contato",
    },
    {
      icon: UserPlus,
      label: "Criar STUDENT",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="ava-soft-card overflow-hidden rounded-2xl border p-0">
        <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,239,255,0.82))] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex max-w-2xl gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white/78 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  Aceitar alunos
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal text-primary">
                  Pre-cadastros recebidos
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Revise os dados enviados no login, acompanhe o contato e crie
                  a conta STUDENT somente quando o acesso estiver liberado.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[24rem]">
              {statusOptions.map((status) => (
                <SummaryMetric
                  key={status}
                  status={status}
                  value={statusCounts[status]}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-3">
            {reviewSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-lg border border-primary/10 bg-white/72 px-3 py-2 text-sm font-medium text-primary/80 shadow-sm shadow-primary/5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 truncate">{step.label}</span>
                  {index < reviewSteps.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto hidden size-4 text-primary/35 md:block"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <nav
          aria-label="Filtrar pre-cadastros por status"
          className="grid gap-1 bg-white/70 p-2 sm:grid-cols-2 xl:grid-cols-4"
        >
          {statusOptions.map((status) => {
            const meta = statusMeta[status];
            const Icon = meta.icon;
            const isActive = activeStatus === status;

            return (
              <Button
                key={status}
                asChild
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-auto min-h-11 w-full justify-between rounded-lg px-3 py-2 text-left",
                  isActive
                    ? "shadow-md shadow-primary/15"
                    : "text-muted-foreground hover:bg-primary/8 hover:text-primary",
                )}
              >
                <Link
                  href={`${basePath}?task=aceitar-alunos&preStatus=${status}`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="truncate">{meta.label}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                      isActive ? "bg-white/20" : "bg-primary/8 text-primary",
                    )}
                  >
                    {statusCounts[status]}
                  </span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </section>

      {requests.length === 0 ? (
        <div className="ava-soft-card flex min-h-60 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-6 text-center">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-xl border",
              activeMeta.accentClassName,
            )}
          >
            <ActiveIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-primary">
              {activeMeta.emptyTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {activeMeta.emptyDescription}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            <UsersRound aria-hidden="true" className="size-3.5" />
            {visibleRequestsLabel}
          </div>
          {activeStatus !== "PENDING" && statusCounts.PENDING > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}?task=aceitar-alunos&preStatus=PENDING`}>
                Ver pendentes
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const canAccept =
              request.status === "PENDING" || request.status === "CONTACTED";
            const canReject =
              request.status !== "APPROVED" && request.status !== "REJECTED";
            const canMarkInReview =
              request.status !== "CONTACTED" && request.status !== "APPROVED";
            const receivedDate =
              formatDate(request.createdAt) ?? "Data nao informada";
            const personInitial =
              request.fullName.trim().charAt(0).toUpperCase() || "A";

            return (
              <article
                key={request.id}
                className="ava-soft-card overflow-hidden rounded-2xl border"
              >
                <div className="border-b border-primary/10 bg-primary/[0.03] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-white text-lg font-semibold text-primary shadow-sm">
                        {personInitial}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={request.status} />
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <CalendarClock
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Recebido em {receivedDate}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-primary">
                          {request.fullName}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {request.englishGoal}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-white/82 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
                      <UsersRound aria-hidden="true" className="size-3.5" />
                      {viewerRole === "ADMIN"
                        ? "Revisao admin"
                        : "Revisao teacher"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <ContactCard icon={Mail} label="Email" value={request.email} />
                    <ContactCard
                      icon={Phone}
                      label="Telefone"
                      value={request.phone}
                    />
                    <ContactCard
                      icon={MapPin}
                      label="Endereco"
                      value={request.address}
                    />
                  </div>
                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
                  <div className="flex flex-col gap-4">
                    <section className="rounded-xl border border-primary/10 bg-white/70 p-4 shadow-sm shadow-primary/5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Sparkles aria-hidden="true" className="size-4" />
                        Objetivo e contexto
                      </div>
                      <dl className="grid gap-3 md:grid-cols-2">
                        <DetailItem
                          icon={Sparkles}
                          label="Objetivo com o ingles"
                          value={request.englishGoal}
                          wide
                        />
                        <DetailItem
                          icon={MessageSquareText}
                          label="Observacoes"
                          value={request.notes}
                          wide
                        />
                        <DetailItem
                          icon={MessageSquareText}
                          label="Segundo contato"
                          value={request.secondaryContact}
                        />
                        <DetailItem
                          icon={Phone}
                          label="Telefone do aluno"
                          value={request.studentPhone}
                        />
                      </dl>
                    </section>

                    <section className="rounded-xl border border-primary/10 bg-white/70 p-4 shadow-sm shadow-primary/5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                        Dados do cadastro
                      </div>
                      <dl className="grid gap-3 md:grid-cols-2">
                        <DetailItem
                          icon={CalendarClock}
                          label="Nascimento"
                          value={formatDate(request.birthDate)}
                        />
                        <DetailItem
                          icon={ShieldCheck}
                          label="Documento"
                          value={request.guardianDocument}
                        />
                        <DetailItem
                          icon={UserRound}
                          label="Mae/responsavel"
                          value={request.guardianName}
                        />
                        <DetailItem
                          icon={Phone}
                          label="Telefone responsavel"
                          value={request.guardianPhone}
                        />
                        <DetailItem
                          icon={ClipboardCheck}
                          label="Revisao"
                          value={
                            request.reviewedAt
                              ? `${formatDate(request.reviewedAt)}${
                                  request.reviewedByName
                                    ? ` por ${request.reviewedByName}`
                                    : ""
                                }`
                              : null
                          }
                        />
                        <DetailItem
                          icon={MessageSquareText}
                          label="Nota interna"
                          value={request.statusNote}
                        />
                        <DetailItem
                          icon={UserCheck}
                          label="Aluno criado"
                          value={
                            request.convertedUserName
                              ? `${request.convertedUserName} - ${request.convertedUserEmail}`
                              : null
                          }
                          wide
                        />
                      </dl>
                    </section>
                  </div>

                  <aside className="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white/82 p-4 shadow-sm shadow-primary/5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <UserPlus aria-hidden="true" className="size-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-primary">
                          Criar conta STUDENT
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Defina a senha inicial e aceite apenas quando o acesso
                          estiver aprovado.
                        </p>
                      </div>
                    </div>

                    {canAccept ? (
                      <AcceptForm requestId={request.id} />
                    ) : (
                      <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Esta solicitacao ja saiu da fila de aceite.
                      </p>
                    )}

                    <div className="grid gap-3 border-t border-primary/10 pt-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                        Acompanhamento
                      </div>
                      {canMarkInReview ? (
                        <ReviewButton
                          requestId={request.id}
                          status="CONTACTED"
                        />
                      ) : null}
                      {canReject ? <RejectForm requestId={request.id} /> : null}
                      {!canMarkInReview && !canReject ? (
                        <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
                          Sem acoes pendentes para este status.
                        </p>
                      ) : null}
                    </div>
                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
