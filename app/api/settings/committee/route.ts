import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/requestAuth";
import { BUCKET_NAME, NO_CACHE_HEADERS } from "@/lib/alumni-server";
import { DEFAULT_COMMITTEE_MEMBERS, type CommitteeMember } from "@/lib/committee";

const COMMITTEE_PATH = "settings/committee.json";

async function loadCommitteeCloud(req?: NextRequest): Promise<CommitteeMember[]> {
  const supabase = getServerSupabase(req);
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(COMMITTEE_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(COMMITTEE_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_COMMITTEE_MEMBERS;
}

export async function GET(req: NextRequest) {
  const members = await loadCommitteeCloud(req);
  return NextResponse.json({ success: true, members }, { headers: NO_CACHE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const members = Array.isArray(body?.members) ? body.members : null;
    if (!members) {
      return NextResponse.json(
        { success: false, error: "Danh sách ban liên lạc không hợp lệ" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(COMMITTEE_PATH, Buffer.from(JSON.stringify(members, null, 2), "utf-8"), {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      });

    if (error) {
      return NextResponse.json(
        { success: false, error: `Không lưu được lên Cloud: ${error.message}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ success: true, members }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi lưu ban liên lạc" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export const POST = PUT;
