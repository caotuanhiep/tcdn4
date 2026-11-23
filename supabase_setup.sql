-- ====================================================================
-- TCDN4 K33 ALUMNI HUB - SUPABASE DATABASE INITIALIZATION & RLS FIX
-- ====================================================================
-- Hướng dẫn: Copy toàn bộ nội dung file này, truy cập:
-- https://supabase.com/dashboard/project/tijbvigtbmecwgoacdlu/sql/new
-- Dán vào SQL Editor và nhấn "RUN" (Chạy).
-- ====================================================================

-- 1. TẠO & CẬP NHẬT ĐẦY ĐỦ CỘT CHO BẢNG HỒ SƠ CỰU SINH VIÊN (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  class_name TEXT DEFAULT 'TC10', -- TC10, TC11, TC12
  job_title TEXT,
  company TEXT,
  location_region TEXT DEFAULT 'hcm', -- hcm, hn, other, overseas
  specific_location TEXT,
  phone TEXT,
  avatar_url TEXT,
  birthday DATE,
  marital_status TEXT DEFAULT 'married', -- married, single
  children_count INT DEFAULT 0,
  attendance_status TEXT, -- attending, not_attending, NULL
  shirt_size TEXT,
  delivery_address TEXT,
  bio TEXT,
  role TEXT DEFAULT 'member', -- member, committee, admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bổ sung an toàn các cột nếu bảng đã tồn tại từ trước
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specific_location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'married';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS children_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS attendance_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shirt_size TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Hàm kiểm tra quyền Admin / Ban liên lạc (SECURITY DEFINER để tránh lỗi đệ quy RLS & lỗi quyền đọc auth.users)
CREATE OR REPLACE FUNCTION public.is_tcdn4_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'caotuanhiep@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'committee')
    );
$$;

-- Bật bảo mật hàng (Row Level Security - RLS) cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ nếu có để tránh xung đột / lỗi permission denied for table users
DROP POLICY IF EXISTS "Cho phép đọc danh bạ công khai" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép user sửa hồ sơ cá nhân" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép admin và ban liên lạc quản lý profiles" ON public.profiles;

-- Policy 1: Mọi người đều có thể xem danh bạ (API sẽ tự ẩn SĐT với khách chưa đăng nhập)
CREATE POLICY "Cho phép đọc danh bạ công khai"
ON public.profiles FOR SELECT
USING (true);

-- Policy 2: User đăng nhập có toàn quyền INSERT / UPDATE hồ sơ của chính mình
CREATE POLICY "Cho phép user sửa hồ sơ cá nhân"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Super Admin và Ban liên lạc có toàn quyền quản lý mọi hồ sơ
CREATE POLICY "Cho phép admin và ban liên lạc quản lý profiles"
ON public.profiles FOR ALL
USING (public.is_tcdn4_admin())
WITH CHECK (public.is_tcdn4_admin());

-- Bật Supabase Realtime cho bảng public.profiles để mọi thay đổi hiển thị tức thời
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- LƯU Ý QUAN TRỌNG VỀ TRIGGER AUTH.USERS (tránh lỗi đăng nhập Google ghi đè lại tên cũ):
-- Nếu trên Supabase có trigger handle_new_user() gắn vào auth.users,
-- đảm bảo trigger CHỈ chạy AFTER INSERT (KHÔNG chạy AFTER UPDATE) và dùng ON CONFLICT (id) DO NOTHING!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TẠO BẢNG GÓC KỶ NIỆM (GALLERY)
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  category TEXT DEFAULT 'Kỷ niệm chung',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploader_name TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Khác';
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'Khác';
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS uploader TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS uploader_name TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS uploader_class TEXT;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0;

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép xem ảnh công khai" ON public.gallery;
DROP POLICY IF EXISTS "Cho phép user đăng nhập upload ảnh" ON public.gallery;
DROP POLICY IF EXISTS "Cho phép admin và ban liên lạc quản lý ảnh" ON public.gallery;

CREATE POLICY "Cho phép xem ảnh công khai"
ON public.gallery FOR SELECT
USING (true);

CREATE POLICY "Cho phép user đăng nhập upload ảnh"
ON public.gallery FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Cho phép admin và ban liên lạc quản lý ảnh"
ON public.gallery FOR ALL
USING (public.is_tcdn4_admin())
WITH CHECK (public.is_tcdn4_admin());

-- 3. TẠO STORAGE BUCKET CHỨA ẢNH & CẤU HÌNH (alumni-media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('alumni-media', 'alumni-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Cho phép tải ảnh về công khai" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép thành viên upload ảnh lên storage" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép admin quản lý xóa file storage" ON storage.objects;

CREATE POLICY "Cho phép tải ảnh về công khai"
ON storage.objects FOR SELECT
USING (bucket_id = 'alumni-media');

CREATE POLICY "Cho phép thành viên upload ảnh lên storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'alumni-media' AND auth.role() = 'authenticated');

CREATE POLICY "Cho phép admin quản lý xóa file storage"
ON storage.objects FOR ALL
USING (bucket_id = 'alumni-media' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'alumni-media' AND auth.role() = 'authenticated');

-- 4. TỰ ĐỘNG GÁN QUYỀN SUPER ADMIN CHO EMAIL CAOTUANHIEP@GMAIL.COM
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'caotuanhiep@gmail.com'
);
