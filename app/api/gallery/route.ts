import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const MANIFEST_PATH = "gallery/gallery-manifest.json";
const TAXONOMY_PATH = "gallery/gallery-taxonomy.json";
const BUCKET_NAME = "alumni-media";

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_TAXONOMY_PATH = path.join(LOCAL_DATA_DIR, "gallery-taxonomy.json");
const LOCAL_MANIFEST_PATH = path.join(LOCAL_DATA_DIR, "gallery-manifest.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch {}
}

export interface GalleryTaxonomy {
  topics: string[];
  albumsMap: Record<string, string[]>;
  updatedAt?: number;
}

export function getSupabaseForRequest(req?: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const authHeader = req?.headers.get("authorization");
  if (authHeader) {
    return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (req) {
    return createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }) as unknown as SupabaseClient;
  }

  return getSupabaseAdmin();
}

export const DEFAULT_TAXONOMY: GalleryTaxonomy = {
  topics: [
    "Thời sinh viên",
    "Dã ngoại",
    "Hiện tại",
    "Du lịch, gặp gỡ",
    "Kỷ niệm 15 năm",
  ],
  albumsMap: {
    "Thời sinh viên": ["Lễ tốt nghiệp", "Ảnh giảng đường", "Đời sinh viên"],
    "Dã ngoại": ["Hoạt động Team", "Night Gala"],
    "Hiện tại": ["Cuộc sống & sự nghiệp"],
    "Du lịch, gặp gỡ": [
      "Họp lớp & Hội ngộ",
      "Đám cưới, hiếu hỷ",
      "Tour Bà nà, Hội An",
      "Tour Huế, Đà Nẵng",
      "Tour Bình Dương, Bình Phước",
    ],
    "Kỷ niệm 15 năm": ["Họp trù bị"],
  },
};

interface AlbumPhoto {
  id: string;
  title: string;
  imgSrc: string;
  type: "image" | "video";
  category?: string;
  topic?: string;
  album?: string;
  subTopic?: string;
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
    album: "Lễ tốt nghiệp",
    subTopic: "Lễ tốt nghiệp",
    likes: 12,
    comments: [],
    uploader: "Ban liên lạc (Admin)",
    uploaderClass: "TC10",
    createdAt: Date.now() - 86400000,
    isPinned: true,
  },
];

export function normalizeTopic(t?: string, validTopics?: string[]): string {
  const fallback = validTopics && validTopics.length > 0 ? validTopics[0] : "Thời sinh viên";
  if (!t || t.trim() === "" || t === "Chưa phân loại" || t === "Kỷ niệm" || t === "all" || t === "Khác") {
    return fallback;
  }
  const clean = t.trim();
  if (validTopics && validTopics.length > 0) {
    if (validTopics.includes(clean)) return clean;
    if (clean === "Cuộc sống hiện tại" && validTopics.includes("Hiện tại")) return "Hiện tại";
    if (clean === "Dã ngoại & du lịch" && validTopics.includes("Dã ngoại")) return "Dã ngoại";
    if (clean === "Họp lớp, hẹn hò" && validTopics.includes("Du lịch, gặp gỡ")) return "Du lịch, gặp gỡ";
    if (clean === "Hội ngộ 15 năm (2026)" && validTopics.includes("Kỷ niệm 15 năm")) return "Kỷ niệm 15 năm";
    return fallback;
  }
  return clean;
}

// Helper: Đọc manifest trên Cloud (Supabase Storage) - luôn bỏ qua mọi lớp cache (CDN / Next fetch cache)
async function downloadCloudManifestText(supabase: SupabaseClient): Promise<string | null> {
  // 1. Ưu tiên đọc qua public URL kèm cache-buster để tránh CDN trả bản cũ sau khi upsert
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(MANIFEST_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) return await res.text();
    }
  } catch {}
  // 2. Fallback: tải qua SDK (bucket private hoặc public URL lỗi)
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(MANIFEST_PATH);
    if (!error && data) return await data.text();
  } catch {}
  return null;
}

// Helper: Tải manifest ảnh.
// NGUỒN SỰ THẬT = Cloud (Supabase Storage). File local data/gallery-manifest.json chỉ là bản dự phòng
// khi không kết nối được Cloud. (Trước đây ưu tiên file local -> trên Vercel file này là bản snapshot
// cố định trong git, ghi đè không được (read-only FS) nên mọi thao tác Ghim/Xóa đều bị "mất" sau khi tải lại.)
async function loadManifest(client?: SupabaseClient): Promise<AlbumPhoto[]> {
  let cloudPhotos: AlbumPhoto[] | null = null;
  try {
    const supabase = client || getSupabaseAdmin();
    const text = await downloadCloudManifestText(supabase);
    if (text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cloudPhotos = parsed.map((p: any) => {
          const top = normalizeTopic(p.topic || p.category);
          const alb = (p.album || p.subTopic || (top === "Thời sinh viên" ? "Lễ tốt nghiệp" : "Ảnh chung")).trim();
          return {
            ...p,
            topic: top,
            category: top,
            album: alb,
            subTopic: alb,
            likes: typeof p.likes === "number" ? p.likes : 0,
            comments: Array.isArray(p.comments) ? p.comments : [],
            uploader: p.uploader || "Ban liên lạc (Admin)",
          };
        });
      }
    }
  } catch (err) {
    console.warn("loadManifest error:", err);
  }

  if (cloudPhotos && cloudPhotos.length > 0) {
    return cloudPhotos;
  }

  // Chỉ đọc file snapshot local khi không tải được từ Cloud (tránh đọc đồng bộ ~400KB mỗi request)
  try {
    if (fs.existsSync(LOCAL_MANIFEST_PATH)) {
      const text = fs.readFileSync(LOCAL_MANIFEST_PATH, "utf-8");
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return DEFAULT_INITIAL_PHOTOS;
}

// Helper: Lưu manifest ảnh lên Storage và local disk.
// Trả về true nếu lưu thành công ít nhất 1 nơi (Cloud hoặc local disk khi chạy dev).
async function saveManifest(photos: AlbumPhoto[], client?: SupabaseClient): Promise<boolean> {
  let localOk = false;
  let cloudOk = false;
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_MANIFEST_PATH, JSON.stringify(photos, null, 2), "utf-8");
    localOk = true;
  } catch {}

  try {
    const supabase = client || getSupabaseAdmin();
    const buffer = Buffer.from(JSON.stringify(photos, null, 2), "utf-8");
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(
      MANIFEST_PATH,
      buffer,
      {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      }
    );
    if (error) {
      console.error("saveManifest cloud error:", error.message || error);
    } else {
      cloudOk = true;
    }
  } catch (err) {
    console.error("saveManifest cloud exception:", err);
  }

  return cloudOk || localOk;
}

// Helper: Tải taxonomy (Chủ đề & Bộ ảnh) từ local disk & Supabase Storage
async function loadTaxonomy(client?: SupabaseClient): Promise<GalleryTaxonomy> {
  let localTax: (GalleryTaxonomy & { updatedAt?: number }) | null = null;
  try {
    if (fs.existsSync(LOCAL_TAXONOMY_PATH)) {
      const text = fs.readFileSync(LOCAL_TAXONOMY_PATH, "utf-8");
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
        localTax = parsed;
      }
    }
  } catch {}

  let cloudTax: (GalleryTaxonomy & { updatedAt?: number }) | null = null;
  try {
    const supabase = client || getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(TAXONOMY_PATH);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.topics) && parsed.topics.length > 0 && parsed.albumsMap) {
        cloudTax = parsed;
      }
    }
  } catch (err) {
    console.warn("loadTaxonomy error:", err);
  }

  let chosen = DEFAULT_TAXONOMY;
  if (localTax && cloudTax) {
    const localTime = localTax.updatedAt || 0;
    const cloudTime = cloudTax.updatedAt || 0;
    chosen = localTime >= cloudTime ? localTax : cloudTax;
  } else if (localTax) {
    chosen = localTax;
  } else if (cloudTax) {
    chosen = cloudTax;
  }

  // Khử chủ đề "Khác" nếu không có trong topics hợp lệ của localTax
  if (localTax && !localTax.topics.includes("Khác") && chosen.topics.includes("Khác")) {
    chosen = {
      ...chosen,
      topics: chosen.topics.filter((t) => t !== "Khác"),
      albumsMap: Object.fromEntries(Object.entries(chosen.albumsMap).filter(([k]) => k !== "Khác")),
    };
  }

  return chosen;
}

// Helper: Lưu taxonomy lên local disk và Supabase Storage
async function saveTaxonomy(taxonomy: GalleryTaxonomy, client?: SupabaseClient): Promise<boolean> {
  const taxWithTimestamp: GalleryTaxonomy = {
    ...taxonomy,
    updatedAt: taxonomy.updatedAt || Date.now(),
  };

  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_TAXONOMY_PATH, JSON.stringify(taxWithTimestamp, null, 2), "utf-8");
  } catch (err) {
    console.warn("saveTaxonomy local disk warning:", err);
  }

  try {
    const supabase = client || getSupabaseAdmin();
    const buffer = Buffer.from(JSON.stringify(taxWithTimestamp, null, 2), "utf-8");
    await supabase.storage.from(BUCKET_NAME).upload(
      TAXONOMY_PATH,
      buffer,
      {
        contentType: "application/json; charset=utf-8",
        upsert: true,
      }
    );
  } catch (err) {
    console.warn("saveTaxonomy storage exception:", err);
  }

  return true;
}

// Helper: Lưu dự phòng vào DB table gallery (nếu các cột tồn tại)
async function trySaveToDbTable(photo: AlbumPhoto) {
  try {
    const supabase = getSupabaseAdmin();
    const top = normalizeTopic(photo.topic || photo.category);
    await supabase.from("gallery").insert({
      image_url: photo.imgSrc,
      title: photo.title,
      caption: photo.caption || null,
      category: top,
      topic: top,
      uploader: photo.uploader,
      uploader_name: photo.uploader,
      uploader_class: photo.uploaderClass || "TC10",
      is_pinned: Boolean(photo.isPinned),
    });
  } catch {
    // Bỏ qua nếu cấu trúc bảng chưa khớp
  }
}

// GET /api/gallery - Lấy toàn bộ ảnh và taxonomy từ Cloud (công khai, không cần đăng nhập)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url); // Dynamic read
  const supabase = getSupabaseForRequest(req);
  const [photos, taxonomy] = await Promise.all([
    loadManifest(supabase),
    loadTaxonomy(supabase),
  ]);

  // Sắp xếp: Ghim lên đầu (ưu tiên ảnh ghim mới nhất), tiếp theo là ảnh mới nhất
  const sorted = [...photos].sort((a, b) => {
    const aPin = a.isPinned || (a as any).is_pinned;
    const bPin = b.isPinned || (b as any).is_pinned;
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;
    if (aPin && bPin) {
      return ((b as any).pinnedAt || b.createdAt || 0) - ((a as any).pinnedAt || a.createdAt || 0);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return NextResponse.json(
    { success: true, photos: sorted, taxonomy },
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
    const supabase = getSupabaseForRequest(req);
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

      const rawTopic = (formData.get("topic") as string) || (formData.get("category") as string);
      const topic = normalizeTopic(rawTopic);
      const rawAlbum = (formData.get("album") as string) || (formData.get("subTopic") as string) || (topic === "Thời sinh viên" ? "Lễ tốt nghiệp" : "Ảnh chung");
      const album = rawAlbum.trim() || "Ảnh chung";
      const uploader = (formData.get("uploader") as string) || "Ban liên lạc (Admin)";
      const uploaderClass = (formData.get("uploaderClass") as string) || "TC10";
      const commonTitle = (formData.get("title") as string) || "";
      const caption = (formData.get("caption") as string) || undefined;
      const isPinned = formData.get("isPinned") === "true";

      const currentList = await loadManifest(supabase);
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
          album: album,
          subTopic: album,
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
      await saveManifest(updatedManifest, supabase);

      return NextResponse.json({
        success: true,
        addedPhotos: newPhotos,
        photos: updatedManifest,
      });
    }

    // 2. Trường hợp gửi JSON (Link ảnh hoặc đồng bộ)
    const body = await req.json();

    if ((body.action === "save_taxonomy" || body.action === "update_taxonomy") && body.taxonomy) {
      await saveTaxonomy(body.taxonomy, supabase);
      let updatedManifest: AlbumPhoto[] | null = null;

      // Nếu có cập nhật danh sách ảnh đi kèm hoặc có chỉ thị di dời ảnh (khi xóa chủ đề / xóa bộ ảnh)
      if (Array.isArray(body.photos)) {
        updatedManifest = body.photos;
        await saveManifest(body.photos, supabase);
      } else if (body.migrateTopic || body.migrateAlbum) {
        const currentList = await loadManifest(supabase);
        const validTopics = body.taxonomy?.topics || [];
        const fallbackTopic = validTopics[0] || "Thời sinh viên";
        const migrated = currentList.map((p) => {
          let topic = normalizeTopic(p.topic || p.category, validTopics);
          let album = p.album || p.subTopic || "Ảnh chung";

          if (body.migrateTopic && (topic === body.migrateTopic.from || p.category === body.migrateTopic.from)) {
            topic = body.migrateTopic.to;
            album = body.migrateTopic.toAlbum || (body.taxonomy.albumsMap[topic]?.[0] || "Ảnh chung");
          }

          if (body.migrateAlbum && topic === body.migrateAlbum.topic && album === body.migrateAlbum.from) {
            album = body.migrateAlbum.to;
          }

          return {
            ...p,
            topic,
            category: topic,
            album,
            subTopic: album,
          };
        });
        await saveManifest(migrated, supabase);
        updatedManifest = migrated;
      }

      return NextResponse.json({
        success: true,
        taxonomy: body.taxonomy,
        photos: updatedManifest,
      });
    }

    if (body.action === "add" && body.photo) {
      const currentList = await loadManifest(supabase);
      const top = normalizeTopic(body.photo.topic || body.photo.category);
      const alb = (body.photo.album || body.photo.subTopic || (top === "Thời sinh viên" ? "Lễ tốt nghiệp" : "Ảnh chung")).trim();
      const newPhoto = {
        ...body.photo,
        topic: top,
        category: top,
        album: alb,
        subTopic: alb,
        comments: Array.isArray(body.photo.comments) ? body.photo.comments : [],
        likes: typeof body.photo.likes === "number" ? body.photo.likes : 0,
      };
      const updatedManifest = [newPhoto, ...currentList];
      await saveManifest(updatedManifest, supabase);
      await trySaveToDbTable(newPhoto);
      return NextResponse.json({ success: true, photos: updatedManifest });
    }

    if (body.action === "add_batch" && Array.isArray(body.photos)) {
      const currentList = await loadManifest(supabase);
      const normalizedBatch = body.photos.map((p: any) => {
        const top = normalizeTopic(p.topic || p.category);
        const alb = (p.album || p.subTopic || (top === "Thời sinh viên" ? "Lễ tốt nghiệp" : "Ảnh chung")).trim();
        return {
          ...p,
          topic: top,
          category: top,
          album: alb,
          subTopic: alb,
          comments: Array.isArray(p.comments) ? p.comments : [],
          likes: typeof p.likes === "number" ? p.likes : 0,
        };
      });
      const updatedManifest = [...normalizedBatch, ...currentList];
      await saveManifest(updatedManifest, supabase);
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
    const supabase = getSupabaseForRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ảnh" }, { status: 400 });
    }

    const currentList = await loadManifest(supabase);
    const target = currentList.find((p) => p.id === id);
    const updatedList = currentList.filter((p) => p.id !== id);
    await saveManifest(updatedList, supabase);

    // Xóa file trên Storage nếu là link Supabase Storage
    if (target?.imgSrc?.includes(BUCKET_NAME)) {
      try {
        const parts = target.imgSrc.split(`${BUCKET_NAME}/`);
        if (parts[1]) {
          const filePath = parts[1].split("?")[0];
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      } catch {}
    }

    // Thử xóa trong table gallery
    try {
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
    const supabase = getSupabaseForRequest(req);
    const body = await req.json();
    const { id, isPinned, likes } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ảnh" }, { status: 400 });
    }

    const currentList = await loadManifest(supabase);
    const updatedList = currentList.map((p) => {
      if (p.id === id) {
        const nextPinned = typeof isPinned === "boolean" ? isPinned : !!p.isPinned;
        return {
          ...p,
          isPinned: nextPinned,
          is_pinned: nextPinned,
          pinnedAt: nextPinned ? (body.pinnedAt || Date.now()) : undefined,
          likes: typeof likes === "number" ? likes : p.likes,
        };
      }
      return p;
    });

    if (!currentList.some((p) => p.id === id)) {
      return NextResponse.json({ success: false, error: "Không tìm thấy ảnh trên máy chủ" }, { status: 404 });
    }

    const saved = await saveManifest(updatedList, supabase);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Không lưu được trạng thái lên Cloud (kiểm tra SUPABASE_SERVICE_ROLE_KEY / quyền Storage)" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, photos: updatedList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
