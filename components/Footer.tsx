import { GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#001122] py-10 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div className="flex items-center gap-2">
          <GraduationCap size={24} className="text-white" />
          <span className="text-xl font-bold text-white">
            TCDN4<span className="font-light text-blue-500">Hub</span>
          </span>
        </div>
        <p className="text-center text-sm md:text-right">
          Dành riêng cho cựu sinh viên TCDN4 - K33 UEH. Mạng lưới lưu giữ thanh xuân và kết nối dài hạn.
        </p>
      </div>
    </footer>
  );
}
