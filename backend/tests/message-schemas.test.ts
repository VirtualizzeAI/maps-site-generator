import { describe, expect, it } from "vitest";
import { approveMessageSchema, editPendingMessageSchema } from "../src/message-schemas.js";

const version = "2026-10-23T12:00:00.000Z";
describe("edição de mensagens pendentes", () => {
  it("preserva parágrafos e remove somente espaços nas bordas", () => {
    expect(editPendingMessageSchema.parse({content:"  Olá!\n\nVeja o site.  ",expected_updated_at:version}).content).toBe("Olá!\n\nVeja o site.");
  });
  it("recusa texto vazio e textos acima de 4.000 caracteres", () => {
    for (const content of [" ", "a".repeat(4001)]) {
      expect(editPendingMessageSchema.safeParse({content,expected_updated_at:version}).success).toBe(false);
    }
  });
  it("exige uma versão válida para evitar sobrescrita silenciosa", () => {
    expect(editPendingMessageSchema.safeParse({content:"Olá"}).success).toBe(false);
    expect(editPendingMessageSchema.safeParse({content:"Olá",expected_updated_at:"inválido"}).success).toBe(false);
  });
  it("não permite alterar destinatário ou status pela edição", () => {
    expect(editPendingMessageSchema.safeParse({content:"Olá",expected_updated_at:version,recipient:"outro"}).success).toBe(false);
    expect(editPendingMessageSchema.safeParse({content:"Olá",expected_updated_at:version,status:"sent"}).success).toBe(false);
  });
  it("aprovação sem texto continua usando a mensagem salva", () => {
    expect(approveMessageSchema.parse({})).toEqual({});
  });
});
