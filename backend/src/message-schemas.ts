import { z } from "zod";

export const messageContentSchema = z.string().trim().min(1).max(4000);
export const editPendingMessageSchema = z.object({
  content: messageContentSchema,
  expected_updated_at: z.string().datetime(),
}).strict();
export const approveMessageSchema = z.object({
  content: messageContentSchema.optional(),
}).strict();
