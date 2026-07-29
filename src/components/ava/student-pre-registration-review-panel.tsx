"use client";

import {
  AlertCircle,
  Banknote,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  CreditCard,
  ListChecks,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
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
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  acceptStudentPreRegistration,
  createStudentPreRegistration,
  updateStudentPreRegistration,
} from "@/app/ava/pre-registrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { isOpenPreRegistrationStatus } from "@/lib/pre-registration-queue";
import type { SecretariaUnitFilter } from "@/lib/secretaria-unit-filter";
import type {
  SecretariaPreRegistrationInput,
  SecretariaPreRegistrationUpdateInput,
} from "@/lib/validations/pre-registration";
import { cn } from "@/lib/utils";

export type PreRegistrationStatus =
  | "PENDING"
  | "CONTACTED"
  | "WAITING_PAYMENT"
  | "READY_TO_CONVERT"
  | "APPROVED"
  | "REJECTED";

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
  paymentMethod: PaymentMethod | "";
  phone: string;
  tuitionAmount: string;
  unit: FinancialUnit;
};

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
  tuitionAmount: "",
  unit: "IVATE",
};

const preRegistrationFieldClassName =
  "grid min-w-0 gap-1.5 overflow-hidden rounded-xl border border-primary/10 bg-white/88 p-3 text-sm font-semibold text-primary shadow-sm shadow-primary/5 transition focus-within:border-primary/35 focus-within:bg-white focus-within:shadow-md focus-within:shadow-primary/10";

const preRegistrationInputClassName =
  "h-11 w-full min-w-0 max-w-full border-primary/15 bg-white text-sm font-semibold text-primary shadow-inner shadow-primary/[0.03] placeholder:text-muted-foreground/65 focus-visible:border-primary/35 focus-visible:ring-primary/20";

const preRegistrationSelectClassName =
  "h-11 w-full min-w-0 max-w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-inner shadow-primary/[0.03] outline-none transition focus-visible:border-primary/35 focus-visible:ring-[3px] focus-visible:ring-primary/20";

const preRegistrationTextareaClassName =
  "w-full min-w-0 max-w-full border-primary/15 bg-white text-sm font-semibold text-primary shadow-inner shadow-primary/[0.03] placeholder:text-muted-foreground/65 focus-visible:border-primary/35 focus-visible:ring-primary/20";

const preRegistrationHelpClassName =
  "text-xs font-medium leading-5 text-muted-foreground";

const preRegistrationErrorClassName =
  "text-xs font-semibold leading-5 text-destructive";

const formSectionToneClasses = {
  amber: {
    body: "from-amber-50/80 via-white to-orange-50/60",
    header: "border-amber-200/70 bg-amber-50/75 text-amber-900",
    icon: "bg-amber-500 text-white shadow-amber-500/25",
    shell: "border-amber-200/70",
  },
  emerald: {
    body: "from-emerald-50/80 via-white to-teal-50/60",
    header: "border-emerald-200/70 bg-emerald-50/75 text-emerald-900",
    icon: "bg-emerald-600 text-white shadow-emerald-600/25",
    shell: "border-emerald-200/70",
  },
  rose: {
    body: "from-rose-50/80 via-white to-fuchsia-50/55",
    header: "border-rose-200/70 bg-rose-50/75 text-rose-900",
    icon: "bg-rose-500 text-white shadow-rose-500/25",
    shell: "border-rose-200/70",
  },
  sky: {
    body: "from-sky-50/85 via-white to-cyan-50/60",
    header: "border-sky-200/70 bg-sky-50/75 text-sky-900",
    icon: "bg-sky-600 text-white shadow-sky-600/25",
    shell: "border-sky-200/70",
  },
  violet: {
    body: "from-[#fbf5ff] via-white to-[#fff4ec]",
    header: "border-primary/15 bg-primary/8 text-primary",
    icon: "bg-primary text-primary-foreground shadow-primary/25",
    shell: "border-primary/15",
  },
} satisfies Record<
  "amber" | "emerald" | "rose" | "sky" | "violet",
  { body: string; header: string; icon: string; shell: string }
>;

function FormSectionCard({
  children,
  className,
  description,
  eyebrow,
  icon: Icon,
  title,
  tone = "violet",
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow: string;
  icon: typeof UserRound;
  title: string;
  tone?: keyof typeof formSectionToneClasses;
}) {
  const toneClasses = formSectionToneClasses[tone];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-white/90 shadow-sm shadow-primary/5",
        toneClasses.shell,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 border-b px-4 py-3",
          toneClasses.header,
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg",
            toneClasses.icon,
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] opacity-70">
            {eyebrow}
          </p>
          <h4 className="mt-0.5 text-base font-black tracking-normal">
            {title}
          </h4>
          {description ? (
            <p className="mt-1 text-xs font-medium leading-5 opacity-75">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className={cn("grid gap-3 bg-gradient-to-br p-4", toneClasses.body)}>
        {children}
      </div>
    </section>
  );
}

function createDefaultCreateState(unit: FinancialUnit = "IVATE"): CreateFormState {
  return {
    ...defaultCreateState,
    unit,
  };
}

function createFormStateFromRequest(
  request: StudentPreRegistrationReviewRow,
): CreateFormState {
  const paymentMethod = Object.hasOwn(
    paymentMethodLabels,
    request.paymentMethod ?? "",
  )
    ? (request.paymentMethod as PaymentMethod)
    : "";

  return {
    assignedTeacherProfileId: request.assignedTeacherId ?? "",
    birthDate: request.birthDate?.slice(0, 10) ?? "",
    city: request.city ?? "",
    email: request.email ?? "",
    englishGoal: request.englishGoal,
    estimatedLevel: request.estimatedLevel ?? "",
    fullName: request.fullName,
    guardianName: request.guardianName ?? "",
    installmentsTotal: request.installmentsTotal?.toString() ?? "",
    intendedTime: request.intendedTime ?? "",
    intendedWeekdayMask: request.intendedWeekdayMask,
    notes: request.notes ?? "",
    paymentDay: request.paymentDay?.toString() ?? "",
    paymentMethod,
    phone: request.phone,
    tuitionAmount:
      request.tuitionCents === null
        ? ""
        : (request.tuitionCents / 100).toFixed(2).replace(".", ","),
    unit: request.unit,
  };
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const displayDate =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0
      ? new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            12,
          ),
        )
      : date;

  return dateFormatter.format(displayDate);
}

function formatDateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return `${dateFormatter.format(date)} as ${timeFormatter.format(date)}`;
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

function buildWhatsAppContactHref(phone: string, fullName: string) {
  const phoneDigits = normalizeDigits(phone);

  if (phoneDigits.length < 10) return null;

  const internationalPhone = phoneDigits.startsWith("55")
    ? phoneDigits
    : `55${phoneDigits}`;
  const firstName = fullName.trim().split(/\s+/)[0] || "tudo bem";
  const message = `Ola, ${firstName}! Aqui e da Candy English. Podemos continuar sua conversa sobre as aulas?`;

  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
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

function ModalPortal({
  children,
  closeDisabled = false,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  closeDisabled?: boolean;
  labelledBy: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeDisabled) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const dialog = dialogRef.current;
      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          activeElement === dialog ||
          !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement || !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDisabled, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/50 p-2 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby={labelledBy}
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/15 bg-[#fefbfa] shadow-[0_24px_80px_rgba(44,19,56,0.28)] sm:max-h-[calc(100dvh-2rem)]"
      >
        {children}
      </section>
    </div>,
    document.body,
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
        "rounded-xl border bg-white/88 p-3 shadow-sm shadow-primary/5",
        wide && "md:col-span-2",
        tone === "info" && "border-sky-200 bg-sky-50/80",
        tone === "success" && "border-emerald-200 bg-emerald-50/80",
        tone === "warning" && "border-amber-200 bg-amber-50/80",
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
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white/88 p-3 shadow-sm shadow-primary/5",
        meta.accentClassName,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-current opacity-45" />
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border bg-white/80",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <strong className="text-2xl font-black leading-none">
          {value}
        </strong>
      </div>
      <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.14em] opacity-75">
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
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-primary/10 bg-white/90 px-3 py-2.5 shadow-sm shadow-primary/5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
    label: "Completar",
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
  const missingFinancialSummary = missingFinancialFields.join(", ");
  const missingAgendaSummary = missingAgendaFields.join(", ");
  const pendingAdministrativeItems = [
    hasRequiredFinancialData
      ? null
      : `financeiro: ${missingFinancialSummary}`,
    hasCompleteAgendaData ? null : `agenda: ${missingAgendaSummary}`,
  ].filter(Boolean) as string[];
  const hasAdministrativePendingData = pendingAdministrativeItems.length > 0;
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

    if (!confirmConversion) {
      items.push("confirmacao final");
    }

    return items;
  }, [
    confirmConversion,
    isEmailForLoginValid,
    isInitialPasswordValid,
  ]);
  const isReadyToConvert = missingRequirements.length === 0;
  const conversionState: ConversionFlowState = isPending
    ? "converting"
    : hasConverted
      ? "converted"
      : hasSubmissionError
        ? "error"
        : isReadyToConvert && !hasAdministrativePendingData
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
    setEmailError(null);
    setPasswordError(null);
    setTeacherError(null);
    setHasSubmissionError(false);

    startTransition(async () => {
      const result = await acceptStudentPreRegistration({
        cattyContext,
        confirmConversion,
        confirmMissingAgendaData: true,
        emailForLogin,
        initialPassword,
        requestId: request.id,
        teacherProfileIdForConversion:
          viewerRole === "ADMIN" ? teacherProfileIdForConversion : undefined,
      });

      if (!result.ok) {
        setCattyContextError(result.errors?.cattyContext ?? null);
        setConfirmError(result.errors?.confirmConversion ?? null);
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
        ) : hasAdministrativePendingData ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/75 px-3 py-2 text-xs leading-5 text-amber-900">
            Pode converter agora. Depois complete:{" "}
            {pendingAdministrativeItems.join("; ")}.
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
          {hasConverted ? "Ver resultado" : "Tornar aluno"}
        </Button>
      </div>

      {isPanelOpen ? (
        <ModalPortal
          closeDisabled={isPending}
          labelledBy={`conversion-title-${request.id}`}
          onClose={handleClosePanel}
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
                          value={statusMeta.PENDING.label}
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
                                  Faltam {missingFinancialSummary}. O aluno sera
                                  criado normalmente e o Financeiro ficara com
                                  status Completar para edicao posterior.
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
                          {!hasCompleteAgendaData && !hasConverted ? (
                            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-900">
                              <Clock3
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0"
                              />
                              <span>
                                <span className="block font-semibold">
                                  Agenda incompleta: {missingAgendaSummary}.
                                </span>
                                <span className="mt-1 block text-muted-foreground">
                                  A conversao cria o aluno na Agenda com status
                                  Completar e sem ocorrencias. Edite dias e
                                  horario depois.
                                </span>
                              </span>
                            </div>
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
                              : `Sera criado como Completar; falta ${missingFinancialSummary}.`
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
                              : "Sera criada como Completar, sem ocorrencias."
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
                                Dados administrativos ausentes ficarao como
                                Completar. Se algo falhar, a transaction cancela
                                tudo.
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
                        {missingRequirements.length === 0 &&
                        hasAdministrativePendingData &&
                        !hasConverted ? (
                          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-xs leading-5 text-sky-900">
                            Pode converter agora. Depois complete:{" "}
                            {pendingAdministrativeItems.join("; ")}.
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
                          ? hasAdministrativePendingData
                            ? "Pode converter; os pendentes ficarao como Completar."
                            : "Tudo pronto para converter."
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
        </ModalPortal>
      ) : null}
    </>
  );
}

function CreatePreRegistrationForm({
  initialUnit,
  onCreated,
  onUpdated,
  request,
  teacherOptions,
  viewerRole,
}: {
  initialUnit: FinancialUnit;
  onCreated?: (message: string) => void;
  onUpdated?: (message: string) => void;
  request?: StudentPreRegistrationReviewRow;
  teacherOptions: PreRegistrationTeacherOption[];
  viewerRole: "ADMIN" | "TEACHER";
}) {
  const router = useRouter();
  const isEditing = Boolean(request);
  const [form, setForm] = useState<CreateFormState>(() =>
    request
      ? createFormStateFromRequest(request)
      : createDefaultCreateState(initialUnit),
  );
  const [errors, setErrors] = useState<
    Partial<
      Record<
        keyof SecretariaPreRegistrationInput | "requestId",
        string
      >
    >
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
      paymentMethod: form.paymentMethod || undefined,
      phone: form.phone,
      status: "PENDING",
      tuitionAmount: form.tuitionAmount,
      unit: form.unit,
    };

    startTransition(async () => {
      const result = request
        ? await updateStudentPreRegistration({
            ...payload,
            requestId: request.id,
          } satisfies SecretariaPreRegistrationUpdateInput)
        : await createStudentPreRegistration(payload);

      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message);
        return;
      }

      if (request) {
        setMessage(result.message);
        onUpdated?.(result.message);
        return;
      }

      setForm(createDefaultCreateState(initialUnit));
      setMessage(result.message);
      router.refresh();
      onCreated?.(result.message);
    });
  }

  return (
    <section className="ava-soft-card overflow-hidden rounded-2xl border border-primary/15 bg-white/92 p-0 shadow-lg shadow-primary/10">
      <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(255,247,254,0.98),rgba(244,251,255,0.9),rgba(255,244,236,0.86))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#412a4c,#7c3aed,#e57cd8)] text-white shadow-lg shadow-primary/25">
              <UserPlus aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary/55">
                Secretaria
              </p>
              <h3 className="mt-1 text-2xl font-black text-primary">
                {isEditing ? "Editar pre-cadastro" : "Novo pre-cadastro"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isEditing
                  ? "Atualize os dados antes de transformar o interessado em aluno."
                  : "Cadastre o interessado depois do contato pelo WhatsApp. Isso ainda nao cria login, financeiro ou agenda."}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-primary/12 bg-white/88 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-primary/70 shadow-sm">
            Controle interno
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 bg-[#fffbff] p-4 sm:p-5"
        noValidate
      >
        <FormSectionCard
          description="Dados para identificar o interessado, contato e polo antes da conversa virar aluno."
          eyebrow="Primeira etapa"
          icon={UserRound}
          title="Dados do interessado"
          tone="violet"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className={preRegistrationFieldClassName}>
              <span>Nome</span>
              <Input
                value={form.fullName}
                onChange={(event) => setField("fullName", event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.fullName)}
                placeholder="Nome completo"
                className={preRegistrationInputClassName}
              />
              {errors.fullName ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.fullName}
                </span>
              ) : null}
            </label>

            <label className={preRegistrationFieldClassName}>
              <span>Telefone</span>
              <Input
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.phone)}
                placeholder="(44) 99999-9999"
                className={preRegistrationInputClassName}
              />
              {errors.phone ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.phone}
                </span>
              ) : null}
            </label>

            <label className={preRegistrationFieldClassName}>
              <span>Email</span>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.email)}
                placeholder="Opcional"
                className={preRegistrationInputClassName}
              />
              {errors.email ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.email}
                </span>
              ) : (
                <span className={preRegistrationHelpClassName}>
                  Necessario apenas para criar login depois.
                </span>
              )}
            </label>

            <label className={preRegistrationFieldClassName}>
              <span>Nascimento</span>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(event) => setField("birthDate", event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.birthDate)}
                className={preRegistrationInputClassName}
              />
              {errors.birthDate ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.birthDate}
                </span>
              ) : null}
            </label>

            <label className={preRegistrationFieldClassName}>
              <span>Responsavel</span>
              <Input
                value={form.guardianName}
                onChange={(event) =>
                  setField("guardianName", event.target.value)
                }
                disabled={isPending}
                aria-invalid={Boolean(errors.guardianName)}
                placeholder="Opcional"
                className={preRegistrationInputClassName}
              />
              {errors.guardianName ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.guardianName}
                </span>
              ) : null}
            </label>

            <label className={preRegistrationFieldClassName}>
              <span>Cidade</span>
              <Input
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.city)}
                placeholder="Cidade/unidade"
                className={preRegistrationInputClassName}
              />
              {errors.city ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.city}
                </span>
              ) : null}
            </label>

            <label className={preRegistrationFieldClassName}>
              <span>Unidade</span>
              <select
                value={form.unit}
                onChange={(event) =>
                  setField("unit", event.target.value as FinancialUnit)
                }
                disabled={isPending}
                aria-invalid={Boolean(errors.unit)}
                className={preRegistrationSelectClassName}
              >
                <option value="IVATE">{unitLabels.IVATE}</option>
                <option value="DOURADINA">{unitLabels.DOURADINA}</option>
              </select>
              {errors.unit ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.unit}
                </span>
              ) : null}
            </label>

            {viewerRole === "ADMIN" ? (
              <label className={preRegistrationFieldClassName}>
                <span>Teacher responsavel</span>
                <select
                  value={form.assignedTeacherProfileId}
                  onChange={(event) =>
                    setField("assignedTeacherProfileId", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.assignedTeacherProfileId)}
                  className={preRegistrationSelectClassName}
                >
                  <option value="">Sem teacher definida</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.label}
                    </option>
                  ))}
                </select>
                {errors.assignedTeacherProfileId ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.assignedTeacherProfileId}
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>
        </FormSectionCard>

        <FormSectionCard
          description="Resumo da conversa para a equipe saber o que o interessado busca. Todo novo registro entra na fila como Novo."
          eyebrow="Conversa"
          icon={Sparkles}
          title="Objetivo e nivel"
          tone="sky"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <label className={preRegistrationFieldClassName}>
              <span>Objetivo com ingles</span>
              <Textarea
                value={form.englishGoal}
                onChange={(event) =>
                  setField("englishGoal", event.target.value)
                }
                disabled={isPending}
                aria-invalid={Boolean(errors.englishGoal)}
                placeholder="Ex: conversacao, escola, viagem, trabalho..."
                className={cn(
                  preRegistrationTextareaClassName,
                  "min-h-28 resize-y",
                )}
              />
              {errors.englishGoal ? (
                <span className={preRegistrationErrorClassName}>
                  {errors.englishGoal}
                </span>
              ) : null}
            </label>

            <div className="grid content-start gap-3">
              <label className={preRegistrationFieldClassName}>
                <span>Nivel estimado</span>
                <Input
                  value={form.estimatedLevel}
                  onChange={(event) =>
                    setField("estimatedLevel", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.estimatedLevel)}
                  placeholder="Iniciante, basico..."
                  className={preRegistrationInputClassName}
                />
                {errors.estimatedLevel ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.estimatedLevel}
                  </span>
                ) : null}
              </label>

              <div className="flex min-w-0 items-start gap-3 rounded-xl border border-primary/15 bg-primary/8 p-3 text-primary shadow-sm shadow-primary/5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <UserRound aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-primary/60">
                    Status ao salvar
                  </p>
                  <p className="mt-1 text-sm font-black">Novo</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                    A situacao pode ser atualizada depois, dentro do cadastro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FormSectionCard>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <FormSectionCard
            description="Dias e horario pretendidos para usar na conversao para agenda."
            eyebrow="Agenda"
            icon={CalendarClock}
            title="Agenda pretendida"
            tone="amber"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
              <div className="rounded-xl border border-amber-200/70 bg-white/88 p-3 shadow-sm shadow-amber-500/5">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-amber-900/70">
                  Dias
                </span>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
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
                          "h-10 rounded-lg border text-xs font-black transition hover:-translate-y-0.5 disabled:opacity-60",
                          checked
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "border-amber-200 bg-white text-primary/70 hover:bg-amber-50",
                        )}
                      >
                        {weekday.label}
                      </button>
                    );
                  })}
                </div>
                {errors.intendedWeekdayMask ? (
                  <span className={cn("mt-1 block", preRegistrationErrorClassName)}>
                    {errors.intendedWeekdayMask}
                  </span>
                ) : null}
              </div>
              <label className={preRegistrationFieldClassName}>
                <span>Horario</span>
                <Input
                  value={form.intendedTime}
                  onChange={(event) =>
                    setField("intendedTime", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.intendedTime)}
                  placeholder="Ex: 14:00"
                  className={preRegistrationInputClassName}
                />
                {errors.intendedTime ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.intendedTime}
                  </span>
                ) : null}
              </label>
            </div>
          </FormSectionCard>

          <FormSectionCard
            description="Combinado financeiro usado depois para criar o aluno financeiro."
            eyebrow="Pagamento"
            icon={WalletCards}
            title="Combinado de pagamento"
            tone="emerald"
          >
            <div className="grid gap-3 md:grid-cols-4">
              <label className={preRegistrationFieldClassName}>
                <span>Mensalidade</span>
                <Input
                  value={form.tuitionAmount}
                  onChange={(event) =>
                    setField("tuitionAmount", event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.tuitionAmount)}
                  placeholder="0,00"
                  className={preRegistrationInputClassName}
                />
                {errors.tuitionAmount ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.tuitionAmount}
                  </span>
                ) : null}
              </label>
              <label className={preRegistrationFieldClassName}>
                <span>Dia paga</span>
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
                  className={preRegistrationInputClassName}
                />
                {errors.paymentDay ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.paymentDay}
                  </span>
                ) : null}
              </label>
              <label className={preRegistrationFieldClassName}>
                <span>Forma</span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setField(
                      "paymentMethod",
                      event.target.value as PaymentMethod | "",
                    )
                  }
                  disabled={isPending}
                  aria-invalid={Boolean(errors.paymentMethod)}
                  className={preRegistrationSelectClassName}
                >
                  <option value="">Nao informada</option>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.paymentMethod ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.paymentMethod}
                  </span>
                ) : null}
              </label>
              <label className={preRegistrationFieldClassName}>
                <span>Parcelas</span>
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
                  className={preRegistrationInputClassName}
                />
                {errors.installmentsTotal ? (
                  <span className={preRegistrationErrorClassName}>
                    {errors.installmentsTotal}
                  </span>
                ) : null}
              </label>
            </div>
          </FormSectionCard>
        </div>

        <FormSectionCard
          description="Notas internas ajudam na continuidade da conversa sem criar aluno ainda."
          eyebrow="Registro interno"
          icon={MessageSquareText}
          title="Observacoes internas"
          tone="rose"
        >
          <label className={preRegistrationFieldClassName}>
            <span>Observacoes</span>
            <Textarea
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(errors.notes)}
              placeholder="Detalhes da conversa, preferencias e combinados internos."
              className={cn(
                preRegistrationTextareaClassName,
                "min-h-24 resize-y",
              )}
            />
            {errors.notes ? (
              <span className={preRegistrationErrorClassName}>
                {errors.notes}
              </span>
            ) : null}
          </label>
        </FormSectionCard>

        <div className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-white/92 p-4 shadow-sm shadow-primary/5 sm:flex-row sm:items-center sm:justify-between">
          {message ? (
            <p
              className="rounded-lg border border-primary/10 bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
              role="status"
            >
              {message}
            </p>
          ) : (
            <p className="inline-flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-emerald-600"
              />
              Duplicidade por telefone normalizado e email e bloqueada no
              servidor.
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 shadow-lg shadow-primary/20 sm:min-w-48"
          >
            {isPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <ClipboardCheck data-icon="inline-start" />
            )}
            {isEditing ? "Salvar alteracoes" : "Salvar pre-cadastro"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function StudentPreRegistrationReviewPanel({
  requests,
  teacherOptions,
  unitFilter = "all",
  viewerRole,
}: StudentPreRegistrationReviewPanelProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"create" | "list">("create");
  const [editingRequest, setEditingRequest] =
    useState<StudentPreRegistrationReviewRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const trimmedSearchTerm = searchTerm.trim();
  const isSearching = trimmedSearchTerm.length > 0;
  const openRequests = useMemo(
    () =>
      requests.filter((request) =>
        isOpenPreRegistrationStatus(request.status),
      ),
    [requests],
  );
  const visibleRequests = useMemo(() => {
    if (!isSearching) {
      return [...openRequests].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    }

    return openRequests
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
  }, [isSearching, openRequests, trimmedSearchTerm]);
  const visibleRequestsLabel =
    visibleRequests.length === 1
      ? "1 pre-cadastro encontrado"
      : `${visibleRequests.length} pre-cadastros encontrados`;
  const totalSaved = openRequests.length;
  const initialCreateUnit = unitFilter === "all" ? "IVATE" : unitFilter;

  return (
    <div className="flex flex-col gap-5">
      <section className="ava-soft-card overflow-hidden rounded-2xl border border-primary/15 bg-white/92 p-0 shadow-lg shadow-primary/10">
        <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(255,247,254,0.98),rgba(244,251,255,0.92),rgba(255,241,229,0.88))] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex max-w-3xl gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#412a4c,#7c3aed,#f97316)] text-white shadow-lg shadow-primary/25">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-primary shadow-sm">
                  <Store aria-hidden="true" className="size-3.5" />
                  Secretaria
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-normal text-primary">
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
              <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white/90 p-3 shadow-sm shadow-primary/5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#412a4c,#e57cd8,#f97316)]" />
                <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Cadastros salvos
                </p>
                <strong className="mt-2 block text-2xl font-black leading-none text-primary">
                  {totalSaved}
                </strong>
                <span className="mt-2 block text-xs text-muted-foreground">
                  historico autorizado neste polo
                </span>
              </div>
              <SummaryMetric status="PENDING" value={totalSaved} />
            </div>
          </div>

          <nav
            aria-label="Escolher modo do pre-cadastro"
            className="mt-5 grid gap-2 sm:grid-cols-2"
          >
            <button
              type="button"
              aria-pressed={activeView === "create"}
              onClick={() => setActiveView("create")}
              className={cn(
                "group flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5",
                activeView === "create"
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "border-primary/12 bg-white/88 text-primary hover:border-primary/25 hover:bg-white hover:shadow-md",
              )}
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", activeView === "create" ? "bg-white/15" : "bg-primary/10")}>
                <UserPlus aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-black">Novo pre-cadastro</strong>
                <span className={cn("mt-0.5 block text-xs", activeView === "create" ? "text-white/75" : "text-muted-foreground")}>
                  Registrar um novo contato como Novo
                </span>
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activeView === "list"}
              onClick={() => setActiveView("list")}
              className={cn(
                "group flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5",
                activeView === "list"
                  ? "border-sky-700 bg-sky-700 text-white shadow-lg shadow-sky-700/20"
                  : "border-primary/12 bg-white/88 text-primary hover:border-sky-300 hover:bg-sky-50/60 hover:shadow-md",
              )}
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", activeView === "list" ? "bg-white/15" : "bg-sky-100 text-sky-800")}>
                <ListChecks aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="flex items-center justify-between gap-2 text-sm font-black">
                  Cadastros salvos
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", activeView === "list" ? "bg-white/15" : "bg-sky-100 text-sky-800")}>
                    {totalSaved}
                  </span>
                </strong>
                <span className={cn("mt-0.5 block text-xs", activeView === "list" ? "text-white/75" : "text-muted-foreground")}>
                  Localizar, chamar e acompanhar interessados
                </span>
              </span>
            </button>
          </nav>
          {savedMessage ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800" role="status">
              {savedMessage}
            </p>
          ) : null}
        </div>
      </section>

      {activeView === "create" ? (
        <CreatePreRegistrationForm
          initialUnit={initialCreateUnit}
          onCreated={(message) => {
            setSavedMessage(message);
            setActiveView("list");
          }}
          teacherOptions={teacherOptions}
          viewerRole={viewerRole}
        />
      ) : (
        <>
          <section className="ava-soft-card overflow-hidden rounded-2xl border border-sky-200/80 bg-white/94 shadow-lg shadow-sky-900/5">
            <div className="flex flex-col gap-4 border-b border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.96),rgba(250,245,255,0.9))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white shadow-md shadow-sky-700/20">
                  <ListChecks aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-primary">Cadastros salvos</h3>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    Os mais recentes aparecem primeiro, com polo, cidade e horario do registro.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-800">
                {visibleRequestsLabel}
              </span>
            </div>
            <div className="grid min-w-0 gap-3 p-4 sm:p-5">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-primary">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-primary/65">
                  <Search aria-hidden="true" className="size-3.5" />
                  Busca inteligente
                </span>
                <span className="relative min-w-0">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nome, telefone, email ou documento..."
                    className={cn(preRegistrationInputClassName, "pl-10")}
                  />
                </span>
              </label>
            </div>
          </section>

      {visibleRequests.length === 0 ? (
        <div className="ava-soft-card flex min-h-60 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-800">
            <ListChecks aria-hidden="true" className="size-5" />
          </span>
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-primary">
              Nenhum pre-cadastro encontrado.
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isSearching
                ? "Tente parte do nome, telefone sem mascara, email, documento, cidade ou unidade."
                : "Crie um novo pre-cadastro para iniciar a fila."}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            <UsersRound aria-hidden="true" className="size-3.5" />
            {visibleRequestsLabel}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setActiveView("create")}>
            <UserPlus data-icon="inline-start" />
            Criar pre-cadastro
          </Button>
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
            const receivedDate =
              formatDateTime(request.createdAt) ?? "Data nao informada";
            const whatsAppHref = buildWhatsAppContactHref(
              request.phone,
              request.fullName,
            );
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
                className="group ava-soft-card min-w-0 overflow-hidden rounded-2xl border border-primary/12 bg-white/92 shadow-md shadow-primary/5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(65,42,76,0.08),rgba(229,124,216,0.08),rgba(255,246,236,0.95))] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-[linear-gradient(135deg,#412a4c,#8b5cf6)] text-lg font-black text-white shadow-lg shadow-primary/20">
                        {personInitial}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status="PENDING" />
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/12 bg-white/88 px-2.5 py-1 text-xs font-black text-primary/80 shadow-sm">
                            <Store aria-hidden="true" className="size-3.5" />
                            {unitLabels[request.unit]}
                          </span>
                          {request.city ? (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
                              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                              <span className="truncate">{request.city}</span>
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <CalendarClock
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Criado em {receivedDate}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black text-primary">
                          {request.fullName}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {request.englishGoal}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 xl:min-w-80">
                      {whatsAppHref ? (
                        <Button
                          asChild
                          size="sm"
                          className="w-full bg-emerald-600 text-white shadow-md shadow-emerald-600/15 hover:bg-emerald-700"
                        >
                          <a href={whatsAppHref} target="_blank" rel="noreferrer">
                            <MessageCircle data-icon="inline-start" />
                            Chamar no WhatsApp
                          </a>
                        </Button>
                      ) : null}
                      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                        <ContactCard icon={Phone} label="Telefone" value={request.phone} />
                        <ContactCard icon={Mail} label="Email" value={request.email} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid min-w-0 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
                  <div className="flex min-w-0 flex-col gap-4">
                    <section className="rounded-xl border border-sky-200/70 bg-sky-50/55 p-4 shadow-sm shadow-sky-500/5">
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

                    <section className="rounded-xl border border-primary/10 bg-white/82 p-4 shadow-sm shadow-primary/5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                        Historico e auditoria
                      </div>
                      <dl className="grid gap-3 md:grid-cols-2">
                        <DetailItem
                          icon={CalendarClock}
                          label="Criado em"
                          value={formatDateTime(request.createdAt)}
                        />
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

                  <aside className="flex min-w-0 flex-col gap-4 rounded-xl border border-primary/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,245,255,0.9),rgba(255,244,236,0.78))] p-4 shadow-sm shadow-primary/5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
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
                      <div className="grid gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full justify-center border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                          onClick={() => setEditingRequest(request)}
                        >
                          <Pencil data-icon="inline-start" />
                          Editar cadastro
                        </Button>
                        <AcceptForm
                          request={request}
                          teacherOptions={teacherOptions}
                          viewerRole={viewerRole}
                        />
                      </div>
                    ) : (
                      <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Este pre-cadastro ja saiu da fila de conversao.
                        {isConverted
                          ? " Os IDs linkados ficam no historico ao lado."
                          : ""}
                      </p>
                    )}

                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      )}
        </>
      )}
      {editingRequest ? (
        <ModalPortal
          labelledBy={`edit-pre-registration-${editingRequest.id}`}
          onClose={() => setEditingRequest(null)}
        >
          <header className="flex items-start justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-4 sm:p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-sky-800">
                <Pencil aria-hidden="true" className="size-3.5" />
                Edicao segura
              </div>
              <h3
                id={`edit-pre-registration-${editingRequest.id}`}
                className="mt-2 text-xl font-black text-primary sm:text-2xl"
              >
                {editingRequest.fullName}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Corrija os dados antes de transformar este pre-cadastro em aluno.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setEditingRequest(null)}
              aria-label="Fechar edicao do pre-cadastro"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
            <CreatePreRegistrationForm
              key={editingRequest.id}
              initialUnit={editingRequest.unit}
              onUpdated={(message) => {
                setSavedMessage(message);
                setEditingRequest(null);
                router.refresh();
              }}
              request={editingRequest}
              teacherOptions={teacherOptions}
              viewerRole={viewerRole}
            />
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
