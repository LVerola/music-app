import { z } from "zod";

export const schemaLogin = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

export type FormLogin = z.infer<typeof schemaLogin>;
