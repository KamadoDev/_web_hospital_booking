export const SEARCH_DOCUMENT_TYPES = [
  "department",
  "doctor",
  "package",
  "faq",
  "chatbot_faq",
] as const;

export type SearchDocumentType = (typeof SEARCH_DOCUMENT_TYPES)[number];

export type SearchDocument = {
  id: string;
  type: SearchDocumentType;
  title: string;
  description?: string | null;
  url: string;
  image?: string | null;
  keywords?: string[];
  isActive: boolean;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentSlug?: string | null;
  price?: number | null;
  priority?: number;
  updatedAt?: string;
};

export type PublicSearchQuery = {
  q?: string;
  type?: SearchDocumentType | "all";
  limit?: number;
};

export type PublicSearchResult = Pick<
  SearchDocument,
  | "id"
  | "type"
  | "title"
  | "description"
  | "url"
  | "image"
  | "departmentName"
  | "price"
> & {
  score?: number;
  source: "elasticsearch" | "postgres";
};
