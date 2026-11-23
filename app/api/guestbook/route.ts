import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, getServerSupabase } from "@/lib/supabase/requestAuth";
import { BUCKET_NAME, NO_CACHE_HEADERS } from "@/lib/alumni-server";

const GUESTBOOK_PATH = "settings/guestbook.json";

export interface GuestbookEntry {
  id: string;
  userId?: string;
  name: string;
  className: string;
  time: string;
  createdAt?: string;
  message: string;
  likes: number;
}

async function loadGuestbook(req?: NextRequest): Promise<GuestbookEntry[]> {
  const supabase = getServerSupabase(req);
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(GUESTBOOK_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(GUESTBOOK_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

async function saveGuestbook(entries: GuestbookEntry[], req?: NextRequest) {
  const supabase = getServerSupabase(req);
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(GUESTBOOK_PATH, Buffer.from(JSON.stringify(entries, null, 2), "utf-8"), {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });
  return { ok: !error, error: error?.message };
}

export async function GET(req: NextRequest) {
  const messages = await loadGuestbook(req);
  return NextResponse.json({ success: true, messages }, { headers: NO_CACHE_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    const isDevAdmin =
      process.env.NODE_ENV === "development" &&
      req.cookies.get("tcdn4_dev_mode")?.value === "admin";
    if (!user && !isDevAdmin) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để ghi lời nhắn vào Sổ Lưu Bút" },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const message = String(body?.message || "").trim();
    const className = String(body?.className || "TC10").trim();

    if (!name || !message) {
      return NextResponse.json(
        { success: false, error: "Thiếu tên hoặc nội dung lời nhắn" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const now = new Date();
    const entry: GuestbookEntry = {
      id: `gb-${Date.now()}`,
      userId: user?.id,
      name,
      className,
      time: now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
      createdAt: now.toISOString(),
      message,
      likes: 1,
    };

    const current = await loadGuestbook(req);
    const updated = [entry, ...current].slice(0, 200);
    const saved = await saveGuestbook(updated, req);

    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: `Không thể lưu lời nhắn lên Cloud: ${saved.error}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ success: true, entry, messages: updated }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi gửi lưu bút" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body?.id || "");
    const delta = body?.delta === -1 ? -1 : 1;
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID" }, { status: 400 });
    }

    const current = await loadGuestbook(req);
    const updated = current.map((m) =>
      m.id === id ? { ...m, likes: Math.max(0, (m.likes || 0) + delta) } : m
    );
    await saveGuestbook(updated, req);
    return NextResponse.json({ success: true, messages: updated }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Lỗi thả tim" }, { status: 500 });
  }
}
