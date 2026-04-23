import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoachPanelProps {
  open: boolean;
  onToggle: () => void;
  sessionId: string;
  currentStepId: string;
  onSendMessage: (message: string) => Promise<void>;
  messages: ChatMessage[];
  streaming: boolean;
  streamingText: string;
  focusTrigger?: number;
  unavailableReason?: string | null;
}

export function CoachPanel({
  open,
  onToggle,
  onSendMessage,
  focusTrigger,
  messages,
  streaming,
  streamingText,
  unavailableReason = null,
}: CoachPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open && !streaming) {
      inputRef.current?.focus();
    }
  }, [open, streaming, focusTrigger]);

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="px-5 py-3 w-full flex justify-between items-center bg-card hover:bg-muted/30 transition-colors cursor-pointer border-none text-left"
      >
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          AI Coach 
        </span>
        <div className="flex items-center gap-2">
          <span className="opacity-50 font-[500] font-sans text-[10px] border border-border rounded-[2px] px-1 bg-muted/20">&#8984;K</span>
          <span className="text-muted-foreground text-sm hover:text-foreground font-medium">&#9652;</span>
        </div>
      </button>
    );
  }

  const canSend = inputValue.trim().length > 0 && !streaming && !unavailableReason;

  async function handleSend() {
    if (!canSend) return;
    const message = inputValue.trim();
    setInputValue("");
    await onSendMessage(message);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      data-testid="coach-panel"
      className="flex flex-col h-full bg-card"
    >
      <button 
        onClick={onToggle}
        className="px-5 py-3 border-b border-border-light flex justify-between items-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer w-full text-left"
      >
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          AI Coach
        </span>
        <div className="flex items-center gap-2">
          <span className="opacity-50 font-[500] font-sans text-[10px] border border-border rounded-[2px] px-1 bg-background">&#8984;K</span>
          <span className="bg-transparent border-none text-muted-foreground text-sm hover:text-foreground font-medium">
            &#9662;
          </span>
        </div>
      </button>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {unavailableReason && (
          <div className="p-3 rounded-[2px] border border-destructive/40 bg-destructive/5 text-sm text-foreground">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">
              Coach unavailable
            </div>
            <p className="mt-1 text-muted-foreground leading-relaxed">{unavailableReason}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            data-testid="chat-message"
            className={`p-2 rounded-[2px] text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-muted text-foreground"
                : "bg-transparent text-foreground"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {streaming && streamingText && (
          <div className="p-2 text-sm whitespace-pre-wrap text-foreground opacity-70">
            {streamingText}
          </div>
        )}
        {streaming && !streamingText && (
          <div className="p-2 text-muted-foreground text-xs">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-border flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={unavailableReason ? "Coach backend is not configured" : "Ask the coach..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming || Boolean(unavailableReason)}
          className="flex-1 p-2 border border-border rounded-[2px] text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className={`px-3 py-2 rounded-[2px] text-sm font-mono font-bold uppercase tracking-wider transition-all ${
            canSend
              ? "bg-primary text-primary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover active:translate-y-0 active:shadow-none cursor-pointer"
              : "bg-muted text-muted-foreground cursor-default"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
