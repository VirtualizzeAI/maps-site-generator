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
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({
      id:"dpl_1",
      projectId:"prj_site",
      url:"empresa-abcd-usuario.vercel.app",
      alias:["empresa-abcd.vercel.app"],
      aliasAssigned:true,
      readyState:"READY",
      target:"production",
    }),{status:200,headers:{"Content-Type":"application/json"}}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ssoProtection:null})))
      .mockResolvedValueOnce(new Response("<html>Site público</html>"));

    await expect(publishToVercel("empresa-abcd","<html></html>","token",fetcher)).resolves.toEqual({
      url:"https://empresa-abcd.vercel.app",
      deploymentId:"dpl_1",
      slug:"empresa-abcd",
    });
    const request=fetcher.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({name:"empresa-abcd",target:"production"});
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.vercel.com/v9/projects/prj_site");
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({ssoProtection:null});
    expect(fetcher.mock.calls[2]?.[0]).toBe("https://empresa-abcd.vercel.app");
    expect(fetcher.mock.calls[2]?.[1]?.headers).toBeUndefined();
    expect(fetcher.mock.calls[2]?.[1]?.redirect).toBe("manual");
  });

  it("não libera o link se a conta recusar remover a proteção",async()=>{
    const fetcher=vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({id:"dpl_1",readyState:"READY",url:"site.vercel.app"})))
      .mockResolvedValueOnce(new Response("Forbidden",{status:403}));
    await expect(publishToVercel("site","<html></html>","token",fetcher)).rejects.toThrow("tornar o site público");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("não libera link que ainda redireciona para o login",async()=>{
    vi.useFakeTimers();
    try{
      const fetcher=vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(JSON.stringify({id:"dpl_1",readyState:"READY",url:"site.vercel.app"})))
        .mockResolvedValueOnce(new Response("{}"));
      fetcher.mockImplementation(async()=>new Response(null,{status:302,headers:{location:"https://vercel.com/sso-api"}}));
      const result=expect(publishToVercel("site","<html></html>","token",fetcher)).rejects.toThrow("não está acessível publicamente");
      await vi.runAllTimersAsync();
      await result;
    }finally{vi.useRealTimers();}
  });
});
