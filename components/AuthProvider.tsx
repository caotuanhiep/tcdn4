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
  openProfile: () => void;
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

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      if (new URLSearchParams(window.location.search).get("dev_admin") === "1") {
        localStorage.setItem("tcdn4_dev_mode", "admin");
        document.cookie = "tcdn4_dev_mode=admin; path=/";
      }
      const devMode = localStorage.getItem("tcdn4_dev_mode");
      if (devMode === "admin" || document.cookie.includes("tcdn4_dev_mode=admin")) {
        document.cookie = "tcdn4_dev_mode=admin; path=/";
        setUser({
          id: "dev-admin-id",
          email: "caotuanhiep@gmail.com",
          app_metadata: {},
          user_metadata: { full_name: "Cao Tuấn Hiệp" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as any);
        setProfile({
          id: "dev-admin-id",
          full_name: "Cao Tuấn Hiệp",
          class_name: "TC10",
          job_title: "Trưởng Ban Liên Lạc",
          company: "UEH Alumni",
          location_region: "hcm",
          avatar_url: "/images/avatar-boy.png",
          birthday: "1989-11-20",
          role: "admin",
        });
        setLoading(false);
        return;
      }
    }

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

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      loadProfile(data.user).finally(() => active && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setTimeout(() => loadProfile(u), 0);

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
      }
      await getSupabase().auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const openProfile = useCallback(() => setProfileOpen(true), []);
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

      // Try persisting to Supabase
      try {
        const supabase = getSupabase();
        await supabase.from("profiles").upsert(merged);
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
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
