import { describe, expect, it } from "vitest";
import { searchCompanies } from "../src/integrations/search.js";
import type { IntegrationSettings } from "../src/types.js";

const integration:IntegrationSettings={organization_id:"org",serper_api_key:"",openai_api_key:"",openai_model:"gpt-5-mini",site_generation_prompt:"",vercel_token:"",evolution_url:"",evolution_api_key:"",evolution_instance:"",whatsapp_test_mode:false,whatsapp_test_number:"",updated_at:new Date().toISOString()};

describe("dados das empresas encontradas",()=>{
  it("preserva contatos, endereço e links no resultado",async()=>{
    const [company]=await searchCompanies("Barbearias","Mossoró",1,integration);
    expect(company).toMatchObject({city:"Mossoró",category:"Barbearias"});
    expect(company?.address).toBeTruthy();
    expect(company?.phone).toBeTruthy();
    expect(company?.maps_url).toContain("google.com/maps");
    expect(company?.raw_data).toEqual({mock:true});
  });
});
