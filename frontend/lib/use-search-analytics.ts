"use client";

import { useEffect, useRef } from "react";
import { trackPublicSearch, type PublicSearchResponse, type PublicSearchType } from "@/lib/public-search-query";

const TRACK_TTL_MS = 45 * 1000;

export function useSearchAnalytics(input: {
  keyword: string;
  type?: PublicSearchType;
  data?: PublicSearchResponse;
  enabled?: boolean;
}) {
  const trackedRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const keyword = input.keyword.trim();
    if (!input.enabled || keyword.length < 2 || !input.data) return;

    const type = input.type || "all";
    const key = `${keyword.toLowerCase()}::${type}`;
    const now = Date.now();
    const lastTrackedAt = trackedRef.current.get(key) || 0;
    if (now - lastTrackedAt < TRACK_TTL_MS) return;

    trackedRef.current.set(key, now);
    void trackPublicSearch({
      keyword,
      type,
      source: input.data.source,
      resultCount: input.data.items.length,
    }).catch(() => {
      trackedRef.current.delete(key);
    });
  }, [input.data, input.enabled, input.keyword, input.type]);
}
