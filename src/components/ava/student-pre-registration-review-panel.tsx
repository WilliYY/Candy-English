"use client";

import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  CreditCard,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  acceptStudentPreRegistration,
  createStudentPreRegistration,
  updateStudentPreRegistrationStatus,
} from "@/app/ava/pre-registrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  type SecretariaUnitFilter,
  withSecretariaUnitParam,
} from "@/lib/secretaria-unit-filter";
import type { SecretariaPreRegistrationInput } from "@/lib/validations/pre-registration";
import { cn } from "@/lib/utils";

export type PreRegistrationStatus =
  | "PENDING"
  | "CONTACTED"
  | "WAITING_PAYMENT"
  | "READY_TO_CONVERT"
  | "APPROVED"
  | "REJECTED";

type ReviewableStatus = Exclude<PreRegistrationStatus, "PENDING" | "APPROVED">;
type CreateStatus = Exclude<PreRegistrationStatus, "APPROVED">;
type FinancialUnit = "IVATE" | "DOURADINA";
type PaymentMethod = "PIX" | "DINHEIRO" | "CARTAO" | "OUTRO";

export type PreRegistrationTeacherOption = {
  email?: string;
  id: string;
  isActive?: boolean;
  label: string;
};

export type StudentPreRegistrationReviewRow = {
  address: string | null;
  assignedTeacherEmail: string | null;
  assignedTeacherId: string | null;
  assignedTeacherName: string | null;
  birthDate: string | null;
  city: string | null;
  convertedAgendaStudentId: string | null;
  convertedFinancialStudentId: string | null;
  convertedStudentProfileId: string | null;
  convertedUserEmail: string | null;
  convertedUserName: string | null;
  createdAt: string;
  createdByName: string | null;
  createdByRole: "ADMIN" | "TEACHER" | "STUDENT" | null;
  email: string | null;
  englishGoal: string;
  estimatedLevel: string | null;
  fullName: string;
  guardianDocument: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  id: string;
  installmentsTotal: number | null;
  intendedTime: string | null;
  intendedWeekdayMask: number;
  notes: string | null;
  paymentDay: number | null;
  paymentMethod: string | null;
  phone: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  secondaryContact: string | null;
  status: PreRegistrationStatus;
  statusNote: string | null;
  studentPhone: string | null;
  tuitionCents: number | null;
  unit: FinancialUnit;
};

type StudentPreRegistrationReviewPanelProps = {
  activeStatus: PreRegistrationStatus;
  basePath: "/ava/admin" | "/ava/teacher";
  requests: StudentPreRegistrationReviewRow[];
  statusCounts: Record<PreRegistrationStatus, number>;
  teacherOptions: PreRegistrationTeacherOption[];
  unitFilter?: SecretariaUnitFilter;
  viewerRole: "ADMIN" | "TEACHER";
};

type CreateFormState = {
  assignedTeacherProfileId: string;
  birthDate: string;
  city: string;
  email: string;
  englishGoal: string;
  estimatedLevel: string;
  fullName: string;
  guardianName: string;
  installmentsTotal: string;
  intendedTime: string;
  intendedWeekdayMask: number;
  notes: string;
  paymentDay: string;
  paymentMethod: PaymentMethod;
  phone: string;
  status: CreateStatus;
  tuitionAmount: string;
  unit: FinancialUnit;
};

const allStatusOptions: readonly PreRegistrationStatus[] = [
  "PENDING",
  "CONTACTED",
  "WAITING_PAYMENT",
  "READY_TO_CONVERT",
  "APPROVED",
  "REJECTED",
];

const createStatusOptions: readonly CreateStatus[] = [
  "PENDING",
  "CONTACTED",
  "WAITING_PAYMENT",
  "READY_TO_CONVERT",
  "REJECTED",
];

const weekdays = [
  { label: "Dom", value: 0 },
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sab", value: 6 },
] as const;

const agendaTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARTAO: "Cartao",
  DINHEIRO: "Dinheiro",
  OUTRO: "Outro",
  PIX: "Pix",
};

const unitLabels: Record<FinancialUnit, string> = {
  DOURADINA: "Unidade 2 Douradina",
  IVATE: "Unidade 1 Ivat\u00e9",
};

const statusMeta = {
  APPROVED: {
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    emptyDescription:
      "Quando um interessado vira STUDENT, o historico fica aqui para consulta.",
    emptyTitle: "Nenhum aluno convertido nesse filtro.",
    icon: CheckCircle2,
    label: "Convertido",
    summaryLabel: "Convertidos",
  },
  CONTACTED: {
    accentClassName: "border-sky-200 bg-sky-50 text-sky-800",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    emptyDescription:
      "Use este status para conversas em andamento pelo WhatsApp ou telefone.",
    emptyTitle: "Nenhum interessado em conversa.",
    icon: MessageSquareText,
    label: "Em conversa",
    summaryLabel: "Conversas",
  },
  PENDING: {
    accentClassName: "border-primary/20 bg-primary/10 text-primary",
    className: "border-primary/20 bg-primary/10 text-primary",
    emptyDescription:
      "Novos interessados cadastrados pela Secretaria aparecem aqui.",
    emptyTitle: "Nenhum pre-cadastro novo.",
    icon: UserRound,
    label: "Novo",
    summaryLabel: "Novos",
  },
  READY_TO_CONVERT: {
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    emptyDescription:
      "Interessados prontos para receber login STUDENT aparecem aqui.",
    emptyTitle: "Nenhum interessado pronto para virar aluno.",
    icon: UserCheck,
    label: "Pronto para virar aluno",
    summaryLabel: "Prontos",
  },
  REJECTED: {
    accentClassName: "border-rose-200 bg-rose-50 text-rose-800",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    emptyDescription:
      "Recusados ficam separados para consulta sem misturar com a fila ativa.",
    emptyTitle: "Nenhum pre-cadastro recusado.",
    icon: XCircle,
    label: "Recusado",
    summaryLabel: "Recusados",
  },
  WAITING_PAYMENT: {
    accentClassName: "border-amber-200 bg-amber-50 text-amber-800",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    emptyDescription:
      "Use este status quando a conversa depende do pagamento combinado.",
    emptyTitle: "Nenhum interessado aguardando pagamento.",
    icon: Clock3,
    label: "Aguardando pagamento",
    summaryLabel: "Aguardando",
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

const defaultCreateState: CreateFormState = {
  assignedTeacherProfileId: "",
  birthDate: "",
  city: "",
  email: "",
  englishGoal: "",
  estimatedLevel: "",
  fullName: "",
  guardianName: "",
  installmentsTotal: "",
  intendedTime: "",
  intendedWeekdayMask: 0,
  notes: "",
  paymentDay: "",
  paymentMethod: "PIX",
  phone: "",
  status: "PENDING",
  tuitionAmount: "",
  unit: "IVATE",
};

function createDefaultCreateState(unit: FinancialUnit = "IVATE"): CreateFormState {
  return {
    ...defaultCreateState,
    unit,
  };
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return dateFormatter.format(date);
}

function formatCurrency(cents: number | null) {
  if (cents === null) return null;

  return currencyFormatter.format(cents / 100);
}

function formatWeekdayMask(mask: number) {
  const selected = weekdays
    .filter((weekday) => (mask & (1 << weekday.value)) !== 0)
    .map((weekday) => weekday.label);

  return selected.length > 0 ? selected.join(", ") : null;
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCompactSearchText(value: string | null | undefined) {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, "");
}

function normalizeDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function getSimplifiedNameTokens(value: string) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function buildSuggestedLogin(fullName: string) {
  const tokens = getSimplifiedNameTokens(fullName);
  const firstToken = tokens[0] ?? "aluno";
  const lastToken = tokens.length > 1 ? tokens[tokens.length - 1] : "";
  const loginName = lastToken ? `${firstToken}.${lastToken}` : firstToken;

  return `${loginName}@candy.local`;
}

function buildDefaultInitialPassword(fullName: string) {
  const tokens = getSimplifiedNameTokens(fullName);
  const firstToken = tokens[0] ?? "aluno";
  const compactName = tokens.join("");
  const firstNamePassword = `${firstToken}candy`;

  if (firstNamePassword.length >= 8) {
    return firstNamePassword;
  }

  const compactPassword = `${compactName}candy`;

  return compactPassword.length >= 8 ? compactPassword : "alunocandy";
}

function isValidEmailForLogin(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previousRow = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  const currentRow = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    currentRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      currentRow[rightIndex] = Math.min(
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex] + 1,
        previousRow[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previousRow[index] = currentRow[index];
    }
  }

  return previousRow[right.length];
}

function similarityScore(left: string, right: string) {
  if (!left || !right) return 0;

  const longest = Math.max(left.length, right.length);

  if (longest === 0) return 0;

  return (longest - levenshteinDistance(left, right)) / longest;
}

function closestSimilarityScore(query: string, target: string) {
  const candidates = [target, ...target.split(" ")].filter(
    (candidate) => candidate.length >= 2,
  );

  return candidates.reduce(
    (bestScore, candidate) =>
      Math.max(bestScore, similarityScore(query, candidate)),
    0,
  );
}

type SearchTarget = {
  compact: string;
  digits: string;
  priority: number;
  text: string;
};

function buildSearchTargets(request: StudentPreRegistrationReviewRow) {
  const rawTargets: Array<[string | null | undefined, number]> = [
    [request.fullName, 10],
    [request.phone, 9],
    [request.studentPhone, 8],
    [request.secondaryContact, 7],
    [request.email, 9],
    [request.guardianDocument, 9],
    [request.guardianName, 8],
    [request.guardianPhone, 7],
    [request.city, 6],
    [request.address, 5],
    [unitLabels[request.unit], 7],
    [request.unit, 7],
    [statusMeta[request.status].label, 7],
    [request.status, 7],
    [request.assignedTeacherName, 5],
  ];

  return rawTargets
    .map<SearchTarget | null>(([value, priority]) => {
      const text = normalizeSearchText(value);

      if (!text) return null;

      return {
        compact: normalizeCompactSearchText(value),
        digits: normalizeDigits(value),
        priority,
        text,
      };
    })
    .filter((target): target is SearchTarget => Boolean(target));
}

function scoreTargetForSearch(
  target: SearchTarget,
  queryText: string,
  queryCompact: string,
  queryDigits: string,
) {
  if (queryText && target.text === queryText) {
    return { exact: true, score: 1000 + target.priority };
  }

  if (queryCompact && target.compact === queryCompact) {
    return { exact: true, score: 990 + target.priority };
  }

  if (queryDigits && target.digits === queryDigits) {
    return { exact: true, score: 980 + target.priority };
  }

  if (queryText && target.text.startsWith(queryText)) {
    return { exact: false, score: 850 + target.priority };
  }

  if (queryDigits.length >= 3 && target.digits.includes(queryDigits)) {
    return { exact: false, score: 780 + target.priority };
  }

  if (queryCompact.length >= 3 && target.compact.includes(queryCompact)) {
    return { exact: false, score: 740 + target.priority };
  }

  if (queryText && target.text.includes(queryText)) {
    return { exact: false, score: 700 + target.priority };
  }

  const queryTokens = queryText.split(" ").filter(Boolean);

  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) => target.text.includes(token))
  ) {
    return { exact: false, score: 660 + target.priority };
  }

  if (queryText.length >= 3) {
    const similarity = closestSimilarityScore(queryText, target.text);

    if (similarity >= 0.68) {
      return {
        exact: false,
        score: 320 + Math.round(similarity * 220) + target.priority,
      };
    }
  }

  return { exact: false, score: 0 };
}

function scoreRequestForSearch(
  request: StudentPreRegistrationReviewRow,
  query: string,
) {
  const queryText = normalizeSearchText(query);
  const queryCompact = normalizeCompactSearchText(query);
  const queryDigits = normalizeDigits(query);

  return buildSearchTargets(request).reduce(
    (bestMatch, target) => {
      const match = scoreTargetForSearch(
        target,
        queryText,
        queryCompact,
        queryDigits,
      );

      if (match.score > bestMatch.score) {
        return match;
      }

      if (match.score === bestMatch.score && match.exact) {
        return match;
      }

      return bestMatch;
    },
    { exact: false, score: 0 },
  );
}

function DetailItem({
  icon: Icon,
  label,
  tone,
  value,
  wide,
}: {
  icon?: typeof UserRound;
  label: string;
  tone?: "info" | "success" | "warning";
  value: React.ReactNode;
  wide?: boolean;
}) {
  if (!value) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white/85 p-3 shadow-sm shadow-primary/5",
        wide && "md:col-span-2",
        tone === "info" && "border-sky-200 bg-sky-50/70",
        tone === "success" && "border-emerald-200 bg-emerald-50/70",
        tone === "warning" && "border-amber-200 bg-amber-50/70",
        !tone && "border-primary/10",
      )}
    >
      <dt className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/55">
        {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
        <span>{label}</span>
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground/85">
        {value}
      </dd>
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

function ContactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string | null;
}) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-primary/10 bg-white/85 px-3 py-2 shadow-sm shadow-primary/5">
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

function StatusButton({
  requestId,
  status,
}: {
  requestId: string;
  status: Exclude<ReviewableStatus, "REJECTED">;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const meta = statusMeta[status];
  const Icon = meta.icon;

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
        className={cn("w-full justify-start", meta.className)}
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Icon data-icon="inline-start" />
        )}
        {meta.label}
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
        className="min-h-20 resize-y text-sm"
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

type ConversionFlowState =
  | "incomplete"
  | "ready"
  | "converting"
  | "converted"
  | "error";

const conversionFlowMeta = {
  converted: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
    label: "Convertido",
  },
  converting: {
    className: "border-sky-200 bg-sky-50 text-sky-800",
    icon: LoaderCircle,
    label: "Convertendo",
  },
  error: {
    className: "border-destructive/25 bg-destructive/10 text-destructive",
    icon: AlertCircle,
    label: "Erro",
  },
  incomplete: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
    label: "Incompleto",
  },
  ready: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: ShieldCheck,
    label: "Pronto",
  },
} satisfies Record<
  ConversionFlowState,
  {
    className: string;
    icon: typeof UserRound;
    label: string;
  }
>;

function ConversionStatePill({ state }: { state: ConversionFlowState }) {
  const meta = conversionFlowMeta[state];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]",
        meta.className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-3.5", state === "converting" && "animate-spin")}
      />
      {meta.label}
    </span>
  );
}

function ConversionInfoTile({
  description,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  description?: React.ReactNode;
  icon: typeof UserRound;
  label: string;
  tone?: "neutral" | "success" | "info" | "warning";
  value: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-white/88 p-3 shadow-sm shadow-primary/5",
        tone === "neutral" && "border-primary/10",
        tone === "success" && "border-emerald-200 bg-emerald-50/60",
        tone === "info" && "border-sky-200 bg-sky-50/60",
        tone === "warning" && "border-amber-200 bg-amber-50/70",
      )}
    >
      <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </p>
      <div className="mt-1 break-words text-sm font-semibold text-primary">
        {value}
      </div>
      {description ? (
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}

function ConversionStepCard({
  children,
  description,
  icon: Icon,
  step,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: typeof UserRound;
  step: number;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-primary/12 bg-white/88 p-4 shadow-sm shadow-primary/5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon aria-hidden="true" className="size-4 text-primary" />
            <h5 className="text-sm font-semibold text-primary">{title}</h5>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AcceptForm({
  request,
  teacherOptions,
  viewerRole,
}: {
  request: StudentPreRegistrationReviewRow;
  teacherOptions: PreRegistrationTeacherOption[];
  viewerRole: "ADMIN" | "TEACHER";
}) {
  const router = useRouter();
  const suggestedLogin = buildSuggestedLogin(request.fullName);
  const [cattyContext, setCattyContext] = useState("");
  const [confirmConversion, setConfirmConversion] = useState(false);
  const [confirmMissingAgendaData, setConfirmMissingAgendaData] =
    useState(false);
  const [emailForLogin, setEmailForLogin] = useState(request.email ?? "");
  const [hasConverted, setHasConverted] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const [initialPassword, setInitialPassword] = useState(() =>
    buildDefaultInitialPassword(request.fullName),
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [cattyContextError, setCattyContextError] = useState<string | null>(
    null,
  );
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [missingAgendaError, setMissingAgendaError] = useState<string | null>(
    null,
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherProfileIdForConversion, setTeacherProfileIdForConversion] =
    useState(request.assignedTeacherId ?? "");
  const [isPending, startTransition] = useTransition();
  const selectedTeacher = teacherOptions.find(
    (teacher) => teacher.id === teacherProfileIdForConversion,
  );
  const isEmailForLoginValid = isValidEmailForLogin(emailForLogin);
  const isInitialPasswordValid = initialPassword.trim().length >= 8;
  const missingFinancialFields = [
    !request.tuitionCents || request.tuitionCents <= 0
      ? "mensalidade"
      : null,
    request.paymentDay ? null : "dia de pagamento",
    request.paymentMethod ? null : "forma de pagamento",
  ].filter(Boolean) as string[];
  const missingAgendaFields = [
    request.intendedWeekdayMask > 0 ? null : "dias de aula",
    request.intendedTime && agendaTimePattern.test(request.intendedTime)
      ? null
      : "horario",
  ].filter(Boolean) as string[];
  const hasRequiredFinancialData = missingFinancialFields.length === 0;
  const hasCompleteAgendaData = missingAgendaFields.length === 0;
  const needsAgendaConfirmation = !hasCompleteAgendaData;
  const missingFinancialSummary = missingFinancialFields.join(", ");
  const missingAgendaSummary = missingAgendaFields.join(", ");
  const teacherSummary =
    viewerRole === "TEACHER"
      ? request.assignedTeacherName ?? "Sua teacher"
      : selectedTeacher?.label ?? request.assignedTeacherName ?? "Sem teacher";
  const scheduleDays =
    formatWeekdayMask(request.intendedWeekdayMask) ?? "Dias nao informados";
  const scheduleTime = request.intendedTime ?? "Horario nao informado";
  const scheduleSummary = [
    formatWeekdayMask(request.intendedWeekdayMask),
    request.intendedTime,
  ]
    .filter(Boolean)
    .join(" - ");
  const paymentMethodLabel = request.paymentMethod
    ? paymentMethodLabels[request.paymentMethod as PaymentMethod] ??
      request.paymentMethod
    : "Forma nao informada";
  const financeSummary = [
    formatCurrency(request.tuitionCents) ?? "Mensalidade pendente",
    request.paymentDay ? `dia ${request.paymentDay}` : "dia pendente",
    paymentMethodLabel,
    request.installmentsTotal
      ? `${request.installmentsTotal} parcela(s)`
      : "recorrente",
  ].join(" / ");
  const missingRequirements = useMemo(() => {
    const items: string[] = [];

    if (!isEmailForLoginValid) {
      items.push("email/login valido");
    }

    if (!isInitialPasswordValid) {
      items.push("senha inicial com 8+ caracteres");
    }

    if (!hasRequiredFinancialData) {
      items.push(`financeiro: ${missingFinancialSummary}`);
    }

    if (needsAgendaConfirmation && !confirmMissingAgendaData) {
      items.push(`confirmar agenda pendente: ${missingAgendaSummary}`);
    }

    if (!confirmConversion) {
      items.push("confirmacao final");
    }

    return items;
  }, [
    confirmConversion,
    confirmMissingAgendaData,
    hasRequiredFinancialData,
    isEmailForLoginValid,
    isInitialPasswordValid,
    missingAgendaSummary,
    missingFinancialSummary,
    needsAgendaConfirmation,
  ]);
  const isReadyToConvert = missingRequirements.length === 0;
  const conversionState: ConversionFlowState = isPending
    ? "converting"
    : hasConverted
      ? "converted"
      : hasSubmissionError
        ? "error"
        : isReadyToConvert
          ? "ready"
          : "incomplete";
  const disableConversionButton =
    isPending || hasConverted || !isReadyToConvert;
  const emailValidationMessage =
    emailError ??
    (!isEmailForLoginValid
      ? "Informe um email/login valido para liberar a conversao."
      : null);
  const passwordValidationMessage =
    passwordError ??
    (!isInitialPasswordValid
      ? "A senha inicial precisa ter pelo menos 8 caracteres."
      : null);
  const confirmValidationMessage =
    confirmError ??
    (!confirmConversion ? "Confirme a criacao antes de converter." : null);
  const missingAgendaValidationMessage =
    missingAgendaError ??
    (needsAgendaConfirmation && !confirmMissingAgendaData
      ? "Confirme que a agenda sera preenchida depois para liberar a conversao."
      : null);
  const convertedUserLabel =
    emailForLogin.trim() || request.convertedUserEmail || "login criado";

  function resetSubmissionFeedback() {
    setHasSubmissionError(false);
    setMessage(null);
    setRequestError(null);
  }

  function handleClosePanel() {
    if (isPending) return;

    setIsPanelOpen(false);

    if (hasConverted) {
      router.refresh();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disableConversionButton) {
      return;
    }

    setMessage(null);
    setRequestError(null);
    setCattyContextError(null);
    setConfirmError(null);
    setMissingAgendaError(null);
    setEmailError(null);
    setPasswordError(null);
    setTeacherError(null);
    setHasSubmissionError(false);

    startTransition(async () => {
      const result = await acceptStudentPreRegistration({
        cattyContext,
        confirmConversion,
        confirmMissingAgendaData,
        emailForLogin,
        initialPassword,
        requestId: request.id,
        teacherProfileIdForConversion:
          viewerRole === "ADMIN" ? teacherProfileIdForConversion : undefined,
      });

      if (!result.ok) {
        setCattyContextError(result.errors?.cattyContext ?? null);
        setConfirmError(result.errors?.confirmConversion ?? null);
        setMissingAgendaError(result.errors?.confirmMissingAgendaData ?? null);
        setEmailError(result.errors?.emailForLogin ?? null);
        setPasswordError(result.errors?.initialPassword ?? null);
        setRequestError(result.errors?.requestId ?? null);
        setTeacherError(result.errors?.teacherProfileIdForConversion ?? null);
        setMessage(result.message);
        setHasSubmissionError(true);
        return;
      }

      setCattyContext("");
      setConfirmConversion(false);
      setConfirmMissingAgendaData(false);
      setInitialPassword("");
      setMessage(result.message);
      setHasConverted(true);
      setHasSubmissionError(false);
    });
  }

  return (
    <>
      <div className="rounded-xl border border-primary/12 bg-primary/[0.03] p-3 shadow-sm shadow-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <ConversionStatePill state={conversionState} />
            <h5 className="mt-3 text-sm font-semibold text-primary">
              Painel de conversao
            </h5>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Revise AVA, login, financeiro e agenda antes de criar o aluno.
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
            <UserPlus aria-hidden="true" className="size-4" />
          </span>
        </div>

        {hasConverted ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            Aluno criado. A senha inicial nao fica visivel depois da conversao.
          </div>
        ) : missingRequirements.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/75 px-3 py-2 text-xs leading-5 text-amber-900">
            Falta: {missingRequirements.join(", ")}.
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            Pronto para abrir o resumo final e converter.
          </div>
        )}

        <Button
          type="button"
          className="mt-3 h-10 w-full"
          variant={hasConverted ? "outline" : "default"}
          onClick={() => setIsPanelOpen(true)}
        >
          <ClipboardCheck data-icon="inline-start" />
          {hasConverted ? "Ver resultado" : "Abrir painel"}
        </Button>
      </div>

      {isPanelOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-primary/45 p-2 sm:items-center sm:p-4">
          <section
            aria-modal="true"
            role="dialog"
            aria-labelledby={`conversion-title-${request.id}`}
            className="flex max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/15 bg-[#fefbfa] shadow-[0_24px_80px_rgba(44,19,56,0.28)] sm:max-h-[calc(100vh-2rem)]"
          >
            <header className="border-b border-primary/10 bg-gradient-to-r from-[#f6e6ff] via-white to-[#fce5d8]/85 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <UserPlus aria-hidden="true" className="size-4" />
                    </span>
                    <ConversionStatePill state={conversionState} />
                  </div>
                  <h4
                    id={`conversion-title-${request.id}`}
                    className="mt-3 text-xl font-semibold text-primary sm:text-2xl"
                  >
                    Tornar aluno
                  </h4>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Confira tudo que sera criado em uma transaction: acesso do
                    AVA, financeiro, agenda e vinculo com teacher.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={handleClosePanel}
                  aria-label="Fechar painel de conversao"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </header>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
              noValidate
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                  <div className="grid gap-4">
                    <ConversionStepCard
                      step={1}
                      icon={UserRound}
                      title="Dados do aluno"
                      description="Identidade, contato, unidade, teacher e status atual."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ConversionInfoTile
                          icon={UserRound}
                          label="Nome"
                          value={request.fullName}
                        />
                        <ConversionInfoTile
                          icon={Phone}
                          label="Telefone"
                          value={request.phone}
                        />
                        <ConversionInfoTile
                          icon={Store}
                          label="Unidade"
                          tone="success"
                          value={unitLabels[request.unit]}
                        />
                        <ConversionInfoTile
                          icon={UserCheck}
                          label="Teacher"
                          tone="success"
                          value={teacherSummary}
                        />
                        <ConversionInfoTile
                          icon={ClipboardCheck}
                          label="Status"
                          value={statusMeta[request.status].label}
                        />
                        <ConversionInfoTile
                          icon={Mail}
                          label="Email do pre-cadastro"
                          value={request.email ?? "Nao informado"}
                        />
                      </div>

                      {viewerRole === "ADMIN" ? (
                        <label className="mt-3 grid gap-1 text-sm font-semibold text-primary">
                          Teacher para vinculo
                          <NativeSelect
                            value={teacherProfileIdForConversion}
                            onChange={(event) => {
                              setTeacherProfileIdForConversion(
                                event.target.value,
                              );
                              setTeacherError(null);
                              resetSubmissionFeedback();
                            }}
                            disabled={isPending || hasConverted}
                            aria-invalid={Boolean(teacherError)}
                          >
                            <option value="">Sem teacher definida</option>
                            {teacherOptions.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.label}
                              </option>
                            ))}
                          </NativeSelect>
                          {teacherError ? (
                            <span className="text-xs font-medium text-destructive">
                              {teacherError}
                            </span>
                          ) : null}
                        </label>
                      ) : null}
                    </ConversionStepCard>

                    <ConversionStepCard
                      step={2}
                      icon={ShieldCheck}
                      title="Login do AVA"
                      description="Email/login e senha inicial precisam estar claros antes de criar o acesso."
                    >
                      {hasConverted ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                          Login criado para <strong>{convertedUserLabel}</strong>.
                          A senha inicial foi removida da tela depois da
                          conversao.
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          <label className="grid gap-1 text-sm font-semibold text-primary">
                            Email/login
                            <Input
                              type="email"
                              autoComplete="email"
                              disabled={isPending}
                              aria-invalid={Boolean(emailValidationMessage)}
                              placeholder="email@exemplo.com"
                              value={emailForLogin}
                              onChange={(event) => {
                                setEmailForLogin(event.target.value);
                                setEmailError(null);
                                resetSubmissionFeedback();
                              }}
                            />
                          </label>
                          <div className="flex flex-col gap-2 rounded-lg border border-primary/10 bg-primary/[0.03] px-3 py-2 text-xs text-muted-foreground">
                            <span>
                              Sugestao:{" "}
                              <button
                                type="button"
                                className="font-semibold text-primary underline-offset-4 hover:underline"
                                disabled={isPending}
                                onClick={() => {
                                  setEmailForLogin(suggestedLogin);
                                  setEmailError(null);
                                  resetSubmissionFeedback();
                                }}
                              >
                                {suggestedLogin}
                              </button>
                            </span>
                            <span>
                              {request.email
                                ? "Preenchido com o email do pre-cadastro; edite se precisar."
                                : "Sem email no pre-cadastro; confirme digitando ou usando a sugestao."}
                            </span>
                          </div>
                          {emailValidationMessage ? (
                            <p className="text-xs font-medium text-destructive">
                              {emailValidationMessage}
                            </p>
                          ) : null}

                          <label className="grid gap-1 text-sm font-semibold text-primary">
                            Senha inicial
                            <Input
                              type="text"
                              autoComplete="off"
                              disabled={isPending}
                              aria-invalid={Boolean(passwordValidationMessage)}
                              placeholder="Senha inicial do aluno"
                              value={initialPassword}
                              onChange={(event) => {
                                setInitialPassword(event.target.value);
                                setPasswordError(null);
                                resetSubmissionFeedback();
                              }}
                              className="font-mono"
                            />
                          </label>
                          <p className="text-xs leading-5 text-muted-foreground">
                            A senha sugerida usa o nome simplificado + candy.
                            Ela sera salva somente como hash seguro.
                          </p>
                          {passwordValidationMessage ? (
                            <p className="text-xs font-medium text-destructive">
                              {passwordValidationMessage}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </ConversionStepCard>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ConversionStepCard
                        step={3}
                        icon={WalletCards}
                        title="Financeiro"
                        description="Dados que alimentam o controle interno."
                      >
                        <div className="grid gap-3">
                          <ConversionInfoTile
                            icon={Banknote}
                            label="Valor"
                            tone="warning"
                            value={
                              formatCurrency(request.tuitionCents) ??
                              "Nao informado"
                            }
                          />
                          <ConversionInfoTile
                            icon={CalendarClock}
                            label="Dia de pagamento"
                            value={
                              request.paymentDay
                                ? `Dia ${request.paymentDay}`
                                : "Nao informado"
                            }
                          />
                          <ConversionInfoTile
                            icon={CreditCard}
                            label="Forma"
                            value={paymentMethodLabel}
                          />
                          <ConversionInfoTile
                            icon={ClipboardCheck}
                            label="Parcelas"
                            value={
                              request.installmentsTotal
                                ? `${request.installmentsTotal} parcela(s)`
                                : "Recorrente"
                            }
                          />
                          <ConversionInfoTile
                            icon={Store}
                            label="Unidade"
                            tone="success"
                            value={unitLabels[request.unit]}
                          />
                          {!hasRequiredFinancialData ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-900">
                              <span className="flex items-start gap-2">
                                <AlertCircle
                                  aria-hidden="true"
                                  className="mt-0.5 size-4 shrink-0"
                                />
                                <span>
                                  Complete {missingFinancialSummary} no
                                  pre-cadastro antes de converter. O financeiro
                                  e obrigatorio para criar o aluno linkado.
                                </span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </ConversionStepCard>

                      <ConversionStepCard
                        step={4}
                        icon={CalendarClock}
                        title="Agenda"
                        description="Rotina interna que sera criada para o aluno."
                      >
                        <div className="grid gap-3">
                          <ConversionInfoTile
                            icon={CalendarClock}
                            label="Dias de aula"
                            tone="info"
                            value={scheduleDays}
                          />
                          <ConversionInfoTile
                            icon={Clock3}
                            label="Horario"
                            value={scheduleTime}
                          />
                          <ConversionInfoTile
                            icon={MessageSquareText}
                            label="Observacao"
                            value={request.notes ?? "Sem observacao"}
                          />
                          {needsAgendaConfirmation && !hasConverted ? (
                            <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-900">
                              <input
                                type="checkbox"
                                checked={confirmMissingAgendaData}
                                disabled={isPending}
                                onChange={(event) => {
                                  setConfirmMissingAgendaData(
                                    event.target.checked,
                                  );
                                  setMissingAgendaError(null);
                                  resetSubmissionFeedback();
                                }}
                                className="mt-0.5 size-4 rounded border-amber-300 accent-primary"
                              />
                              <span>
                                <span className="block font-semibold">
                                  Agenda incompleta: {missingAgendaSummary}.
                                </span>
                                <span className="mt-1 block text-muted-foreground">
                                  Converter mesmo assim cria o aluno na agenda
                                  sem ocorrencias; complete dias e horario
                                  depois.
                                </span>
                                {missingAgendaValidationMessage ? (
                                  <span className="mt-1 block font-medium text-destructive">
                                    {missingAgendaValidationMessage}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ) : null}
                        </div>
                      </ConversionStepCard>
                    </div>
                  </div>

                  <aside className="grid gap-4 self-start">
                    <ConversionStepCard
                      step={5}
                      icon={ClipboardCheck}
                      title="Confirmacao"
                      description="Resumo final antes de criar o aluno real."
                    >
                      <div className="grid gap-3">
                        <ConversionInfoTile
                          icon={UserPlus}
                          label="AVA"
                          value={request.fullName}
                          description="User STUDENT + StudentProfile"
                        />
                        <ConversionInfoTile
                          icon={ShieldCheck}
                          label="Login"
                          tone={isEmailForLoginValid ? "success" : "warning"}
                          value={
                            emailForLogin.trim() || "Email/login pendente"
                          }
                          description={
                            hasConverted
                              ? "Senha removida da tela."
                              : isInitialPasswordValid
                                ? "Senha valida para gerar hash seguro."
                                : "Senha ainda invalida."
                          }
                        />
                        <ConversionInfoTile
                          icon={WalletCards}
                          label="Financeiro"
                          tone={hasRequiredFinancialData ? "success" : "warning"}
                          value={financeSummary}
                          description={
                            hasRequiredFinancialData
                              ? "FinancialStudent e snapshots mensais."
                              : `Bloqueado: falta ${missingFinancialSummary}.`
                          }
                        />
                        <ConversionInfoTile
                          icon={CalendarClock}
                          label="Agenda"
                          tone={hasCompleteAgendaData ? "info" : "warning"}
                          value={
                            hasCompleteAgendaData
                              ? scheduleSummary
                              : `Pendente: ${missingAgendaSummary}`
                          }
                          description={
                            hasCompleteAgendaData
                              ? "AgendaStudent e ocorrencias futuras."
                              : confirmMissingAgendaData
                                ? "Vai criar AgendaStudent sem ocorrencias."
                                : "Exige confirmacao para converter."
                          }
                        />

                        {!hasConverted ? (
                          <details className="rounded-lg border border-primary/15 bg-primary/[0.03] p-3 text-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-primary [&::-webkit-details-marker]:hidden">
                              <span className="inline-flex items-center gap-2 font-semibold">
                                <BrainCircuit
                                  aria-hidden="true"
                                  className="size-4"
                                />
                                Contexto Catty
                              </span>
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/70">
                                opcional
                              </span>
                            </summary>
                            <div className="mt-3">
                              <Textarea
                                value={cattyContext}
                                onChange={(event) => {
                                  setCattyContext(event.target.value);
                                  setCattyContextError(null);
                                  resetSubmissionFeedback();
                                }}
                                disabled={isPending}
                                aria-invalid={Boolean(cattyContextError)}
                                placeholder="Ex: gosta de exemplos com jogos; trava em do/does; prefere explicacao curta."
                                className="min-h-24 resize-y text-sm"
                              />
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Memoria pedagogica leve. Nao inclua dados
                                sensiveis.
                              </p>
                              {cattyContextError ? (
                                <p className="mt-1 text-xs font-medium text-destructive">
                                  {cattyContextError}
                                </p>
                              ) : null}
                            </div>
                          </details>
                        ) : null}

                        {!hasConverted ? (
                          <label className="flex items-start gap-3 rounded-lg border border-primary/12 bg-white/85 p-3 text-sm text-primary shadow-sm shadow-primary/5">
                            <input
                              type="checkbox"
                              checked={confirmConversion}
                              disabled={isPending}
                              onChange={(event) => {
                                setConfirmConversion(event.target.checked);
                                setConfirmError(null);
                                resetSubmissionFeedback();
                              }}
                              className="mt-0.5 size-4 rounded border-primary/30 accent-primary"
                            />
                            <span>
                              <span className="block font-semibold">
                                Confirmo criar AVA, financeiro e agenda.
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                Se algo falhar, a transaction cancela tudo e o
                                pre-cadastro continua sem conversao.
                              </span>
                              {confirmValidationMessage ? (
                                <span className="mt-1 block text-xs font-medium text-destructive">
                                  {confirmValidationMessage}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ) : (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                            Conversao concluida. Atualize a lista para ver o
                            pre-cadastro em Convertido.
                          </div>
                        )}

                        {missingRequirements.length > 0 && !hasConverted ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-900">
                            Falta: {missingRequirements.join(", ")}.
                          </div>
                        ) : null}

                        {message ? (
                          <p
                            className={cn(
                              "rounded-lg border px-3 py-2 text-xs leading-5",
                              hasConverted
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "bg-muted text-muted-foreground",
                            )}
                            role="status"
                          >
                            {message}
                          </p>
                        ) : null}
                        {requestError ? (
                          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                            {requestError}
                          </p>
                        ) : null}
                      </div>
                    </ConversionStepCard>
                  </aside>
                </div>
              </div>

              <footer className="border-t border-primary/10 bg-white/92 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2 text-xs leading-5 text-muted-foreground">
                    <ConversionStatePill state={conversionState} />
                    <span className="min-w-0">
                      {hasConverted
                        ? "Aluno criado com sucesso."
                        : isReadyToConvert
                          ? "Tudo pronto para converter."
                          : "Complete os itens obrigatorios para liberar."}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={handleClosePanel}
                    >
                      {hasConverted ? "Fechar e atualizar" : "Cancelar"}
                    </Button>
                    {hasConverted ? (
                      <Button type="button" onClick={() => router.refresh()}>
                        <CheckCircle2 data-icon="inline-start" />
                        Atualizar lista
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="min-w-48"
                        disabled={disableConversionButton}
                      >
                        {isPending ? (
                          <LoaderCircle
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        ) : (
                          <UserCheck data-icon="inline-start" />
                        )}
                        Criar aluno no AVA
                      </Button>
                    )}
                  </div>
                </div>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function CreatePreRegistrationForm({
  initialUnit,
  teacherOptions,
  viewerRole,
}: {
  initialUnit: FinancialUnit;
  teacherOptions: PreRegistrationTeacherOption[];
  viewerRole: "ADMIN" | "TEACHER";
}) {
  const router = useRouter();
  const [form, setForm] = useState<CreateFormState>(() =>
    createDefaultCreateState(initialUnit),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof SecretariaPreRegistrationInput, string>>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<TKey extends keyof CreateFormState>(
    field: TKey,
    value: CreateFormState[TKey],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleWeekday(weekday: number) {
    setForm((current) => ({
      ...current,
      intendedWeekdayMask: current.intendedWeekdayMask ^ (1 << weekday),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage(null);

    const payload: SecretariaPreRegistrationInput = {
      assignedTeacherProfileId:
        viewerRole === "ADMIN" ? form.assignedTeacherProfileId : "",
      birthDate: form.birthDate,
      city: form.city,
      email: form.email,
      englishGoal: form.englishGoal,
      estimatedLevel: form.estimatedLevel,
      fullName: form.fullName,
      guardianName: form.guardianName,
      installmentsTotal: form.installmentsTotal,
      intendedTime: form.intendedTime,
      intendedWeekdayMask: form.intendedWeekdayMask,
      notes: form.notes,
      paymentDay: form.paymentDay,
      paymentMethod: form.paymentMethod,
      phone: form.phone,
      status: form.status,
      tuitionAmount: form.tuitionAmount,
      unit: form.unit,
    };

    startTransition(async () => {
      const result = await createStudentPreRegistration(payload);

      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message);
        return;
      }

      setForm(createDefaultCreateState(initialUnit));
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <section className="ava-soft-card overflow-hidden rounded-2xl border p-0">
      <div className="border-b border-primary/10 bg-white/82 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <UserPlus aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/55">
                Secretaria
              </p>
              <h3 className="mt-1 text-xl font-semibold text-primary">
                Novo pre-cadastro
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Cadastre o interessado depois do contato pelo WhatsApp. Isso
                ainda nao cria login, financeiro ou agenda.
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-primary/12 bg-[#fbf7ff] px-3 py-1 text-xs font-bold uppercase text-primary/70">
            Controle interno
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 p-5" noValidate>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold text-primary">
            Nome
            <Input
              value={form.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.fullName)}
              placeholder="Nome completo"
              className="bg-white"
            />
            {errors.fullName ? (
              <span className="text-xs font-medium text-destructive">
                {errors.fullName}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold text-primary">
            Telefone
            <Input
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.phone)}
              placeholder="(44) 99999-9999"
              className="bg-white"
            />
            {errors.phone ? (
              <span className="text-xs font-medium text-destructive">
                {errors.phone}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold text-primary">
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.email)}
              placeholder="Opcional"
              className="bg-white"
            />
            {errors.email ? (
              <span className="text-xs font-medium text-destructive">
                {errors.email}
              </span>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">
                Necessario apenas para criar login depois.
              </span>
            )}
          </label>

          <label className="grid gap-1 text-sm font-semibold text-primary">
            Nascimento
            <Input
              type="date"
              value={form.birthDate}
              onChange={(event) => setField("birthDate", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.birthDate)}
              className="bg-white"
            />
            {errors.birthDate ? (
              <span className="text-xs font-medium text-destructive">
                {errors.birthDate}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold text-primary">
            Responsavel
            <Input
              value={form.guardianName}
              onChange={(event) => setField("guardianName", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.guardianName)}
              placeholder="Opcional"
              className="bg-white"
            />
            {errors.guardianName ? (
              <span className="text-xs font-medium text-destructive">
                {errors.guardianName}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold text-primary">
            Cidade
            <Input
              value={form.city}
              onChange={(event) => setField("city", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.city)}
              placeholder="Cidade/unidade"
              className="bg-white"
            />
            {errors.city ? (
              <span className="text-xs font-medium text-destructive">
                {errors.city}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold text-primary">
            Unidade
            <select
              value={form.unit}
              onChange={(event) =>
                setField("unit", event.target.value as FinancialUnit)
              }
              disabled={isPending}
              aria-invalid={Boolean(errors.unit)}
              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="IVATE">{unitLabels.IVATE}</option>
              <option value="DOURADINA">{unitLabels.DOURADINA}</option>
            </select>
            {errors.unit ? (
              <span className="text-xs font-medium text-destructive">
                {errors.unit}
              </span>
            ) : null}
          </label>

          {viewerRole === "ADMIN" ? (
            <label className="grid gap-1 text-sm font-semibold text-primary">
              Teacher responsavel
              <select
                value={form.assignedTeacherProfileId}
                onChange={(event) =>
                  setField("assignedTeacherProfileId", event.target.value)
                }
                disabled={isPending}
                aria-invalid={Boolean(errors.assignedTeacherProfileId)}
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Sem teacher definida</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.label}
                  </option>
                ))}
              </select>
              {errors.assignedTeacherProfileId ? (
                <span className="text-xs font-medium text-destructive">
                  {errors.assignedTeacherProfileId}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <label className="grid gap-1 text-sm font-semibold text-primary">
            Objetivo com ingles
            <Textarea
              value={form.englishGoal}
              onChange={(event) => setField("englishGoal", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.englishGoal)}
              placeholder="Ex: conversacao, escola, viagem, trabalho..."
              className="min-h-28 resize-y bg-white"
            />
            {errors.englishGoal ? (
              <span className="text-xs font-medium text-destructive">
                {errors.englishGoal}
              </span>
            ) : null}
          </label>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
            <label className="grid gap-1 text-sm font-semibold text-primary">
              Nivel estimado
              <Input
                value={form.estimatedLevel}
                onChange={(event) =>
                  setField("estimatedLevel", event.target.value)
                }
                disabled={isPending}
                aria-invalid={Boolean(errors.estimatedLevel)}
                placeholder="Iniciante, basico..."
                className="bg-white"
              />
              {errors.estimatedLevel ? (
                <span className="text-xs font-medium text-destructive">
                  {errors.estimatedLevel}
                </span>
              ) : null}
            </label>

            <label className="grid gap-1 text-sm font-semibold text-primary">
              Status inicial
              <select
                value={form.status}
                onChange={(event) =>
                  setField("status", event.target.value as CreateStatus)
                }
                disabled={isPending}
                aria-invalid={Boolean(errors.status)}
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {createStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusMeta[status].label}
                  </option>
                ))}
              </select>
              {errors.status ? (
                <span className="text-xs font-medium text-destructive">
                  {errors.status}
                </span>
              ) : null}
            </label>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-xl border border-primary/10 bg-white/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarClock aria-hidden="true" className="size-4" />
              Agenda pretendida
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/55">
                  Dias
                </span>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {weekdays.map((weekday) => {
                    const checked =
                      (form.intendedWeekdayMask & (1 << weekday.value)) !== 0;

                    return (
                      <button
                        key={weekday.value}
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleWeekday(weekday.value)}
                        className={cn(
                          "h-10 rounded-lg border text-xs font-bold transition",
                          checked
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-primary/12 bg-white text-primary/70 hover:bg-primary/8",
                        )}
                      >
                        {weekday.label}
                      </button>
                    );
                  })}
                </div>
                {errors.intendedWeekdayMask ? (
                  <span className="mt-1 block text-xs font-medium text-destructive">
                    {errors.intendedWeekdayMask}
                  </span>
                ) : null}
              </div>
              <label className="grid gap-1 text-sm font-semibold text-primary">
                Horario
                <Input
                  value={form.intendedTime}
                  onChange={(event) =>
                    setField("intendedTime", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.intendedTime)}
                  placeholder="Ex: 14:00"
                  className="bg-white"
                />
                {errors.intendedTime ? (
                  <span className="text-xs font-medium text-destructive">
                    {errors.intendedTime}
                  </span>
                ) : null}
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-primary/10 bg-white/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <WalletCards aria-hidden="true" className="size-4" />
              Combinado de pagamento
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-sm font-semibold text-primary">
                Mensalidade
                <Input
                  value={form.tuitionAmount}
                  onChange={(event) =>
                    setField("tuitionAmount", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.tuitionAmount)}
                  placeholder="0,00"
                  className="bg-white"
                />
                {errors.tuitionAmount ? (
                  <span className="text-xs font-medium text-destructive">
                    {errors.tuitionAmount}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1 text-sm font-semibold text-primary">
                Dia paga
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.paymentDay}
                  onChange={(event) =>
                    setField("paymentDay", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.paymentDay)}
                  placeholder="5"
                  className="bg-white"
                />
                {errors.paymentDay ? (
                  <span className="text-xs font-medium text-destructive">
                    {errors.paymentDay}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1 text-sm font-semibold text-primary">
                Forma
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setField("paymentMethod", event.target.value as PaymentMethod)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.paymentMethod)}
                  className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.paymentMethod ? (
                  <span className="text-xs font-medium text-destructive">
                    {errors.paymentMethod}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1 text-sm font-semibold text-primary">
                Parcelas
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.installmentsTotal}
                  onChange={(event) =>
                    setField("installmentsTotal", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.installmentsTotal)}
                  placeholder="Opcional"
                  className="bg-white"
                />
                {errors.installmentsTotal ? (
                  <span className="text-xs font-medium text-destructive">
                    {errors.installmentsTotal}
                  </span>
                ) : null}
              </label>
            </div>
          </div>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-primary">
          Observacoes
          <Textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(errors.notes)}
            placeholder="Detalhes da conversa, preferencias e combinados internos."
            className="min-h-24 resize-y bg-white"
          />
          {errors.notes ? (
            <span className="text-xs font-medium text-destructive">
              {errors.notes}
            </span>
          ) : null}
        </label>

        <div className="flex flex-col gap-3 border-t border-primary/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {message ? (
            <p
              className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground"
              role="status"
            >
              {message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Duplicidade por telefone normalizado e email e bloqueada no servidor.
            </p>
          )}
          <Button type="submit" disabled={isPending} className="h-11 sm:min-w-44">
            {isPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <ClipboardCheck data-icon="inline-start" />
            )}
            Salvar pre-cadastro
          </Button>
        </div>
      </form>
    </section>
  );
}

export function StudentPreRegistrationReviewPanel({
  activeStatus,
  basePath,
  requests,
  statusCounts,
  teacherOptions,
  unitFilter = "all",
  viewerRole,
}: StudentPreRegistrationReviewPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const statusOptions = useMemo(() => allStatusOptions, []);
  const activeMeta = statusMeta[activeStatus];
  const ActiveIcon = activeMeta.icon;
  const trimmedSearchTerm = searchTerm.trim();
  const isSearching = trimmedSearchTerm.length > 0;
  const visibleRequests = useMemo(() => {
    if (!isSearching) {
      return requests.filter((request) => request.status === activeStatus);
    }

    return requests
      .map((request) => ({
        match: scoreRequestForSearch(request, trimmedSearchTerm),
        request,
      }))
      .filter(({ match }) => match.score > 0)
      .sort((left, right) => {
        if (left.match.exact !== right.match.exact) {
          return left.match.exact ? -1 : 1;
        }

        if (left.match.score !== right.match.score) {
          return right.match.score - left.match.score;
        }

        return (
          new Date(right.request.createdAt).getTime() -
          new Date(left.request.createdAt).getTime()
        );
      })
      .map(({ request }) => request);
  }, [activeStatus, isSearching, requests, trimmedSearchTerm]);
  const visibleRequestsLabel =
    visibleRequests.length === 1
      ? "1 pre-cadastro encontrado"
      : `${visibleRequests.length} pre-cadastros encontrados`;
  const totalActive =
    statusCounts.PENDING +
    statusCounts.CONTACTED +
    statusCounts.WAITING_PAYMENT +
    statusCounts.READY_TO_CONVERT;
  const reviewSteps = [
    { icon: UserPlus, label: "Cadastrar interessado" },
    { icon: MessageSquareText, label: "Acompanhar conversa" },
    { icon: UserCheck, label: "Tornar aluno" },
  ];
  const getStatusHref = (status: PreRegistrationStatus) =>
    withSecretariaUnitParam(
      `${basePath}?task=aceitar-alunos&preStatus=${status}`,
      unitFilter,
    );
  const initialCreateUnit = unitFilter === "all" ? "IVATE" : unitFilter;

  return (
    <div className="flex flex-col gap-5">
      <section className="ava-soft-card overflow-hidden rounded-2xl border p-0">
        <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,239,255,0.82))] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex max-w-3xl gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white/78 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
                  <Store aria-hidden="true" className="size-3.5" />
                  Secretaria
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal text-primary">
                  Pre-cadastros
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cadastre interessados manualmente, salve unidade, agenda
                  pretendida e combinado de pagamento sem criar aluno no AVA ate
                  clicar em Tornar aluno.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[24rem]">
              <div className="rounded-lg border border-primary/10 bg-white/82 p-3 shadow-sm shadow-primary/5">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Fila ativa
                </p>
                <strong className="mt-2 block text-2xl font-semibold leading-none text-primary">
                  {totalActive}
                </strong>
                <span className="mt-2 block text-xs text-muted-foreground">
                  sem criar acesso Student
                </span>
              </div>
              <SummaryMetric status="READY_TO_CONVERT" value={statusCounts.READY_TO_CONVERT} />
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

          <div className="mt-5 rounded-xl border border-primary/10 bg-white/82 p-3 shadow-sm shadow-primary/5">
            <label className="grid gap-2 text-sm font-semibold text-primary">
              Busca inteligente
              <span className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, telefone, email ou documento..."
                  className="h-11 bg-white pl-10"
                />
              </span>
            </label>
            <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{visibleRequestsLabel}</span>
              <span>
                {isSearching
                  ? "Busca em todos os status autorizados, com exatos primeiro."
                  : `Mostrando status: ${activeMeta.label}.`}
              </span>
            </div>
          </div>
        </div>

        <nav
          aria-label="Filtrar pre-cadastros por status"
          className="grid gap-1 bg-white/70 p-2 sm:grid-cols-2 xl:grid-cols-6"
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
                  href={getStatusHref(status)}
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

      <CreatePreRegistrationForm
        initialUnit={initialCreateUnit}
        teacherOptions={teacherOptions}
        viewerRole={viewerRole}
      />

      {visibleRequests.length === 0 ? (
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
              {isSearching
                ? "Nenhum pr\u00e9-cadastro encontrado."
                : activeMeta.emptyTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isSearching
                ? "Tente parte do nome, telefone sem mascara, email, documento, cidade, unidade ou status."
                : activeMeta.emptyDescription}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            <UsersRound aria-hidden="true" className="size-3.5" />
            {visibleRequestsLabel}
          </div>
          {activeStatus !== "PENDING" && statusCounts.PENDING > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={getStatusHref("PENDING")}>
                Ver novos
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleRequests.map((request) => {
            const isConverted = Boolean(
              request.convertedUserName ||
                request.convertedStudentProfileId ||
                request.convertedFinancialStudentId ||
                request.convertedAgendaStudentId ||
                request.status === "APPROVED",
            );
            const canAccept = !isConverted && request.status !== "REJECTED";
            const canReject =
              !isConverted && request.status !== "REJECTED";
            const receivedDate =
              formatDate(request.createdAt) ?? "Data nao informada";
            const personInitial =
              request.fullName.trim().charAt(0).toUpperCase() || "A";
            const schedule = [
              formatWeekdayMask(request.intendedWeekdayMask),
              request.intendedTime,
            ]
              .filter(Boolean)
              .join(" - ");
            const paymentSummary = [
              formatCurrency(request.tuitionCents),
              request.paymentDay ? `dia ${request.paymentDay}` : null,
              request.paymentMethod
                ? paymentMethodLabels[request.paymentMethod as PaymentMethod] ??
                  request.paymentMethod
                : null,
              request.installmentsTotal
                ? `${request.installmentsTotal} parcela(s)`
                : null,
            ]
              .filter(Boolean)
              .join(" / ");

            return (
              <article
                key={request.id}
                className="ava-soft-card overflow-hidden rounded-2xl border"
              >
                <div className="border-b border-primary/10 bg-primary/[0.03] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-white text-lg font-semibold text-primary shadow-sm">
                        {personInitial}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={request.status} />
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/80 px-2.5 py-1 text-xs font-bold text-primary/75">
                            <Store aria-hidden="true" className="size-3.5" />
                            {unitLabels[request.unit]}
                          </span>
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
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {request.englishGoal}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:min-w-80">
                      <ContactCard icon={Phone} label="Telefone" value={request.phone} />
                      <ContactCard icon={Mail} label="Email" value={request.email} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
                  <div className="flex flex-col gap-4">
                    <section className="rounded-xl border border-primary/10 bg-white/70 p-4 shadow-sm shadow-primary/5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Sparkles aria-hidden="true" className="size-4" />
                        Dados do interessado
                      </div>
                      <dl className="grid gap-3 md:grid-cols-2">
                        <DetailItem
                          icon={Sparkles}
                          label="Objetivo com ingles"
                          value={request.englishGoal}
                          wide
                        />
                        <DetailItem
                          icon={MapPin}
                          label="Cidade"
                          value={request.city ?? request.address}
                        />
                        <DetailItem
                          icon={CalendarClock}
                          label="Nascimento"
                          value={formatDate(request.birthDate)}
                        />
                        <DetailItem
                          icon={UserRound}
                          label="Responsavel"
                          value={request.guardianName}
                        />
                        <DetailItem
                          icon={ShieldCheck}
                          label="Documento"
                          value={request.guardianDocument}
                        />
                        <DetailItem
                          icon={Phone}
                          label="Telefone responsavel"
                          value={request.guardianPhone}
                        />
                        <DetailItem
                          icon={MessageSquareText}
                          label="Observacoes"
                          value={request.notes}
                          wide
                        />
                      </dl>
                    </section>

                    <section className="grid gap-3 md:grid-cols-3">
                      <DetailItem
                        icon={UserCheck}
                        label="Teacher"
                        value={
                          request.assignedTeacherName
                            ? `${request.assignedTeacherName}${
                                request.assignedTeacherEmail
                                  ? ` - ${request.assignedTeacherEmail}`
                                  : ""
                              }`
                            : viewerRole === "TEACHER"
                              ? "Voce"
                              : null
                        }
                        tone="success"
                      />
                      <DetailItem
                        icon={CalendarClock}
                        label="Agenda pretendida"
                        value={schedule || null}
                        tone="info"
                      />
                      <DetailItem
                        icon={WalletCards}
                        label="Pagamento combinado"
                        value={paymentSummary || null}
                        tone="warning"
                      />
                      <DetailItem
                        icon={Banknote}
                        label="Mensalidade"
                        value={formatCurrency(request.tuitionCents)}
                      />
                      <DetailItem
                        icon={CreditCard}
                        label="Forma"
                        value={
                          request.paymentMethod
                            ? paymentMethodLabels[
                                request.paymentMethod as PaymentMethod
                              ] ?? request.paymentMethod
                            : null
                        }
                      />
                      <DetailItem
                        icon={ClipboardCheck}
                        label="Nivel estimado"
                        value={request.estimatedLevel}
                      />
                    </section>

                    <section className="rounded-xl border border-primary/10 bg-white/70 p-4 shadow-sm shadow-primary/5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                        Historico e auditoria
                      </div>
                      <dl className="grid gap-3 md:grid-cols-2">
                        <DetailItem
                          icon={UserRound}
                          label="Criado por"
                          value={
                            request.createdByName
                              ? `${request.createdByName}${
                                  request.createdByRole
                                    ? ` - ${request.createdByRole}`
                                    : ""
                                }`
                              : null
                          }
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
                        />
                        <DetailItem
                          icon={UserRound}
                          label="StudentProfile ID"
                          value={request.convertedStudentProfileId}
                        />
                        <DetailItem
                          icon={WalletCards}
                          label="Financeiro ID"
                          value={request.convertedFinancialStudentId}
                        />
                        <DetailItem
                          icon={CalendarClock}
                          label="Agenda ID"
                          value={request.convertedAgendaStudentId}
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
                          Tornar aluno
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Cria conta STUDENT, perfil do aluno, vinculo teacher,
                          financeiro e agenda em uma transaction.
                        </p>
                      </div>
                    </div>

                    {canAccept ? (
                      <AcceptForm
                        request={request}
                        teacherOptions={teacherOptions}
                        viewerRole={viewerRole}
                      />
                    ) : (
                      <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Este pre-cadastro ja saiu da fila de conversao.
                        {isConverted
                          ? " Os IDs linkados ficam no historico ao lado."
                          : ""}
                      </p>
                    )}

                    <div className="grid gap-3 border-t border-primary/10 pt-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                        Acompanhamento
                      </div>
                      {request.status !== "CONTACTED" &&
                      request.status !== "APPROVED" &&
                      request.status !== "REJECTED" ? (
                        <StatusButton requestId={request.id} status="CONTACTED" />
                      ) : null}
                      {request.status !== "WAITING_PAYMENT" &&
                      request.status !== "APPROVED" &&
                      request.status !== "REJECTED" ? (
                        <StatusButton
                          requestId={request.id}
                          status="WAITING_PAYMENT"
                        />
                      ) : null}
                      {request.status !== "READY_TO_CONVERT" &&
                      request.status !== "APPROVED" &&
                      request.status !== "REJECTED" ? (
                        <StatusButton
                          requestId={request.id}
                          status="READY_TO_CONVERT"
                        />
                      ) : null}
                      {canReject ? <RejectForm requestId={request.id} /> : null}
                      {!canAccept && !canReject ? (
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
