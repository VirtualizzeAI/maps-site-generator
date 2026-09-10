"use client";

import { useMemo, useState } from "react";
import { Activity, Building2, CalendarClock, Check, ChevronRight, CircleAlert, Clock3, ExternalLink, LayoutDashboard, MapPin, MessageCircle, MoreHorizontal, Play, Plus, RefreshCw, Search, Send, Settings, Sparkles, Users, X, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type CompanyStatus = "Analisando" | "Gerando site" | "Enviado" | "Descartada" | "Aguardando revisão" | "Bloqueada por histórico";
type Company = { name: string; category: string; city: string; phone: string; presence: string; status: CompanyStatus; reason?: string; url?: string };

const companies: Company[] = [
  { name: "Barbearia Imperial", category: "Barbearia", city: "Mossoró, RN", phone: "(84) 99124-8080", presence: "Instagram + Maps", status: "Gerando site" },
  { name: "Studio Barba & Cia", category: "Barbearia", city: "Mossoró, RN", phone: "(84) 99872-4410", presence: "Somente Maps", status: "Aguardando revisão", url: "https://studio-barba-cia.vercel.app" },
  { name: "Barbearia Dom Pedro", category: "Barbearia", city: "Mossoró, RN", phone: "(84) 98731-2004", presence: "Site próprio", status: "Descartada", reason: "Site responsivo e atualizado encontrado" },
  { name: "Seu Corte Barbearia", category: "Barbearia", city: "Mossoró, RN", phone: "(84) 99662-1159", presence: "Instagram + Maps", status: "Enviado", url: "https://seu-corte-mossoro.vercel.app" },
  { name: "Mestre Navalha", category: "Barbearia", city: "Mossoró, RN", phone: "(84) 98815-6077", presence: "Em verificação", status: "Analisando" },
  { name: "Barbearia Central", category: "Barbearia", city: "Mossoró, RN", phone: "(84) 99418-2036", presence: "Instagram + Maps", status: "Bloqueada por histórico", reason: "Empresa já prospectada na operação #OP-018 em 22/08/2026" },
];

const navItems = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Operações", icon: Activity },
  { label: "Empresas", icon: Building2 },
  { label: "Configurações", icon: Settings },
];

const statusStyles: Record<CompanyStatus, string> = {
  Analisando: "border-blue-200 bg-blue-50 text-blue-700",
  "Gerando site": "border-violet-200 bg-violet-50 text-violet-700",
  Enviado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Descartada: "border-slate-200 bg-slate-100 text-slate-600",
  "Aguardando revisão": "border-amber-200 bg-amber-50 text-amber-700",
  "Bloqueada por histórico": "border-slate-300 bg-slate-100 text-slate-700",
};

function StatusBadge({ status }: { status: CompanyStatus }) {
  return <Badge variant="outline" className={`rounded-full px-2.5 py-1 font-medium ${statusStyles[status]}`}>{status}</Badge>;
}

export default function Home() {
  const [active, setActive] = useState("Visão geral");
  const [newOperationOpen, setNewOperationOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [operationStarted, setOperationStarted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredCompanies = useMemo(() => companies.filter((company) => `${company.name} ${company.status} ${company.city}`.toLowerCase().includes(searchTerm.toLowerCase())), [searchTerm]);

  function startOperation() {
    setOperationStarted(true);
    setNewOperationOpen(false);
    setActive("Visão geral");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col bg-[#0b1428] px-4 py-5 text-white lg:flex">
          <div className="mb-8 flex items-center gap-3 px-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-950/40"><Zap className="size-5 fill-white" /></div>
            <div><p className="text-[17px] font-bold tracking-tight">Virtualizze</p><p className="text-xs text-slate-400">Prospector</p></div>
          </div>
          <nav className="space-y-1" aria-label="Navegação principal">
            {navItems.map((item) => { const Icon = item.icon; const isActive = active === item.label; return (
              <button key={item.label} onClick={() => setActive(item.label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${isActive ? "bg-white/10 text-white shadow-inner shadow-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Icon className={`size-[18px] ${isActive ? "text-cyan-400" : ""}`} />{item.label}
              </button>
            ); })}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-slate-300">WhatsApp</span><span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" /> Conectado</span></div>
            <p className="text-sm font-semibold">Virtualizze Comercial</p><p className="mt-1 text-xs text-slate-500">+55 84 •••••-4821</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#0b1428] text-white lg:hidden"><Zap className="size-4 fill-white" /></div><div><h1 className="text-lg font-bold tracking-tight sm:text-xl">{active}</h1><p className="hidden text-xs text-slate-500 sm:block">Acompanhe sua operação de prospecção</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3"><Button variant="outline" size="sm" className="hidden bg-white sm:flex"><CalendarClock /> Agendar</Button><Button size="sm" onClick={() => setNewOperationOpen(true)} className="bg-blue-600 shadow-sm shadow-blue-200 hover:bg-blue-700"><Plus /> Nova operação</Button><div className="ml-1 grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">JV</div></div>
          </header>
          <div className="p-4 sm:p-7">
            {active === "Configurações" ? <SettingsView /> : active === "Empresas" ? <CompaniesView companies={filteredCompanies} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSelect={setSelectedCompany} /> : active === "Operações" ? <OperationsView onNew={() => setNewOperationOpen(true)} /> : <Overview companies={companies} operationStarted={operationStarted} onSelect={setSelectedCompany} onNew={() => setNewOperationOpen(true)} />}
          </div>
        </section>
      </div>

      <Sheet open={newOperationOpen} onOpenChange={setNewOperationOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
          <SheetHeader className="border-b px-6 py-5"><SheetTitle className="text-xl">Nova operação</SheetTitle><SheetDescription>Defina o público, o volume e como os contatos serão enviados.</SheetDescription></SheetHeader>
          <div className="space-y-6 px-6 py-2">
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Nicho<Input defaultValue="Barbearias" className="mt-2" /></label><label className="space-y-2 text-sm font-medium">Cidade<Input defaultValue="Mossoró, RN" className="mt-2" /></label></div>
            <label className="block space-y-2 text-sm font-medium">Quantidade de empresas<Input type="number" defaultValue="50" min="1" max="500" className="mt-2" /><span className="block text-xs font-normal text-slate-500">A quantidade considera apenas empresas novas e elegíveis para prospecção.</span></label>
            <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600"><Building2 className="size-[18px]" /></span>
              <div><p className="text-sm font-semibold">Bloqueio de prospecção duplicada</p><p className="mt-1 text-xs leading-5 text-blue-700">Antes da análise, o sistema consulta todo o histórico. Empresas já prospectadas são registradas na operação como bloqueadas e não seguem para geração de site ou envio.</p></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold">Revisão humana</p><p className="mt-1 text-xs leading-5 text-slate-500">Quando ativa, a mensagem fica aguardando aprovação antes do envio.</p></div><Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} aria-label="Exigir revisão humana" /></div>
              <div className="mt-4 border-t border-slate-200 pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modo selecionado</p><p className="mt-1.5 text-sm font-semibold text-slate-900">{approvalRequired ? "Gerar mensagem e aguardar aprovação" : "Enviar automaticamente com o template"}</p></div>
            </div>
            <label className="block space-y-2 text-sm font-medium">Template da mensagem<Textarea className="mt-2 min-h-36 resize-none leading-6" defaultValue={"Olá, {{nome_empresa}}! Criamos uma demonstração de site para mostrar como sua empresa pode se apresentar melhor no digital:\n\n{{url_site}}\n\nPosso te explicar como funciona?"} /><span className="block text-xs font-normal text-slate-500">Variáveis: {"{{nome_empresa}}"}, {"{{url_site}}"}, {"{{cidade}}"}</span></label>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">Agendar execução</p><p className="mt-1 text-xs text-slate-500">Ou inicie assim que salvar.</p></div><Switch checked={scheduled} onCheckedChange={setScheduled} aria-label="Agendar execução" /></div>
            {scheduled && <Input type="datetime-local" aria-label="Data e hora da execução" />}
          </div>
          <SheetFooter className="border-t px-6 py-5 sm:flex-row"><Button variant="outline" onClick={() => setNewOperationOpen(false)} className="flex-1">Cancelar</Button><Button onClick={startOperation} className="flex-1 bg-blue-600 hover:bg-blue-700">{scheduled ? <CalendarClock /> : <Play />} {scheduled ? "Salvar agendamento" : "Iniciar agora"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}><CompanyDetail company={selectedCompany} /></Sheet>
    </main>
  );
}

function Overview({ companies, operationStarted, onSelect, onNew }: { companies: Company[]; operationStarted: boolean; onSelect: (company: Company) => void; onNew: () => void }) {
  const stages = [
    { label: "Busca", value: "50 novas · 12 bloqueadas", done: true },
    { label: "Análise digital", value: "32 de 50", active: true },
    { label: "Geração", value: "8 sites" },
    { label: "Publicação", value: "6 online" },
    { label: "Envio", value: "4 enviados" },
  ];
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Empresas encontradas", value: operationStarted ? "192" : "142", detail: "50 novas · 12 repetidas bloqueadas", icon: Search, tone: "blue" },
        { label: "Sites gerados", value: "34", detail: "24% das analisadas", icon: Sparkles, tone: "violet" },
        { label: "Mensagens enviadas", value: "29", detail: "3 aguardando revisão", icon: Send, tone: "cyan" },
        { label: "Descartadas", value: "58", detail: "41 já tinham site", icon: X, tone: "slate" },
      ].map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{metric.label}</p><span className={`metric-icon metric-${metric.tone}`}><Icon className="size-[18px]" /></span></div><p className="mt-4 text-3xl font-bold tracking-tight">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></div>; })}
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span><h2 className="font-bold">Barbearias em Mossoró</h2></div><p className="mt-1 text-sm text-slate-500">Operação #OP-024 · iniciada por João Vitor às 13:42</p></div><div className="flex items-center gap-2"><Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700">Automático</Badge><Button variant="outline" size="sm"><MoreHorizontal /></Button></div></div>
      <div className="p-5 sm:p-6"><div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold">32 de 50 empresas analisadas</span><span className="font-semibold text-blue-600">64%</span></div><Progress value={64} className="h-2.5 bg-blue-100 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-blue-600 [&_[data-slot=progress-indicator]]:to-cyan-400" />
        <div className="mt-7 grid gap-3 md:grid-cols-5">{stages.map((stage, index) => <div key={stage.label} className={`rounded-xl border p-3.5 ${stage.active ? "border-blue-300 bg-blue-50/80" : "border-slate-200 bg-slate-50"}`}><span className={`grid size-7 place-items-center rounded-full ${stage.done ? "bg-emerald-500 text-white" : stage.active ? "bg-blue-600 text-white" : "bg-white text-slate-400"}`}>{stage.done ? <Check className="size-4" /> : stage.active ? <RefreshCw className="size-3.5 animate-spin" /> : <span className="text-xs font-bold">{index + 1}</span>}</span><p className="mt-3 text-sm font-semibold">{stage.label}</p><p className="mt-0.5 text-xs text-slate-500">{stage.value}</p></div>)}</div>
      </div>
    </section>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.65fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="font-bold">Processamento agora</h2><p className="mt-0.5 text-xs text-slate-500">Atualizações da operação em execução</p></div><Button variant="ghost" size="sm" className="text-blue-600">Ver todas <ChevronRight /></Button></div>
        <CompanyTable companies={companies} onSelect={onSelect} />
      </section>
      <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Próximas execuções</h2><Clock3 className="size-4 text-slate-400" /></div><div className="mt-5 space-y-4">{[{ niche: "Clínicas odontológicas", city: "Natal, RN", time: "Amanhã, 09:00", count: 30 }, { niche: "Academias", city: "Fortaleza, CE", time: "Sexta, 14:00", count: 50 }].map((job) => <div key={job.niche} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{job.niche}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3" /> {job.city}</p></div><Badge variant="outline" className="rounded-full">{job.count}</Badge></div><p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600"><CalendarClock className="size-3.5" /> {job.time}</p></div>)}</div><Button variant="outline" onClick={onNew} className="mt-4 w-full"><Plus /> Agendar operação</Button></aside>
    </div>
  </div>;
}

function CompanyTable({ companies, onSelect }: { companies: Company[]; onSelect: (company: Company) => void }) {
  return <Table><TableHeader><TableRow className="bg-slate-50/70 hover:bg-slate-50/70"><TableHead className="pl-6 text-xs text-slate-500">Empresa</TableHead><TableHead className="text-xs text-slate-500">Presença digital</TableHead><TableHead className="text-xs text-slate-500">Status</TableHead><TableHead className="pr-6 text-right text-xs text-slate-500">Detalhes</TableHead></TableRow></TableHeader><TableBody>{companies.map((company) => <TableRow key={company.name} className="cursor-pointer" onClick={() => onSelect(company)}><TableCell className="py-4 pl-6"><p className="font-semibold">{company.name}</p><p className="mt-0.5 text-xs text-slate-500">{company.phone}</p></TableCell><TableCell className="text-slate-600">{company.presence}</TableCell><TableCell><StatusBadge status={company.status} /></TableCell><TableCell className="pr-6 text-right"><ChevronRight className="ml-auto size-4 text-slate-400" /></TableCell></TableRow>)}</TableBody></Table>;
}

function CompaniesView({ companies, searchTerm, setSearchTerm, onSelect }: { companies: Company[]; searchTerm: string; setSearchTerm: (value: string) => void; onSelect: (company: Company) => void }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-lg font-bold">Base de empresas</h2><p className="mt-1 text-sm text-slate-500">Registro único usado por todas as operações para impedir uma nova prospecção da mesma empresa.</p></div><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar empresa ou status" className="pl-9" /></div></div><CompanyTable companies={companies} onSelect={onSelect} /></section>;
}

function OperationsView({ onNew }: { onNew: () => void }) {
  const rows = [
    { id: "#OP-024", niche: "Barbearias", city: "Mossoró, RN", count: 50, status: "Em execução", start: "Hoje, 13:42", user: "João Vitor" },
    { id: "#OP-023", niche: "Clínicas veterinárias", city: "Mossoró, RN", count: 30, status: "Concluída", start: "Ontem, 09:00", user: "João Vitor" },
    { id: "#OP-022", niche: "Óticas", city: "Natal, RN", count: 40, status: "Concluída", start: "07 set, 14:30", user: "Marina Costa" },
    { id: "#OP-021", niche: "Restaurantes", city: "Fortaleza, CE", count: 60, status: "Interrompida", start: "05 set, 08:15", user: "João Vitor" },
  ];
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-6"><div><h2 className="text-lg font-bold">Histórico de operações</h2><p className="mt-1 text-sm text-slate-500">Cada execução preserva filtros, usuário, canal e template utilizados.</p></div><Button onClick={onNew} className="bg-blue-600 hover:bg-blue-700"><Plus /> Nova operação</Button></div><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-6">Operação</TableHead><TableHead>Busca</TableHead><TableHead>Volume</TableHead><TableHead>Status</TableHead><TableHead>Início</TableHead><TableHead>Usuário</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="py-4 pl-6 font-semibold text-blue-600">{row.id}</TableCell><TableCell><p className="font-medium">{row.niche}</p><p className="text-xs text-slate-500">{row.city}</p></TableCell><TableCell>{row.count}</TableCell><TableCell><Badge variant="outline" className="rounded-full">{row.status}</Badge></TableCell><TableCell>{row.start}</TableCell><TableCell>{row.user}</TableCell></TableRow>)}</TableBody></Table></section>;
}

function SettingsView() {
  return <div className="grid gap-6 xl:grid-cols-2">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><MessageCircle /></span><div><h2 className="font-bold">WhatsApp</h2><p className="text-sm text-slate-500">Evolution API</p></div></div><Badge className="bg-emerald-500">Conectado</Badge></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nome da conexão<Input className="mt-2" defaultValue="Virtualizze Comercial" /></label><label className="text-sm font-medium">Instância<Input className="mt-2" defaultValue="virtualizze-01" /></label></div><div className="mt-4 flex gap-3"><Button variant="outline"><RefreshCw /> Testar conexão</Button><Button className="bg-blue-600 hover:bg-blue-700">Salvar</Button></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Users /></span><div><h2 className="font-bold">Usuários e acesso</h2><p className="text-sm text-slate-500">Controle de quem cria e acompanha operações</p></div></div><div className="mt-6 space-y-3">{[["JV", "João Vitor", "Administrador"], ["MC", "Marina Costa", "Operadora"]].map((user) => <div key={user[1]} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{user[0]}</span><div><p className="text-sm font-semibold">{user[1]}</p><p className="text-xs text-slate-500">{user[2]}</p></div></div><Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button></div>)}</div><Button variant="outline" className="mt-4 w-full"><Plus /> Convidar usuário</Button></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><Sparkles /></span><div><h2 className="font-bold">Geração e publicação</h2><p className="text-sm text-slate-500">Configurações padrão usadas em novas operações</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Modelo de IA<Input className="mt-2" defaultValue="GPT — geração de sites" /></label><label className="text-sm font-medium">Conta Vercel<Input className="mt-2" defaultValue="VirtualizzeAI" /></label><label className="text-sm font-medium">Limite simultâneo<Input className="mt-2" type="number" defaultValue="3" /></label></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Building2 /></span><div><h2 className="font-bold">Dados e deduplicação</h2><p className="text-sm text-slate-500">Supabase como base central do sistema</p></div></div><Badge variant="outline" className="w-fit rounded-full border-blue-200 bg-blue-50 text-blue-700">Arquitetura definida</Badge></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Banco", "Supabase PostgreSQL"], ["Interface", "Publicação na Vercel"], ["Regra global", "Uma prospecção por empresa"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-blue-600" /> {value}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">A checagem será global, independentemente do usuário, nicho, cidade ou operação que encontrou a empresa.</p></section>
  </div>;
}

function CompanyDetail({ company }: { company: Company | null }) {
  if (!company) return null;
  const timeline = [["Empresa encontrada", "13:42:06", true], ["Presença digital analisada", "13:42:11", true], ["Site gerado com IA", "13:43:38", company.status !== "Analisando"], ["Publicado na Vercel", "13:43:51", !!company.url], ["Mensagem enviada", "13:44:02", company.status === "Enviado"]] as const;
  return <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]"><SheetHeader className="border-b px-6 py-5"><div className="pr-8"><SheetTitle className="text-xl">{company.name}</SheetTitle><SheetDescription className="mt-1 flex items-center gap-1.5"><MapPin className="size-3.5" /> {company.city}</SheetDescription></div></SheetHeader><div className="space-y-6 p-6"><div className="flex items-center justify-between"><StatusBadge status={company.status} /><span className="text-xs text-slate-500">Atualizado agora</span></div><div className="grid grid-cols-2 gap-3">{[["Telefone", company.phone], ["Categoria", company.category], ["Presença", company.presence], ["Origem", "Google Maps"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div>{company.reason && <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><CircleAlert className="mt-0.5 size-4 shrink-0 text-slate-500" /><div><p className="text-sm font-semibold">Motivo do descarte</p><p className="mt-1 text-sm text-slate-600">{company.reason}</p></div></div>}{company.url && <div><p className="mb-2 text-sm font-semibold">Site publicado</p><a href={company.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-700"><span className="truncate">{company.url}</span><ExternalLink className="size-4" /></a></div>}<div><p className="mb-2 text-sm font-semibold">Linha do tempo</p><div>{timeline.map(([label, time, done], index) => <div key={label} className="flex gap-3"><div className="flex flex-col items-center"><span className={`mt-1 grid size-5 place-items-center rounded-full ${done ? "bg-emerald-500 text-white" : "border-2 border-slate-200 bg-white"}`}>{done && <Check className="size-3" />}</span>{index < 4 && <span className="h-8 w-px bg-slate-200" />}</div><div className="flex flex-1 justify-between pt-0.5 text-sm"><span className={done ? "font-medium" : "text-slate-400"}>{label}</span><span className="text-xs text-slate-400">{time}</span></div></div>)}</div></div>{company.status === "Aguardando revisão" && <div><p className="mb-2 text-sm font-semibold">Mensagem preparada</p><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">Olá, {company.name}! Criamos uma demonstração de site para mostrar como sua empresa pode se apresentar melhor no digital. Posso te explicar como funciona?</div></div>}</div>{company.status === "Aguardando revisão" && <SheetFooter className="border-t px-6 py-5 sm:flex-row"><Button variant="outline" className="flex-1">Editar mensagem</Button><Button className="flex-1 bg-blue-600 hover:bg-blue-700"><Send /> Aprovar e enviar</Button></SheetFooter>}</SheetContent>;
}
