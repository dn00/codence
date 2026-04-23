export interface ReadonlyStepProps {
  instruction: string;
}

export function ReadonlyStep({ instruction }: ReadonlyStepProps) {
  return (
    <div
      data-testid="readonly-step"
      className="bg-muted/30 border border-border rounded-[2px] p-4 text-foreground text-sm font-sans whitespace-pre-wrap leading-relaxed shadow-inner-sm"
    >
      {instruction || ""}
    </div>
  );
}
