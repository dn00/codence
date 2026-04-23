import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import { resolveAppServices, type AppServices } from "./runtime-services.js";
import {
  registerStaticClient,
  type CreateServerOptions
} from "./static-client.js";
import { createDatabase } from "./persistence/db.js";
import { bootstrapDefaultLearnspace, getDefaultDatabasePath } from "./core/bootstrap.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerLearnspaceRoutes } from "./routes/learnspaces.js";
import { registerLibraryRoutes } from "./routes/library.js";
import { registerOnboardingRoute } from "./routes/onboarding.js";
import { registerProgressRoute } from "./routes/progress.js";
import { registerQueueRoutes } from "./routes/queue.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerExecuteRoute } from "./routes/execute.js";
import { registerCoachRoute } from "./routes/coach.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDefaultClientDistDir(): string {
  return path.resolve(__dirname, "../../dist/client");
}

export interface CreateAppOptions {
  clientDistDir: string;
  dbPath?: string;
  now?: () => Date;
  services?: Partial<AppServices>;
}

export async function createApp(
  options: CreateAppOptions = {
    clientDistDir: getDefaultClientDistDir()
  }
): Promise<FastifyInstance> {
  const app = Fastify();
  const now = options.now ?? (() => new Date());
  const dbPath = options.dbPath ?? process.env.CODENCE_DB_PATH ?? getDefaultDatabasePath();
  const db = createDatabase(dbPath);
  const services = resolveAppServices(options.services);

  bootstrapDefaultLearnspace({ db, now });

  registerHealthRoute(app, {
    db,
    coachConfigured: services.coachConfigured,
    coachBackend: services.coachBackend,
    completionConfigured: services.completionConfigured,
    completionBackend: services.completionBackend,
    dbPath,
  });
  registerOnboardingRoute(app, {
    db,
    now,
    coachConfigured: services.coachConfigured,
    completionConfigured: services.completionConfigured,
  });
  registerLearnspaceRoutes(app, { db, now });
  registerQueueRoutes(app, {
    db,
    now,
    completionLLM: services.completionLLM,
    coachRuntime: services.coachRuntime,
    executionAdapter: services.executionAdapter,
  });
  registerSessionRoutes(app, {
    db,
    now,
    evaluationService: services.evaluationService,
    coachRuntime: services.coachRuntime,
  });
  registerExecuteRoute(app, { db, now, executionAdapter: services.executionAdapter });
  registerCoachRoute(app, { db, now, coachRuntime: services.coachRuntime });
  registerProgressRoute(app, { db, now });
  registerLibraryRoutes(app, {
    db,
    now,
    completionLLM: services.completionLLM,
    completionConfigured: services.completionConfigured,
  });
  await registerStaticClient(app, { clientDistDir: options.clientDistDir } satisfies CreateServerOptions);

  return app;
}

async function startServer(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "127.0.0.1";

  await app.listen({
    port,
    host
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
