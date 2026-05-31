"use client";

import { useState, useRef, type FormEvent } from "react";
import type { CardDraft } from "./CardCreate";

interface Props {
  /** Which kind the entry point leaned toward (tilts the copy + manual CTA). */
  kind: "idea" | "thing";
  onDraft: (draft: CardDraft) => void;
  /** Skip AI and go straight to a blank composer of the chosen kind. */
  onManual: (kind: "idea" | "thing") => void;
  onClose: () => void;
}

// Ideas read as latent possibilities; things read as concrete plans.
const IDEA_EXAMPLES = [
  "Someone should start a Sunday night-photography walk group.",
  "We should turn the empty print shop on rue Volta into a zine library.",
  "A recurring open table dinner where everyone brings one dish + one stranger.",
];
const THING_EXAMPLES = [
  "Film night about loneliness this Sunday, 9th arr, looking for two more.",
  "Shoot for my avant-garde collection in Le Marais next Saturday at 4pm.",
  "Open table dinner this thursday 8pm — bring wine, Belleville.",
];

/**
 * The entry to creating. One sentence; the AI decides whether it's an IDEA
 * (a thought to throw in the field) or a THING (a concrete plan), and pre-fills
 * the right composer. Two manual entry points sit beside it so the AI is never
 * a mandatory funnel.
 */
export function PromptStep({ kind, onDraft, onManual, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isIdea = kind === "idea";
  const examples = isIdea ? IDEA_EXAMPLES : THING_EXAMPLES;

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
          setError("AI drafting isn't set up. You can still write it yourself below.");
        } else if (json?.error === "prompt_too_short") {
          setError("Tell us a little more — at least one sentence.");
        } else {
          setError("Drafting failed. You can write it yourself below instead.");
        }
        return;
      }
      onDraft(json.draft as CardDraft);
    } catch {
      setError("Network hiccup. Try again, or write it yourself below.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 sm:px-6 py-3 sm:py-4 shrink-0 safe-top">
        <div className="mono text-[10px] tracking-widest opacity-70">SHARE SOMETHING INTO THE CITY</div>
        <button onClick={onClose} className="mono text-[11px] tracking-widest hover:underline">
          CLOSE ✕
        </button>
      </div>

      <form
        onSubmit={submit}
        className="flex-1 flex flex-col items-stretch justify-start min-h-0 overflow-y-auto"
      >
        <div className="max-w-[760px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center gap-7">
          <div>
            <div className="mono text-[10px] tracking-widest opacity-60">
              A THOUGHT BECOMES REAL BY BEING SHARED
            </div>
            <h1 className="editorial font-black text-[32px] sm:text-[52px] leading-[0.95] mt-2">
              {isIdea ? "What could exist in Paris?" : "What do you want to do?"}
            </h1>
            <p className="mono text-[12px] opacity-70 mt-3 leading-relaxed">
              Write one sentence. We&rsquo;ll tell whether it&rsquo;s an{" "}
              <span className="font-bold">idea</span> to throw into the field, or a{" "}
              <span className="font-bold">thing</span> ready to happen — and set up
              the rest for you.
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
              placeholder={isIdea ? "Wouldn't it be great if…" : "I want to…"}
              rows={4}
              maxLength={500}
              className="w-full border border-ink bg-white px-4 py-3 editorial text-[20px] sm:text-[24px] leading-[1.25] focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            />
            <div className="absolute bottom-2 right-3 mono text-[10px] opacity-50 tabular-nums">
              {prompt.length}/500
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex) => (
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
                  READING…
                </>
              ) : (
                <>DRAFT IT →</>
              )}
            </button>
            <span className="mono text-[10px] opacity-40 ml-auto hidden sm:inline">
              ⌘ + ENTER
            </span>
          </div>

          {/* Two manual entry points — the AI is never the only door. */}
          <div className="border-t border-ink pt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onManual("idea")}
              className="flex-1 cp-idea-frame border border-ink px-4 py-3 text-left hover:bg-ink/[0.03] transition"
            >
              <div className="mono text-[10px] tracking-widest flex items-center gap-2">
                <span className="cp-idea-mark" /> THROW AN IDEA
              </div>
              <div className="mono text-[10px] opacity-60 mt-1">
                One line. No plan needed. Let it collect resonance.
              </div>
            </button>
            <button
              type="button"
              onClick={() => onManual("thing")}
              className="flex-1 border border-ink px-4 py-3 text-left hover:bg-ink hover:text-paper transition group"
            >
              <div className="mono text-[10px] tracking-widest flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-ink group-hover:bg-paper" /> PLAN A THING
              </div>
              <div className="mono text-[10px] opacity-60 mt-1 group-hover:opacity-80">
                A real plan with a time + place people can join.
              </div>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
