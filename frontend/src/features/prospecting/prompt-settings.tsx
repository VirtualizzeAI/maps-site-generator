"use client";
import {useState} from "react";
import {apiRequest} from "@/services/api/client";
import {useActionNotification} from "@/components/action-notifications";

export function ProspectingPromptSettings({org,token,canManage,initialPrompt,defaultPrompt,refresh}:{org:string;token:string;canManage:boolean;initialPrompt:string;defaultPrompt:string;refresh:()=>void}){
 const notify=useActionNotification(),[prompt,setPrompt]=useState(initialPrompt),[saving,setSaving]=useState(false),[error,setError]=useState("");
 async function submit(e:React.FormEvent){
  e.preventDefault();if(saving||!canManage)return;setSaving(true);setError("");
  try{await apiRequest(`/api/v1/integrations?organization_id=${encodeURIComponent(org)}`,{method:"PUT",body:JSON.stringify({prospecting_prompt:prompt})},token);refresh();notify({variant:"success",title:"Prompt da prospecção salvo",description:"As próximas pesquisas usarão estas instruções."});}
  catch(e){const message=e instanceof Error?e.message:"Não foi possível salvar";setError(message);notify({variant:"error",title:"Não foi possível salvar o prompt",description:message});}
  finally{setSaving(false);}
 }
 return <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-2xl border bg-white p-6"><div><h2 className="font-bold">Prompt da prospecção web</h2><p className="mt-2 text-sm text-slate-500">Controle a estratégia de busca, confirmação do CNPJ/QSA e investigação dos perfis profissionais de sócios e fundadores.</p></div>
 {!canManage&&<p className="text-sm text-slate-600">Somente administradores podem alterar este prompt.</p>}
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 <fieldset disabled={!canManage||saving} className="space-y-4"><label className="block text-sm font-medium">Instruções para a prospecção web<textarea required minLength={20} maxLength={20000} rows={18} value={prompt} onChange={e=>setPrompt(e.target.value)} aria-describedby="prospecting-prompt-help" className="mt-2 w-full resize-y rounded-xl border bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-blue-500"/></label>
 <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={()=>setPrompt(defaultPrompt)} className="rounded-lg border px-3 py-2 text-sm font-medium">Restaurar prompt padrão</button><span className="text-xs text-slate-500">{prompt.length.toLocaleString("pt-BR")} / 20.000 caracteres</span></div>
 <p id="prospecting-prompt-help" className="text-sm text-slate-500">Os dados da empresa são enviados separadamente. As opções selecionadas, o formato do relatório e as validações de fontes continuam sendo aplicados. Alterações valem para pesquisas ainda não iniciadas e não refazem resultados anteriores. O modelo continua sendo escolhido em cada operação.</p>
 <p className="text-xs text-slate-500">Restaurar apenas preenche o editor. Clique em Salvar prompt para aplicar. Limite por requisição: 6 chamadas web, 10.000 tokens de saída e 180 segundos.</p>
 <button disabled={!canManage||saving||prompt.trim().length<20} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?"Salvando...":"Salvar prompt"}</button></fieldset>
 </form>;
}
