import { useEffect, useState } from "react";
import {
  getHealth,
  getLearnspace,
  getProgress,
  type HealthResponse,
  type LearnspaceResponse,
  type ProviderStatus,
} from "../lib/api";
import { AppShell } from "../components/AppShell";

function formatBytes(value: number | null): string {
  if (value === null) return "unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatModifiedAt(iso: string | null): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface SimpleRowProps {
  label: string;
  configured: boolean;
  backend: string | null;
  hint: React.ReactNode;
}

function SimpleRow({ label, configured, backend, hint }: SimpleRowProps) {
  return (
    <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-[160px_1fr_140px] gap-3 items-center">
      <div className="font-sans text-sm font-bold text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground leading-snug">
        {configured ? (backend ?? "—") : hint}
      </div>
      <div
        className={`font-mono text-[10px] font-bold uppercase tracking-wider md:text-right ${
          configured ? "text-success" : "text-muted-foreground"
        }`}
      >
        {configured ? "ready" : "not configured"}
      </div>
    </div>
  );
}

function EnvVar({ name }: { name: string }) {
  return (
    <code className="bg-muted px-1.5 py-0.5 rounded-[2px] font-mono text-[11px] border border-border-light text-foreground">
      {name}
    </code>
  );
}

interface ProviderRowProps {
  provider: ProviderStatus;
  activeCoachBackend: string | null;
  activeCompletionBackend: string | null;
}

function ProviderRow({ provider, activeCoachBackend, activeCompletionBackend }: ProviderRowProps) {
  const capabilities: string[] = [];
  if (provider.supports.coach) capabilities.push("coach");
  if (provider.supports.completion) capabilities.push("completion");
  const capabilityText = capabilities.join(" + ");

  const activeRoles: string[] = [];
  if (activeCoachBackend === provider.id) activeRoles.push("coach");
  if (activeCompletionBackend === provider.id) activeRoles.push("completion");

  const requiredVars = provider.envVars.filter((v) => v.required);
  const optionalVars = provider.envVars.filter((v) => !v.required);

  return (
    <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-[200px_1fr_140px] gap-3 items-start">
      <div>
        <div className="font-sans text-sm font-bold text-foreground">{provider.label}</div>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
          {capabilityText}
        </div>
      </div>
      <div className="text-sm text-muted-foreground leading-snug">
        {provider.configured ? (
          activeRoles.length > 0 ? (
            <span>
              Active for <span className="text-foreground font-bold">{activeRoles.join(" + ")}</span>
            </span>
          ) : (
            <span>Ready (another backend is taking priority)</span>
          )
        ) : (
          <span className="flex flex-wrap gap-x-1.5 gap-y-1 items-center">
            <span>Set</span>
            {requiredVars.map((v, i) => (
              <span key={v.name} className="inline-flex items-center gap-1.5">
                <EnvVar name={v.name} />
                {i < requiredVars.length - 1 ? <span>,</span> : null}
              </span>
            ))}
            {optionalVars.length > 0 ? (
              <span className="text-[11px]">
                (optional: {optionalVars.map((v) => v.name).join(", ")})
              </span>
            ) : null}
          </span>
        )}
      </div>
      <div
        className={`font-mono text-[10px] font-bold uppercase tracking-wider md:text-right ${
          provider.configured
            ? activeRoles.length > 0
              ? "text-success"
              : "text-muted-foreground"
            : "text-muted-foreground"
        }`}
      >
        {provider.configured ? (activeRoles.length > 0 ? "active" : "ready") : "not configured"}
      </div>
    </div>
  );
}

export function Settings() {
  const [learnspace, setLearnspace] = useState<LearnspaceResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const progress = await getProgress();
        const [detail, healthPayload] = await Promise.all([
          getLearnspace(progress.learnspace.id),
          getHealth(),
        ]);
        if (!cancelled) {
          setLearnspace(detail);
          setHealth(healthPayload);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AppShell learnspaceName={learnspace?.name}>
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-background">
        <div className="max-w-5xl mx-auto p-6 xl:p-10 flex flex-col gap-6 pb-16">
          <div>
            <h1 className="font-sans text-2xl font-black text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Local configuration for this install.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-destructive bg-card border border-destructive rounded-[2px] p-4 shadow-brutal">
              {error}
            </p>
          )}

          {!loading && !error && (
            <div className="flex flex-col gap-6">
              {/* Learnspace */}
              <section className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Learnspace</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</div>
                    <div className="font-sans text-sm font-bold text-foreground mt-1">{learnspace?.name ?? "unknown"}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Family</div>
                    <div className="font-sans text-sm font-bold text-foreground mt-1">{learnspace?.family.label ?? "unknown"}</div>
                  </div>
                </div>
              </section>

              {/* AI Backends — one row per provider from the registry */}
              <section className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-baseline justify-between gap-3">
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Backends</h2>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Coach: <span className="text-foreground font-bold">{health?.diagnostics.coach.backend ?? "—"}</span>
                    <span className="mx-2">·</span>
                    Completion: <span className="text-foreground font-bold">{health?.diagnostics.completion.backend ?? "—"}</span>
                  </span>
                </div>
                <div className="divide-y divide-border-light">
                  {(health?.providers ?? []).map((provider) => (
                    <ProviderRow
                      key={provider.id}
                      provider={provider}
                      activeCoachBackend={health?.diagnostics.coach.backend ?? null}
                      activeCompletionBackend={health?.diagnostics.completion.backend ?? null}
                    />
                  ))}
                </div>
              </section>

              {/* Runtime — executor (code runner), not an AI backend */}
              <section className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Runtime</h2>
                </div>
                <div className="divide-y divide-border-light">
                  <SimpleRow
                    label="Executor"
                    configured={Boolean(learnspace?.config.executor)}
                    backend={learnspace?.config.executor?.type ?? null}
                    hint={<span>Configured per learnspace (<EnvVar name="config.executor" />)</span>}
                  />
                </div>
              </section>

              {/* Database */}
              <section className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Database</h2>
                </div>
                <div className="p-5 flex flex-col gap-5">
                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Path</div>
                    <div className="font-mono text-xs text-foreground mt-1 break-all bg-muted/40 border border-border-light rounded-[2px] px-3 py-2">
                      {health?.diagnostics.database?.path ?? "unknown"}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Size</div>
                      <div className="font-sans text-sm font-bold text-foreground mt-1">{formatBytes(health?.diagnostics.database?.sizeBytes ?? null)}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last modified</div>
                      <div className="font-sans text-sm font-bold text-foreground mt-1">{formatModifiedAt(health?.diagnostics.database?.modifiedAt ?? null)}</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
