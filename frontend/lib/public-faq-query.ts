"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PublicFAQ } from "@/lib/types";

export const fetchPublicFAQs = async (category?: string) => {
  const result = await apiRequest<{ items: PublicFAQ[] }>("/faqs", {
    query: { category: category || undefined },
  });

  return result.items || [];
};

export function usePublicFAQs(category: string, initialFAQs: PublicFAQ[] = [], initialCategory = "") {
  return useQuery({
    queryKey: queryKeys.publicFAQs({ category: category || undefined }),
    queryFn: () => fetchPublicFAQs(category || undefined),
    initialData: category === initialCategory ? initialFAQs : undefined,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
