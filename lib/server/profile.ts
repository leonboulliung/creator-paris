import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Make sure a Clerk-authenticated user has a matching row in `profiles`.
 * Also keeps avatar / phone in sync with the latest Clerk data.
 * Returns the profile row (snake_case from DB).
 */
export async function ensureProfile(userId: string) {
  const admin = supabaseAdmin();

  const cc = await clerkClient();
  const cu = await cc.users.getUser(userId);

  // Identifier comes from Clerk — we use email now (was phone).
  // The Supabase column is still called `phone` from the original schema;
  // we keep it as a generic identifier string. Cheap migration debt.
  const phone =
    cu.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ||
    cu.emailAddresses?.[0]?.emailAddress ||
    cu.phoneNumbers?.[0]?.phoneNumber ||
    null;
  const avatar = cu.imageUrl || null;

  const { data: existing } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    // Patch any drift (Clerk avatar / phone changed).
    const patch: Record<string, string | null> = {};
    if (existing.phone !== phone) patch.phone = phone;
    if (existing.avatar_url !== avatar) patch.avatar_url = avatar;
    if (Object.keys(patch).length) {
      await admin.from("profiles").update(patch).eq("id", userId);
      return { ...existing, ...patch };
    }
    return existing;
  }

  // Default handle on first creation. The onboarding flow lets the user
  // overwrite this via PATCH /api/profile/me with their chosen username.
  const displayName =
    cu.username ||
    [cu.firstName, cu.lastName].filter(Boolean).join("").toLowerCase().trim() ||
    `paris-${userId.slice(-4)}`;

  const { data: created, error } = await admin
    .from("profiles")
    .insert({
      id: userId,
      phone,
      display_name: displayName,
      avatar_url: avatar,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}
