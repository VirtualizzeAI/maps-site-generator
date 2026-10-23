import { describe, expect, it } from "vitest";
import { createUserSchema, integrationPatchSchema, validateTestRecipient } from "../src/admin-schemas.js";

describe("cadastro de usuário", () => {
  const input = {organization_id:"ddae0339-2ee9-4fb2-90dd-7b77dbfb834f",name:" Operador ",email:" USER@EXAMPLE.COM ",password:"test-password-123",role:"operator"};
  it("normaliza nome e e-mail antes de persistir", () => {
    expect(createUserSchema.parse(input)).toMatchObject({name:"Operador",email:"user@example.com"});
  });
  it("recusa nomes que violariam a restrição do banco", () => {
    expect(createUserSchema.safeParse({...input,name:"  "}).success).toBe(false);
    expect(createUserSchema.safeParse({...input,name:"x".repeat(121)}).success).toBe(false);
  });
});

describe("configurações Evolution Go", () => {
  it("normaliza a URL e dispensa nome de instância", () => {
    expect(integrationPatchSchema.parse({evolution_url:" https://go.example/// "})).toEqual({evolution_url:"https://go.example"});
  });
  it("recusa URLs inválidas ou que embutem credenciais", () => {
    for (const evolution_url of ["go.example", "ftp://go.example", "https://user:secret@go.example", "https://go.example?apikey=secret"]) {
      expect(integrationPatchSchema.safeParse({evolution_url}).success).toBe(false);
    }
  });
  it("recusa gravação de segredos pelo endpoint de opções", () => {
    expect(integrationPatchSchema.safeParse({evolution_api_key:"secret"}).success).toBe(false);
  });
  it("permite preservar o destinatário salvo numa atualização parcial", () => {
    const current={whatsapp_test_mode:true,whatsapp_test_number:"(11) 98888-7777"};
    const patch=integrationPatchSchema.parse({whatsapp_test_mode:true,evolution_instance:"Referência"});
    expect(()=>validateTestRecipient({...current,...patch})).not.toThrow();
    expect(()=>validateTestRecipient({...current,whatsapp_test_number:"1"})).toThrow("número válido");
  });
});
