"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<"info" | "attendance">("info");

  useEffect(() => {
    const isDev =
      typeof window !== "undefined" &&
      (localStorage.getItem("tcdn4_dev_mode") === "admin" ||
        document.cookie.includes("tcdn4_dev_mode=admin"));

    const supabase = getSupabase();
    let active = true;

    async function loadProfile(u: User | null): Promise<Profile | null> {
      if (!u) {
        if (active) setProfile(null);
        return null;
      }

      let foundProfile: Profile | null = null;

      // 1. Thử tải từ API server /api/profile?id=... (ưu tiên cao nhất, hỗ trợ đồng bộ dữ liệu)
      try {
        const res = await fetch(`/api/profile?id=${encodeURIComponent(u.id)}`, { cache: "no-store" });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson?.success && resJson.profile) {
            foundProfile = resJson.profile as Profile;
          }
        }
      } catch {}

      // 2. Thử tải từ Supabase DB
      if (!foundProfile) {
        try {
          const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
          if (data && !error) {
            foundProfile = data as Profile;
          }
        } catch {}
      }

      // 3. Thử tải từ localStorage
      if (!foundProfile) {
        try {
          const localKey = `profile_${u.id}`;
          const savedLocal = localStorage.getItem(localKey);
          if (savedLocal) {
            foundProfile = JSON.parse(savedLocal);
          }
        } catch {}
      }

      // 4. Fallback từ user metadata (Google OAuth)
      const meta = u.user_metadata ?? {};
      const fullName = (foundProfile?.full_name ?? meta.full_name ?? meta.name ?? u.email?.split("@")[0] ?? "Thành viên K33") as string;
      const avatarUrl = (foundProfile?.avatar_url ?? meta.avatar_url ?? meta.picture ?? null) as string | null;

      const isSuperAdmin = u.email === "caotuanhiep@gmail.com";
      const userRole = isSuperAdmin ? "admin" : (foundProfile?.role || "member");

      const finalProfile: Profile = foundProfile
        ? { ...foundProfile, role: userRole }
        : {
            id: u.id,
            full_name: fullName,
            class_name: "TC10",
            job_title: "Chuyên viên Tài chính",
            company: "Alumni UEH",
            location_region: "hcm",
            avatar_url: avatarUrl,
            birthday: "1989-11-20",
            role: userRole,
          };

      if (active) {
        setProfile(finalProfile);
        try {
          localStorage.setItem(`profile_${u.id}`, JSON.stringify(finalProfile));
        } catch {}
      }

      return finalProfile;
    }

    if (isDev) {
      const devUser = {
        id: "647fb28f-2ab7-415e-84cd-87329017a7e0",
        email: "caotuanhiep@gmail.com",
        user_metadata: { full_name: "Hiệp Cao Tuấn" },
      } as unknown as User;
      setUser(devUser);
      loadProfile(devUser).finally(() => active && setLoading(false));

      const isFreshLogin =
        typeof window !== "undefined" &&
        (sessionStorage.getItem("tcdn4_auto_open_profile") === "1" ||
          sessionStorage.getItem("tcdn4_just_logged_in") === "1");

      if (isFreshLogin) {
        try {
          sessionStorage.removeItem("tcdn4_auto_open_profile");
          sessionStorage.removeItem("tcdn4_just_logged_in");
        } catch {}
        setProfileInitialTab("info");
        setProfileOpen(true);
        setLoginOpen(false);
      }
      return () => {
        active = false;
      };
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      loadProfile(data.user).finally(() => active && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      const isFreshLogin =
        typeof window !== "undefined" &&
        (sessionStorage.getItem("tcdn4_auto_open_profile") === "1" ||
          sessionStorage.getItem("tcdn4_just_logged_in") === "1" ||
          window.location.search.includes("code="));

      if (u) {
        loadProfile(u).then((p) => {
          if (!active) return;
          // Chỉ mở tự động nếu là FRESH LOGIN từ Google VÀ thành viên CHƯA TỪNG ĐIỂM DANH / CHƯA LƯU SỐ ĐIỆN THOẠI
          if (isFreshLogin) {
            try {
              sessionStorage.removeItem("tcdn4_auto_open_profile");
              sessionStorage.removeItem("tcdn4_just_logged_in");
            } catch {}

            const hasCheckedIn = Boolean(
              (p?.phone && p.phone.trim().length > 0) ||
              (p as any)?.has_checked_in ||
              (typeof window !== "undefined" && localStorage.getItem(`tcdn4_checked_in_${u.id}`))
            );

            // NẾU LÀ LẦN ĐẦU (chưa từng lưu SĐT / điểm danh) -> TỰ ĐỘNG BẬT POPUP
            // NẾU ĐÃ LƯU HỒ SƠ RỒI -> KHÔNG BẬT NỮA
            if (!hasCheckedIn) {
              setProfileInitialTab("info");
              setProfileOpen(true);
              setLoginOpen(false);
            }
          }
        });
      } else {
        setProfile(null);
      }

      // Tự động dọn dẹp URL param ?code= sau khi hoàn tất đăng nhập
      if (typeof window !== "undefined" && window.location.search.includes("code=")) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("code");
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search || ""));
      }
    });

    // Lắng nghe Supabase Realtime đa trình duyệt / đa thiết bị
    const channel = supabase.channel("tcdn4-global-realtime")
      .on("broadcast", { event: "profile_updated" }, () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("tcdn4_profile_updated"));
        }
      })
      .on("broadcast", { event: "registration_updated" }, () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("tcdn4_registration_updated"));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("tcdn4_profile_updated"));
          window.dispatchEvent(new Event("tcdn4_registration_updated"));
        }
      })
      .subscribe();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, []);

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
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const openProfile = useCallback((tab?: "info" | "attendance" | unknown) => {
    setProfileInitialTab(tab === "attendance" ? "attendance" : "info");
    setProfileOpen(true);
  }, []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<boolean> => {
      if (!user) return false;
      const merged: Profile = {
        ...(profile || {
          id: user.id,
          full_name: null,
          class_name: null,
          job_title: null,
          company: null,
          location_region: null,
          role: "member",
        }),
        ...updates,
      };

      setProfile(merged);

      // 1. Lưu vào localStorage
      try {
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(merged));
        localStorage.setItem(`tcdn4_checked_in_${user.id}`, "1");
      } catch {}

      // 2. Lấy session token để gửi kèm header Authorization
      try {
        let token = "";
        try {
          const { data: sessionData } = await getSupabase().auth.getSession();
          token = sessionData?.session?.access_token || "";
        } catch {}

        const validColumns = [
          "id",
          "full_name",
          "class_name",
          "job_title",
          "company",
          "location_region",
          "specific_location",
          "phone",
          "avatar_url",
          "birthday",
          "marital_status",
          "children_count",
          "attendance_status",
          "shirt_size",
          "delivery_address",
          "bio",
          "role",
        ];
        const cleanPayload: any = {};
        for (const k of validColumns) {
          if ((merged as any)[k] !== undefined) {
            cleanPayload[k] = (merged as any)[k];
          }
        }

        // Gọi qua endpoint server /api/profile (vừa ghi Supabase DB vừa ghi disk file data/profiles.json)
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        await fetch("/api/profile", {
          method: "POST",
          headers,
          body: JSON.stringify(cleanPayload),
        });

        // Dự phòng ghi trực tiếp từ client nếu có session
        if (!user.id.startsWith("dev-")) {
          const supabase = getSupabase();
          await supabase.from("profiles").upsert(cleanPayload);
        }

        // Bắn sự kiện profile_updated để toàn bộ giao diện cập nhật ngay
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("tcdn4_profile_updated"));
          window.dispatchEvent(new Event("tcdn4_registration_updated"));
          try {
            getSupabase().channel("tcdn4-global-realtime").send({
              type: "broadcast",
              event: "profile_updated",
              payload: { id: user.id, time: Date.now() },
            });
          } catch {}
        }
      } catch (err) {
        console.warn("Lỗi lưu hồ sơ:", err);
      }

      return true;
    },
    [user, profile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin:
        profile?.role === "admin" ||
        profile?.role === "committee" ||
        user?.email === "caotuanhiep@gmail.com" ||
        user?.email?.includes("admin") ||
        false,
      openLogin,
      openProfile,
      closeProfile,
      signOut,
      updateProfile,
    }),
    [user, profile, loading, openLogin, openProfile, closeProfile, signOut, updateProfile]
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
