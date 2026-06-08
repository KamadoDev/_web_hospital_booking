"use client";

import { useEffect, useState } from "react";
import { PublicHomeView } from "@/components/public/public-home-view";
import type { HomeSelection, PublicHomeData } from "@/components/public/public-home-types";

const initialSelection: HomeSelection = {
  departmentId: "",
  doctorId: "",
  packageId: "",
};

export function PublicHomeClient({ data, error = "" }: { data: PublicHomeData; error?: string }) {
  const [selection, setSelection] = useState<HomeSelection>(initialSelection);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const doctorId = params.get("doctorId") || "";
      const packageId = params.get("packageId") || "";
      const requestedDepartmentId = params.get("departmentId") || "";
      const doctorDepartmentId = data.doctors.find((doctor) => doctor.id === doctorId)?.department.id || "";
      const packageDepartmentId = data.packages.find((item) => item.id === packageId)?.department?.id || "";
      const departmentId = doctorDepartmentId || requestedDepartmentId || packageDepartmentId;

      if (!departmentId && !doctorId && !packageId) return;

      setSelection({
        departmentId,
        doctorId,
        packageId,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [data.doctors, data.packages]);

  return (
    <PublicHomeView
      data={data}
      loading={false}
      error={error}
      selection={selection}
      setSelection={setSelection}
    />
  );
}
