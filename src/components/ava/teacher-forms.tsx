"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Files,
  FileUp,
  Layers2,
  LoaderCircle,
  Plus,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  allowHomeworkRedo,
  createInteractiveHomework,
  createInteractiveLesson,
  reviewHomeworkSubmission,
} from "@/app/ava/teacher/actions";
import {
  InteractiveHomeworkEditor,
  type InteractiveHomeworkEditorRow,
} from "@/components/ava/interactive-homework-editor";
import {
  reviewSubmissionSchema,
  type CreateInteractiveHomeworkInput,
  type CreateInteractiveLessonInput,
  type ReviewSubmissionInput,
} from "@/lib/validations/learning";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Option = {
  id: string;
  label: string;
};

type InteractiveAssetFormErrors = Partial<
  Record<
    | keyof CreateInteractiveHomeworkInput
    | keyof CreateInteractiveLessonInput
    | "asset",
    string
  >
>;

type InteractiveAssetMode = "homework" | "lesson";
type InteractiveUploadStatus =
  | "created"
  | "error"
  | "optimized"
  | "sending"
  | "waiting";

type InteractiveUploadQueueItem = {
  fileName: string;
  id: string;
  message?: string;
  sizeBytes: number;
  status: InteractiveUploadStatus;
};

const interactiveUploadStatusMeta = {
  created: {
    Icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "criado",
  },
  error: {
    Icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-700",
    label: "erro",
  },
  optimized: {
    Icon: CheckCircle2,
    className: "border-amber-200 bg-amber-50 text-amber-700",
    label: "otimizado",
  },
  sending: {
    Icon: LoaderCircle,
    className: "border-primary/20 bg-primary/5 text-primary",
    label: "enviando",
  },
  waiting: {
    Icon: Clock3,
    className: "border-muted bg-background text-muted-foreground",
    label: "aguardando",
  },
} as const satisfies Record<
  InteractiveUploadStatus,
  {
    Icon: LucideIcon;
    className: string;
    label: string;
  }
>;

const interactiveAssetCopy = {
  homework: {
    buttonLabel: "Criar interativa",
    dateField: "dueDate",
    dateLabel: "Prazo",
    formTitle: "Homework do Canva",
    instructionsLabel: "Instrucoes",
    instructionsPlaceholder: "O que o aluno deve completar.",
    invalidMessage: "Revise os campos destacados para criar a homework.",
    titleLabel: "Titulo",
    titlePlaceholder: "Ex: Canva unit 4",
  },
  lesson: {
    buttonLabel: "Criar aula",
    dateField: "scheduledAt",
    dateLabel: "Data da aula",
    formTitle: "Nova aula",
    instructionsLabel: "Resumo",
    instructionsPlaceholder: "Objetivo da aula e pontos trabalhados.",
    invalidMessage: "Revise os campos destacados para criar a aula.",
    titleLabel: "Titulo da aula",
    titlePlaceholder: "Ex: Simple past in conversation",
  },
} as const satisfies Record<
  InteractiveAssetMode,
  {
    buttonLabel: string;
    dateField: "dueDate" | "scheduledAt";
    dateLabel: string;
    formTitle: string;
    instructionsLabel: string;
    instructionsPlaceholder: string;
    invalidMessage: string;
    titleLabel: string;
    titlePlaceholder: string;
  }
>;

function formatUploadSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.ceil(sizeBytes / 1024))} KB`;
}

function fileTitleFromName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const cleanTitle = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanTitle.length >= 3 ? cleanTitle.slice(0, 160) : "Material Candy";
}

function titleForInteractiveUpload(input: {
  file: File;
  fileCount: number;
  title: string;
}) {
  const fileTitle = fileTitleFromName(input.file.name);

  if (input.fileCount === 1) {
    return input.title.length >= 3 ? input.title.slice(0, 160) : fileTitle;
  }

  if (!input.title) {
    return fileTitle;
  }

  return `${input.title} - ${fileTitle}`.slice(0, 160);
}

function updateUploadQueueItem(
  items: InteractiveUploadQueueItem[],
  id: string,
  update: Partial<InteractiveUploadQueueItem>,
) {
  return items.map((item) => (item.id === id ? { ...item, ...update } : item));
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function StudentMultiSelectField({
  className,
  disabled,
  error,
  id,
  label = "Alunos",
  onChange,
  selectedIds,
  students,
}: {
  className?: string;
  disabled: boolean;
  error?: string;
  id: string;
  label?: string;
  onChange: (selectedIds: string[]) => void;
  selectedIds: string[];
  students: Option[];
}) {
  const selectedSet = new Set(selectedIds);
  const allSelected = students.length > 0 && selectedIds.length === students.length;
  const selectedStudents = students.filter((student) => selectedSet.has(student.id));
  const selectedPreview =
    allSelected
      ? `Todos os ${students.length} alunos selecionados`
      : selectedStudents.length === 0
      ? "Nenhum aluno selecionado"
      : selectedStudents.length <= 2
        ? selectedStudents.map((student) => student.label).join(", ")
        : `${selectedStudents
            .slice(0, 2)
            .map((student) => student.label)
            .join(", ")} +${selectedStudents.length - 2}`;

  function toggleAll() {
    onChange(allSelected ? [] : students.map((student) => student.id));
  }

  function toggleStudent(studentId: string) {
    onChange(
      selectedSet.has(studentId)
        ? selectedIds.filter((selectedId) => selectedId !== studentId)
        : [...selectedIds, studentId],
    );
  }

  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums",
            selectedIds.length > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-primary/10 bg-white text-muted-foreground",
          )}
        >
          <UsersRound aria-hidden="true" className="size-3.5" />
          {selectedIds.length}/{students.length || 0}
        </span>
      </div>
      {selectedIds.map((studentId) => (
        <input
          key={studentId}
          name="studentProfileIds"
          type="hidden"
          value={studentId}
        />
      ))}
      <div
        aria-labelledby={`${id}-label`}
        className={cn(
          "mt-1 overflow-hidden rounded-lg border bg-white/95 shadow-sm",
          error ? "border-red-300" : "border-primary/10",
          disabled ? "opacity-70" : "",
        )}
        role="group"
      >
        <div className="grid gap-2 border-b border-primary/10 bg-emerald-50/35 p-2">
          <div className="flex min-w-0 items-stretch gap-2">
            <label
              className={cn(
                "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 shadow-sm",
                allSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-primary/10 bg-white text-primary",
                disabled ? "cursor-not-allowed" : "",
              )}
              htmlFor={`${id}-all`}
            >
              <input
                checked={allSelected}
                className="size-4 shrink-0 accent-emerald-600"
                disabled={disabled || students.length === 0}
                id={`${id}-all`}
                onChange={toggleAll}
                type="checkbox"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  Selecionar todos
                </span>
                <span className="block truncate text-xs font-medium text-muted-foreground">
                  {allSelected
                    ? `${students.length} alunos marcados`
                    : `${students.length - selectedStudents.length} ainda nao marcados`}
                </span>
              </span>
            </label>
            {selectedIds.length > 0 ? (
              <Button
                aria-label="Limpar selecao de alunos"
                className="h-auto shrink-0 self-stretch px-3 text-muted-foreground"
                disabled={disabled}
                onClick={() => onChange([])}
                size="sm"
                title="Limpar selecao"
                type="button"
                variant="outline"
              >
                <X aria-hidden="true" className="size-4" />
                <span className="hidden md:inline">Limpar</span>
              </Button>
            ) : null}
          </div>
          <div
            aria-live="polite"
            className="min-w-0 rounded-md border border-primary/10 bg-white px-3 py-2 shadow-sm"
          >
            <span className="block text-xs font-bold text-muted-foreground">
              Resumo da selecao
            </span>
            <span
              className={cn(
                "mt-0.5 block line-clamp-2 break-words text-sm font-semibold text-pretty",
                selectedStudents.length > 0
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              title={selectedStudents.map((student) => student.label).join(", ")}
            >
              {selectedPreview}
            </span>
          </div>
        </div>

        <details className="group" open={Boolean(error) && selectedIds.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/[0.035] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <UsersRound aria-hidden="true" className="size-4 text-sky-700" />
              Ver alunos
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {students.length} disponiveis
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-open:rotate-180"
              />
            </span>
          </summary>
          {students.length > 0 ? (
            <div className="grid max-h-40 gap-2 overflow-y-auto border-t border-primary/10 p-2 sm:grid-cols-2">
              {students.map((student) => {
                const isSelected = selectedSet.has(student.id);

                return (
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition",
                      isSelected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-primary/10 bg-white text-primary hover:border-sky-200 hover:bg-sky-50/45",
                      disabled ? "cursor-not-allowed" : "",
                    )}
                    htmlFor={`${id}-${student.id}`}
                    key={student.id}
                    title={student.label}
                  >
                    <input
                      checked={isSelected}
                      className="size-4 shrink-0 accent-emerald-600"
                      disabled={disabled}
                      id={`${id}-${student.id}`}
                      onChange={() => toggleStudent(student.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 truncate">{student.label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="border-t border-primary/10 px-3 py-3 text-sm text-muted-foreground">
              Cadastre ou vincule um aluno antes de criar.
            </p>
          )}
        </details>
      </div>
      <FieldError errors={[{ message: error }]} />
    </Field>
  );
}

function InteractiveAssetUploadForm({
  mode,
  students,
  teachers,
}: {
  mode: InteractiveAssetMode;
  students: Option[];
  teachers: Option[];
}) {
  const router = useRouter();
  const copy = interactiveAssetCopy[mode];
  const isLessonMode = mode === "lesson";
  const flowSteps = isLessonMode
    ? ["Participantes", "Detalhes", "Material"]
    : ["Alunos", "Arquivo", "Editor"];
  const formDescription = isLessonMode
    ? "Defina quem participa, descreva a aula e envie o material interativo."
    : "Escolha um ou mais alunos, envie PDF/imagem e abra o editor para marcar as areas.";
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<InteractiveAssetFormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [uploadQueue, setUploadQueue] = useState<InteractiveUploadQueueItem[]>(
    [],
  );
  const isPending = isUploading;

  useEffect(() => {
    setSelectedStudentIds((currentSelectedIds) => {
      const availableStudentIds = new Set(students.map((student) => student.id));
      const keptStudentIds = currentSelectedIds.filter((studentId) =>
        availableStudentIds.has(studentId),
      );

      if (keptStudentIds.length > 0) {
        if (keptStudentIds.length === currentSelectedIds.length) {
          return currentSelectedIds;
        }

        return keptStudentIds;
      }

      const initialStudentIds = students[0]?.id ? [students[0].id] : [];

      if (
        initialStudentIds.length === currentSelectedIds.length &&
        initialStudentIds.every(
          (studentId, index) => studentId === currentSelectedIds[index],
        )
      ) {
        return currentSelectedIds;
      }

      return initialStudentIds;
    });
  }, [students]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentForm = event.currentTarget;
    const formData = new FormData(currentForm);
    const assetInput = currentForm.elements.namedItem("asset");
    const assets =
      assetInput instanceof HTMLInputElement && assetInput.files
        ? Array.from(assetInput.files)
        : [];
    const nextErrors: InteractiveAssetFormErrors = {};
    const title = String(formData.get("title") ?? "").trim();
    const teacherProfileId = String(formData.get("teacherProfileId") ?? "");
    const availableStudentIds = new Set(students.map((student) => student.id));
    const studentProfileIds = selectedStudentIds.filter((studentId) =>
      availableStudentIds.has(studentId),
    );

    if (!teacherProfileId) {
      nextErrors.teacherProfileId = "Selecione uma teacher.";
    }

    if (studentProfileIds.length === 0) {
      nextErrors.studentProfileIds = "Selecione pelo menos um aluno.";
    }

    if (title.length > 0 && title.length < 3) {
      nextErrors.title = "Informe um titulo com pelo menos 3 caracteres.";
    }

    if (assets.length === 0 || assets.some((asset) => asset.size <= 0)) {
      nextErrors.asset = "Escolha um ou mais PDFs/imagens antes de criar.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage(copy.invalidMessage);
      return;
    }

    setErrors({});
    setMessage(null);
    const initialQueue = assets.map<InteractiveUploadQueueItem>(
      (asset, index) => ({
        fileName: asset.name,
        id: `${asset.name}-${asset.size}-${asset.lastModified}-${index}`,
        sizeBytes: asset.size,
        status: "waiting",
      }),
    );

    setUploadQueue(initialQueue);
    setIsUploading(true);

    let createdCount = 0;
    let failedCount = 0;

    for (const [index, asset] of assets.entries()) {
      const queueItem = initialQueue[index];

      setUploadQueue((current) =>
        updateUploadQueueItem(current, queueItem.id, {
          message: "Enviando arquivo para criacao.",
          status: "sending",
        }),
      );

      try {
        const itemFormData = new FormData();
        itemFormData.set("teacherProfileId", teacherProfileId);
        studentProfileIds.forEach((studentProfileId) => {
          itemFormData.append("studentProfileIds", studentProfileId);
        });
        itemFormData.set(
          "title",
          titleForInteractiveUpload({
            file: asset,
            fileCount: assets.length,
            title,
          }),
        );
        itemFormData.set(
          "instructions",
          String(formData.get("instructions") ?? ""),
        );
        itemFormData.set(
          copy.dateField,
          String(formData.get(copy.dateField) ?? ""),
        );
        itemFormData.set("asset", asset);

        const result =
          mode === "lesson"
            ? await createInteractiveLesson(itemFormData)
            : await createInteractiveHomework(itemFormData);

        if (!result.ok) {
          failedCount += 1;
          setErrors(result.errors ?? {});
          setUploadQueue((current) =>
            updateUploadQueueItem(current, queueItem.id, {
              message: result.message,
              status: "error",
            }),
          );
          continue;
        }

        const wasOptimized = result.message.includes("PDF otimizado:");

        if (wasOptimized) {
          setUploadQueue((current) =>
            updateUploadQueueItem(current, queueItem.id, {
              message: result.message,
              status: "optimized",
            }),
          );
          await wait(350);
        }

        createdCount += result.createdCount ?? 1;
        setErrors({});
        setUploadQueue((current) =>
          updateUploadQueueItem(current, queueItem.id, {
            message: result.message,
            status: "created",
          }),
        );
        router.refresh();
      } catch {
        failedCount += 1;
        setUploadQueue((current) =>
          updateUploadQueueItem(current, queueItem.id, {
            message:
              "A pagina estava desatualizada ou a conexao falhou. Tente enviar este arquivo novamente.",
            status: "error",
          }),
        );
      }
    }

    if (assetInput instanceof HTMLInputElement) {
      assetInput.value = "";
    }

    if (failedCount === 0) {
      setMessage(
        `${createdCount} atividade(s) criada(s). Abra cada item na lista abaixo para desenhar as areas.`,
      );

      if (createdCount > 0) {
        formRef.current?.reset();
        setErrors({});
        setUploadQueue((current) =>
          current.map((item) => ({ ...item, status: "created" })),
        );
      }
    } else {
      setMessage(
        `${createdCount} atividade(s) criada(s), ${failedCount} arquivo(s) com erro. Os arquivos com sucesso ja aparecem na lista.`,
      );
    }

    setIsUploading(false);
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className={cn(
        "overflow-hidden rounded-lg border bg-gradient-to-br from-white via-primary/[0.018] to-secondary/35 shadow-[0_18px_45px_rgba(65,42,76,0.09)]",
        isLessonMode
          ? "border-primary/20 bg-[#fcfbfd] shadow-[0_24px_60px_rgba(65,42,76,0.14)]"
          : "border-primary/15",
      )}
      noValidate
    >
      <div
        className={cn(
          "grid gap-4 border-b px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center sm:px-5",
          isLessonMode
            ? "border-primary/35 bg-[linear-gradient(110deg,#2f183b_0%,#4d285b_48%,#075b68_100%)] text-white"
            : "border-primary/10 bg-[linear-gradient(135deg,rgba(65,42,76,0.1),rgba(229,124,216,0.09),rgba(252,229,216,0.28))]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-[0_10px_24px_rgba(65,42,76,0.18)]",
              isLessonMode
                ? "bg-white/14 text-white ring-1 ring-white/25"
                : "bg-primary",
            )}
          >
            {isLessonMode ? (
              <BookOpen aria-hidden="true" className="size-5" />
            ) : (
              <FileUp aria-hidden="true" className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-base font-semibold",
                isLessonMode ? "text-white" : "text-primary",
              )}
            >
              {copy.formTitle}
            </div>
            <p
              className={cn(
                "text-sm",
                isLessonMode ? "text-white/75" : "text-muted-foreground",
              )}
            >
              {formDescription}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
          {flowSteps.map((step, index) => (
            <span
              key={step}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none",
                isLessonMode
                  ? [
                      "border-sky-300/30 bg-sky-300/15 text-sky-50",
                      "border-violet-300/30 bg-violet-300/15 text-violet-50",
                      "border-emerald-300/30 bg-emerald-300/15 text-emerald-50",
                    ][index]
                  : "border-primary/10 text-primary",
              )}
            >
              <span
                className={cn(
                  "mr-2 inline-flex size-5 items-center justify-center rounded-md text-[0.68rem] text-white shadow-sm",
                  isLessonMode
                    ? ["bg-sky-500", "bg-violet-500", "bg-emerald-500"][
                        index
                      ]
                    : "bg-primary",
                )}
              >
                {index + 1}
              </span>
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#faf9fb] p-4 sm:p-5">
        <div
          className={cn(
            "grid gap-4 rounded-lg border p-3 shadow-sm",
            isLessonMode
              ? "relative overflow-hidden border-sky-200 bg-white p-4 shadow-[0_14px_34px_rgba(14,165,233,0.09)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-sky-500 lg:grid-cols-12 lg:p-5"
              : "border-primary/10 bg-white/72 lg:grid-cols-[0.75fr_minmax(320px,1.45fr)_minmax(240px,1fr)_0.65fr]",
          )}
        >
          {isLessonMode ? (
            <div className="flex min-w-0 items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/85 px-3 py-3 lg:col-span-12">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-[0_8px_18px_rgba(2,132,199,0.2)]">
                <UsersRound aria-hidden="true" className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-primary">1. Participantes</p>
                <p className="text-xs text-muted-foreground">
                  Escolha a teacher responsavel e os alunos que receberao a aula.
                </p>
              </div>
            </div>
          ) : null}

          <Field
            className={cn(isLessonMode && "lg:col-span-4")}
            data-invalid={Boolean(errors.teacherProfileId)}
          >
            <FieldLabel htmlFor={`interactive-${mode}-teacher`}>
              Teacher
            </FieldLabel>
            <NativeSelect
              id={`interactive-${mode}-teacher`}
              name="teacherProfileId"
              aria-invalid={Boolean(errors.teacherProfileId)}
              disabled={isPending || teachers.length === 0}
              className={cn(
                isLessonMode &&
                  "h-11 border-sky-200 bg-sky-50/35 shadow-sm focus:border-sky-400",
              )}
            >
              {teachers.length === 0 ? (
                <option value="">Cadastre uma teacher</option>
              ) : null}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={[{ message: errors.teacherProfileId }]} />
          </Field>
          <StudentMultiSelectField
            className={cn(isLessonMode && "lg:col-span-8")}
            disabled={isPending || students.length === 0}
            error={errors.studentProfileIds}
            id={`interactive-${mode}-students`}
            onChange={setSelectedStudentIds}
            selectedIds={selectedStudentIds}
            students={students}
          />
          {isLessonMode ? (
            <div className="mt-1 flex min-w-0 items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-3 lg:col-span-12">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-[0_8px_18px_rgba(124,58,237,0.2)]">
                <BookOpen aria-hidden="true" className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-primary">2. Detalhes da aula</p>
                <p className="text-xs text-muted-foreground">
                  De um nome claro e informe quando essa aula sera aplicada.
                </p>
              </div>
            </div>
          ) : null}
          <Field
            className={cn(isLessonMode && "lg:col-span-8")}
            data-invalid={Boolean(errors.title)}
          >
            <FieldLabel htmlFor={`interactive-${mode}-title`}>
              {copy.titleLabel}
            </FieldLabel>
            <Input
              id={`interactive-${mode}-title`}
              name="title"
              aria-invalid={Boolean(errors.title)}
              disabled={isPending}
              placeholder={`${copy.titlePlaceholder} ou use o nome do arquivo`}
              className={cn(
                isLessonMode &&
                  "h-11 border-violet-200 bg-violet-50/25 shadow-sm focus-visible:border-violet-400",
              )}
            />
            <FieldError errors={[{ message: errors.title }]} />
          </Field>
          <Field
            className={cn(isLessonMode && "lg:col-span-4")}
            data-invalid={Boolean(
              copy.dateField === "dueDate"
                ? errors.dueDate
                : errors.scheduledAt,
            )}
          >
            <FieldLabel htmlFor={`interactive-${mode}-date`}>
              {copy.dateLabel}
            </FieldLabel>
            <Input
              id={`interactive-${mode}-date`}
              name={copy.dateField}
              type="date"
              aria-invalid={Boolean(
                copy.dateField === "dueDate"
                  ? errors.dueDate
                  : errors.scheduledAt,
              )}
              disabled={isPending}
              className={cn(
                isLessonMode &&
                  "h-11 border-violet-200 bg-violet-50/25 shadow-sm focus-visible:border-violet-400",
              )}
            />
            <FieldError
              errors={[
                {
                  message:
                    copy.dateField === "dueDate"
                      ? errors.dueDate
                      : errors.scheduledAt,
                },
              ]}
            />
          </Field>
        </div>

        <div
          className={cn(
            "mt-4 grid gap-4 xl:items-stretch",
            isLessonMode
              ? "xl:grid-cols-[minmax(300px,0.82fr)_minmax(430px,1.18fr)]"
              : "xl:grid-cols-[minmax(320px,1fr)_minmax(300px,0.9fr)]",
          )}
        >
          <Field
            className={cn(
              "rounded-lg border p-4 shadow-sm",
              isLessonMode
                ? "border-amber-200 bg-amber-50/55 shadow-[0_14px_34px_rgba(245,158,11,0.09)]"
                : "border-primary/10 bg-white/86",
            )}
            data-invalid={Boolean(errors.instructions)}
          >
            {isLessonMode ? (
              <div className="mb-3 flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-[0_8px_18px_rgba(245,158,11,0.2)]">
                  <Layers2 aria-hidden="true" className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-primary">Resumo da aula</p>
                  <p className="text-xs text-muted-foreground">
                    Registre o objetivo e os pontos que serao trabalhados.
                  </p>
                </div>
              </div>
            ) : null}
            <FieldLabel htmlFor={`interactive-${mode}-instructions`}>
              {copy.instructionsLabel}
            </FieldLabel>
            <Textarea
              id={`interactive-${mode}-instructions`}
              name="instructions"
              aria-invalid={Boolean(errors.instructions)}
              className={cn(
                "min-h-28 resize-y bg-white/95",
                isLessonMode &&
                  "border-amber-200 shadow-sm focus-visible:border-amber-400",
              )}
              disabled={isPending}
              placeholder={copy.instructionsPlaceholder}
            />
            <FieldError errors={[{ message: errors.instructions }]} />
          </Field>

          <div
            className={cn(
              "grid gap-3 rounded-lg border p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end",
              isLessonMode
                ? "border-emerald-200 bg-emerald-50/55 shadow-[0_14px_34px_rgba(16,185,129,0.1)]"
                : "border-primary/20 bg-white/88",
            )}
          >
            {isLessonMode ? (
              <div className="flex min-w-0 items-start gap-3 border-b border-emerald-200/70 pb-3 sm:col-span-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.2)]">
                  <FileUp aria-hidden="true" className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-primary">3. Material da aula</p>
                  <p className="text-xs text-muted-foreground">
                    Envie PDF ou imagens; depois marque as areas interativas no editor.
                  </p>
                </div>
              </div>
            ) : null}
            <Field data-invalid={Boolean(errors.asset)}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor={`interactive-${mode}-asset`}>
                  Arquivos PDF ou imagens
                </FieldLabel>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.045] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-primary">
                  <Files aria-hidden="true" className="size-3.5" />
                  lote
                </span>
              </div>
              <Input
                id={`interactive-${mode}-asset`}
                name="asset"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                aria-invalid={Boolean(errors.asset)}
                className={cn(
                  "bg-white file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary",
                  isLessonMode &&
                    "h-11 border-emerald-200 shadow-sm file:bg-emerald-100 file:text-emerald-800",
                )}
                disabled={isPending}
                multiple
              />
              <p className="text-xs text-muted-foreground">
                {isLessonMode
                  ? "Cada arquivo cria uma aula separada para os alunos selecionados."
                  : "Cada arquivo vira uma atividade separada e aparece na lista abaixo."}
              </p>
              <FieldError errors={[{ message: errors.asset }]} />
            </Field>

            <Button
              className={cn(
                "h-11 w-full px-5 transition duration-200 hover:-translate-y-0.5 motion-reduce:transform-none sm:w-auto",
                isLessonMode &&
                  "bg-primary shadow-[0_10px_24px_rgba(65,42,76,0.24)] hover:bg-primary/92 hover:shadow-[0_14px_30px_rgba(65,42,76,0.3)]",
              )}
              type="submit"
              disabled={
                isPending ||
                students.length === 0 ||
                teachers.length === 0 ||
                selectedStudentIds.length === 0
              }
            >
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              {isPending ? "Criando fila..." : copy.buttonLabel}
            </Button>
          </div>
        </div>

        {uploadQueue.length > 0 ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-primary/15 bg-white/82 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <strong className="text-primary">Fila de criacao</strong>
              <span className="text-xs text-muted-foreground">
                {uploadQueue.length} arquivo(s)
              </span>
            </div>
            <div className="grid gap-2">
              {uploadQueue.map((item) => {
                const meta = interactiveUploadStatusMeta[item.status];
                const Icon = meta.Icon;

                return (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-md border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {item.fileName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatUploadSize(item.sizeBytes)}
                        {item.message ? ` - ${item.message}` : ""}
                      </div>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${meta.className}`}
                    >
                      <Icon
                        aria-hidden="true"
                        className={
                          item.status === "sending" ? "animate-spin" : ""
                        }
                        size={14}
                      />
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-lg border border-primary/10 bg-white/86 px-4 py-3 text-sm font-medium text-muted-foreground shadow-sm">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function CreateLessonForm({
  interactiveLessons = [],
  students,
  teachers,
}: {
  interactiveLessons?: InteractiveHomeworkEditorRow[];
  students: Option[];
  teachers: Option[];
}) {
  const totalFields = interactiveLessons.reduce(
    (total, lesson) => total + lesson.fields.length,
    0,
  );
  const readyLessons = interactiveLessons.filter(
    (lesson) => lesson.fields.length > 0,
  ).length;
  const studentsWithLessons = new Set(
    interactiveLessons
      .map((lesson) => lesson.studentName)
      .filter((studentName): studentName is string => Boolean(studentName)),
  ).size;

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-lg border border-primary/15 bg-[linear-gradient(125deg,rgba(236,248,255,0.98)_0%,rgba(255,255,255,1)_46%,rgba(255,247,238,0.98)_100%)] p-4 shadow-[0_22px_50px_rgba(65,42,76,0.12)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#0ea5e9,#8b5cf6,#f59e0b,#10b981)] sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(27rem,0.92fr)] lg:items-center">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#0284c7,#0f766e)] text-white shadow-[0_12px_26px_rgba(14,165,233,0.24)]">
              <BookOpen aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-sky-700">
                Aulas
              </p>
              <h2 className="mt-1 max-w-xl text-xl font-semibold leading-snug text-primary">
                Crie, organize e acompanhe suas aulas em um so lugar.
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Escolha os participantes, envie PDF ou imagens e prepare areas
                de texto, marcar, desenho e listening para os alunos.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex min-h-28 flex-col justify-between rounded-lg border border-sky-200 bg-white p-3 text-sky-900 shadow-[0_10px_24px_rgba(14,165,233,0.1)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_14px_30px_rgba(14,165,233,0.16)] motion-reduce:transform-none">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <BookOpen aria-hidden="true" className="size-3.5" />
                Aulas
              </span>
              <strong className="mt-2 block text-3xl leading-none">
                {interactiveLessons.length}
              </strong>
              <span className="mt-1 text-xs font-medium text-sky-700">
                criadas no total
              </span>
            </div>
            <div className="flex min-h-28 flex-col justify-between rounded-lg border border-emerald-200 bg-white p-3 text-emerald-900 shadow-[0_10px_24px_rgba(16,185,129,0.1)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_30px_rgba(16,185,129,0.16)] motion-reduce:transform-none">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <Layers2 aria-hidden="true" className="size-3.5" />
                Areas interativas
              </span>
              <strong className="mt-2 block text-3xl leading-none">
                {totalFields}
              </strong>
              <span className="mt-1 text-xs font-medium text-emerald-700">
                configuradas nas aulas
              </span>
            </div>
            <div className="flex min-h-28 flex-col justify-between rounded-lg border border-amber-200 bg-white p-3 text-amber-900 shadow-[0_10px_24px_rgba(245,158,11,0.1)] transition duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_14px_30px_rgba(245,158,11,0.16)] motion-reduce:transform-none">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <UserRound aria-hidden="true" className="size-3.5" />
                Alunos alcancados
              </span>
              <strong className="mt-2 block text-3xl leading-none">
                {studentsWithLessons}
              </strong>
              <span className="mt-1 block text-xs font-semibold">
                {readyLessons} aula(s) pronta(s)
              </span>
            </div>
          </div>
        </div>
      </section>

      <InteractiveAssetUploadForm
        mode="lesson"
        students={students}
        teachers={teachers}
      />
      <InteractiveHomeworkEditor
        heading="Aulas criadas"
        homeworks={interactiveLessons}
      />
    </div>
  );
}

export function CreateHomeworkForm({
  interactiveHomeworks = [],
  students,
  teachers,
}: {
  interactiveHomeworks?: InteractiveHomeworkEditorRow[];
  students: Option[];
  teachers: Option[];
}) {
  const totalFields = interactiveHomeworks.reduce(
    (total, homework) => total + homework.fields.length,
    0,
  );
  const readyHomeworks = interactiveHomeworks.filter(
    (homework) => homework.fields.length > 0,
  ).length;
  const studentsWithHomeworks = new Set(
    interactiveHomeworks
      .map((homework) => homework.studentName)
      .filter((studentName): studentName is string => Boolean(studentName)),
  ).size;

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-fuchsia-200/70 bg-gradient-to-br from-white via-fuchsia-50/60 to-amber-50/40 p-4 shadow-[0_18px_42px_rgba(229,124,216,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-[0_12px_24px_rgba(65,42,76,0.22)]">
              <Files aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-fuchsia-700">
                Homework Canva
              </p>
              <h2 className="mt-1 text-lg font-semibold text-primary">
                Crie, organize e marque as areas do homework.
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Alunos ficam recolhidos por padrao; abra apenas quando precisar
                escolher varios ou todos.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[32rem]">
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3 text-fuchsia-900 shadow-sm">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <FileUp aria-hidden="true" className="size-3.5" />
                Itens
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {interactiveHomeworks.length}
              </strong>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900 shadow-sm">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <Layers2 aria-hidden="true" className="size-3.5" />
                Areas
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {totalFields}
              </strong>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 shadow-sm">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <UserRound aria-hidden="true" className="size-3.5" />
                Alunos
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {studentsWithHomeworks}
              </strong>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 shadow-sm">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Prontos
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {readyHomeworks}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <InteractiveAssetUploadForm
        mode="homework"
        students={students}
        teachers={teachers}
      />
      <InteractiveHomeworkEditor
        homeworks={interactiveHomeworks}
        studentOptions={students}
      />
    </div>
  );
}

export function ReviewSubmissionForm({
  defaultFeedback = "",
  submissionId,
}: {
  defaultFeedback?: string;
  submissionId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ReviewSubmissionInput>({
    resolver: zodResolver(reviewSubmissionSchema, undefined, { raw: true }),
    defaultValues: {
      feedback: defaultFeedback,
      submissionId,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await reviewHomeworkSubmission(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof ReviewSubmissionInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      form.reset({ feedback: "", submissionId });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" {...form.register("submissionId")} />
      <Field data-invalid={Boolean(form.formState.errors.feedback)}>
        <FieldLabel htmlFor={`feedback-${submissionId}`}>
          Nota/feedback para o aluno
        </FieldLabel>
        <Textarea
          id={`feedback-${submissionId}`}
          aria-invalid={Boolean(form.formState.errors.feedback)}
          disabled={isPending}
          placeholder="Escreva a nota que o aluno vai ver no homework."
          {...form.register("feedback")}
        />
        <FieldError errors={[form.formState.errors.feedback]} />
      </Field>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : null}
        Enviar avaliacao
      </Button>
    </form>
  );
}

export function AllowHomeworkRedoButton({
  defaultFeedback = "",
  submissionId,
}: {
  defaultFeedback?: string;
  submissionId: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(defaultFeedback);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await allowHomeworkRedo({
        feedback,
        submissionId,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/55 p-3">
      <Field>
        <FieldLabel htmlFor={`redo-feedback-${submissionId}`}>
          Feedback para refazer
        </FieldLabel>
        <Textarea
          id={`redo-feedback-${submissionId}`}
          disabled={isPending}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Opcional: explique o ponto que precisa ajustar."
          value={feedback}
        />
      </Field>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={onClick}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : null}
        Liberar refazer
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
