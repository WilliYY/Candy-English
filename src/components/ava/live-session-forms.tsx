"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Radio, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createLiveSession, toggleLiveSession } from "@/app/ava/actions";
import {
  createLiveSessionSchema,
  type CreateLiveSessionInput,
} from "@/lib/validations/ava-operations";
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

type Option = {
  id: string;
  label: string;
};

const emptyLiveSession: CreateLiveSessionInput = {
  endsAt: "",
  meetUrl: "",
  startsAt: "",
  studentProfileId: "",
  teacherProfileId: "",
  title: "",
};

export function LiveSessionForm({
  students,
  teachers,
}: {
  students: Option[];
  teachers: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateLiveSessionInput>({
    defaultValues: {
      ...emptyLiveSession,
      teacherProfileId: teachers[0]?.id ?? "",
    },
    resolver: zodResolver(createLiveSessionSchema, undefined, { raw: true }),
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createLiveSession(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof CreateLiveSessionInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      form.reset({
        ...emptyLiveSession,
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
          <FieldLabel htmlFor="live-teacher">Teacher</FieldLabel>
          <NativeSelect
            id="live-teacher"
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
          <FieldLabel htmlFor="live-student">Aluno</FieldLabel>
          <NativeSelect
            id="live-student"
            aria-invalid={Boolean(form.formState.errors.studentProfileId)}
            disabled={isPending}
            {...form.register("studentProfileId")}
          >
            <option value="">Turma geral</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Se escolher um aluno, apenas ele ve este botao ao vivo.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.studentProfileId]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.title)}>
          <FieldLabel htmlFor="live-title">Titulo</FieldLabel>
          <Input
            id="live-title"
            aria-invalid={Boolean(form.formState.errors.title)}
            disabled={isPending}
            placeholder="Aula ao vivo - conversacao"
            {...form.register("title")}
          />
          <FieldError errors={[form.formState.errors.title]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.meetUrl)}>
          <FieldLabel htmlFor="live-meet-url">Link do Google Meet</FieldLabel>
          <Input
            id="live-meet-url"
            aria-invalid={Boolean(form.formState.errors.meetUrl)}
            disabled={isPending}
            placeholder="https://meet.google.com/..."
            {...form.register("meetUrl")}
          />
          <FieldError errors={[form.formState.errors.meetUrl]} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.startsAt)}>
            <FieldLabel htmlFor="live-starts-at">Inicio</FieldLabel>
            <Input
              id="live-starts-at"
              type="datetime-local"
              aria-invalid={Boolean(form.formState.errors.startsAt)}
              disabled={isPending}
              {...form.register("startsAt")}
            />
            <FieldError errors={[form.formState.errors.startsAt]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.endsAt)}>
            <FieldLabel htmlFor="live-ends-at">Fim</FieldLabel>
            <Input
              id="live-ends-at"
              type="datetime-local"
              aria-invalid={Boolean(form.formState.errors.endsAt)}
              disabled={isPending}
              {...form.register("endsAt")}
            />
            <FieldError errors={[form.formState.errors.endsAt]} />
          </Field>
        </div>
      </FieldGroup>

      {message ? (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Radio data-icon="inline-start" />
        )}
        Abrir aula ao vivo
      </Button>
    </form>
  );
}

export function ToggleLiveSessionButton({
  isLive,
  liveSessionId,
}: {
  isLive: boolean;
  liveSessionId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={isLive ? "outline" : "secondary"}
        size="sm"
        disabled={isPending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await toggleLiveSession({
              isLive: !isLive,
              liveSessionId,
            });

            setMessage(result.message);

            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : isLive ? (
          <Square data-icon="inline-start" />
        ) : (
          <Radio data-icon="inline-start" />
        )}
        {isLive ? "Encerrar" : "Reabrir"}
      </Button>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </div>
  );
}
