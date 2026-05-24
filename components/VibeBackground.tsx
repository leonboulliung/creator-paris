"use client";

import { useMemo } from "react";
import { computeVibe } from "@/lib/vibe";

export function VibeBackground({
  title,
  label,
  hour,
  category,
  className = "",
  children,
}: {
  title: string;
  label: string;
  hour?: number;
  category?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const vibe = useMemo(
    () => computeVibe({ title, label, hour, category }),
    [title, label, hour, category],
  );
  return (
    <div
      className={`relative overflow-hidden noise ${vibe.isNight ? "stars" : ""} ${className}`}
      style={{ backgroundImage: vibe.cssBackground }}
    >
      {children}
    </div>
  );
}
