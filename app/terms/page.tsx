import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng (Terms of Service)",
  description:
    "Điều khoản sử dụng cổng thông tin cộng đồng Cựu sinh viên TCDN4 - K33 UEH (tcdn4.top).",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ueh hover:underline mb-6"
        >
          <ArrowLeft size={14} /> Quay lại trang chủ TCDN4.top
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-ueh uppercase tracking-wide border border-blue-100 mb-3">
              <FileText size={14} className="text-ueh-orange" /> Terms of Service
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Điều Khoản Sử Dụng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Cổng thông tin Cựu sinh viên <strong>TCDN4 K33 UEH</strong> (https://tcdn4.top) • Cập nhật: 11/2026
            </p>
          </div>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">1. Phạm vi áp dụng</h2>
            <p>
              Website <strong>https://tcdn4.top</strong> là nền tảng cộng đồng phi lợi nhuận phục vụ kết nối cựu sinh viên, thầy cô và tổ chức chương trình Họp mặt 15 năm tập thể TCDN4 - K33 Đại học Kinh tế TP.HCM (UEH).
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">2. Quy tắc sử dụng & bảo vệ thông tin đồng môn</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Thành viên cung cấp thông tin điểm danh và đăng ký sự kiện chính xác để Ban Liên Lạc chuẩn bị áo kỷ niệm và sắp xếp tiệc chu đáo.</li>
              <li>Không sử dụng số điện thoại, thông tin cá nhân hoặc hình ảnh của đồng môn trong danh bạ cho mục đích thương mại, làm phiền hoặc trái quy định pháp luật.</li>
              <li>Hình ảnh tải lên Góc Kỷ Niệm và lời nhắn trong Sổ Lưu Bút phải phù hợp thuần phong mỹ tục và tôn trọng tập thể.</li>
            </ul>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">3. Đóng góp kinh phí sự kiện</h2>
            <p>
              Mọi khoản đóng góp kinh phí họp mặt 15 năm được chuyển trực tiếp vào tài khoản quỹ lớp do Ban Liên Lạc công bố chính thức trên website và được đối soát minh bạch, công khai cho tập thể.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">4. Quyền riêng tư</h2>
            <p>
              Việc thu thập và bảo vệ thông tin cá nhân tuân thủ đầy đủ{" "}
              <Link href="/privacy" className="font-bold text-ueh underline">
                Chính sách quyền riêng tư
              </Link>{" "}
              của TCDN4 K33 UEH.
            </p>
          </section>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs sm:text-sm text-slate-700 flex items-start gap-3">
            <Mail size={18} className="text-ueh shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ueh">Liên hệ Ban Liên Lạc</div>
              <p className="mt-0.5">
                Mọi thắc mắc xin gửi về email:{" "}
                <a href="mailto:caotuanhiep@gmail.com" className="font-bold text-ueh underline">
                  caotuanhiep@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
