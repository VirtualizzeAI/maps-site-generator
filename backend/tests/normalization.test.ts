import { describe, expect, it } from "vitest";
import { identities, normalizeDomain, normalizePhone, normalizeText } from "../src/normalization.js";

describe("normalização e deduplicação",()=>{
  it("remove acentos e pontuação",()=>expect(normalizeText(" Clínica São João! ")).toBe("clinica sao joao"));
  it("normaliza telefone brasileiro",()=>expect(normalizePhone("(84) 99999-1234")).toBe("5584999991234"));
  it("normaliza domínio",()=>expect(normalizeDomain("https://www.Exemplo.com.br/contato")).toBe("exemplo.com.br"));
  it("produz identidades fortes",()=>expect(identities({source_id:"place-123",phone:"(84) 99999-1234",website:"https://empresa.com.br",name:"Empresa São José",address:"Rua Principal, 10"})).toEqual(["place:place-123","phone:5584999991234","domain:empresa.com.br","name_address:empresa sao jose|rua principal 10"]));
});
