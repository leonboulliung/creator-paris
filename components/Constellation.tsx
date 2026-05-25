"use client";

import { useMemo } from "react";
import type { TrackEntry } from "@/lib/types";
import { PARIS_BOUNDS } from "@/lib/quartiers";
import { cardColor, categoryColor } from "@/lib/color";

interface Props {
  entries: TrackEntry[];
  className?: string;
  /** Show numeric labels next to each pin (chronological order). */
  showNumbers?: boolean;
}

const VIEW_W = 600;
const VIEW_H = 640;

export function Constellation({ entries, className = "", showNumbers = true }: Props) {
  const points = useMemo(() => {
    const [[minLat, minLng], [maxLat, maxLng]] = PARIS_BOUNDS;
    return entries
      .slice()
      .sort((a, b) => a.at - b.at)
      .map((t) => ({
        x: ((t.card.location.lng - minLng) / (maxLng - minLng)) * VIEW_W,
        y: (1 - (t.card.location.lat - minLat) / (maxLat - minLat)) * VIEW_H,
        inner: cardColor(t.card),
        outer: categoryColor(t.card),
        isCreator: t.isCreator,
      }));
  }, [entries]);

  if (points.length === 0) {
    return (
      <div
        className={`relative border border-ink bg-paper grid place-items-center ${className}`}
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <span className="mono text-[11px] tracking-widest opacity-50">
          NO PINS YET
        </span>
      </div>
    );
  }

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`block bg-paper border border-ink ${className}`}
      aria-label="Your Paris constellation"
    >
      {/* faint grid */}
      <g stroke="#eaeaea" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={(VIEW_W * (i + 1)) / 10} y1={0} x2={(VIEW_W * (i + 1)) / 10} y2={VIEW_H} />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(VIEW_H * (i + 1)) / 10} x2={VIEW_W} y2={(VIEW_H * (i + 1)) / 10} />
        ))}
      </g>

      {/* stylised Seine curve as visual anchor */}
      <path
        d={`M 0 ${VIEW_H * 0.6} C ${VIEW_W * 0.28} ${VIEW_H * 0.5}, ${VIEW_W * 0.58} ${VIEW_H * 0.7}, ${VIEW_W} ${VIEW_H * 0.55}`}
        stroke="#0a0a0a"
        strokeWidth="1.5"
        fill="none"
        opacity="0.85"
      />

      {/* connector line through chronological order */}
      {points.length > 1 && (
        <polyline
          points={polylineStr}
          fill="none"
          stroke="#0a0a0a"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
      )}

      {/* pins */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="14" fill="#0a0a0a" fillOpacity="0.08" />
          <circle cx={p.x} cy={p.y} r="7" fill={p.outer} />
          <circle cx={p.x} cy={p.y} r="4" fill={p.inner} stroke="#ffffff" strokeWidth="1.2" />
          {showNumbers && (
            <text
              x={p.x + 11}
              y={p.y - 7}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              fill="#0a0a0a"
              fontWeight="500"
            >
              {i + 1}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
