import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/requestAuth";
import { BUCKET_NAME, NO_CACHE_HEADERS } from "@/lib/alumni-server";

const MAX_BILL_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_EXACT_MIMES = new Set(["application/pdf"]);

// POST /api/expenses/upload - Admin upload ảnh/PDF hóa đơn (bill) lên Supabase Storage
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tệp hóa đơn cần tải lên" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (file.size <= 0 || file.size > MAX_BILL_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Dung lượng hóa đơn phải nhỏ hơn 10MB" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const mime = (file.type || "").toLowerCase();
    const isAllowed =
      ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p)) || ALLOWED_EXACT_MIMES.has(mime);
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: "Chỉ hỗ trợ tải lên ảnh (JPG, PNG, WEBP, HEIC) hoặc file PDF" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeExt = rawExt || (mime === "application/pdf" ? "pdf" : "jpg");
    const uniqueName = `bill_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${safeExt}`;
    const storagePath = `expenses/${uniqueName}`;

    const arrayBuffer = await file.arrayBuffer();
    const supabase = getServerSupabase(req);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Không tải được hóa đơn lên Cloud: ${uploadError.message}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return NextResponse.json(
      {
        success: true,
        url: pub.publicUrl,
        fileName: file.name,
        storagePath,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải hóa đơn lên máy chủ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
