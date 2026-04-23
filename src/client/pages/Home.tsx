import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  activateTrack,
  getLearnspace,
  getProgress,
  postOnboarding,
  postQueueNext,
  postSessionSkip,
  type LearnspaceResponse,
  type LearnspaceTrackSummary,
  type ProgressSummary,
  type QueueNextResponse,
  type QueueSelection,
} from "../lib/api";
import { AppShell } from "../components/AppShell";
import { SessionHero } from "../components/SessionHero";
import { labelsFor } from "../lib/learnspace-labels";

function difficultyClass(difficulty: string): string {
  if (difficulty === "easy") return "text-success bg-success/10";
  if (difficulty === "hard") return "text-destructive bg-destructive/10";
  return "text-accent-orange bg-accent-orange/10";
}

function dueLabel(iso: string | null): string {
  if (!iso) return "new";
  const now = new Date();
  const due = new Date(iso);
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
  // SM-5 drives order, not obligation. Anything past-due is just "ready"
  // — no shame labels, no piling up days-of-debt. Items the scheduler
  // thinks are worth practicing today all render the same.
  if (diffDays <= 0) return "ready";
  if (diffDays === 1) return "tomorrow";
  return `${diffDays}d`;
}

export function Home() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [learnspace, setLearnspace] = useState<LearnspaceResponse | null>(null);
  const [pendingSession, setPendingSession] = useState<QueueNextResponse["session"] | null>(null);
  const [selection, setSelection] = useState<QueueSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [activatingTrackId, setActivatingTrackId] = useState<string | null>(null);

  const labels = labelsFor(learnspace);

  const refreshProgress = useCallback(async () => {
    const nextProgress = await getProgress();
    setProgress(nextProgress);
    const detail = await getLearnspace(nextProgress.learnspace.id);
    setLearnspace(detail);
    return { progress: nextProgress, learnspace: detail };
  }, []);

  const resolveNext = useCallback(async (options?: { forceGenerated?: boolean; targetSkillId?: string; trackId?: string }) => {
    const result = await postQueueNext(
      options?.trackId,
      options?.targetSkillId,
      undefined,
      options?.forceGenerated,
    );
    setPendingSession(result.session);
    setSelection(result.selection);
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        await postOnboarding();
        const { progress: nextProgress } = await refreshProgress();
        try {
          const result = await postQueueNext(nextProgress.learnspace.activeTrackId ?? undefined);
          if (!cancelled) {
            setPendingSession(result.session);
            setSelection(result.selection);
          }
        } catch (queueError) {
          if (!cancelled) {
            setPendingSession(null);
            setSelection(null);
            if (!(queueError instanceof Error) || !queueError.message.includes("409")) {
              setError(queueError instanceof Error ? queueError.message : "Failed to load next session");
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load home");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [refreshProgress]);

  const trackAnalyticsById = useMemo(() => {
    return new Map(
      (progress?.trackAnalytics ?? [])
        .filter((row) => row.trackId !== null)
        .map((row) => [row.trackId!, row]),
    );
  }, [progress?.trackAnalytics]);

  async function handleTrackSelect(track: LearnspaceTrackSummary) {
    setActivatingTrackId(track.id);
    setError(null);
    try {
      const result = await activateTrack(track.id);
      setProgress((current) => current ? ({
        ...current,
        tracks: result.tracks,
        learnspace: {
          ...current.learnspace,
          activeTrackId: result.activeTrackId,
          activeTrack: result.activeTrack,
        },
      }) : current);
      await resolveNext({ trackId: track.id });
      await refreshProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate track");
    } finally {
      setActivatingTrackId(null);
    }
  }

  function handleStart() {
    if (!pendingSession) return;
    setStarting(true);
    navigate(`/practice/${pendingSession.sessionId}`, {
      state: { session: pendingSession, selection, timerMinutes: null },
    });
  }

  async function handleSkip() {
    setSkipping(true);
    setError(null);
    try {
      const result = pendingSession
        ? await postSessionSkip(pendingSession.sessionId, selection?.trackId ?? progress?.learnspace.activeTrackId ?? undefined)
        : await postQueueNext(progress?.learnspace.activeTrackId ?? undefined);
      setPendingSession(result.session);
      setSelection(result.selection);
      await refreshProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load a different ${labels.itemSingular.toLowerCase()}`);
    } finally {
      setSkipping(false);
    }
  }



  async function handleExplore() {
    setStarting(true);
    setError(null);
    try {
      const exploreTrackId = tracks.find((track) => track.slug === "explore")?.id;
      const result = await postQueueNext(exploreTrackId, undefined, undefined, false);
      navigate(`/practice/${result.session.sessionId}`, {
        state: { session: result.session, selection: result.selection, timerMinutes: null },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start exploration");
      setStarting(false);
    }
  }

  const activeTrackId = progress?.learnspace.activeTrackId ?? progress?.learnspace.activeTrack?.id ?? null;
  const tracks = useMemo(() => {
    const raw = progress?.tracks ?? [];
    return [...raw].sort((a, b) => {
      if (a.slug === "recommended" && b.slug !== "recommended") return -1;
      if (b.slug === "recommended" && a.slug !== "recommended") return 1;
      return 0;
    });
  }, [progress?.tracks]);
  const queuePreview = (progress?.queueItems ?? []).slice(0, 10);
  
  const sessions7dCount = useMemo(() => {
    if (!progress?.recentAttempts) return 0;
    const weekAgo = Date.now() - 7 * 86400000;
    return progress.recentAttempts.filter(a => new Date(a.startedAt).getTime() > weekAgo).length;
  }, [progress?.recentAttempts]);

  return (
    <AppShell learnspaceName={progress?.learnspace.name ?? learnspace?.name}>
      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar bg-background">
        <div className="mx-auto flex flex-col gap-10 w-full max-w-6xl p-6 xl:p-10 pb-20">
          
          {/* [1] HERO - full width */}
          <SessionHero
            learnspace={learnspace}
            selection={selection}
            loading={loading}
            starting={starting}
            skipping={skipping}
            error={error}
            onStart={handleStart}
            onSkip={handleSkip}
            onExplore={handleExplore}
          />

          {/* [2] TRACK STRIP - responsive grid */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Practice Tracks
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tracks.map((track) => {
                const analytics = trackAnalyticsById.get(track.id);
                const active = activeTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => void handleTrackSelect(track)}
                    disabled={activatingTrackId !== null || loading}
                    className={`text-left bg-card border rounded-[2px] p-5 shadow-sm hover:shadow-brutal hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 flex flex-col min-h-[140px] ${
                      active ? "border-primary bg-primary/5 shadow-brutal" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <span className={`font-sans text-lg font-bold min-w-0 break-words ${active ? "text-primary" : "text-foreground"}`}>
                        {track.name}
                      </span>
                      {active && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary shrink-0 self-start mt-1">
                          ●
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-snug mt-1.5 flex-1 line-clamp-3">{track.goal}</p>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-auto pt-4 w-full">
                      {analytics?.completedAttempts ?? 0} attempts · {analytics?.generatedAttempts ?? 0} generated
                    </div>
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={() => navigate("/library", { state: { activeTab: "tracks", openTrackForm: true } })}
                className="text-left bg-transparent border-2 border-dashed border-border rounded-[2px] p-5 flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity min-h-[140px]"
              >
                 <span className="font-sans text-lg font-bold text-muted-foreground mb-1">+ New Track</span>
                 <p className="font-mono text-[10px] uppercase text-muted-foreground text-center">Generate</p>
              </button>
            </div>
          </section>

          {/* [3] CONTEXT - two-column (~2:1 ratio) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-border pt-8">
            {/* UP NEXT Queue */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  UP NEXT
                </h2>
              </div>
              <div className="bg-card border border-border shadow-sm rounded-[2px] overflow-hidden">
                {queuePreview.length > 0 ? (
                  <div className="divide-y divide-border-light">
                    {queuePreview.map((item, index) => (
                      <div key={item.itemId} className="flex gap-4 px-5 py-4 hover:bg-muted/10 transition-colors">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5 w-4 text-right">
                          {index + 1}.
                        </span>
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 justify-between w-full">
                          <div className="min-w-0 flex-1 flex flex-col gap-1">
                            <div className="font-sans text-sm font-bold text-foreground truncate">
                              {item.itemTitle}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground truncate">
                              {item.skillName}
                            </div>
                          </div>
                          <div className="flex items-center justify-start sm:justify-end gap-2 shrink-0">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] border border-current text-center ${difficultyClass(item.difficulty)}`}>
                              {item.difficulty}
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-muted-foreground text-right border border-border bg-background px-1.5 py-[1px] rounded-[2px]">
                              {dueLabel(item.dueDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No queued {labels.itemPlural.toLowerCase()} yet.
                  </div>
                )}
              </div>
            </div>

            {/* THIS WEEK Insights */}
            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  THIS WEEK
                </h2>
              </div>
              <div className="bg-card border border-border p-5 rounded-[2px] shadow-sm flex flex-col gap-4">
                 <div className="flex justify-between items-center border-b border-border-light pb-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Ready</span>
                    <span className="font-sans text-sm font-bold text-foreground">{(progress?.learnspace.dueTodayCount ?? 0) + (progress?.learnspace.overdueCount ?? 0)} items</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border-light pb-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Estimate</span>
                    <span className="font-sans text-sm font-bold text-foreground">
                      {progress?.estimatedMinutes ? `${progress.estimatedMinutes} min` : "0 min"}
                    </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border-light pb-2 mt-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Sessions (7d)</span>
                    <span className="font-sans text-sm font-bold text-foreground">{sessions7dCount}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border-light pb-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Trending up</span>
                    <span className="font-sans text-sm font-bold text-success">
                      {progress?.insightsSummary?.improvingSkillCount ?? 0}
                    </span>
                 </div>
                 <div className="flex justify-between items-center pb-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Needs focus</span>
                    <span className="font-sans text-sm font-bold text-destructive">
                      {progress?.insightsSummary?.decliningSkillCount ?? 0}
                    </span>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
