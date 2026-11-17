"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import type { Profile } from "@/types/database";

export default function UsersPanel() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSupabase()
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(`Không tải được danh sách user: ${error.message}`);
        else setUsers((data ?? []) as Profile[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ueh">Quản lý user</h1>
      <p className="mb-6 text-sm text-slate-500">{users.length} thành viên.</p>

      {loading ? (
        <div className="flex justify-center py-20 text-ueh">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Nghề nghiệp</th>
                <th className="px-4 py-3">Công ty</th>
                <th className="px-4 py-3">Khu vực</th>
                <th className="px-4 py-3">Vai trò</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.full_name ?? "-"}</td>
                  <td className="px-4 py-3">{u.class_name ?? "-"}</td>
                  <td className="px-4 py-3">{u.job_title ?? "-"}</td>
                  <td className="px-4 py-3">{u.company ?? "-"}</td>
                  <td className="px-4 py-3">{u.location_region ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        u.role === "admin" ? "bg-ueh text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Chưa có user nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
