"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  Appointment,
  DashboardAppointmentStatistics,
  DashboardDepartmentStatistics,
  DashboardDoctorStatistics,
  DashboardRevenueStatistics,
  DashboardStatisticsOverview,
  DoctorTimeSlot,
  ListResult,
  MedicalRecord,
  Prescription,
} from "@/lib/types";

export type DashboardStatisticsFilters = {
  from?: string;
  to?: string;
};

export type DashboardStatisticsData = {
  overview: DashboardStatisticsOverview;
  appointments: DashboardAppointmentStatistics;
  revenue: DashboardRevenueStatistics;
  doctors: DashboardDoctorStatistics;
  departments: DashboardDepartmentStatistics;
};

export type DoctorDashboardData = {
  todayAppointments: Appointment[];
  checkedInAppointments: Appointment[];
  inProgressAppointments: Appointment[];
  draftRecords: MedicalRecord[];
  draftPrescriptions: Prescription[];
  todaySlots: DoctorTimeSlot[];
};

export const fetchDashboardStatistics = async (filters: DashboardStatisticsFilters): Promise<DashboardStatisticsData> => {
  const [overview, appointments, revenue, doctors, departments] = await Promise.all([
    apiRequest<DashboardStatisticsOverview>("/dashboard/statistics/overview", { query: filters }),
    apiRequest<DashboardAppointmentStatistics>("/dashboard/statistics/appointments", { query: filters }),
    apiRequest<DashboardRevenueStatistics>("/dashboard/statistics/revenue", { query: filters }),
    apiRequest<DashboardDoctorStatistics>("/dashboard/statistics/doctors", { query: filters }),
    apiRequest<DashboardDepartmentStatistics>("/dashboard/statistics/departments", { query: filters }),
  ]);

  return { overview, appointments, revenue, doctors, departments };
};

export const fetchDoctorDashboardOverview = async (date: string): Promise<DoctorDashboardData> => {
  const [
    todayAppointments,
    checkedInAppointments,
    inProgressAppointments,
    draftRecords,
    draftPrescriptions,
    todaySlots,
  ] = await Promise.all([
    apiRequest<ListResult<Appointment>>("/dashboard/appointments", { query: { date, limit: 100 } }),
    apiRequest<ListResult<Appointment>>("/dashboard/appointments", { query: { status: "CHECKED_IN", limit: 20 } }),
    apiRequest<ListResult<Appointment>>("/dashboard/appointments", { query: { status: "IN_PROGRESS", limit: 20 } }),
    apiRequest<ListResult<MedicalRecord>>("/dashboard/medical-records", { query: { status: "DRAFT", limit: 20 } }),
    apiRequest<ListResult<Prescription>>("/dashboard/prescriptions", { query: { status: "DRAFT", limit: 20 } }),
    apiRequest<ListResult<DoctorTimeSlot>>("/dashboard/doctor-time-slots", { query: { date, limit: 200 } }),
  ]);

  return {
    todayAppointments: todayAppointments.items,
    checkedInAppointments: checkedInAppointments.items,
    inProgressAppointments: inProgressAppointments.items,
    draftRecords: draftRecords.items,
    draftPrescriptions: draftPrescriptions.items,
    todaySlots: todaySlots.items,
  };
};

export function useDashboardStatistics(filters: DashboardStatisticsFilters, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dashboardStatistics(filters),
    queryFn: () => fetchDashboardStatistics(filters),
    enabled,
  });
}

export function useDoctorDashboardOverview(date: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dashboardDoctorOverview({ date }),
    queryFn: () => fetchDoctorDashboardOverview(date),
    enabled,
  });
}
