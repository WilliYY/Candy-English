"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Files,
  FileUp,
  Layers2,
  LoaderCircle,
  Plus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
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
    buttonLabel: "Criar aula interativa",
    dateField: "scheduledAt",
    dateLabel: "Data da aula",
    formTitle: "Aula do Canva",
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
    ? ["Teacher", "Aluno", "Aula"]
    : ["Aluno", "Arquivo", "Editor"];
  const formDescription = isLessonMode
    ? "Escolha teacher e aluno, envie o material e abra o editor da aula."
    : "Escolha aluno, envie PDF/imagem e abra o editor para marcar as areas.";
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<InteractiveAssetFormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<InteractiveUploadQueueItem[]>(
    [],
  );
  const isPending = isUploading;

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
    const studentProfileId = String(formData.get("studentProfileId") ?? "");

    if (!teacherProfileId) {
      nextErrors.teacherProfileId = "Selecione uma teacher.";
    }

    if (!studentProfileId) {
      nextErrors.studentProfileId = "Selecione um aluno.";
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
        itemFormData.set("studentProfileId", studentProfileId);
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

        createdCount += 1;
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
        `${createdCount} arquivo(s) criado(s). Abra cada item na lista abaixo para desenhar as areas.`,
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
        `${createdCount} arquivo(s) criado(s), ${failedCount} com erro. Os arquivos com sucesso ja aparecem na lista.`,
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
        isLessonMode ? "border-sky-200/75" : "border-primary/15",
      )}
      noValidate
    >
      <div
        className={cn(
          "grid gap-4 border-b px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
          isLessonMode
            ? "border-sky-200/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.11),rgba(65,42,76,0.07),rgba(252,229,216,0.24))]"
            : "border-primary/10 bg-[linear-gradient(135deg,rgba(65,42,76,0.1),rgba(229,124,216,0.09),rgba(252,229,216,0.28))]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-[0_10px_24px_rgba(65,42,76,0.18)]",
              isLessonMode ? "bg-sky-600" : "bg-primary",
            )}
          >
            <FileUp aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-primary">
              {copy.formTitle}
            </div>
            <p className="text-sm text-muted-foreground">{formDescription}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
          {flowSteps.map((step, index) => (
            <span
              key={step}
              className={cn(
                "rounded-lg border bg-white/78 px-3 py-2 text-xs font-semibold shadow-sm",
                isLessonMode
                  ? "border-sky-200/70 text-sky-900"
                  : "border-primary/10 text-primary",
              )}
            >
              <span
                className={cn(
                  "mr-2 inline-flex size-5 items-center justify-center rounded-md text-[0.68rem] text-white",
                  isLessonMode ? "bg-sky-600" : "bg-primary",
                )}
              >
                {index + 1}
              </span>
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-3 rounded-lg border border-primary/10 bg-white/72 p-3 shadow-sm lg:grid-cols-[0.9fr_0.9fr_1fr_0.7fr]">
          <Field data-invalid={Boolean(errors.teacherProfileId)}>
            <FieldLabel htmlFor={`interactive-${mode}-teacher`}>
              Teacher
            </FieldLabel>
            <NativeSelect
              id={`interactive-${mode}-teacher`}
              name="teacherProfileId"
              aria-invalid={Boolean(errors.teacherProfileId)}
              disabled={isPending || teachers.length === 0}
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
          <Field data-invalid={Boolean(errors.studentProfileId)}>
            <FieldLabel htmlFor={`interactive-${mode}-student`}>
              Aluno
            </FieldLabel>
            <NativeSelect
              id={`interactive-${mode}-student`}
              name="studentProfileId"
              aria-invalid={Boolean(errors.studentProfileId)}
              disabled={isPending || students.length === 0}
            >
              {students.length === 0 ? (
                <option value="">Cadastre ou vincule um aluno</option>
              ) : null}
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={[{ message: errors.studentProfileId }]} />
          </Field>
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor={`interactive-${mode}-title`}>
              {copy.titleLabel}
            </FieldLabel>
            <Input
              id={`interactive-${mode}-title`}
              name="title"
              aria-invalid={Boolean(errors.title)}
              disabled={isPending}
              placeholder={`${copy.titlePlaceholder} ou use o nome do arquivo`}
            />
            <FieldError errors={[{ message: errors.title }]} />
          </Field>
          <Field
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

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(320px,1fr)_minmax(300px,0.9fr)] xl:items-stretch">
          <Field
            className="rounded-lg border border-primary/10 bg-white/86 p-3 shadow-sm"
            data-invalid={Boolean(errors.instructions)}
          >
            <FieldLabel htmlFor={`interactive-${mode}-instructions`}>
              {copy.instructionsLabel}
            </FieldLabel>
            <Textarea
              id={`interactive-${mode}-instructions`}
              name="instructions"
              aria-invalid={Boolean(errors.instructions)}
              className="min-h-24 resize-y bg-white/95"
              disabled={isPending}
              placeholder={copy.instructionsPlaceholder}
            />
            <FieldError errors={[{ message: errors.instructions }]} />
          </Field>

          <div className="grid gap-3 rounded-lg border border-dashed border-primary/20 bg-white/88 p-3 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
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
                className="bg-white file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                disabled={isPending}
                multiple
              />
              <p className="text-xs text-muted-foreground">
                Cada arquivo vira uma atividade separada e aparece na lista
                abaixo.
              </p>
              <FieldError errors={[{ message: errors.asset }]} />
            </Field>

            <Button
              className="h-11 w-full px-5 sm:w-auto"
              type="submit"
              disabled={
                isPending || students.length === 0 || teachers.length === 0
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
      <section className="overflow-hidden rounded-lg border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/70 to-secondary/35 p-4 shadow-[0_18px_42px_rgba(14,165,233,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]">
              <BookOpen aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-sky-700">
                Aulas do Canva
              </p>
              <h2 className="mt-1 text-lg font-semibold text-primary">
                Crie aula, envie o PDF/imagem e marque as areas interativas.
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Cada arquivo vira uma aula para o aluno em Aulas e Materiais,
                com editor manual para texto, letra, marcar, desenho e
                listening.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[25rem]">
            <div className="rounded-lg border border-sky-200 bg-white/82 p-3 text-sky-900 shadow-sm">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]">
                <BookOpen aria-hidden="true" className="size-3.5" />
                Aulas
              </span>
              <strong className="mt-1 block text-2xl leading-none">
                {interactiveLessons.length}
              </strong>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 shadow-sm">
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
                {studentsWithLessons}
              </strong>
              <span className="mt-1 block text-xs font-semibold">
                {readyLessons} com area(s)
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
        heading="Aulas interativas"
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
  return (
    <div className="flex flex-col gap-6">
      <InteractiveAssetUploadForm
        mode="homework"
        students={students}
        teachers={teachers}
      />
      <InteractiveHomeworkEditor homeworks={interactiveHomeworks} />
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
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await allowHomeworkRedo({ submissionId });

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
