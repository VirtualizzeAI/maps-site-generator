"use client";
import {useEffect,useState} from "react";
import {Dialog} from "radix-ui";
import {Loader2,Search,X} from "lucide-react";
import {apiRequest} from "@/services/api/client";
import {useActionNotification} from "@/components/action-notifications";
import {analysisModelOptions,type AnalysisModel} from "@/components/advanced-analysis";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {Operation} from "./types";
import {labels,usd} from "./result-details";
export function ProspectingModule({org,token,canCreate}:{org:string;token:string;canCreate:boolean}) {
 const router=useRouter();
 const notify=useActionNotification(),[operations,setOperations]=useState<Operation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const [form,setForm]=useState({niche:"",city:"",target_count:10,collect_linkedin:true,collect_contacts:true,model:"gpt-6.1-sol" as AnalysisModel});
 useEffect(()=>{let active=true;const load=async()=>{try{const list=await apiRequest<Operation[]>(`/api/v1/prospecting/operations?organization_id=${encodeURIComponent(org)}`,{},token);if(active){setOperations(list);setError("");}}catch(e){if(active)setError(e instanceof Error?e.message:"Falha ao carregar prospecções");}finally{if(active)setLoading(false);}};void load();const timer=setInterval(load,3000);return()=>{active=false;clearInterval(timer);};},[org,token]);
 async function create(e:React.FormEvent){e.preventDefault();if(busy||!canCreate||(!form.collect_linkedin&&!form.collect_contacts))return;setBusy(true);try{const op=await apiRequest<Operation>("/api/v1/prospecting/operations",{method:"POST",body:JSON.stringify({...form,organization_id:org})},token);setOperations(current=>[op,...current]);setOpen(false);notify({variant:"success",title:"Prospecção criada",description:"A pesquisa foi adicionada à fila."});router.push(`/prospecting/operations/${op.id}`);}catch(e){notify({variant:"error",title:"Não foi possível criar a prospecção",description:e instanceof Error?e.message:"Tente novamente."});}finally{setBusy(false);}}
 return <div className="space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Prospecção web</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Encontre empresas e dados comerciais com pesquisa web pela IA. Não gera sites nem envia mensagens.</p></div>{canCreate&&<button onClick={()=>setOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Search size={16} />Nova prospecção</button>}</div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <Dialog.Root open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" /><Dialog.Content className="fixed right-0 top-0 z-[51] h-dvh w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl outline-none"><div className="flex items-start justify-between gap-3"><Dialog.Title className="text-xl font-bold">Nova prospecção</Dialog.Title><Dialog.Close aria-label="Fechar nova prospecção" disabled={busy}><X /></Dialog.Close></div><Dialog.Description className="mt-2 text-sm text-slate-500">Escolha o nicho, a cidade e os dados que deseja pesquisar. Resultados dependem das fontes públicas disponíveis.</Dialog.Description>
   <form onSubmit={create} className="mt-6 space-y-5"><fieldset disabled={busy} className="space-y-5">
    <label className="block text-sm font-medium">Nicho<input required minLength={2} maxLength={120} value={form.niche} onChange={e=>setForm({...form,niche:e.target.value})} className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Ex.: clínicas odontológicas" /></label>
    <label className="block text-sm font-medium">Cidade<input required minLength={2} maxLength={160} value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Ex.: Mossoró" /></label>
    <label className="block text-sm font-medium">Quantidade de empresas<input type="number" required min={1} max={30} value={form.target_count} onChange={e=>setForm({...form,target_count:Number(e.target.value)})} className="mt-2 w-full rounded-xl border px-4 py-3" /></label><p className="text-xs text-slate-500">Até 30 empresas por operação. A pesquisa pode retornar menos se não houver fontes suficientes.</p>
    <fieldset className="space-y-3 rounded-xl border bg-slate-50 p-4"><legend className="px-1 text-sm font-semibold">Dados desejados</legend>
     <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.collect_linkedin} onChange={e=>setForm({...form,collect_linkedin:e.target.checked})} className="h-4 w-4 accent-blue-600" />LinkedIn e responsáveis</label>
     <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.collect_contacts} onChange={e=>setForm({...form,collect_contacts:e.target.checked})} className="h-4 w-4 accent-blue-600" />Redes sociais e telefones</label>
     {!form.collect_linkedin&&!form.collect_contacts&&<p role="alert" className="text-xs text-red-600">Selecione pelo menos um grupo de dados.</p>}
    </fieldset>
    <label className="block text-sm font-medium">Modelo da pesquisa<select value={form.model} onChange={e=>setForm({...form,model:e.target.value as AnalysisModel})} className="mt-2 w-full rounded-xl border px-3 py-3">{analysisModelOptions.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
    <p className="text-xs text-slate-500">Pesquisa e análise consomem tokens e chamadas web. Site existente e análise rápida são buscados em todas as opções; responsáveis e contatos só nos grupos selecionados.</p>
    <button disabled={busy||(!form.collect_linkedin&&!form.collect_contacts)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">{busy&&<Loader2 size={16} className="animate-spin" />}{busy?"Criando...":"Criar prospecção"}</button>
   </fieldset></form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
  {loading&&<p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Carregando prospecções...</p>}
  <section aria-label="Histórico de prospecções" className="overflow-hidden rounded-xl border bg-white"><h3 className="border-b px-4 py-3 font-semibold">Operações de prospecção</h3>{operations.map(op=><Link key={op.id} href={`/prospecting/operations/${op.id}`} className="flex w-full flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50"><span className="min-w-0 break-words"><b className="text-sm">{op.niche} em {op.city}</b><small className="mt-1 block text-slate-500">{new Date(op.created_at).toLocaleString("pt-BR")} · {op.model} · {op.collect_linkedin?"LinkedIn/responsáveis":""}{op.collect_linkedin&&op.collect_contacts?" + ":""}{op.collect_contacts?"Redes/telefones":""}</small></span><span className="text-xs text-slate-600">{labels[op.status]||op.status} · {op.analyzed_count}/{op.found_count} empresas{op.totals?` · ${usd(op.totals.estimated_cost_usd)}`:""}</span></Link>)}{!loading&&!operations.length&&<p className="p-6 text-center text-sm text-slate-500">Nenhuma prospecção criada.</p>}</section>
 </div>;
}
