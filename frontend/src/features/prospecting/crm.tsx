"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight,ArrowLeft,GripVertical,Pencil,Plus,Trash2} from "lucide-react";
import {apiRequest} from "@/services/api/client";
import {useActionNotification} from "@/components/action-notifications";
import {crmRoot,type Board,type BoardDetail,type Card,type Stage} from "./crm-types";
import {CrmModal} from "./crm-modal";
import {ProspectingDetails,SourceLink} from "./result-details";

type EditorKind="new-board"|"edit-board"|"delete-board"|"new-stage"|"edit-stage"|"delete-stage"|"move-card"|"remove-card";
type Editor={kind:EditorKind;id:string;name:string;position:number;destination:string};
const titles:Record<EditorKind,string>={"new-board":"Criar kanban","edit-board":"Editar kanban","delete-board":"Excluir kanban","new-stage":"Criar etapa","edit-stage":"Editar etapa","delete-stage":"Excluir etapa","move-card":"Mover empresa","remove-card":"Remover empresa do kanban"};
const inputClass="mt-2 w-full rounded-xl border p-3";
export function ProspectingCrm({org,token,canEdit}:{org:string;token:string;canEdit:boolean}){
 const notify=useActionNotification();
 const [boards,setBoards]=useState<Board[]>([]),[selected,setSelected]=useState(""),[detail,setDetail]=useState<BoardDetail|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[editor,setEditor]=useState<Editor|null>(null);
 const [drag,setDrag]=useState<{cardId:string;x:number;y:number;stageId:string}|null>(null);
 const dragRef=useRef<{card:Card;x:number;y:number;active:boolean;stageId:string}|null>(null);
 const scrollRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(busy)return;
  let active=true;
  const load=async()=>{try{
   const list=await apiRequest<Board[]>(`${crmRoot}/boards?organization_id=${encodeURIComponent(org)}`,{},token);
   if(!active)return;setBoards(list);
   if(!list.some(b=>b.id===selected)){setSelected(list[0]?.id||"");setDetail(null);setError("");return;}
   const record=selected?await apiRequest<BoardDetail>(`${crmRoot}/boards/${selected}`,{},token):null;
   if(active){setDetail(record);setError("");}
  }catch(e){if(active)setError(e instanceof Error?e.message:"Falha ao carregar CRM");}finally{if(active)setLoading(false);}};
  void load();const timer=setInterval(load,5000);return()=>{active=false;clearInterval(timer);};
 },[org,token,selected,busy,revision]);

 function open(kind:EditorKind,id="",name="",position=0,destination=""){setEditor({kind,id,name,position,destination});}
 async function change(method:string,path:string,body:unknown,title:string):Promise<boolean>{
  if(busy||!canEdit)return false;setBusy(true);
  try{await apiRequest(crmRoot+path,{method,...(body!==undefined?{body:JSON.stringify(body)}:{})},token);setRevision(n=>n+1);notify({variant:"success",title,description:"Alteração salva no CRM."});return true;}
  catch(e){notify({variant:"error",title:"Não foi possível concluir",description:e instanceof Error?e.message:"Tente novamente."});setRevision(n=>n+1);return false;}
  finally{setBusy(false);}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!editor)return;let ok=false;
  switch(editor.kind){
   case "new-board":ok=await change("POST","/boards",{organization_id:org,name:editor.name},"Kanban criado");break;
   case "edit-board":ok=await change("PATCH",`/boards/${selected}`,{name:editor.name},"Kanban atualizado");break;
   case "delete-board":ok=await change("DELETE",`/boards/${selected}`,undefined,"Kanban excluído");if(ok){setSelected("");setDetail(null);}break;
   case "new-stage":ok=await change("POST",`/boards/${selected}/stages`,{name:editor.name},"Etapa criada");break;
   case "edit-stage":ok=await change("PATCH",`/stages/${editor.id}`,{name:editor.name,position:editor.position},"Etapa atualizada");break;
   case "delete-stage":ok=await change("DELETE",`/stages/${editor.id}`,editor.destination?{destination_stage_id:editor.destination}:{},"Etapa excluída");break;
   case "move-card":{const card=detail?.cards.find(c=>c.id===editor.id);if(card)ok=await move(card,editor.destination);break;}
   case "remove-card":ok=await change("DELETE",`/cards/${editor.id}`,undefined,"Empresa removida do kanban");break;
  }
  if(ok)setEditor(null);
 }
 async function move(card:Card,stageId:string){if(!stageId||stageId===card.stage_id)return true;return change("PATCH",`/cards/${card.id}`,{stage_id:stageId,expected_stage_id:card.stage_id},"Empresa movida de etapa");}
 async function order(stage:Stage,offset:number){await change("PATCH",`/stages/${stage.id}`,{name:stage.name,position:stage.position+offset},"Ordem das etapas atualizada");}
 function pointerMove(e:React.PointerEvent<HTMLButtonElement>){
  const current=dragRef.current;if(!current)return;
  if(!current.active&&Math.hypot(e.clientX-current.x,e.clientY-current.y)<6)return;
  current.active=true;
  const el=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-crm-stage]");
  current.stageId=el?.dataset.crmStage||"";
  setDrag({cardId:current.card.id,x:e.clientX,y:e.clientY,stageId:current.stageId});
  const scroll=scrollRef.current,rect=scroll?.getBoundingClientRect();
  if(scroll&&rect){if(e.clientX>rect.right-45)scroll.scrollBy({left:22});else if(e.clientX<rect.left+45)scroll.scrollBy({left:-22});}
 }
 function pointerEnd(e:React.PointerEvent<HTMLButtonElement>,cancel=false){
  const current=dragRef.current;dragRef.current=null;setDrag(null);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(!cancel&&current?.active&&current.stageId)void move(current.card,current.stageId);
 }
 const editingStage=detail?.stages.find(s=>s.id===editor?.id),stageCards=detail?.cards.filter(c=>c.stage_id===editor?.id).length||0;
 const alternatives=detail?.stages.filter(s=>s.id!==editor?.id)||[];
 const isDelete=editor?.kind.startsWith("delete")||editor?.kind==="remove-card";
 return <div className="min-w-0 space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">CRM da prospecção web</h2><p className="mt-1 text-sm text-slate-500">Organize as empresas pesquisadas e acompanhe cada etapa.</p></div>{canEdit&&<button disabled={busy} onClick={()=>open("new-board")} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Novo kanban</button>}</div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  {loading&&<p className="text-sm text-slate-500">Carregando CRM...</p>}
  {!loading&&!boards.length&&<div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Nenhum kanban criado. Crie um kanban e adicione empresas na aba Resultado de uma operação.</div>}
  {boards.length>0&&<div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"><label className="min-w-0 flex-1 basis-52 text-sm font-medium">Kanban<select disabled={busy||!!editor} value={selected} onChange={e=>{setSelected(e.target.value);setDetail(null);}} className={inputClass}>{boards.map(b=><option key={b.id} value={b.id}>{b.name} ({b.card_count})</option>)}</select></label>{canEdit&&<><button disabled={busy||!detail} onClick={()=>open("edit-board",selected,detail?.name)} className="rounded-lg border px-3 py-3 text-sm">Editar kanban</button><button disabled={busy||!detail} onClick={()=>open("delete-board")} className="rounded-lg border px-3 py-3 text-sm text-red-700">Excluir kanban</button><button disabled={busy||!detail} onClick={()=>open("new-stage")} className="rounded-lg border px-3 py-3 text-sm text-blue-700">Nova etapa</button></>}</div>}
  {selected&&!detail&&<p className="text-sm text-slate-500">Carregando kanban...</p>}
  {detail&&<><p role="status" className="text-xs text-slate-500">{busy?"Salvando alteração...":canEdit?"Arraste pelo ícone da empresa para outra etapa ou use Mover etapa. Alterações são salvas automaticamente.":"Você pode consultar este kanban."}</p><div ref={scrollRef} aria-label="Etapas do kanban" className="flex max-w-full items-stretch gap-4 overflow-x-auto pb-5">
   {detail.stages.map((s,index)=>{const cards=detail.cards.filter(c=>c.stage_id===s.id);return <section key={s.id} data-crm-stage={s.id} aria-label={`Etapa ${s.name}`} className={`min-h-64 w-72 shrink-0 rounded-xl border p-3 ${drag?.stageId===s.id?"border-blue-500 bg-blue-100":"bg-slate-100"}`}><div className="mb-3 flex items-center justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{s.name} <span className="text-xs text-slate-500">{cards.length}</span></h3>{canEdit&&<div className="flex shrink-0 gap-1"><button disabled={busy||index===0} title="Mover etapa para a esquerda" aria-label={`Mover ${s.name} para a esquerda`} onClick={()=>void order(s,-1)} className="rounded p-1 disabled:opacity-25"><ArrowLeft size={14}/></button><button disabled={busy||index===detail.stages.length-1} title="Mover etapa para a direita" aria-label={`Mover ${s.name} para a direita`} onClick={()=>void order(s,1)} className="rounded p-1 disabled:opacity-25"><ArrowRight size={14}/></button><button disabled={busy} aria-label={`Editar etapa ${s.name}`} onClick={()=>open("edit-stage",s.id,s.name,s.position)} className="rounded p-1"><Pencil size={14}/></button><button disabled={busy} aria-label={`Excluir etapa ${s.name}`} onClick={()=>open("delete-stage",s.id,s.name)} className="rounded p-1 text-red-600"><Trash2 size={14}/></button></div>}</div>
    <div className="space-y-3">{cards.map(card=><article key={card.id} aria-label={`Empresa ${card.result.name}`} className={`space-y-3 rounded-xl border bg-white p-3 shadow-sm ${drag?.cardId===card.id?"opacity-40":""}`}><div className="flex items-start gap-2">{canEdit&&<button disabled={busy} aria-label={`Arrastar ${card.result.name}`} style={{touchAction:"none"}} className="-ml-1 shrink-0 cursor-grab rounded p-1 text-slate-400 active:cursor-grabbing" onPointerDown={e=>{if(e.button!==0||busy)return;e.currentTarget.setPointerCapture(e.pointerId);dragRef.current={card,x:e.clientX,y:e.clientY,active:false,stageId:""};}} onPointerMove={pointerMove} onPointerUp={e=>pointerEnd(e)} onPointerCancel={e=>pointerEnd(e,true)} onLostPointerCapture={()=>{dragRef.current=null;setDrag(null);}} onKeyDown={e=>{if(e.key==="Escape"){dragRef.current=null;setDrag(null);}}}><GripVertical size={19}/></button>}<div className="min-w-0"><h4 className="break-words text-sm font-semibold">{card.result.name}</h4><p className="mt-1 text-xs text-slate-500">{card.result.city}</p></div></div>
     {card.result.report&&<p className="line-clamp-2 text-xs text-slate-600">{card.result.report.summary}</p>}
     <div className="flex flex-wrap gap-3 text-xs">{card.result.website&&<SourceLink url={card.result.website}>Site existente</SourceLink>}<Link href={`/prospecting/operations/${card.operation.id}`} className="text-blue-700 underline">Operação de origem</Link></div>
     <div className="flex flex-wrap gap-2 text-xs">{card.result.report&&<ProspectingDetails result={card.result} op={card.operation}/ >}{canEdit&&<><button disabled={busy||detail.stages.length<2} onClick={()=>open("move-card",card.id,card.result.name,0,detail.stages.find(t=>t.id!==card.stage_id)?.id)} className="rounded-lg border px-3 py-2">Mover etapa</button><button disabled={busy} aria-label={`Remover ${card.result.name} do kanban`} onClick={()=>open("remove-card",card.id,card.result.name)} className="rounded-lg border px-2 py-2 text-red-700"><Trash2 size={14}/></button></>}</div>
    </article>)}{!cards.length&&<p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Nenhuma empresa nesta etapa</p>}</div>
   </section>;})}
  </div>{!detail.stages.length&&<p className="rounded-xl border bg-white p-6 text-sm text-slate-500">Este kanban ainda não tem etapas. Crie uma etapa para adicionar empresas.</p>}</>}
  {drag&&<div aria-hidden style={{left:Math.min(drag.x+12,window.innerWidth-200),top:Math.max(8,drag.y-25)}} className="pointer-events-none fixed z-[90] max-w-48 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-xl">Movendo empresa</div>}
  <CrmModal open={!!editor} onClose={()=>setEditor(null)} busy={busy} title={editor?titles[editor.kind]:""} description={editor?.kind==="delete-board"?"O kanban sairá do CRM. Os resultados e análises das operações serão preservados.":editor?.kind==="delete-stage"?"Empresas desta etapa precisam ser transferidas para outra antes da exclusão.":editor?.kind==="remove-card"?"A empresa será removida deste kanban. A pesquisa de origem será preservada.":"Defina as informações e confirme para salvar."}>
   {editor&&<form onSubmit={submit}><fieldset disabled={busy} className="space-y-4">
    {["new-board","edit-board","new-stage","edit-stage"].includes(editor.kind)&&<label className="block text-sm font-medium">Nome<input required maxLength={editor.kind.includes("board")?100:80} value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})} className={inputClass}/></label>}
    {editor.kind==="edit-stage"&&<label className="block text-sm font-medium">Posição<select value={editor.position} onChange={e=>setEditor({...editor,position:Number(e.target.value)})} className={inputClass}>{detail?.stages.map((s,i)=><option key={s.id} value={i}>{i+1}ª etapa</option>)}</select></label>}
    {editor.kind==="delete-stage"&&<><p className="text-sm">Excluir <b>{editingStage?.name}</b> · {stageCards} empresa(s)</p>{stageCards>0&&(alternatives.length?<label className="block text-sm font-medium">Transferir empresas para<select required value={editor.destination} onChange={e=>setEditor({...editor,destination:e.target.value})} className={inputClass}><option value="">Selecione uma etapa</option>{alternatives.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:<p role="alert" className="text-sm text-amber-700">Crie outra etapa para receber as empresas antes de excluir esta.</p>)}</>}
    {editor.kind==="move-card"&&<label className="block text-sm font-medium">Etapa de destino<select required value={editor.destination} onChange={e=>setEditor({...editor,destination:e.target.value})} className={inputClass}>{detail?.stages.filter(s=>s.id!==detail.cards.find(c=>c.id===editor.id)?.stage_id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
    <div className="flex justify-end gap-3"><button type="button" onClick={()=>setEditor(null)} className="rounded-lg border px-4 py-2">Cancelar</button><button disabled={busy||(editor.kind==="delete-stage"&&stageCards>0&&!editor.destination)} className={`rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50 ${isDelete?"bg-red-600":"bg-blue-600"}`}>{busy?"Salvando...":isDelete?"Confirmar exclusão":"Salvar"}</button></div>
   </fieldset></form>}
  </CrmModal>
 </div>;
}
