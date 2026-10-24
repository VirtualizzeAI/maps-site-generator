"use client";

import Link from "next/link";
import { SiteUsage, GenerationCostSummary } from "@/components/site-generation-usage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Clock3,
  ExternalLink,
  Gauge,
  Globe2,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Radar,
  Send,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { archiveOperation, getOperation } from "./services/operations";
import type { OperationCompany, OperationDetail } from "./types";
import { clearToken, getToken } from "@/services/api/client";
import { me, type CurrentUser } from "@/services/auth";
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";
import { useActionNotification } from "@/components/action-notifications";

const statusLabels: Record<string, string> = {
  found: "Localizada",
  blocked_history: "Bloqueada pelo histórico",
  generating: "Gerando site",
  awaiting_approval: "Aguardando aprovação",
  sent: "Mensagem enviada",
  failed: "Falha",
  discarded_no_phone: "Sem telefone",
  discarded_site_real: "Já possui site",
  discarded_digital_presence: "Presença digital suficiente",
  queued: "Na fila",
  scheduled: "Agendada",
  searching: "Buscando empresas",
  analyzing: "Analisando",
  completed: "Concluída",
};

export function OperationDetailPage({ operationId }: { operationId: string }) {
  const notify = useActionNotification();
  const router = useRouter(),
    token = getToken();
  const { collapsed: sidebarCollapsed, toggleCollapsed } = useSidebarCollapse();
  const [user, setUser] = useState<CurrentUser | null>(null),
    [operation, setOperation] = useState<OperationDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false);
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setOperation(await getOperation(token, operationId));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Falha ao carregar a operação",
      );
    }
  }, [operationId, token]);
  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    me(token)
      .then(setUser)
      .then(refresh)
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [refresh, router, token]);
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh, token]);
  const groups = useMemo(
    () => groupCompanies(operation?.companies || []),
    [operation?.companies],
  );
  const canArchive = user?.organizations.some(
    (item) => item.id === operation?.organization_id && item.role === "admin",
  );
  async function handleArchive() {
    if (
      !token ||
      !operation ||
      !window.confirm(
        "Arquivar esta operação? As empresas continuarão no histórico para evitar prospecções duplicadas.",
      )
    )
      return;
    try {
      await archiveOperation(token, operation.id);
      notify({ variant: "success", title: "Operação arquivada", description: "O histórico das empresas foi preservado." });
      router.replace("/");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível arquivar a operação",
      );
      notify({ variant: "error", title: "Não foi possível arquivar a operação", description: reason instanceof Error ? reason.message : "Tente novamente em alguns instantes." });
    }
  }
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#07111f] text-cyan-300">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!token || !user) return null;
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {menu && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-[#07111f] p-5 text-white transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarCollapsed ? "lg:w-20 lg:px-3" : "lg:w-64"} ${menu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`flex items-center justify-between ${sidebarCollapsed ? "lg:justify-center" : ""}`}
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500">
              <Radar size={21} />
            </span>
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>
              <b className="block">Virtualizze</b>
              <small className="text-cyan-300">Prospector</small>
            </span>
          </Link>
          <button
            aria-label="Fechar menu"
            onClick={() => setMenu(false)}
            className="lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-20 hidden h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:grid"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={15} />
          ) : (
            <PanelLeftClose size={15} />
          )}
        </button>
        <nav className="mt-10 space-y-2">
          <Nav href="/" icon={Gauge} collapsed={sidebarCollapsed}>
            Visão geral
          </Nav>
          <Nav href="/" icon={Globe2} active collapsed={sidebarCollapsed}>
            Operações
          </Nav>
          <Nav href="/" icon={Building2} collapsed={sidebarCollapsed}>
            Empresas
          </Nav>
          <Nav href="/" icon={MessageSquareText} collapsed={sidebarCollapsed}>
            Aprovações
          </Nav>
          <Nav href="/" icon={Users} collapsed={sidebarCollapsed}>
            Usuários
          </Nav>
          <Nav href="/" icon={Settings} collapsed={sidebarCollapsed}>
            Configurações
          </Nav>
        </nav>
        <div
          className={`absolute bottom-5 rounded-xl bg-white/5 p-3 ${sidebarCollapsed ? "left-3 right-3 lg:flex lg:justify-center" : "left-5 right-5"}`}
        >
          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <button
            title="Sair"
            onClick={() => {
              clearToken();
              router.replace("/login");
            }}
            className={`flex items-center gap-2 text-xs text-slate-400 hover:text-white ${sidebarCollapsed ? "lg:mt-0" : "mt-3"}`}
          >
            <LogOut size={14} />
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>Sair</span>
          </button>
        </div>
      </aside>
      <main
        className={`min-h-screen transition-[margin] duration-200 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenu(true)}
            className="lg:hidden"
          >
            <Menu />
          </button>
          <Link
            href="/"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-semibold">
              {operation
                ? `${operation.niche} em ${operation.city}`
                : "Detalhes da operação"}
            </h1>
            <p className="text-xs text-slate-500">Acompanhamento da execução</p>
          </div>
          <span
            className={`ml-auto hidden rounded-full px-3 py-1 text-xs font-semibold sm:block ${operation?.status === "completed" ? "bg-emerald-50 text-emerald-700" : operation?.status === "failed" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
          >
            {statusLabels[operation?.status || ""] || operation?.status}
          </span>
          {canArchive && (
            <button
              onClick={handleArchive}
              title="Arquivar operação"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={17} />
            </button>
          )}
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {operation && (
            <>
              {operation.delivery.test_mode && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                  <ShieldAlert className="mt-0.5 shrink-0" size={20} />
                  <div>
                    <b>Modo global de teste ativo</b>
                    <p className="mt-1 text-sm">
                      Todos os envios desta operação são redirecionados para{" "}
                      <b>{operation.delivery.test_number}</b>. Os números
                      originais continuam registrados.
                    </p>
                  </div>
                </div>
              )}
              <LivePanel operation={operation} />
              <GenerationCostSummary totals={operation.generation_totals} />
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Metric
                  title="Lista de empresas"
                  value={groups.listed.length}
                  icon={Building2}
                  tone="bg-blue-50 text-blue-600"
                />
                <Metric
                  title="Criando site"
                  value={groups.creating.length}
                  icon={Globe2}
                  tone="bg-cyan-50 text-cyan-600"
                />
                <Metric
                  title="Aguardando aprovação"
                  value={groups.awaitingApproval.length}
                  icon={Clock3}
                  tone="bg-amber-50 text-amber-600"
                />
                <Metric
                  title="Enviadas"
                  value={groups.sent.length}
                  icon={Send}
                  tone="bg-emerald-50 text-emerald-600"
                />
                <Metric
                  title="Descartadas"
                  value={groups.discarded.length}
                  icon={ShieldAlert}
                  tone="bg-slate-100 text-slate-600"
                />
              </div>
              <Kanban groups={groups} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Nav({
  href,
  icon: Icon,
  active,
  collapsed,
  children,
}: {
  href: string;
  icon: React.ElementType;
  active?: boolean;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${collapsed ? "lg:justify-center" : ""} ${active ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
    >
      <Icon size={18} />
      <span className={collapsed ? "lg:hidden" : ""}>{children}</span>
    </Link>
  );
}

function LivePanel({ operation }: { operation: OperationDetail }) {
  const processed = operation.analyzed_count + operation.blocked_count,
    denominator = Math.max(operation.found_count || operation.target_count, 1),
    percent = Math.min(100, Math.round((processed / denominator) * 100)),
    running = !(
      ["completed", "failed", "awaiting_approval"] as string[]
    ).includes(operation.status);
  return (
    <section className="overflow-hidden rounded-3xl bg-[#0b1b2d] p-5 text-white shadow-lg sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-sm text-cyan-200">
            {running && (
              <span className="relative flex h-3 w-3">
                <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-300" />
                <span className="relative h-3 w-3 rounded-full bg-cyan-400" />
              </span>
            )}
            <b>
              {running
                ? "Operação em andamento"
                : statusLabels[operation.status] || operation.status}
            </b>
          </div>
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
            {operation.current_company_name || operation.niche}
          </h2>
          <p className="mt-2 text-slate-300">
            {operation.current_stage ||
              statusLabels[operation.status] ||
              operation.status}
          </p>
        </div>
        <div className="min-w-56 rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-slate-400">Processadas</p>
          <p className="mt-1 text-3xl font-bold">
            {processed}
            <span className="text-base font-normal text-slate-400">
              /{operation.found_count || operation.target_count}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Meta inicial: {operation.target_count} empresas
          </p>
        </div>
      </div>
      <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
        <span>{operation.generated_count} sites publicados</span>
        <span>{operation.sent_count} mensagens enviadas</span>
        <span>
          {operation.approval_mode === "automatic"
            ? "Envio automático"
            : "Revisão humana"}
        </span>
      </div>
    </section>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

type KanbanGroups = ReturnType<typeof groupCompanies>;
function Kanban({ groups }: { groups: KanbanGroups }) {
  return (
    <div className="mt-6 overflow-x-auto pb-3">
      <div className="grid min-w-[1480px] grid-cols-5 gap-4">
        <KanbanColumn
          title="1. Lista de empresas"
          description="Empresas localizadas"
          companies={groups.listed}
          tone="border-blue-300"
        />
        <KanbanColumn
          title="2. Criando site"
          description="Geração e publicação"
          companies={groups.creating}
          tone="border-cyan-300"
        />
        <KanbanColumn
          title="3. Aguardando aprovação humana"
          description="Site e mensagem prontos"
          companies={groups.awaitingApproval}
          tone="border-amber-300"
        />
        <KanbanColumn
          title="4. Enviado"
          description="Mensagem enviada"
          companies={groups.sent}
          tone="border-emerald-300"
        />
        <KanbanColumn
          title="5. Descartado"
          description="Sem nova prospecção"
          companies={groups.discarded}
          tone="border-slate-300"
        />
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  description,
  companies,
  tone,
}: {
  title: string;
  description: string;
  companies: OperationCompany[];
  tone: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border-t-4 bg-slate-100/70 ${tone}`}
    >
      <div className="flex min-h-20 items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold shadow-sm">
          {companies.length}
        </span>
      </div>
      <div className="max-h-[620px] space-y-3 overflow-y-auto p-3">
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
        {!companies.length && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-xs text-slate-400">
            Nenhuma empresa nesta etapa.
          </div>
        )}
      </div>
    </section>
  );
}

function CompanyCard({ company }: { company: OperationCompany }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-5">{company.name}</h3>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
          {statusLabels[company.status] || company.status}
        </span>
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-slate-500">
        {company.address && (
          <p className="flex gap-2">
            <MapPin className="mt-0.5 shrink-0" size={13} />
            <span>{company.address}</span>
          </p>
        )}
        {company.phone && (
          <p className="flex items-center gap-2">
            <Phone size={13} />
            {company.phone}
          </p>
        )}
        {company.email && (
          <p className="flex items-center gap-2">
            <Mail size={13} />
            {company.email}
          </p>
        )}
        <p>Listada em {new Date(company.listed_at).toLocaleString("pt-BR")}</p>
      </div>
      {(company.site_generation_usage || company.generated_site_url) && <SiteUsage usage={company.site_generation_usage} />}
      {company.discard_reason && (
        <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          {company.discard_reason}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
        {company.maps_url && (
          <a
            href={company.maps_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600"
          >
            Maps
          </a>
        )}
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600"
          >
            Site original
          </a>
        )}
        {company.social_links.map((link, index) => (
          <a
            key={link}
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600"
          >
            Rede {index + 1}
          </a>
        ))}
        {company.generated_site_url && (
          <a
            href={company.generated_site_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-600"
          >
            Site gerado <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}

function groupCompanies(companies: OperationCompany[]) {
  const result = {
    listed: [] as OperationCompany[],
    creating: [] as OperationCompany[],
    awaitingApproval: [] as OperationCompany[],
    sent: [] as OperationCompany[],
    discarded: [] as OperationCompany[],
  };
  for (const company of companies) {
    if (company.status === "found") result.listed.push(company);
    else if (company.status === "generating") result.creating.push(company);
    else if (company.status === "awaiting_approval")
      result.awaitingApproval.push(company);
    else if (company.status === "sent") result.sent.push(company);
    else result.discarded.push(company);
  }
  return result;
}
