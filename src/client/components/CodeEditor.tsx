import { useState } from "react";
import Editor from "@monaco-editor/react";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  language?: string;
}

export function CodeEditor({ value, onChange, onBlur, language = "python" }: CodeEditorProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return (
      <div>
        <p style={{ color: "#6B7280", fontSize: "0.8rem" }}>Code editor unavailable — using plain text</p>
        <textarea
          data-testid="monaco-fallback-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onBlur(value)}
          rows={16}
          style={{
            width: "100%",
            fontFamily: "monospace",
            padding: "0.5rem",
            boxSizing: "border-box",
          }}
        />
      </div>
    );
  }

  return (
    <div data-testid="code-editor-container">
      <Editor
        height="400px"
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        onMount={(_editor, _monaco) => {
          // Editor mounted successfully
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
        }}
        loading={<div style={{ padding: "1rem", color: "#6B7280" }}>Loading editor...</div>}
      />
    </div>
  );
}
