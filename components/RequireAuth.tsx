"use client";

import { useEffect, type ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

/** Client-side guard for pages that require login (proxy.ts also enforces it server-side). */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, openLogin } = useAuth();

  useEffect(() => {
    if (!loading && !user) openLogin();
  }, [loading, user, openLogin]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ueh">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-slate-500">
        <Lock size={32} />
        <p>Vui lòng đăng nhập để xem nội dung này.</p>
      </div>
    );
  }
  return <>{children}</>;
}
