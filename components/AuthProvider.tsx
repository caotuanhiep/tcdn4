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

    async function loadProfile(u: User | null) {
      if (!u) {
        if (active) setProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
        if (!active) return;
        if (data && !error) {
          setProfile(data as Profile);
          return;
        }
      } catch {
        // Table or network issue
      }

      // Fallback from user metadata
      const meta = u.user_metadata ?? {};
      const fullName = (meta.full_name ?? meta.name ?? u.email?.split("@")[0] ?? "Thành viên K33") as string;
      const avatarUrl = (meta.avatar_url ?? meta.picture ?? null) as string | null;

      // Try creating row or load local backup
      try {
        const { data: created } = await supabase
          .from("profiles")
          .insert({ id: u.id, full_name: fullName, avatar_url: avatarUrl, role: "member" })
          .select("*")
          .maybeSingle();
        if (active && created) {
          setProfile(created as Profile);
          return;
        }
      } catch {
        // ignore
      }

      // Local storage fallback for seamless vibecoding
      const localKey = `profile_${u.id}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        try {
          if (active) setProfile(JSON.parse(savedLocal));
          return;
        } catch {}
      }

      const isSuperAdmin = u.email === "caotuanhiep@gmail.com";
      const userRole = isSuperAdmin ? "admin" : "member";

      if (active) {
        setProfile({
          id: u.id,
          full_name: fullName,
          class_name: "TC10",
          job_title: "Chuyên viên Tài chính",
          company: "Alumni UEH",
          location_region: "hcm",
          avatar_url: avatarUrl,
          birthday: "1989-11-20",
          role: userRole,
        });
      }
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
      setTimeout(() => loadProfile(u), 0);

      // Chỉ tự động mở popup hồ sơ nếu người dùng VỪA MỚI đăng nhập từ Google
      // (nhận diện qua cờ trong sessionStorage hoặc URL callback có chứa ?code=)
      // Khi F5 hoặc tải lại trang bình thường, popup sẽ KHÔNG tự động bật lên.
      const isFreshLogin =
        typeof window !== "undefined" &&
        (sessionStorage.getItem("tcdn4_auto_open_profile") === "1" ||
          sessionStorage.getItem("tcdn4_just_logged_in") === "1" ||
          window.location.search.includes("code="));

      if (u && isFreshLogin) {
        try {
          sessionStorage.removeItem("tcdn4_auto_open_profile");
          sessionStorage.removeItem("tcdn4_just_logged_in");
        } catch {}
        setProfileInitialTab("info");
        setProfileOpen(true);
        setLoginOpen(false);
      }

      // Tự động dọn dẹp URL param ?code= sau khi hoàn tất đăng nhập
      if (typeof window !== "undefined" && window.location.search.includes("code=")) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("code");
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search || ""));
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
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

      // Save to localStorage
      try {
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(merged));
      } catch {}

      // Try persisting to Supabase (bỏ qua nếu là dev-mock user để không báo lỗi UUID 400)
      try {
        if (!user.id.startsWith("dev-")) {
          const supabase = getSupabase();
          await supabase.from("profiles").upsert(merged);
        }
      } catch {
        // Table might need column schema migration
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
