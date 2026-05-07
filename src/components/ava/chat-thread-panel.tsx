"use client";

import { LoaderCircle, MessageSquareText, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { sendChatMessage } from "@/app/ava/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

type ChatOption = {
  id: string;
  label: string;
};

export type ChatThreadRow = {
  id: string;
  messages: {
    body: string;
    createdAt: string;
    id: string;
    senderName: string;
    senderRole: Role;
  }[];
  studentName: string;
  studentProfileId: string;
  teacherName: string;
  teacherProfileId: string;
};

type ChatThreadPanelProps = {
  defaultStudentProfileId?: string;
  defaultTeacherProfileId?: string;
  mode: "student" | "teacher";
  students: ChatOption[];
  teachers: ChatOption[];
  threads: ChatThreadRow[];
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
});

function formatMessageTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function ChatComposer({
  compact = false,
  defaultStudentProfileId,
  defaultTeacherProfileId,
  students,
  teachers,
}: {
  compact?: boolean;
  defaultStudentProfileId?: string;
  defaultTeacherProfileId?: string;
  students: ChatOption[];
  teachers: ChatOption[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [studentProfileId, setStudentProfileId] = useState(
    defaultStudentProfileId ?? students[0]?.id ?? "",
  );
  const [teacherProfileId, setTeacherProfileId] = useState(
    defaultTeacherProfileId ?? teachers[0]?.id ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSend = Boolean(studentProfileId && teacherProfileId && body.trim());

  return (
    <form
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-background p-4",
        compact && "border-dashed bg-muted/30",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const result = await sendChatMessage({
            body,
            studentProfileId,
            teacherProfileId,
          });

          setMessage(result.message);

          if (result.ok) {
            setBody("");
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>Teacher</FieldLabel>
          <NativeSelect
            value={teacherProfileId}
            onChange={(event) => setTeacherProfileId(event.target.value)}
            disabled={isPending || compact || teachers.length <= 1}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>Aluno</FieldLabel>
          <NativeSelect
            value={studentProfileId}
            onChange={(event) => setStudentProfileId(event.target.value)}
            disabled={isPending || compact || students.length <= 1}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <FieldLabel>Mensagem</FieldLabel>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escreva a mensagem para continuar a conversa."
          disabled={isPending}
        />
        <FieldDescription>
          A mensagem fica registrada dentro do AVA e respeita o vinculo
          teacher-aluno.
        </FieldDescription>
      </Field>
      {message ? (
        <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={!canSend || isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Send data-icon="inline-start" />
        )}
        Enviar mensagem
      </Button>
    </form>
  );
}

export function ChatThreadPanel({
  defaultStudentProfileId,
  defaultTeacherProfileId,
  mode,
  students,
  teachers,
  threads,
}: ChatThreadPanelProps) {
  const visibleThreads = useMemo(
    () =>
      [...threads].sort((first, second) => {
        const firstDate = first.messages.at(-1)?.createdAt ?? "";
        const secondDate = second.messages.at(-1)?.createdAt ?? "";
        return secondDate.localeCompare(firstDate);
      }),
    [threads],
  );

  if (students.length === 0 || teachers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm leading-6 text-muted-foreground">
        Para abrir a chatbox, primeiro vincule um aluno a uma teacher. Depois a
        conversa aparece aqui para os dois lados.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <MessageSquareText aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Nova mensagem</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "student"
                ? "Fale com sua teacher vinculada."
                : "Escolha um aluno vinculado e envie uma mensagem."}
            </p>
          </div>
        </div>
        <ChatComposer
          defaultStudentProfileId={defaultStudentProfileId}
          defaultTeacherProfileId={defaultTeacherProfileId}
          students={students}
          teachers={teachers}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-semibold">Conversas</h2>
        {visibleThreads.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm leading-6 text-muted-foreground">
            Nenhuma mensagem enviada ainda.
          </div>
        ) : (
          visibleThreads.map((thread) => (
            <article
              key={thread.id}
              className="flex flex-col gap-4 rounded-lg border bg-background p-4"
            >
              <div className="flex flex-col gap-1 border-b pb-3">
                <h3 className="font-semibold">
                  {thread.teacherName} e {thread.studentName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Chatbox privada do vinculo teacher-aluno.
                </p>
              </div>
              <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-lg bg-muted/50 p-3 text-sm leading-6"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <strong className="text-foreground">
                        {message.senderName}
                      </strong>
                      <span>{ROLE_LABELS[message.senderRole]}</span>
                      <span>{formatMessageTime(message.createdAt)}</span>
                    </div>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>
              <ChatComposer
                compact
                defaultStudentProfileId={thread.studentProfileId}
                defaultTeacherProfileId={thread.teacherProfileId}
                students={students}
                teachers={teachers}
              />
            </article>
          ))
        )}
      </div>
    </div>
  );
}
