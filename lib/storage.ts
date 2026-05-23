"use client";

import type { Card, TrackEntry, User } from "./types";

// Bump this to force a clean state across all clients.
export const STORAGE_VERSION = 4;

const NS = "cp";
const k = (key: string) => `${NS}:v${STORAGE_VERSION}:${key}`;
const VERSION_KEY = `${NS}:version`;

const CARDS_KEY = k("cards");
const USER_KEY = k("user");

// --- in-window pub/sub bus ---
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const l of listeners) {
    try { l(); } catch { /* noop */ }
  }
}

// --- migration ---
export function ensureMigrated() {
  if (typeof window === "undefined") return;
  const cur = window.localStorage.getItem(VERSION_KEY);
  if (cur !== String(STORAGE_VERSION)) {
    // wipe everything in our namespace
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${NS}:`)) toDelete.push(key);
    }
    toDelete.forEach((kk) => window.localStorage.removeItem(kk));
    window.localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

// --- generic helpers ---
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emit();
}

// --- cross-tab listener (call once at app root) ---
let crossTabBound = false;
export function bindCrossTab() {
  if (typeof window === "undefined" || crossTabBound) return;
  crossTabBound = true;
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    if (e.key.startsWith(`${NS}:`)) emit();
  });
}

// --- cards ---
export function getCards(): Card[] {
  return readJSON<Card[]>(CARDS_KEY, []);
}

/**
 * Auto-archive every card whose expiresAt has passed.
 * Returns true if anything changed. Safe to call frequently.
 */
export function sweepExpired(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  const cards = getCards();
  let changed = false;
  for (const c of cards) {
    if (!c.archived && typeof c.expiresAt === "number" && c.expiresAt <= now) {
      c.archived = true;
      changed = true;
    }
  }
  if (changed) saveCards(cards);
  return changed;
}

export function getActiveCards(): Card[] {
  const now = Date.now();
  return getCards()
    .filter((c) => !c.archived && (c.expiresAt ?? Infinity) > now)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getCardById(id: string): Card | undefined {
  return getCards().find((c) => c.id === id);
}

export function getCardsByOwner(email: string): Card[] {
  return getCards().filter((c) => c.ownerEmail === email).sort((a, b) => b.createdAt - a.createdAt);
}

export function getActiveCardByOwner(email: string): Card | undefined {
  const now = Date.now();
  return getCards().find(
    (c) => c.ownerEmail === email && !c.archived && (c.expiresAt ?? Infinity) > now,
  );
}

export function saveCards(cards: Card[]) {
  writeJSON(CARDS_KEY, cards);
}

export function upsertCard(card: Card) {
  const cards = getCards();
  const idx = cards.findIndex((c) => c.id === card.id);
  if (idx >= 0) cards[idx] = card;
  else cards.push(card);
  saveCards(cards);
}

export function archiveActiveFor(email: string) {
  const cards = getCards();
  let changed = false;
  for (const c of cards) {
    if (c.ownerEmail === email && !c.archived) {
      c.archived = true;
      changed = true;
    }
  }
  if (changed) saveCards(cards);
}

export function deleteCard(id: string) {
  const cards = getCards().filter((c) => c.id !== id);
  saveCards(cards);
}

export function joinCard(id: string, email: string) {
  const cards = getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  if (card.permission === "public") {
    if (!card.joiners.includes(email) && card.joiners.length < card.spots) {
      card.joiners.push(email);
      card.joinedAt = { ...(card.joinedAt || {}), [email]: Date.now() };
    }
  } else {
    if (!card.requests.some((r) => r.email === email) && !card.joiners.includes(email)) {
      card.requests.push({ email, at: Date.now() });
    }
  }
  saveCards(cards);
}

export function acceptRequest(id: string, email: string) {
  const cards = getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  card.requests = card.requests.filter((r) => r.email !== email);
  if (!card.joiners.includes(email) && card.joiners.length < card.spots) {
    card.joiners.push(email);
    card.joinedAt = { ...(card.joinedAt || {}), [email]: Date.now() };
  }
  saveCards(cards);
}

/** Only the card owner should call this. Clears the entry if role is empty. */
export function setJoinerRole(id: string, email: string, role: string) {
  const cards = getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  const trimmed = role.trim().slice(0, 40);
  const roles = { ...(card.roles || {}) };
  if (!trimmed) delete roles[email];
  else roles[email] = trimmed;
  card.roles = roles;
  saveCards(cards);
}

/** Remove a joiner. Both creator and the joiner themselves can call this. */
export function removeJoiner(id: string, email: string) {
  const cards = getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  card.joiners = card.joiners.filter((e) => e !== email);
  if (card.joinedAt) {
    const j = { ...card.joinedAt };
    delete j[email];
    card.joinedAt = j;
  }
  if (card.roles) {
    const r = { ...card.roles };
    delete r[email];
    card.roles = r;
  }
  saveCards(cards);
}

/**
 * Build the chronological participation history for an email — across cards
 * they created and cards they joined. Newest first.
 */
export function getTrackRecord(email: string): TrackEntry[] {
  const entries: TrackEntry[] = [];
  for (const c of getCards()) {
    if (c.ownerEmail === email) {
      entries.push({ card: c, role: "CREATOR", at: c.createdAt, isCreator: true });
    } else if (c.joiners.includes(email)) {
      const role = c.roles?.[email]?.trim() || "JOINER";
      const at = c.joinedAt?.[email] ?? c.createdAt;
      entries.push({ card: c, role: role.toUpperCase(), at, isCreator: false });
    }
  }
  return entries.sort((a, b) => b.at - a.at);
}

export function declineRequest(id: string, email: string) {
  const cards = getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  card.requests = card.requests.filter((r) => r.email !== email);
  saveCards(cards);
}

// --- user ---
export function getUser(): User | null {
  return readJSON<User | null>(USER_KEY, null);
}

export function setUser(u: User) {
  writeJSON(USER_KEY, u);
}

export function updateAvatar(dataUrl: string) {
  const u = getUser();
  if (!u) return;
  u.avatar = dataUrl;
  setUser(u);
  // propagation: ownership is by email; render reads user.avatar at render time.
  // we still emit so all listeners refresh.
  emit();
}

export function clearAll() {
  if (typeof window === "undefined") return;
  const toDelete: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(`${NS}:`)) toDelete.push(key);
  }
  toDelete.forEach((kk) => window.localStorage.removeItem(kk));
  emit();
}

// --- helpers ---
export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
