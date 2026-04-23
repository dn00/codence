import type { LearnspaceResponse, QueueSelection } from "../lib/api";
import { labelsFor } from "../lib/learnspace-labels";
import { SelectionReasonPanel } from "./SelectionReasonPanel";

export interface SessionHeroProps {
  learnspace: LearnspaceResponse | null;
  selection: QueueSelection | null;
  loading?: boolean;
  starting?: boolean;
  skipping?: boolean;
  error?: string | null;
  onStart: () => void;
  onSkip: () => void;
  onExplore: () => void;
}

function difficultyClass(difficulty: string): string {
  if (difficulty === "easy") return "text-success bg-success/10";
  if (difficulty === "hard") return "text-destructive bg-destructive/10";
  return "text-accent-orange bg-accent-orange/10";
}

export function SessionHero({
  learnspace,
  selection,
  loading = false,
  starting = false,
  skipping = false,
  error,
  onStart,
  onSkip,
  onExplore,
}: SessionHeroProps) {
  const labels = labelsFor(learnspace);
  const preSession = learnspace?.config.preSession;
  const showDifficulty = preSession?.showDifficulty ?? true;
  const showSkillName = preSession?.showSkillName ?? true;

  const disabled = loading || starting || skipping;

  return (
    <section className="bg-card border border-border p-6 shadow-brutal w-full">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {loading ? "Loading session..." : "Up Next"}
          </div>
          {loading ? (
            <h1 className="font-sans text-3xl font-black text-foreground mt-1">Preparing...</h1>
          ) : selection ? (
            <>
              <h1 className="font-sans text-3xl font-black text-foreground mt-1 leading-tight tracking-tight">{selection.item.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {showSkillName && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider border border-border bg-background px-2 py-1 rounded-[2px] text-muted-foreground">
                    {selection.skillName}
                  </span>
                )}
                {showDifficulty && (
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-[2px] border border-current ${difficultyClass(selection.item.difficulty)}`}>
                    {selection.item.difficulty}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="font-sans text-3xl font-black text-foreground mt-1">Caught up</h1>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed mt-1">
                Nothing due right now. Explore a new {labels.skillSingular.toLowerCase()}, or come back later.
              </p>
            </>
          )}

          {error && (
            <p role="alert" className="text-destructive bg-card border border-destructive rounded-[2px] p-3 shadow-sm text-sm mt-4">
              {error}
            </p>
          )}

          {selection && (
            <div className="mt-4">
              <SelectionReasonPanel selection={selection} />
            </div>
          )}

        </div>

        <div className="flex flex-col gap-3 w-full lg:w-64 shrink-0">
          {selection ? (
            <button
              type="button"
              onClick={onStart}
              disabled={disabled}
              className="w-full bg-primary text-primary-foreground font-sans text-lg font-black border-2 border-primary rounded-[2px] py-4 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50 tracking-wide"
            >
              {starting ? "Starting..." : "START SESSION"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onExplore}
              disabled={disabled}
              className="w-full bg-primary text-primary-foreground font-sans text-lg font-black border-2 border-primary rounded-[2px] py-4 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50 tracking-wide"
            >
              EXPLORE
            </button>
          )}
          
          <div className="flex flex-col gap-2 mt-2">
            {selection && (
              <button
                type="button"
                onClick={onSkip}
                disabled={disabled}
                className="w-full border border-border bg-card font-sans text-[10px] uppercase tracking-wider font-bold rounded-[2px] py-2.5 shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 text-muted-foreground hover:text-foreground"
              >
                {skipping ? "Loading..." : "Skip item"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
