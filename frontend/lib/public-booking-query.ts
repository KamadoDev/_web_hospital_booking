"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type PublicSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type PublicAvailableSlotFilters = {
  doctorId?: string;
  date?: string;
};

export const fetchPublicAvailableSlots = (filters: Required<PublicAvailableSlotFilters>) =>
  apiRequest<PublicSlot[]>(`/doctors/${filters.doctorId}/available-slots`, {
    query: { date: filters.date },
  });

export function usePublicAvailableSlots(filters: PublicAvailableSlotFilters) {
  return useQuery({
    queryKey: queryKeys.publicAvailableSlots(filters),
    queryFn: () =>
      fetchPublicAvailableSlots({
        doctorId: filters.doctorId || "",
        date: filters.date || "",
      }),
    enabled: Boolean(filters.doctorId && filters.date),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
