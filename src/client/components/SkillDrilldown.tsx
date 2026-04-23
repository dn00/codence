import { useState } from "react";
import type { SkillDrilldown as SkillDrilldownData } from "../lib/api";
import { resetSkillStats } from "../lib/api";

export interface SkillDrilldownProps {
  data: SkillDrilldownData;
  itemPluralLabel?: string;
  onPractice?: (skillId: string) => void;
  onStartItem?: (itemId: string) => void;
  onReset?: () => void;
}

function diffBadge(d: string): string {
  if (d === "easy") return "text-success bg-success/10";
  if (d === "hard") return "text-destructive bg-destructive/10";
  return "text-accent-orange bg-accent-orange/10";
}

export function SkillDrilldown({
  data,
  itemPluralLabel = "Problems",
  onPractice,
  onStartItem,
  onReset,
}: SkillDrilldownProps) {
  const items = data.items ?? data.itemsPracticed.map((p) => ({ ...p, difficulty: "medium" }));
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Mastery — full width on top */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-end">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Mastery Level</span>
          <span className="font-mono text-xs font-bold text-foreground">
            {data.score.toFixed(1)}
            <span className="text-muted-foreground font-normal"> / 10</span>
          </span>
        </div>
        <div className="h-2 w-full bg-muted/50 border border-border rounded-[2px] overflow-hidden shadow-inner">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, (data.score / 10) * 100))}%` }}
          />
        </div>
      </div>

      {/* Performance + Autonomy — side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance stack */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-end">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Performance</span>
            <span className="font-mono text-[10px] text-muted-foreground">last {data.totalAttempts}</span>
          </div>
          <div className="h-3 w-full bg-muted/50 border border-border rounded-[2px] overflow-hidden shadow-inner flex">
            {data.cleanSolves > 0 && (
              <div
                className="h-full bg-success"
                style={{ width: `${(data.cleanSolves / data.totalAttempts) * 100}%` }}
                title={`${data.cleanSolves} clean`}
              />
            )}
            {data.assistedSolves > 0 && (
              <div
                className="h-full bg-accent-orange"
                style={{ width: `${(data.assistedSolves / data.totalAttempts) * 100}%` }}
                title={`${data.assistedSolves} assisted`}
              />
            )}
            {data.failedAttempts > 0 && (
              <div
                className="h-full bg-destructive"
                style={{ width: `${(data.failedAttempts / data.totalAttempts) * 100}%` }}
                title={`${data.failedAttempts} failed`}
              />
            )}
          </div>
          <div className="flex justify-between text-[9px] font-mono font-semibold uppercase pt-0.5">
            <span className="text-success">{data.cleanSolves} clean</span>
            <span className="text-accent-orange">{data.assistedSolves} assisted</span>
            <span className="text-destructive">{data.failedAttempts} failed</span>
          </div>
        </div>

        {/* Autonomy — renders in the right column when present */}
        {data.helpDependence && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Autonomy</span>
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                  data.helpDependence.label === "independent"
                    ? "text-success"
                    : data.helpDependence.label === "guided"
                      ? "text-accent-orange"
                      : "text-destructive"
                }`}
              >
                {data.helpDependence.label.replace("-", " ")}
              </span>
            </div>
            <div className="relative h-3 w-full bg-gradient-to-r from-success via-accent-orange to-destructive border border-border rounded-[2px] shadow-inner">
              <div
                className="absolute top-[-3px] bottom-[-3px] w-[5px] bg-foreground border border-background shadow-sm pointer-events-none rounded-[1px]"
                style={{
                  left: `clamp(0%, ${data.helpDependence.avgHelpLevel * 100}%, 100%)`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase pt-0.5">
              <span>Independent</span>
              <span>Dependent</span>
            </div>
          </div>
        )}
      </div>

      {/* Behavior summary — subtle blockquote, no card */}
      {data.behaviorSummary && (
        <p className="text-sm text-foreground italic border-l-2 border-primary pl-4 py-1 leading-relaxed">
          {data.behaviorSummary}
        </p>
      )}

      {/* Items list — flat divide, no nested card */}
      {items.length > 0 && (
        <div>
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {itemPluralLabel}
          </h4>
          <div className="border-t border-border-light divide-y divide-border-light">
            {items.map((item) => (
              <div
                key={item.itemId}
                className="grid items-center py-2.5 gap-3 hover:bg-muted/30 transition-colors"
                style={{ gridTemplateColumns: "14px 1fr 54px 36px 56px" }}
              >
                <span
                  className={`text-[11px] font-bold ${
                    item.solveCount === 0
                      ? "text-muted-foreground/40"
                      : item.lastOutcome === "failed"
                        ? "text-destructive"
                        : item.lastOutcome === "clean"
                          ? "text-success"
                          : "text-accent-orange"
                  }`}
                >
                  {item.solveCount === 0 ? "\u25CB" : item.lastOutcome === "failed" ? "\u2717" : "\u2713"}
                </span>
                <span className="font-sans text-xs font-bold text-foreground truncate">{item.title}</span>
                <span
                  className={`text-[9px] font-mono font-bold uppercase px-1.5 py-[1px] rounded-[2px] text-center border border-current ${diffBadge(item.difficulty)}`}
                >
                  {item.difficulty}
                </span>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground text-right">
                  {item.solveCount > 0 ? `${item.solveCount}x` : ""}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartItem?.(item.itemId);
                  }}
                  className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary hover:text-foreground transition-colors text-right"
                >
                  {item.solveCount > 0 ? "REDO" : "START"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common mistakes — flat */}
      {data.commonMistakes.length > 0 && (
        <div>
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Common mistakes
          </h4>
          <ul className="flex flex-col gap-1.5">
            {data.commonMistakes.map((mistake) => (
              <li key={mistake.type} className="flex items-start gap-2.5 text-xs text-foreground">
                <span
                  className={`mt-[2px] shrink-0 font-mono font-bold ${
                    mistake.severity === "critical"
                      ? "text-destructive"
                      : mistake.severity === "moderate"
                        ? "text-accent-orange"
                        : "text-muted-foreground"
                  }`}
                >
                  {mistake.severity === "critical" ? "!!" : mistake.severity === "moderate" ? "!" : "\u2022"}
                </span>
                <span className="flex-1 font-medium leading-snug">{mistake.type.replace(/_/g, " ")}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">{mistake.count}x</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coach notes — flat, with inline quote mark decoration */}
      {data.coachingInsights.length > 0 && (
        <div>
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Coach notes
          </h4>
          <ul className="flex flex-col gap-2">
            {data.coachingInsights.map((insight, i) => (
              <li
                key={i}
                className="text-xs text-foreground italic border-l border-border-light pl-3 leading-snug relative"
              >
                <span className="absolute -left-[5px] top-0 text-[16px] leading-none text-muted-foreground/50 font-serif">&ldquo;</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer actions: reset on left, practice on right */}
      <div className="flex items-center justify-between border-t border-border-light pt-4 gap-3">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset progress
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-destructive uppercase tracking-wider">Erase all stats?</span>
            <button
              onClick={async () => {
                setResetting(true);
                try {
                  await resetSkillStats(data.skillId);
                  onReset?.();
                } finally {
                  setResetting(false);
                  setConfirmReset(false);
                }
              }}
              disabled={resetting}
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-destructive border border-destructive/40 bg-destructive/10 px-2 py-1 rounded-[2px] hover:bg-destructive/20 transition-all disabled:opacity-50"
            >
              {resetting ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {onPractice && (
          <button
            onClick={() => onPractice(data.skillId)}
            className="font-sans text-xs font-bold tracking-wide bg-primary text-primary-foreground px-4 py-2 rounded-[2px] border border-primary shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all uppercase inline-flex items-center gap-2"
          >
            Practice {data.name} <span className="font-mono opacity-60">&rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
}
