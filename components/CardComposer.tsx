"use client";

import { useState } from "react";
import { CardCreate, type CardDraft } from "./CardCreate";
import { IdeaComposer } from "./IdeaComposer";
import { PromptStep } from "./PromptStep";

type Stage = "prompt" | "idea" | "thing";

/**
 * Orchestrator for the create flow. Two entry points, optional AI bridge:
 *
 *   • IDEA path (default, fastest): one sentence → in the field. The protocol
 *     wants almost zero friction; everything but the text is optional.
 *   • THING path: the full structured composer (time, place, spots, crew).
 *   • AI prompt: type a sentence, the model decides idea-or-thing and pre-fills.
 *
 * `initialKind` tilts the first screen. Posting an Idea is never a mandatory
 * funnel toward a Thing — many ideas just float.
 */
export function CardComposer({
  onClose,
  initialKind = "idea",
}: {
  onClose: () => void;
  initialKind?: "idea" | "thing";
}) {
  const [stage, setStage] = useState<Stage>("prompt");
  const [draft, setDraft] = useState<CardDraft | null>(null);

  if (stage === "prompt") {
    return (
      <div className="h-full w-full animate-fadeIn">
        <PromptStep
          initialKind={initialKind}
          onProceed={(kind, d) => {
            // The switch decides the kind; the draft (if any) pre-fills.
            setDraft(d);
            setStage(kind);
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  if (stage === "idea") {
    return (
      <div key="idea" className="h-full w-full animate-fadeIn">
        <IdeaComposer
          onClose={onClose}
          onBack={() => setStage("prompt")}
          initial={
            draft
              ? {
                  title: draft.title,
                  description: draft.description,
                  tags: draft.tags,
                  locationQuery: draft.locationQuery,
                  location: draft.location ?? null,
                }
              : null
          }
        />
      </div>
    );
  }

  return (
    <div key="thing" className="h-full w-full animate-fadeIn">
      <CardCreate
        initialDraft={draft}
        onClose={onClose}
        onBack={() => setStage("prompt")}
      />
    </div>
  );
}
