"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import type { TrackEntry } from "@/lib/types";
import { PARIS_BOUNDS } from "@/lib/quartiers";
import { cardColor, categoryColor } from "@/lib/color";

interface Props {
  entries: TrackEntry[];
  className?: string;
  /** Aspect ratio in "w/h" form (default 5/6 — slightly taller than square). */
  aspect?: string;
}

/**
 * Static Paris-mini-map showing the user's pins as a chronological
 * constellation. Uses real CARTO Positron no-labels tiles, dashed
 * polyline connecting pins in time order. All map interactions are
 * disabled — this is a read-only inline visualisation.
 */
export function Constellation({ entries, className = "", aspect = "5 / 6" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const LRef = useRef<typeof L | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);

  // Mount the Leaflet map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const leaflet = ((mod as unknown as { default?: typeof L }).default ?? (mod as unknown as typeof L)) as typeof L;
      if (cancelled || !ref.current) return;
      LRef.current = leaflet;

      const map = leaflet.map(ref.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        // @ts-expect-error: tap is deprecated in newer types but accepted at runtime
        tap: false,
      });

      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 19,
        })
        .addTo(map);

      const group = leaflet.layerGroup().addTo(map);
      overlayRef.current = group;
      mapRef.current = map;

      // Fit exactly to Paris + first ring with a small padding.
      map.fitBounds(PARIS_BOUNDS as unknown as L.LatLngBoundsExpression, {
        padding: [8, 8],
        animate: false,
      });

      // Re-measure once the container has its real size.
      const invalidate = () => map.invalidateSize({ animate: false });
      requestAnimationFrame(invalidate);
      const t1 = window.setTimeout(invalidate, 120);
      const t2 = window.setTimeout(invalidate, 400);
      let ro: ResizeObserver | null = null;
      if (ref.current && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          map.invalidateSize({ animate: false });
          map.fitBounds(PARIS_BOUNDS as unknown as L.LatLngBoundsExpression, {
            padding: [8, 8],
            animate: false,
          });
        });
        ro.observe(ref.current);
      }

      (map as unknown as { _cpCleanup?: () => void })._cpCleanup = () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        ro?.disconnect();
      };
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        const m = mapRef.current as unknown as { _cpCleanup?: () => void };
        m._cpCleanup?.();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Re-render overlay (markers + connector polyline) whenever entries change.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    const group = overlayRef.current;
    if (!map || !L || !group) return;
    group.clearLayers();

    const ordered = entries.slice().sort((a, b) => a.at - b.at);

    if (ordered.length > 1) {
      const latlngs: [number, number][] = ordered.map((e) => [
        e.card.location.lat,
        e.card.location.lng,
      ]);
      L.polyline(latlngs, {
        color: "#0a0a0a",
        opacity: 0.4,
        weight: 1.5,
        dashArray: "5 5",
        interactive: false,
      }).addTo(group);
    }

    ordered.forEach((e, i) => {
      const inner = cardColor(e.card);
      const outer = categoryColor(e.card);
      const shadow = `0 0 0 1.5px #ffffff, 0 0 0 3.5px ${outer}, 0 0 0 5px rgba(255,255,255,0.95)`;
      const html = `
        <div style="position:relative; width:10px; height:10px; pointer-events:none;">
          <div style="
            width:100%; height:100%; border-radius:50%;
            background:${inner};
            box-shadow:${shadow};
          "></div>
          <span style="
            position:absolute; top:-15px; left:11px;
            font-family:'JetBrains Mono', ui-monospace, monospace;
            font-size:10px; font-weight:500; color:#0a0a0a;
            white-space:nowrap;
          ">${i + 1}</span>
        </div>`;
      const icon = L.divIcon({
        className: "",
        html,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      L.marker([e.card.location.lat, e.card.location.lng], {
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(group);
    });
  }, [entries]);

  return (
    <div
      className={`relative bg-paper ${className}`}
      style={{ aspectRatio: aspect }}
    >
      <div ref={ref} className="absolute inset-0" />
      {entries.length === 0 && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="mono text-[11px] tracking-widest opacity-50 bg-paper px-2 py-1">
            NO PINS YET
          </span>
        </div>
      )}
    </div>
  );
}
