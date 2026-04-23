// Mock for @monaco-editor/react — renders a textarea for testing
import { vi } from "vitest";

function MockEditor({ value, onChange, language }: {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  height?: string;
  options?: Record<string, unknown>;
  loading?: React.ReactNode;
  onMount?: (editor: unknown, monaco: unknown) => void;
}) {
  return (
    <textarea
      data-testid="monaco-editor-mock"
      data-language={language}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export default MockEditor;
