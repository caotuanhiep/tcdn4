import { getSupabase } from "@/lib/supabase/client";

export const REALTIME_CHANNEL_NAME = "tcdn4-realtime";
export const DATA_UPDATED_EVENT = "tcdn4_data_updated";

/**
 * Fetch wrapper tự động đính kèm Authorization: Bearer <access_token> của Supabase session
 * và tắt cache để mọi thao tác đọc/ghi luôn đi thẳng tới database gốc.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data?.session?.access_token;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // ignore
  }

  return fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });
}

/**
 * Phát tín hiệu cập nhật realtime cục bộ (trong tab hiện tại)
 * và phát sóng Supabase Broadcast tới mọi trình duyệt/thiết bị đang mở website.
 */
export function broadcastDataUpdate(
  reason: "profile" | "registration" | "committee" | "guestbook" | "settings" = "profile"
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: { reason, time: Date.now() } }));
    // Giữ tương thích với các listener cũ nếu có
    window.dispatchEvent(new Event("tcdn4_profile_updated"));
    window.dispatchEvent(new Event("tcdn4_registration_updated"));
  }

  try {
    const supabase = getSupabase();
    supabase.channel(REALTIME_CHANNEL_NAME).send({
      type: "broadcast",
      event: "data_updated",
      payload: { reason, time: Date.now() },
    });
  } catch {
    // ignore
  }
}
