"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Phone, 
  Sparkles, 
  GraduationCap, 
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { CommitteeMember, DEFAULT_COMMITTEE_MEMBERS, getCommitteeMembers, saveCommitteeMembers } from "@/lib/committee";

export default function CommitteePanel() {
  const toast = useToast();
  const [members, setMembers] = useState<CommitteeMember[]>(() =>
    typeof window !== "undefined" ? getCommitteeMembers() : DEFAULT_COMMITTEE_MEMBERS
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentMember, setCurrentMember] = useState<Partial<CommitteeMember>>({});

  useEffect(() => {
    setMembers(getCommitteeMembers());
  }, []);

  const handleOpenAdd = () => {
    setCurrentMember({
      id: `com-${Date.now()}`,
      name: "",
      className: "TC10",
      role: "Thành viên Ban Liên Lạc",
      duty: "Hỗ trợ kết nối cựu sinh viên",
      phone: "",
      badge: "Kết nối",
      avatarColor: "from-[#003B5C] to-[#0068FF]",
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (m: CommitteeMember) => {
    setCurrentMember({ ...m });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thành viên ban liên lạc này không?")) {
      const updated = members.filter((m) => m.id !== id);
      setMembers(updated);
      saveCommitteeMembers(updated);
      toast.success("Đã xóa thành viên ban liên lạc!");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember.name?.trim()) {
      toast.error("Vui lòng điền họ tên thành viên!");
      return;
    }

    const memberToSave = currentMember as CommitteeMember;
    const exists = members.some((m) => m.id === memberToSave.id);
    let updated: CommitteeMember[];

    if (exists) {
      updated = members.map((m) => (m.id === memberToSave.id ? memberToSave : m));
      toast.success("Đã cập nhật thông tin thành viên ban liên lạc!");
    } else {
      updated = [...members, memberToSave];
      toast.success("Đã thêm mới thành viên ban liên lạc!");
    }

    setMembers(updated);
    saveCommitteeMembers(updated);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-ueh flex items-center gap-2">
            <Users className="text-ueh-orange" /> Quản lý Ban Liên Lạc
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thiết lập danh sách ban liên lạc độc lập, vai trò, số điện thoại & ảnh đại diện hiển thị ngoài trang chủ.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-ueh-light transition-all"
        >
          <Plus size={16} /> Thêm thành viên BLL
        </button>
      </div>

      {/* Grid danh sách thành viên */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 shrink-0 rounded-xl ${m.avatarColor || "bg-ueh"} text-white flex items-center justify-center font-bold text-base overflow-hidden`}>
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      m.name.charAt(m.name.lastIndexOf(" ") + 1) || "B"
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 line-clamp-1">{m.name}</h4>
                    <span className="text-[11px] font-bold text-ueh-orange">{m.role}</span>
                  </div>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-ueh border border-blue-100">
                  {m.className}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-3">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <Phone size={13} className="text-ueh" /> {m.phone}
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {m.duty}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenEdit(m)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                <Edit3 size={13} /> Sửa
              </button>
              <button
                onClick={() => handleDelete(m.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Chỉnh Sửa / Thêm Mới */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-ueh mb-1">
              {members.some((m) => m.id === currentMember.id) ? "Chỉnh sửa thành viên BLL" : "Thêm thành viên Ban Liên Lạc"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cập nhật thông tin đại diện để hiển thị trên khu vực Ban Liên Lạc ngoài trang chủ.
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={currentMember.name || ""}
                    onChange={(e) => setCurrentMember({ ...currentMember, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: Cao Tuấn Hiệp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lớp</label>
                  <select
                    value={currentMember.className || "TC10"}
                    onChange={(e) => setCurrentMember({ ...currentMember, className: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  >
                    <option value="TC10">TC10</option>
                    <option value="TC11">TC11</option>
                    <option value="TC12">TC12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chức danh / Vai trò</label>
                  <input
                    type="text"
                    required
                    value={currentMember.role || ""}
                    onChange={(e) => setCurrentMember({ ...currentMember, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: Trưởng Ban Liên Lạc"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Huy hiệu tag</label>
                  <input
                    type="text"
                    value={currentMember.badge || ""}
                    onChange={(e) => setCurrentMember({ ...currentMember, badge: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: Điều phối, Hậu cần"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ (gắn Zalo)</label>
                <input
                  type="text"
                  required
                  value={currentMember.phone || ""}
                  onChange={(e) => setCurrentMember({ ...currentMember, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  placeholder="VD: 0903 123 456"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link Ảnh đại diện (URL hoặc để trống dùng màu)</label>
                <input
                  type="text"
                  value={currentMember.avatarUrl || ""}
                  onChange={(e) => setCurrentMember({ ...currentMember, avatarUrl: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  placeholder="https://... hoặc /images/..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhiệm vụ / Phụ trách</label>
                <textarea
                  rows={2}
                  value={currentMember.duty || ""}
                  onChange={(e) => setCurrentMember({ ...currentMember, duty: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  placeholder="Mô tả công việc phụ trách trong dịp 15 năm..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white hover:bg-ueh-light"
                >
                  <Save size={14} /> Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
