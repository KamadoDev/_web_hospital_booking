"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  ChatbotFAQ,
  ChatbotLog,
  ChatbotOverview,
  ChatbotSession,
  ChatbotSessionDetail,
  ChatbotSettings,
  ListResult,
} from "@/lib/types";

export type DashboardChatbotOverviewFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type DashboardChatbotFAQFilters = {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
};

export type DashboardChatbotSessionFilters = {
  search?: string;
  guestPhone?: string;
  intent?: string;
  state?: string;
  isActive?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type DashboardChatbotLogFilters = {
  search?: string;
  sessionId?: string;
  guestPhone?: string;
  intent?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export const fetchDashboardChatbotOverview = (
  filters: DashboardChatbotOverviewFilters = {},
) =>
  apiRequest<ChatbotOverview>("/dashboard/chatbot/overview", {
    query: filters,
  });

export const fetchDashboardChatbotSettings = () =>
  apiRequest<ChatbotSettings>("/dashboard/chatbot/settings");

export const fetchDashboardChatbotFAQs = (
  filters: DashboardChatbotFAQFilters,
) =>
  apiRequest<ListResult<ChatbotFAQ>>("/dashboard/chatbot/faqs", {
    query: filters,
  });

export const fetchDashboardChatbotSessions = (
  filters: DashboardChatbotSessionFilters,
) =>
  apiRequest<ListResult<ChatbotSession>>("/dashboard/chatbot/sessions", {
    query: filters,
  });

export const fetchDashboardChatbotSession = (id: string) =>
  apiRequest<ChatbotSessionDetail>(`/dashboard/chatbot/sessions/${id}`);

export const fetchDashboardChatbotLogs = (
  filters: DashboardChatbotLogFilters,
) =>
  apiRequest<ListResult<ChatbotLog>>("/dashboard/chatbot/logs", {
    query: filters,
  });

export function useDashboardChatbotOverview(
  filters: DashboardChatbotOverviewFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboardChatbotOverview(filters),
    queryFn: () => fetchDashboardChatbotOverview(filters),
    enabled,
  });
}

export function useDashboardChatbotSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardChatbotSettings,
    queryFn: fetchDashboardChatbotSettings,
    enabled,
  });
}

export function useDashboardChatbotFAQs(
  filters: DashboardChatbotFAQFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboardChatbotFAQs(filters),
    queryFn: () => fetchDashboardChatbotFAQs(filters),
    enabled,
  });
}

export function useDashboardChatbotSessions(
  filters: DashboardChatbotSessionFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboardChatbotSessions(filters),
    queryFn: () => fetchDashboardChatbotSessions(filters),
    enabled,
  });
}

export function useDashboardChatbotSession(id?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardChatbotSession(id),
    queryFn: () => fetchDashboardChatbotSession(id || ""),
    enabled: Boolean(id),
  });
}

export function useDashboardChatbotLogs(
  filters: DashboardChatbotLogFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboardChatbotLogs(filters),
    queryFn: () => fetchDashboardChatbotLogs(filters),
    enabled,
  });
}
