"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Link2,
  LoaderCircle,
  Power,
  PowerOff,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  assignStudentToTeacher,
  toggleAvaUserStatus,
} from "@/app/ava/admin/actions";
import {
  adminAssignTeacherSchema,
  type AdminAssignTeacherInput,
} from "@/lib/validations/admin-users";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";

type AdminUserStatusButtonProps = {
  isActive: boolean;
  userId: string;
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
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={isActive ? "outline" : "secondary"}
        size="sm"
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
        <span className="max-w-44 text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </div>
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
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
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

      {message ? (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={!canAssign || isPending}>
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
