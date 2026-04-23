import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getLearnspace,
  getHealth,
  getProgress,
  getSession,
  patchSessionStep,
  postQueueNext,
  postSessionAbandon,
  postSessionComplete,
  postSessionExecute,
  postSessionCoach,
} from "../lib/api";
import type {
  CompletionResult,
  ExecutionResult,
  LearnspaceResponse,
  ProtocolStep,
  QueueSelection,
  SessionDetail,
} from "../lib/api";
import { StepEditor } from "../components/StepEditor";
import { AskCoachDropdown } from "../components/AskCoachDropdown";
import { TransitionCard } from "../components/TransitionCard";
import { CoachPanel, type ChatMessage } from "../components/CoachPanel";
import { SessionTimer } from "../components/SessionTimer";
import { AppShell } from "../components/AppShell";
import { MarkdownContent } from "../components/MarkdownContent";
import { SelectionReasonPanel } from "../components/SelectionReasonPanel";

const DEBOUNCE_MS = 500;

function codeLanguageForExecutor(type: string | null | undefined): string {
  if (!type) return "python";
  if (type.includes("python")) return "python";
  if (type.includes("javascript")) return "javascript";
  if (type.includes("typescript")) return "typescript";
  return "plaintext";
}

function executionRuntimeLabel(type: string | null | undefined): string {
  if (!type) return "Execution";
  if (type.includes("python")) return "Python Engine";
  if (type.includes("javascript")) return "JavaScript Engine";
  if (type.includes("typescript")) return "TypeScript Engine";
  return `${type} engine`;
}

export function Practice() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routerState = location.state as { session?: SessionDetail; selection?: QueueSelection; timerMinutes?: number | null } | null;

  const [session, setSession] = useState<SessionDetail | null>(routerState?.session ?? null);
  const [selection, setSelection] = useState<QueueSelection | null>(routerState?.selection ?? null);
  const [learnspace, setLearnspace] = useState<LearnspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [stepValues, setStepValues] = useState<Record<string, string>>({});
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [completing, setCompleting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);
  const [startNextError, setStartNextError] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Execution state
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Coach state
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Let me know if you have any questions. I'm here to help." },
  ]);
  const [coachStreaming, setCoachStreaming] = useState(false);
  const [coachStreamingText, setCoachStreamingText] = useState("");
  const [activeCoachStepId, setActiveCoachStepId] = useState<string | null>(null);
  const [coachFocusTrigger, setCoachFocusTrigger] = useState(0);
  const [coachUnavailableReason, setCoachUnavailableReason] = useState<string | null>(null);
  const streamingTextRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const [timerConfig, setTimerConfig] = useState<"none" | "countup" | number>(() => {
    if (!routerState || !("timerMinutes" in routerState) || routerState.timerMinutes === null) return "none";
    return typeof routerState.timerMinutes === "number" ? routerState.timerMinutes : "countup";
  });

  // Active step tab logic
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);

  // Auto-center the active tab if it's overflowing in the Tab Bar Header
  useEffect(() => {
    if (activeStepId) {
      const el = document.querySelector(`[data-step-id="${activeStepId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeStepId]);

  // Resize logic
  const leftColRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startWidth: 0 });

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.isDragging || !leftColRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    const newWidth = Math.max(300, Math.min(1000, dragRef.current.startWidth + delta));
    leftColRef.current.style.width = `${newWidth}px`;
    leftColRef.current.style.flexBasis = `${newWidth}px`; 
    leftColRef.current.style.minWidth = `${newWidth}px`; 
    leftColRef.current.style.maxWidth = `${newWidth}px`; 
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current.isDragging = false;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleDragMove]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startWidth: leftColRef.current?.getBoundingClientRect().width || 450
    };
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [handleDragMove, handleDragEnd]);

  // Y Resize logic for vertical Scenario/Coach split
  const topColRef = useRef<HTMLDivElement>(null);
  const dragYRef = useRef({ isDragging: false, startY: 0, startHeight: 0 });

  const handleDragMoveY = useCallback((e: MouseEvent) => {
    if (!dragYRef.current.isDragging || !topColRef.current) return;
    const delta = e.clientY - dragYRef.current.startY;
    const newHeight = Math.max(100, dragYRef.current.startHeight + delta);
    topColRef.current.style.height = `${newHeight}px`;
    topColRef.current.style.flexBasis = `${newHeight}px`; 
    topColRef.current.style.flexGrow = '0';
  }, []);

  const handleDragEndY = useCallback(() => {
    dragYRef.current.isDragging = false;
    document.removeEventListener("mousemove", handleDragMoveY);
    document.removeEventListener("mouseup", handleDragEndY);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleDragMoveY]);

  const handleDragStartY = useCallback((e: React.MouseEvent) => {
    dragYRef.current = {
      isDragging: true,
      startY: e.clientY,
      startHeight: topColRef.current?.getBoundingClientRect().height || 400
    };
    document.addEventListener("mousemove", handleDragMoveY);
    document.addEventListener("mouseup", handleDragEndY);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [handleDragMoveY, handleDragEndY]);

  // Clear explicit height constraints when coach collapses so flex-1 cleanly takes over
  useEffect(() => {
    if (!coachOpen && topColRef.current) {
      topColRef.current.style.height = '';
      topColRef.current.style.flexBasis = '';
      topColRef.current.style.flexGrow = '';
    }
  }, [coachOpen]);

  // Code Panel Resizer (Mid X-axis)
  const midColRef = useRef<HTMLDivElement>(null);
  const dragMidRef = useRef({ isDragging: false, startX: 0, startWidth: 0 });
  const [codePanelOpen, setCodePanelOpen] = useState(false);

  const handleDragMoveMid = useCallback((e: MouseEvent) => {
    if (!dragMidRef.current.isDragging || !midColRef.current) return;
    const delta = e.clientX - dragMidRef.current.startX;
    const newWidth = Math.max(300, dragMidRef.current.startWidth + delta);
    midColRef.current.style.width = `${newWidth}px`;
    midColRef.current.style.flexBasis = `${newWidth}px`;
    midColRef.current.style.flexGrow = '0';
  }, []);

  const handleDragEndMid = useCallback(() => {
    dragMidRef.current.isDragging = false;
    document.removeEventListener("mousemove", handleDragMoveMid);
    document.removeEventListener("mouseup", handleDragEndMid);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (midColRef.current) midColRef.current.style.transition = '';
  }, [handleDragMoveMid]);

  const handleDragStartMid = useCallback((e: React.MouseEvent) => {
    dragMidRef.current = {
      isDragging: true,
      startX: e.clientX,
      startWidth: midColRef.current?.getBoundingClientRect().width || 400
    };
    if (midColRef.current) midColRef.current.style.transition = 'none';
    document.addEventListener("mousemove", handleDragMoveMid);
    document.addEventListener("mouseup", handleDragEndMid);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [handleDragMoveMid, handleDragEndMid]);

  // Clear mid width lock when collapsed
  useEffect(() => {
    if (!codePanelOpen && midColRef.current) {
      midColRef.current.style.width = '';
      midColRef.current.style.flexBasis = '';
      midColRef.current.style.flexGrow = '';
    }
  }, [codePanelOpen]);

  // Rehydrate session from URL if router state is missing
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      try {
        let sessionData = routerState?.session ?? null;

        if (!sessionData) {
          sessionData = await getSession(sessionId!);
          if (!cancelled) setSession(sessionData);
        }

        if (cancelled) return;

        if (sessionData.status === "completed" || sessionData.status === "abandoned") {
          navigate("/", { replace: true });
          return;
        }


        const ls = await getLearnspace(sessionData.learnspaceId);
        if (cancelled) return;

        setLearnspace(ls);
        try {
          const health = await getHealth();
          if (cancelled) return;
          setCoachUnavailableReason(health.diagnostics.coach.configured
            ? null
            : "No coach backend is configured. Set one of the provider environment variables from Settings or /api/health, then restart the app.");
        } catch {
          if (!cancelled) {
            setCoachUnavailableReason("Could not verify coach backend availability.");
          }
        }

        const drafts: Record<string, string> = {};
        if (sessionData.stepDrafts) {
          for (const [stepId, draft] of Object.entries(sessionData.stepDrafts)) {
            drafts[stepId] = draft.content;
          }
        }
        // Pre-fill empty steps with templates from the learnspace config
        for (const step of ls.config.protocol_steps) {
          if (step.template && !drafts[step.id]) {
            drafts[step.id] = step.template;
          }
        }
        setStepValues(drafts);

        // Compute confidence-gated collapsing
        let confidenceScore = routerState?.selection?.confidenceScore ?? null;

        // When rehydrating from URL (no router state), look up the skill score
        // from the progress endpoint so gating still works after a refresh.
        if (confidenceScore === null && sessionData.item) {
          try {
            const primarySkillId = sessionData.item.skillIds?.[0];
            if (primarySkillId) {
              const progress = await getProgress();
              if (cancelled) return;
              const skillData = progress.skills.find((s) => s.skillId === primarySkillId);
              if (skillData) confidenceScore = skillData.score;
            }
          } catch {
            // Non-critical — proceed without gating
          }
        }

        const steps = ls.config.protocol_steps;
        let initialStepIndex = 0;

        const threshold = ls.config.confidence_gated_protocol_threshold;
        if (confidenceScore !== null && confidenceScore >= threshold) {
          let codeStepIndex = -1;
          for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i].editor === "code") { codeStepIndex = i; break; }
          }
          if (codeStepIndex > 0) {
            initialStepIndex = codeStepIndex;
          }
        }
        
        if (steps.length > 0) {
          setActiveStepId(steps[initialStepIndex].id);
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load session");
          setLoading(false);
        }
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleStepChange = useCallback(
    (stepId: string, content: string) => {
      setStepValues((prev) => ({ ...prev, [stepId]: content }));

      if (debounceTimers.current[stepId]) {
        clearTimeout(debounceTimers.current[stepId]);
      }

      debounceTimers.current[stepId] = setTimeout(() => {
        if (session) {
          patchSessionStep(session.sessionId, stepId, content).catch(() => {});
        }
      }, DEBOUNCE_MS);
    },
    [session],
  );

  const handleStepBlur = useCallback(
    (stepId: string, content: string) => {
      if (debounceTimers.current[stepId]) {
        clearTimeout(debounceTimers.current[stepId]);
        delete debounceTimers.current[stepId];
      }
      if (session) {
        patchSessionStep(session.sessionId, stepId, content).catch(() => {});
      }
    },
    [session],
  );

  const handleComplete = useCallback(async () => {
    if (!session) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const result = await postSessionComplete(session.sessionId);
      setCompletion(result);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Failed to complete session");
    } finally {
      setCompleting(false);
    }
  }, [session]);

  const [exiting, setExiting] = useState(false);
  const handleExit = useCallback(async () => {
    if (!session || exiting) return;
    const isDirty = Object.values(stepValues).some((v) => v.trim().length > 0);
    if (isDirty) {
      const ok = window.confirm(
        "Leave this session? Your progress is saved as an abandoned attempt — you can come back to this skill later.",
      );
      if (!ok) return;
    }
    setExiting(true);
    try {
      await postSessionAbandon(session.sessionId);
    } catch {
      // Auto-cleanup will eventually catch orphaned sessions; navigate anyway.
    } finally {
      navigate("/");
    }
  }, [session, exiting, stepValues, navigate]);

  const handleStartNext = useCallback(async () => {
    setStartingNext(true);
    setStartNextError(null);
    try {
      const result = await postQueueNext(selection?.trackId ?? undefined);
      setCompletion(null);
      setStepValues({});
      setCompleteError(null);
      setExecutionResult(null);
      setExecutionError(null);
      setCoachMessages([{ role: "assistant", content: "Let me know if you have any questions. I'm here to help." }]);
      setCoachStreamingText("");
      setStartingNext(false);
      setSession(result.session);
      setSelection(result.selection);
      navigate(`/practice/${result.session.sessionId}`, {
        state: { session: result.session, selection: result.selection },
        replace: true,
      });
    } catch (err) {
      setStartNextError(err instanceof Error ? err.message : "Failed to start session");
      setStartingNext(false);
    }
  }, [navigate, selection?.trackId]);

  // Code execution
  const handleRunCode = useCallback(async () => {
    if (!session || !learnspace?.config.executor || executing) return;
    const codeStep = learnspace.config.protocol_steps.find((s) => s.editor === "code");
    if (!codeStep) return;
    const code = stepValues[codeStep.id] ?? "";

    setExecuting(true);
    setExecutionError(null);
    try {
      const result = await postSessionExecute(session.sessionId, code);
      setExecutionResult(result);
    } catch (err) {
      setExecutionError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  }, [session, learnspace, stepValues, executing]);

  // Coach messaging. `explicitStepId` wins over the React state fallback —
  // callers that already know which step they're targeting (per-step Ask) must
  // pass it directly, because setActiveCoachStepId has not committed yet when
  // this runs on the same tick.
  const handleCoachMessage = useCallback(async (message: string, explicitStepId?: string) => {
    if (!session || coachStreaming) return;
    if (coachUnavailableReason) {
      setCoachMessages((prev) => [...prev, { role: "assistant", content: coachUnavailableReason }]);
      return;
    }
    const stepId = explicitStepId ?? activeCoachStepId ?? learnspace?.config.protocol_steps[0]?.id ?? "unknown";

    setCoachMessages((prev) => [...prev, { role: "user", content: message }]);
    setCoachStreaming(true);
    setCoachStreamingText("");
    streamingTextRef.current = "";

    const controller = postSessionCoach(session.sessionId, message, stepId, {
      onDelta(text) {
        streamingTextRef.current += text;
        setCoachStreamingText(streamingTextRef.current);
      },
      onMetadata() {
        // Metadata stored server-side; no client action needed
      },
      onDone() {
        const finalText = streamingTextRef.current;
        setCoachMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
        setCoachStreamingText("");
        setCoachStreaming(false);
        streamingTextRef.current = "";
      },
      onError(err) {
        setCoachMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
        setCoachStreamingText("");
        setCoachStreaming(false);
        streamingTextRef.current = "";
      },
    });

    abortControllerRef.current = controller;
  }, [session, coachStreaming, coachUnavailableReason, activeCoachStepId, learnspace]);

  // Per-step coach action: open panel and set step context
  const handleAskCoach = useCallback((stepId: string, message?: string) => {
    setActiveCoachStepId(stepId);
    setCoachOpen(true);
    setCoachFocusTrigger((n) => n + 1);
    if (message) {
      handleCoachMessage(message, stepId);
    }
  }, [handleCoachMessage]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+K: toggle coach
      if (mod && e.key === "k") {
        e.preventDefault();
        setCoachOpen((prev) => !prev);
      }

      // Cmd+Enter: run code
      if (mod && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleRunCode();
      }

      // Cmd+Shift+Enter: complete
      if (mod && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        handleComplete();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunCode, handleComplete]);

  // Cleanup timers and abort controller on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const steps = learnspace?.config.protocol_steps ?? [];
  const hasExecutor = learnspace?.config.executor != null;
  const executorType = learnspace?.config.executor?.type ?? null;
  const codeLanguage = codeLanguageForExecutor(executorType);
  const runtimeLabel = executionRuntimeLabel(executorType);

  // Step navigation hotkeys (must be above early returns to satisfy Rules of Hooks)
  useEffect(() => {
    if (!sessionId || steps.length === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === "BracketRight") {
        e.preventDefault();
        setActiveStepId((prev) => {
          const idx = steps.findIndex(s => s.id === (prev ?? steps[0]?.id));
          if (idx !== -1 && idx < steps.length - 1) return steps[idx+1].id;
          return prev;
        });
      } else if (e.altKey && e.code === "BracketLeft") {
        e.preventDefault();
        setActiveStepId((prev) => {
          const idx = steps.findIndex(s => s.id === (prev ?? steps[0]?.id));
          if (idx > 0) return steps[idx-1].id;
          return prev;
        });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sessionId, steps]);

  // Auto-expand Code panel when hotkey iterates to Code step
  useEffect(() => {
    if (!activeStepId || steps.length === 0) return;
    const step = steps.find(s => s.id === activeStepId);
    if (step && step.editor === "code") {
      setCodePanelOpen(true);
    }
  }, [activeStepId, steps]);

  if (!sessionId) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto p-6 py-24 text-center">
          <p className="text-muted-foreground mb-4">No active session.</p>
          <button onClick={() => navigate("/")} className="font-sans text-sm font-medium border border-border bg-white px-5 py-2 rounded-[2px] shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all">
            Back to Home
          </button>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell learnspaceName={learnspace?.name}>
        <div className="flex items-center justify-center py-24">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (completion) {
    return (
      <AppShell learnspaceName={learnspace?.name} breadcrumb="Complete">
        <TransitionCard
          completion={completion}
          onStartNext={handleStartNext}
          startingNext={startingNext}
          startNextError={startNextError}
        />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto p-6 py-24 text-center">
          <p role="alert" className="text-destructive mb-4">{loadError}</p>
          <button onClick={() => navigate("/")} className="font-sans text-sm font-medium border border-border bg-white px-5 py-2 rounded-[2px] shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all">
            Back to Home
          </button>
        </div>
      </AppShell>
    );
  }

  const itemTitle = selection?.item.title ?? session?.item?.title ?? null;
  const itemDifficulty = selection?.item.difficulty ?? session?.item?.difficulty ?? null;
  const itemPrompt = (selection?.item.content?.prompt as string) ?? (session?.item?.content?.prompt as string) ?? null;

  return (
    <AppShell
      learnspaceName={learnspace?.name}
      breadcrumb={session?.status === "completed" ? "Complete" : typeof timerConfig === "number" ? "Timed Practice" : itemTitle ?? "Practice"}
      headerRight={
        <button
          type="button"
          onClick={handleExit}
          disabled={exiting || !session}
          className="group inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/20 hover:bg-destructive/5 rounded-[2px] px-3 py-1.5 transition-all disabled:opacity-50"
          title="Abandon this session and return to Home"
        >
          <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] mb-[1px]">✕</span>
          </div>
          {exiting ? "Exiting..." : "Exit Session"}
        </button>
      }
    >
      {/* Confirmation Modal */}
      {confirmComplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border-2 border-primary shadow-[8px_8px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full flex flex-col gap-6">
             <div>
               <h2 className="font-mono text-[11px] uppercase tracking-widest text-primary mb-2 font-bold">Action Required</h2>
               <h1 className="font-sans text-2xl font-black uppercase tracking-tight text-foreground">Submit Scenario?</h1>
             </div>
             <p className="font-sans text-[13px] text-foreground/90 leading-relaxed border-l-4 border-primary pl-4 py-2 font-medium">
               You are about to finalize this scenario. The AI Coach will evaluate your logic, efficiency, and edge case handling.
             </p>
             <div className="flex gap-4 mt-2">
               <button onClick={() => setConfirmComplete(false)} className="flex-1 px-4 py-3 bg-muted/50 border border-border font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-all cursor-pointer">Return</button>
               <button onClick={() => { setConfirmComplete(false); handleComplete(); }} className="flex-[1.5] px-4 py-3 bg-primary text-primary-foreground font-mono text-[11px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-px hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all cursor-pointer">Confirm Submit</button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden bg-background">
        {/* Left Column: Context Stack (Scenario + Coach) */}
        <div ref={leftColRef} className="w-1/3 transition-[width] duration-500 ease-out min-w-[280px] max-w-[1000px] shrink-0 flex flex-col bg-card overflow-hidden">
          {/* Top Half: Scenario Reference */}
          {itemTitle && (
            <div ref={topColRef} className={`flex flex-col overflow-hidden min-h-[150px] ${coachOpen ? "h-[65%] shrink-0" : "flex-1"}`}>
              <div className="px-5 py-3 border-b border-border-light bg-muted/10 shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-sans text-[13px] font-black text-foreground leading-snug truncate">{itemTitle}</h3>
                  {itemDifficulty && (
                    <span className={`shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] border border-current ${
                      itemDifficulty === "easy" ? "text-success bg-success/10" :
                      itemDifficulty === "hard" ? "text-destructive bg-destructive/10" :
                      "text-accent-orange bg-accent-orange/10"
                    }`}>{itemDifficulty}</span>
                  )}
                </div>
                <h2 className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Scenario</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative">
                {selection && (
                  <div className="mb-5">
                    <SelectionReasonPanel selection={selection} compact />
                  </div>
                )}
                {itemPrompt ? (
                  <MarkdownContent content={itemPrompt} />
                ) : (
                  <div className="text-sm font-medium text-muted-foreground italic">No scenario details provided.</div>
                )}
              </div>
            </div>
          )}

          {/* Horizontal Drag Handle */}
          {itemTitle && coachOpen && (
            <div 
              onMouseDown={handleDragStartY}
              className="h-1.5 bg-border hover:bg-primary transition-colors cursor-row-resize shrink-0 z-50 flex items-center justify-center group relative shadow-[0_1px_0_0_inset_#222]"
            >
              <div className="flex gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-[2px] bg-background rounded-full"></div>
                <div className="w-1 h-[2px] bg-background rounded-full"></div>
                <div className="w-1 h-[2px] bg-background rounded-full"></div>
              </div>
            </div>
          )}

          {/* Bottom Half: Coach Panel */}
          <div className={`flex flex-col shadow-brutal-t z-10 bg-card overflow-hidden ${coachOpen ? "flex-1 min-h-[150px] border-t-2 border-border" : "shrink-0 min-h-0 border-t border-border"}`}>
            <CoachPanel
              open={coachOpen}
              onToggle={() => setCoachOpen((prev) => !prev)}
              sessionId={session?.sessionId ?? ""}
              currentStepId={activeCoachStepId ?? steps[0]?.id ?? ""}
              onSendMessage={handleCoachMessage}
              messages={coachMessages}
              streaming={coachStreaming}
              streamingText={coachStreamingText}
              focusTrigger={coachFocusTrigger}
              unavailableReason={coachUnavailableReason}
            />
          </div>
        </div>

        {/* Drag Handle */}
        <div 
          onMouseDown={handleDragStart}
          className="w-1.5 bg-border hover:bg-primary transition-colors cursor-col-resize shrink-0 z-50 flex flex-col items-center justify-center group relative origin-center" 
        >
          <div className="flex flex-col gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-[2px] h-1 bg-background rounded-full"></div>
            <div className="w-[2px] h-1 bg-background rounded-full"></div>
            <div className="w-[2px] h-1 bg-background rounded-full"></div>
          </div>
        </div>

        {/* Right Column: Execution Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-background">
          <div className="w-full flex-1 flex flex-col relative min-h-0">

              <div className="flex-1 flex flex-col relative w-full h-full min-h-0 bg-background">
                {/* IDE Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#1E1E1E] shrink-0 text-[#C9D1D9]">
                  <div className="flex items-center gap-4">
                    {session && (
                      <>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C9D1D9]/70 border border-white/10 rounded-full px-2 py-1">
                          {codeLanguage}
                        </span>
                        <select 
                          value={timerConfig.toString()} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "none" || val === "countup") setTimerConfig(val);
                            else setTimerConfig(parseInt(val, 10));
                          }}
                          className="appearance-none bg-black/20 hover:bg-black/40 text-[10px] font-mono font-bold uppercase tracking-wider text-[#C9D1D9]/70 hover:text-[#C9D1D9] border border-white/5 outline-none cursor-pointer py-1 pl-2 pr-6 rounded-full transition-all focus:border-white/20"
                          style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg width="8" height="6" viewBox="0 0 8 6" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L0 0H8L4 6Z" opacity="0.5"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                          title="Set Timer"
                        >
                           <option value="none" className="bg-[#1E1E1E]">⏱ No timer</option>
                           <option value="countup" className="bg-[#1E1E1E]">⏱ Stopwatch</option>
                           <option value="5" className="bg-[#1E1E1E]">⏱ 5 min</option>
                           <option value="10" className="bg-[#1E1E1E]">⏱ 10 min</option>
                           <option value="15" className="bg-[#1E1E1E]">⏱ 15 min</option>
                        </select>
                        {timerConfig !== "none" && (
                          <SessionTimer 
                            limitMinutes={typeof timerConfig === "number" ? timerConfig : null} 
                            startedAt={session.startedAt} 
                            autoStart={true}
                          />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 pl-2 ml-2">
                      {completeError && (
                        <span className="text-destructive text-[10px] font-bold uppercase tracking-wider animate-pulse hidden sm:inline">{completeError}</span>
                      )}
                      <button
                        onClick={() => setConfirmComplete(true)}
                        disabled={completing}
                        className="font-mono text-[10px] font-bold tracking-widest uppercase bg-primary text-primary-foreground px-4 py-1.5 rounded-[2px] shadow-sm hover:shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer whitespace-nowrap whitespace-pre"
                      >
                        {completing ? "Submitting..." : "Submit \u2192"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2-Pane Split (Accordion | Code) */}
                <div className="flex-1 flex overflow-hidden w-full h-full">
                  {/* Middle Pane: Protocol Accordion */}
                  {(() => {
                    if (steps.length === 0) return null;
                    return (
                      <div ref={midColRef} className={`transition-[width,flex,flex-basis,flex-grow] duration-500 ease-out flex flex-col min-w-[280px] overflow-hidden bg-card shrink-0 shadow-[1px_0_0_0_rgba(255,255,255,0.05)_inset, -1px_0_0_0_rgba(0,0,0,0.5)_inset] ${codePanelOpen ? "w-1/2" : "flex-1"}`}>
                        {/* Middle Column Title Bar */}
                        <div className="bg-muted/10 border-b border-border flex items-center justify-between px-4 h-[38px] shrink-0">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                             Steps
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const idx = steps.findIndex(s => s.id === (activeStepId ?? steps[0]?.id));
                                if (idx > 0) setActiveStepId(steps[idx-1].id);
                              }}
                              className="px-2 py-1 bg-transparent hover:bg-muted/30 transition-colors rounded-[2px] font-mono text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer min-w-[75px]"
                              title="Previous Step"
                            >
                              <div className="flex items-center gap-1">
                                <span>{"\u2190"}</span>
                                <span>Prev</span>
                              </div>
                              <span className="opacity-40 font-[500] font-sans text-[9px] border border-border rounded-[2px] px-1 bg-background flex flex-1 items-center justify-center">&#8997;[</span>
                            </button>
                            <button 
                              onClick={() => {
                                const idx = steps.findIndex(s => s.id === (activeStepId ?? steps[0]?.id));
                                if (idx !== -1 && idx < steps.length - 1) setActiveStepId(steps[idx+1].id);
                              }}
                              className="px-2 py-1 bg-transparent hover:bg-muted/30 transition-colors rounded-[2px] font-mono text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer min-w-[75px]"
                              title="Next Step"
                            >
                              <div className="flex items-center gap-1">
                                <span>Next</span>
                                <span>{"\u2192"}</span>
                              </div>
                              <span className="opacity-40 font-[500] font-sans text-[9px] border border-border rounded-[2px] px-1 bg-background flex flex-1 items-center justify-center">&#8997;]</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col divide-y divide-border h-full overflow-y-auto custom-scrollbar">
                          {steps.map((step) => {
                            const isCode = step.editor === "code";
                            const defaultActive = steps.filter(s => s.editor !== "code")[0]?.id;
                            const isExpanded = !isCode && (activeStepId ? activeStepId === step.id : defaultActive === step.id);
                            const stepTemplate = learnspace?.config.protocol_steps.find(s => s.id === step.id)?.template ?? "";
                            const hasContent = stepValues[step.id] && stepValues[step.id].trim().length > 0 && stepValues[step.id] !== stepTemplate;

                            return (
                              <div key={step.id} className={`flex flex-col transition-all duration-300 ${isExpanded ? "flex-1 min-h-0" : "flex-shrink-0"}`}>
                                {/* Accordion Header */}
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (isCode) {
                                      setCodePanelOpen(true);
                                    } else {
                                      setActiveStepId(isExpanded ? null : step.id);
                                    }
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter" && event.key !== " ") return;
                                    event.preventDefault();
                                    if (isCode) {
                                      setCodePanelOpen(true);
                                    } else {
                                      setActiveStepId(isExpanded ? null : step.id);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between px-5 py-2.5 border-none text-left transition-colors cursor-pointer shrink-0 ${isExpanded ? "bg-muted/10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]" : "bg-card hover:bg-muted/30"}`}
                                  aria-expanded={isExpanded}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-[2px] ${isExpanded || (isCode && codePanelOpen) ? "bg-primary" : hasContent ? "bg-secondary" : "bg-muted-foreground/30"}`}></span>
                                    <span className={`font-mono text-[11px] font-bold tracking-widest uppercase ${(isCode && codePanelOpen) || isExpanded ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {isExpanded && !isCode && <AskCoachDropdown step={step} onAskCoach={handleAskCoach} />}
                                    <span className={`text-muted-foreground opacity-70 font-mono transition-transform duration-200 ${isCode ? "text-[12px]" : isExpanded ? "text-[9px]" : "text-[9px] -rotate-90"}`}>{isCode ? "\u2192" : "\u25BC"}</span>
                                  </div>
                                </div>
                                
                                {/* Accordion Body */}
                                {!isCode && isExpanded && (
                                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar">
                                      <StepEditor
                                        step={step}
                                        value={stepValues[step.id] ?? ""}
                                        onChange={handleStepChange}
                                        onBlur={handleStepBlur}
                                        codeLanguage={codeLanguage}
                                      />
                                    </div>
                                    <div className="h-4 shrink-0 border-t border-border-light bg-muted/5 w-full"></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Horizontal Resizer handles / Drawer Toggle */}
                  <div 
                    onMouseDown={codePanelOpen ? handleDragStartMid : undefined}
                    onClick={!codePanelOpen ? () => setCodePanelOpen(true) : undefined}
                    className={`transition-colors shrink-0 z-50 flex items-center justify-center group relative shadow-[1px_0_0_0_#222_inset] ${
                       codePanelOpen ? "w-1.5 bg-border hover:bg-primary cursor-col-resize" : "w-10 bg-card border-l border-border hover:bg-muted/30 cursor-pointer"
                    }`}
                  >
                    {codePanelOpen ? (
                      <>
                        <div className="flex flex-col gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-[2px] h-1 bg-background rounded-full"></div>
                          <div className="w-[2px] h-1 bg-background rounded-full"></div>
                          <div className="w-[2px] h-1 bg-background rounded-full"></div>
                        </div>
                        {/* Close Toggle nested in the open resizer */}
                        <button
                           onClick={(e) => { e.stopPropagation(); setCodePanelOpen(false); }}
                           className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-background border border-border flex items-center justify-center rounded-full text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary hover:border-primary transition-all cursor-pointer z-50 shadow-sm"
                           title="Hide Code Panel"
                        >
                           {"\u25B6"}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-foreground transition-colors h-full justify-center">
                        <span className="font-mono text-[12px]">{"\u25C0"}</span>
                        <div className="font-mono text-[10px] uppercase font-bold tracking-widest leading-none [writing-mode:vertical-rl] rotate-180">
                          Show Code
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Far-Right Pane: Code Editor */}
                  {(() => {
                    const codeSteps = steps.filter(s => s.editor === "code");
                    if (codeSteps.length === 0) return null;
                    const codeStep = codeSteps[0]; // Assuming one code step logically in Codence models
                    return (
                      <div className={`transition-[width,flex,flex-basis,flex-grow] duration-500 ease-out flex flex-col relative overflow-hidden bg-background ${codePanelOpen ? "flex-1 min-w-[200px]" : "flex-[0_0_0px] w-0 min-w-0 border-none px-0 mx-0"}`}>
                        <div className="absolute inset-0 min-w-[300px] flex flex-col bg-background">
                        <div className="bg-[#E5E7EB] border-b border-border flex items-center justify-between px-4 h-[38px] shrink-0">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                             Code
                          </span>
                          <div className="flex items-center gap-3">
                            <AskCoachDropdown step={codeStep} onAskCoach={handleAskCoach} />
                            <div className="w-px h-3 bg-border"></div>
                            <button
                              onClick={() => setCodePanelOpen(false)}
                              className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30 px-2 py-1 rounded-[2px] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Hide Code (Collapse to Drawer)"
                            >
                              Hide <span className="text-[12px]">{"\u2192"}</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col relative overflow-hidden h-full">
                           <StepEditor
                             step={codeStep}
                             value={stepValues[codeStep.id] ?? ""}
                             onChange={handleStepChange}
                             onBlur={handleStepBlur}
                             codeLanguage={codeLanguage}
                           />
                        </div>
                        {/* Execution UI Docked Terminal */}
                        {hasExecutor && (
                          <div className="bg-[#0D0D0D] border-t border-border font-mono flex flex-col relative z-0 flex-shrink-0 h-[260px]">
                            {/* Terminal Header Bar */}
                            <div className="bg-[#1E1E1E] px-4 py-2 border-b border-[#333] flex items-center justify-between shadow-inner">
                               <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-[#3FB950] animate-pulse"></span> {runtimeLabel}
                               </span>
                               <button
                                 onClick={handleRunCode}
                                 disabled={executing}
                                 className="text-[10px] font-bold uppercase tracking-wider bg-transparent text-foreground px-4 py-1.5 border border-[#333] hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer rounded-[2px]"
                               >
                                 {executing ? "Executing..." : "Run Sequence"}
                               </button>
                            </div>
                            
                            {/* Terminal Data Body */}
                            <div className="p-5 text-[12px] flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                              {!executionResult && !executionError && !executing && (
                                <span className="text-[#6E7681] italic">Waiting for execution...</span>
                              )}
                              {executing && (
                                <span className="text-[#6E7681] animate-pulse">Running assertions...</span>
                              )}
                              
                              {executionResult && (
                                <div data-testid="execution-results" className="flex flex-col gap-4">
                                  <div className="inline-flex flex-wrap items-center gap-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${executionResult.passed > 0 ? "text-[#3FB950] border border-[#3FB950]/30 bg-[#3FB950]/10" : "text-[#6E7681] border border-[#333]"}`}>
                                      {executionResult.passed} passed
                                    </span>
                                    {executionResult.failed > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#F85149] border border-[#F85149]/30 bg-[#F85149]/10">
                                        {executionResult.failed} failed
                                      </span>
                                    )}
                                    {executionResult.errors.length > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#F85149] border border-[#F85149]/30 bg-[#F85149]/10">
                                        Compilation Error
                                      </span>
                                    )}
                                  </div>

                                  {executionResult.errors.length > 0 && (
                                    <div className="text-[#F85149] leading-relaxed whitespace-pre-wrap bg-[#1E1E1E] p-3 border border-[#333] border-l-2 border-l-[#F85149]">
                                      {executionResult.errors.join("\n")}
                                    </div>
                                  )}

                                  {executionResult.testDetails && executionResult.testDetails.length > 0 && (
                                    <div className="flex flex-col gap-[1px] bg-[#333] border border-[#333]">
                                      {executionResult.testDetails.map((tc, i) => (
                                        <div key={i} className={`flex items-start gap-3 px-3 py-2.5 bg-[#0D0D0D]`}>
                                          <span className={tc.passed ? "text-[#3FB950]" : "text-[#F85149]"}>
                                            {tc.passed ? "✓" : "✗"}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <span className={tc.passed ? "text-[#C9D1D9]" : "text-[#F85149] font-medium"}>{tc.description}</span>
                                            {!tc.passed && (
                                              <div className="mt-2 space-y-1.5 bg-[#1E1E1E] p-2.5 border border-[#333]">
                                                <div className="flex flex-col"><span className="text-[#6E7681] text-[10px] uppercase">Input</span> <span className="text-[#C9D1D9]">{tc.input}</span></div>
                                                <div className="flex flex-col"><span className="text-[#6E7681] text-[10px] uppercase">Expected</span> <span className="text-[#3FB950]">{tc.expected}</span></div>
                                                <div className="flex flex-col"><span className="text-[#6E7681] text-[10px] uppercase">Got</span> <span className="text-[#F85149]">{tc.actual}</span></div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {executionError && (
                                <div role="alert" className="text-[#F85149] leading-relaxed whitespace-pre-wrap bg-[#1E1E1E] p-3 border border-[#333] border-l-2 border-l-[#F85149] mt-2">
                                {executionError}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
                </div>

              </div>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  );
}

interface StepGroup {
  type: "inline" | "full";
  steps: ProtocolStep[];
}

/** Groups consecutive inline steps together; full-layout steps get their own group. */
export function groupSteps(steps: ProtocolStep[]): StepGroup[] {
  const groups: StepGroup[] = [];

  for (const step of steps) {
    const lastGroup = groups[groups.length - 1];
    if (step.layout === "inline" && lastGroup?.type === "inline") {
      lastGroup.steps.push(step);
    } else {
      groups.push({ type: step.layout, steps: [step] });
    }
  }

  return groups;
}
