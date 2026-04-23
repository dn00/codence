import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  archiveTrack,
  deleteItem,
  deleteSkill,
  deleteTrack,
  createItem,
  createTrack,
  getHealth,
  getItems,
  getLearnspace,
  getProgress,
  getSkills,
  getTracks,
  interpretTrack,
  retireItem,
  updateItem,
  updateTrack,
  type InterpretTrackResponse,
  type InterpretTurn,
  type LearnspaceResponse,
  type LibraryItem,
  type LibrarySkill,
  type LibraryTrack,
} from "../lib/api";
import { AppShell } from "../components/AppShell";
import { MarkdownContent } from "../components/MarkdownContent";
import { labelsFor } from "../lib/learnspace-labels";

type Tab = "items" | "skills" | "tracks";

interface ItemFormState {
  id?: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  skillIds: string[];
  prompt: string;
  tags: string;
}

interface TrackInterpretState {
  id?: string;
  goal: string;
  name: string;
  priorTurns: InterpretTurn[];
  result: InterpretTrackResponse | null;
  clarifyAnswer: string;
  interpreting: boolean;
  saving: boolean;
  error: string | null;
  unsupportedFields: string[];
}

const EMPTY_FORM: ItemFormState = {
  title: "",
  difficulty: "easy",
  skillIds: [],
  prompt: "",
  tags: "",
};

const EMPTY_TRACK_STATE: TrackInterpretState = {
  id: undefined,
  goal: "",
  name: "",
  priorTurns: [],
  result: null,
  clarifyAnswer: "",
  interpreting: false,
  saving: false,
  error: null,
  unsupportedFields: [],
};

function difficultyClass(difficulty: string): string {
  if (difficulty === "easy") return "text-success bg-success/10 border-success/40";
  if (difficulty === "hard") return "text-destructive bg-destructive/10 border-destructive/40";
  return "text-accent-orange bg-accent-orange/10 border-accent-orange/40";
}

function tagsFromText(value: string): string[] {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function trackScopeLabel(track: LibraryTrack, skillPlural: string): string {
  const refs = track.spec?.scopePolicy.refs ?? [];
  const categoryRefs = refs.filter((ref) => ref.dimension === "category");
  const skillRefs = refs.filter((ref) => ref.dimension === "skill");

  if (categoryRefs.length > 0) {
    return categoryRefs.length <= 3
      ? categoryRefs.map((ref) => ref.value).join(", ")
      : `${categoryRefs.length} categories`;
  }
  if (skillRefs.length > 0) {
    return `${skillRefs.length} ${skillPlural.toLowerCase()}`;
  }
  return "Entire learnspace";
}

function trackDifficultyLabel(track: LibraryTrack): string {
  const target = track.spec?.difficultyPolicy?.defaultTarget;
  if (!target) return "Adaptive";
  if (target.mode === "fixed") return target.targetBand ? `${target.targetBand} only` : "Fixed";
  if (target.mode === "range") {
    const min = target.minBand ?? "easy";
    const max = target.maxBand ?? "hard";
    return min === max ? `${min} only` : `${min} → ${max}`;
  }
  return "Adaptive";
}

function trackBlendLabel(track: LibraryTrack): string {
  const entries = track.spec?.blendPolicy.entries ?? [];
  if (entries.length === 0) return "Scheduler-led";
  const dominant = [...entries].sort((a, b) => b.weight - a.weight)[0];
  if (!dominant) return "Scheduler-led";
  const kindLabel: Record<string, string> = {
    new_material: "New material",
    due_review: "Review",
    drill: "Drills",
    mock: "Mock",
    recall: "Recall",
  };
  const pct = Math.round(dominant.weight * 100);
  const label = kindLabel[dominant.kind] ?? dominant.kind;
  return pct >= 90 ? `${label} only` : `${label} ${pct}%`;
}

function trackGenerationAllowed(track: LibraryTrack): boolean {
  return track.spec?.generationPolicy.allowGeneration ?? false;
}

function trackInterleaveLabel(track: LibraryTrack): string {
  const blendKinds = new Set((track.spec?.blendPolicy.entries ?? []).map((entry) => entry.kind));
  if (blendKinds.has("new_material") && blendKinds.has("due_review")) return "Yes";
  return "No";
}

export function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [learnspace, setLearnspace] = useState<LearnspaceResponse | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [skills, setSkills] = useState<LibrarySkill[]>([]);
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "retired" | "all">("active");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [trackForm, setTrackForm] = useState<TrackInterpretState>(EMPTY_TRACK_STATE);
  const [saving, setSaving] = useState(false);
  const [completionConfigured, setCompletionConfigured] = useState<boolean | null>(null);
  const [promptTab, setPromptTab] = useState<"edit" | "preview">("edit");
  const [archiveTarget, setArchiveTarget] = useState<LibraryItem | null>(null);
  const [trackArchiveTarget, setTrackArchiveTarget] = useState<LibraryTrack | null>(null);
  const [trackDeleteTarget, setTrackDeleteTarget] = useState<LibraryTrack | null>(null);
  const [deletingTrack, setDeletingTrack] = useState(false);
  const [itemDeleteTarget, setItemDeleteTarget] = useState<LibraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [skillDeleteTarget, setSkillDeleteTarget] = useState<LibrarySkill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archivingTrack, setArchivingTrack] = useState(false);
  const labels = labelsFor(learnspace);
  const skillById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const policyTracksSupported = learnspace?.policyTracks?.supported ?? true;
  const policyTracksReason = learnspace?.policyTracks?.reason ?? "Custom policy tracks are unavailable in this learnspace.";
  const completionBackendReason = "No completion backend is configured. Configure one in Settings before creating or editing policy tracks.";
  const trackAuthoringAvailable = policyTracksSupported && (completionConfigured ?? true);
  const trackAuthoringReason = !policyTracksSupported
    ? policyTracksReason
    : completionConfigured === false
      ? completionBackendReason
      : null;

  function unsupportedFieldsFromError(error: unknown): string[] {
    const fields = (error as { unsupportedFields?: unknown } | null)?.unsupportedFields;
    return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === "string") : [];
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const progress = await getProgress();
      const [detail, itemPayload, skillPayload, trackPayload, healthPayload] = await Promise.all([
        getLearnspace(progress.learnspace.id),
        getItems(),
        getSkills(),
        getTracks(),
        getHealth().catch(() => null),
      ]);
      setLearnspace(detail);
      setItems(itemPayload.items);
      setSkills(skillPayload.skills);
      setTracks(trackPayload.tracks);
      setCompletionConfigured(healthPayload?.diagnostics.completion.configured ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (loading) return;
    const state = location.state as { activeTab?: Tab; openTrackForm?: boolean } | null;
    if (!state) return;
    if (state.activeTab) setActiveTab(state.activeTab);
    if (state.openTrackForm) {
      openTrackForm();
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [loading, location.pathname, location.state, navigate, trackAuthoringAvailable, trackAuthoringReason]);

  function openNewForm() {
    setForm({ ...EMPTY_FORM, skillIds: skills[0] ? [skills[0].id] : [] });
    setPromptTab("edit");
    setFormOpen(true);
  }

  function openEditForm(item: LibraryItem) {
    setForm({
      id: item.id,
      title: item.title,
      difficulty: item.difficulty,
      skillIds: item.skillIds,
      prompt: typeof item.content.prompt === "string" ? item.content.prompt : "",
      tags: item.tags.join(", "),
    });
    setPromptTab("edit");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function openTrackForm() {
    if (!trackAuthoringAvailable) {
      setActiveTab("tracks");
      setError(trackAuthoringReason);
      return;
    }
    setError(null);
    setTrackForm(EMPTY_TRACK_STATE);
    setTrackFormOpen(true);
  }

  function openEditTrackForm(track: LibraryTrack) {
    if (!trackAuthoringAvailable) {
      setActiveTab("tracks");
      setError(trackAuthoringReason);
      return;
    }
    setError(null);
    setTrackForm({
      ...EMPTY_TRACK_STATE,
      id: track.id,
      name: track.name,
      goal: track.goal,
    });
    setTrackFormOpen(true);
  }

  function closeTrackForm() {
    if (!trackForm.interpreting && !trackForm.saving) setTrackFormOpen(false);
  }

  async function runInterpret(params: {
    goal: string;
    name: string;
    priorTurns: InterpretTurn[];
  }) {
    setTrackForm((current) => ({ ...current, interpreting: true, error: null, unsupportedFields: [], result: null }));
    try {
      const result = await interpretTrack({
        goal: params.goal,
        name: params.name || undefined,
        priorTurns: params.priorTurns,
      });
      setTrackForm((current) => ({
        ...current,
        interpreting: false,
        result,
        clarifyAnswer: "",
        unsupportedFields: [],
      }));
    } catch (err) {
      setTrackForm((current) => ({
        ...current,
        interpreting: false,
        error: err instanceof Error ? err.message : "Failed to interpret goal",
        unsupportedFields: unsupportedFieldsFromError(err),
      }));
    }
  }

  async function handleInterpretSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trackForm.goal.trim()) return;
    await runInterpret({
      goal: trackForm.goal,
      name: trackForm.name,
      priorTurns: [],
    });
  }

  async function handleClarifySubmit(event: FormEvent) {
    event.preventDefault();
    if (!trackForm.result || trackForm.result.outcome !== "clarify") return;
    const answer = trackForm.clarifyAnswer.trim();
    if (!answer) return;
    const nextTurns: InterpretTurn[] = [
      ...trackForm.priorTurns,
      { role: "assistant", content: trackForm.result.question },
      { role: "user", content: answer },
    ];
    setTrackForm((current) => ({ ...current, priorTurns: nextTurns }));
    await runInterpret({ goal: trackForm.goal, name: trackForm.name, priorTurns: nextTurns });
  }

  async function handleAcceptPolicy() {
    if (!trackForm.result || (trackForm.result.outcome !== "compiled" && trackForm.result.outcome !== "repaired")) return;
    setTrackForm((current) => ({ ...current, saving: true, error: null, unsupportedFields: [] }));
    const payload = {
      goal: trackForm.goal,
      name: trackForm.name.trim() || undefined,
      displayName: trackForm.result.displayName,
      policy: trackForm.result.policy,
      policyOutcome: trackForm.result.outcome,
      policyExplanation: trackForm.result.explanation,
      compilerVersion: trackForm.result.compilerVersion,
    };
    try {
      if (trackForm.id) {
        await updateTrack(trackForm.id, payload);
      } else {
        await createTrack(payload);
      }
      setTrackFormOpen(false);
      setTrackForm(EMPTY_TRACK_STATE);
      await load();
    } catch (err) {
      setTrackForm((current) => ({
        ...current,
        saving: false,
        error: err instanceof Error ? err.message : `Failed to ${trackForm.id ? "update" : "create"} track`,
        unsupportedFields: unsupportedFieldsFromError(err),
      }));
    }
  }

  function handleBackToGoal() {
    setTrackForm((current) => ({ ...current, result: null, priorTurns: [], clarifyAnswer: "", error: null, unsupportedFields: [] }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        difficulty: form.difficulty,
        skillIds: form.skillIds,
        prompt: form.prompt,
        tags: tagsFromText(form.tags),
      };
      if (form.id) {
        await updateItem(form.id, payload);
      } else {
        await createItem(payload);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${labels.itemSingular.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    setError(null);
    try {
      await retireItem(archiveTarget.id);
      setArchiveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to archive ${labels.itemSingular.toLowerCase()}`);
    } finally {
      setArchiving(false);
    }
  }

  async function confirmTrackArchive() {
    if (!trackArchiveTarget) return;
    setArchivingTrack(true);
    setError(null);
    try {
      await archiveTrack(trackArchiveTarget.id);
      setTrackArchiveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive track");
    } finally {
      setArchivingTrack(false);
    }
  }

  async function confirmTrackDelete() {
    if (!trackDeleteTarget) return;
    setDeletingTrack(true);
    setError(null);
    try {
      await deleteTrack(trackDeleteTarget.id);
      setTrackDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete track");
    } finally {
      setDeletingTrack(false);
    }
  }

  async function confirmItemDelete() {
    if (!itemDeleteTarget) return;
    setDeletingItem(true);
    setError(null);
    try {
      await deleteItem(itemDeleteTarget.id);
      setItemDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeletingItem(false);
    }
  }

  async function confirmSkillDelete() {
    if (!skillDeleteTarget) return;
    setDeletingSkill(true);
    setError(null);
    try {
      await deleteSkill(skillDeleteTarget.id);
      setSkillDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    } finally {
      setDeletingSkill(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (skillFilter !== "all" && !item.skillIds.includes(skillFilter)) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.tags.some((tag) => tag.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, statusFilter, skillFilter, searchText]);

  const statusCounts = useMemo(() => {
    let active = 0;
    let retired = 0;
    for (const item of items) {
      if (item.status === "active") active += 1;
      else if (item.status === "retired") retired += 1;
    }
    return { active, retired, all: items.length };
  }, [items]);

  const hasAnyItems = items.length > 0;
  const filtersActive = statusFilter !== "active" || skillFilter !== "all" || searchText.trim() !== "";

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "items", label: labels.itemPlural },
    { id: "skills", label: labels.skillPlural },
    { id: "tracks", label: "Tracks" },
  ];

  return (
    <AppShell learnspaceName={learnspace?.name}>
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        <div className="mx-auto flex flex-col flex-1 gap-6 w-full max-w-6xl p-6 xl:p-10 overflow-hidden">

          {/* Header — shrinks, does not scroll */}
          <div className="shrink-0">
            <h1 className="font-sans text-2xl font-black text-foreground">Library</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Curate the active learnspace.
            </p>
          </div>

          {error && (
            <p role="alert" className="shrink-0 text-destructive bg-card border border-destructive rounded-[2px] p-4 shadow-brutal">
              {error}
            </p>
          )}

          {/* Tabs — shrinks, does not scroll; active underline overlaps the container border so there is no gap */}
          <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-t-[2px] border-b-2 -mb-px transition-all ${
                    active
                      ? "border-primary text-foreground bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : activeTab === "items" ? (
            <section className="flex flex-col flex-1 min-h-0 gap-4">
              {/* Toolbar — filter chips + Add, then search + pattern */}
              <div className="shrink-0 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { key: "active", label: "Active", count: statusCounts.active },
                      { key: "retired", label: "Archived", count: statusCounts.retired },
                      { key: "all", label: "All", count: statusCounts.all },
                    ] as const).map((chip) => {
                      const active = statusFilter === chip.key;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setStatusFilter(chip.key)}
                          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-[2px] border transition-all ${
                            active
                              ? "bg-foreground text-background border-foreground shadow-brutal"
                              : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          {chip.label} <span className={active ? "opacity-70" : "opacity-50"}>{chip.count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={openNewForm}
                    className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-4 py-2 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all"
                  >
                    + Add {labels.itemSingular}
                  </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={`Search ${labels.itemPlural.toLowerCase()}...`}
                    className="flex-1 bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors"
                  />
                  <div className="relative sm:w-56">
                    <select
                      value={skillFilter}
                      onChange={(event) => setSkillFilter(event.target.value)}
                      className={`w-full font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background border border-border rounded-[2px] px-3 py-2 cursor-pointer ${
                        skillFilter !== "all" ? "pr-8" : ""
                      }`}
                    >
                      <option value="all">All {labels.skillPlural}</option>
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>{skill.name}</option>
                      ))}
                    </select>
                    {skillFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSkillFilter("all")}
                        aria-label={`Clear ${labels.skillSingular.toLowerCase()} filter`}
                        title={`Clear ${labels.skillSingular.toLowerCase()} filter`}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-[2px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors font-mono text-[12px] font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Items table — flex-1, internally scrollable */}
              <div className="flex-1 min-h-0 bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden flex flex-col">
                {!hasAnyItems ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                    <h3 className="font-sans text-lg font-bold text-foreground">No {labels.itemPlural.toLowerCase()} yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Add your first {labels.itemSingular.toLowerCase()} to start building this learnspace.
                    </p>
                    <button
                      type="button"
                      onClick={openNewForm}
                      className="mt-2 bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all"
                    >
                      Add {labels.itemSingular}
                    </button>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground p-8">
                    <span>
                      No {labels.itemPlural.toLowerCase()} match the current filters.
                      {filtersActive && (
                        <>
                          {" "}
                          <button
                            type="button"
                            onClick={() => { setStatusFilter("active"); setSkillFilter("all"); setSearchText(""); }}
                            className="text-primary font-bold underline ml-1"
                          >
                            Clear filters
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border-light">
                    {filteredItems.map((item) => {
                      const isGenerated = item.source === "generated";
                      const isArchived = item.status === "retired";
                      return (
                        <div
                          key={item.id}
                          className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-muted/20 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-sans text-sm font-bold text-foreground">{item.title}</h3>
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] border ${difficultyClass(item.difficulty)}`}>
                                {item.difficulty}
                              </span>
                              {isArchived && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] border text-muted-foreground bg-muted/40 border-border">
                                  archived
                                </span>
                              )}
                              {isGenerated && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] border text-accent-purple/80 bg-accent-purple/5 border-accent-purple/40">
                                  AI variant
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground mt-1.5">
                              {item.skillIds.map((skillId) => skillById.get(skillId)?.name ?? skillId).join(", ") || "—"}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              className="border border-border bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-2 shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all"
                            >
                              Edit
                            </button>
                            {!isArchived && (
                              <button
                                type="button"
                                onClick={() => setArchiveTarget(item)}
                                className="border border-border bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-2 text-muted-foreground hover:text-destructive hover:border-destructive shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all"
                              >
                                Archive
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setItemDeleteTarget(item)}
                              className="border border-destructive/50 bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ) : activeTab === "skills" ? (
            <section className="flex-1 min-h-0 bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden flex flex-col">
              {skills.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
                  No {labels.skillPlural.toLowerCase()} in this learnspace.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border-light">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="px-5 py-4 grid grid-cols-1 md:grid-cols-[1fr_110px_140px_110px_90px] gap-3 items-center hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-sans text-sm font-bold text-foreground truncate">{skill.name}</div>
                        {skill.category && (
                          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{skill.category}</div>
                        )}
                      </div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {skill.score.toFixed(1)} / 10
                      </div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {skill.completedProblems}/{skill.itemCount} {labels.itemPlural.toLowerCase()}
                      </div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {skill.totalAttempts} attempts
                      </div>
                      <button
                        type="button"
                        onClick={() => setSkillDeleteTarget(skill)}
                        className="border border-destructive/50 bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all justify-self-end"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* Tracks tab — structured policy summary, scrollable body */
            <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
              <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-[2px] shadow-brutal p-5">
                <div>
                  <h2 className="font-sans text-base font-bold text-foreground">Create custom tracks</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {trackAuthoringAvailable
                      ? "Turn a goal into a V2 track backed by the V4 policy compiler."
                      : trackAuthoringReason}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openTrackForm}
                  disabled={!trackAuthoringAvailable}
                  title={!trackAuthoringAvailable ? trackAuthoringReason ?? undefined : undefined}
                  className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-4 py-2 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-brutal"
                >
                  + Create Track
                </button>
              </div>
              {tracks.length === 0 ? (
                <div className="bg-card border border-border rounded-[2px] shadow-brutal px-5 py-12 text-center text-sm text-muted-foreground">
                  No tracks configured.
                </div>
              ) : (
                tracks.map((track) => {
                  const completed = track.analytics?.completedAttempts ?? 0;
                  const generated = track.analytics?.generatedAttempts ?? 0;
                  return (
                    <div
                      key={track.id}
                      className="bg-card border border-border rounded-[2px] shadow-brutal p-5 flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-sans text-lg font-bold text-foreground">{track.name}</h3>
                            {track.isSystem && (
                              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border-light rounded-[2px] px-1.5 py-[1px]">
                                System
                              </span>
                            )}
                            {!track.isSystem && (
                              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border-light rounded-[2px] px-1.5 py-[1px]">
                                {track.status === "archived" ? "Archived" : "Custom"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 max-w-2xl">{track.goal}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right border border-border bg-background px-2 py-1 rounded-[2px] shadow-sm">
                            {completed} {completed === 1 ? "attempt" : "attempts"} · {generated} generated
                          </div>
                          {!track.isSystem && track.status !== "archived" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditTrackForm(track)}
                                disabled={!trackAuthoringAvailable}
                                title={!trackAuthoringAvailable ? trackAuthoringReason ?? undefined : undefined}
                                className="border border-border bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-1.5 shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setTrackArchiveTarget(track)}
                                className="border border-border bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-1.5 text-muted-foreground hover:text-destructive hover:border-destructive shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all"
                              >
                                Archive
                              </button>
                              <button
                                type="button"
                                onClick={() => setTrackDeleteTarget(track)}
                                className="border border-destructive/50 bg-card font-sans text-xs font-bold rounded-[2px] px-3 py-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-3 border-t border-border-light">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scope</span>
                          <span className="font-sans text-xs font-semibold text-foreground">{trackScopeLabel(track, labels.skillPlural)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</span>
                          <span className="font-sans text-xs font-semibold text-foreground">{trackDifficultyLabel(track)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blend</span>
                          <span className="font-sans text-xs font-semibold text-foreground">{trackBlendLabel(track)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generated {labels.itemPlural.toLowerCase()}</span>
                          <span className={`font-sans text-xs font-semibold ${trackGenerationAllowed(track) ? "text-success" : "text-muted-foreground"}`}>
                            {trackGenerationAllowed(track) ? "Allowed" : "Not allowed"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interleave</span>
                          <span className="font-sans text-xs font-semibold text-foreground">{trackInterleaveLabel(track)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}
        </div>
      </div>

      {/* Archive confirm modal */}
      {archiveTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => { if (!archiving) setArchiveTarget(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-confirm-title"
            className="bg-card border-2 border-border shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-border">
              <h2 id="archive-confirm-title" className="font-sans text-lg font-bold text-foreground">
                Archive {labels.itemSingular.toLowerCase()}?
              </h2>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="font-sans text-sm text-foreground font-medium">
                "{archiveTarget.title}"
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                It will be hidden from your practice queue, but your attempt history is preserved. You can unarchive it later from the Archived filter.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="border border-border bg-card font-sans text-sm font-bold rounded-[2px] px-5 py-2 hover:bg-muted/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void confirmArchive(); }}
                disabled={archiving}
                className="bg-destructive text-destructive-foreground font-sans text-sm font-bold border border-destructive rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
              >
                {archiving ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track archive confirm modal */}
      {trackArchiveTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => { if (!archivingTrack) setTrackArchiveTarget(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-archive-confirm-title"
            className="bg-card border-2 border-border shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-border">
              <h2 id="track-archive-confirm-title" className="font-sans text-lg font-bold text-foreground">
                Archive track?
              </h2>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="font-sans text-sm text-foreground font-medium">
                "{trackArchiveTarget.name}"
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                It will remain in history but will stop being selectable as an active track. If it is active now, the learnspace falls back to Recommended.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setTrackArchiveTarget(null)}
                disabled={archivingTrack}
                className="border border-border bg-card font-sans text-sm font-bold rounded-[2px] px-5 py-2 hover:bg-muted/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void confirmTrackArchive(); }}
                disabled={archivingTrack}
                className="bg-destructive text-destructive-foreground font-sans text-sm font-bold border border-destructive rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
              >
                {archivingTrack ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track delete confirm modal */}
      {trackDeleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => { if (!deletingTrack) setTrackDeleteTarget(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-delete-confirm-title"
            className="bg-card border-2 border-destructive shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-border">
              <h2 id="track-delete-confirm-title" className="font-sans text-lg font-bold text-destructive">
                Delete track permanently?
              </h2>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="font-sans text-sm text-foreground font-medium">
                "{trackDeleteTarget.name}"
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The track row is removed from your catalog. Past sessions keep a frozen snapshot of this track so practice history still renders — but this track cannot be reactivated. If you only want to hide it, use Archive instead.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setTrackDeleteTarget(null)}
                disabled={deletingTrack}
                className="border border-border bg-card font-sans text-sm font-bold rounded-[2px] px-5 py-2 hover:bg-muted/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void confirmTrackDelete(); }}
                disabled={deletingTrack}
                className="bg-destructive text-destructive-foreground font-sans text-sm font-bold border border-destructive rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
              >
                {deletingTrack ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item delete confirm modal */}
      {itemDeleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => { if (!deletingItem) setItemDeleteTarget(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-delete-confirm-title"
            className="bg-card border-2 border-destructive shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-border">
              <h2 id="item-delete-confirm-title" className="font-sans text-lg font-bold text-destructive">
                Delete {labels.itemSingular.toLowerCase()} permanently?
              </h2>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="font-sans text-sm text-foreground font-medium">
                "{itemDeleteTarget.title}"
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The {labels.itemSingular.toLowerCase()} is removed from the catalog. Past attempts keep a frozen snapshot so practice history still renders. Use Archive to hide without deleting.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setItemDeleteTarget(null)}
                disabled={deletingItem}
                className="border border-border bg-card font-sans text-sm font-bold rounded-[2px] px-5 py-2 hover:bg-muted/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void confirmItemDelete(); }}
                disabled={deletingItem}
                className="bg-destructive text-destructive-foreground font-sans text-sm font-bold border border-destructive rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
              >
                {deletingItem ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill delete confirm modal */}
      {skillDeleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => { if (!deletingSkill) setSkillDeleteTarget(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-delete-confirm-title"
            className="bg-card border-2 border-destructive shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-border">
              <h2 id="skill-delete-confirm-title" className="font-sans text-lg font-bold text-destructive">
                Delete {labels.skillSingular.toLowerCase()} permanently?
              </h2>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="font-sans text-sm text-foreground font-medium">
                "{skillDeleteTarget.name}"
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cascades: items tagged only with this {labels.skillSingular.toLowerCase()} are deleted; multi-tag items keep the rest of their tags; confidence + queue rows cleared. Past attempts keep frozen skill snapshots. Built-in seeds may re-add this {labels.skillSingular.toLowerCase()} on next server restart.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setSkillDeleteTarget(null)}
                disabled={deletingSkill}
                className="border border-border bg-card font-sans text-sm font-bold rounded-[2px] px-5 py-2 hover:bg-muted/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void confirmSkillDelete(); }}
                disabled={deletingSkill}
                className="bg-destructive text-destructive-foreground font-sans text-sm font-bold border border-destructive rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
              >
                {deletingSkill ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track interpret modal */}
      {trackFormOpen && (
        <TrackInterpretModal
          state={trackForm}
          onGoalChange={(goal) => setTrackForm((current) => ({ ...current, goal }))}
          onNameChange={(name) => setTrackForm((current) => ({ ...current, name }))}
          onClarifyAnswerChange={(clarifyAnswer) => setTrackForm((current) => ({ ...current, clarifyAnswer }))}
          onInterpret={handleInterpretSubmit}
          onClarify={handleClarifySubmit}
          onAccept={handleAcceptPolicy}
          onBack={handleBackToGoal}
          onClose={closeTrackForm}
        />
      )}

      {/* Add/Edit modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={closeForm}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-form-title"
            onSubmit={handleSave}
            className="bg-card border-2 border-border shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[92vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header — pinned */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 id="item-form-title" className="font-sans text-lg font-bold text-foreground">
                {form.id ? `Edit ${labels.itemSingular}` : `Add ${labels.itemSingular}`}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="font-mono text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-[2px] px-2 py-1 hover:bg-muted/50 transition-all"
              >
                Close
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-5">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="mt-2 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</span>
                  <select
                    value={form.difficulty}
                    onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as ItemFormState["difficulty"] }))}
                    className="mt-2 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{labels.skillSingular}</span>
                  <select
                    value={form.skillIds[0] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, skillIds: [event.target.value].filter(Boolean) }))}
                    className="mt-2 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    required
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>{skill.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</span>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  className="mt-2 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors"
                  placeholder="arrays, two-pointers"
                />
              </label>

              {/* Statement — tabbed markdown editor + preview, fixed height so the box doesn't jump when toggling tabs */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{labels.itemSingular} statement</span>
                  <div className="inline-flex border border-border rounded-[2px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPromptTab("edit")}
                      className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 transition-all ${
                        promptTab === "edit"
                          ? "bg-foreground text-background"
                          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptTab("preview")}
                      className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 border-l border-border transition-all ${
                        promptTab === "preview"
                          ? "bg-foreground text-background"
                          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {promptTab === "edit" ? (
                  <textarea
                    value={form.prompt}
                    onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                    className="h-[52vh] w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder={`Describe the ${labels.itemSingular.toLowerCase()} in markdown. Supports headings, lists, code blocks, tables...`}
                    required
                  />
                ) : (
                  <div className="h-[52vh] w-full bg-background border border-border rounded-[2px] px-5 py-4 overflow-y-auto custom-scrollbar">
                    {form.prompt.trim() ? (
                      <MarkdownContent content={form.prompt} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer — pinned, always visible */}
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={closeForm}
                className="border border-border bg-card font-sans text-sm font-bold rounded-[2px] px-5 py-2 hover:bg-muted/50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

interface TrackInterpretModalProps {
  state: TrackInterpretState;
  onGoalChange: (goal: string) => void;
  onNameChange: (name: string) => void;
  onClarifyAnswerChange: (answer: string) => void;
  onInterpret: (event: FormEvent) => void;
  onClarify: (event: FormEvent) => void;
  onAccept: () => void;
  onBack: () => void;
  onClose: () => void;
}

function TrackInterpretModal(props: TrackInterpretModalProps) {
  const { state, onGoalChange, onNameChange, onClarifyAnswerChange, onInterpret, onClarify, onAccept, onBack, onClose } = props;
  const locked = state.interpreting || state.saving;
  const result = state.result;
  const hasResult = result !== null;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-interpret-title"
        className="bg-card border-2 border-border shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 id="track-interpret-title" className="font-sans text-lg font-bold text-foreground">
            {state.id ? "Edit Track" : "Create Track"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="font-mono text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-[2px] px-2 py-1 hover:bg-muted/50 transition-all disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasResult && (
            <form onSubmit={onInterpret} className="px-6 py-5 flex flex-col gap-5">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Goal</span>
                <textarea
                  value={state.goal}
                  onChange={(event) => onGoalChange(event.target.value)}
                  className="mt-2 h-32 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="Example: Rebuild graph traversal confidence before onsite interviews."
                  required
                  disabled={locked}
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name (optional)</span>
                <input
                  value={state.name}
                  onChange={(event) => onNameChange(event.target.value)}
                  className="mt-2 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors"
                  placeholder="Leave blank to derive from goal"
                  disabled={locked}
                />
              </label>
              {state.error && (
                <p role="alert" className="text-destructive text-sm border border-destructive bg-destructive/10 rounded-[2px] p-3">
                  {state.error}
                </p>
              )}
              {state.unsupportedFields.length > 0 && (
                <div className="text-destructive text-sm border border-destructive bg-destructive/10 rounded-[2px] p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider mb-2">Unsupported fields</p>
                  <ul className="font-mono text-xs list-disc pl-4 space-y-1">
                    {state.unsupportedFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={locked || !state.goal.trim()}
                  className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all disabled:opacity-50"
                >
                  {state.interpreting ? "Interpreting..." : "Interpret"}
                </button>
              </div>
            </form>
          )}

          {hasResult && result.outcome === "clarify" && (
            <form onSubmit={onClarify} className="px-6 py-5 flex flex-col gap-4">
              <div className="border border-accent-orange/60 bg-accent-orange/5 rounded-[2px] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-orange mb-2">Clarify</p>
                <p className="font-sans text-sm text-foreground">{result.question}</p>
              </div>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your answer</span>
                <input
                  value={state.clarifyAnswer}
                  onChange={(event) => onClarifyAnswerChange(event.target.value)}
                  className="mt-2 w-full bg-background border border-border rounded-[2px] px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                  disabled={locked}
                  required
                />
              </label>
              {state.error && (
                <p role="alert" className="text-destructive text-sm border border-destructive bg-destructive/10 rounded-[2px] p-3">{state.error}</p>
              )}
              {state.unsupportedFields.length > 0 && (
                <div className="text-destructive text-sm border border-destructive bg-destructive/10 rounded-[2px] p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider mb-2">Unsupported fields</p>
                  <ul className="font-mono text-xs list-disc pl-4 space-y-1">
                    {state.unsupportedFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={onBack} disabled={locked} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                  ← Edit goal
                </button>
                <button
                  type="submit"
                  disabled={locked || !state.clarifyAnswer.trim()}
                  className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all disabled:opacity-50"
                >
                  {state.interpreting ? "Refining..." : "Refine"}
                </button>
              </div>
            </form>
          )}

          {hasResult && result.outcome === "reject" && (
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="border border-destructive/60 bg-destructive/5 rounded-[2px] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-destructive mb-2">Unsupported</p>
                <p className="font-sans text-sm text-foreground">{result.reason}</p>
                {result.unsupportedFields && result.unsupportedFields.length > 0 && (
                  <ul className="mt-3 font-mono text-xs text-destructive list-disc pl-4 space-y-1">
                    {result.unsupportedFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  disabled={locked}
                  className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-5 py-2.5 shadow-brutal transition-all disabled:opacity-50"
                >
                  ← Edit goal
                </button>
              </div>
            </div>
          )}

          {hasResult && (result.outcome === "compiled" || result.outcome === "repaired") && (
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className={`border rounded-[2px] p-4 ${result.outcome === "repaired" ? "border-accent-orange/60 bg-accent-orange/5" : "border-success/60 bg-success/5"}`}>
                <p className={`font-mono text-[10px] font-bold uppercase tracking-wider mb-2 ${result.outcome === "repaired" ? "text-accent-orange" : "text-success"}`}>
                  {result.outcome === "repaired" ? "Repaired" : "Compiled"}
                </p>
                <p className="font-sans text-sm text-foreground">
                  Ready to persist. Review the preview, then accept.
                </p>
                {result.explanation.repairs && result.explanation.repairs.length > 0 && (
                  <div className="mt-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Repairs</p>
                    <ul className="font-sans text-xs text-foreground space-y-1">
                      {result.explanation.repairs.map((repair, index) => (
                        <li key={index}>• <span className="font-mono">{repair.field}</span>: {repair.change} — {repair.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.explanation.approximations && result.explanation.approximations.length > 0 && (
                  <div className="mt-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Approximations</p>
                    <ul className="font-sans text-xs text-muted-foreground space-y-1">
                      {result.explanation.approximations.map((approx, index) => (
                        <li key={index}>• <span className="font-mono">{approx.field}</span> → <span className="font-mono">{approx.representedAs}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <PolicyPreview result={result} />
              {state.error && (
                <p role="alert" className="text-destructive text-sm border border-destructive bg-destructive/10 rounded-[2px] p-3">{state.error}</p>
              )}
              {state.unsupportedFields.length > 0 && (
                <div className="text-destructive text-sm border border-destructive bg-destructive/10 rounded-[2px] p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider mb-2">Unsupported fields</p>
                  <ul className="font-mono text-xs list-disc pl-4 space-y-1">
                    {state.unsupportedFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={onBack} disabled={locked} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                  ← Edit goal
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={locked}
                  className="bg-primary text-primary-foreground font-sans text-sm font-bold border border-primary rounded-[2px] px-5 py-2.5 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all disabled:opacity-50"
                >
                  {state.saving ? "Saving..." : state.id ? "Accept & update" : "Accept & create"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PolicyPreviewProps {
  result: Extract<InterpretTrackResponse, { outcome: "compiled" | "repaired" }>;
}

function PolicyPreview({ result }: PolicyPreviewProps) {
  const spec = result.preview.spec;
  if (!spec) return null;

  const scopeRefs = spec.scopePolicy.refs.map((ref) => `${ref.dimension}:${ref.value}`);
  const blend = spec.blendPolicy.entries.map((entry) => `${entry.kind} (${Math.round(entry.weight * 100)}%)`).join(", ");
  const difficulty = spec.difficultyPolicy.defaultTarget;

  return (
    <div className="border border-border rounded-[2px] p-4 bg-background">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Preview</p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-mono text-xs text-muted-foreground">archetype</dt>
        <dd className="font-sans text-foreground">{spec.archetype}</dd>
        <dt className="font-mono text-xs text-muted-foreground">scope</dt>
        <dd className="font-sans text-foreground">{scopeRefs.length === 0 ? "learnspace" : scopeRefs.join(", ")}</dd>
        <dt className="font-mono text-xs text-muted-foreground">difficulty</dt>
        <dd className="font-sans text-foreground">
          {difficulty.mode}
          {difficulty.targetBand ? ` → ${difficulty.targetBand}` : ""}
          {difficulty.minBand || difficulty.maxBand ? ` (${difficulty.minBand ?? "?"}–${difficulty.maxBand ?? "?"})` : ""}
        </dd>
        <dt className="font-mono text-xs text-muted-foreground">blend</dt>
        <dd className="font-sans text-foreground">{blend || "default"}</dd>
        <dt className="font-mono text-xs text-muted-foreground">generation</dt>
        <dd className="font-sans text-foreground">{spec.generationPolicy.allowGeneration ? "allowed" : "seed only"}</dd>
      </dl>
    </div>
  );
}
