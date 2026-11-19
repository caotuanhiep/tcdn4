export type UserRole = "member" | "committee" | "admin" | (string & {});

export interface Profile {
  id: string;
  full_name: string | null;
  class_name: string | null;
  job_title: string | null;
  company: string | null;
  location_region: string | null;
  avatar_url?: string | null;
  birthday?: string | null; // Format: YYYY-MM-DD or DD/MM
  phone?: string | null;
  bio?: string | null;
  marital_status?: "single" | "married" | string | null;
  children_count?: number | null;
  specific_location?: string | null;
  attendance_status?: "attending" | "not_attending" | "pending" | string | null;
  shirt_size?: string | null;
  delivery_address?: string | null;
  role: UserRole;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  title?: string;
  category?: string;
  user_id: string;
  author_name?: string;
  is_pinned: boolean;
  likes_count?: number;
  created_at: string;
}

export interface PhotoComment {
  id: string;
  photo_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export const STORAGE_BUCKET = "alumni-media";
