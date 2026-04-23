export interface SkillBarProps {
  name: string;
  score: number;
}

export function SkillBar({ name, score }: SkillBarProps) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const colorClass = score >= 5 ? "bg-secondary" : "bg-primary";

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-3 w-24 rounded-[2px] bg-muted border border-border overflow-hidden"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${name} confidence`}
      >
        <div
          data-fill
          className={`absolute inset-y-0 left-0 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-sans text-sm">{name}</span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{score}</span>
    </div>
  );
}
