"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { submitHomework } from "@/app/ava/student/actions";
import {
  submitHomeworkSchema,
  type SubmitHomeworkInput,
} from "@/lib/validations/learning";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function StudentHomeworkForm({
  homeworkId,
  initialAnswer = "",
  isReviewed = false,
}: {
  homeworkId: string;
  initialAnswer?: string;
  isReviewed?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SubmitHomeworkInput>({
    resolver: zodResolver(submitHomeworkSchema, undefined, { raw: true }),
    defaultValues: {
      answer: initialAnswer,
      homeworkId,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await submitHomework(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof SubmitHomeworkInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" {...form.register("homeworkId")} />
      <Field data-invalid={Boolean(form.formState.errors.answer)}>
        <FieldLabel htmlFor={`answer-${homeworkId}`}>Sua resposta</FieldLabel>
        <Textarea
          id={`answer-${homeworkId}`}
          aria-invalid={Boolean(form.formState.errors.answer)}
          disabled={isPending || isReviewed}
          placeholder="Escreva sua resposta aqui."
          {...form.register("answer")}
        />
        <FieldError errors={[form.formState.errors.answer]} />
      </Field>
      {isReviewed ? (
        <p className="text-sm text-muted-foreground">
          Esta homework ja foi corrigida. A resposta fica bloqueada para
          preservar o feedback.
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={isPending || isReviewed}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Send data-icon="inline-start" />
        )}
        {isReviewed ? "Homework corrigida" : "Enviar homework"}
      </Button>
    </form>
  );
}
