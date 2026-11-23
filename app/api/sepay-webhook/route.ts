import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadRegistrations, saveRegistrations } from "@/app/api/registrations/route";
import fs from "fs";
import path from "path";

const SEPAY_LOGS_PATH = path.join(process.cwd(), "data", "sepay-webhook-logs.json");

function appendSepayLog(entry: any) {
  try {
    const dir = path.dirname(SEPAY_LOGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let logs: any[] = [];
    if (fs.existsSync(SEPAY_LOGS_PATH)) {
      try {
        logs = JSON.parse(fs.readFileSync(SEPAY_LOGS_PATH, "utf-8"));
      } catch {
        logs = [];
      }
    }
    logs.unshift({
      time: new Date().toISOString(),
      ...entry,
    });
    if (logs.length > 50) logs = logs.slice(0, 50);
    fs.writeFileSync(SEPAY_LOGS_PATH, JSON.stringify(logs, null, 2), "utf-8");
  } catch {}
}

function removeVietnameseTones(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export async function GET() {
  let logs: any[] = [];
  try {
    if (fs.existsSync(SEPAY_LOGS_PATH)) {
      logs = JSON.parse(fs.readFileSync(SEPAY_LOGS_PATH, "utf-8"));
    }
  } catch {}
  return NextResponse.json({
    status: "active",
    endpoint: "https://tcdn4.top/api/sepay-webhook",
    logsCount: logs.length,
    recentLogs: logs.slice(0, 15),
  });
}

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra API Key từ Header nếu cấu hình SEPAY_API_KEY hoặc lưu trong bank-config
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    let configuredApiKey = process.env.SEPAY_API_KEY;

    if (!configuredApiKey) {
      try {
        const bankConfigPath = path.join(process.cwd(), "data", "bank-config.json");
        if (fs.existsSync(bankConfigPath)) {
          const cfg = JSON.parse(fs.readFileSync(bankConfigPath, "utf-8"));
          if (cfg.sepayApiKey) configuredApiKey = cfg.sepayApiKey;
        }
      } catch {}

      if (!configuredApiKey) {
        try {
          const admin = getSupabaseAdmin();
          if (admin) {
            const { data } = await admin.storage.from("alumni-media").download("settings/bank-config.json");
            if (data) {
              const cfg = JSON.parse(await data.text());
              if (cfg?.sepayApiKey) configuredApiKey = cfg.sepayApiKey;
            }
          }
        } catch {}
      }
    }

    if (configuredApiKey && configuredApiKey.trim() !== "") {
      const token = authHeader ? authHeader.replace(/^Apikey\s+/i, "").trim() : "";
      if (!token || token !== configuredApiKey.trim()) {
        appendSepayLog({
          status: "unauthorized",
          receivedAuth: authHeader || "(none)",
          message: "API Key không khớp hoặc bị thiếu",
        });
        return NextResponse.json(
          { success: false, message: "Unauthorized API Key" },
          { status: 401 }
        );
      }
    }

    // 2. Parse body từ SePay
    let data: any = {};
    try {
      data = await request.json();
    } catch {
      data = {};
    }

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
      appendSepayLog({
        status: "ignored_not_in",
        transferType,
        amount: transferAmount,
        content,
      });
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
    let matchedShirtSize = "L (Nam)";
    let isMatched = false;
    let matchedId = "";

    // 3. Khớp lệnh với danh sách đăng ký lưu trữ tập trung (loadRegistrations)
    try {
      const allRegs = await loadRegistrations();
      if (allRegs && allRegs.length > 0) {
        const updated = allRegs.map((reg) => {
          if (reg.status === "confirmed") return reg;

          const regPhoneClean = (reg.phone || "").replace(/[^0-9]/g, "");
          const regPhoneLast4 = regPhoneClean.slice(-4);
          const regNameClean = removeVietnameseTones((reg.fullName || "").toUpperCase()).replace(/[^A-Z0-9]/g, "");
          const regIdClean = (reg.id || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

          // Khớp nếu nội dung chuyển khoản chứa số điện thoại, 4 số cuối, tên không dấu, hoặc ID đăng ký
          const fullPhoneMatch = regPhoneClean.length >= 9 && cleanContent.includes(regPhoneClean);
          const phoneLast4Match = regPhoneLast4.length >= 4 && cleanContent.includes(regPhoneLast4);
          const nameMatch = regNameClean.length >= 3 && cleanContent.includes(regNameClean);
          const idMatch = regIdClean.length >= 4 && cleanContent.includes(regIdClean);

          if (!isMatched && (fullPhoneMatch || phoneLast4Match || nameMatch || idMatch)) {
            isMatched = true;
            matchedName = reg.fullName;
            matchedClass = reg.className;
            matchedId = reg.id;
            matchedShirtSize = reg.shirtSize || "L (Nam)";

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

      // 4. Nếu chưa khớp trong registrations, thử đối soát trong bảng profiles trên Supabase
      if (!isMatched) {
        const supabase = getSupabaseAdmin();
        const { data: dbProfiles } = await supabase.from("profiles").select("*");
        if (dbProfiles && dbProfiles.length > 0) {
          for (const p of dbProfiles) {
            const pPhone = (p.phone || "").replace(/[^0-9]/g, "");
            const pPhoneLast4 = pPhone.slice(-4);
            const pNameClean = removeVietnameseTones((p.full_name || "").toUpperCase()).replace(/[^A-Z0-9]/g, "");

            const fullPhoneMatch = pPhone.length >= 9 && cleanContent.includes(pPhone);
            const phoneLast4Match = pPhoneLast4.length >= 4 && cleanContent.includes(pPhoneLast4);
            const nameMatch = pNameClean.length >= 4 && cleanContent.includes(pNameClean);

            if (fullPhoneMatch || phoneLast4Match || nameMatch) {
              isMatched = true;
              matchedName = p.full_name || "Thành viên K33";
              matchedClass = (p.class_name as any) || "TC10";
              matchedId = p.id;
              matchedShirtSize = p.shirt_size || "L (Nam)";

              // Cập nhật profile lên attending
              await supabase.from("profiles").update({
                attendance_status: "attending",
              }).eq("id", p.id);

              // Cập nhật / Thêm mới vào danh sách registrations
              const currentRegs = await loadRegistrations();
              const newConfirmedReg = {
                id: p.id || `reg-${Date.now()}`,
                fullName: p.full_name || "Thành viên K33",
                className: (p.class_name as any) || "TC10",
                phone: p.phone || "",
                shirtSize: p.shirt_size || "L (Nam)",
                address: p.delivery_address || (p.location_region === "hn" ? "Hà Nội" : "TP.HCM"),
                guestsCount: 0,
                status: "confirmed" as const,
                paidAmount: amountNum > 0 ? amountNum : 1000000,
                paymentRef: referenceCode || gateway || "SEPAY_AUTO",
                confirmedAt: new Date().toISOString(),
                createdAt: new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
                note: `SePay tự động khớp từ hồ sơ danh bạ: ${referenceCode || gateway}`,
              };

              const existingIdx = currentRegs.findIndex(
                (r: any) => r.id === p.id || (pPhone && r.phone === pPhone)
              );
              if (existingIdx >= 0) {
                currentRegs[existingIdx] = { ...currentRegs[existingIdx], ...newConfirmedReg };
              } else {
                currentRegs.unshift(newConfirmedReg);
              }
              await saveRegistrations(currentRegs);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Lỗi khớp lệnh manifest registrations:", err);
    }

    // 5. Ghi log SePay để kiểm tra đối soát
    appendSepayLog({
      status: isMatched ? "matched" : "unmatched",
      amount: amountNum,
      gateway,
      accountNumber,
      content,
      cleanContent,
      transactionDate,
      referenceCode,
      matchedMember: isMatched ? `${matchedName} (${matchedClass})` : null,
    });

    // 6. Tự động bắn thông báo xác nhận chuyển khoản vào Zalo Bot
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tcdn4.top";
      await fetch(`${siteUrl}/api/zalo-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          fullName: matchedName,
          className: matchedClass,
          paidAmount: amountNum,
          shirtSize: matchedShirtSize || "L (Nam)",
          bankGateway: gateway || accountNumber || "Tài khoản lớp",
          content: content || "",
          transactionDate: transactionDate || new Date().toLocaleString("vi-VN"),
          referenceCode: referenceCode || "N/A",
        }),
      });
    } catch (zErr) {
      console.warn("Lỗi gửi tin Zalo Bot từ SePay webhook:", zErr);
    }

    return NextResponse.json({
      success: true,
      matched: isMatched,
      matchedMember: isMatched ? `${matchedName} (${matchedClass})` : null,
      message: isMatched
        ? `Đã khớp thành công cho ${matchedName} (${matchedClass})`
        : "Đã nhận webhook giao dịch nhưng chưa khớp được với thành viên nào",
    });
  } catch (err: any) {
    console.error("SePay webhook error:", err);
    appendSepayLog({
      status: "error",
      error: err.message,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
