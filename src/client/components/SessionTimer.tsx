import { useEffect, useRef, useState } from "react";

export interface SessionTimerProps {
  /** Total allowed minutes, or null for count-up only (no limit). */
  limitMinutes: number | null;
  /** ISO timestamp when the session started. */
  startedAt: string;
  /** Whether the timer starts immediately on mount */
  autoStart?: boolean;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SessionTimer({ limitMinutes, startedAt, autoStart = true }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(true); // Always start truly paused so warmup/idle math controls offset
  const [warmup, setWarmup] = useState<number | null>(autoStart ? 3 : null);
  
  // Track consecutive idle time
  const pausedAtRef = useRef(0);
  // Track when the MOST RECENT pause occurred (or session start if autoStart is false)
  const lastPauseTimeRef = useRef<number>(new Date(startedAt).getTime());

  // Warmup Sequence Hook
  useEffect(() => {
    if (warmup === null) return;
    if (warmup > 0) {
      const timer = setTimeout(() => setWarmup(w => w !== null ? w - 1 : null), 1000);
      return () => clearTimeout(timer);
    } else {
      // Warmup finished. Unpause naturally.
      setWarmup(null);
      const idleSeconds = Math.floor((Date.now() - lastPauseTimeRef.current) / 1000);
      pausedAtRef.current += idleSeconds;
      setPaused(false);
    }
  }, [warmup]);

  useEffect(() => {
    if (paused) return;
    const start = new Date(startedAt).getTime();
    function tick() {
      setElapsed(Math.floor((Date.now() - start) / 1000) - pausedAtRef.current);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, paused]);

  function togglePause() {
    if (warmup !== null) {
      // User skips warmup by clicking play
      setWarmup(0);
      return;
    }
    
    if (paused) {
      // Resuming — add the duration of the current pause to the total paused offset
      const idleSeconds = Math.floor((Date.now() - lastPauseTimeRef.current) / 1000);
      pausedAtRef.current += idleSeconds;
      setPaused(false);
    } else {
      // Pausing — mark the exact time we stopped
      lastPauseTimeRef.current = Date.now();
      setPaused(true);
    }
  }

  const limitSeconds = limitMinutes ? limitMinutes * 60 : null;
  const remaining = limitSeconds ? Math.max(0, limitSeconds - elapsed) : null;
  const overtime = limitSeconds ? elapsed > limitSeconds : false;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`font-mono text-sm font-black tracking-widest ${
          warmup !== null ? "text-primary animate-pulse" :
          overtime ? "text-destructive" : remaining !== null && remaining < 300 ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {warmup !== null
          ? `STARTING IN ${warmup}`
          : limitSeconds
            ? (overtime ? `+${formatTime(elapsed - limitSeconds)}` : formatTime(remaining!))
            : formatTime(elapsed)
        }
      </span>
      <button
        onClick={togglePause}
        className="font-mono text-sm text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
        title={warmup !== null ? "Skip Warmup" : paused ? "Resume timer" : "Pause timer"}
      >
        {warmup !== null ? "\u25B6\u25B6" : paused ? "\u25B6" : "\u23F8"}
      </button>
    </span>
  );
}
