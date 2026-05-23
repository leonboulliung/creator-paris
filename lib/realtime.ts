"use client";

import { useEffect } from "react";
import { supabase } from "./supabase";

/**
 * Subscribe to any insert/update/delete on cards, joiners or join_requests
 * and run `refresh` whenever anything changes. Cheap re-fetch — fine at MVP scale.
 */
export function useRealtimeCards(refresh: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("cp-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "joiners" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "join_requests" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);
}
