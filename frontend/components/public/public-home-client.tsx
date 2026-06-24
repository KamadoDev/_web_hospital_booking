"use client";

import { useEffect } from "react";
import { PublicHomeView } from "@/components/public/public-home-view";
import type {
  HomeSelection,
  PublicHomeData,
} from "@/components/public/public-home-types";
import { usePublicBookingStore } from "@/lib/public-booking-store";
import { hasPublicHomeData, usePublicHomeData } from "@/lib/public-home-query";

const initialSelection: HomeSelection = {
  departmentId: "",
  doctorId: "",
  packageId: "",
};

const resolveSelectionFromUrl = (homeData: PublicHomeData): HomeSelection => {
  if (typeof window === "undefined") return initialSelection;

  const params = new URLSearchParams(window.location.search);
  const doctorId = params.get("doctorId") || "";
  const packageId = params.get("packageId") || "";
  const requestedDepartmentId = params.get("departmentId") || "";
  const doctorDepartmentId =
    homeData.doctors.find((doctor) => doctor.id === doctorId)?.department.id ||
    "";
  const packageDepartmentId =
    homeData.packages.find((item) => item.id === packageId)?.department?.id ||
    "";

  return {
    departmentId:
      doctorDepartmentId || requestedDepartmentId || packageDepartmentId,
    doctorId,
    packageId,
  };
};

const toDateInputValue = (value?: string | null) =>
  value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";

const resolveBookingPrefillFromUrl = (homeData: PublicHomeData) => {
  if (typeof window === "undefined")
    return { ...initialSelection, date: "", timeSlotId: "" };

  const params = new URLSearchParams(window.location.search);
  const selection = resolveSelectionFromUrl(homeData);

  return {
    ...selection,
    date: toDateInputValue(params.get("date")),
    timeSlotId: params.get("timeSlotId") || "",
  };
};

export function PublicHomeClient({
  data,
  error = "",
}: {
  data: PublicHomeData;
  error?: string;
}) {
  const hydrateFromUrl = usePublicBookingStore((state) => state.hydrateFromUrl);
  const homeQuery = usePublicHomeData(data);
  const homeData = homeQuery.data || data;
  const queryError =
    homeQuery.error instanceof Error ? homeQuery.error.message : "";
  const displayError = queryError || error;
  const loading =
    homeQuery.isLoading ||
    (homeQuery.isFetching && !hasPublicHomeData(homeData));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const prefill = resolveBookingPrefillFromUrl(homeData);

      if (
        !prefill.departmentId &&
        !prefill.doctorId &&
        !prefill.packageId &&
        !prefill.date &&
        !prefill.timeSlotId
      )
        return;

      hydrateFromUrl(prefill);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [homeData, hydrateFromUrl]);

  return (
    <PublicHomeView data={homeData} loading={loading} error={displayError} />
  );
}
