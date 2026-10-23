import { z } from "zod";

export const createUserSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
  role: z.enum(["admin", "operator", "viewer"]),
});

export const integrationPatchSchema = z.object({
  openai_model: z.string().trim().min(1).optional(),
  site_generation_prompt: z.string().trim().min(20).max(20000).optional(),
  evolution_url: z.string().trim().refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
    } catch { return false; }
  }, "Informe uma URL HTTP ou HTTPS válida, sem credenciais").transform(value => value.replace(/\/+$/, "")).optional(),
  evolution_instance: z.string().trim().optional(),
  whatsapp_test_mode: z.boolean().optional(),
  whatsapp_test_number: z.string().trim().optional(),
}).strict();

export function validateTestRecipient(settings: {whatsapp_test_mode: boolean; whatsapp_test_number: string}) {
  if (settings.whatsapp_test_mode && !/^\d{10,15}$/.test(settings.whatsapp_test_number.replace(/\D/g, ""))) {
    throw new Error("Informe um número válido para ativar o modo de teste");
  }
}
