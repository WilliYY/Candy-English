import { z } from "zod";

export const routineDateSchema = z.string().date().refine(
  value => Number(value.slice(0, 4)) >= 2020 && Number(value.slice(0, 4)) <= 2100,
  "Escolha uma data entre 2020 e 2100.",
);
