import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MANIFEST_PATH = "gallery/gallery-manifest.json";
const BUCKET_NAME = "alumni-media";

interface AlbumPhoto {
  id: string;
  title: string;
  imgSrc: string;
  type: "image" | "video";
  category?: string;
  topic?: string;
  caption?: string;
  likes: number;
  comments: any[];
  uploader: string;
  uploaderClass?: string;
  createdAt: number;
  isPinned?: boolean;
}

const DEFAULT_INITIAL_PHOTOS: AlbumPhoto[] = [
  {
    id: "g-initial-1",
    title: "Tập thể TCDN4 K33 trước Cơ sở B - UEH",
    imgSrc: "/images/ueh-group.jpg",
    type: "image",
    category: "Thời sinh viên",
    topic: "Thời sinh viên",
    likes: 12,
    comments: [],
    uploader: "Ban liên lạc (Admin)",
    uploaderClass: "TC10",
    createdAt: Date.now() - 86400000,
    isPinned: true,
  },
];

// Helper: Tải manifest ảnh từ Supabase Storage
async function loadManifest(): Promise<AlbumPhoto[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(MANIFEST_PATH);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("loadManifest error:", err);
  }
  return DEFAULT_INITIAL_PHOTOS;
}

// Helper: Lưu manifest ảnh lên Supabase Storage
async function saveManifest(photos: AlbumPhoto[]): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(
      MANIFEST_PATH,
      JSON.stringify(photos, null, 2),
      {
        contentType: "application/json",
        upsert: true,
      }
    );
    if (error) {
      console.error("saveManifest storage error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("saveManifest exception:", err);
    return false;
  }
}

// Helper: Lưu dự phòng vào DB table gallery (nếu các cột tồn tại)
async function trySaveToDbTable(photo: AlbumPhoto) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("gallery").insert({
      image_url: photo.imgSrc,
      title: photo.title,
      caption: photo.caption || null,
      category: photo.topic || photo.category || "Chưa phân loại",
      topic: photo.topic || photo.category || "Chưa phân loại",
      uploader: photo.uploader,
      uploader_name: photo.uploader,
      uploader_class: photo.uploaderClass || "TC10",
      is_pinned: Boolean(photo.isPinned),
    });
  } catch {
    // Bỏ qua nếu cấu trúc bảng chưa khớp
  }
}

// GET /api/gallery - Lấy toàn bộ ảnh từ Cloud (công khai, không cần đăng nhập)
export async function GET() {
  const photos = await loadManifest();

  // Sắp xếp: Ghim lên đầu, tiếp theo là mới nhất
  const sorted = [...photos].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return NextResponse.json(
    { success: true, photos: sorted },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// POST /api/gallery - Upload ảnh từ Admin hoặc Thành viên
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Trường hợp upload Multipart Form Data (file từ thiết bị)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];
      const singleFile = formData.get("file") as File | null;
      const allFiles = files.length > 0 ? files : singleFile ? [singleFile] : [];

      if (allFiles.length === 0) {
        return NextResponse.json({ success: false, error: "Không tìm thấy tệp ảnh nào" }, { status: 400 });
      }

      const topic = (formData.get("topic") as string) || (formData.get("category") as string) || "Chưa phân loại";
      const uploader = (formData.get("uploader") as string) || "Ban liên lạc (Admin)";
      const uploaderClass = (formData.get("uploaderClass") as string) || "TC10";
      const commonTitle = (formData.get("title") as string) || "";
      const caption = (formData.get("caption") as string) || undefined;
      const isPinned = formData.get("isPinned") === "true";

      const supabase = getSupabaseAdmin();
      const currentList = await loadManifest();
      const newPhotos: AlbumPhoto[] = [];

      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filePath = `gallery/${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

        if (uploadError) {
          console.error("Storage upload error for file:", file.name, uploadError);
          continue;
        }

        const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        const publicUrl = pubData.publicUrl;

        const photoTitle =
          commonTitle.trim() ||
          file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

        const newPhoto: AlbumPhoto = {
          id: `p-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
          title: photoTitle,
          imgSrc: publicUrl,
          type: "image",
          category: topic,
          topic: topic,
          caption: caption,
          likes: 1,
          comments: [],
          uploader: uploader,
          uploaderClass: uploaderClass,
          createdAt: Date.now() + i,
          isPinned: isPinned,
        };

        newPhotos.push(newPhoto);
        await trySaveToDbTable(newPhoto);
      }

      if (newPhotos.length === 0) {
        return NextResponse.json({ success: false, error: "Upload tệp lên Cloud thất bại" }, { status: 500 });
      }

      const updatedManifest = [...newPhotos, ...currentList];
      await saveManifest(updatedManifest);

      return NextResponse.json({
        success: true,
        addedPhotos: newPhotos,
        photos: updatedManifest,
      });
    }

    // 2. Trường hợp gửi JSON (Link ảnh hoặc đồng bộ)
    const body = await req.json();

    if (body.action === "add" && body.photo) {
      const currentList = await loadManifest();
      const newPhoto = body.photo;
      const updatedManifest = [newPhoto, ...currentList];
      await saveManifest(updatedManifest);
      await trySaveToDbTable(newPhoto);
      return NextResponse.json({ success: true, photos: updatedManifest });
    }

    if (body.action === "add_batch" && Array.isArray(body.photos)) {
      const currentList = await loadManifest();
      const updatedManifest = [...body.photos, ...currentList];
      await saveManifest(updatedManifest);
      return NextResponse.json({ success: true, photos: updatedManifest });
    }

    return NextResponse.json({ success: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  } catch (err: any) {
    console.error("API POST /api/gallery error:", err);
    return NextResponse.json({ success: false, error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// DELETE /api/gallery - Xóa ảnh khỏi Cloud
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ảnh" }, { status: 400 });
    }

    const currentList = await loadManifest();
    const target = currentList.find((p) => p.id === id);
    const updatedList = currentList.filter((p) => p.id !== id);
    await saveManifest(updatedList);

    // Xóa file trên Storage nếu là link Supabase Storage
    if (target?.imgSrc?.includes(BUCKET_NAME)) {
      try {
        const parts = target.imgSrc.split(`${BUCKET_NAME}/`);
        if (parts[1]) {
          const filePath = parts[1].split("?")[0];
          const supabase = getSupabaseAdmin();
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      } catch {}
    }

    // Thử xóa trong table gallery
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("gallery").delete().eq("id", id);
    } catch {}

    return NextResponse.json({ success: true, photos: updatedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// PUT /api/gallery - Cập nhật trạng thái Ghim / Like ảnh
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isPinned, likes } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ảnh" }, { status: 400 });
    }

    const currentList = await loadManifest();
    const updatedList = currentList.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          isPinned: typeof isPinned === "boolean" ? isPinned : p.isPinned,
          likes: typeof likes === "number" ? likes : p.likes,
        };
      }
      return p;
    });

    await saveManifest(updatedList);
    return NextResponse.json({ success: true, photos: updatedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
