import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLearnspace,
  getProgress,
  getSkillDrilldown,
  postQueueNext,
  type LearnspaceResponse,
  type ProgressSummary,
  type SkillDrilldown as SkillDrilldownData,
} from "../lib/api";
import { AppShell } from "../components/AppShell";
import { SkillDrilldown } from "../components/SkillDrilldown";
import { labelsFor } from "../lib/learnspace-labels";

function relativeDueDate(iso: string | null, totalAttempts: number): string {
  if (!iso) return totalAttempts === 0 ? "" : "";
  const due = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
  // No overdue labels — scheduler drives order, user drives pace.
  if (diffDays <= 0) return "ready";
  if (diffDays === 1) return "tomorrow";
  return `${diffDays}d`;
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

export function Progress() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [learnspace, setLearnspace] = useState<LearnspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<SkillDrilldownData | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const expandedSkillIdRef = useRef(expandedSkillId);
  expandedSkillIdRef.current = expandedSkillId;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const nextProgress = await getProgress();
        if (cancelled) return;
        setProgress(nextProgress);
        const detail = await getLearnspace(nextProgress.learnspace.id);
        if (!cancelled) setLearnspace(detail);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load progress");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSkillClick(skillId: string) {
    if (expandedSkillId === skillId) {
      setExpandedSkillId(null);
      setDrilldownData(null);
      setDrilldownError(null);
      return;
    }
    setExpandedSkillId(skillId);
    setDrilldownData(null);
    setDrilldownError(null);
    setDrilldownLoading(true);
    try {
      const data = await getSkillDrilldown(skillId);
      if (expandedSkillIdRef.current === skillId) setDrilldownData(data);
    } catch (err) {
      if (expandedSkillIdRef.current === skillId) setDrilldownError(err instanceof Error ? err.message : "Failed to load drill-down");
    } finally {
      if (expandedSkillIdRef.current === skillId) setDrilldownLoading(false);
    }
  }

  async function startItem(itemId: string) {
    const result = await postQueueNext(undefined, undefined, itemId);
    navigate(`/practice/${result.session.sessionId}`, {
      state: { session: result.session, selection: result.selection, timerMinutes: null },
    });
  }

  async function startSkill(skillId: string) {
    const result = await postQueueNext(undefined, skillId);
    navigate(`/practice/${result.session.sessionId}`, {
      state: { session: result.session, selection: result.selection, timerMinutes: null },
    });
  }

  const labels = labelsFor(learnspace);
  const skills = progress?.skills ?? [];

  type FilterMode = "all" | "ready" | "active" | "needs_focus" | "unpracticed";
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const counts = useMemo(() => {
    const now = Date.now();
    const active = skills.filter((s) => s.totalAttempts > 0).length;
    const ready = skills.filter((s) => s.dueDate !== null && new Date(s.dueDate).getTime() <= now).length;
    const needsFocus = skills.filter((s) => s.totalAttempts > 0 && s.score < 4.0).length;
    const unpracticed = skills.filter((s) => s.totalAttempts === 0).length;
    return { all: skills.length, active, ready, needsFocus, unpracticed };
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const now = Date.now();
    switch (filterMode) {
      case "ready":
        return skills.filter((s) => s.dueDate !== null && new Date(s.dueDate).getTime() <= now);
      case "active":
        return skills.filter((s) => s.totalAttempts > 0);
      case "needs_focus":
        return skills.filter((s) => s.totalAttempts > 0 && s.score < 4.0);
      case "unpracticed":
        return skills.filter((s) => s.totalAttempts === 0);
      case "all":
      default:
        return skills;
    }
  }, [skills, filterMode]);

  const metrics = useMemo(() => {
    if (!progress) return { active: 0, masteryAvg: 0, sessions30d: 0, needsFocus: 0 };
    const activeSkills = skills.filter((s) => s.totalAttempts > 0);
    const active = activeSkills.length;
    const sumScore = activeSkills.reduce((acc, curr) => acc + curr.score, 0);
    const masteryAvg = active > 0 ? sumScore / activeSkills.length : 0;
    const needsFocus = activeSkills.filter((s) => s.score < 4.0).length;
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const sessions30d = (progress.recentAttempts ?? []).filter((a) => new Date(a.startedAt).getTime() > thirtyDaysAgo).length;
    return { active, masteryAvg, sessions30d, needsFocus };
  }, [progress, skills]);

  const activityStrip = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 });
    }
    const indexByDate = new Map(days.map((d, i) => [d.date, i]));
    for (const attempt of progress?.recentAttempts ?? []) {
      const key = attempt.startedAt.slice(0, 10);
      const idx = indexByDate.get(key);
      if (idx !== undefined) days[idx].count += 1;
    }
    const maxCount = days.reduce((m, d) => Math.max(m, d.count), 0);
    return { days, maxCount };
  }, [progress?.recentAttempts]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 mx-auto w-full max-w-5xl">
          <p role="alert" className="text-destructive bg-card border border-destructive rounded-[2px] p-4 shadow-brutal max-w-md">{error}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell learnspaceName={progress?.learnspace.name}>
      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar bg-background">
        <div className="mx-auto flex flex-col gap-10 w-full max-w-6xl p-6 xl:p-10 pb-20">
          
          {/* [1] OVERVIEW STRIP — Active and Needs Focus are clickable filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <button
               type="button"
               onClick={() => setFilterMode(filterMode === "active" ? "all" : "active")}
               className={`bg-card border rounded-[2px] p-5 shadow-brutal flex flex-col text-left hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all ${
                 filterMode === "active" ? "border-primary bg-primary/5" : "border-border"
               }`}
             >
               <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Active {labels.skillPlural}</span>
               <span className="font-sans text-3xl font-black text-foreground">{metrics.active}</span>
               <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-1">Click to filter</span>
             </button>
             <div className="bg-card border border-border rounded-[2px] p-5 shadow-brutal flex flex-col">
               <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Mastery Avg</span>
               <span className="font-sans text-3xl font-black text-foreground">{metrics.masteryAvg.toFixed(1)}</span>
               <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-1">of 10</span>
             </div>
             <div className="bg-card border border-border rounded-[2px] p-5 shadow-brutal flex flex-col">
               <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Sessions (30d)</span>
               <span className="font-sans text-3xl font-black text-foreground">{metrics.sessions30d}</span>
               <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-1">attempts</span>
             </div>
             <button
               type="button"
               onClick={() => setFilterMode(filterMode === "needs_focus" ? "all" : "needs_focus")}
               className={`bg-card border rounded-[2px] p-5 shadow-brutal flex flex-col text-left hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-px active:shadow-pop transition-all ${
                 filterMode === "needs_focus" ? "border-destructive bg-destructive/10" : "border-destructive/50 bg-destructive/5"
               }`}
             >
               <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-destructive mb-1">Needs Focus</span>
               <span className="font-sans text-3xl font-black text-destructive">{metrics.needsFocus}</span>
               <span className="font-mono text-[9px] uppercase tracking-wider text-destructive/60 mt-1">Click to filter</span>
             </button>
          </div>

          {/* [1b] ACTIVITY STRIP — 30-day practice cadence */}
          <section className="bg-card border border-border rounded-[2px] p-5 shadow-brutal">
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Last 30 Days
              </h2>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {metrics.sessions30d} attempts · peak {activityStrip.maxCount}
              </span>
            </div>
            <div className="flex items-end gap-[3px] h-16">
              {activityStrip.days.map((day) => {
                const pct = activityStrip.maxCount > 0 ? (day.count / activityStrip.maxCount) : 0;
                const h = day.count === 0 ? 2 : Math.max(6, Math.round(pct * 56));
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex items-end group relative"
                    title={`${day.label}: ${day.count} ${day.count === 1 ? "attempt" : "attempts"}`}
                  >
                    <div
                      className={`w-full rounded-t-[1px] transition-colors ${
                        day.count === 0 ? "bg-border" : day.count >= 3 ? "bg-primary" : day.count >= 1 ? "bg-primary/70" : "bg-border"
                      }`}
                      style={{ height: `${h}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
              <span>{activityStrip.days[0]?.label}</span>
              <span>Today</span>
            </div>
          </section>

          {skills.length === 0 ? (
            <div className="border-2 border-dashed border-border bg-card rounded-[2px] p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm w-full min-h-[300px]">
              <h2 className="font-sans text-xl font-black text-foreground mb-2">No practice history yet</h2>
              <p className="text-sm text-muted-foreground mb-6">Start a session on the dashboard to build your diagnostic patterns.</p>
              <button onClick={() => navigate("/")} className="px-6 py-2.5 bg-primary text-primary-foreground font-mono text-[11px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-px hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">Go to Dashboard</button>
            </div>
          ) : (
            <>
              {/* [2] PATTERNS MATRIX */}
              <section className="flex flex-col gap-3">
                {/* Sticky header: title, legend, filter chips — stays reachable while scrolling drilldowns */}
                <div className="sticky top-0 z-20 -mx-6 xl:-mx-10 px-6 xl:px-10 py-3 bg-background/95 backdrop-blur-sm border-b border-border-light flex flex-col gap-3">
                  <div className="flex items-end justify-between flex-wrap gap-3">
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {labels.skillPlural} Matrix
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] font-mono font-bold tracking-wider text-muted-foreground">
                       <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[1px] bg-destructive inline-block"></span>&lt;4.0</div>
                       <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[1px] bg-accent-orange inline-block"></span>4.0-6.9</div>
                       <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[1px] bg-success inline-block"></span>&ge;7.0</div>
                    </div>
                  </div>

                  {/* Filter chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { key: "all", label: "All", count: counts.all },
                      { key: "ready", label: "Ready", count: counts.ready },
                      { key: "active", label: "Active", count: counts.active },
                      { key: "needs_focus", label: "Needs focus", count: counts.needsFocus },
                      { key: "unpracticed", label: "Unpracticed", count: counts.unpracticed },
                    ] as const).map((chip) => {
                      const active = filterMode === chip.key;
                      const accent = chip.key === "needs_focus" && chip.count > 0;
                      const ready = chip.key === "ready" && chip.count > 0;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setFilterMode(chip.key)}
                          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-[2px] border transition-all ${
                            active
                              ? "bg-foreground text-background border-foreground shadow-brutal"
                              : accent
                                ? "bg-destructive/5 text-destructive border-destructive/40 hover:bg-destructive/10"
                                : ready
                                  ? "bg-primary/5 text-primary border-primary/40 hover:bg-primary/10"
                                  : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          {chip.label} <span className={active ? "opacity-70" : "opacity-50"}>{chip.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-card">
                       <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-4 py-3 text-center border-r border-border-light w-[80px]">Score</th>
                          <th className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-4 py-3 border-r border-border-light w-1/3">Name</th>
                          <th className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-4 py-3 text-center border-r border-border-light">{labels.itemPlural}</th>
                          <th className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-4 py-3 border-r border-border-light">Trend</th>
                          <th className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-4 py-3 text-right">Next</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSkills.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                              No {labels.skillPlural.toLowerCase()} match this filter. <button onClick={() => setFilterMode("all")} className="text-primary font-bold underline ml-1">Clear filter</button>
                            </td>
                          </tr>
                        )}
                        {filteredSkills.map((skill) => {
                          const isExpanded = expandedSkillId === skill.skillId;
                          return (
                            <React.Fragment key={skill.skillId}>
                              <tr
                                onClick={() => void handleSkillClick(skill.skillId)}
                                role="button"
                                tabIndex={0}
                                className={`hover:bg-muted/50 transition-colors cursor-pointer border-b border-border-light last:border-b-0 ${isExpanded ? "bg-primary/5 shadow-inner" : ""}`}
                              >
                                <td className="px-4 py-3 text-center align-middle border-r border-border-light/50">
                                  <div className="w-6 h-6 mx-auto rounded-[2px] border border-border flex items-center justify-center shrink-0 text-[10px] font-mono font-bold" style={{
                                    backgroundColor: skill.totalAttempts === 0 ? "var(--color-muted)" :
                                      skill.score >= 7 ? "var(--color-success)" :
                                      skill.score >= 4 ? "var(--color-accent-orange)" : "var(--color-destructive)",
                                    color: skill.totalAttempts === 0 ? "var(--color-muted-foreground)" : "white",
                                  }}>
                                    {skill.totalAttempts === 0 ? "-" : skill.score.toFixed(0)}
                                  </div>
                                </td>
                                <td className={`px-4 py-3 font-sans text-sm font-bold align-middle border-r border-border-light/50 ${isExpanded ? "text-primary" : "text-foreground"}`}>
                                  <div className="flex items-center justify-between">
                                    <span>{skill.name}</span>
                                    <span className="text-muted-foreground/30 text-[10px] font-mono ml-4">{isExpanded ? "▼" : "▶"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[10px] tracking-wider font-mono text-muted-foreground text-center align-middle border-r border-border-light/50">
                                  {skill.totalProblems > 0 ? `${skill.completedProblems}/${skill.totalProblems}` : "-"}
                                </td>
                                <td className="px-4 py-3 text-[10px] tracking-wider font-mono font-medium align-middle border-r border-border-light/50">
                                  {skill.trend === "improving" ? (
                                    <span className="text-success font-bold flex items-center gap-1.5"><span className="text-[12px] font-sans">&uarr;</span> up</span>
                                  ) : skill.trend === "declining" ? (
                                    <span className="text-destructive font-bold flex items-center gap-1.5"><span className="text-[12px] font-sans">&darr;</span> down</span>
                                  ) : skill.totalAttempts === 0 ? (
                                    <span className="text-muted-foreground">-</span>
                                  ) : (
                                    <span className="text-muted-foreground flex items-center gap-1.5"><span className="text-[14px] leading-none mb-px font-sans">&rarr;</span> flat</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[10px] tracking-wider font-mono font-semibold text-muted-foreground text-right align-middle">
                                  {relativeDueDate(skill.dueDate, skill.totalAttempts)}
                                </td>
                              </tr>
                              
                              {/* Inline Drilldown Expansion — flat, embedded, no nested card */}
                              {isExpanded && (
                                <tr className="bg-muted/10 border-b-2 border-border">
                                  <td colSpan={5} className="p-0">
                                    <div className="border-l-[4px] border-primary">
                                      <div className="max-w-4xl mx-auto px-6 py-6">
                                        {drilldownLoading && <p className="text-muted-foreground text-sm font-medium text-center py-8">Loading inspection data...</p>}
                                        {drilldownError && <p className="text-destructive text-sm font-medium text-center py-8">{drilldownError}</p>}
                                        {drilldownData && (
                                          <SkillDrilldown
                                            data={drilldownData}
                                            itemPluralLabel={labels.itemPlural}
                                            onPractice={(id) => { void startSkill(id); }}
                                            onStartItem={(itemId) => { void startItem(itemId); }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* [3] CONTEXT GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-border pt-8 mt-6">
                 {/* Track Analytics */}
                 <section className="flex flex-col gap-3">
                   <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">Track History</h2>
                   <div className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden divide-y divide-border-light">
                      {(progress?.tracks ?? []).map((track) => {
                        const analytics = (progress?.trackAnalytics ?? []).find((row) => row.trackId === track.id);
                        return (
                          <div key={track.id} className="px-5 py-4 hover:bg-muted/10 transition-colors flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <div className="font-sans text-sm font-bold text-foreground">{track.name}</div>
                              <div className="text-xs text-muted-foreground">Last: {analytics?.lastAttemptAt ? relativeDate(analytics.lastAttemptAt) : "never"}</div>
                            </div>
                            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right border border-border bg-background px-2 py-1 rounded-[2px] shadow-sm">
                              {analytics?.completedAttempts ?? 0} comp <span className="opacity-50 mx-1">&middot;</span> {analytics?.generatedAttempts ?? 0} gen
                            </div>
                          </div>
                        );
                      })}
                   </div>
                 </section>

                 {/* Recent Activity */}
                 <section className="flex flex-col gap-3">
                   <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">Recent Activity</h2>
                   <div className="bg-card border border-border rounded-[2px] shadow-brutal overflow-hidden divide-y divide-border-light">
                      {(progress?.recentAttempts ?? []).length > 0 ? progress!.recentAttempts.map((attempt) => (
                        <div key={attempt.attemptId} className="px-5 py-4 hover:bg-muted/10 transition-colors flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="font-sans text-sm font-bold text-foreground truncate">{attempt.itemTitle}</div>
                            <div className="font-mono text-[10px] text-muted-foreground truncate">
                              {attempt.trackName ?? "No track"} 
                              <span className="opacity-50 mx-1.5">&middot;</span> 
                              {relativeDate(attempt.startedAt)}
                            </div>
                          </div>
                          <span className={`shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider border rounded-[2px] px-1.5 py-[1px] ${
                            attempt.outcome === "clean" ? "text-success border-success bg-success/5" :
                            attempt.outcome === "failed" ? "text-destructive border-destructive bg-destructive/5" :
                            "text-accent-orange border-accent-orange bg-accent-orange/5"
                          }`}>
                            {attempt.outcome ?? "open"}
                          </span>
                        </div>
                      )) : (
                        <div className="px-5 py-8 text-center text-sm text-muted-foreground">No recent practice sessions on record.</div>
                      )}
                   </div>
                 </section>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
