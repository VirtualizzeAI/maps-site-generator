"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Check,
  ExternalLink,
  Gauge,
  Globe2,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquareText,
  Pencil,
  Phone,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Radar,
  Settings,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiRequest, clearToken, getToken } from "@/services/api/client";
import { useActionNotification } from "@/components/action-notifications";
import { me, type CurrentUser } from "@/services/auth";
import {
  createOperation,
  listOperations,
} from "@/features/operations/services/operations";
import type { ApprovalMode, Operation } from "@/features/operations/types";
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";

type View =
  "overview" | "operations" | "companies" | "reviews" | "users" | "settings";
type Summary = {
  companies: number;
  operations: number;
  sites_generated: number;
  messages_sent: number;
  discarded: number;
  blocked: number;
  pending_approval: number;
  running_operation_id: string | null;
};
type CompanyOperation = {
  id: string;
  niche: string;
  city: string;
  status: string;
  listed_at: string;
  generated_site_url: string | null;
};
type Company = {
  id: string;
  name: string;
  phone: string | null;
  other_phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  website: string | null;
  maps_url: string | null;
  social_links: string[];
  prospected_at: string | null;
  first_seen_at: string;
  created_at: string;
  operations: CompanyOperation[];
};
type Message = {
  id: string;
  company_name: string;
  recipient: string;
  delivery_recipient: string;
  test_mode: boolean;
  content: string;
  status: string;
  site_url: string | null;
  created_at: string;
  updated_at: string;
};
type Integration = {
  mode: string;
  serper_configured: boolean;
  openai_configured: boolean;
  openai_model: string;
  site_generation_prompt: string;
  automatic_send_interval_seconds: number;
  default_site_generation_prompt: string;
  vercel_configured: boolean;
  evolution_configured: boolean;
  evolution_url: string | null;
  evolution_instance: string | null;
  whatsapp_test_mode: boolean;
  whatsapp_test_number: string;
};
type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
};

const labels: Record<string, string> = {
  queued: "Na fila",
  scheduled: "Agendada",
  searching: "Buscando",
  analyzing: "Analisando",
  generating: "Gerando site",
  deploying: "Publicando",
  sending: "Enviando",
  awaiting_approval: "Aguardando revisão",
  completed: "Concluída",
  failed: "Falhou",
};
const template =
  "Olá! Criei uma demonstração de site para a {{empresa}}. Veja aqui: {{link}}. Se gostar, posso explicar como colocamos no ar para você.";

export function DashboardPage() {
  const router = useRouter();
  const { collapsed: sidebarCollapsed, toggleCollapsed } = useSidebarCollapse();
  const [user, setUser] = useState<CurrentUser | null>(null),
    [view, setView] = useState<View>("overview"),
    [loading, setLoading] = useState(true),
    [menu, setMenu] = useState(false),
    [newOpen, setNewOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null),
    [operations, setOperations] = useState<Operation[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [messages, setMessages] = useState<Message[]>([]),
    [integration, setIntegration] = useState<Integration | null>(null),
    [team, setTeam] = useState<TeamUser[]>([]),
    [error, setError] = useState("");
  const token = getToken(),
    org = user?.organizations[0];
  const refresh = useCallback(async (u: CurrentUser, t: string) => {
    const id = u.organizations[0]?.id;
    if (!id) return;
    try {
      const q = new URLSearchParams({ organization_id: id });
      const [s, o, c, m, i, users] = await Promise.all([
        apiRequest<Summary>(`/api/v1/dashboard/summary?${q}`, {}, t),
        listOperations(t, id),
        apiRequest<Company[]>(`/api/v1/companies?${q}`, {}, t),
        apiRequest<Message[]>(`/api/v1/messages?${q}`, {}, t),
        apiRequest<Integration>(`/api/v1/integrations?${q}`, {}, t),
        apiRequest<TeamUser[]>(`/api/v1/users?${q}`, {}, t),
      ]);
      setSummary(s);
      setOperations(o);
      setCompanies(c);
      setMessages(m);
      setIntegration(i);
      setTeam(users);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    }
  }, []);
  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    me(token)
      .then((u) => {
        setUser(u);
        return refresh(u, token);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router, refresh, token]);
  useEffect(() => {
    if (!user || !token) return;
    const id = setInterval(() => refresh(user, token), 3000);
    return () => clearInterval(id);
  }, [user, token, refresh]);
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#07111f] text-cyan-300">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user || !org || !token) return null;
  const nav: [View, string, React.ElementType][] = [
    ["overview", "Visão geral", Gauge],
    ["operations", "Operações", Activity],
    ["companies", "Empresas", Building2],
    ["reviews", "Aprovações", MessageSquareText],
    ["users", "Usuários", Users],
    ["settings", "Configurações", Settings],
  ];
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
          className={`flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500">
            <Radar size={21} />
          </div>
          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <b>Virtualizze</b>
            <p className="text-xs text-cyan-300">Prospector</p>
          </div>
          <button
            aria-label="Fechar menu"
            onClick={() => setMenu(false)}
            className="ml-auto lg:hidden"
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
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setMenu(false);
              }}
              title={sidebarCollapsed ? label : undefined}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${sidebarCollapsed ? "lg:justify-center" : ""} ${view === id ? "bg-blue-500" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon size={18} />
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>
                {label}
              </span>
              {id === "reviews" && summary?.pending_approval ? (
                <span
                  className={`rounded-full bg-cyan-300 px-2 text-xs text-slate-950 ${sidebarCollapsed ? "lg:absolute lg:right-0 lg:top-0 lg:px-1.5" : "ml-auto"}`}
                >
                  {summary.pending_approval}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div
          className={`absolute bottom-5 rounded-xl bg-white/5 p-3 ${sidebarCollapsed ? "left-3 right-3 lg:flex lg:justify-center" : "left-5 right-5"}`}
        >
          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <button
            onClick={() => {
              clearToken();
              router.replace("/login");
            }}
            title="Sair"
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-5 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <h1 className="font-semibold">
              {nav.find((n) => n[0] === view)?.[1]}
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              {org.name} · Supabase
            </p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Play size={16} />
            Nova operação
          </button>
        </header>
        <div className="p-5 lg:p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {view === "overview" && (
            <Overview
              summary={summary}
              operations={operations}
              refresh={() => refresh(user, token)}
              onError={setError}
            />
          )}{" "}
          {view === "operations" && (
            <Operations
              operations={operations}
              refresh={() => refresh(user, token)}
              onError={setError}
            />
          )}{" "}
          {view === "companies" && (
            <Companies
              companies={companies}
              refresh={() => refresh(user, token)}
              onError={setError}
            />
          )}{" "}
          {view === "reviews" && (
            <Reviews
              canManage={org.role === "admin" || org.role === "operator"}
              messages={messages.filter((m) => m.status === "pending_approval")}
              token={token}
              refresh={() => refresh(user, token)}
              onMessageSaved={updated => setMessages(current => current.map(item => item.id === updated.id ? updated : item))}
            />
          )}{" "}
          {view === "users" && (
            <Team
              canManage={org.role === "admin"}
              users={team}
              org={org.id}
              token={token}
              refresh={() => refresh(user, token)}
            />
          )}{" "}
          {view === "settings" && (
            <Integrations
              canManage={org.role === "admin"}
              integration={integration}
              org={org.id}
              token={token}
              refresh={() => refresh(user, token)}
            />
          )}
        </div>
      </main>
      {newOpen && (
        <NewOperation
          org={org.id}
          token={token}
          close={() => setNewOpen(false)}
          done={() => {
            setNewOpen(false);
            refresh(user, token);
            setView("operations");
          }}
        />
      )}
    </div>
  );
}

function Card({
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
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <span className={`h-fit rounded-xl p-2.5 ${tone}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}
function Overview({
  summary,
  operations,
  refresh,
  onError,
}: {
  summary: Summary | null;
  operations: Operation[];
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const active = operations.find(
    (o) => !["completed", "failed"].includes(o.status),
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Empresas no histórico"
          value={summary?.companies || 0}
          icon={Building2}
          tone="bg-blue-50 text-blue-600"
        />
        <Card
          title="Sites criados"
          value={summary?.sites_generated || 0}
          icon={Globe2}
          tone="bg-cyan-50 text-cyan-600"
        />
        <Card
          title="Mensagens enviadas"
          value={summary?.messages_sent || 0}
          icon={MessageSquareText}
          tone="bg-emerald-50 text-emerald-600"
        />
        <Card
          title="Bloqueadas pelo histórico"
          value={summary?.blocked || 0}
          icon={ShieldCheck}
          tone="bg-violet-50 text-violet-600"
        />
      </div>
      {active && (
        <section className="mt-6 rounded-2xl bg-[#0b1b2d] p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-300" />
              <span className="relative h-3 w-3 rounded-full bg-cyan-400" />
            </span>
            <b>Operação em andamento</b>
          </div>
          <h2 className="mt-5 text-2xl font-bold">
            {active.niche} em {active.city}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {labels[active.status] || active.status} · {active.found_count}/
            {active.target_count} encontradas · {active.sent_count} envios
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded bg-white/10">
            <div
              className="h-full bg-cyan-400"
              style={{
                width: `${Math.min(100, (active.analyzed_count / Math.max(active.target_count, 1)) * 100)}%`,
              }}
            />
          </div>
        </section>
      )}
      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Operações recentes</h2>
        <OperationTable
          rows={operations.slice(0, 6)}
          refresh={refresh}
          onError={onError}
        />
      </section>
    </>
  );
}
function Operations({
  operations,
  refresh,
  onError,
}: {
  operations: Operation[];
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Histórico de operações</h2>
        <p className="text-sm text-slate-500">
          Execuções manuais e agendadas, com contadores persistidos.
        </p>
      </div>
      <OperationTable rows={operations} refresh={refresh} onError={onError} />
    </>
  );
}
function OperationTable({
  rows,
  refresh,
  onError,
}: {
  rows: Operation[];
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const notify = useActionNotification();
  const router = useRouter(),
    token = getToken(),
    canArchive = useCanArchive(),
    [busy, setBusy] = useState("");
  async function archive(operation: Operation, event: React.MouseEvent) {
    event.stopPropagation();
    if (
      !token ||
      !window.confirm(
        "Arquivar esta operação? O histórico das empresas será preservado.",
      )
    )
      return;
    setBusy(operation.id);
    try {
      await apiRequest(
        `/api/v1/operations/${operation.id}`,
        { method: "DELETE" },
        token,
      );
      await refresh();
      notify({ variant: "success", title: "Operação arquivada", description: "O histórico das empresas foi preservado." });
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível arquivar a operação",
      );
      notify({ variant: "error", title: "Não foi possível arquivar a operação", description: reason instanceof Error ? reason.message : "Tente novamente em alguns instantes." });
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-4">Operação</th>
            <th>Status</th>
            <th>Encontradas</th>
            <th>Sites</th>
            <th>Enviadas</th>
            <th>Data</th>
            {canArchive && <th className="pr-4 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr
              key={o.id}
              tabIndex={0}
              role="link"
              onClick={() => router.push(`/operations/${o.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  router.push(`/operations/${o.id}`);
              }}
              className="cursor-pointer border-t outline-none transition hover:bg-blue-50/60 focus:bg-blue-50"
            >
              <td className="p-4">
                <b>{o.niche}</b>
                <p className="text-xs text-slate-500">
                  {o.city} ·{" "}
                  {o.approval_mode === "automatic"
                    ? "Automático"
                    : "Revisão humana"}
                </p>
              </td>
              <td>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.status === "completed" ? "bg-emerald-50 text-emerald-700" : o.status === "failed" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
                >
                  {labels[o.status] || o.status}
                </span>
              </td>
              <td>
                {o.found_count}/{o.target_count}
              </td>
              <td>{o.generated_count}</td>
              <td>{o.sent_count}</td>
              <td>{new Date(o.created_at).toLocaleString("pt-BR")}</td>
              {canArchive && (
                <td className="pr-4 text-right">
                  <button
                    disabled={busy === o.id}
                    title="Arquivar operação"
                    onClick={(event) => archive(o, event)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === o.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td
                colSpan={canArchive ? 7 : 6}
                className="p-10 text-center text-slate-500"
              >
                Nenhuma operação criada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Companies({
  companies,
  refresh,
  onError,
}: {
  companies: Company[];
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const notify = useActionNotification();
  const token = getToken(),
    canArchive = useCanArchive(),
    [busy, setBusy] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [archivingSelected, setArchivingSelected] = useState(false),
    selectedCompanies = companies.filter((company) =>
      selected.includes(company.id),
    ),
    allSelected =
      companies.length > 0 && selectedCompanies.length === companies.length;
  function toggle(companyId: string) {
    setSelected((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    );
  }
  async function archive(company: Company) {
    if (
      !token ||
      !window.confirm(
        `Arquivar ${company.name}? O registro continuará bloqueando novas prospecções.`,
      )
    )
      return;
    setBusy(company.id);
    try {
      await apiRequest(
        `/api/v1/companies/${company.id}`,
        { method: "DELETE" },
        token,
      );
      setSelected((current) => current.filter((id) => id !== company.id));
      await refresh();
      notify({ variant: "success", title: "Empresa arquivada", description: `${company.name} foi arquivada. O histórico para evitar contatos duplicados foi preservado.` });
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível arquivar a empresa",
      );
      notify({ variant: "error", title: "Não foi possível arquivar a empresa", description: reason instanceof Error ? reason.message : "Tente novamente em alguns instantes." });
    } finally {
      setBusy("");
    }
  }
  async function archiveSelected() {
    if (
      !token ||
      !selectedCompanies.length ||
      !window.confirm(
        `Arquivar ${selectedCompanies.length} empresa${selectedCompanies.length === 1 ? "" : "s"}? Os registros continuarão bloqueando novas prospecções.`,
      )
    )
      return;
    setArchivingSelected(true);
    let archived = 0;
    try {
      for (const company of selectedCompanies) {
        await apiRequest(
          `/api/v1/companies/${company.id}`,
          { method: "DELETE" },
          token,
        );
        archived++;
      }
      setSelected([]);
      await refresh();
      notify({ variant: "success", title: "Empresas arquivadas", description: `${archived} empresa${archived === 1 ? " foi arquivada" : "s foram arquivadas"}. O histórico foi preservado.` });
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível arquivar as empresas selecionadas",
      );
      notify({ variant: "error", title: "O arquivamento não foi concluído", description: `${archived} de ${selectedCompanies.length} empresas foram arquivadas. ${reason instanceof Error ? reason.message : "Tente novamente para as empresas restantes."}` });
      await refresh();
    } finally {
      setArchivingSelected(false);
    }
  }
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Empresas</h2>
          <p className="text-sm text-slate-500">
            Histórico global de empresas encontradas nas operações.
          </p>
        </div>
        {canArchive && companies.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? companies.map((company) => company.id)
                      : [],
                  )
                }
                className="h-4 w-4 accent-blue-600"
              />
              Selecionar todas
            </label>
            {selectedCompanies.length > 0 && (
              <button
                disabled={archivingSelected || !!busy}
                onClick={archiveSelected}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {archivingSelected ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                Arquivar selecionadas ({selectedCompanies.length})
              </button>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {companies.map((company) => {
          const isSelected = selected.includes(company.id);
          return (
            <article
              key={company.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${isSelected ? "border-blue-400 ring-2 ring-blue-100" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                {canArchive && (
                  <label className="mt-1 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(company.id)}
                      aria-label={`Selecionar ${company.name}`}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </label>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{company.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {company.category || "Segmento não informado"} ·{" "}
                    {company.city || "Cidade não informada"}
                  </p>
                </div>
                {canArchive && (
                  <button
                    disabled={busy === company.id || archivingSelected}
                    title="Arquivar empresa"
                    onClick={() => archive(company)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === company.id ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Trash2 size={17} />
                    )}
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {company.address && (
                  <p className="flex gap-2">
                    <MapPin className="mt-0.5 shrink-0" size={15} />
                    {company.address}
                  </p>
                )}
                <div>
                  {company.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={15} />
                      {company.phone}
                    </p>
                  )}
                  {company.other_phones.map((phone) => (
                    <p key={phone} className="ml-6 text-xs">
                      {phone}
                    </p>
                  ))}
                </div>
                {company.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={15} />
                    {company.email}
                  </p>
                )}
                <p>
                  Pesquisada em{" "}
                  {new Date(company.first_seen_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                {company.maps_url && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={company.maps_url}
                    className="text-blue-600"
                  >
                    Google Maps
                  </a>
                )}
                {company.website && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={company.website}
                    className="text-blue-600"
                  >
                    Site original
                  </a>
                )}
                {company.social_links.map((link, index) => (
                  <a
                    key={link}
                    target="_blank"
                    rel="noreferrer"
                    href={link}
                    className="text-blue-600"
                  >
                    Rede social {index + 1}
                  </a>
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Operações em que foi listada
                </p>
                <div className="mt-2 space-y-2">
                  {company.operations.map((operation) => (
                    <div
                      key={operation.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs"
                    >
                      <button
                        onClick={() =>
                          window.location.assign(`/operations/${operation.id}`)
                        }
                        className="text-left font-semibold text-slate-700 hover:text-blue-600"
                      >
                        {operation.niche} em {operation.city}
                        <span className="ml-2 font-normal text-slate-400">
                          {new Date(operation.listed_at).toLocaleString(
                            "pt-BR",
                          )}
                        </span>
                      </button>
                      {operation.generated_site_url && (
                        <a
                          href={operation.generated_site_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600"
                        >
                          Site gerado
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
        {!companies.length && (
          <div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">
            Nenhuma empresa no histórico.
          </div>
        )}
      </div>
    </>
  );
}
function Reviews({
  canManage,
  messages,
  token,
  refresh,
  onMessageSaved,
}: {
  canManage: boolean;
  messages: Message[];
  token: string;
  refresh: () => Promise<void>;
  onMessageSaved: (message: Message) => void;
}) {
  const notify = useActionNotification();
  const [busy, setBusy] = useState(""), [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState<{id: string; content: string; updated_at: string} | null>(null);
  const editingPending = !!editing && messages.some(message => message.id === editing.id);
  async function saveMessage() {
    if (!editingPending || !editing || busy || !canManage) return;
    const draft = editing;
    setError("");
    setBusy(draft.id);
    setSaving(true);
    try {
      const updated = await apiRequest<Message>(`/api/v1/messages/${draft.id}`, {
        method: "PATCH", body: JSON.stringify({content: draft.content, expected_updated_at: draft.updated_at}),
      }, token);
      onMessageSaved(updated);
      setEditing(null);
      notify({variant: "success", title: "Mensagem salva", description: "O texto foi atualizado e continua aguardando aprovação. Nenhuma mensagem foi enviada."});
      await refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível salvar a mensagem";
      setError(message);
      notify({variant: "error", title: "Não foi possível salvar a mensagem", description: message});
    } finally {
      setBusy("");
      setSaving(false);
    }
  }
  async function approve(id: string) {
    if (busy || editingPending || !canManage) return;
    setError("");
    setBusy(id);
    try {
      await apiRequest(
      `/api/v1/messages/${id}/approve`,
      { method: "POST", body: "{}" },
      token,
    );
      await refresh();
      notify({ variant: "success", title: "Mensagem aprovada e enviada", description: "O envio foi confirmado pelo provedor e registrado no histórico." });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível aprovar e enviar a mensagem");
      notify({ variant: "error", title: "Não foi possível aprovar e enviar", description: error instanceof Error ? error.message : "Confira a conexão do WhatsApp e tente novamente." });
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {messages.map((m) => (
        <article key={m.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{m.company_name}</h3>
              <p className="text-sm text-slate-500">
                Telefone da empresa: {m.recipient}
              </p>
              {m.test_mode && (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  Modo de teste: o envio será redirecionado para {m.delivery_recipient}
                </p>
              )}
            </div>
            {m.site_url && (
              <a
                className="flex items-center gap-1 text-sm text-blue-600"
                target="_blank"
                rel="noreferrer"
                href={m.site_url}
              >
                Ver site <ExternalLink size={14} />
              </a>
            )}
          </div>
          {editing?.id === m.id ? (
            <div className="my-5 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <label htmlFor={`message-content-${m.id}`} className="text-sm font-semibold text-slate-700">Texto da mensagem</label>
              <textarea id={`message-content-${m.id}`} rows={7} maxLength={4000}
                value={editing.content} disabled={!!busy}
                onChange={event => setEditing({...editing, content: event.target.value})}
                className="mt-2 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500" />
              <p className="mt-2 text-xs text-slate-500">{editing.content.length.toLocaleString("pt-BR")} / 4.000 caracteres. Salve as alterações antes de aprovar.</p>
              {editing.updated_at !== m.updated_at && <p role="alert" className="mt-2 text-sm text-amber-700">Esta mensagem foi alterada por outro usuário. Cancele e reabra a edição para carregar o texto atual.</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={saveMessage}
                  disabled={!!busy || !editing.content.trim() || editing.updated_at !== m.updated_at}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving && busy === m.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving && busy === m.id ? "Salvando..." : "Salvar mensagem"}
                </button>
                <button type="button" disabled={!!busy} onClick={() => { setEditing(null); setError(""); }}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancelar</button>
              </div>
            </div>
          ) : <p className="my-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6">
            {m.content}
          </p>}
          <div className="flex flex-wrap gap-3">
          {canManage && editing?.id !== m.id && <button type="button" disabled={!!busy || editingPending}
            onClick={() => {setError("");setEditing({id: m.id, content: m.content, updated_at: m.updated_at});}}
            className="flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">
            <Pencil size={16} /> Editar mensagem
          </button>}
          <button
            disabled={!!busy || editingPending || !canManage}
            onClick={() => approve(m.id)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === m.id && !saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            Aprovar e enviar
          </button>
          </div>
        </article>
      ))}
      {!messages.length && <Empty />}
    </div>
  );
}
function Team({
  canManage,
  users,
  org,
  token,
  refresh,
}: {
  canManage: boolean;
  users: TeamUser[];
  org: string;
  token: string;
  refresh: () => void;
}) {
  const notify = useActionNotification();
  const [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      role: "operator",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canManage || busy) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await apiRequest(
      "/api/v1/users",
      {
        method: "POST",
        body: JSON.stringify({ ...form, organization_id: org }),
      },
      token,
    );
      setForm({ name: "", email: "", password: "", role: "operator" });
      setSuccess("Usuário criado. Ele já pode entrar com o e-mail e a senha definidos.");
      notify({ variant: "success", title: "Usuário criado", description: "Ele já pode entrar com o e-mail e a senha definidos." });
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível criar o usuário");
      notify({ variant: "error", title: "Não foi possível criar o usuário", description: error instanceof Error ? error.message : "Verifique os dados e tente novamente." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Usuário</th>
              <th>Perfil</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-4">
                  <b>{u.name}</b>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td>{u.role}</td>
                <td className={u.active ? "text-emerald-600" : "text-red-600"}>
                  {u.active ? "Ativo" : "Inativo"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={submit} className="h-fit rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Adicionar usuário</h2>
        {!canManage && <p className="mt-3 text-sm text-slate-600">Somente administradores podem adicionar usuários.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>}
        <fieldset disabled={!canManage || busy} className="mt-4 space-y-3 disabled:opacity-60">
          <Field
            label="Nome"
            value={form.name}
            set={(v) => setForm({ ...form, name: v })}
          />
          <label className="block text-sm">E-mail
            <input required type="email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="mt-2 w-full rounded-xl border px-4 py-3" />
          </label>
          <label className="block text-sm">
            Senha
            <input
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            Perfil
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="operator">Operador</option>
              <option value="viewer">Visualizador</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <button
            disabled={busy || !canManage}
            className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white"
          >
            {busy ? "Salvando..." : "Criar usuário"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
function Integrations({
  canManage,
  integration,
  org,
  token,
  refresh,
}: {
  canManage: boolean;
  integration: Integration | null;
  org: string;
  token: string;
  refresh: () => void;
}) {
  const notify = useActionNotification();
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [form, setForm] = useState({
      openai_model: integration?.openai_model || "gpt-5.6-luna",
      site_generation_prompt: integration?.site_generation_prompt || integration?.default_site_generation_prompt || "",
      automatic_send_interval_seconds: integration?.automatic_send_interval_seconds ?? 0,
      evolution_url: integration?.evolution_url || "",
      evolution_instance: integration?.evolution_instance || "",
      whatsapp_test_mode: integration?.whatsapp_test_mode || false,
      whatsapp_test_number: integration?.whatsapp_test_number || "",
    });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canManage || saving) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(
        `/api/v1/integrations?organization_id=${org}`,
        { method: "PUT", body: JSON.stringify(form) },
        token,
      );
      await refresh();
      setSuccess("Configurações salvas.");
      notify({ variant: "success", title: "Configurações salvas", description: "Suas alterações foram salvas." });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível salvar as configurações");
      notify({ variant: "error", title: "Não foi possível salvar as configurações", description: error instanceof Error ? error.message : "Verifique os campos e tente novamente." });
    } finally {
      setSaving(false);
    }
  }
  const statuses = [
    ["Serper", integration?.serper_configured],
    ["OpenAI", integration?.openai_configured],
    ["Vercel", integration?.vercel_configured],
    ["Evolution Go", integration?.evolution_configured],
  ] as const;
  return (
    <form
      onSubmit={submit}
      className="max-w-3xl rounded-2xl border bg-white p-6"
    >
      <div className="mb-6 flex gap-3">
        <ShieldCheck className="text-blue-600" />
        <div>
          <h2 className="font-bold">Integrações</h2>
          <p className="text-sm text-slate-500">
            Modo atual: <b>{integration?.mode || "mock"}</b>. As chaves são
            administradas exclusivamente no ambiente seguro do backend.
          </p>
        </div>
      </div>
      {!canManage && <p className="mb-4 text-sm text-slate-600">Somente administradores podem alterar as configurações.</p>}
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="mb-4 text-sm text-emerald-700">{success}</p>}
      <fieldset disabled={!canManage || saving}>
      <section
        className={`mb-6 rounded-2xl border p-4 ${form.whatsapp_test_mode ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Número global para testes</h3>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Quando ativo, todas as mensagens são redirecionadas para este
              número. O telefone original da empresa continua salvo no
              histórico.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.whatsapp_test_mode}
              onChange={(e) =>
                setForm({ ...form, whatsapp_test_mode: e.target.checked })
              }
              className="h-5 w-5 accent-blue-600"
            />
            Ativar modo de teste
          </label>
        </div>
        {form.whatsapp_test_mode && (
          <label className="mt-4 block max-w-sm text-sm text-slate-700">
            Número com DDD
            <input
              required
              value={form.whatsapp_test_number}
              onChange={(e) =>
                setForm({ ...form, whatsapp_test_number: e.target.value })
              }
              placeholder="(84) 99999-9999"
              className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
        )}
      </section>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map(([label, configured]) => (
          <div
            key={label}
            className="rounded-xl border bg-slate-50 p-3 text-sm"
          >
            <b>{label}</b>
            <p className={configured ? "text-emerald-600" : "text-amber-700"}>
              {configured ? "Configurado no servidor" : "Não configurado"}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          URL da Evolution Go
          <input
            type="url"
            placeholder="https://evogo.seudominio.com.br"
            value={form.evolution_url}
            onChange={(e) =>
              setForm({ ...form, evolution_url: e.target.value })
            }
            className="mt-2 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm text-slate-600">
          Nome da instância (opcional)
          <input
            value={form.evolution_instance}
            onChange={(e) =>
              setForm({ ...form, evolution_instance: e.target.value })
            }
            className="mt-2 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm text-slate-600">
          Modelo OpenAI
          <input
            value={form.openai_model}
            onChange={(e) => setForm({ ...form, openai_model: e.target.value })}
            className="mt-2 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </label>
      </div>
      <p className="mt-4 text-sm text-slate-500">A chave fica em EVOLUTION_API_KEY no servidor. Use a chave da instância ou, com a chave administrativa, informe acima o nome exato da instância. O indicador confirma a configuração, não o estado da conexão.</p>
      <section aria-labelledby="automatic-interval-title" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 id="automatic-interval-title" className="font-semibold text-slate-900">Intervalo entre envios automáticos</h3>
        <p className="mt-2 text-sm text-slate-600">Defina o tempo mínimo entre as mensagens no modo totalmente automático. A geração do próximo site já conta nesse tempo.</p>
        <label className="mt-4 block max-w-xs text-sm font-medium text-slate-700">
          Intervalo em segundos
          <input type="number" min={0} max={3600} step={1} required
            value={form.automatic_send_interval_seconds}
            onChange={event => setForm({...form, automatic_send_interval_seconds: Number(event.target.value)})}
            aria-describedby="automatic-interval-help"
            className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500" />
        </label>
        <p id="automatic-interval-help" className="mt-3 text-sm text-slate-600">De 0 a 3.600 segundos (1 hora). Use 0 para desativar a espera. O intervalo é aplicado por organização, inclusive entre operações. Alterações valem para os próximos envios automáticos; mensagens com aprovação humana continuam sendo enviadas manualmente.</p>
      </section>
      <section aria-labelledby="site-prompt-title" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 id="site-prompt-title" className="font-semibold text-slate-900">Prompt do agente de sites</h3>
        <p className="mt-2 text-sm text-slate-600">Defina o estilo, as seções, o tom dos textos e as orientações visuais dos sites. As alterações valem para as próximas operações; os sites já publicados não serão alterados.</p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Instruções para gerar os sites
          <textarea
            required
            minLength={20}
            maxLength={20000}
            rows={12}
            value={form.site_generation_prompt}
            onChange={e => setForm({...form, site_generation_prompt: e.target.value})}
            aria-describedby="site-prompt-help"
            className="mt-2 w-full resize-y rounded-xl border bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-500"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <button type="button"
            onClick={() => setForm({...form, site_generation_prompt: integration?.default_site_generation_prompt || ""})}
            className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Usar prompt padrão
          </button>
          <span className="text-xs text-slate-500">{form.site_generation_prompt.length.toLocaleString("pt-BR")} / 20.000 caracteres</span>
        </div>
        <p id="site-prompt-help" className="mt-4 text-sm text-slate-600">Variáveis disponíveis: <code>{"{{empresa}}"}</code>, <code>{"{{segmento}}"}</code>, <code>{"{{cidade}}"}</code>, <code>{"{{endereco}}"}</code> e <code>{"{{whatsapp}}"}</code>. Os dados da empresa serão enviados mesmo se você não usar as variáveis. A saída continuará sendo um arquivo HTML completo.</p>
        <p className="mt-2 text-xs text-slate-500">Clique em Salvar configurações para aplicar o prompt ou restaurar o padrão.</p>
      </section>
      <button
        disabled={saving || !canManage}
        className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
      </fieldset>
    </form>
  );
}
function NewOperation({
  org,
  token,
  close,
  done,
}: {
  org: string;
  token: string;
  close: () => void;
  done: () => void;
}) {
  const notify = useActionNotification();
  const [form, setForm] = useState({
      niche: "Barbearias",
      city: "Mossoró",
      target_count: 10,
      approval_mode: "automatic" as ApprovalMode,
      message_template: template,
      scheduled_for: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await createOperation(token, {
        ...form,
        organization_id: org,
        scheduled_for: form.scheduled_for
          ? new Date(form.scheduled_for).toISOString()
          : undefined,
      });
      done();
      notify({ variant: "success", title: created.status === "scheduled" ? "Operação agendada" : "Operação criada", description: "Acompanhe o andamento na aba Operações." });
    } catch (c) {
      setError(c instanceof Error ? c.message : "Falha ao criar");
      notify({ variant: "error", title: "Não foi possível criar a operação", description: c instanceof Error ? c.message : "Verifique os dados e tente novamente." });
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form
        onSubmit={submit}
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Nova operação</h2>
            <p className="text-sm text-slate-500">
              Execute agora ou programe para depois.
            </p>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </div>
        <div className="mt-8 space-y-5">
          <Field
            label="Nicho"
            value={form.niche}
            set={(v) => setForm({ ...form, niche: v })}
          />
          <Field
            label="Cidade"
            value={form.city}
            set={(v) => setForm({ ...form, city: v })}
          />
          <label className="block text-sm">
            Quantidade
            <input
              type="number"
              min="1"
              max="500"
              value={form.target_count}
              onChange={(e) =>
                setForm({ ...form, target_count: Number(e.target.value) })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            Modo de envio
            <select
              value={form.approval_mode}
              onChange={(e) =>
                setForm({
                  ...form,
                  approval_mode: e.target.value as ApprovalMode,
                })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="automatic">Totalmente automático</option>
              <option value="human_review">Aprovação humana</option>
            </select>
          </label>
          <label className="block text-sm">
            Agendar (opcional)
            <input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) =>
                setForm({ ...form, scheduled_for: e.target.value })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            Mensagem
            <textarea
              rows={6}
              value={form.message_template}
              onChange={(e) =>
                setForm({ ...form, message_template: e.target.value })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
            <span className="text-xs text-slate-500">
              Variáveis: {"{{empresa}} {{cidade}} {{segmento}} {{link}}"}
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white"
          >
            {busy ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Play size={18} />
            )}
            Criar operação
          </button>
        </div>
      </form>
    </div>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        required
        value={value}
        onChange={(e) => set(e.target.value)}
        className="mt-2 w-full rounded-xl border px-4 py-3"
      />
    </label>
  );
}
function Empty() {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
      <Check className="mx-auto text-slate-400" />
      <h3 className="mt-3 font-bold">Tudo revisado</h3>
      <p className="mt-1 text-sm text-slate-500">
        Não há mensagens aguardando aprovação.
      </p>
    </div>
  );
}
function useCanArchive() {
  const [allowed, setAllowed] = useState(false),
    token = getToken();
  useEffect(() => {
    if (!token) return;
    me(token)
      .then((user) =>
        setAllowed(
          user.organizations.some(
            (organization) => organization.role === "admin",
          ),
        ),
      )
      .catch(() => setAllowed(false));
  }, [token]);
  return allowed;
}
