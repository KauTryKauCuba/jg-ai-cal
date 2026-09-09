"use client";

import * as React from "react";
import { Plus, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  types                                                             */
/* ------------------------------------------------------------------ */
export interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "bot";
  pending?: boolean;
}

export interface GradientChatInputProps {
  /** Placeholder shown inside the text field. */
  placeholder?: string;
  /** Auto-reply pushed back after a user message. Pass `null` to disable. */
  autoReply?: string | null;
  /** Delay (ms) before the auto-reply lands. */
  autoReplyDelay?: number;
  /** Max number of bubbles kept on screen. */
  maxVisible?: number;
  /** Play synthesized send / receive sounds. */
  sound?: boolean;
  /** The spectrum used for the reveal glow (top → bottom). */
  gradientColors?: string[];
  /**
   * Fired whenever the user submits a message. May optionally return
   * (or resolve to) a reply string — if provided, it replaces the canned
   * `autoReply` as the bot bubble for that exchange.
   */
  onSend?: (message: string) => void | string | Promise<string | void>;
  /** Disables the input and buttons (e.g. after a single-shot exchange). */
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  defaults                                                          */
/* ------------------------------------------------------------------ */
const DEFAULT_GRADIENT = [
  "#FC2BA3",
  "#FC6D35",
  "#F9C83D",
  "#C2D6E1",
  "#144EC5",
];

/* ------------------------------------------------------------------ */
/*  component                                                         */
/* ------------------------------------------------------------------ */
export default function GradientChatInput({
  placeholder = "Send Message",
  autoReply = "Got it — looking into that now ✨",
  autoReplyDelay = 650,
  maxVisible = 20,
  sound = true,
  gradientColors = DEFAULT_GRADIENT,
  onSend,
  disabled = false,
  className,
}: GradientChatInputProps) {
  const [value, setValue] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const idRef = React.useRef(0);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = React.useRef<AudioContext | null>(null);
  const bottomAnchorRef = React.useRef<HTMLDivElement | null>(null);

  // keep the latest message + input in view as the thread grows, instead of
  // making the user manually scroll down after every reply
  React.useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  /* lazy AudioContext — only created on the first user gesture */
  const getAudioContext = React.useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    }
    return audioRef.current;
  }, []);

  /* two-note blip synthesized inline — no audio assets to ship */
  const playChime = React.useCallback(
    (notes: { freq: number; at: number }[], volume: number) => {
      if (!sound) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();

      notes.forEach(({ freq, at }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + at;
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    },
    [sound, getAudioContext],
  );

  const playSend = React.useCallback(
    () =>
      playChime(
        [
          { freq: 523.25, at: 0 },
          { freq: 783.99, at: 0.06 },
        ],
        0.05,
      ),
    [playChime],
  );

  const playReceive = React.useCallback(
    () =>
      playChime(
        [
          { freq: 392.0, at: 0 },
          { freq: 587.33, at: 0.08 },
        ],
        0.05,
      ),
    [playChime],
  );

  /* cleanup pending timers + audio context on unmount */
  React.useEffect(() => {
    return () => {
      // read timersRef.current at cleanup time, not effect-setup time —
      // timersRef.current gets reassigned to a new array (see handleSend's
      // .filter() below) whenever a reply lands, so capturing it once here
      // would miss any timers scheduled after that reassignment.
      timersRef.current.forEach(clearTimeout);
      void audioRef.current?.close();
    };
  }, []);

  const pushMessage = (
    text: string,
    sender: ChatMessage["sender"],
    pending = false
  ) => {
    const id = idRef.current++;
    setMessages((prev) => [...prev, { id, text, sender, pending }]);
    return id;
  };

  const updateMessage = (id: number, text: string) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text, pending: false } : m))
    );

  const removeMessage = (id: number) =>
    setMessages((prev) => prev.filter((m) => m.id !== id));

  const handleSend = () => {
    if (disabled) return;
    const text = value.trim();
    if (!text) return;

    const result = onSend?.(text);
    pushMessage(text, "user");
    playSend();
    setValue("");

    if (result && typeof result !== "string") {
      // async onSend — show a "Thinking…" placeholder immediately, then
      // swap it for the resolved reply (which replaces the canned autoReply)
      const thinkingId = pushMessage("Thinking…", "bot", true);
      void result.then((reply) => {
        if (reply) {
          updateMessage(thinkingId, reply);
          playReceive();
        } else {
          removeMessage(thinkingId);
        }
      });
      return;
    }

    const replyText = typeof result === "string" ? result : autoReply;
    if (replyText) {
      const t = setTimeout(() => {
        pushMessage(replyText, "bot");
        playReceive();
        timersRef.current = timersRef.current.filter((timer) => timer !== t);
      }, autoReplyDelay);
      timersRef.current.push(t);
    }
  };

  const hasText = value.trim().length > 0;
  const visible = messages.slice(-maxVisible);

  return (
    <div className={cn("relative mx-auto flex w-full max-w-lg flex-col", className)}>
      <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-[0_10px_20px_-6px_rgba(0,0,0,0.1)]">
        {/* message thread — normal top-to-bottom flow, grows with the page */}
        {visible.length > 0 && (
          <div className="flex flex-col gap-2 p-4">
            <AnimatePresence initial={false}>
              {visible.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className={cn(
                      "max-w-[208px] break-words px-3.5 py-2.5 text-sm shadow-[0_4px_10px_-4px_rgba(0,0,0,0.15)]",
                      "rounded-2xl",
                      m.sender === "user" ? "rounded-br-md" : "rounded-bl-md",
                      m.sender === "user"
                        ? "border border-border bg-background text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {m.pending ? (
                      <span className="flex items-center gap-1 py-0.5" aria-label="Thinking">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="size-1.5 rounded-full bg-current"
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{
                              duration: 0.9,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      m.text
                    )}
                  </motion.div>
                </div>
              ))}
            </AnimatePresence>
            <div ref={bottomAnchorRef} />
          </div>
        )}

        {/* input row */}
        <div className="flex items-center justify-between gap-2 p-1.5">
          <div className="flex flex-1 items-center gap-3 pr-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Add attachment"
              disabled={disabled}
              className="size-10 shrink-0 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <Plus className="size-5" />
            </Button>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder}
              aria-label="Message"
              disabled={disabled}
              className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent md:text-sm"
            />
          </div>
          <Button
            type="button"
            disabled={disabled}
            onClick={handleSend}
            onMouseDown={(e) => e.preventDefault()}
            variant={hasText ? "default" : "secondary"}
            size="icon"
            aria-label="Send message"
            className="size-10 shrink-0 rounded-xl transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-95"
          >
            <Send className="size-5" strokeWidth={2.25} />
          </Button>
        </div>
      </div>
    </div>
  );
}
