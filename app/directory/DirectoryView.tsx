"use client";

import { useMemo, useState } from "react";
import { Briefcase, GraduationCap, Loader2, MapPin, Search } from "lucide-react";
import { useAlumniData } from "@/components/AlumniDataProvider";
import { getAvatarInitials } from "@/lib/avatar";

export default function DirectoryView() {
  const { profiles, loading } = useAlumniData();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [className, setClassName] = useState("");

  const regions = useMemo(
    () => [...new Set(profiles.map((p) => p.location_region).filter((x): x is string => !!x))].sort(),
    [profiles],
  );
  const classes = useMemo(
    () => [...new Set(profiles.map((p) => p.class_name).filter((x): x is string => !!x))].sort(),
    [profiles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter(
      (p) =>
        (!q || (p.full_name ?? "").toLowerCase().includes(q)) &&
        (!region || p.location_region === region) &&
        (!className || p.class_name === className),
    );
  }, [profiles, query, region, className]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-extrabold text-ueh md:text-4xl">Danh bạ cựu sinh viên</h1>
        <p className="text-slate-500">Tìm kiếm và kết nối lại với bạn bè cũ.</p>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-ueh focus:ring-2 focus:ring-ueh/20"
          />
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-ueh"
        >
          <option value="">Tất cả khu vực</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-ueh"
        >
          <option value="">Tất cả lớp</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-ueh">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-slate-500">Không tìm thấy cựu sinh viên phù hợp.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-ueh transition-colors group-hover:bg-ueh group-hover:text-white">
                  {getAvatarInitials(p.full_name)}
                </div>
                {p.class_name && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                    <GraduationCap size={12} /> {p.class_name}
                  </span>
                )}
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">{p.full_name ?? "Chưa cập nhật tên"}</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p className="flex items-start gap-3">
                  <Briefcase size={16} className="mt-0.5 shrink-0 text-blue-500" />
                  <span>
                    <span className="font-medium">{p.job_title ?? "Chưa cập nhật nghề nghiệp"}</span>
                    {p.company && <span className="block text-slate-500">{p.company}</span>}
                  </span>
                </p>
                {p.location_region && (
                  <p className="flex items-center gap-3">
                    <MapPin size={16} className="shrink-0 text-rose-500" /> {p.location_region}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
