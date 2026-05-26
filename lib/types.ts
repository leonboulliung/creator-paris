export type Permission = "public" | "request";

export interface CardLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface Socials {
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  site?: string;
}

export interface Profile {
  id: string;            // Clerk user ID, e.g. "user_2abc..."
  phone: string | null;  // E.164 from Clerk, may be null if not yet synced
  displayName: string;   // user-picked handle, e.g. "leonparis"
  avatarUrl: string | null;
  socials: Socials | null;
  interests: string[] | null;
  createdAt: number;
  /** Last time the user changed their `displayName`. Drives the 7-day cooldown. */
  usernameChangedAt?: number | null;
}

export interface CardJoiner {
  userId: string;
  role: string;
  joinedAt: number;
  user: Profile;
}

export interface CardRequest {
  userId: string;
  requestedAt: number;
  user: Profile;
}

export interface Card {
  id: string;
  ownerId: string;
  owner: Profile;
  title: string;
  description: string;
  location: CardLocation;
  spots: number;
  permission: Permission;
  /** Author-picked category. Falls back to title-derived activity when null. */
  category: string | null;
  /** Author-picked color. Drives the dominant visual (strip, pin, hero). */
  color: string | null;
  createdAt: number;
  /** Repurposed column: when the event actually starts. */
  expiresAt: number;
  durationDays: number;
  archived: boolean;
  joiners: CardJoiner[];
  requests: CardRequest[];
}

export interface TrackEntry {
  card: Card;
  role: string;
  at: number;
  isCreator: boolean;
}
