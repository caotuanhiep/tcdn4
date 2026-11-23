"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Users,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  MapPin,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAlumniData } from "@/components/AlumniDataProvider";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
import type { Profile } from "@/types/database";
import { getAvatarInitials } from "@/lib/avatar";

const SHIRT_SIZES = [
  "S (Nam)", "M (Nam)", "L (Nam)", "XL (Nam)", "2XL (Nam)", "3XL (Nam)",
  "S (Nữ)", "M (Nữ)", "L (Nữ)", "XL (Nữ)",
];

export default function UsersPanel() {
  const toast = useToast();
  const { lastUpdated, refresh: refreshAlumniData } = useAlumniData();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch(`/api/admin/users?t=${Date.now()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else if (!res.ok) {
        toast.error(data?.error || "Không tải được danh bạ từ máy chủ");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi tải danh bạ");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Tự động đồng bộ mỗi khi database có thay đổi realtime (qua AlumniDataProvider)
  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers, lastUpdated]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    const previous = [...users];
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));

    try {
      const res = await authFetch("/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Lỗi lưu quyền lên database gốc");
      }
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
      }
      await refreshAlumniData();
      broadcastDataUpdate("profile");
      toast.success(
        `Đã cập nhật vai trò thành ${
          newRole === "admin" ? "Super Admin" : newRole === "committee" ? "Ban liên lạc" : "Thành viên"
        }!`
      );
    } catch (err: any) {
      setUsers(previous);
      toast.error(`Không thể lưu vai trò: ${err?.message || "Lỗi kết nối máy chủ"}`);
    }
  };

  const handleOpenEdit = (user: Profile) => {
    setEditingUser({
      ...user,
      location_region: user.location_region === "dn" ? "other" : user.location_region || "hcm",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEdit(true);
    const previous = [...users];

    try {
      const res = await authFetch("/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editingUser.full_name?.trim() || "",
          class_name: editingUser.class_name,
          job_title: editingUser.job_title,
          company: editingUser.company,
          location_region: editingUser.location_region,
          specific_location: editingUser.specific_location,
          phone: editingUser.phone?.trim() || "",
          role: editingUser.role,
          attendance_status: editingUser.attendance_status || null,
          shirt_size: editingUser.shirt_size || null,
          delivery_address: editingUser.delivery_address || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Lỗi cập nhật database gốc");
      }

      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? data.user : u)));
      }
      await refreshAlumniData();
      broadcastDataUpdate("profile");
      toast.success("Đã lưu thay đổi vào database gốc thành công!");
      setIsEditModalOpen(false);
    } catch (err: any) {
      setUsers(previous);
      toast.error("Lỗi cập nhật: " + (err?.message || "Lỗi máy chủ"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi danh bạ và danh sách đăng ký?")) return;

    const previous = [...users];
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const res = await authFetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Lỗi xóa thành viên");
      }
      await refreshAlumniData();
      broadcastDataUpdate("profile");
      toast.success("Đã xóa thành viên khỏi database gốc!");
    } catch (err: any) {
      setUsers(previous);
      toast.error("Lỗi xóa: " + (err?.message || "Lỗi máy chủ"));
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterClass !== "all" && u.class_name !== filterClass) return false;
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.company && u.company.toLowerCase().includes(q)) ||
      (u.job_title && u.job_title.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-ueh border border-blue-100 mb-1.5">
              <Users size={13} className="text-ueh-orange" /> Quản trị Danh bạ & Phân quyền
            </div>
            <h3 className="text-xl font-black text-ueh sm:text-2xl">
              Danh Bạ Cựu Sinh Viên ({users.length})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mọi thay đổi được ghi đè trực tiếp vào Database gốc (Supabase) và cập nhật tức thời trên toàn website.
            </p>
          </div>
          <button
            onClick={() => void fetchUsers()}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Làm mới danh sách
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3 pt-4 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, công ty, nghề nghiệp, SĐT..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
            >
              <option value="all">Tất cả lớp</option>
              <option value="TC10">Lớp TC10</option>
              <option value="TC11">Lớp TC11</option>
              <option value="TC12">Lớp TC12</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Super Admin</option>
              <option value="committee">Ban liên lạc</option>
              <option value="member">Thành viên</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3">Nghề nghiệp & Công ty</th>
                <th className="py-3 px-3">Khu vực / SĐT</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-ueh mb-2" />
                    <span className="text-xs font-semibold">Đang tải danh bạ thành viên...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Không tìm thấy thành viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ueh/10 font-bold text-ueh text-xs overflow-hidden shrink-0">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar_url} alt={u.full_name || ""} className="h-full w-full object-cover" />
                          ) : (
                            getAvatarInitials(u.full_name)
                          )}
                        </div>
                        <div>
                          <div>{u.full_name || "Chưa đặt tên"}</div>
                          {u.id === "647fb28f-2ab7-415e-84cd-87329017a7e0" && (
                            <span className="text-[10px] text-emerald-600 font-bold">Chủ sở hữu</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-ueh border border-blue-100">
                        {u.class_name || "TC10"}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-[200px] truncate">
                      <div className="font-semibold text-slate-800 truncate">{u.job_title || "Cựu sinh viên"}</div>
                      <div className="text-[11px] text-slate-400 truncate">{u.company || "UEH Alumni"}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700">
                        <MapPin size={11} className="text-rose-500" />
                        <span>
                          {u.specific_location ||
                            (u.location_region === "hn"
                              ? "Hà Nội"
                              : u.location_region === "dn" || u.location_region === "other"
                              ? "Tỉnh khác"
                              : u.location_region === "overseas"
                              ? "Quốc tế"
                              : "TP.HCM")}
                        </span>
                      </div>
                      {u.phone && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {u.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        value={u.role || "member"}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border transition-colors ${
                          u.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : u.role === "committee"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <option value="member">Thành viên</option>
                        <option value="committee">Ban liên lạc</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-ueh hover:bg-slate-100 transition-colors"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Xóa thành viên"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHỈNH SỬA THÀNH VIÊN */}
      {isEditModalOpen && editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-black text-ueh mb-1">Chỉnh Sửa Thông Tin Thành Viên</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cập nhật trực tiếp vào bảng profiles trên Database gốc và tự động đồng bộ danh sách 15 năm.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.full_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Lớp sinh viên
                  </label>
                  <select
                    value={editingUser.class_name || "TC10"}
                    onChange={(e) => setEditingUser({ ...editingUser, class_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  >
                    <option value="TC10">Lớp TC10</option>
                    <option value="TC11">Lớp TC11</option>
                    <option value="TC12">Lớp TC12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Chức danh / Nghề nghiệp
                  </label>
                  <input
                    type="text"
                    value={editingUser.job_title || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, job_title: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Công ty / Doanh nghiệp
                  </label>
                  <input
                    type="text"
                    value={editingUser.company || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, company: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Khu vực
                  </label>
                  <select
                    value={editingUser.location_region || "hcm"}
                    onChange={(e) => setEditingUser({ ...editingUser, location_region: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  >
                    <option value="hcm">TP. Hồ Chí Minh</option>
                    <option value="hn">Hà Nội</option>
                    <option value="other">Tỉnh khác</option>
                    <option value="overseas">Quốc tế / Nước ngoài</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Địa chỉ cụ thể
                  </label>
                  <input
                    type="text"
                    value={editingUser.specific_location || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, specific_location: e.target.value })}
                    placeholder="VD: Quận 7, Đà Nẵng, Sydney..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Số điện thoại / Zalo
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Phân quyền vai trò
                  </label>
                  <select
                    value={editingUser.role || "member"}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-ueh focus:border-ueh focus:outline-none"
                  >
                    <option value="member">Thành viên</option>
                    <option value="committee">Ban liên lạc</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Tham gia 15 năm
                  </label>
                  <select
                    value={editingUser.attendance_status || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, attendance_status: e.target.value || null })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  >
                    <option value="">Chưa chọn</option>
                    <option value="attending">Có tham gia</option>
                    <option value="not_attending">Không tham gia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Size Áo Polo
                  </label>
                  <select
                    value={editingUser.shirt_size || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, shirt_size: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  >
                    <option value="">Chưa chọn</option>
                    {SHIRT_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-ueh-light disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{savingEdit ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
