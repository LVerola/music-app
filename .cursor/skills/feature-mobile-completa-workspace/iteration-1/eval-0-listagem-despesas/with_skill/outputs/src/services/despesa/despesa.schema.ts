import { z } from "zod";

export const schemaCriarDespesa = z.object({
  descricao: z.string().min(3, "Descrição precisa ter ao menos 3 caracteres"),
  valorCentavos: z
    .number({ invalid_type_error: "Informe um valor válido" })
    .int()
    .positive("Valor deve ser maior que zero"),
  categoria: z.enum(["alimentacao", "transporte", "outros"], {
    errorMap: () => ({ message: "Escolha uma categoria" }),
  }),
});

export type FormCriarDespesa = z.infer<typeof schemaCriarDespesa>;
