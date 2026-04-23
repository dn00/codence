import { useState, useRef, useEffect } from "react";
import type { ProtocolStep } from "../lib/api";
import { CodeEditor } from "./CodeEditor";
import { ReadonlyStep } from "./ReadonlyStep";

export interface StepEditorProps {
  step: ProtocolStep;
  value: string;
  onChange: (stepId: string, content: string) => void;
  onBlur: (stepId: string, content: string) => void;
  codeLanguage?: string;
}

export function StepEditor({ step, value, onChange, onBlur, codeLanguage }: StepEditorProps) {
  return (
    <div className="bg-background flex flex-col relative z-10 w-full h-full">

      {/* Step instruction */}
      {step.instruction && (
        <div className="px-5 py-2 border-b border-border-light bg-card shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground text-[13px] leading-relaxed font-sans flex-1 mt-0.5">{step.instruction}</p>
          </div>
        </div>
      )}

      {/* Editors */}
      <div className="flex-1 bg-background relative h-full flex flex-col">
        {step.editor === "code" && (
          <div className="w-full flex-1">
            <CodeEditor
              value={value}
              onChange={(val) => onChange(step.id, val)}
              onBlur={(val) => onBlur(step.id, val)}
              language={codeLanguage}
            />
          </div>
        )}

        {step.editor === "text" && (
          <textarea
            aria-label={step.label}
            value={value}
            onChange={(e) => onChange(step.id, e.target.value)}
            onBlur={() => onBlur(step.id, value)}
            className="w-full h-full flex-1 p-5 bg-background placeholder:text-muted-foreground/40 border-none font-sans text-sm focus:outline-none resize-none"
            placeholder="Document your approach here..."
          />
        )}

        {step.editor === "readonly" && (
          <div className="p-5">
            <ReadonlyStep instruction={step.instruction} />
          </div>
        )}
      </div>
    </div>
  );
}
