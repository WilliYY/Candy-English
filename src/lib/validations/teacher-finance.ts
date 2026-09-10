import { z } from "zod";

const shared = {
  id: z.string().trim().min(1).max(200),
  isPaid: z.boolean(),
  confirm: z.literal(true),
};
export const teacherPaymentStatusSchema = z.discriminatedUnion("kind", [
  z.object({ ...shared, kind: z.literal("TUITION"), expectedUpdatedAt: z.string().datetime() }).strict(),
  z.object({
    ...shared, kind: z.literal("PRODUCT"), month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
    sales: z.array(z.object({ id: z.string().min(1).max(200), updatedAt: z.string().datetime() }).strict()).min(1).max(500)
      .refine((sales) => new Set(sales.map((sale) => sale.id)).size === sales.length),
  }).strict(),
]);

export type TeacherPaymentStatusInput = z.infer<typeof teacherPaymentStatusSchema>;
