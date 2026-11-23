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
import { getSupabase } from "@/lib/supabase/client";
import { authFetch, DATA_UPDATED_EVENT, REALTIME_CHANNEL_NAME } from "@/lib/api";
import type { Profile } from "@/types/database";
import type { AlumniStats, RegistrationItem } from "@/lib/alumni-server";

const EMPTY_STATS: AlumniStats = {
  checkedInCount: 0,
  attendingCount: 0,
  confirmedCount: 0,
  pendingCount: 0,
  singleCount: 0,
  classCounts: { all: 0, TC10: 0, TC11: 0, TC12: 0 },
  regionCounts: { all: 0, hcm: 0, hn: 0, other: 0, overseas: 0 },
};

interface AlumniDataContextValue {
  profiles: Profile[];
  registrations: RegistrationItem[];
  stats: AlumniStats;
  loading: boolean;
  lastUpdated: number;
  refresh: () => Promise<void>;
}

const AlumniDataContext = createContext<AlumniDataContextValue | null>(null);

export function AlumniDataProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [stats, setStats] = useState<AlumniStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);

  const inFlightRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedAtRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    if (inFlightRef.current) {
      pendingRefreshRef.current = true;
      return inFlightRef.current;
    }

    const run = (async () => {
      try {
        const res = await authFetch(`/api/alumni-data?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mountedRef.current || !data?.success) return;

        setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
        if (data.stats) setStats(data.stats);
        const now = Date.now();
        lastFetchedAtRef.current = now;
        setLastUpdated(now);
      } catch (err) {
        console.warn("[AlumniDataProvider] Lỗi tải dữ liệu:", err);
      } finally {
        if (mountedRef.current) setLoading(false);
        inFlightRef.current = null;
        if (pendingRefreshRef.current && mountedRef.current) {
          pendingRefreshRef.current = false;
          void fetchAll();
        }
      }
    })();

    inFlightRef.current = run;
    return run;
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void fetchAll();
    }, 250);
  }, [fetchAll]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchAll();

    // Lắng nghe sự kiện cập nhật cục bộ trong cùng trình duyệt
    const onLocalUpdate = () => {
      void fetchAll();
    };
    window.addEventListener(DATA_UPDATED_EVENT, onLocalUpdate);

    // Tự làm mới nhẹ khi người dùng mở lại tab sau >30s (đảm bảo đồng bộ trên điện thoại sau khi sleep)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchedAtRef.current > 30000) {
        void fetchAll();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Một kết nối Supabase Realtime duy nhất cho toàn ứng dụng
    const supabase = getSupabase();
    const channel = supabase
      .channel(REALTIME_CHANNEL_NAME)
      .on("broadcast", { event: "data_updated" }, () => {
        scheduleRefresh();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      window.removeEventListener(DATA_UPDATED_EVENT, onLocalUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [fetchAll, scheduleRefresh]);

  const value = useMemo<AlumniDataContextValue>(
    () => ({
      profiles,
      registrations,
      stats,
      loading,
      lastUpdated,
      refresh: fetchAll,
    }),
    [profiles, registrations, stats, loading, lastUpdated, fetchAll]
  );

  return (
    <AlumniDataContext.Provider value={value}>
      {children}
    </AlumniDataContext.Provider>
  );
}

export function useAlumniData(): AlumniDataContextValue {
  const ctx = useContext(AlumniDataContext);
  if (!ctx) {
    throw new Error("useAlumniData must be used within an AlumniDataProvider");
  }
  return ctx;
}
