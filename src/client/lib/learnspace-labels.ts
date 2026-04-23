import type { LearnspaceResponse } from "./api";

export interface LearnspaceLabels {
  itemSingular: string;
  itemPlural: string;
  skillSingular: string;
  skillPlural: string;
  masterySingular: string;
}

export function labelsFor(learnspace: Pick<LearnspaceResponse, "config"> | null | undefined): LearnspaceLabels {
  const configLabels = learnspace?.config?.labels;
  return {
    itemSingular: configLabels?.itemSingular ?? "Problem",
    itemPlural: configLabels?.itemPlural ?? "Problems",
    skillSingular: configLabels?.skillSingular ?? "Pattern",
    skillPlural: configLabels?.skillPlural ?? "Patterns",
    masterySingular: configLabels?.masterySingular ?? "Mastery",
  };
}
