"use client";

import {
  Clock3,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
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

const roleLabels = {
  ADMIN: "Admin",
  STUDENT: "Aluno",
  TEACHER: "Teacher",
} satisfies Record<Role, string>;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const selectedStudent = students.find(
    (student) => student.id === studentProfileId,
  );
  const selectedTeacher = teachers.find(
    (teacher) => teacher.id === teacherProfileId,
  );
  const bodyLength = body.length;

  return (
    <form
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/12 bg-white/86 p-4 shadow-sm backdrop-blur-sm transition-all",
        compact
          ? "border-dashed bg-primary/[0.03]"
          : "shadow-[0_18px_45px_rgba(65,42,76,0.08)]",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">
            {compact ? "Responder conversa" : "Escrever mensagem"}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {selectedTeacher?.label ?? "Teacher"} para{" "}
            {selectedStudent?.label ?? "aluno"}
          </p>
        </div>
        <span
          className={cn(
            "w-fit rounded-full border px-3 py-1 text-xs font-semibold",
            bodyLength > 900
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-primary/10 bg-white/75 text-primary",
          )}
        >
          {bodyLength}/1000
        </span>
      </div>

      {!compact ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Teacher</FieldLabel>
            <NativeSelect
              value={teacherProfileId}
              onChange={(event) => setTeacherProfileId(event.target.value)}
              disabled={isPending || teachers.length <= 1}
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
              disabled={isPending || students.length <= 1}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      ) : null}
      <Field>
        <FieldLabel>Mensagem</FieldLabel>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escreva a mensagem para continuar a conversa."
          disabled={isPending}
          maxLength={1000}
          className={cn(
            "min-h-32 resize-y rounded-2xl border-primary/15 bg-white/90 shadow-inner shadow-primary/5 focus-visible:ring-primary/25",
            compact && "min-h-24",
          )}
        />
        {!compact ? (
          <FieldDescription>
            A mensagem fica registrada dentro do AVA e respeita o vinculo
            teacher-aluno.
          </FieldDescription>
        ) : null}
      </Field>
      {message ? (
        <p className="rounded-2xl border border-primary/15 bg-white/90 px-3 py-2 text-sm font-medium text-primary shadow-sm">
          {message}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={!canSend || isPending}
        className="w-full gap-2 sm:w-fit"
      >
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
      <div className="rounded-2xl border border-dashed border-primary/20 bg-white/72 p-6 text-sm leading-6 text-muted-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <MessageSquareText aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-primary">
              Nenhuma conversa disponivel
            </p>
            <p className="mt-1">
              Para abrir a chatbox, primeiro vincule um aluno a uma teacher.
              Depois a conversa aparece aqui para os dois lados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showStartComposer = mode === "teacher" || visibleThreads.length === 0;

  return (
    <div
      className={cn(
        "grid gap-6",
        showStartComposer && "xl:grid-cols-[0.85fr_1.15fr]",
      )}
    >
      {showStartComposer ? (
        <div className="flex flex-col gap-3">
          <div className="ava-soft-card relative overflow-hidden rounded-2xl border p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/12 via-secondary/50 to-amber-100/65"
            />
            <div className="relative flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <MessageSquareText aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  Chat interno
                </span>
                <h2 className="mt-3 text-2xl font-semibold text-primary">
                  Nova mensagem
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {mode === "student"
                    ? "Fale com sua teacher vinculada dentro do AVA."
                    : "Escolha um aluno vinculado e envie uma mensagem."}
                </p>
              </div>
            </div>
          </div>
          <ChatComposer
            defaultStudentProfileId={defaultStudentProfileId}
            defaultTeacherProfileId={defaultTeacherProfileId}
            students={students}
            teachers={teachers}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/12 bg-white/78 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
              Historico
            </p>
            <h2 className="mt-1 text-lg font-semibold text-primary">
              Conversas
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-1.5">
              {visibleThreads.length} conversa(s)
            </span>
            <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-1.5">
              {visibleThreads.reduce(
                (total, thread) => total + thread.messages.length,
                0,
              )}{" "}
              mensagem(ns)
            </span>
          </div>
        </div>
        {visibleThreads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-white/72 p-6 text-sm leading-6 text-muted-foreground shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-primary">
                  Nenhuma mensagem enviada ainda
                </p>
                <p className="mt-1">
                  Comece com uma mensagem curta para organizar o contato dentro
                  do AVA.
                </p>
              </div>
            </div>
          </div>
        ) : (
          visibleThreads.map((thread) => {
            const lastMessage = thread.messages.at(-1);

            return (
              <article
                key={thread.id}
                className="ava-soft-card overflow-hidden rounded-2xl border p-0"
              >
                <div className="border-b border-primary/10 bg-white/62 px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex -space-x-2">
                        <span className="flex size-11 items-center justify-center rounded-2xl border-2 border-white bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                          {getInitials(thread.teacherName)}
                        </span>
                        <span className="flex size-11 items-center justify-center rounded-2xl border-2 border-white bg-secondary text-sm font-bold text-secondary-foreground shadow-sm">
                          {getInitials(thread.studentName)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
                          Conversa ativa
                        </p>
                        <h3 className="mt-1 truncate text-lg font-semibold text-primary">
                          {thread.teacherName} e {thread.studentName}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-white/80 px-2.5 py-1">
                            <GraduationCap
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Teacher
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-white/80 px-2.5 py-1">
                            <UserRound
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Aluno
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground lg:text-right">
                      <span className="inline-flex items-center justify-start gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1 lg:justify-end">
                        <MessageSquareText
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        {thread.messages.length} mensagem(ns)
                      </span>
                      {lastMessage ? (
                        <span className="inline-flex items-center justify-start gap-2 lg:justify-end">
                          <Clock3 aria-hidden="true" className="size-3.5" />
                          {formatMessageTime(lastMessage.createdAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex max-h-[460px] flex-col gap-4 overflow-y-auto rounded-3xl border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(252,229,216,0.25))] p-3 shadow-inner shadow-primary/5 sm:p-4">
                    {thread.messages.map((message) => {
                      const isMine =
                        (mode === "student" &&
                          message.senderRole === "STUDENT") ||
                        (mode === "teacher" &&
                          (message.senderRole === "TEACHER" ||
                            message.senderRole === "ADMIN"));

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex items-end gap-2",
                            isMine && "justify-end",
                          )}
                        >
                          {!isMine ? (
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-primary shadow-sm">
                              {getInitials(message.senderName)}
                            </span>
                          ) : null}
                          <div
                            className={cn(
                              "max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
                              isMine
                                ? "rounded-br-lg bg-primary text-primary-foreground shadow-primary/20"
                                : "rounded-bl-lg border border-primary/10 bg-white/94 text-foreground",
                            )}
                          >
                            <div
                              className={cn(
                                "mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]",
                                isMine
                                  ? "text-primary-foreground/72"
                                  : "text-muted-foreground",
                              )}
                            >
                              <span>{isMine ? "Voce" : message.senderName}</span>
                              <span>{roleLabels[message.senderRole]}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words">
                              {message.body}
                            </p>
                            <span
                              className={cn(
                                "mt-2 block text-[11px]",
                                isMine
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <ChatComposer
                      compact
                      defaultStudentProfileId={thread.studentProfileId}
                      defaultTeacherProfileId={thread.teacherProfileId}
                      students={students}
                      teachers={teachers}
                    />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
