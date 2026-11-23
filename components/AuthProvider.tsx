"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
import { useAlumniData } from "@/components/AlumniDataProvider";
import type { Profile } from "@/types/database";
import LoginModal from "@/components/LoginModal";
import ProfileModal from "@/components/ProfileModal";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  openLogin: () => void;
  openProfile: (initialTab?: "info" | "attendance" | unknown) => void;
  closeProfile: () => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  reloadProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SUPER_ADMIN_EMAIL = "caotuanhiep@gmail.com";
const DEV_ADMIN_ID = "647fb28f-2ab7-415e-84cd-87329017a7e0";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { profiles, refresh: refreshAlumniData } = useAlumniData();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<"info" | "attendance">("info");

  const loadedUserIdRef = useRef<string | null>(null);

  /**
   * Đọc hồ sơ trực tiếp từ database gốc (Supabase public.profiles).
   * KHÔNG dùng localStorage đè lên database và KHÔNG tự ghi đè tên từ Google metadata.
   */
  const fetchUserProfileFromDb = useCallback(async (u: User | null): Promise<Profile | null> => {
    if (!u) {
      setProfile(null);
      loadedUserIdRef.current = null;
      return null;
    }

    const supabase = getSupabase();
    let dbProfile: Profile | null = null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (!error && data) {
        dbProfile = data as Profile;
      }
    } catch (err) {
      console.warn("[AuthProvider] Lỗi đọc profiles từ Supabase:", err);
    }

    const isSuperAdmin = (u.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

    if (dbProfile) {
      const normalized: Profile = {
        ...dbProfile,
        role: isSuperAdmin ? "admin" : dbProfile.role || "member",
      };
      setProfile(normalized);
      loadedUserIdRef.current = u.id;
      return normalized;
    }

    // Thành viên đăng nhập lần đầu chưa có dòng nào trong bảng profiles
    setProfile(null);
    loadedUserIdRef.current = u.id;
    return null;
  }, []);

  // Đồng bộ tự động khi Admin hoặc thiết bị khác cập nhật hồ sơ của user hiện tại trên DB (realtime)
  useEffect(() => {
    if (!user?.id || profiles.length === 0) return;
    const latestFromDb = profiles.find((p) => p.id === user.id);
    if (!latestFromDb) return;

    setProfile((prev) => {
      const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
      const next: Profile = {
        ...latestFromDb,
        // Giữ phone thật nếu latestFromDb bị ẩn (chưa kịp gắn token)
        phone: latestFromDb.phone ?? prev?.phone ?? null,
        role: isSuperAdmin ? "admin" : latestFromDb.role || "member",
      };
      if (
        prev &&
        prev.updated_at === next.updated_at &&
        prev.full_name === next.full_name &&
        prev.role === next.role &&
        prev.attendance_status === next.attendance_status &&
        prev.shirt_size === next.shirt_size &&
        prev.delivery_address === next.delivery_address
      ) {
        return prev;
      }
      return next;
    });
  }, [profiles, user?.id, user?.email]);

  useEffect(() => {
    let active = true;

    const isDevAdmin =
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      (localStorage.getItem("tcdn4_dev_mode") === "admin" ||
        document.cookie.includes("tcdn4_dev_mode=admin"));

    if (isDevAdmin) {
      const devUser = {
        id: DEV_ADMIN_ID,
        email: SUPER_ADMIN_EMAIL,
        user_metadata: { full_name: "Hiệp Cao Tuấn" },
      } as unknown as User;
      setUser(devUser);
      fetchUserProfileFromDb(devUser)
        .then(() => refreshAlumniData())
        .finally(() => active && setLoading(false));

      if (sessionStorage.getItem("tcdn4_auto_open_profile") === "1") {
        try {
          sessionStorage.removeItem("tcdn4_auto_open_profile");
        } catch {}
        setProfileInitialTab("info");
        setProfileOpen(true);
        setLoginOpen(false);
      }
      return () => {
        active = false;
      };
    }

    const supabase = getSupabase();

    // Một listener onAuthStateChange duy nhất (tự phát INITIAL_SESSION ngay khi đăng ký)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      const u = session?.user ?? null;
      setUser(u);

      // Bỏ qua sự kiện TOKEN_REFRESHED để không nạp lại hồ sơ làm gián đoạn form đang gõ
      if (event === "TOKEN_REFRESHED" && u && loadedUserIdRef.current === u.id) {
        return;
      }

      if (!u) {
        setProfile(null);
        loadedUserIdRef.current = null;
        setLoading(false);
        return;
      }

      const isFreshLogin =
        typeof window !== "undefined" &&
        (sessionStorage.getItem("tcdn4_auto_open_profile") === "1" ||
          window.location.search.includes("code="));

      // Dọn ?code= trên URL CHỈ SAU KHI đã có session hợp lệ (tránh ngắt PKCE exchange)
      if (typeof window !== "undefined" && window.location.search.includes("code=")) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("code");
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search || ""));
      }

      fetchUserProfileFromDb(u)
        .then((dbProf) => {
          if (!active) return;

          // Tải lại danh bạ với token đăng nhập để mở khóa SĐT & quyền Admin
          if (event === "SIGNED_IN") {
            void refreshAlumniData();
          }

          // Chỉ tự động bật popup điểm danh cho lần đầu (chưa có hồ sơ hoặc chưa lưu SĐT)
          if (isFreshLogin) {
            try {
              sessionStorage.removeItem("tcdn4_auto_open_profile");
            } catch {}

            const hasCheckedIn = Boolean(dbProf?.phone && dbProf.phone.trim().length > 0);
            if (!hasCheckedIn) {
              setProfileInitialTab("info");
              setProfileOpen(true);
              setLoginOpen(false);
            }
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchUserProfileFromDb, refreshAlumniData]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("login") === "1") {
      setTimeout(() => setLoginOpen(true), 0);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tcdn4_dev_mode");
        document.cookie = "tcdn4_dev_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      await getSupabase().auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
    loadedUserIdRef.current = null;
    void refreshAlumniData();
  }, [refreshAlumniData]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const openProfile = useCallback((tab?: "info" | "attendance" | unknown) => {
    setProfileInitialTab(tab === "attendance" ? "attendance" : "info");
    setProfileOpen(true);
  }, []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  const reloadProfile = useCallback(async () => {
    return fetchUserProfileFromDb(user);
  }, [fetchUserProfileFromDb, user]);

  /**
   * Ghi thẳng cập nhật hồ sơ vào database gốc qua /api/profile (upsert trên public.profiles).
   * Nếu DB trả lỗi -> ném lỗi thật để UI báo rõ cho người dùng, KHÔNG lưu giả vào localStorage.
   */
  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<boolean> => {
      if (!user) {
        throw new Error("Bạn cần đăng nhập trước khi lưu hồ sơ.");
      }

      const payload: Record<string, any> = {
        id: user.id,
        ...updates,
      };

      const res = await authFetch("/api/profile", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.profile) {
        throw new Error(data?.error || "Không thể lưu hồ sơ vào database gốc. Vui lòng thử lại.");
      }

      const saved = data.profile as Profile;
      const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
      setProfile({
        ...saved,
        role: isSuperAdmin ? "admin" : saved.role || "member",
      });

      // Cập nhật tức thời toàn bộ giao diện & phát realtime sang thiết bị khác
      await refreshAlumniData();
      broadcastDataUpdate("profile");

      return true;
    },
    [user, refreshAlumniData]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin:
        profile?.role === "admin" ||
        profile?.role === "committee" ||
        (user?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL ||
        (user?.email || "").toLowerCase().includes("admin") ||
        false,
      openLogin,
      openProfile,
      closeProfile,
      signOut,
      updateProfile,
      reloadProfile,
    }),
    [user, profile, loading, openLogin, openProfile, closeProfile, signOut, updateProfile, reloadProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          initialTab={profileInitialTab}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
