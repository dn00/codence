import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";

export interface CreateServerOptions {
  clientDistDir: string;
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const details = await stat(dirPath);
    return details.isDirectory();
  } catch {
    return false;
  }
}

function getRequestPath(request: FastifyRequest): string {
  return request.url.split("?")[0] ?? request.url;
}

async function sendClientShell(reply: FastifyReply, clientDistDir: string): Promise<void> {
  try {
    const html = await readFile(path.join(clientDistDir, "index.html"), "utf8");
    reply.type("text/html; charset=utf-8").send(html);
  } catch {
    reply.code(503).type("application/json").send({
      error: "Client bundle not found"
    });
  }
}

export async function registerStaticClient(
  app: FastifyInstance,
  options: CreateServerOptions
): Promise<void> {
  const assetsDir = path.join(options.clientDistDir, "assets");

  if (await directoryExists(assetsDir)) {
    await app.register(fastifyStatic, {
      root: assetsDir,
      prefix: "/assets/"
    });
  }

  app.get("/*", async (request, reply) => {
    const requestPath = getRequestPath(request);

    if (requestPath.startsWith("/api/")) {
      reply.code(404).type("application/json").send({
        error: "Not Found"
      });
      return;
    }

    if (requestPath.startsWith("/assets/")) {
      return reply.sendFile(requestPath.replace(/^\/assets\/+/, ""));
    }

    await sendClientShell(reply, options.clientDistDir);
  });
}
