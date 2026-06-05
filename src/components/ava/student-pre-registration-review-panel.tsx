"use client";

import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserCheck,
  UserRound,
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
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
    label: "Convertido em aluno",
  },
  CONTACTED: {
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Clock3,
    label: "Em analise",
  },
  PENDING: {
    className: "border-primary/20 bg-primary/10 text-primary",
    icon: UserRound,
    label: "Pendente",
  },
  REJECTED: {
    className: "border-rose-200 bg-rose-50 text-rose-800",
    icon: XCircle,
    label: "Recusado",
  },
} satisfies Record<
  PreRegistrationStatus,
  {
    className: string;
    icon: typeof UserRound;
    label: string;
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
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/10 bg-white/70 p-3">
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/55">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground/85">{value}</dd>
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
        className="min-h-20 text-sm"
      />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <UserCheck data-icon="inline-start" />
          )}
          Aceitar aluno
        </Button>
      </div>
      <details className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3 text-sm">
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
            className="min-h-20 text-sm"
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

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-secondary/20 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Aceitar alunos
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-primary">
              Pre-cadastros recebidos
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Revise os dados enviados no login, marque acompanhamento e crie
              uma conta STUDENT apenas quando a equipe Candy liberar o acesso.
            </p>
          </div>

          <div className="grid gap-2 rounded-xl border border-primary/10 bg-white/75 p-4 text-sm shadow-sm sm:grid-cols-2">
            <span className="font-semibold text-primary">
              {statusCounts.PENDING} pendente(s)
            </span>
            <span className="font-semibold text-amber-700">
              {statusCounts.CONTACTED} em analise
            </span>
            {viewerRole === "ADMIN" ? (
              <>
                <span className="font-semibold text-emerald-700">
                  {statusCounts.APPROVED} convertido(s)
                </span>
                <span className="font-semibold text-rose-700">
                  {statusCounts.REJECTED} recusado(s)
                </span>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((status) => {
          const meta = statusMeta[status];
          const isActive = activeStatus === status;

          return (
            <Button
              key={status}
              asChild
              variant={isActive ? "default" : "outline"}
              size="sm"
            >
              <Link href={`${basePath}?task=aceitar-alunos&preStatus=${status}`}>
                {meta.label}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.68rem]">
                  {statusCounts[status]}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/5 p-6 text-center text-sm text-primary/75">
          <UserRound aria-hidden="true" className="size-8" />
          Nenhuma solicitacao nesse filtro.
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

            return (
              <article
                key={request.id}
                className="ava-soft-card overflow-hidden rounded-2xl border"
              >
                <div className="flex flex-col gap-4 border-b border-primary/10 bg-primary/[0.03] p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} />
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Recebido em {formatDate(request.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-primary">
                      {request.fullName}
                    </h3>
                    <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">{request.email}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                    <span className="block font-semibold text-foreground">
                      Telefone
                    </span>
                    {request.phone}
                  </div>
                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <dl className="grid gap-3 md:grid-cols-2">
                    <DetailItem label="Cidade/endereco" value={request.address} />
                    <DetailItem
                      label="Nascimento"
                      value={formatDate(request.birthDate)}
                    />
                    <DetailItem
                      label="Telefone do aluno"
                      value={request.studentPhone}
                    />
                    <DetailItem
                      label="Segundo contato"
                      value={request.secondaryContact}
                    />
                    <DetailItem
                      label="Documento"
                      value={request.guardianDocument}
                    />
                    <DetailItem
                      label="Mae/responsavel"
                      value={request.guardianName}
                    />
                    <DetailItem
                      label="Telefone responsavel"
                      value={request.guardianPhone}
                    />
                    <DetailItem
                      label="Objetivo com o ingles"
                      value={request.englishGoal}
                    />
                    <DetailItem label="Observacoes" value={request.notes} />
                    <DetailItem
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
                    <DetailItem label="Nota interna" value={request.statusNote} />
                    <DetailItem
                      label="Aluno criado"
                      value={
                        request.convertedUserName
                          ? `${request.convertedUserName} - ${request.convertedUserEmail}`
                          : null
                      }
                    />
                  </dl>

                  <aside className="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white/75 p-4">
                    {canAccept ? (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-semibold text-primary">
                          Criar conta STUDENT
                        </h4>
                        <AcceptForm requestId={request.id} />
                      </div>
                    ) : (
                      <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Esta solicitacao ja saiu da fila de aceite.
                      </p>
                    )}

                    <div className="grid gap-3 border-t border-primary/10 pt-4">
                      {canMarkInReview ? (
                        <ReviewButton
                          requestId={request.id}
                          status="CONTACTED"
                        />
                      ) : null}
                      {canReject ? <RejectForm requestId={request.id} /> : null}
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
