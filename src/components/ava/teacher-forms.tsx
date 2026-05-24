"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, LoaderCircle, Plus } from "lucide-react";
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
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<InteractiveAssetFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentForm = event.currentTarget;
    const formData = new FormData(currentForm);
    const asset = formData.get("asset");
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

    if (title.length < 3) {
      nextErrors.title = "Informe um titulo com pelo menos 3 caracteres.";
    }

    if (!(asset instanceof File) || asset.size <= 0) {
      nextErrors.asset = "Escolha um PDF ou imagem antes de criar.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage(copy.invalidMessage);
      return;
    }

    setErrors({});
    setMessage(null);
    startTransition(async () => {
      try {
        const result =
          mode === "lesson"
            ? await createInteractiveLesson(formData)
            : await createInteractiveHomework(formData);

        setMessage(result.message);
        setErrors(result.errors ?? {});

        if (result.ok) {
          formRef.current?.reset();
          setErrors({});
          router.refresh();
        }
      } catch {
        setMessage(
          "A pagina estava desatualizada depois de uma publicacao. Atualize a pagina e tente enviar novamente.",
        );
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-lg border-2 border-primary/20 bg-white p-4 shadow-sm"
      noValidate
    >
      <div className="mb-4 flex items-center gap-2 font-semibold">
        <FileUp aria-hidden="true" />
        {copy.formTitle}
      </div>
      <div className="grid gap-3 lg:grid-cols-[0.9fr_0.9fr_1fr_0.7fr]">
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
          <FieldLabel htmlFor={`interactive-${mode}-student`}>Aluno</FieldLabel>
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
            placeholder={copy.titlePlaceholder}
          />
          <FieldError errors={[{ message: errors.title }]} />
        </Field>
        <Field
          data-invalid={Boolean(
            copy.dateField === "dueDate" ? errors.dueDate : errors.scheduledAt,
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
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.8fr_auto] lg:items-end">
        <Field data-invalid={Boolean(errors.instructions)}>
          <FieldLabel htmlFor={`interactive-${mode}-instructions`}>
            {copy.instructionsLabel}
          </FieldLabel>
          <Textarea
            id={`interactive-${mode}-instructions`}
            name="instructions"
            aria-invalid={Boolean(errors.instructions)}
            disabled={isPending}
            placeholder={copy.instructionsPlaceholder}
          />
          <FieldError errors={[{ message: errors.instructions }]} />
        </Field>
        <Field data-invalid={Boolean(errors.asset)}>
          <FieldLabel htmlFor={`interactive-${mode}-asset`}>
            Arquivo PDF ou imagem
          </FieldLabel>
          <Input
            id={`interactive-${mode}-asset`}
            name="asset"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            aria-invalid={Boolean(errors.asset)}
            disabled={isPending}
          />
          <FieldError errors={[{ message: errors.asset }]} />
        </Field>
        <Button
          type="submit"
          disabled={isPending || students.length === 0 || teachers.length === 0}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {copy.buttonLabel}
        </Button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
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
  return (
    <div className="flex flex-col gap-6">
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
