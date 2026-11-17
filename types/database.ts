export type UserRole = "member" | "admin" | (string & {});

export interface Profile {
  id: string;
  full_name: string | null;
  class_name: string | null;
  job_title: string | null;
  company: string | null;
  location_region: string | null;
  role: UserRole;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  user_id: string;
  is_pinned: boolean;
  created_at: string;
}

export const STORAGE_BUCKET = "alumni-media";
