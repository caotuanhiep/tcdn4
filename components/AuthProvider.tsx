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

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  openLogin: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    async function loadProfile(u: User | null) {
      if (!u) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
      if (!active) return;
      if (data) {
        setProfile(data as Profile);
        return;
      }
      // First login: try to create a profile row (requires RLS insert policy).
      const meta = u.user_metadata ?? {};
      const fullName = (meta.full_name ?? meta.name ?? u.email ?? null) as string | null;
      const { data: created } = await supabase
        .from("profiles")
        .insert({ id: u.id, full_name: fullName, role: "member" })
        .select("*")
        .maybeSingle();
      if (active) setProfile((created as Profile | null) ?? null);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      loadProfile(data.user).finally(() => active && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // Defer to avoid deadlocks inside the auth callback.
      setTimeout(() => loadProfile(u), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Open the login modal when redirected from a protected route (?login=1).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("login") === "1") {
      setTimeout(() => setLoginOpen(true), 0);
    }
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      openLogin,
      signOut,
    }),
    [user, profile, loading, openLogin, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
