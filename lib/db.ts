import { supabase } from "./supabase";
import type { Card, CardJoiner, CardRequest, Profile, Socials, TrackEntry } from "./types";

// ============================================================
// Row → TS mapping (DB uses snake_case; UI uses camelCase)
// ============================================================

type ProfileRow = {
  id: string;
  phone: string | null;
  display_name: string;
  avatar_url: string | null;
  socials: Socials | null;
  interests: string[] | null;
  created_at: string;
};

type JoinerRow = {
  user_id: string;
  role: string;
  joined_at: string;
  user: ProfileRow | null;
};

type RequestRow = {
  user_id: string;
  requested_at: string;
  user: ProfileRow | null;
};

type CardRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; label: string };
  spots: number;
  permission: "public" | "request";
  tags: string[] | null;
  color: string | null;
  created_at: string;
  expires_at: string;
  duration_days: number;
  archived: boolean;
  owner: ProfileRow | null;
  joiners: JoinerRow[] | null;
  requests: RequestRow[] | null;
};

const blankProfile = (id: string): Profile => ({
  id,
  phone: null,
  displayName: `paris-${id.slice(-4) || "0000"}`,
  avatarUrl: null,
  socials: null,
  interests: null,
  createdAt: 0,
});

function mapProfile(row: ProfileRow | null, fallbackId = ""): Profile {
  if (!row) return blankProfile(fallbackId);
  return {
    id: row.id,
    phone: row.phone,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    socials: row.socials ?? null,
    interests: row.interests ?? null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}

function mapJoiner(row: JoinerRow): CardJoiner {
  return {
    userId: row.user_id,
    role: row.role || "",
    joinedAt: new Date(row.joined_at).getTime(),
    user: mapProfile(row.user, row.user_id),
  };
}

function mapRequest(row: RequestRow): CardRequest {
  return {
    userId: row.user_id,
    requestedAt: new Date(row.requested_at).getTime(),
    user: mapProfile(row.user, row.user_id),
  };
}

function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    ownerId: row.owner_id,
    owner: mapProfile(row.owner, row.owner_id),
    title: row.title,
    description: row.description || "",
    location: row.location,
    spots: row.spots,
    permission: row.permission,
    tags: Array.isArray(row.tags) ? row.tags : [],
    color: row.color ?? null,
    createdAt: new Date(row.created_at).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
    durationDays: row.duration_days,
    archived: row.archived,
    joiners: (row.joiners || []).map(mapJoiner),
    requests: (row.requests || []).map(mapRequest),
  };
}

const CARD_SELECT = `
  id, owner_id, title, description, location, spots, permission, tags, color,
  created_at, expires_at, duration_days, archived,
  owner:profiles!cards_owner_id_fkey(id, phone, display_name, avatar_url, socials, interests, created_at),
  joiners:joiners(user_id, role, joined_at,
    user:profiles!joiners_user_id_fkey(id, phone, display_name, avatar_url, socials, interests, created_at)
  ),
  requests:join_requests(user_id, requested_at,
    user:profiles!join_requests_user_id_fkey(id, phone, display_name, avatar_url, socials, interests, created_at)
  )
`;

// ============================================================
// Queries (read-only — go through anon key from client)
// ============================================================

export async function fetchActiveCards(): Promise<Card[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_SELECT)
    .eq("archived", false)
    .gt("expires_at", nowIso) // expires_at column now holds the event start time
    .order("expires_at", { ascending: true });
  if (error) throw error;
  return ((data || []) as unknown as CardRow[])
    .map(mapCard)
    // Hide cards from public view once their crew is full.
    .filter((c) => c.joiners.length < c.spots);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, phone, display_name, avatar_url, socials, interests, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as unknown as ProfileRow) : null;
}

export async function fetchCardById(id: string): Promise<Card | null> {
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCard(data as unknown as CardRow) : null;
}

export async function fetchCardsByOwner(ownerId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown as CardRow[]).map(mapCard);
}

export async function fetchTrackRecord(userId: string): Promise<TrackEntry[]> {
  // Two queries in parallel: cards I created + cards I joined.
  const [{ data: created }, { data: joined }] = await Promise.all([
    supabase.from("cards").select(CARD_SELECT).eq("owner_id", userId),
    supabase
      .from("joiners")
      .select(`role, joined_at, card:cards(${CARD_SELECT})`)
      .eq("user_id", userId),
  ]);

  const entries: TrackEntry[] = [];

  for (const row of (created || []) as unknown as CardRow[]) {
    const card = mapCard(row);
    entries.push({ card, role: "CREATOR", at: card.createdAt, isCreator: true });
  }

  for (const row of (joined || []) as unknown as {
    role: string;
    joined_at: string;
    card: CardRow | null;
  }[]) {
    if (!row.card) continue;
    const card = mapCard(row.card);
    entries.push({
      card,
      role: (row.role || "JOINER").toUpperCase(),
      at: new Date(row.joined_at).getTime(),
      isCreator: false,
    });
  }

  return entries.sort((a, b) => b.at - a.at);
}
