"use client";

import { useState, type KeyboardEvent } from "react";
import { normalizeTag } from "@/lib/vibe";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Maximum number of tags allowed. Beyond this, new tags are rejected. */
  max?: number;
  placeholder?: string;
  /** Suggestions shown as quick-add chips above the input. */
  suggestions?: string[];
  className?: string;
}

/**
 * Free-form tag input. Type, press ENTER (or comma/space), pill appears.
 * Click × on a pill to remove. Pills are normalized to lowercase-hyphenated
 * via `normalizeTag` so storage is consistent regardless of user typing.
 */
export function TagInput({
  value,
  onChange,
  max = 5,
  placeholder = "type a tag, press ENTER",
  suggestions,
  className = "",
}: Props) {
  const [draft, setDraft] = useState("");

  function add(rawList: string | string[]) {
    const items = Array.isArray(rawList) ? rawList : [rawList];
    const next = [...value];
    for (const item of items) {
      const t = normalizeTag(item);
      if (!t || next.includes(t) || next.length >= max) continue;
      next.push(t);
    }
    if (next.length !== value.length) onChange(next);
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        add(draft);
        setDraft("");
      }
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  const atLimit = value.length >= max;
  const visibleSuggestions = (suggestions || []).filter((s) => {
    const norm = normalizeTag(s);
    return norm && !value.includes(norm);
  });

  return (
    <div className={className}>
      <div className="border border-rule-strong bg-white px-2 py-2 flex flex-wrap items-center gap-1.5 min-h-[44px]">
        {value.map((t) => (
          <span
            key={t}
            className="mono text-[11px] tracking-widest bg-ink text-paper pl-2 pr-1 py-1 flex items-center gap-1"
          >
            #{t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="hover:opacity-70"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        {!atLimit && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toLowerCase())}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (draft.trim()) {
                add(draft);
                setDraft("");
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="mono text-[12px] flex-1 min-w-[80px] px-1 py-1 bg-transparent focus:outline-none"
            maxLength={24}
          />
        )}
      </div>
      <div className="mono text-[10px] opacity-50 mt-1 flex items-center gap-2">
        <span>{value.length}/{max}</span>
        <span>· lowercase · use hyphens-not-spaces</span>
      </div>
      {visibleSuggestions.length > 0 && !atLimit && (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="mono text-[10px] tracking-widest border border-rule-strong/40 px-1.5 py-0.5 hover:bg-ink hover:text-paper transition"
            >
              + #{normalizeTag(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
