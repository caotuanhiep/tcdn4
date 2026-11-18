-- ====================================================================
-- TCDN4 K33 ALUMNI HUB - SUPABASE DATABASE INITIALIZATION SCRIPT
-- ====================================================================
-- Hướng dẫn: Copy toàn bộ nội dung file này, truy cập:
-- https://supabase.com/dashboard/project/tijbvigtbmecwgoacdlu/sql/new
-- Dán vào SQL Editor và nhấn "RUN" (Chạy).
-- ====================================================================

-- 1. TẠO BẢNG HỒ SƠ CỰU SINH VIÊN (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  class_name TEXT DEFAULT 'TC10', -- TC10, TC11, TC12
  job_title TEXT,
  company TEXT,
  location_region TEXT DEFAULT 'hcm', -- hcm, hn, dn, overseas
  phone TEXT,
  avatar_url TEXT,
  birthday DATE,
  role TEXT DEFAULT 'member', -- member, committee (ban liên lạc), admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật bảo mật hàng (Row Level Security - RLS) cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Mọi người (kể cả khách) đều có thể xem danh bạ
CREATE POLICY "Cho phép đọc danh bạ công khai" 
ON public.profiles FOR SELECT 
USING (true);

-- Policy: User đăng nhập có thể tạo / cập nhật hồ sơ của chính mình
CREATE POLICY "Cho phép user sửa hồ sơ cá nhân" 
ON public.profiles FOR ALL 
USING (auth.uid() = id);

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

-- Bật RLS cho bảng gallery
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép xem ảnh công khai" 
ON public.gallery FOR SELECT 
USING (true);

CREATE POLICY "Cho phép user đăng nhập upload ảnh" 
ON public.gallery FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Cho phép admin và ban liên lạc quản lý ảnh" 
ON public.gallery FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'committee')
  )
);

-- 3. TẠO STORAGE BUCKET CHỨA ẢNH (alumni-media)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('alumni-media', 'alumni-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy cho Storage Bucket
CREATE POLICY "Cho phép tải ảnh về công khai"
ON storage.objects FOR SELECT
USING (bucket_id = 'alumni-media');

CREATE POLICY "Cho phép thành viên upload ảnh lên storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'alumni-media' AND auth.role() = 'authenticated');

CREATE POLICY "Cho phép admin quản lý xóa file storage"
ON storage.objects FOR ALL
USING (bucket_id = 'alumni-media' AND auth.role() = 'authenticated');

-- 4. TỰ ĐỘNG GÁN QUYỀN SUPER ADMIN CHO EMAIL CAOTUANHIEP@GMAIL.COM
-- (Nếu user đã đăng nhập qua Google rồi, query này sẽ set role = 'admin' ngay lập tức)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'caotuanhiep@gmail.com'
);
