"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardUser, DoctorProfile, ListResult } from "@/lib/types";

export type DashboardDoctorFilters = {
  search?: string;
  departmentId?: string;
  isAvailable?: string;
  page?: number;
  limit?: number;
};

export type DashboardDoctorUserFilters = {
  role?: string;
  isActive?: string;
  page?: number;
  limit?: number;
};

export const fetchDashboardDoctors = (filters: DashboardDoctorFilters) =>
  apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
    query: filters,
  });

export const fetchDashboardDoctorUsers = (
  filters: DashboardDoctorUserFilters,
) =>
  apiRequest<ListResult<DashboardUser>>("/dashboard/users", {
    query: filters,
  });

export function useDashboardDoctors(filters: DashboardDoctorFilters) {
  return useQuery({
    queryKey: queryKeys.dashboardDoctors(filters),
    queryFn: () => fetchDashboardDoctors(filters),
  });
}

export function useDashboardDoctorUsers(
  filters: DashboardDoctorUserFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.dashboardUsers(filters),
    queryFn: () => fetchDashboardDoctorUsers(filters),
    enabled,
  });
}
