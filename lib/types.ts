export type Permission = "public" | "request";

export interface CardLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface JoinRequest {
  email: string;
  at: number;
}

export interface Card {
  id: string;
  ownerEmail: string;
  title: string;
  description: string;
  location: CardLocation;
  spots: number;
  permission: Permission;
  joiners: string[];
  requests: JoinRequest[];
  createdAt: number;
  /** epoch ms when this card auto-archives into its owner's Carnet */
  expiresAt: number;
  /** duration chosen at post time (days) — purely informational */
  durationDays: number;
  archived: boolean;
  /** Custom role label per joiner email — set by the creator. Owner is implicitly "CREATOR". */
  roles?: Record<string, string>;
  /** When each joiner email joined / was accepted (epoch ms). */
  joinedAt?: Record<string, number>;
}

export interface TrackEntry {
  card: Card;
  role: string;
  /** When this person became part of the card (createdAt for creator, joinedAt otherwise). */
  at: number;
  isCreator: boolean;
}

export interface User {
  email: string;
  avatar: string; // data URL
  createdAt: number;
}
