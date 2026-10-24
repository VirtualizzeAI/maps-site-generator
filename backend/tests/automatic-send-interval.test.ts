import { describe, expect, it } from "vitest";
import { automaticSendWaitMs } from "../src/automatic-send-interval.js";
import { integrationPatchSchema } from "../src/admin-schemas.js";

const at = Date.parse("2026-10-23T12:00:30.000Z");
const history = {
  operations: [
    {id:"auto-old",organization_id:"org",approval_mode:"automatic" as const},
    {id:"manual",organization_id:"org",approval_mode:"human_review" as const},
    {id:"other",organization_id:"other-org",approval_mode:"automatic" as const},
  ],
  operationCompanies: [{id:"auto-link",operation_id:"auto-old"},{id:"manual-link",operation_id:"manual"},{id:"other-link",operation_id:"other"}],
  messages: [
    {organization_id:"org",operation_company_id:"auto-link",status:"sent",sent_at:"2026-10-23T12:00:20.000Z"},
    {organization_id:"org",operation_company_id:"manual-link",status:"sent",sent_at:"2026-10-23T12:00:29.000Z"},
    {organization_id:"other-org",operation_company_id:"other-link",status:"sent",sent_at:"2026-10-23T12:00:29.000Z"},
  ],
};

describe("intervalo entre envios automáticos", () => {
  it("não atrasa o primeiro envio nem quando o intervalo é zero", () => {
    expect(automaticSendWaitMs({...history,messages:[]},"org",30,at)).toBe(0);
    expect(automaticSendWaitMs(history,"org",0,at)).toBe(0);
  });
  it("considera o tempo já decorrido e mantém o histórico entre operações", () => {
    expect(automaticSendWaitMs(history,"org",30,at)).toBe(20000);
    expect(automaticSendWaitMs(history,"org",5,at)).toBe(0);
  });
  it("ignora envios manuais, outras organizações e mensagens sem confirmação", () => {
    expect(automaticSendWaitMs({...history,messages:history.messages.slice(1)},"org",30,at)).toBe(0);
    expect(automaticSendWaitMs({...history,messages:[{...history.messages[0]!,status:"failed"}]},"org",30,at)).toBe(0);
    expect(automaticSendWaitMs({...history,messages:[{...history.messages[0]!,sent_at:"inválido"}]},"org",30,at)).toBe(0);
  });
  it("aceita apenas segundos inteiros entre zero e uma hora", () => {
    for(const value of [0,45,3600])expect(integrationPatchSchema.safeParse({automatic_send_interval_seconds:value}).success).toBe(true);
    for(const value of [-1,1.5,3601,"30"])expect(integrationPatchSchema.safeParse({automatic_send_interval_seconds:value}).success).toBe(false);
  });
});
