import { useState, useRef, useEffect } from "react";
import type { ProtocolStep } from "../lib/api.js";

export const COACH_PRESETS = [
  { label: "Give me a hint", message: "Give me a hint for this step." },
  { label: "Am I on the right track?", message: "Am I on the right track? Here's what I have so far." },
  { label: "What am I missing?", message: "What am I missing in my approach?" },
  { label: "Explain this concept", message: "Can you explain the key concept I need for this step?" },
  { label: "Check my work", message: "Can you check what I've written so far and point out any issues?" },
];

export function AskCoachDropdown({ step, onAskCoach }: { step: ProtocolStep, onAskCoach?: (stepId: string, message: string) => void }) {
  const [showPresets, setShowPresets] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPresets) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPresets]);

  if (!onAskCoach || step.editor === "readonly") return null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowPresets(!showPresets); }}
        className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary border border-secondary/20 bg-secondary/5 px-2 py-1 rounded-[2px] hover:bg-secondary/10 hover:border-secondary transition-all cursor-pointer inline-flex items-center gap-1"
      >
        Ask <span className="text-[8px] opacity-60">{showPresets ? "\u25B4" : "\u25BE"}</span>
      </button>
      {showPresets && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-[2px] shadow-brutal z-[100] min-w-[220px] py-1 animate-in fade-in slide-in-from-top-1 duration-100">
          {COACH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={(e) => {
                e.stopPropagation();
                setShowPresets(false);
                onAskCoach(step.id, preset.message);
              }}
              className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-secondary"
            >
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-foreground">{preset.label}</span>
            </button>
          ))}
          <div className="border-t border-border-light my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPresets(false);
              onAskCoach(step.id, ""); // Pass empty string or undefined based on onAskCoach signature
            }}
            className="w-full text-left px-4 py-2 text-[11px] font-sans text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
          >
            Go to Coach Panel
          </button>
        </div>
      )}
    </div>
  );
}
