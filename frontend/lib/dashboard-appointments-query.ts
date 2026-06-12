"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Appointment, DoctorProfile, ListResult } from "@/lib/types";

export type DashboardAppointmentFilters = {
  status?: string;
  doctorId?: string;
  date?: string;
  phone?: string;
  bookingCode?: string;
  page?: number;
  limit?: number;
};

export type DashboardAppointmentDoctorFilters = {
  page?: number;
  limit?: number;
};

export const fetchDashboardAppointments = (filters: DashboardAppointmentFilters) =>
  apiRequest<ListResult<Appointment>>("/dashboard/appointments", {
    query: filters,
  });

export const fetchDashboardAppointmentDoctors = (filters: DashboardAppointmentDoctorFilters) =>
  apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
    query: filters,
  });

export function useDashboardAppointments(filters: DashboardAppointmentFilters) {
  return useQuery({
    queryKey: queryKeys.dashboardAppointments(filters),
    queryFn: () => fetchDashboardAppointments(filters),
  });
}

export function useDashboardAppointmentDoctors(filters: DashboardAppointmentDoctorFilters, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dashboardDoctors(filters),
    queryFn: () => fetchDashboardAppointmentDoctors(filters),
    enabled,
  });
}
