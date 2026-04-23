import type { FastifyInstance } from "fastify";
import { statSync } from "node:fs";
import { getProcessCounters, type RuntimeDiagnostics } from "../ai/runtime-diagnostics.js";
import { listProviderStatus, type ProviderStatus } from "../ai/providers/registry.js";
import type { AppDatabase } from "../persistence/db.js";
import { sessions } from "../persistence/schema.js";

export interface HealthRouteDependencies {
  db: AppDatabase;
  coachConfigured: boolean;
  coachBackend: string | null;
  completionConfigured: boolean;
  completionBackend: string | null;
  dbPath?: string;
}

export interface HealthResponse {
  status: "ok";
  service: "codence";
  diagnostics: RuntimeDiagnostics & {
    database?: {
      path: string;
      sizeBytes: number | null;
      modifiedAt: string | null;
    };
  };
  providers: ProviderStatus[];
}

export function registerHealthRoute(
  app: FastifyInstance,
  dependencies: HealthRouteDependencies,
): void {
  app.get("/api/health", async (): Promise<HealthResponse> => {
    const counters = getProcessCounters();

    // Count active coach sessions from DB (sessions with non-null coachRuntimeState)
    let activeSessions = 0;
    try {
      const allSessions = dependencies.db.select().from(sessions).all();
      activeSessions = allSessions.filter((s) => s.coachRuntimeState != null).length;
    } catch {
      // DB may not be ready — return 0
    }

    const database = dependencies.dbPath
      ? (() => {
          try {
            const stats = statSync(dependencies.dbPath);
            return {
              path: dependencies.dbPath,
              sizeBytes: stats.size,
              modifiedAt: stats.mtime.toISOString(),
            };
          } catch {
            return {
              path: dependencies.dbPath,
              sizeBytes: null,
              modifiedAt: null,
            };
          }
        })()
      : undefined;

    return {
      status: "ok",
      service: "codence",
      diagnostics: {
        coach: {
          configured: dependencies.coachConfigured,
          backend: dependencies.coachBackend,
          activeSessions,
          expiredSessionsCleared: counters.expiredSessionsCleared,
          resumedTurns: counters.resumedTurns,
        },
        completion: {
          configured: dependencies.completionConfigured,
          backend: dependencies.completionBackend,
        },
        ...(database ? { database } : {}),
      },
      providers: listProviderStatus(process.env),
    };
  });
}
