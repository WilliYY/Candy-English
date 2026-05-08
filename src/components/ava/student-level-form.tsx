"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateStudentLevel } from "@/app/ava/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StudentLevelFormProps = {
  currentLevel?: string | null;
  studentLabel: string;
  studentProfileId: string;
};

export function StudentLevelForm({
  currentLevel,
  studentLabel,
  studentProfileId,
}: StudentLevelFormProps) {
  const router = useRouter();
  const [level, setLevel] = useState(currentLevel ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const result = await updateStudentLevel({
            level,
            studentProfileId,
          });

          setMessage(result.message);

          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{studentLabel}</p>
        <p className="text-sm text-muted-foreground">
          Nivel visivel para o aluno, editavel pela teacher.
        </p>
        {message ? (
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>
      <Input
        aria-label={`Nivel de ${studentLabel}`}
        disabled={isPending}
        onChange={(event) => setLevel(event.target.value)}
        placeholder="Ex: A1, A2, B1"
        value={level}
      />
      <Button type="submit" disabled={isPending} variant="secondary">
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        Salvar
      </Button>
    </form>
  );
}
