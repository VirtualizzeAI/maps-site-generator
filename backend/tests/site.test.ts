import { describe, expect, it, vi } from "vitest";
import { publicDeploymentUrl, publishToVercel } from "../src/integrations/site.js";

describe("publicação pública na Vercel",()=>{
  it("prioriza o alias público de produção",()=>{
    expect(publicDeploymentUrl({
      id:"dpl_1",
      url:"empresa-abcd-usuario.vercel.app",
      alias:["empresa-abcd.vercel.app"],
      readyState:"READY",
      target:"production",
    },"empresa-abcd")).toBe("https://empresa-abcd.vercel.app");
  });

  it("cria um deploy de produção e retorna o domínio público",async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id:"dpl_1",
      url:"empresa-abcd-usuario.vercel.app",
      alias:["empresa-abcd.vercel.app"],
      aliasAssigned:true,
      readyState:"READY",
      target:"production",
    }),{status:200,headers:{"Content-Type":"application/json"}}));

    await expect(publishToVercel("empresa-abcd","<html></html>","token",fetcher)).resolves.toEqual({
      url:"https://empresa-abcd.vercel.app",
      deploymentId:"dpl_1",
      slug:"empresa-abcd",
    });
    const request=fetcher.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({name:"empresa-abcd",target:"production"});
  });
});
