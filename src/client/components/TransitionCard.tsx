import { useNavigate } from "react-router-dom";
import type { CompletionResult } from "../lib/api";

export interface TransitionCardProps {
  completion: CompletionResult;
  onStartNext: () => void;
  startingNext: boolean;
  startNextError: string | null;
}

function outcomeLabel(outcome: string): string {
  if (outcome === "clean") return "Clean Solve";
  if (outcome === "assisted") return "Assisted";
  if (outcome === "failed") return "Needs Work";
  return outcome;
}

function outcomeColor(outcome: string): string {
  if (outcome === "clean") return "text-secondary";
  if (outcome === "failed") return "text-destructive";
  return "text-primary";
}

function stepQualityColor(quality: string): string {
  if (quality === "strong") return "text-secondary";
  if (quality === "solid") return "text-primary";
  if (quality === "partial") return "text-primary";
  return "text-destructive";
}

export function TransitionCard({
  completion,
  onStartNext,
  startingNext,
  startNextError,
}: TransitionCardProps) {
  const navigate = useNavigate();

  const nextDueDate = completion.primarySkill.nextDueDate
    ? new Date(completion.primarySkill.nextDueDate).toISOString().split("T")[0]
    : null;

  const daysUntilReview = nextDueDate
    ? Math.max(0, Math.round((new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const stepEntries = Object.entries(completion.evaluation.per_step_quality);
  const appliedOverrides = completion.appliedOverrides ?? [];
  const displayedOutcome = completion.finalOutcome ?? completion.outcome;

  return (
    <div className="w-full h-full overflow-y-auto bg-background custom-scrollbar">
      <div className="max-w-4xl mx-auto flex flex-col p-4 md:p-12 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full flex flex-col relative pb-32">
          {/* Accent Line Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-border pb-6 pt-4 relative">
            <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-full ${displayedOutcome === 'clean' ? 'bg-[#3FB950]' : displayedOutcome === 'failed' ? 'bg-[#F85149]' : 'bg-primary'}`}></div>
            
            <div className="mt-4">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Execution Analysis</h2>
              <h1 className="font-sans text-3xl font-black text-foreground uppercase tracking-tight">Session Complete</h1>
            </div>
            <div className={`px-4 py-2 border-2 shadow-brutal font-mono text-sm font-bold uppercase tracking-widest ${displayedOutcome === 'clean' ? 'bg-[#3FB950]/10 text-[#3FB950] border-[#3FB950]' : displayedOutcome === 'failed' ? 'bg-[#F85149]/10 text-[#F85149] border-[#F85149]' : 'bg-primary/10 text-primary border-primary'}`}>
              {outcomeLabel(displayedOutcome)}
            </div>
          </div>

          {/* Coaching Summary Block */}
          <div className="bg-muted/30 border border-border p-5 border-l-4 border-l-primary shadow-inner-sm">
            <p className="font-sans text-[15px] leading-relaxed text-foreground/90 font-medium tracking-wide">
              {completion.evaluation.coaching_summary}
            </p>
          </div>

          {(completion.evaluation.evaluation_source === "stub" || completion.evaluation.retry_recovered || appliedOverrides.length > 0) && (
            <div className="flex flex-col gap-3 border border-border bg-muted/20 p-4">
              {completion.evaluation.evaluation_source === "stub" && (
                <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-destructive">
                  AI evaluator unavailable — deterministic fallback used.
                </div>
              )}
              {completion.evaluation.retry_recovered && completion.evaluation.evaluation_source === "llm" && (
                <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  AI evaluator recovered after one retry.
                </div>
              )}
              {appliedOverrides.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Why This Grade</h3>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Model: {outcomeLabel(completion.modelOutcome)} | Recorded: {outcomeLabel(displayedOutcome)}
                  </div>
                  <ul className="list-none pl-0 flex flex-col gap-2">
                    {appliedOverrides.map((override, index) => (
                      <li key={`${override.rule}-${index}`} className="font-sans text-[13px] text-foreground">
                        {override.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metric Board */}
            <div className="flex flex-col border border-border bg-muted/10 p-5 gap-4">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border-light pb-2">Skill Trajectory</h3>
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-bold text-foreground">Confidence Score</span>
                <span className="font-mono text-lg font-black text-primary">{completion.primarySkill.score.toFixed(1)} / 10</span>
              </div>
              {completion.primarySkill.trend && (
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm font-bold text-foreground">Trend</span>
                  <span className={`font-mono text-xs font-bold uppercase tracking-wider px-2 py-1 border ${completion.primarySkill.trend === 'improving' ? 'bg-[#3FB950]/10 text-[#3FB950] border-[#3FB950]/30' : completion.primarySkill.trend === 'declining' ? 'bg-[#F85149]/10 text-[#F85149] border-[#F85149]/30' : 'bg-muted/50 text-muted-foreground border-border'}`}>
                    {completion.primarySkill.trend}
                  </span>
                </div>
              )}
              {daysUntilReview !== null && (
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm font-bold text-foreground">Next Review</span>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">
                    {daysUntilReview === 0 ? "Today" : daysUntilReview === 1 ? "Tomorrow" : `${daysUntilReview} days`}
                  </span>
                </div>
              )}
            </div>

            {/* Strengths & Mistakes */}
            <div className="flex flex-col gap-4">
              {completion.evaluation.strengths.length > 0 && (
                <div className="border border-[#3FB950]/30 bg-[#3FB950]/5 p-4 flex flex-col gap-2 relative shadow-sm">
                  <div className="absolute top-0 right-0 px-2 py-1 bg-[#3FB950] text-[#0D0D0D] font-mono text-[9px] font-black uppercase tracking-widest">+ Strengths</div>
                  <ul className="space-y-1.5 mt-2 list-none pl-0">
                    {completion.evaluation.strengths.map((s, i) => (
                      <li key={i} className="font-sans text-[13px] text-foreground flex items-start gap-2">
                        <span className="text-[#3FB950] mt-0.5 font-bold">✓</span> <span className="leading-snug">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {completion.evaluation.mistakes.length > 0 && (
                <div className="border border-[#F85149]/30 bg-[#F85149]/5 p-4 flex flex-col gap-2 relative shadow-sm">
                  <div className="absolute top-0 right-0 px-2 py-1 bg-[#F85149] text-white font-mono text-[9px] font-black uppercase tracking-widest">- Mistakes</div>
                  <ul className="space-y-1.5 mt-2 list-none pl-0">
                    {completion.evaluation.mistakes.map((m, i) => (
                      <li key={i} className="font-sans text-[13px] text-foreground flex items-start flex-col">
                        <div className="flex items-start gap-2"><span className="text-[#F85149] mt-px font-bold">✗</span> <span className="font-semibold leading-snug">{m.description}</span></div>
                        <span className="text-muted-foreground text-[11px] ml-5 items-center inline-flex before:content-['\2014'] before:mr-1">{m.step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Granular Quality Tabs */}
          {stepEntries.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center">Quality By Protocol Step</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {stepEntries.map(([step, quality]) => (
                  <span key={step} className={`font-mono text-[10px] font-bold tracking-wider px-3 py-1 rounded-[2px] border ${stepQualityColor(quality)} bg-background`}>
                    {step.replace(/_/g, " ")}: {quality}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="border-t-2 border-border pt-10 mt-8">
            {startNextError && (
              <p role="alert" className="text-[#F85149] font-mono text-xs font-bold uppercase tracking-widest text-center mb-4 border border-[#F85149]/30 bg-[#F85149]/10 p-2">{startNextError}</p>
            )}
            <div className="flex justify-between items-center w-full">
              <button
                onClick={() => navigate("/")}
                className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Return Home
              </button>
              <button
                onClick={onStartNext}
                disabled={startingNext}
                className="font-sans text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground px-8 py-3 box-border border-2 border-primary shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {startingNext ? "Loading..." : "Start Next Scenario \u2192"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
