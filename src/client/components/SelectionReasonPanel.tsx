import type { QueueSelection } from "../lib/api";

export interface SelectionReasonPanelProps {
  selection: QueueSelection | null;
  compact?: boolean;
}

function selectionSourceLabel(source: NonNullable<QueueSelection["selectionReason"]>["selectionSource"]): string {
  if (source === "direct_item") return "Direct request";
  if (source === "item_queue") return "Item queue";
  return "Skill queue";
}

function candidateTierLabel(tier: string): string {
  return tier.replace(/_/g, " ");
}

function sessionTypeLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function SelectionReasonPanel({
  selection,
  compact = false,
}: SelectionReasonPanelProps) {
  const reason = selection?.selectionReason;
  if (!selection || !reason) return null;

  const metaClassName = compact
    ? "font-mono text-[9px] font-bold uppercase tracking-wider border border-border bg-background/70 px-2 py-1 rounded-[2px] text-muted-foreground"
    : "font-mono text-[10px] font-bold uppercase tracking-wider border border-border bg-background px-2 py-1 rounded-[2px] text-muted-foreground";

  return (
    <section className={`border border-border bg-muted/20 ${compact ? "p-3" : "p-4"} rounded-[2px]`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Why This Problem Now
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={metaClassName}>
              {reason.trackSnapshot?.name ?? "No track"}
            </span>
            <span className={metaClassName}>
              {selectionSourceLabel(reason.selectionSource)}
            </span>
            <span className={metaClassName}>
              {candidateTierLabel(reason.candidateTier)}
            </span>
            {reason.sessionPlanSummary?.sessionType && (
              <span className={metaClassName}>
                {sessionTypeLabel(reason.sessionPlanSummary.sessionType)}
              </span>
            )}
            {reason.generated && (
              <span className={metaClassName}>
                Generated
              </span>
            )}
            {reason.rerankedByLLM && (
              <span className={metaClassName}>
                LLM reranked
              </span>
            )}
          </div>
        </div>

        {reason.reasons.length > 0 && (
          <ul className="list-none pl-0 flex flex-col gap-1.5">
            {reason.reasons.map((entry, index) => (
              <li key={`${entry}-${index}`} className={`${compact ? "text-[12px]" : "text-[13px]"} text-foreground leading-snug`}>
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
