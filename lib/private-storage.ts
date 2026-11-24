import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const PRIVATE_STORAGE_BUCKET = "alumni-private";
export const LEGACY_PUBLIC_BUCKET = "alumni-media";

let privateBucketReady = false;

/**
 * Đảm bảo bucket kín `alumni-private` (public: false) đã tồn tại trên Supabase Storage.
 * Chỉ server có SUPABASE_SERVICE_ROLE_KEY mới có quyền tạo/đọc/ghi bucket này — người ngoài không thể truy cập qua URL công khai.
 */
export async function ensurePrivateBucket(client?: SupabaseClient): Promise<boolean> {
  if (privateBucketReady) return true;
  const supabase = client || getSupabaseAdmin();
  try {
    const { data, error } = await supabase.storage.getBucket(PRIVATE_STORAGE_BUCKET);
    if (!error && data) {
      if (data.public) {
        await supabase.storage.updateBucket(PRIVATE_BUCKET_ID, { public: false }).catch(() => {});
      }
      privateBucketReady = true;
      return true;
    }

    const { error: createErr } = await supabase.storage.createBucket(PRIVATE_STORAGE_BUCKET, {
      public: false,
    });
    if (!createErr || /already exists/i.test(createErr.message || "")) {
      privateBucketReady = true;
      return true;
    }
  } catch {}
  return false;
}

const PRIVATE_BUCKET_ID = PRIVATE_STORAGE_BUCKET;

/**
 * Đọc file JSON từ Private Bucket (`alumni-private`).
 * Nếu chưa có trong Private Bucket nhưng còn bản cũ ở bucket public (`alumni-media`),
 * tự động di chuyển sang Private Bucket và xóa bản lộ công khai cũ.
 */
export async function readPrivateJson<T = any>(
  storagePath: string,
  client?: SupabaseClient
): Promise<T | null> {
  const supabase = client || getSupabaseAdmin();

  // 1. Đọc từ Private Bucket
  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_STORAGE_BUCKET)
      .download(storagePath);
    if (!error && data) {
      const text = await data.text();
      if (text) return JSON.parse(text) as T;
    }
  } catch {}

  // 2. Fallback 1 lần nếu còn bản cũ ở bucket public -> tự di cư sang Private & xóa bản cũ
  try {
    const { data, error } = await supabase.storage
      .from(LEGACY_PUBLIC_BUCKET)
      .download(storagePath);
    if (!error && data) {
      const text = await data.text();
      if (text) {
        const parsed = JSON.parse(text) as T;
        // Di cư ngầm sang bucket kín
        const migrated = await writePrivateJson(storagePath, parsed, supabase);
        if (migrated.ok) {
          await supabase.storage.from(LEGACY_PUBLIC_BUCKET).remove([storagePath]).catch(() => {});
        }
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Ghi file JSON vào Private Bucket (`alumni-private`) và dọn sạch bản cũ (nếu có) ở bucket public.
 */
export async function writePrivateJson(
  storagePath: string,
  payload: unknown,
  client?: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const supabase = client || getSupabaseAdmin();
  const json = JSON.stringify(payload, null, 2);

  try {
    await ensurePrivateBucket(supabase);
    const { error } = await supabase.storage
      .from(PRIVATE_STORAGE_BUCKET)
      .upload(storagePath, Buffer.from(json, "utf-8"), {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    // Bảo đảm không còn bản cũ nào nằm lộ ở bucket public
    await supabase.storage.from(LEGACY_PUBLIC_BUCKET).remove([storagePath]).catch(() => {});

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
