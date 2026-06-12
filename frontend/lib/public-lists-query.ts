"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PublicDepartment } from "@/components/public/public-home-types";
import type { DoctorProfile, MedicalPackage } from "@/lib/types";

export type PublicDepartmentFilters = {
  search?: string;
};

export type PublicDoctorFilters = {
  search?: string;
  departmentId?: string;
  departmentSlug?: string;
};

export type PublicPackageFilters = {
  search?: string;
  isPopular?: boolean;
};

export const fetchPublicDepartments = (filters: PublicDepartmentFilters = {}) =>
  apiRequest<PublicDepartment[]>("/departments", {
    query: filters,
  });

export const fetchPublicDoctors = (filters: PublicDoctorFilters = {}) =>
  apiRequest<DoctorProfile[]>("/doctors", {
    query: filters,
  });

export const fetchPublicPackages = (filters: PublicPackageFilters = {}) =>
  apiRequest<MedicalPackage[]>("/packages", {
    query: filters,
  });

export function usePublicDepartments(filters: PublicDepartmentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.publicDepartments(filters),
    queryFn: () => fetchPublicDepartments(filters),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function usePublicDoctors(filters: PublicDoctorFilters = {}) {
  return useQuery({
    queryKey: queryKeys.publicDoctors(filters),
    queryFn: () => fetchPublicDoctors(filters),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function usePublicPackages(filters: PublicPackageFilters = {}) {
  return useQuery({
    queryKey: queryKeys.publicPackages(filters),
    queryFn: () => fetchPublicPackages(filters),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
