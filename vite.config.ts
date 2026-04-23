import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function packageNameFromId(id: string): string | null {
  const packagePath = id.split("node_modules/").pop();
  if (!packagePath) return null;

  const segments = packagePath.split("/");
  if (segments[0]?.startsWith("@")) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0] ?? null;
}

function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  const packageName = packageNameFromId(id);
  if (!packageName) return "vendor";

  if (
    packageName === "monaco-editor" ||
    packageName === "@monaco-editor/react" ||
    packageName === "@monaco-editor/loader" ||
    packageName === "state-local"
  ) {
    return "monaco";
  }

  if (
    packageName === "react" ||
    packageName === "react-dom" ||
    packageName === "scheduler" ||
    packageName === "use-sync-external-store"
  ) {
    return "react";
  }

  if (
    packageName === "react-router" ||
    packageName === "react-router-dom" ||
    packageName === "@remix-run/router" ||
    packageName === "cookie" ||
    packageName === "set-cookie-parser"
  ) {
    return "router";
  }

  if (
    packageName === "react-markdown" ||
    packageName === "react-syntax-highlighter" ||
    packageName === "remark-gfm" ||
    packageName === "refractor" ||
    packageName === "lowlight" ||
    packageName === "highlight.js" ||
    packageName === "property-information" ||
    packageName === "space-separated-tokens" ||
    packageName === "comma-separated-tokens" ||
    packageName === "html-url-attributes" ||
    packageName === "parse-entities" ||
    packageName === "inline-style-parser" ||
    packageName === "style-to-object" ||
    packageName === "markdown-table" ||
    packageName === "longest-streak" ||
    packageName === "decode-named-character-reference" ||
    packageName === "character-reference-invalid" ||
    packageName === "character-entities" ||
    packageName === "character-entities-legacy" ||
    packageName === "ccount" ||
    packageName === "bail" ||
    packageName === "trough" ||
    packageName === "vfile" ||
    packageName === "vfile-message" ||
    packageName === "devlop" ||
    packageName === "extend" ||
    packageName === "format" ||
    packageName === "fault" ||
    packageName === "zwitch" ||
    packageName === "trim-lines" ||
    packageName === "is-plain-obj" ||
    packageName === "is-alphabetical" ||
    packageName === "is-alphanumerical" ||
    packageName === "is-decimal" ||
    packageName === "is-hexadecimal" ||
    packageName.startsWith("remark-") ||
    packageName.startsWith("rehype-") ||
    packageName.startsWith("micromark") ||
    packageName.startsWith("mdast-") ||
    packageName.startsWith("hast-") ||
    packageName.startsWith("unist-") ||
    packageName.startsWith("estree-util-")
  ) {
    return "markdown";
  }

  return undefined;
}

export default defineConfig({
  plugins: [tailwindcss() as any, react()],
  server: {
    proxy: {
      "/api": process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3000",
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  build: {
    outDir: resolve(process.cwd(), "dist/client"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  optimizeDeps: {
    include: ["monaco-editor"],
  },
});
