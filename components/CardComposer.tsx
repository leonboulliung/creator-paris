"use client";

import { useState } from "react";
import { CardCreate, type CardDraft } from "./CardCreate";
import { PromptStep } from "./PromptStep";

/**
 * Orchestrator for the two-step compose flow.
 *   Step 1: free-form prompt → AI draft
 *   Step 2: existing structured composer, pre-filled
 *
 * The user can also skip Step 1 ("fill manually") and go straight to a
 * blank Step 2. From Step 2 they can return to Step 1 via "← BACK".
 */
export function CardComposer({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<"prompt" | "compose">("prompt");
  const [draft, setDraft] = useState<CardDraft | null>(null);

  if (stage === "prompt") {
    return (
      <PromptStep
        onDraft={(d) => {
          setDraft(d);
          setStage("compose");
        }}
        onSkip={() => {
          setDraft(null);
          setStage("compose");
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <CardCreate
      initialDraft={draft}
      onClose={onClose}
      onBack={() => setStage("prompt")}
    />
  );
}
