import { z } from "zod";

export const beanSelectionSchema = z.object({
  beanId: z.string().min(1, "Pick a bean"),
  method: z.string().min(1, "Pick a brewing method"),
});
