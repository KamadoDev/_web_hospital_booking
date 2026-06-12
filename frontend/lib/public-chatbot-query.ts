"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ChatbotSettings } from "@/lib/types";

export const fetchPublicChatbotSettings = () =>
  apiRequest<ChatbotSettings>("/chatbot/settings");

export function usePublicChatbotSettings() {
  return useQuery({
    queryKey: queryKeys.publicChatbotSettings,
    queryFn: fetchPublicChatbotSettings,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
