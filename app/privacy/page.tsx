import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư (Privacy Policy)",
  description:
    "Chính sách bảo mật và quyền riêng tư của cổng thông tin Cựu sinh viên TCDN4 - K33 UEH (tcdn4.top).",
};

export default function PrivacyPolicyPage() {
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
              <ShieldCheck size={14} className="text-emerald-600" /> Privacy Policy
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Chính Sách Quyền Riêng Tư
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Áp dụng cho Cổng thông tin Cựu sinh viên <strong>TCDN4 K33 UEH</strong> (https://tcdn4.top) • Cập nhật: 11/2026
            </p>
          </div>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">1. Mục đích ứng dụng (App Purpose)</h2>
            <p>
              <strong>TCDN4 K33 UEH Alumni Hub (tcdn4.top)</strong> là cổng thông tin cộng đồng phi lợi nhuận dành riêng cho tập thể cựu sinh viên chuyên ngành Tài chính Doanh nghiệp 4 (TC10, TC11, TC12), Khóa 33 - Đại học Kinh tế TP.HCM (UEH), phục vụ kết nối danh bạ đồng môn, lưu giữ hình ảnh kỷ niệm và đăng ký tham gia sự kiện Hội ngộ 15 năm.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">2. Dữ liệu chúng tôi thu thập từ Google Sign-In</h2>
            <p>
              Khi bạn chọn <strong>Đăng nhập bằng Google</strong>, ứng dụng chỉ yêu cầu các quyền thông tin cơ bản (non-sensitive scopes: <code>openid</code>, <code>email</code>, <code>profile</code>) gồm:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Địa chỉ email Google (dùng để định danh tài khoản và phân quyền thành viên/Ban liên lạc).</li>
              <li>Họ tên hiển thị và ảnh đại diện mặc định (dùng để khởi tạo hồ sơ cựu sinh viên, bạn có thể tự đổi bất cứ lúc nào).</li>
            </ul>
            <p>
              Ứng dụng <strong>KHÔNG</strong> yêu cầu quyền đọc email Gmail, danh bạ, Google Drive hay bất kỳ dữ liệu riêng tư nhạy cảm nào khác từ tài khoản Google của bạn.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">3. Thông tin bạn tự nguyện cập nhật</h2>
            <p>
              Khi điểm danh hoặc đăng ký họp mặt 15 năm, bạn có thể chủ động cung cấp thêm: lớp (TC10/TC11/TC12), số điện thoại/Zalo, nghề nghiệp, công ty, khu vực sinh sống, ngày sinh, size áo Polo kỷ niệm và số lượng người thân đi cùng. Các thông tin liên hệ như số điện thoại được bảo vệ và chỉ hiển thị cho các thành viên đồng môn đã đăng nhập xác thực.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">4. Cam kết bảo mật & không chia sẻ dữ liệu</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mọi dữ liệu được lưu trữ bảo mật trên hạ tầng Supabase (PostgreSQL & RLS) và chỉ sử dụng cho mục đích kết nối nội bộ cựu sinh viên TCDN4 K33 UEH.</li>
              <li>Chúng tôi cam kết <strong>không bán, không cho thuê và không chia sẻ</strong> dữ liệu cá nhân của thành viên cho bất kỳ bên thứ ba thương mại nào.</li>
            </ul>
          </section>

          <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-base font-black text-ueh">5. Quyền chỉnh sửa & xóa dữ liệu cá nhân</h2>
            <p>
              Thành viên có toàn quyền tự chỉnh sửa thông tin hồ sơ bất kỳ lúc nào sau khi đăng nhập, hoặc liên hệ Ban Liên Lạc để yêu cầu xóa vĩnh viễn tài khoản và dữ liệu cá nhân khỏi hệ thống.
            </p>
          </section>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs sm:text-sm text-slate-700 flex items-start gap-3">
            <Mail size={18} className="text-ueh shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ueh">Liên hệ Ban Liên Lạc & Quản trị hệ thống</div>
              <p className="mt-0.5">
                Email hỗ trợ:{" "}
                <a href="mailto:caotuanhiep@gmail.com" className="font-bold text-ueh underline">
                  caotuanhiep@gmail.com
                </a>{" "}
                • Website: <strong>https://tcdn4.top</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
