import Fastify from "fastify";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import { z } from "zod";
import {
  ApiError,
  currentUser,
  id,
  membership,
  now,
  serializeUser,
} from "./auth.js";
import { config, sitesDir } from "./config.js";
import { createUserSchema, integrationPatchSchema, validateTestRecipient } from "./admin-schemas.js";
import { checkDatabase } from "./database.js";
import { DEFAULT_SITE_GENERATION_PROMPT } from "./site-prompt.js";
import { sendWhatsApp, WhatsAppDeliveryError } from "./integrations/whatsapp.js";
import { startWorker } from "./pipeline.js";
import { store } from "./store.js";
import { adminClient, authClient } from "./supabase.js";
import type {
  Database,
  IntegrationSettings,
  Message,
  Operation,
} from "./types.js";

const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
await store.initialize();
await app.register(cors, {
  origin: config.frontendUrl,
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});
await app.register(staticFiles, {
  root: sitesDir,
  prefix: "/generated/",
  decorateReply: false,
});

app.setErrorHandler((error: unknown, request, reply) => {
  const record = error as { statusCode?: unknown },
    validation = error instanceof z.ZodError;
  const status =
    error instanceof ApiError
      ? error.statusCode
      : validation
        ? 422
        : typeof record.statusCode === "number"
          ? record.statusCode
          : 500;
  if (status >= 500)
    request.log.error(
      { error_name: error instanceof Error ? error.name : "UnknownError" },
      "Erro interno na API",
    );
  const message =
    error instanceof WhatsAppDeliveryError
      ? error.message
      : status >= 500
      ? "Erro interno"
      : validation
        ? "Dados inválidos"
        : error instanceof Error
          ? error.message
          : "Requisição inválida";
  reply.status(status).send({ detail: message });
});

app.get("/health", async () => {
  await checkDatabase();
  return {
    status: "ok",
    service: "virtualizze-prospector-api",
    runtime: "node-typescript",
    database: "supabase-postgresql",
    integrations_mode: config.mode,
  };
});

const loginSchema = z.object({ email: z.email(), password: z.string().min(6) });
app.post("/api/v1/auth/login", async (request) => {
  const payload = loginSchema.parse(request.body);
  const { data, error } = await authClient().auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  if (error || !data.session || !data.user)
    throw new ApiError(401, "E-mail ou senha inválidos");
  let user = store.snapshot().users.find((item) => item.id === data.user.id);
  if (!user) {
    await store.reload();
    user = store.snapshot().users.find((item) => item.id === data.user.id);
  }
  if (!user?.active) throw new ApiError(403, "Usuário inativo ou sem acesso");
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    token_type: "bearer",
    user: serializeUser(user),
  };
});

app.post("/api/v1/auth/refresh", async (request) => {
  const { refresh_token } = z
    .object({ refresh_token: z.string().min(1) })
    .parse(request.body);
  const { data, error } = await authClient().auth.refreshSession({
    refresh_token,
  });
  if (error || !data.session || !data.user)
    throw new ApiError(401, "Não foi possível renovar a sessão");
  const userId = data.user.id,
    user = store
      .snapshot()
      .users.find((item) => item.id === userId && item.active);
  if (!user) throw new ApiError(403, "Usuário inativo ou sem acesso");
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
});

app.get("/api/v1/auth/me", async (request) =>
  serializeUser(await currentUser(request)),
);

const operationSchema = z.object({
  organization_id: z.string().uuid(),
  niche: z.string().min(2).max(120),
  city: z.string().min(2).max(160),
  target_count: z.number().int().min(1).max(500),
  approval_mode: z.enum(["automatic", "human_review"]),
  message_template: z.string().min(1).max(4000),
  scheduled_for: z.string().nullish(),
});

app.post("/api/v1/operations", async (request) => {
  const user = await currentUser(request),
    payload = operationSchema.parse(request.body);
  membership(user.id, payload.organization_id, ["admin", "operator"]);
  const timestamp = now(),
    future =
      payload.scheduled_for && new Date(payload.scheduled_for) > new Date();
  const operation: Operation = {
    id: id(),
    organization_id: payload.organization_id,
    created_by: user.id,
    niche: payload.niche,
    city: payload.city,
    target_count: payload.target_count,
    approval_mode: payload.approval_mode,
    message_template: payload.message_template,
    status: future ? "scheduled" : "queued",
    scheduled_for: payload.scheduled_for || null,
    started_at: null,
    finished_at: null,
    error_message: null,
    found_count: 0,
    analyzed_count: 0,
    generated_count: 0,
    sent_count: 0,
    discarded_count: 0,
    blocked_count: 0,
    current_company_id: null,
    current_company_name: null,
    current_stage: future
      ? "Aguardando horário agendado"
      : "Na fila de processamento",
    archived_at: null,
    archived_by: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await store.mutate((db) => db.operations.push(operation));
  return operation;
});

app.get("/api/v1/operations", async (request) => {
  const user = await currentUser(request),
    organizationId = queryString(request.query, "organization_id");
  membership(user.id, organizationId);
  return store
    .snapshot()
    .operations.filter(
      (item) => item.organization_id === organizationId && !item.archived_at,
    )
    .sort(descending);
});

app.get("/api/v1/operations/:id", async (request) => {
  const user = await currentUser(request),
    operationId = (request.params as { id: string }).id,
    db = store.snapshot();
  const operation = db.operations.find(
    (item) => item.id === operationId && !item.archived_at,
  );
  if (!operation) throw new ApiError(404, "Operação não encontrada");
  membership(user.id, operation.organization_id);
  const integration = integrationOf(db.integrations, operation.organization_id);
  return {
    ...operation,
    delivery: {
      test_mode: integration.whatsapp_test_mode,
      test_number: integration.whatsapp_test_mode
        ? integration.whatsapp_test_number
        : null,
    },
    companies: db.operationCompanies
      .filter((item) => item.operation_id === operationId)
      .map((link) => {
        const company = db.companies.find(
          (item) => item.id === link.company_id,
        )!;
        return {
          id: link.id,
          company_id: company.id,
          name: company.name,
          phone: company.phone,
          other_phones: company.other_phones,
          email: company.email,
          address: company.address,
          city: company.city,
          category: company.category,
          website: company.website,
          maps_url: company.maps_url,
          social_links: company.social_links,
          listed_at: link.created_at,
          status: link.status,
          discard_reason: link.discard_reason,
          score: link.score,
          generated_site_url: link.generated_site_url,
          final_message: link.final_message,
          updated_at: link.updated_at,
        };
      }),
  };
});

app.delete("/api/v1/operations/:id", async (request) => {
  const user = await currentUser(request),
    operationId = (request.params as { id: string }).id,
    snapshot = store.snapshot();
  const operation = snapshot.operations.find(
    (item) => item.id === operationId && !item.archived_at,
  );
  if (!operation) throw new ApiError(404, "Operação não encontrada");
  membership(user.id, operation.organization_id, ["admin"]);
  if (
    ![
      "completed",
      "failed",
      "awaiting_approval",
      "scheduled",
      "queued",
    ].includes(operation.status)
  )
    throw new ApiError(
      409,
      "Não é possível arquivar uma operação em processamento",
    );
  await store.mutate((db) => {
    const target = db.operations.find((item) => item.id === operationId)!;
    target.archived_at = now();
    target.archived_by = user.id;
    target.updated_at = now();
    db.events.push({
      id: id(),
      organization_id: target.organization_id,
      operation_id: target.id,
      operation_company_id: null,
      actor_id: user.id,
      event_type: "operation_archived",
      payload: { archived_by: user.id },
      created_at: now(),
    });
  });
  return { success: true };
});

app.get("/api/v1/companies", async (request) => {
  const user = await currentUser(request),
    organizationId = queryString(request.query, "organization_id");
  membership(user.id, organizationId);
  const db = store.snapshot();
  return db.companies
    .filter(
      (item) => item.organization_id === organizationId && !item.archived_at,
    )
    .sort(descending)
    .map((company) => {
      const links = db.operationCompanies.filter(
          (item) => item.company_id === company.id,
        ),
        operations = links
          .map((link) => {
            const operation = db.operations.find(
              (item) => item.id === link.operation_id,
            );
            return operation
              ? {
                  id: operation.id,
                  niche: operation.niche,
                  city: operation.city,
                  status: link.status,
                  listed_at: link.created_at,
                  generated_site_url: link.generated_site_url,
                }
              : null;
          })
          .filter(Boolean);
      return { ...company, operations };
    });
});

app.delete("/api/v1/companies/:id", async (request) => {
  const user = await currentUser(request),
    companyId = (request.params as { id: string }).id,
    snapshot = store.snapshot();
  const company = snapshot.companies.find(
    (item) => item.id === companyId && !item.archived_at,
  );
  if (!company) throw new ApiError(404, "Empresa não encontrada");
  membership(user.id, company.organization_id, ["admin"]);
  await store.mutate((db) => {
    const target = db.companies.find((item) => item.id === companyId)!;
    target.archived_at = now();
    target.archived_by = user.id;
    target.updated_at = now();
    db.events.push({
      id: id(),
      organization_id: target.organization_id,
      operation_id: null,
      operation_company_id: null,
      actor_id: user.id,
      event_type: "company_archived",
      payload: { company_id: companyId, archived_by: user.id },
      created_at: now(),
    });
  });
  return { success: true };
});

app.get("/api/v1/dashboard/summary", async (request) => {
  const user = await currentUser(request),
    organizationId = queryString(request.query, "organization_id");
  membership(user.id, organizationId);
  const db = store.snapshot(),
    operations = db.operations.filter(
      (item) => item.organization_id === organizationId && !item.archived_at,
    ),
    operationIds = operations.map((item) => item.id),
    links = db.operationCompanies.filter((item) =>
      operationIds.includes(item.operation_id),
    ),
    linkIds = links.map((item) => item.id),
    messages = db.messages.filter((item) =>
      linkIds.includes(item.operation_company_id),
    );
  return {
    companies: db.companies.filter(
      (item) => item.organization_id === organizationId && !item.archived_at,
    ).length,
    operations: operations.length,
    sites_generated: links.filter((item) => item.generated_site_url).length,
    messages_sent: messages.filter((item) => item.status === "sent").length,
    discarded: links.filter((item) => item.status.startsWith("discarded_"))
      .length,
    blocked: links.filter((item) => item.status === "blocked_history").length,
    pending_approval: messages.filter(
      (item) => item.status === "pending_approval",
    ).length,
    running_operation_id:
      operations.find((item) => !["completed", "failed"].includes(item.status))
        ?.id || null,
  };
});

app.get("/api/v1/messages", async (request) => {
  const user = await currentUser(request),
    organizationId = queryString(request.query, "organization_id"),
    status = queryOptional(request.query, "status");
  membership(user.id, organizationId);
  const db = store.snapshot();
  return db.messages
    .filter((record) => {
      const link = db.operationCompanies.find(
          (item) => item.id === record.operation_company_id,
        ),
        operation =
          link && db.operations.find((item) => item.id === link.operation_id),
        company =
          link && db.companies.find((item) => item.id === link.company_id);
      return (
        record.organization_id === organizationId &&
        !operation?.archived_at &&
        !company?.archived_at &&
        (!status || record.status === status)
      );
    })
    .sort(descending)
    .map((record) => serializeMessage(record, db));
});

const approvalsInFlight = new Set<string>();
app.post("/api/v1/messages/:id/approve", async (request) => {
  const user = await currentUser(request),
    messageId = (request.params as { id: string }).id,
    payload = z
      .object({ content: z.string().min(1).optional() })
      .parse(request.body || {}),
    snapshot = store.snapshot(),
    record = snapshot.messages.find((item) => item.id === messageId),
    link =
      record &&
      snapshot.operationCompanies.find(
        (item) => item.id === record.operation_company_id,
      ),
    operation =
      link && snapshot.operations.find((item) => item.id === link.operation_id);
  if (!record || !link || !operation)
    throw new ApiError(404, "Mensagem não encontrada");
  membership(user.id, operation.organization_id, ["admin", "operator"]);
  if (record.status !== "pending_approval")
    throw new ApiError(409, "A mensagem não está aguardando aprovação");
  if (approvalsInFlight.has(messageId))
    throw new ApiError(409, "Esta mensagem já está sendo aprovada");
  approvalsInFlight.add(messageId);
  try {
  const integration = integrationOf(
      snapshot.integrations,
      operation.organization_id,
    ),
    content = payload.content || record.content,
    sent = await sendWhatsApp(record.recipient, content, integration);
  await store.mutate((db) => {
    const target = db.messages.find((item) => item.id === messageId)!,
      targetLink = db.operationCompanies.find((item) => item.id === link.id)!,
      company = db.companies.find((item) => item.id === targetLink.company_id)!,
      targetOperation = db.operations.find((item) => item.id === operation.id)!;
    target.content = content;
    target.status = "sent";
    target.approved_by = user.id;
    target.approved_at = now();
    target.provider_message_id = sent.providerMessageId;
    target.delivered_to = sent.actualRecipient;
    target.test_mode = sent.redirected;
    target.sent_at = now();
    target.updated_at = now();
    targetLink.final_message = content;
    targetLink.status = "sent";
    targetLink.updated_at = now();
    company.prospected_at = now();
    company.prospected_operation_id = operation.id;
    targetOperation.sent_count++;
    const pending = db.messages.some(
      (item) =>
        item.id !== target.id &&
        item.status === "pending_approval" &&
        db.operationCompanies.find(
          (candidate) => candidate.id === item.operation_company_id,
        )?.operation_id === operation.id,
    );
    if (!pending) {
      targetOperation.status = "completed";
      targetOperation.current_stage = "Operação concluída";
      targetOperation.finished_at = now();
    }
    targetOperation.updated_at = now();
    db.events.push({
      id: id(),
      organization_id: operation.organization_id,
      operation_id: operation.id,
      operation_company_id: link.id,
      actor_id: user.id,
      event_type: "message_approved",
      payload: {
        message_id: messageId,
        delivered_to: sent.actualRecipient,
        test_mode: sent.redirected,
      },
      created_at: now(),
    });
  });
  return serializeMessage(
    store.snapshot().messages.find((item) => item.id === messageId)!,
    store.snapshot(),
  );
  } finally {
    approvalsInFlight.delete(messageId);
  }
});

app.get("/api/v1/integrations", async (request) => {
  const user = await currentUser(request),
    organizationId = queryString(request.query, "organization_id");
  membership(user.id, organizationId);
  return integrationView(
    integrationOf(store.snapshot().integrations, organizationId),
  );
});

app.put("/api/v1/integrations", async (request) => {
  const user = await currentUser(request),
    organizationId = queryString(request.query, "organization_id");
  membership(user.id, organizationId, ["admin"]);
  const payload = integrationPatchSchema.parse(request.body);
  await store.mutate((db) => {
    const integration = integrationOf(db.integrations, organizationId);
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "boolean")
        (integration as unknown as Record<string, unknown>)[key] = value;
      else
        (integration as unknown as Record<string, string>)[key] =
          value?.trim() || "";
    }
    try { validateTestRecipient(integration); }
    catch { throw new ApiError(422, "Informe um número válido para ativar o modo de teste"); }
    integration.updated_at = now();
    db.events.push({id: id(), organization_id: organizationId, operation_id: null,
      operation_company_id: null, actor_id: user.id, event_type: "integration_settings_updated",
      payload: {fields: Object.keys(payload)}, created_at: now()});
  });
  return integrationView(
    integrationOf(store.snapshot().integrations, organizationId),
  );
});

app.get("/api/v1/users", async (request) => {
  const current = await currentUser(request),
    organizationId = queryString(request.query, "organization_id");
  membership(current.id, organizationId);
  const db = store.snapshot();
  return db.memberships
    .filter((item) => item.organization_id === organizationId)
    .map((member) => {
      const user = db.users.find((item) => item.id === member.user_id)!;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
        active: user.active,
        created_at: user.created_at,
      };
    });
});

app.post("/api/v1/users", async (request) => {
  const current = await currentUser(request),
    payload = createUserSchema.parse(request.body);
  membership(current.id, payload.organization_id, ["admin"]);
  if (
    store
      .snapshot()
      .users.some((item) => item.email === payload.email.toLowerCase())
  )
    throw new ApiError(409, "Já existe um usuário com este e-mail");
  const { data, error } = await adminClient().auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { name: payload.name },
  });
  if (error || !data.user)
    throw new ApiError(
      error?.code === "email_exists" || error?.code === "user_already_exists" ? 409 : error?.status === 422 ? 422 : 502,
      error?.code === "email_exists" || error?.code === "user_already_exists"
        ? "Já existe um usuário com este e-mail"
        : error?.status === 422 ? "Verifique o e-mail e os requisitos de senha" : "Não foi possível criar o usuário no serviço de autenticação",
    );
  const timestamp = now(),
    user = {
      id: data.user.id,
      name: payload.name,
      email: payload.email.toLowerCase(),
      active: true,
      created_at: data.user.created_at || timestamp,
      updated_at: timestamp,
    };
  try {
    await store.mutate((db) => {
      if (!db.users.some((item) => item.id === user.id)) db.users.push(user);
      db.memberships.push({
        organization_id: payload.organization_id,
        user_id: user.id,
        role: payload.role,
        created_at: timestamp,
        updated_at: timestamp,
      });
      db.events.push({id: id(), organization_id: payload.organization_id, operation_id: null,
        operation_company_id: null, actor_id: current.id, event_type: "user_created",
        payload: {user_id: user.id, role: payload.role}, created_at: timestamp});
    });
  } catch (reason) {
    await adminClient().auth.admin.deleteUser(user.id);
    throw reason;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: payload.role,
    active: true,
    created_at: user.created_at,
  };
});

app.patch("/api/v1/users/:id", async (request) => {
  const current = await currentUser(request),
    organizationId = queryString(request.query, "organization_id"),
    userId = (request.params as { id: string }).id,
    { active } = z.object({ active: z.boolean() }).parse(request.body);
  membership(current.id, organizationId, ["admin"]);
  if (current.id === userId && !active)
    throw new ApiError(409, "Você não pode desativar seu próprio usuário");
  await store.mutate((db) => {
    const user = db.users.find((item) => item.id === userId),
      member = db.memberships.find(
        (item) =>
          item.user_id === userId && item.organization_id === organizationId,
      );
    if (!user || !member) throw new ApiError(404, "Usuário não encontrado");
    user.active = active;
    user.updated_at = now();
  });
  const db = store.snapshot(),
    user = db.users.find((item) => item.id === userId)!,
    member = db.memberships.find(
      (item) =>
        item.user_id === userId && item.organization_id === organizationId,
    )!;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: member.role,
    active: user.active,
    created_at: user.created_at,
  };
});

function queryString(query: unknown, key: string) {
  const value = (query as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value)
    throw new ApiError(422, `${key} é obrigatório`);
  return value;
}
function queryOptional(query: unknown, key: string) {
  const value = (query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
function descending(a: { created_at: string }, b: { created_at: string }) {
  return b.created_at.localeCompare(a.created_at);
}
function integrationOf(items: IntegrationSettings[], organizationId: string) {
  const item = items.find(
    (record) => record.organization_id === organizationId,
  );
  if (!item) throw new ApiError(404, "Configuração não encontrada");
  return item;
}
function integrationView(item: IntegrationSettings) {
  return {
    mode: config.mode,
    serper_configured: !!item.serper_api_key,
    openai_configured: !!item.openai_api_key,
    openai_model: item.openai_model,
    site_generation_prompt: item.site_generation_prompt || DEFAULT_SITE_GENERATION_PROMPT,
    default_site_generation_prompt: DEFAULT_SITE_GENERATION_PROMPT,
    vercel_configured: !!item.vercel_token,
    evolution_configured: !!(
      (item.evolution_url || config.evolutionUrl) &&
      (item.evolution_api_key || config.evolutionApiKey)
    ),
    evolution_url: item.evolution_url || config.evolutionUrl || null,
    evolution_instance: item.evolution_instance || config.evolutionInstance || null,
    whatsapp_test_mode: item.whatsapp_test_mode,
    whatsapp_test_number: item.whatsapp_test_number,
  };
}
function serializeMessage(record: Message, db: Database) {
  const link = db.operationCompanies.find(
      (item) => item.id === record.operation_company_id,
    )!,
    company = db.companies.find((item) => item.id === link.company_id)!,
    integration = integrationOf(db.integrations, link.organization_id),
    pendingTest =
      record.status === "pending_approval" && integration.whatsapp_test_mode;
  return {
    id: record.id,
    operation_company_id: link.id,
    company_name: company.name,
    recipient: record.recipient,
    delivered_to: record.delivered_to,
    test_mode: record.test_mode || pendingTest,
    delivery_recipient:
      record.delivered_to ||
      (pendingTest ? integration.whatsapp_test_number : record.recipient),
    content: record.content,
    status: record.status,
    site_url: link.generated_site_url,
    created_at: record.created_at,
  };
}

startWorker();
await app.listen({ port: config.port, host: config.host });
