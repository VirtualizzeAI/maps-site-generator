import { mkdir } from "node:fs/promises";
import type { PoolClient } from "pg";
import { config, sitesDir } from "./config.js";
import { database } from "./database.js";
import { DEFAULT_SITE_GENERATION_PROMPT } from "./site-prompt.js";
import type { Database, IntegrationSettings } from "./types.js";

type Collection = keyof Database;
type TableConfig = {
  key: Collection;
  table: string;
  columns: string[];
  conflict: string[];
};

const tables: TableConfig[] = [
  {
    key: "organizations",
    table: "organizations",
    columns: ["id", "name", "created_at", "updated_at"],
    conflict: ["id"],
  },
  {
    key: "users",
    table: "profiles",
    columns: ["id", "name", "email", "active", "created_at", "updated_at"],
    conflict: ["id"],
  },
  {
    key: "memberships",
    table: "memberships",
    columns: ["organization_id", "user_id", "role", "created_at", "updated_at"],
    conflict: ["organization_id", "user_id"],
  },
  {
    key: "integrations",
    table: "integration_settings",
    columns: [
      "organization_id",
      "openai_model",
      "site_generation_prompt",
      "automatic_send_interval_seconds",
      "evolution_url",
      "evolution_instance",
      "whatsapp_test_mode",
      "whatsapp_test_number",
      "created_at",
      "updated_at",
    ],
    conflict: ["organization_id"],
  },
  {
    key: "operations",
    table: "operations",
    columns: [
      "id",
      "organization_id",
      "created_by",
      "niche",
      "city",
      "target_count",
      "approval_mode",
      "message_template",
      "status",
      "scheduled_for",
      "started_at",
      "finished_at",
      "error_message",
      "found_count",
      "analyzed_count",
      "generated_count",
      "sent_count",
      "discarded_count",
      "blocked_count",
      "current_company_id",
      "current_company_name",
      "current_stage",
      "archived_at",
      "archived_by",
      "created_at",
      "updated_at",
    ],
    conflict: ["id"],
  },
  {
    key: "companies",
    table: "companies",
    columns: [
      "id",
      "organization_id",
      "name",
      "normalized_name",
      "phone",
      "other_phones",
      "email",
      "address",
      "city",
      "category",
      "website",
      "maps_url",
      "social_links",
      "source",
      "source_id",
      "raw_data",
      "first_seen_at",
      "prospected_at",
      "prospected_operation_id",
      "archived_at",
      "archived_by",
      "created_at",
      "updated_at",
    ],
    conflict: ["id"],
  },
  {
    key: "operationCompanies",
    table: "operation_companies",
    columns: [
      "id",
      "organization_id",
      "operation_id",
      "company_id",
      "status",
      "discard_reason",
      "score",
      "generated_site_url",
      "final_message",
      "created_at",
      "updated_at",
    ],
    conflict: ["id"],
  },
  {
    key: "messages",
    table: "messages",
    columns: [
      "id",
      "organization_id",
      "operation_company_id",
      "recipient",
      "delivered_to",
      "test_mode",
      "content",
      "status",
      "approved_by",
      "approved_at",
      "provider_message_id",
      "sent_at",
      "error_message",
      "created_at",
      "updated_at",
    ],
    conflict: ["id"],
  },
  {
    key: "events",
    table: "events",
    columns: [
      "id",
      "organization_id",
      "operation_id",
      "operation_company_id",
      "actor_id",
      "event_type",
      "payload",
      "created_at",
    ],
    conflict: ["id"],
  },
];

const empty = (): Database => ({
  organizations: [],
  users: [],
  memberships: [],
  integrations: [],
  operations: [],
  companies: [],
  operationCompanies: [],
  messages: [],
  events: [],
});
const fingerprint = (value: unknown) => JSON.stringify(value);

class PostgresStore {
  private data: Database = empty();
  private queue: Promise<unknown> = Promise.resolve();

  async initialize() {
    await mkdir(sitesDir, { recursive: true });
    await this.reload();
  }

  async reload() {
    const db = database();
    const results = await Promise.all(
      tables.map((item) => db.query(`select * from public.${item.table}`)),
    );
    const identities = await db.query<{ company_id: string; identity: string }>(
      "select company_id, identity from public.company_identities order by created_at",
    );
    const next = empty();
    tables.forEach((item, index) => {
      (next[item.key] as unknown[]) = (results[index]?.rows || []) as unknown[];
    });
    const grouped = new Map<string, string[]>();
    for (const row of identities.rows)
      grouped.set(row.company_id, [
        ...(grouped.get(row.company_id) || []),
        row.identity,
      ]);
    next.companies = next.companies.map((company) => ({
      ...company,
      identities: grouped.get(company.id) || [],
    }));
    next.integrations = next.integrations.map((item) => this.withSecrets(item));
    this.data = next;
  }

  snapshot() {
    return structuredClone(this.data);
  }

  async mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
    const execution = this.queue
      .catch(() => undefined)
      .then(async () => {
        const before = this.data,
          candidate = structuredClone(before);
        const result = await fn(candidate);
        await this.persistDiff(before, candidate);
        this.data = candidate;
        return result;
      });
    this.queue = execution;
    return execution;
  }

  private withSecrets(
    item: Partial<IntegrationSettings> & { organization_id: string },
  ) {
    return {
      ...item,
      openai_model: item.openai_model || config.openaiModel,
      site_generation_prompt: item.site_generation_prompt?.trim() || DEFAULT_SITE_GENERATION_PROMPT,
      automatic_send_interval_seconds: item.automatic_send_interval_seconds ?? 0,
      evolution_url: item.evolution_url || "",
      evolution_instance: item.evolution_instance || "",
      whatsapp_test_mode: item.whatsapp_test_mode === true,
      whatsapp_test_number: item.whatsapp_test_number || "",
      serper_api_key: config.serperApiKey,
      openai_api_key: config.openaiApiKey,
      vercel_token: config.vercelToken,
      evolution_api_key: config.evolutionApiKey,
    } as IntegrationSettings;
  }

  private async persistDiff(before: Database, after: Database) {
    const client = await database().connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock($1)", [74832951]);
      for (const item of tables) {
        const oldRecords = before[item.key] as unknown as Array<
          Record<string, unknown>
        >;
        const newRecords = after[item.key] as unknown as Array<
          Record<string, unknown>
        >;
        const old = new Map(
          oldRecords.map((record) => [
            recordKey(item, record),
            fingerprint(record),
          ]),
        );
        const changed = newRecords.filter(
          (record) => old.get(recordKey(item, record)) !== fingerprint(record),
        );
        if (changed.length) await upsert(client, item, changed);
      }
      const oldIdentities = new Set(
        before.companies.flatMap((company) =>
          company.identities.map(
            (identity) => `${company.organization_id}:${identity}`,
          ),
        ),
      );
      const newIdentities = after.companies.flatMap((company) =>
        company.identities
          .filter(
            (identity) =>
              !oldIdentities.has(`${company.organization_id}:${identity}`),
          )
          .map((identity) => ({
            organization_id: company.organization_id,
            company_id: company.id,
            identity,
          })),
      );
      if (newIdentities.length)
        await upsert(
          client,
          {
            key: "companies",
            table: "company_identities",
            columns: ["organization_id", "company_id", "identity"],
            conflict: ["organization_id", "identity"],
          },
          newIdentities,
        );
      const oldLinks = new Map(
        before.operationCompanies.map((link) => [
          link.id,
          link.generated_site_url,
        ]),
      );
      const sites = after.operationCompanies
        .filter(
          (link) =>
            link.generated_site_url &&
            oldLinks.get(link.id) !== link.generated_site_url,
        )
        .map((link) => ({
          id: link.id,
          organization_id: link.organization_id,
          operation_company_id: link.id,
          provider: link.generated_site_url?.includes("vercel.app")
            ? "vercel"
            : "local",
          deployment_id: null,
          public_url: link.generated_site_url,
          status: "ready",
          error_message: null,
          created_at: link.created_at,
          updated_at: link.updated_at,
        }));
      if (sites.length)
        await upsert(
          client,
          {
            key: "operationCompanies",
            table: "sites",
            columns: [
              "id",
              "organization_id",
              "operation_company_id",
              "provider",
              "deployment_id",
              "public_url",
              "status",
              "error_message",
              "created_at",
              "updated_at",
            ],
            conflict: ["operation_company_id"],
          },
          sites,
        );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

function recordKey(config: TableConfig, record: Record<string, unknown>) {
  return config.conflict
    .map((column) => String(record[column] || ""))
    .join(":");
}

async function upsert(
  client: PoolClient,
  config: TableConfig,
  records: Array<Record<string, unknown>>,
) {
  const values: unknown[] = [];
  const groups = records.map(
    (record, rowIndex) =>
      `(${config.columns
        .map((column, columnIndex) => {
          values.push(record[column] === undefined ? null : record[column]);
          return `$${rowIndex * config.columns.length + columnIndex + 1}`;
        })
        .join(",")})`,
  );
  const mutable = config.columns.filter(
    (column) => !config.conflict.includes(column),
  );
  const action = mutable.length
    ? `do update set ${mutable.map((column) => `${column}=excluded.${column}`).join(",")}`
    : "do nothing";
  await client.query(
    `insert into public.${config.table} (${config.columns.join(",")}) values ${groups.join(",")} on conflict (${config.conflict.join(",")}) ${action}`,
    values,
  );
}

export const store = new PostgresStore();
