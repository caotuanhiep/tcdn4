import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/requestAuth";
import { BUCKET_NAME, NO_CACHE_HEADERS } from "@/lib/alumni-server";
import {
  EXPENSES_STORAGE_PATH,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseItem,
} from "@/lib/expenses";

const VALID_CATEGORIES = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.id));

function normalizeCategory(raw: unknown): ExpenseCategory {
  const s = String(raw || "other").trim();
  return (VALID_CATEGORIES.has(s) ? s : "other") as ExpenseCategory;
}

function normalizeBillUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => String(u || "").trim())
    .filter((u) => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/"))
    .slice(0, 10);
}

async function loadExpensesCloud(supabase: SupabaseClient): Promise<ExpenseItem[]> {
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(EXPENSES_STORAGE_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(EXPENSES_STORAGE_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

async function saveExpensesCloud(
  items: ExpenseItem[],
  supabase: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(EXPENSES_STORAGE_PATH, Buffer.from(JSON.stringify(items, null, 2), "utf-8"), {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

// GET /api/expenses - Lấy toàn bộ danh sách khoản chi minh bạch từ Cloud Storage
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase(req);
    const expenses = await loadExpensesCloud(supabase);
    expenses.sort((a, b) => (b.spentAt || b.createdAt || "").localeCompare(a.spentAt || a.createdAt || ""));
    return NextResponse.json({ success: true, expenses }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Không tải được danh sách khoản chi" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST /api/expenses - Admin ghi nhận khoản chi mới
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const spentBy = String(body?.spentBy || "").trim();
    const amount = Math.round(Number(body?.amount) || 0);
    const spentAt = String(body?.spentAt || "").trim() || new Date().toISOString().slice(0, 16);

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập nội dung khoản chi" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Số tiền chi phải lớn hơn 0 VNĐ" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }
    if (!spentBy) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập tên người thực hiện chi" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);
    const current = await loadExpensesCloud(supabase);

    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      category: normalizeCategory(body?.category),
      amount,
      spentAt,
      spentBy,
      note: String(body?.note || "").trim(),
      billUrls: normalizeBillUrls(body?.billUrls),
      createdAt: new Date().toISOString(),
      createdBy: auth.user.email || auth.user.id,
    };

    const next = [newItem, ...current];
    const saved = await saveExpensesCloud(next, supabase);
    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: `Không lưu được khoản chi lên Cloud: ${saved.error}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, expense: newItem, expenses: next },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi thêm khoản chi" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PUT /api/expenses - Admin chỉnh sửa khoản chi đã lưu
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
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID khoản chi cần cập nhật" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const title = String(body?.title || "").trim();
    const spentBy = String(body?.spentBy || "").trim();
    const amount = Math.round(Number(body?.amount) || 0);
    if (!title || amount <= 0 || !spentBy) {
      return NextResponse.json(
        { success: false, error: "Vui lòng điền đầy đủ nội dung, số tiền (>0) và người thực hiện" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);
    const current = await loadExpensesCloud(supabase);
    const idx = current.findIndex((item) => item.id === id);
    if (idx < 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy khoản chi này" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const updatedItem: ExpenseItem = {
      ...current[idx],
      title,
      category: normalizeCategory(body?.category),
      amount,
      spentAt: String(body?.spentAt || current[idx].spentAt).trim(),
      spentBy,
      note: String(body?.note || "").trim(),
      billUrls:
        body?.billUrls !== undefined
          ? normalizeBillUrls(body.billUrls)
          : current[idx].billUrls || [],
      updatedAt: new Date().toISOString(),
    };

    const next = [...current];
    next[idx] = updatedItem;

    const saved = await saveExpensesCloud(next, supabase);
    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: `Không cập nhật được khoản chi: ${saved.error}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, expense: updatedItem, expenses: next },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi cập nhật khoản chi" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE /api/expenses?id=... - Admin xóa khoản chi
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID khoản chi" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);
    const current = await loadExpensesCloud(supabase);
    const next = current.filter((item) => item.id !== id);
    if (next.length === current.length) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy khoản chi cần xóa" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveExpensesCloud(next, supabase);
    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: `Không thể xóa khoản chi: ${saved.error}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, expenses: next },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xóa khoản chi" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
