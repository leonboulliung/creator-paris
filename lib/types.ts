export type Permission = "public" | "request";

export interface CardLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface Profile {
  id: string;            // Clerk user ID, e.g. "user_2abc..."
  phone: string | null;  // E.164 from Clerk, may be null if not yet synced
  displayName: string;
  avatarUrl: string | null;
  createdAt: number;
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
  createdAt: number;
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
