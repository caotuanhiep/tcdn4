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
  UserPlus,
  QrCode,
  CheckCircle2,
  Clock,
  Shirt,
  Cake,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAlumniData } from "@/components/AlumniDataProvider";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
import type { Profile } from "@/types/database";
import { getAvatarInitials } from "@/lib/avatar";
import MemberQrModal, { type QrTargetMember } from "@/app/admin/MemberQrModal";

const SHIRT_SIZES = [
  "S (Nam)", "M (Nam)", "L (Nam)", "XL (Nam)", "2XL (Nam)", "3XL (Nam)",
  "S (Nữ)", "M (Nữ)", "L (Nữ)", "XL (Nữ)",
];

function normalizeBirthdayForInput(raw?: string | null): string {
  if (!raw) return "";
  const str = String(raw).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }
  return "";
}

function formatBirthdayDisplay(raw?: string | null): string {
  if (!raw) return "";
  const str = String(raw).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, "0")}/${isoMatch[2].padStart(2, "0")}/${isoMatch[1]}`;
  }
  return str;
}

function getBirthdayBadgeMeta(raw?: string | null): { isToday: boolean; isThisMonth: boolean } {
  if (!raw) return { isToday: false, isThisMonth: false };
  const str = String(raw).trim();
  let day = 0;
  let month = 0;
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    const dmMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})/);
    if (dmMatch) {
      day = parseInt(dmMatch[1], 10);
      month = parseInt(dmMatch[2], 10);
    }
  }
  if (!day || !month) return { isToday: false, isThisMonth: false };
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();
  return {
    isToday: month === curMonth && day === curDay,
    isThisMonth: month === curMonth,
  };
}

const INITIAL_NEW_MEMBER = {
  full_name: "",
  class_name: "TC10",
  phone: "",
  birthday: "",
  job_title: "",
  company: "",
  location_region: "hcm",
  specific_location: "",
  marital_status: "married",
  children_count: 0,
  register_event: true,
  shirt_size: "L (Nam)",
  guests_count: 0,
  delivery_address: "",
  notify_zalo: false,
};

export default function UsersPanel() {
  const toast = useToast();
  const { lastUpdated, registrations, refresh: refreshAlumniData } = useAlumniData();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const [editingUser, setEditingUser] = useState<(Profile & { guests_count?: number }) | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMember, setNewMember] = useState(INITIAL_NEW_MEMBER);
  const [creatingMember, setCreatingMember] = useState(false);

  const [qrMember, setQrMember] = useState<QrTargetMember | null>(null);

  const findRegistrationForUser = useCallback(
    (u: Profile) => {
      const uid = (u.id || "").toLowerCase();
      const uphone = (u.phone || "").replace(/[^0-9]/g, "");
      return (
        registrations.find((r) => {
          if (uid && r.id && r.id.toLowerCase() === uid) return true;
          const rphone = (r.phone || "").replace(/[^0-9]/g, "");
          if (uphone.length >= 9 && rphone === uphone) return true;
          return false;
        }) || null
      );
    },
    [registrations]
  );

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
    const reg = findRegistrationForUser(user);
    setEditingUser({
      ...user,
      birthday: normalizeBirthdayForInput(user.birthday),
      location_region: user.location_region === "dn" ? "other" : user.location_region || "hcm",
      marital_status: user.marital_status || "married",
      guests_count: reg?.guestsCount || 0,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setNewMember(INITIAL_NEW_MEMBER);
    setIsCreateModalOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.full_name.trim()) {
      toast.error("Vui lòng nhập Họ và Tên thành viên!");
      return;
    }

    setCreatingMember(true);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...newMember,
          full_name: newMember.full_name.trim(),
          phone: newMember.phone.trim(),
          job_title: newMember.job_title.trim(),
          company: newMember.company.trim(),
          specific_location: newMember.specific_location.trim(),
          delivery_address: newMember.delivery_address.trim(),
          guests_count: newMember.register_event ? Number(newMember.guests_count) || 0 : 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Không tạo được hồ sơ trên máy chủ");
      }

      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
      }
      await refreshAlumniData();
      broadcastDataUpdate("profile");

      if (newMember.register_event && newMember.notify_zalo) {
        try {
          await fetch("/api/zalo-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "registration",
              userId: data.user?.id,
              fullName: newMember.full_name.trim(),
              className: newMember.class_name,
              shirtSize: newMember.shirt_size,
              phone: newMember.phone.trim(),
              address: newMember.delivery_address.trim() || "Tại sự kiện Cơ sở B",
              guestsCount: Number(newMember.guests_count) || 0,
            }),
          });
        } catch {}
      }

      toast.success(data.message || "Đã tạo thành viên mới thành công!");
      setIsCreateModalOpen(false);

      // Nếu Admin chọn đẩy sang đăng ký 15 năm -> bật ngay popup mã QR để gửi cho bạn đó thanh toán!
      if (newMember.register_event) {
        setQrMember({
          fullName: newMember.full_name.trim(),
          className: newMember.class_name,
          phone: newMember.phone.trim(),
          shirtSize: newMember.shirt_size,
          guestsCount: Number(newMember.guests_count) || 0,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo thành viên mới");
    } finally {
      setCreatingMember(false);
    }
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
          birthday: editingUser.birthday || "",
          marital_status: editingUser.marital_status || "married",
          role: editingUser.role,
          attendance_status: editingUser.attendance_status || null,
          shirt_size: editingUser.shirt_size || null,
          delivery_address: editingUser.delivery_address || "",
          guests_count:
            editingUser.attendance_status === "attending" ||
            editingUser.attendance_status === "attending_free"
              ? Math.max(0, Math.min(10, Number(editingUser.guests_count) || 0))
              : 0,
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
    const formattedBday = formatBirthdayDisplay(u.birthday).toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.company && u.company.toLowerCase().includes(q)) ||
      (u.job_title && u.job_title.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (formattedBday && formattedBday.includes(q)) ||
      (u.birthday && u.birthday.toLowerCase().includes(q))
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
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer"
            >
              <UserPlus size={14} className="text-ueh-gold" />
              <span>Thêm & Đăng ký hộ</span>
            </button>
            <button
              type="button"
              onClick={() => void fetchUsers()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Làm mới
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3 pt-4 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, công ty, nghề nghiệp, SĐT, sinh nhật..."
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
                <th className="py-3 px-3 whitespace-nowrap">Sinh nhật</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-ueh mb-2" />
                    <span className="text-xs font-semibold">Đang tải danh bạ thành viên...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy thành viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const reg = findRegistrationForUser(u);
                  const bdayDisplay = formatBirthdayDisplay(u.birthday);
                  const bdayMeta = getBirthdayBadgeMeta(u.birthday);
                  return (
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
                          <div className="flex items-center gap-1.5">
                            <span>{u.full_name || "Chưa đặt tên"}</span>
                            {reg?.registrationType === "attending_free" ||
                            u.attendance_status === "attending_free" ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                                <CheckCircle2 size={10} /> Miễn phí (0đ)
                              </span>
                            ) : reg?.status === "confirmed" ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 size={10} /> {reg.registrationType === "shirt_only" ? "Đã CK áo" : "Đã CK"}
                              </span>
                            ) : reg?.registrationType === "shirt_only" || u.attendance_status === "shirt_only" ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] font-bold text-ueh-orange">
                                <Shirt size={10} /> Đặt áo
                              </span>
                            ) : reg || u.attendance_status === "attending" ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                <Clock size={10} /> Đã ĐK 15N
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {u.id === "647fb28f-2ab7-415e-84cd-87329017a7e0" && (
                              <span className="text-[10px] text-emerald-600 font-bold">Chủ sở hữu</span>
                            )}
                            {(reg?.guestsCount || 0) > 0 && (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                +{reg?.guestsCount} người thân
                              </span>
                            )}
                          </div>
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
                      {bdayDisplay ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold border ${
                              bdayMeta.isToday
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : bdayMeta.isThisMonth
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            <Cake
                              size={11}
                              className={
                                bdayMeta.isToday
                                  ? "text-rose-500"
                                  : bdayMeta.isThisMonth
                                  ? "text-ueh-orange"
                                  : "text-slate-400"
                              }
                            />
                            <span>{bdayDisplay}</span>
                          </span>
                          {bdayMeta.isToday && (
                            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="text-[11px] text-slate-400 hover:text-ueh hover:underline cursor-pointer"
                          title="Bấm để bổ sung ngày sinh nhật"
                        >
                          Chưa có +
                        </button>
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setQrMember({
                              fullName: u.full_name || "Thành viên K33",
                              className: u.class_name,
                              phone: u.phone,
                              shirtSize: reg?.shirtSize || u.shirt_size,
                              guestsCount: reg?.guestsCount || 0,
                              paidAmount: reg?.paidAmount,
                              registrationType: reg?.registrationType,
                            })
                          }
                          className="p-1.5 rounded-lg text-ueh hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Lấy mã VietQR gửi thành viên thanh toán"
                        >
                          <QrCode size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-ueh hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa thành viên"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
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
                  <label
                    htmlFor="edit-member-phone"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Số điện thoại / Zalo
                  </label>
                  <input
                    id="edit-member-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-member-birthday"
                    className="flex items-center gap-1 text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    <Cake size={12} className="text-ueh-orange" />
                    <span>Ngày sinh nhật</span>
                  </label>
                  <input
                    id="edit-member-birthday"
                    name="birthday"
                    type="date"
                    autoComplete="bday"
                    value={editingUser.birthday || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, birthday: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-member-role"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Phân quyền vai trò
                  </label>
                  <select
                    id="edit-member-role"
                    name="role"
                    value={editingUser.role || "member"}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-ueh focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  >
                    <option value="member">Thành viên</option>
                    <option value="committee">Ban liên lạc</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-member-marital"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Tình trạng hôn nhân
                  </label>
                  <select
                    id="edit-member-marital"
                    name="marital_status"
                    value={editingUser.marital_status || "married"}
                    onChange={(e) => setEditingUser({ ...editingUser, marital_status: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  >
                    <option value="married">Đã kết hôn</option>
                    <option value="single">Độc thân vui tính</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-member-attendance"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Tham gia 15 năm
                  </label>
                  <select
                    id="edit-member-attendance"
                    name="attendance_status"
                    value={editingUser.attendance_status || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, attendance_status: e.target.value || null })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  >
                    <option value="">Chưa chọn</option>
                    <option value="attending">Có tham gia (1.000.000đ)</option>
                    <option value="attending_free">Có tham gia — Miễn chi phí họp lớp (0đ - Tỉnh xa)</option>
                    <option value="shirt_only">Không dự — Chỉ nhận áo kỷ niệm (250.000đ)</option>
                    <option value="not_attending">Không tham gia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Người thân đi cùng
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={editingUser.guests_count ?? 0}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, guests_count: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Địa chỉ nhận áo
                </label>
                <input
                  type="text"
                  value={editingUser.delivery_address || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, delivery_address: e.target.value })}
                  placeholder="Nhận tại Cơ sở B hoặc địa chỉ ship áo..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setQrMember({
                      fullName: editingUser.full_name || "Thành viên K33",
                      className: editingUser.class_name,
                      phone: editingUser.phone,
                      shirtSize: editingUser.shirt_size,
                      guestsCount: editingUser.guests_count || 0,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-ueh hover:bg-blue-100"
                >
                  <QrCode size={14} />
                  <span>Lấy mã QR</span>
                </button>
                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM CỰU SINH VIÊN & ĐĂNG KÝ HỘ (KHÔNG CẦN EMAIL) */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ueh text-white">
                <UserPlus size={16} className="text-ueh-gold" />
              </div>
              <h3 className="text-lg font-black text-ueh">Thêm Thành Viên & Đăng Ký Hộ</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Không cần email! Tạo hồ sơ trực tiếp vào danh bạ, đẩy sang danh sách họp mặt 15 năm và lấy mã VietQR gửi ngay cho bạn đó.
            </p>

            <form onSubmit={handleCreateMember} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Lớp sinh viên
                  </label>
                  <select
                    value={newMember.class_name}
                    onChange={(e) => setNewMember({ ...newMember, class_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                  >
                    <option value="TC10">Lớp TC10</option>
                    <option value="TC11">Lớp TC11</option>
                    <option value="TC12">Lớp TC12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="create-member-phone"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Số điện thoại / Zalo *
                  </label>
                  <input
                    id="create-member-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required={newMember.register_event}
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    placeholder="VD: 0909123456 (tạo mã QR SePay)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-member-birthday"
                    className="flex items-center gap-1 text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    <Cake size={12} className="text-ueh-orange" />
                    <span>Ngày sinh nhật (tùy chọn)</span>
                  </label>
                  <input
                    id="create-member-birthday"
                    name="birthday"
                    type="date"
                    autoComplete="bday"
                    value={newMember.birthday}
                    onChange={(e) => setNewMember({ ...newMember, birthday: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="create-member-marital"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1"
                >
                  Tình trạng hôn nhân
                </label>
                <select
                  id="create-member-marital"
                  name="marital_status"
                  value={newMember.marital_status}
                  onChange={(e) => setNewMember({ ...newMember, marital_status: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                >
                  <option value="married">Đã kết hôn</option>
                  <option value="single">Độc thân vui tính</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Khu vực sinh sống
                  </label>
                  <select
                    value={newMember.location_region}
                    onChange={(e) => setNewMember({ ...newMember, location_region: e.target.value })}
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
                    Địa chỉ cụ thể (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newMember.specific_location}
                    onChange={(e) => setNewMember({ ...newMember, specific_location: e.target.value })}
                    placeholder="VD: Quận 7, Đà Nẵng..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Chức danh (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newMember.job_title}
                    onChange={(e) => setNewMember({ ...newMember, job_title: e.target.value })}
                    placeholder="VD: Giám đốc, Trưởng phòng..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Công ty (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newMember.company}
                    onChange={(e) => setNewMember({ ...newMember, company: e.target.value })}
                    placeholder="VD: Vietcombank, FPT..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              {/* Khối đẩy sang đăng ký 15 năm */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Shirt size={16} className="text-emerald-700 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-emerald-950">
                        Đẩy luôn sang danh sách Đăng ký 15 Năm & Tạo mã QR
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Tự động ghi danh tham dự ngày 12/12 và mở ngay mã VietQR để gửi bạn thanh toán
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newMember.register_event}
                    onChange={(e) => setNewMember({ ...newMember, register_event: e.target.checked })}
                    className="h-4 w-4 accent-emerald-600 rounded"
                  />
                </label>

                {newMember.register_event && (
                  <div className="space-y-2.5 pt-2 border-t border-emerald-200/70">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Size Áo Polo
                        </label>
                        <select
                          value={newMember.shirt_size}
                          onChange={(e) => setNewMember({ ...newMember, shirt_size: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                        >
                          {SHIRT_SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Dẫn theo người thân
                        </label>
                        <select
                          value={newMember.guests_count}
                          onChange={(e) =>
                            setNewMember({ ...newMember, guests_count: Number(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                        >
                          <option value={0}>Đi một mình (0)</option>
                          <option value={1}>+1 người thân</option>
                          <option value={2}>+2 người thân</option>
                          <option value={3}>+3 người thân</option>
                          <option value={4}>+4 người thân</option>
                          <option value={5}>+5 người thân</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                        Địa chỉ nhận áo (tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={newMember.delivery_address}
                        onChange={(e) => setNewMember({ ...newMember, delivery_address: e.target.value })}
                        placeholder="VD: Nhận trực tiếp tại Cơ sở B hoặc địa chỉ ship..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={newMember.notify_zalo}
                        onChange={(e) => setNewMember({ ...newMember, notify_zalo: e.target.checked })}
                        className="h-3.5 w-3.5 accent-ueh rounded"
                      />
                      <span>Đồng thời bắn tin báo đăng ký mới vào nhóm Zalo lớp</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingMember}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {creatingMember ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : newMember.register_event ? (
                    <QrCode size={14} className="text-ueh-gold" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>
                    {creatingMember
                      ? "Đang tạo..."
                      : newMember.register_event
                      ? "Tạo & Lấy mã QR thanh toán"
                      : "Tạo hồ sơ thành viên"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP VIETQR GỬI CHO THÀNH VIÊN */}
      <MemberQrModal member={qrMember} onClose={() => setQrMember(null)} />
    </div>
  );
}
