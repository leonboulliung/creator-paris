"use client";

import { useEffect } from "react";
import { supabase, supabaseConfigured } from "./supabase";

/**
 * Subscribe to any insert/update/delete on cards, joiners or join_requests
 * and run `refresh` whenever anything changes. Cheap re-fetch — fine at MVP scale.
 * No-op when Supabase env vars are missing, so the page still renders.
 */
export function useRealtimeCards(refresh: () => void) {
  useEffect(() => {
    if (!supabaseConfigured) return;
    // Each hook instance needs its OWN channel — Supabase's channel(name)
    // returns the same instance for the same name, and after .subscribe()
    // is called you can't add new .on() listeners. Multiple components
    // calling this hook would otherwise collide on the second mount.
    const channelName = `cp-realtime-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cards" },
          () => !cancelled && refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "joiners" },
          () => !cancelled && refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "join_requests" },
          () => !cancelled && refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "signals" },
          () => !cancelled && refresh(),
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[creator.paris] Realtime subscribe failed", e);
    }

    return () => {
      cancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch { /* noop */ }
      }
    };
  }, [refresh]);
}
