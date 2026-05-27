"use client";

import { useState, useRef, type FormEvent } from "react";
import type { CardDraft } from "./CardCreate";

interface Props {
  onDraft: (draft: CardDraft) => void;
  onSkip: () => void;
  onClose: () => void;
}

const EXAMPLES = [
  "I want to make a shooting for my new avant-garde collection in Le Marais next saturday at 4pm.",
  "Looking for two more for a film night about loneliness — sunday, 9th arr.",
  "Open table dinner this thursday at 8pm — bring wine, Belleville.",
];

/**
 * Step 1 of the new compose flow: the user types one sentence about what
 * they want to do. We send it to the AI draft endpoint which returns a
 * structured CardDraft; the user then reviews/edits in the existing
 * composer (Step 2 = CardCreate with `initialDraft`).
 */
export function PromptStep({ onDraft, onSkip, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = prompt.trim();
    if (text.length < 8) {
      setError("Tell us a little more — at least one sentence.");
      return;
    }
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/cards/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "rate_limited") {
          setError(`Please wait ${json.retryInSeconds || 30}s before drafting again.`);
        } else if (json?.error === "ai_not_configured") {
          setError("AI drafting isn't set up. You can still fill the form manually.");
        } else if (json?.error === "prompt_too_short") {
          setError("Tell us a little more — at least one sentence.");
        } else {
          setError("Drafting failed. You can fill the form manually instead.");
        }
        return;
      }
      onDraft(json.draft as CardDraft);
    } catch {
      setError("Network hiccup. Try again, or fill the form manually.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 sm:px-6 py-3 sm:py-4 shrink-0 safe-top">
        <div className="mono text-[10px] tracking-widest opacity-70">NEW · ONE THING</div>
        <button onClick={onClose} className="mono text-[11px] tracking-widest hover:underline">
          CLOSE ✕
        </button>
      </div>

      <form
        onSubmit={submit}
        className="flex-1 flex flex-col items-stretch justify-start min-h-0 overflow-y-auto"
      >
        <div className="max-w-[760px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center gap-6">
          <div>
            <div className="mono text-[10px] tracking-widest opacity-60">STEP 1 · INTENT</div>
            <h1 className="editorial font-black text-[34px] sm:text-[56px] leading-[0.95] mt-2">
              What do you want to do in Paris?
            </h1>
            <p className="mono text-[12px] opacity-70 mt-3 leading-relaxed">
              One sentence. We'll turn it into a structured card you can adjust.
              Mention the place, the timing, and the kind of company if you can.
            </p>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              placeholder="I want to…"
              rows={4}
              maxLength={500}
              className="w-full border border-ink bg-white px-4 py-3 editorial text-[20px] sm:text-[24px] leading-[1.25] focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            />
            <div className="absolute bottom-2 right-3 mono text-[10px] opacity-50 tabular-nums">
              {prompt.length}/500
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setPrompt(ex);
                  textareaRef.current?.focus();
                }}
                className="mono text-[10px] tracking-widest border border-ink/30 px-2 py-1 text-left hover:bg-ink hover:text-paper hover:border-ink transition"
              >
                {ex.length > 64 ? ex.slice(0, 62) + "…" : ex}
              </button>
            ))}
          </div>

          {error && (
            <div className="mono text-[11px] text-red-700 border-l-2 border-red-700 pl-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              disabled={drafting || prompt.trim().length < 8}
              className={`btn flex items-center gap-2 ${drafting ? "opacity-70" : ""} ${prompt.trim().length < 8 ? "opacity-40" : ""}`}
            >
              {drafting ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-paper animate-pulse" />
                  DRAFTING…
                </>
              ) : (
                <>DRAFT →</>
              )}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="mono text-[11px] tracking-widest opacity-70 hover:opacity-100 hover:underline"
            >
              or fill manually
            </button>
            <span className="mono text-[10px] opacity-40 ml-auto hidden sm:inline">
              ⌘ + ENTER to draft
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
