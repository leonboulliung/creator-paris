"use client";

import type { Card } from "./types";
import { computeVibe } from "./vibe";
import { PARIS_BOUNDS } from "./quartiers";
import { parisHourOf } from "./time";

const W = 1080;
const H = 1350;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawVibeHero(ctx: CanvasRenderingContext2D, card: Card, height: number) {
  const v = computeVibe({
    title: card.title,
    label: card.location.label,
    hour: parisHourOf(card.createdAt),
  });
  // sky linear gradient
  const angleRad = (v.angle - 90) * (Math.PI / 180);
  // construct a linear gradient roughly along angle
  const cx = W / 2;
  const cy = height / 2;
  const r = Math.max(W, height);
  const x0 = cx - Math.cos(angleRad) * r;
  const y0 = cy - Math.sin(angleRad) * r;
  const x1 = cx + Math.cos(angleRad) * r;
  const y1 = cy + Math.sin(angleRad) * r;
  const sky = ctx.createLinearGradient(x0, y0, x1, y1);
  sky.addColorStop(0, v.sky.top);
  sky.addColorStop(0.55, v.sky.mid);
  sky.addColorStop(1, v.sky.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, height);

  // sun radial
  const sunX = v.sun.x * W;
  const sunY = v.sun.y * height;
  const sunR = (v.sun.size / 100) * W;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sun.addColorStop(0, v.sun.color);
  sun.addColorStop(0.18, v.sun.color);
  sun.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, height);

  // accent wash from bottom
  const wash = ctx.createRadialGradient(W / 2, height * 1.2, 0, W / 2, height * 1.2, W * 0.9);
  wash.addColorStop(0, v.accent + "AA");
  wash.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, height);

  // stars if night
  if (v.isNight) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    const seed = card.id.charCodeAt(0) || 7;
    for (let i = 0; i < 70; i++) {
      const sx = ((Math.sin(seed + i * 12.9) + 1) / 2) * W;
      const sy = ((Math.cos(seed + i * 47.1) + 1) / 2) * height * 0.85;
      const sr = 0.6 + ((i * 13) % 7) * 0.18;
      ctx.globalAlpha = 0.4 + ((i * 7) % 6) * 0.1;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // film grain noise (subtle)
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * W;
    const y = Math.random() * height;
    ctx.fillStyle = Math.random() > 0.5 ? "#000" : "#fff";
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = t;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // background
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  // grid lines (very faint)
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w * i) / 6, y);
    ctx.lineTo(x + (w * i) / 6, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + (h * i) / 6);
    ctx.lineTo(x + w, y + (h * i) / 6);
    ctx.stroke();
  }

  // stylized Seine curve
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.62);
  ctx.bezierCurveTo(
    x + w * 0.25, y + h * 0.5,
    x + w * 0.55, y + h * 0.72,
    x + w, y + h * 0.58,
  );
  ctx.stroke();

  // map pin position from lat/lng within bounds
  const [[minLat, minLng], [maxLat, maxLng]] = PARIS_BOUNDS;
  const nx = (card.location.lng - minLng) / (maxLng - minLng);
  const ny = 1 - (card.location.lat - minLat) / (maxLat - minLat);
  const px = x + 6 + Math.max(0, Math.min(1, nx)) * (w - 12);
  const py = y + 6 + Math.max(0, Math.min(1, ny)) * (h - 12);

  // pulse ring
  ctx.fillStyle = "rgba(10,10,10,0.15)";
  ctx.beginPath();
  ctx.arc(px, py, 18, 0, Math.PI * 2);
  ctx.fill();

  // pin
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(px, py, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  avatar: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.clip();
  if (avatar) {
    ctx.drawImage(avatar, x, y, size, size);
  } else {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
  // ring
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

export async function renderShareImage(card: Card, avatarDataUrl?: string): Promise<Blob> {
  // ensure web fonts are available so canvas measures the right widths
  try {
    const d = document as Document & { fonts?: FontFaceSet };
    if (d.fonts) await d.fonts.ready;
  } catch { /* noop */ }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  // background base
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, W, H);

  // vibe hero (top ~58%)
  const heroH = Math.round(H * 0.58);
  drawVibeHero(ctx, card, heroH);

  // top wordmark
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  ctx.textBaseline = "top";
  ctx.fillText("CREATOR.PARIS", 48, 48);

  // activity tag top-right
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  const tag = card.permission === "public" ? "JOIN" : "REQUEST";
  ctx.textAlign = "right";
  ctx.fillText(tag, W - 48, 48);
  ctx.textAlign = "left";

  // bottom area on hero — avatar + title
  const avatar = avatarDataUrl ? await loadImage(avatarDataUrl).catch(() => null) : null;
  const avSize = 88;
  const avX = 48;
  const avY = heroH - avSize - 36;
  drawAvatar(ctx, avatar, avX, avY, avSize);

  ctx.fillStyle = "#0a0a0a";
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(card.owner.displayName, avX + avSize + 22, avY + avSize / 2 + 8);

  // bottom panel: title + meta + minimap
  const panelY = heroH;
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, panelY, W, H - panelY);

  // hairline
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, panelY);
  ctx.lineTo(W - 48, panelY);
  ctx.stroke();

  // title — massive black
  ctx.fillStyle = "#0a0a0a";
  let size = 96;
  ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
  let lines = wrapText(ctx, card.title, W - 96);
  while (lines.length > 3 && size > 56) {
    size -= 6;
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
    lines = wrapText(ctx, card.title, W - 96);
  }
  let ty = panelY + 38 + size * 0.85;
  for (const ln of lines.slice(0, 3)) {
    ctx.fillText(ln, 48, ty);
    ty += size * 0.95;
  }

  // meta
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#0a0a0a";
  const meta1 = card.location.label.toUpperCase();
  const expiryStr = card.expiresAt
    ? new Date(card.expiresAt)
        .toLocaleString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
        .toUpperCase()
    : "";
  const meta2 = `STARTS ${expiryStr}  ·  ${card.joiners.length}/${card.spots} SPOTS`;
  ctx.fillText(meta1, 48, ty + 24);
  ctx.fillText(meta2, 48, ty + 56);

  // mini-map bottom-left
  const mmSize = 240;
  const mmX = 48;
  const mmY = H - mmSize - 88;
  // shift up if it overlaps meta
  const safeMmY = Math.max(ty + 96, mmY);
  drawMiniMap(ctx, card, mmX, safeMmY, mmSize, mmSize);

  // wordmark bottom-right
  ctx.font = "900 36px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "right";
  ctx.fillText("CREATOR.PARIS", W - 48, H - 56);
  ctx.font = "500 16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#0a0a0a";
  ctx.fillText("ONE THING, THIS WEEK.", W - 48, H - 32);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    );
  });
}

export async function shareCard(card: Card, avatarDataUrl?: string): Promise<"shared" | "downloaded"> {
  const blob = await renderShareImage(card, avatarDataUrl);
  const filename = `creator-paris-${card.id}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: card.title,
        text: `${card.title} — ${card.location.label}`,
      });
      return "shared";
    } catch {
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}

// Carnet poster: stitches together the user's whole pin constellation
export async function renderCarnetPoster(
  cards: { lat: number; lng: number; label: string; title: string; createdAt: number }[],
  email: string,
): Promise<Blob> {
  const PW = 1600;
  const PH = 2000;
  const canvas = document.createElement("canvas");
  canvas.width = PW;
  canvas.height = PH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  // paper
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, PW, PH);

  // header
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "900 64px Inter, system-ui, sans-serif";
  ctx.fillText("CARNET", 96, 140);
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  ctx.fillText(email.toUpperCase(), 96, 178);
  ctx.fillText(`${cards.length} CARDS  ·  PARIS  ·  ${new Date().getFullYear()}`, 96, 210);

  // map area
  const mx = 96, my = 280, mw = PW - 192, mh = PH - 280 - 200;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.strokeRect(mx + 1, my + 1, mw - 2, mh - 2);

  // grid
  ctx.strokeStyle = "#eaeaea";
  ctx.lineWidth = 1;
  for (let i = 1; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(mx + (mw * i) / 16, my);
    ctx.lineTo(mx + (mw * i) / 16, my + mh);
    ctx.stroke();
  }
  for (let i = 1; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(mx, my + (mh * i) / 20);
    ctx.lineTo(mx + mw, my + (mh * i) / 20);
    ctx.stroke();
  }

  // Seine curve
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx, my + mh * 0.58);
  ctx.bezierCurveTo(
    mx + mw * 0.28, my + mh * 0.46,
    mx + mw * 0.58, my + mh * 0.7,
    mx + mw, my + mh * 0.52,
  );
  ctx.stroke();

  const [[minLat, minLng], [maxLat, maxLng]] = PARIS_BOUNDS;

  // connecting lines (chronological trajectory)
  const ordered = [...cards].sort((a, b) => a.createdAt - b.createdAt);
  ctx.strokeStyle = "rgba(10,10,10,0.25)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ordered.forEach((c, i) => {
    const nx = (c.lng - minLng) / (maxLng - minLng);
    const ny = 1 - (c.lat - minLat) / (maxLat - minLat);
    const px = mx + 30 + Math.max(0, Math.min(1, nx)) * (mw - 60);
    const py = my + 30 + Math.max(0, Math.min(1, ny)) * (mh - 60);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // dots
  ordered.forEach((c, i) => {
    const nx = (c.lng - minLng) / (maxLng - minLng);
    const ny = 1 - (c.lat - minLat) / (maxLat - minLat);
    const px = mx + 30 + Math.max(0, Math.min(1, nx)) * (mw - 60);
    const py = my + 30 + Math.max(0, Math.min(1, ny)) * (mh - 60);
    ctx.fillStyle = "rgba(10,10,10,0.12)";
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 14px 'JetBrains Mono', monospace";
    ctx.fillText(`${i + 1}`, px + 14, py - 10);
  });

  // footer
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "900 36px Inter, system-ui, sans-serif";
  ctx.fillText("CREATOR.PARIS — A LIVING CITY LAYER", 96, PH - 96);
  ctx.font = "500 16px 'JetBrains Mono', monospace";
  ctx.fillText("ONE THING, THIS WEEK.", 96, PH - 60);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
  });
}

export async function downloadCarnetPoster(
  cards: { lat: number; lng: number; label: string; title: string; createdAt: number }[],
  email: string,
) {
  const blob = await renderCarnetPoster(cards, email);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-${email.replace(/[^a-z0-9]/gi, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Stitched cards PDF — emitted as a multi-page printable HTML doc (browser print → PDF)
export function exportCarnetPrintable(cards: Card[], email: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const css = `
    @page { size: A4; margin: 12mm; }
    body { font-family: Inter, sans-serif; color: #0a0a0a; background: #fafafa; }
    .card { page-break-after: always; padding: 16mm; border: 2px solid #0a0a0a; margin-bottom: 8mm; }
    .card:last-child { page-break-after: auto; }
    h1 { font-size: 40pt; line-height: .95; letter-spacing: -0.04em; margin: 0 0 8mm; }
    .meta { font-family: 'JetBrains Mono', monospace; font-size: 10pt; letter-spacing: .04em; text-transform: uppercase; }
    .hero { height: 60mm; margin-bottom: 6mm; }
    .desc { font-size: 14pt; line-height: 1.4; }
    .wm { font-family: 'JetBrains Mono', monospace; font-size: 9pt; letter-spacing: .12em; margin-top: 12mm; }
  `;
  const blocks = cards
    .map((c) => {
      const v = computeVibe({
        title: c.title,
        label: c.location.label,
        hour: parisHourOf(c.createdAt),
      });
      const expiryStr = c.expiresAt
        ? new Date(c.expiresAt).toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return `<div class="card">
        <div class="meta">${email.toUpperCase()} · ${new Date(c.createdAt).toISOString().slice(0,10)}</div>
        <div class="hero" style="background:${v.cssBackground}"></div>
        <h1>${escapeHtml(c.title)}</h1>
        <div class="meta">${escapeHtml(c.location.label)} · starts ${escapeHtml(expiryStr)} · ${c.joiners.length}/${c.spots} spots</div>
        <p class="desc">${escapeHtml(c.description || "")}</p>
        <div class="wm">CREATOR.PARIS — ONE THING, THIS WEEK.</div>
      </div>`;
    })
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Carnet — ${escapeHtml(email)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>${css}</style></head><body>${blocks}<script>setTimeout(()=>window.print(),500)</script></body></html>`);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
