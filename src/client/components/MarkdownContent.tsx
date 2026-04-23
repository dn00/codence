import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);

function normalizeLanguage(language: string | undefined): string {
  switch ((language ?? "text").toLowerCase()) {
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "py":
      return "python";
    case "shell":
    case "sh":
      return "bash";
    default:
      return language ?? "text";
  }
}

/**
 * Renders markdown with the canonical Codence styling (headings, lists,
 * blockquotes, tables, inline code, and syntax-highlighted code blocks).
 * Use this anywhere problem/scenario markdown is displayed so Practice,
 * Library previews, and future surfaces stay visually identical.
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`font-sans text-sm text-foreground leading-relaxed markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-3" {...props} />,
          h2: ({ node: _node, ...props }) => <h2 className="text-lg font-bold mt-5 mb-2" {...props} />,
          h3: ({ node: _node, ...props }) => <h3 className="text-base font-bold mt-4 mb-2" {...props} />,
          p: ({ node: _node, ...props }) => <p className="leading-relaxed mb-4" {...props} />,
          ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5" {...props} />,
          ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm" {...props} />,
          li: ({ node: _node, ...props }) => <li {...props} />,
          code({ node: _node, inline, className: codeClassName, children, ...props }: {
            node?: unknown;
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
          }) {
            const match = /language-([\w-]+)/.exec(codeClassName || "");
            const language = normalizeLanguage(match?.[1]);
            return !inline ? (
              <div className="border border-border bg-background rounded-[2px] my-5 overflow-hidden shadow-brutal text-left">
                <div className="bg-muted/30 px-3 py-1.5 border-b border-border text-[10px] font-mono tracking-wider uppercase text-muted-foreground flex items-center justify-between">
                  <span>{language}</span>
                </div>
                <div className="bg-[#1E1E1E] p-4 text-[13px] font-mono leading-snug">
                  <SyntaxHighlighter
                    style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                    language={language}
                    PreTag="div"
                    customStyle={{ margin: 0, padding: 0, background: "transparent" }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <code
                className="bg-muted px-1.5 py-0.5 rounded-[2px] font-mono text-[12px] border border-border mx-0.5"
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-4 py-1 italic bg-primary/5 my-4 text-muted-foreground"
              {...props}
            />
          ),
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto mb-4 border border-border rounded-[2px] shadow-brutal text-sm">
              <table className="w-full text-left border-collapse" {...props} />
            </div>
          ),
          th: ({ node: _node, ...props }) => (
            <th
              className="border-b border-border bg-muted/50 p-2.5 font-bold uppercase tracking-wider text-[11px]"
              {...props}
            />
          ),
          td: ({ node: _node, ...props }) => <td className="border-b border-border p-2.5" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
