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
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("cp-realtime")
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
