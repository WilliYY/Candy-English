"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  GraduationCap,
  KeyRound,
  Link2,
  LoaderCircle,
  Mail,
  PenLine,
  Power,
  PowerOff,
  Save,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  assignStudentToTeacher,
  resetAvaUserPassword,
  toggleAvaUserStatus,
  updateStudentContactByAdmin,
} from "@/app/ava/admin/actions";
import {
  adminAssignTeacherSchema,
  adminResetUserPasswordSchema,
  adminUpdateStudentContactSchema,
  type AdminAssignTeacherInput,
  type AdminResetUserPasswordInput,
  type AdminUpdateStudentContactInput,
} from "@/lib/validations/admin-users";
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

type AdminUserStatusButtonProps = {
  isActive: boolean;
  userId: string;
};

type AdminUserPasswordResetFormProps = {
  userId: string;
  userName: string;
};

type AdminStudentContactEditFormProps = {
  email: string;
  phone?: string | null;
  userId: string;
  userName: string;
};

type AssignmentOption = {
  email: string;
  id: string;
  isActive: boolean;
  label: string;
};

type AdminAssignTeacherFormProps = {
  students: AssignmentOption[];
  teachers: AssignmentOption[];
};

export function AdminUserStatusButton({
  isActive,
  userId,
}: AdminUserStatusButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await toggleAvaUserStatus({
        isActive: !isActive,
        userId,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <Button
        type="button"
        variant={isActive ? "outline" : "secondary"}
        size="sm"
        className="w-full justify-start"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : isActive ? (
          <PowerOff data-icon="inline-start" />
        ) : (
          <Power data-icon="inline-start" />
        )}
        {isActive ? "Desativar" : "Reativar"}
      </Button>
      {message ? (
        <span className="max-w-full text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function AdminStudentContactEditForm({
  email,
  phone,
  userId,
  userName,
}: AdminStudentContactEditFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminUpdateStudentContactInput>({
    resolver: zodResolver(adminUpdateStudentContactSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      email,
      name: userName,
      phone: phone ?? "",
      userId,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateStudentContactByAdmin({
        ...values,
        userId,
      });

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminUpdateStudentContactInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset({
        email: values.email,
        name: values.name,
        phone: values.phone ?? "",
        userId,
      });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <details className="group/student-edit rounded-lg border border-sky-200/80 bg-sky-50/60 p-3 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-sky-950 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <PenLine aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">Editar dados do aluno</span>
        </span>
        <span className="rounded-full border border-sky-200 bg-white/86 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-sky-800">
          <span className="group-open/student-edit:hidden">abrir</span>
          <span className="hidden group-open/student-edit:inline">
            minimizar
          </span>
        </span>
      </summary>

      <form onSubmit={onSubmit} className="mt-3 grid gap-3" noValidate>
        <input
          type="hidden"
          defaultValue={userId}
          {...form.register("userId")}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor={`student-name-${userId}`}>Nome</FieldLabel>
            <Input
              id={`student-name-${userId}`}
              autoComplete="off"
              aria-invalid={Boolean(form.formState.errors.name)}
              disabled={isPending}
              placeholder="Nome do aluno"
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor={`student-email-${userId}`}>Email</FieldLabel>
            <Input
              id={`student-email-${userId}`}
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(form.formState.errors.email)}
              disabled={isPending}
              placeholder="aluno@email.com"
              {...form.register("email")}
            />
            <FieldDescription>
              Se mudar, o login do aluno passa a usar este email.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.email]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(form.formState.errors.phone)}>
          <FieldLabel htmlFor={`student-phone-${userId}`}>
            Telefone principal
          </FieldLabel>
          <Input
            id={`student-phone-${userId}`}
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.phone)}
            disabled={isPending}
            placeholder="(00) 00000-0000"
            {...form.register("phone")}
          />
          <FieldDescription>
            Atualiza o contato principal do cadastro do aluno.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.phone]} />
        </Field>

        {message ? (
          <p
            className="rounded-md border border-sky-200 bg-white/84 px-3 py-2 text-xs leading-5 text-sky-950"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="sm"
          className="w-full justify-start bg-sky-600 text-white hover:bg-sky-700"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          Salvar dados
        </Button>
      </form>
    </details>
  );
}

export function AdminUserPasswordResetForm({
  userId,
  userName,
}: AdminUserPasswordResetFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminResetUserPasswordInput>({
    resolver: zodResolver(adminResetUserPasswordSchema),
    defaultValues: {
      newPassword: "",
      userId,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await resetAvaUserPassword({
        ...values,
        userId,
      });

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminResetUserPasswordInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset({
        newPassword: "",
        userId,
      });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <details className="group/password-reset border-t border-primary/10 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <KeyRound aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">Redefinir senha</span>
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-primary">
          <span className="group-open/password-reset:hidden">abrir</span>
          <span className="hidden group-open/password-reset:inline">
            minimizar
          </span>
        </span>
      </summary>

      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3" noValidate>
        <input
          type="hidden"
          defaultValue={userId}
          {...form.register("userId")}
        />
        <Field data-invalid={Boolean(form.formState.errors.newPassword)}>
          <FieldLabel htmlFor={`reset-password-${userId}`}>
            Nova senha de {userName}
          </FieldLabel>
          <Input
            id={`reset-password-${userId}`}
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.newPassword)}
            disabled={isPending}
            placeholder="Digite a nova senha"
            {...form.register("newPassword")}
          />
          <FieldDescription>
            Envie a senha ao usuario por um canal seguro.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.newPassword]} />
        </Field>

        {message ? (
          <p
            className="rounded-md border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="sm"
          className="w-full justify-start"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <KeyRound data-icon="inline-start" />
          )}
          Salvar nova senha
        </Button>
      </form>
    </details>
  );
}

export function AdminAssignTeacherForm({
  students,
  teachers,
}: AdminAssignTeacherFormProps) {
  const router = useRouter();
  const activeStudents = useMemo(
    () => students.filter((student) => student.isActive),
    [students],
  );
  const activeTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.isActive),
    [teachers],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminAssignTeacherInput>({
    resolver: zodResolver(adminAssignTeacherSchema),
    defaultValues: {
      studentProfileId: activeStudents[0]?.id ?? "",
      teacherProfileId: activeTeachers[0]?.id ?? "",
    },
  });
  const selectedTeacherId = form.watch("teacherProfileId");
  const selectedStudentId = form.watch("studentProfileId");
  const selectedTeacher = activeTeachers.find(
    (teacher) => teacher.id === selectedTeacherId,
  );
  const selectedStudent = activeStudents.find(
    (student) => student.id === selectedStudentId,
  );
  const selectedTeacherLabel = selectedTeacher
    ? selectedTeacher.label.replace(` - ${selectedTeacher.email}`, "")
    : null;

  const canAssign = activeStudents.length > 0 && activeTeachers.length > 0;

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await assignStudentToTeacher(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminAssignTeacherInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-lg border border-primary/15 bg-white/88 p-4 shadow-[0_16px_34px_rgba(65,42,76,0.08)] sm:p-5"
      noValidate
    >
      <div className="grid gap-4 border-b border-primary/10 pb-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary">
            <Link2 aria-hidden="true" className="size-3.5" />
            Novo vinculo
          </span>
          <h2 className="mt-3 text-lg font-semibold text-primary">
            Conectar teacher e aluno
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escolha quem ensina e quem passa a aparecer na area dessa teacher.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="min-w-0 rounded-lg border border-primary/12 bg-primary/[0.045] px-3 py-2.5">
            <span className="block truncate text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Teachers ativos
            </span>
            <strong className="mt-1 block text-xl leading-none text-primary">
              {activeTeachers.length}
            </strong>
          </div>
          <div className="min-w-0 rounded-lg border border-primary/12 bg-primary/[0.045] px-3 py-2.5">
            <span className="block truncate text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Alunos ativos
            </span>
            <strong className="mt-1 block text-xl leading-none text-primary">
              {activeStudents.length}
            </strong>
          </div>
        </div>
      </div>

      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(form.formState.errors.teacherProfileId)}>
          <FieldLabel htmlFor="assign-teacher">Teacher</FieldLabel>
          <NativeSelect
            id="assign-teacher"
            aria-invalid={Boolean(form.formState.errors.teacherProfileId)}
            disabled={!canAssign || isPending}
            {...form.register("teacherProfileId")}
          >
            {activeTeachers.length === 0 ? (
              <option value="">Nenhuma teacher ativa</option>
            ) : null}
            {activeTeachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Esta teacher vai enxergar o aluno vinculado nas areas pedagogicas.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.teacherProfileId]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.studentProfileId)}>
          <FieldLabel htmlFor="assign-student">Aluno</FieldLabel>
          <NativeSelect
            id="assign-student"
            aria-invalid={Boolean(form.formState.errors.studentProfileId)}
            disabled={!canAssign || isPending}
            {...form.register("studentProfileId")}
          >
            {activeStudents.length === 0 ? (
              <option value="">Nenhum aluno ativo</option>
            ) : null}
            {activeStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label} - {student.email}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Esse vinculo define quais alunos aparecem para a teacher.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.studentProfileId]} />
        </Field>
      </FieldGroup>

      <div className="rounded-lg border border-primary/12 bg-primary/[0.03] p-3 shadow-inner shadow-primary/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Previa do vinculo
          </p>
          <span className="rounded-full border border-primary/10 bg-white/75 px-2.5 py-1 text-[0.68rem] font-semibold text-primary/70">
            Teacher → aluno
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
          <div className="min-w-0 rounded-md border border-primary/10 bg-white/88 p-3 shadow-sm">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-primary">
              <GraduationCap aria-hidden="true" className="size-3.5" />
              Teacher
            </span>
            <p className="mt-2 truncate text-sm font-semibold text-primary">
              {selectedTeacherLabel ?? "Selecione uma teacher"}
            </p>
            {selectedTeacher?.email ? (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{selectedTeacher.email}</span>
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(65,42,76,0.18)]">
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </div>

          <div className="min-w-0 rounded-md border border-primary/10 bg-white/88 p-3 shadow-sm">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-primary">
              <UserRound aria-hidden="true" className="size-3.5" />
              Aluno
            </span>
            <p className="mt-2 truncate text-sm font-semibold text-primary">
              {selectedStudent?.label ?? "Selecione um aluno"}
            </p>
            {selectedStudent?.email ? (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{selectedStudent.email}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-primary/12 bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={!canAssign || isPending}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Link2 data-icon="inline-start" />
        )}
        Vincular aluno
      </Button>

      {!canAssign ? (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          <UsersRound aria-hidden="true" />
          Cadastre pelo menos uma teacher ativa e um aluno ativo antes de criar
          vinculos.
        </div>
      ) : null}
    </form>
  );
}
