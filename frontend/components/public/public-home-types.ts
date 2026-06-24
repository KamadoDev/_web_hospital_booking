import type {
  Banner,
  DoctorProfile,
  MedicalPackage,
  PublicFAQ,
  SiteSettingsValue,
} from "@/lib/types";

export type PublicDepartment = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image: string | null;
};

export type PublicHomeData = {
  settings: SiteSettingsValue | null;
  heroBanners: Banner[];
  promoBanners: Banner[];
  departments: PublicDepartment[];
  doctors: DoctorProfile[];
  packages: MedicalPackage[];
  faqs: PublicFAQ[];
};

export type HomeSelection = {
  departmentId: string;
  doctorId: string;
  packageId: string;
};

export const emptyHomeData: PublicHomeData = {
  settings: null,
  heroBanners: [],
  promoBanners: [],
  departments: [],
  doctors: [],
  packages: [],
  faqs: [],
};
