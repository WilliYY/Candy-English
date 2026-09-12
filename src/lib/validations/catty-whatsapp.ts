import { z } from "zod";

export const whatsappContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(11).max(30).regex(/^\+[\d ()-]+$/, "Inclua +, código do país e DDD."),
  consent: z.literal(true, { error: "Confirme a autorização do contato." }),
});
export const whatsappSendSchema = z.object({
  contactId: z.string().min(1).max(100),
  text: z.string().trim().min(1).max(1000),
  operationId: z.uuid(),
  confirmed: z.literal(true, { error: "Confirme o destinatário e a mensagem." }),
});
