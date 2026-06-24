"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  AppointmentStatus,
  LabResult,
  PaymentTransaction,
  Prescription,
  PublicAppointmentInvoice,
} from "@/lib/types";

export type DisplayAppointment = {
  id: string;
  bookingCode: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string | null;
  patientName: string;
  patientPhone: string;
  estimatedPrice: number;
  serviceFee: number;
  bhytDiscount: number;
  finalAmount: number;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: {
    id: string;
    title: string | null;
    specialization: string | null;
    user: {
      fullName: string;
      avatar: string | null;
    };
  };
  department: {
    id: string;
    name: string;
    slug: string | null;
  };
  package: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  invoice: PublicAppointmentInvoice | null;
};

export type LookupOtpResponse = {
  phone: string;
  items: DisplayAppointment[];
};

export type PublicAppointmentResult = {
  appointment: Pick<
    DisplayAppointment,
    | "id"
    | "bookingCode"
    | "appointmentDate"
    | "startTime"
    | "endTime"
    | "status"
    | "patientName"
    | "patientPhone"
    | "completedAt"
    | "doctor"
    | "department"
  >;
  medicalRecord: {
    id: string;
    recordCode: string;
    symptoms: string | null;
    diagnosis: string | null;
    treatment: string | null;
    prescription: string | null;
    doctorNotes: string | null;
    status: "PUBLISHED";
    resultPdfUrl: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    labResults: LabResult[];
  } | null;
  prescription: Pick<
    Prescription,
    | "id"
    | "prescriptionCode"
    | "status"
    | "note"
    | "issuedAt"
    | "cancelledAt"
    | "createdAt"
    | "updatedAt"
    | "items"
  > | null;
};

export type AppointmentLookupFilters = {
  bookingCode?: string;
  phone?: string;
};

export const fetchPublicAppointmentLookup = (
  filters: Required<AppointmentLookupFilters>,
) =>
  apiRequest<DisplayAppointment>("/appointments/lookup", {
    query: filters,
  });

export const fetchPublicAppointmentResult = (
  filters: Required<AppointmentLookupFilters>,
) =>
  apiRequest<PublicAppointmentResult>("/appointments/lookup/result", {
    query: filters,
  });

export const fetchPublicPaymentTransaction = (id: string) =>
  apiRequest<PaymentTransaction>(`/payments/${id}`);

export function usePublicAppointmentResult(filters: AppointmentLookupFilters) {
  return useQuery({
    queryKey: queryKeys.publicAppointmentResult(filters),
    queryFn: () =>
      fetchPublicAppointmentResult({
        bookingCode: filters.bookingCode || "",
        phone: filters.phone || "",
      }),
    enabled: Boolean(filters.bookingCode && filters.phone),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function usePublicPaymentTransaction(id?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicPaymentTransaction(id),
    queryFn: () => fetchPublicPaymentTransaction(id || ""),
    enabled: Boolean(enabled && id),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
