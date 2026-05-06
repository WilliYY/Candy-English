"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createHomework,
  createLesson,
  reviewHomeworkSubmission,
} from "@/app/ava/teacher/actions";
import {
  createHomeworkSchema,
  createLessonSchema,
  reviewSubmissionSchema,
  type CreateHomeworkInput,
  type CreateLessonInput,
  type ReviewSubmissionInput,
} from "@/lib/validations/learning";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Option = {
  id: string;
  label: string;
};

const emptyLesson: CreateLessonInput = {
  description: "",
  materialContent: "",
  materialTitle: "",
  materialUrl: "",
  scheduledAt: "",
  studentProfileId: "",
  teacherProfileId: "",
  title: "",
  vocabularyExample: "",
  vocabularyTerm: "",
  vocabularyTranslation: "",
};

const emptyHomework: CreateHomeworkInput = {
  dueDate: "",
  expectedAnswer: "",
  instructions: "",
  lessonId: "",
  questionPrompt: "",
  title: "",
};

export function CreateLessonForm({
  students,
  teachers,
}: {
  students: Option[];
  teachers: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateLessonInput>({
    resolver: zodResolver(createLessonSchema, undefined, { raw: true }),
    defaultValues: {
      ...emptyLesson,
      teacherProfileId: teachers[0]?.id ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await createLesson(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof CreateLessonInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      form.reset({
        ...emptyLesson,
        teacherProfileId: teachers[0]?.id ?? "",
      });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.teacherProfileId)}>
          <FieldLabel htmlFor="lesson-teacher">Teacher</FieldLabel>
          <NativeSelect
            id="lesson-teacher"
            aria-invalid={Boolean(form.formState.errors.teacherProfileId)}
            disabled={isPending || teachers.length <= 1}
            {...form.register("teacherProfileId")}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.label}
              </option>
            ))}
          </NativeSelect>
          <FieldError errors={[form.formState.errors.teacherProfileId]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.studentProfileId)}>
          <FieldLabel htmlFor="lesson-student">Aluno</FieldLabel>
          <NativeSelect
            id="lesson-student"
            aria-invalid={Boolean(form.formState.errors.studentProfileId)}
            disabled={isPending}
            {...form.register("studentProfileId")}
          >
            <option value="">Sem aluno especifico</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Ao escolher um aluno, a aula aparece na area student dele.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.studentProfileId]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.title)}>
          <FieldLabel htmlFor="lesson-title">Titulo da aula</FieldLabel>
          <Input
            id="lesson-title"
            aria-invalid={Boolean(form.formState.errors.title)}
            disabled={isPending}
            placeholder="Ex: Simple past in conversation"
            {...form.register("title")}
          />
          <FieldError errors={[form.formState.errors.title]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.description)}>
          <FieldLabel htmlFor="lesson-description">Resumo</FieldLabel>
          <Textarea
            id="lesson-description"
            aria-invalid={Boolean(form.formState.errors.description)}
            disabled={isPending}
            placeholder="Objetivo da aula e pontos trabalhados."
            {...form.register("description")}
          />
          <FieldError errors={[form.formState.errors.description]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.scheduledAt)}>
          <FieldLabel htmlFor="lesson-date">Data da aula</FieldLabel>
          <Input
            id="lesson-date"
            type="date"
            aria-invalid={Boolean(form.formState.errors.scheduledAt)}
            disabled={isPending}
            {...form.register("scheduledAt")}
          />
          <FieldError errors={[form.formState.errors.scheduledAt]} />
        </Field>

        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="mb-4 flex items-center gap-2 font-medium">
            <CheckCircle2 aria-hidden="true" />
            Primeiro material e vocabulario
          </div>
          <div className="grid gap-4">
            <Field data-invalid={Boolean(form.formState.errors.materialTitle)}>
              <FieldLabel htmlFor="material-title">Titulo do material</FieldLabel>
              <Input
                id="material-title"
                aria-invalid={Boolean(form.formState.errors.materialTitle)}
                disabled={isPending}
                placeholder="Ex: Notes from class"
                {...form.register("materialTitle")}
              />
              <FieldError errors={[form.formState.errors.materialTitle]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.materialContent)}>
              <FieldLabel htmlFor="material-content">Conteudo</FieldLabel>
              <Textarea
                id="material-content"
                aria-invalid={Boolean(form.formState.errors.materialContent)}
                disabled={isPending}
                placeholder="Texto, instrucoes ou resumo do material."
                {...form.register("materialContent")}
              />
              <FieldError errors={[form.formState.errors.materialContent]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.materialUrl)}>
              <FieldLabel htmlFor="material-url">Link opcional</FieldLabel>
              <Input
                id="material-url"
                aria-invalid={Boolean(form.formState.errors.materialUrl)}
                disabled={isPending}
                placeholder="https://..."
                {...form.register("materialUrl")}
              />
              <FieldError errors={[form.formState.errors.materialUrl]} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                data-invalid={Boolean(form.formState.errors.vocabularyTerm)}
              >
                <FieldLabel htmlFor="vocab-term">Termo</FieldLabel>
                <Input
                  id="vocab-term"
                  aria-invalid={Boolean(form.formState.errors.vocabularyTerm)}
                  disabled={isPending}
                  placeholder="Ex: catch up"
                  {...form.register("vocabularyTerm")}
                />
                <FieldError errors={[form.formState.errors.vocabularyTerm]} />
              </Field>
              <Field
                data-invalid={Boolean(
                  form.formState.errors.vocabularyTranslation,
                )}
              >
                <FieldLabel htmlFor="vocab-translation">Traducao</FieldLabel>
                <Input
                  id="vocab-translation"
                  aria-invalid={Boolean(
                    form.formState.errors.vocabularyTranslation,
                  )}
                  disabled={isPending}
                  placeholder="Ex: colocar em dia"
                  {...form.register("vocabularyTranslation")}
                />
                <FieldError
                  errors={[form.formState.errors.vocabularyTranslation]}
                />
              </Field>
            </div>
            <Field
              data-invalid={Boolean(form.formState.errors.vocabularyExample)}
            >
              <FieldLabel htmlFor="vocab-example">Exemplo</FieldLabel>
              <Input
                id="vocab-example"
                aria-invalid={Boolean(form.formState.errors.vocabularyExample)}
                disabled={isPending}
                placeholder="I need to catch up on my homework."
                {...form.register("vocabularyExample")}
              />
              <FieldError errors={[form.formState.errors.vocabularyExample]} />
            </Field>
          </div>
        </div>
      </FieldGroup>

      {message ? (
        <p className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Plus data-icon="inline-start" />
        )}
        Criar aula
      </Button>
    </form>
  );
}

export function CreateHomeworkForm({ lessons }: { lessons: Option[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateHomeworkInput>({
    resolver: zodResolver(createHomeworkSchema, undefined, { raw: true }),
    defaultValues: {
      ...emptyHomework,
      lessonId: lessons[0]?.id ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await createHomework(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof CreateHomeworkInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      form.reset({ ...emptyHomework, lessonId: lessons[0]?.id ?? "" });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.lessonId)}>
          <FieldLabel htmlFor="homework-lesson">Aula</FieldLabel>
          <NativeSelect
            id="homework-lesson"
            aria-invalid={Boolean(form.formState.errors.lessonId)}
            disabled={isPending || lessons.length === 0}
            {...form.register("lessonId")}
          >
            {lessons.length === 0 ? (
              <option value="">Crie uma aula primeiro</option>
            ) : null}
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </NativeSelect>
          <FieldError errors={[form.formState.errors.lessonId]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.title)}>
          <FieldLabel htmlFor="homework-title">Titulo</FieldLabel>
          <Input
            id="homework-title"
            aria-invalid={Boolean(form.formState.errors.title)}
            disabled={isPending}
            placeholder="Ex: Practice simple past"
            {...form.register("title")}
          />
          <FieldError errors={[form.formState.errors.title]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.instructions)}>
          <FieldLabel htmlFor="homework-instructions">Instrucoes</FieldLabel>
          <Textarea
            id="homework-instructions"
            aria-invalid={Boolean(form.formState.errors.instructions)}
            disabled={isPending}
            placeholder="Explique o que o aluno deve fazer."
            {...form.register("instructions")}
          />
          <FieldError errors={[form.formState.errors.instructions]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.dueDate)}>
          <FieldLabel htmlFor="homework-due-date">Prazo</FieldLabel>
          <Input
            id="homework-due-date"
            type="date"
            aria-invalid={Boolean(form.formState.errors.dueDate)}
            disabled={isPending}
            {...form.register("dueDate")}
          />
          <FieldError errors={[form.formState.errors.dueDate]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.questionPrompt)}>
          <FieldLabel htmlFor="question-prompt">Pergunta</FieldLabel>
          <Textarea
            id="question-prompt"
            aria-invalid={Boolean(form.formState.errors.questionPrompt)}
            disabled={isPending}
            placeholder="Escreva a pergunta principal da homework."
            {...form.register("questionPrompt")}
          />
          <FieldError errors={[form.formState.errors.questionPrompt]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.expectedAnswer)}>
          <FieldLabel htmlFor="expected-answer">Resposta esperada</FieldLabel>
          <Textarea
            id="expected-answer"
            aria-invalid={Boolean(form.formState.errors.expectedAnswer)}
            disabled={isPending}
            placeholder="Opcional: use como guia interno de correcao."
            {...form.register("expectedAnswer")}
          />
          <FieldError errors={[form.formState.errors.expectedAnswer]} />
        </Field>
      </FieldGroup>

      {message ? (
        <p className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || lessons.length === 0}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Plus data-icon="inline-start" />
        )}
        Criar homework
      </Button>
    </form>
  );
}

export function ReviewSubmissionForm({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ReviewSubmissionInput>({
    resolver: zodResolver(reviewSubmissionSchema, undefined, { raw: true }),
    defaultValues: {
      feedback: "",
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
        <FieldLabel htmlFor={`feedback-${submissionId}`}>Feedback</FieldLabel>
        <Textarea
          id={`feedback-${submissionId}`}
          aria-invalid={Boolean(form.formState.errors.feedback)}
          disabled={isPending}
          placeholder="Escreva o feedback para o aluno."
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
        Enviar feedback
      </Button>
    </form>
  );
}
