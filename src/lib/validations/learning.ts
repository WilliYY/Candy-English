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

export const createHomeworkSchema = z.object({
  lessonId: z.string().min(1, "Selecione uma aula."),
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
  questionPrompt: z
    .string()
    .trim()
    .min(3, "Informe a pergunta da homework.")
    .max(2000, "A pergunta pode ter no maximo 2000 caracteres."),
  expectedAnswer: optionalText(
    2000,
    "A resposta esperada pode ter no maximo 2000 caracteres.",
  ),
});

export const submitHomeworkSchema = z.object({
  homeworkId: z.string().min(1, "Homework invalida."),
  answer: z
    .string()
    .trim()
    .min(1, "Escreva sua resposta antes de enviar.")
    .max(6000, "A resposta pode ter no maximo 6000 caracteres."),
});

export const reviewSubmissionSchema = z.object({
  submissionId: z.string().min(1, "Resposta invalida."),
  feedback: z
    .string()
    .trim()
    .min(2, "Escreva um feedback para o aluno.")
    .max(6000, "O feedback pode ter no maximo 6000 caracteres."),
});

export type CreateLessonInput = z.input<typeof createLessonSchema>;
export type CreateHomeworkInput = z.input<typeof createHomeworkSchema>;
export type SubmitHomeworkInput = z.input<typeof submitHomeworkSchema>;
export type ReviewSubmissionInput = z.input<typeof reviewSubmissionSchema>;
