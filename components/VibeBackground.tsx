"use client";

import { useMemo } from "react";
import { computeVibe } from "@/lib/vibe";

export function VibeBackground({
  title,
  label,
  hour,
  className = "",
  children,
}: {
  title: string;
  label: string;
  hour?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const vibe = useMemo(() => computeVibe({ title, label, hour }), [title, label, hour]);
  return (
    <div
      className={`relative overflow-hidden noise ${vibe.isNight ? "stars" : ""} ${className}`}
      style={{ backgroundImage: vibe.cssBackground }}
    >
      {children}
    </div>
  );
}
