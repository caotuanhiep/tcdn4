"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, UserCheck, Users, Search } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import type { Profile } from "@/types/database";

// Dữ liệu mẫu ban đầu để hiển thị ngay cả khi Supabase chưa có dữ liệu
const INITIAL_USERS: Profile[] = [
  {
    id: "usr-1",
    full_name: "Nguyễn Văn An",
    class_name: "TC10",
    job_title: "Giám đốc Tài chính",
    company: "Tập đoàn Hòa Bình",
    location_region: "TP. Hồ Chí Minh",
    role: "committee",
  },
  {
    id: "usr-2",
    full_name: "Trần Thị Bích",
    class_name: "TC11",
    job_title: "Trưởng phòng Kế toán",
    company: "Deloitte Vietnam",
    location_region: "TP. Hồ Chí Minh",
    role: "committee",
  },
  {
    id: "usr-3",
    full_name: "Lê Hoàng Cường",
    class_name: "TC12",
    job_title: "Quản lý Quỹ Đầu tư",
    company: "VinaCapital",
    location_region: "Hà Nội",
    role: "committee",
  },
  {
    id: "usr-4",
    full_name: "Phạm Hải Đăng",
    class_name: "TC10",
    job_title: "CEO & Founder",
    company: "FinTech Alpha",
    location_region: "Đà Nẵng",
    role: "committee",
  },
  {
    id: "usr-5",
    full_name: "Cao Tuấn Hiệp",
    class_name: "TC10",
    job_title: "Quản trị viên Hệ thống",
    company: "TCDN4 Alumni Hub",
    location_region: "TP. Hồ Chí Minh",
    role: "admin",
  },
  {
    id: "usr-6",
    full_name: "Hoàng Minh Em",
    class_name: "TC11",
    job_title: "Cố vấn Tài chính",
    company: "KPMG Australia",
    location_region: "Sydney, Úc",
    role: "member",
  },
];

export default function UsersPanel() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>(INITIAL_USERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    // Thử lấy dữ liệu từ bảng profiles trên Supabase nếu đã tạo bảng
    try {
      getSupabase()
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true })
        .then(({ data, error }) => {
          if (!active) return;
          if (!error && data && data.length > 0) {
            setUsers(data as Profile[]);
          }
        });
    } catch {
      // Dùng fallback
    }
    return () => {
      active = false;
    };
  }, []);

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const updated = users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u));
      setUsers(updated);

      // Thử cập nhật lên Supabase
      await getSupabase().from("profiles").update({ role: newRole }).eq("id", userId);
      toast.success(`Đã cập nhật vai trò thành công!`);
    } catch {
      toast.success(`Đã cập nhật vai trò nội bộ!`);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.class_name?.toLowerCase().includes(q) ||
      u.job_title?.toLowerCase().includes(q) ||
      u.company?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ueh">Quản Lý Danh Bạ & Ban Liên Lạc</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân quyền: <strong>Ban Liên Lạc</strong> và <strong>Admin</strong> được cấp quyền truy cập Admin Hub này.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Tìm theo tên, lớp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 focus:border-ueh focus:outline-none"
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Họ và tên</th>
              <th className="px-4 py-3">Lớp</th>
              <th className="px-4 py-3">Nghề nghiệp / Công ty</th>
              <th className="px-4 py-3">Khu vực</th>
              <th className="px-4 py-3 text-center">Vai trò & Quyền Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ueh/10 text-ueh font-black text-xs">
                      {(u.full_name || "?").charAt(0)}
                    </div>
                    <span>{u.full_name || "Chưa đặt tên"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-ueh text-xs">
                    {u.class_name || "TC10"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="font-semibold">{u.job_title || "-"}</div>
                  <div className="text-[11px] text-slate-400">{u.company || "-"}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.location_region || "TP.HCM"}</td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={u.role || "member"}
                    onChange={(e) => handleChangeRole(u.id, e.target.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors outline-none cursor-pointer ${
                      u.role === "admin"
                        ? "bg-ueh text-white border-ueh"
                        : u.role === "committee"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <option value="member">Thành viên (Member)</option>
                    <option value="committee">Ban Liên Lạc (Có quyền Admin)</option>
                    <option value="admin">Quản trị viên (Super Admin)</option>
                  </select>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                  Không tìm thấy thành viên phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
