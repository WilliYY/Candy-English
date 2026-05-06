"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadContractDocument } from "@/app/ava/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type Option = {
  id: string;
  label: string;
};

export function ContractUploadForm({ students }: { students: Option[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await uploadContractDocument(formData);
          setMessage(result.message);

          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contract-title">Titulo</FieldLabel>
          <Input
            id="contract-title"
            name="title"
            disabled={isPending}
            placeholder="Contrato de aulas"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="contract-student">Aluno</FieldLabel>
          <NativeSelect
            id="contract-student"
            name="studentProfileId"
            disabled={isPending}
          >
            <option value="">Contrato geral</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="contract-file">PDF</FieldLabel>
          <Input
            id="contract-file"
            name="contract"
            type="file"
            accept="application/pdf"
            disabled={isPending}
            required
          />
          <FieldDescription>PDF ate 8 MB.</FieldDescription>
        </Field>
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
          <FileUp data-icon="inline-start" />
        )}
        Enviar contrato
      </Button>
    </form>
  );
}
