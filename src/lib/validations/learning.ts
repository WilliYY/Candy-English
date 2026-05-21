import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalDate = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Informe uma data valida.",
      });
      return z.NEVER;
    }

    return date;
  });

export const createLessonSchema = z.object({
  teacherProfileId: z.string().min(1, "Selecione uma teacher."),
  studentProfileId: optionalText(80, "Selecione um aluno valido."),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
  description: optionalText(
    1200,
    "A descricao pode ter no maximo 1200 caracteres.",
  ),
  scheduledAt: optionalDate,
  materialTitle: optionalText(
    160,
    "O titulo do material pode ter no maximo 160 caracteres.",
  ),
  materialContent: optionalText(
    4000,
    "O conteudo do material pode ter no maximo 4000 caracteres.",
  ),
  materialUrl: optionalText(500, "A URL pode ter no maximo 500 caracteres."),
  vocabularyTerm: optionalText(
    120,
    "O termo de vocabulario pode ter no maximo 120 caracteres.",
  ),
  vocabularyTranslation: optionalText(
    160,
    "A traducao pode ter no maximo 160 caracteres.",
  ),
  vocabularyExample: optionalText(
    500,
    "O exemplo pode ter no maximo 500 caracteres.",
  ),
});

export const createInteractiveHomeworkSchema = z.object({
  studentProfileId: z.string().min(1, "Selecione um aluno."),
  teacherProfileId: optionalText(80, "Selecione uma teacher valida."),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
  instructions: optionalText(
    2000,
    "As instrucoes podem ter no maximo 2000 caracteres.",
  ),
  dueDate: optionalDate,
});

export const createInteractiveLessonSchema = z.object({
  studentProfileId: z.string().min(1, "Selecione um aluno."),
  teacherProfileId: optionalText(80, "Selecione uma teacher valida."),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
  instructions: optionalText(
    2000,
    "O resumo pode ter no maximo 2000 caracteres.",
  ),
  scheduledAt: optionalDate,
});

const homeworkFieldTypeSchema = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "CHECKBOX",
  "DRAWING",
]);

export const interactiveHomeworkFieldSchema = z.object({
  height: z.coerce.number().min(2, "Altura minima 2%.").max(100),
  id: z.string().optional(),
  label: z
    .string()
    .trim()
    .max(80, "O rotulo pode ter no maximo 80 caracteres.")
    .optional(),
  page: z.coerce.number().int().min(1).max(20),
  placeholder: z
    .string()
    .trim()
    .max(120, "O placeholder pode ter no maximo 120 caracteres.")
    .optional(),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(200).default(0),
  type: homeworkFieldTypeSchema,
  width: z.coerce.number().min(2, "Largura minima 2%.").max(100),
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
});

export const saveInteractiveHomeworkFieldsSchema = z.object({
  fields: z
    .array(interactiveHomeworkFieldSchema)
    .min(1, "Mantenha pelo menos um campo de resposta.")
    .max(40, "Use no maximo 40 campos por homework."),
  homeworkId: z.string().min(1, "Homework invalida."),
});

export const deleteInteractiveHomeworkSchema = z.object({
  homeworkId: z.string().min(1, "Homework invalida."),
});

export const submitHomeworkSchema = z.object({
  homeworkId: z.string().min(1, "Homework invalida."),
  answer: z
    .string()
    .trim()
    .min(1, "Escreva sua resposta antes de enviar.")
    .max(6000, "A resposta pode ter no maximo 6000 caracteres."),
});

export const interactiveHomeworkAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        fieldId: z.string().min(1, "Campo invalido."),
        value: z
          .string()
          .max(50000, "Cada resposta pode ter no maximo 50000 caracteres."),
      }),
    )
    .max(80, "Use no maximo 80 respostas por homework."),
  homeworkId: z.string().min(1, "Homework invalida."),
});

export const reviewSubmissionSchema = z.object({
  submissionId: z.string().min(1, "Resposta invalida."),
  feedback: z
    .string()
    .trim()
    .min(2, "Escreva um feedback para o aluno.")
    .max(6000, "O feedback pode ter no maximo 6000 caracteres."),
});

export const homeworkSubmissionIdSchema = z.object({
  submissionId: z.string().min(1, "Resposta invalida."),
});

export type CreateLessonInput = z.input<typeof createLessonSchema>;
export type CreateInteractiveHomeworkInput = z.input<
  typeof createInteractiveHomeworkSchema
>;
export type CreateInteractiveLessonInput = z.input<
  typeof createInteractiveLessonSchema
>;
export type InteractiveHomeworkFieldInput = z.input<
  typeof interactiveHomeworkFieldSchema
>;
export type SaveInteractiveHomeworkFieldsInput = z.input<
  typeof saveInteractiveHomeworkFieldsSchema
>;
export type DeleteInteractiveHomeworkInput = z.input<
  typeof deleteInteractiveHomeworkSchema
>;
export type SubmitHomeworkInput = z.input<typeof submitHomeworkSchema>;
export type InteractiveHomeworkAnswerInput = z.input<
  typeof interactiveHomeworkAnswerSchema
>;
export type ReviewSubmissionInput = z.input<typeof reviewSubmissionSchema>;
export type HomeworkSubmissionIdInput = z.input<
  typeof homeworkSubmissionIdSchema
>;
