"use client";

import { useEffect, useState } from "react";
import { PublicHomeView } from "@/components/public/public-home-view";
import {
  emptyHomeData,
  type HomeSelection,
  type PublicDepartment,
  type PublicHomeData,
} from "@/components/public/public-home-types";
import { apiRequest } from "@/lib/api";
import type {
  Banner,
  DoctorProfile,
  MedicalPackage,
  PublicFAQ,
  SiteSettingsValue,
} from "@/lib/types";

const initialSelection: HomeSelection = {
  departmentId: "",
  doctorId: "",
  packageId: "",
};

const getInitialSelectionFromUrl = (): HomeSelection => {
  if (typeof window === "undefined") return initialSelection;

  const params = new URLSearchParams(window.location.search);

  return {
    departmentId: params.get("departmentId") || "",
    doctorId: params.get("doctorId") || "",
    packageId: params.get("packageId") || "",
  };
};

export default function PublicHomePage() {
  const [data, setData] = useState<PublicHomeData>(emptyHomeData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<HomeSelection>(initialSelection);

  useEffect(() => {
    let active = true;

    const loadHome = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          settings,
          heroBanners,
          promoBanners,
          departments,
          doctors,
          packages,
          faqs,
        ] = await Promise.all([
          apiRequest<SiteSettingsValue>("/site-settings"),
          apiRequest<{ items: Banner[] }>("/banners", { query: { position: "HOME_HERO" } }),
          apiRequest<{ items: Banner[] }>("/banners", { query: { position: "HOME_PROMO" } }),
          apiRequest<PublicDepartment[]>("/departments"),
          apiRequest<DoctorProfile[]>("/doctors"),
          apiRequest<MedicalPackage[]>("/packages"),
          apiRequest<{ items: PublicFAQ[] }>("/faqs"),
        ]);

        if (!active) return;

        setData({
          settings,
          heroBanners: heroBanners.items || [],
          promoBanners: promoBanners.items || [],
          departments,
          doctors,
          packages,
          faqs: faqs.items || [],
        });
        setSelection((current) => ({ ...current, ...getInitialSelectionFromUrl() }));
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Không tải được dữ liệu website");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadHome();

    return () => {
      active = false;
    };
  }, []);

  return (
    <PublicHomeView
      data={data}
      loading={loading}
      error={error}
      selection={selection}
      setSelection={setSelection}
    />
  );
}
