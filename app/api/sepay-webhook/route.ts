import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadRegistrations, saveRegistrations } from "@/app/api/registrations/route";

function removeVietnameseTones(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra API Key từ Header nếu cấu hình SEPAY_API_KEY
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const configuredApiKey = process.env.SEPAY_API_KEY;

    if (configuredApiKey && authHeader) {
      const token = authHeader.replace(/^Apikey\s+/i, "").trim();
      if (token !== configuredApiKey.trim()) {
        return NextResponse.json(
          { success: false, message: "Unauthorized API Key" },
          { status: 401 }
        );
      }
    }

    // 2. Parse body từ SePay
    const data = await request.json();
    const {
      gateway,
      transactionDate,
      accountNumber,
      content,
      transferType,
      transferAmount,
      referenceCode,
    } = data;

    // Chỉ xử lý giao dịch tiền vào (tiền vào tài khoản lớp)
    if (transferType && transferType.toLowerCase() !== "in") {
      return NextResponse.json({
        success: true,
        message: "Ignored: Giao dịch không phải tiền vào",
      });
    }

    const rawContent = (content || "").toUpperCase();
    const cleanContent = removeVietnameseTones(rawContent).replace(/[^A-Z0-9]/g, "");
    const amountNum = Number(transferAmount) || 0;

    let matchedName = "Thành viên TCDN4";
    let matchedClass = "TC4";
    let isMatched = false;
    let matchedId = "";

    // 3. Khớp lệnh với danh sách đăng ký lưu trữ tập trung
    try {
      const allRegs = await loadRegistrations();
      if (allRegs && allRegs.length > 0) {
        const updated = allRegs.map((reg) => {
          if (reg.status === "confirmed") return reg;

          const regPhoneClean = (reg.phone || "").replace(/[^0-9]/g, "");
          const regPhoneLast4 = regPhoneClean.slice(-4);
          const regNameClean = removeVietnameseTones((reg.fullName || "").toUpperCase()).replace(/[^A-Z0-9]/g, "");
          const regIdClean = (reg.id || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

          // Khớp nếu nội dung chuyển khoản chứa 4 số cuối điện thoại, tên không dấu, hoặc ID đăng ký
          const phoneMatch = regPhoneLast4.length >= 4 && cleanContent.includes(regPhoneLast4);
          const nameMatch = regNameClean.length >= 3 && cleanContent.includes(regNameClean);
          const idMatch = regIdClean.length >= 4 && cleanContent.includes(regIdClean);

          if (!isMatched && (phoneMatch || nameMatch || idMatch)) {
            isMatched = true;
            matchedName = reg.fullName;
            matchedClass = reg.className;
            matchedId = reg.id;

            return {
              ...reg,
              status: "confirmed" as const,
              paidAmount: amountNum > 0 ? amountNum : reg.paidAmount,
              paymentRef: referenceCode || gateway || "SEPAY_AUTO",
              confirmedAt: new Date().toISOString(),
              note: (reg.note ? reg.note + " | " : "") + `SePay tự động khớp: ${referenceCode || gateway}`,
            };
          }
          return reg;
        });

        if (isMatched) {
          await saveRegistrations(updated);
        }
      }
    } catch (err) {
      console.warn("Lỗi khớp lệnh manifest registrations:", err);
    }

    // 4. Dự phòng cập nhật table Supabase registrations (nếu đã tạo bảng)
    if (isMatched) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from("registrations")
          .update({
            status: "confirmed",
            paid_amount: amountNum,
            payment_ref: referenceCode || gateway,
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", matchedId);
      } catch {}
    }

    // 5. Tự động bắn thông báo xác nhận thanh toán vào Nhóm Zalo qua Zalo Bot Webhook
    const zaloBotWebhook = process.env.ZALO_BOT_WEBHOOK_URL;
    const zaloNotification = `🔔 [XÁC NHẬN THANH TOÁN TỰ ĐỘNG - SEPAY]
━━━━━━━━━━━━━━━━━━━━
💰 Số tiền: +${amountNum.toLocaleString("vi-VN")} VNĐ
🏦 Ngân hàng: ${gateway || "Tài khoản lớp"} (${accountNumber || "..."})
📝 Nội dung: ${content || "TCDN4 Chuyển khoản"}
⏰ Thời gian: ${transactionDate || new Date().toLocaleString("vi-VN")}
🔢 Mã giao dịch: ${referenceCode || "N/A"}
━━━━━━━━━━━━━━━━━━━━
✨ Trạng thái: ${isMatched ? `Khớp lệnh thành công cho ${matchedName} (${matchedClass})` : "Đã ghi nhận tiền vào quỹ 15 năm!"}
🎉 Cảm ơn bạn đã đồng hành cùng Hội ngộ 15 năm TCDN4!`;

    if (zaloBotWebhook) {
      try {
        await fetch(zaloBotWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: zaloNotification,
            type: "sepay_payment_confirmed",
            matched: isMatched,
            name: matchedName,
            className: matchedClass,
            amount: amountNum,
          }),
        });
      } catch (err) {
        console.warn("Không gửi được Zalo Bot notification:", err);
      }
    }

    return NextResponse.json({
      success: true,
      matched: isMatched,
      matchedMember: isMatched ? `${matchedName} (${matchedClass})` : null,
      message: isMatched
        ? `Đã khớp thành công cho ${matchedName} (${matchedClass})`
        : "Đã nhận webhook giao dịch nhưng chưa khớp được với phiếu đăng ký nào",
    });
  } catch (err: any) {
    console.error("SePay webhook error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
