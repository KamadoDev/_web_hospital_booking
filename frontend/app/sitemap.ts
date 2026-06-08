import type { MetadataRoute } from "next";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
};

type PublicDepartment = {
  slug: string | null;
};

type PublicDoctor = {
  id: string;
};

type PublicPackage = {
  slug: string | null;
  id: string;
};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

const route = (
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] => ({
  url: `${siteUrl}${path}`,
  lastModified: new Date(),
  changeFrequency,
  priority,
});

async function fetchPublicData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.data || null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [departments, doctors, packages] = await Promise.all([
    fetchPublicData<PublicDepartment[]>("/departments"),
    fetchPublicData<PublicDoctor[]>("/doctors"),
    fetchPublicData<PublicPackage[]>("/packages"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    route("/", "daily", 1),
    route("/departments", "weekly", 0.85),
    route("/doctors", "weekly", 0.85),
    route("/packages", "weekly", 0.85),
    route("/faqs", "weekly", 0.7),
    route("/guide/booking", "monthly", 0.7),
  ];

  const departmentRoutes =
    departments
      ?.filter((item) => item.slug)
      .map((item) => route(`/departments/${item.slug}`, "weekly", 0.75)) || [];

  const doctorRoutes = doctors?.map((item) => route(`/doctors/${item.id}`, "weekly", 0.65)) || [];

  const packageRoutes =
    packages?.map((item) => route(`/packages/${item.slug || item.id}`, "weekly", 0.75)) || [];

  return [
    ...staticRoutes,
    ...departmentRoutes,
    ...doctorRoutes,
    ...packageRoutes,
  ];
}
