"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as L from "leaflet";
import type { TrackEntry } from "@/lib/types";
import { PARIS_BOUNDS } from "@/lib/quartiers";
import { cardColor } from "@/lib/color";

interface Props {
  entries: TrackEntry[];
  className?: string;
  /** Aspect ratio in "w/h" form. Default ~4:3 — Paris is wider than tall. */
  aspect?: string;
}

type LatLngTuple = [number, number];

/** Bounds that frame the actual pins (with small buffer), falling back
 *  to a sensible zoom for 0 or 1 pins. */
function boundsForEntries(entries: TrackEntry[]): [LatLngTuple, LatLngTuple] {
  if (entries.length === 0) return PARIS_BOUNDS;

  if (entries.length === 1) {
    const e = entries[0];
    const off = 0.012; // ~roughly 1.3km square
    return [
      [e.card.location.lat - off, e.card.location.lng - off],
      [e.card.location.lat + off, e.card.location.lng + off],
    ];
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const e of entries) {
    const { lat, lng } = e.card.location;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  // Padding so pins aren't flush against the frame
  const padLat = Math.max(0.004, (maxLat - minLat) * 0.18);
  const padLng = Math.max(0.004, (maxLng - minLng) * 0.18);
  return [
    [minLat - padLat, minLng - padLng],
    [maxLat + padLat, maxLng + padLng],
  ];
}

export function Constellation({ entries, className = "", aspect = "4 / 3" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const LRef = useRef<typeof L | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  const fitBounds = useMemo(() => boundsForEntries(entries), [entries]);

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
        // @ts-expect-error: tap is accepted at runtime
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

      // Initial fit
      map.fitBounds(fitBounds as unknown as L.LatLngBoundsExpression, {
        padding: [16, 16],
        animate: false,
      });

      const invalidateAndFit = () => {
        map.invalidateSize({ animate: false });
        const b = boundsForEntries(entries);
        map.fitBounds(b as unknown as L.LatLngBoundsExpression, {
          padding: [16, 16],
          animate: false,
        });
      };
      requestAnimationFrame(invalidateAndFit);
      const t1 = window.setTimeout(invalidateAndFit, 120);
      const t2 = window.setTimeout(invalidateAndFit, 400);

      let ro: ResizeObserver | null = null;
      if (ref.current && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(invalidateAndFit);
        ro.observe(ref.current);
      }

      (map as unknown as { _cpCleanup?: () => void })._cpCleanup = () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        ro?.disconnect();
      };

      setReady(true);
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
    // We intentionally only set this up once — entries are wired in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render overlay (markers + connector polyline) whenever entries change
  // — and ALSO once the map first becomes ready (otherwise the first entries
  // arrive before the map exists and never re-render).
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = LRef.current;
    const group = overlayRef.current;
    if (!map || !L || !group) return;
    group.clearLayers();

    const ordered = entries.slice().sort((a, b) => a.at - b.at);

    if (ordered.length > 1) {
      const latlngs: LatLngTuple[] = ordered.map((e) => [
        e.card.location.lat,
        e.card.location.lng,
      ]);
      L.polyline(latlngs, {
        color: "#0a0a0a",
        opacity: 0.45,
        weight: 1.8,
        dashArray: "5 5",
        interactive: false,
      }).addTo(group);
    }

    ordered.forEach((e, i) => {
      const inner = cardColor(e.card);
      // Outer ring used to come from the category; we now use ink for a
      // clean, editorial look that reads against any tile palette.
      const outer = "#0a0a0a";
      const html = `
        <div style="position:relative; pointer-events:none;">
          <div style="
            width:12px; height:12px; border-radius:50%;
            background:${inner};
            border: 3px solid ${outer};
            box-shadow: 0 0 0 2px #ffffff;
            transform: translate(-9px, -9px);
          "></div>
          <span style="
            position:absolute; top:-18px; left:10px;
            font-family:'JetBrains Mono', ui-monospace, monospace;
            font-size:10px; font-weight:600; color:#0a0a0a;
            white-space:nowrap;
            text-shadow: 0 0 3px #fff, 0 0 3px #fff;
          ">${i + 1}</span>
        </div>`;
      const icon = L.divIcon({
        className: "",
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([e.card.location.lat, e.card.location.lng], {
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(group);
    });

    // Always refit to the entries' actual bounds when they change.
    map.invalidateSize({ animate: false });
    map.fitBounds(fitBounds as unknown as L.LatLngBoundsExpression, {
      padding: [16, 16],
      animate: false,
    });
  }, [entries, ready, fitBounds]);

  return (
    <div
      className={`relative bg-paper overflow-hidden ${className}`}
      style={{ aspectRatio: aspect, maxHeight: "min(70vh, 520px)" }}
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
