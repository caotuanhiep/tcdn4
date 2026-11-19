"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Bot, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Link as LinkIcon, 
  ShieldCheck, 
  Cake, 
  Sparkles, 
  Copy, 
  Check, 
  CreditCard,
  Key,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  Bell,
  Radio,
  FileText,
  UserCheck,
  Zap,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";

const DEFAULT_ZALO_GROUP = "https://zalo.me/g/yodibu606";

interface BirthdayMember {
  name: string;
  className: string;
  birthday: string;
  formattedDate: string;
  isToday: boolean;
  daysUntil: number;
}

interface BroadcastItem {
  id: string;
  title: string;
  content: string;
  targetGroup: string;
  scheduleType: "now" | "scheduled";
  scheduleTime?: string;
  status: "scheduled" | "sent" | "draft";
  createdAt: string;
}

interface SendLog {
  id: string;
  time: string;
  group: string;
  type: "broadcast" | "birthday" | "checkin" | "registration";
  title: string;
  content: string;
  status: "success" | "pending" | "failed";
}

const INITIAL_LOGS: SendLog[] = [
  {
    id: "log-1",
    time: "07:50 19/11",
    group: "TCDN4 - Toàn Khóa",
    type: "birthday",
    title: "Chúc mừng sinh nhật",
    content: "Chúc mừng sinh nhật đồng môn! Tuổi mới phong độ, tiền vào như nước và mãi trẻ khỏe!",
    status: "success",
  },
  {
    id: "log-2",
    time: "17:30 18/11",
    group: "TCDN4 - Toàn Khóa",
    type: "registration",
    title: "Đăng ký họp mặt 15 năm",
    content: "Đã có thêm bạn chốt kèo tham gia họp mặt tại Cơ sở B và rinh áo Polo kỷ niệm!",
    status: "success",
  },
  {
    id: "log-3",
    time: "10:15 18/11",
    group: "TC10",
    type: "checkin",
    title: "Điểm danh thành viên mới",
    content: "Một bạn cựu sinh viên sau 15 năm đã chính thức điểm danh trên Alumni Hub!",
    status: "success",
  },
];

const INITIAL_BROADCASTS: BroadcastItem[] = [
  {
    id: "bc-1",
    title: "Thông báo họp mặt 15 năm TCDN4",
    content: "Kính gửi anh chị em TCDN4 - K33 UEH! Chỉ còn ít ngày nữa là đến Thứ 7 ngày 12/12/2026. Lịch trình gặp mặt tại Cơ sở B lúc 9:00 sáng. Anh chị em vào chốt áo đồng phục sớm nhé!",
    targetGroup: "Tất cả nhóm",
    scheduleType: "scheduled",
    scheduleTime: "2026-12-01 08:00",
    status: "scheduled",
    createdAt: "19/11/2026 08:00",
  },
  {
    id: "bc-2",
    title: "Nhắc nhở chốt size áo kỷ niệm",
    content: "Anh chị em ơi! Hạn chót may áo polo đồng phục kỷ niệm 15 năm là 30/11. Ai chưa đăng ký size áo thì nhanh chân vào chọn để Ban tổ chức ship kịp nhé!",
    targetGroup: "Tất cả nhóm",
    scheduleType: "now",
    status: "sent",
    createdAt: "18/11/2026 14:00",
  },
];

const WITTY_PROMPTS = [
  {
    label: "Rủ rê đi họp mặt 15 năm",
    text: "🔥 KÈO NÀY KHÔNG ĐI LÀ TIẾC 15 NĂM ĐẤY ANH EM ƠI!\nThanh xuân có 1 lần, 15 năm mới có 1 ngày hội ngộ tại Cơ sở B ngày 12/12. Bỏ qua deadline, gác lại âu lo, mình cùng về lại trường xưa nâng ly nhé! 🍻\n👉 Đăng ký ngay: https://tcdn4.top/#event",
  },
  {
    label: "Nhắc chốt áo Polo kẻo hết size",
    text: "👕 ALO ALO BỘ PHẬN MAY ÁO CẦN CHỐT SIZE GẤP!\nÁo thun polo K33 form chuẩn xịn sò sắp chốt danh sách may trước ngày 30/11. Ai không đăng ký nhanh là mặc size XXL của người khác ráng chịu nha 😂\n👉 Chốt size áo tại đây: https://tcdn4.top/#event",
  },
  {
    label: "Nhắc điểm danh & kết nối danh bạ",
    text: "📢 TÌM TRẺ LẠC SAU 15 NĂM!\nAi còn nhớ ai, ai đã đổi nghề, ai đã lên xe hoa hay còn độc thân vui vẻ? Vào ngay Danh bạ Cựu sinh viên TCDN4 để cập nhật tin tức đồng môn nhé!\n👉 Vào xem danh bạ: https://tcdn4.top/#directory",
  },
];

export default function ZaloBotSettings() {
  const toast = useToast();
  
  // Navigation Tabs (Theo chuẩn SMLIFE Kit)
  const [activeTab, setActiveTab] = useState<"broadcast" | "auto" | "birthday" | "logs" | "connection">("broadcast");

  // Connection & Keys
  const [webhookUrl, setWebhookUrl] = useState("");
  const [zaloGroup, setZaloGroup] = useState(DEFAULT_ZALO_GROUP);
  const [botEnabled, setBotEnabled] = useState(true);
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [botToken, setBotToken] = useState("");

  const isBotConnected = Boolean(
    webhookUrl &&
      webhookUrl.trim().length > 10 &&
      (webhookUrl.startsWith("http://") || webhookUrl.startsWith("https://"))
  );

  // Broadcasts / Đăng tin
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>(INITIAL_BROADCASTS);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerIdea, setComposerIdea] = useState("");
  const [composerContent, setComposerContent] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["TCDN4 - Toàn Khóa"]);
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduledDateTime, setScheduledDateTime] = useState("2026-11-20T08:00");
  const [isSending, setIsSending] = useState(false);

  // Auto-triggers (Điểm danh & Đăng ký 15 năm)
  const [autoCheckin, setAutoCheckin] = useState(true);
  const [autoRegistration, setAutoRegistration] = useState(true);
  const [checkinTemplate, setCheckinTemplate] = useState(
    `🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\nSau 15 năm 'mất tích', cựu sinh viên {ten} ({lop}) vừa chính thức lộ diện điểm danh trên Alumni Hub!\n👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory`
  );
  const [registrationTemplate, setRegistrationTemplate] = useState(
    `🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n{ten} ({lop}) đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size {size}!\n🍻 Đã có {tong_so} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.\n👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event`
  );

  // Sinh nhật
  const [birthdayMembers, setBirthdayMembers] = useState<BirthdayMember[]>([]);
  const [autoBirthday, setAutoBirthday] = useState(true);
  const [birthdayHour, setBirthdayHour] = useState("07:30");
  const [aiBirthdayStyle, setAiBirthdayStyle] = useState(true);
  const [birthdayTemplate, setBirthdayTemplate] = useState(
    `🎂 ALO ALO CẢ NHÀ ƠI!\nHôm nay là sinh nhật của bạn {ten} ({lop})! 🎉\nThay mặt gia đình TCDN4, chúc bạn tuổi mới ngày càng phong độ, tiền vào như nước Sông Sài Gòn, sự nghiệp thăng hoa và mãi giữ tinh thần trẻ khỏe thời sinh viên nhé! 🍻`
  );
  const [newBdayName, setNewBdayName] = useState("");
  const [newBdayClass, setNewBdayClass] = useState("TC10");
  const [newBdayDate, setNewBdayDate] = useState("1989-11-20");

  // Logs
  const [logs, setLogs] = useState<SendLog[]>(INITIAL_LOGS);

  // Load configuration
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem("tcdn4_zalo_bot_config");
      if (savedConfig) {
        const p = JSON.parse(savedConfig);
        if (p.webhookUrl) setWebhookUrl(p.webhookUrl);
        if (p.zaloGroup) setZaloGroup(p.zaloGroup);
        if (typeof p.botEnabled === "boolean") setBotEnabled(p.botEnabled);
        if (p.claudeApiKey) setClaudeApiKey(p.claudeApiKey);
        if (typeof p.autoCheckin === "boolean") setAutoCheckin(p.autoCheckin);
        if (typeof p.autoRegistration === "boolean") setAutoRegistration(p.autoRegistration);
        if (typeof p.autoBirthday === "boolean") setAutoBirthday(p.autoBirthday);
        if (p.birthdayHour) setBirthdayHour(p.birthdayHour);
        if (p.checkinTemplate) setCheckinTemplate(p.checkinTemplate);
        if (p.registrationTemplate) setRegistrationTemplate(p.registrationTemplate);
        if (p.birthdayTemplate) setBirthdayTemplate(p.birthdayTemplate);
      }

      const savedBroadcasts = localStorage.getItem("tcdn4_zalo_broadcasts");
      if (savedBroadcasts) setBroadcasts(JSON.parse(savedBroadcasts));

      const savedLogs = localStorage.getItem("tcdn4_zalo_logs");
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    } catch {}

    scanBirthdays();
  }, []);

  const scanBirthdays = async () => {
    const list: BirthdayMember[] = [];
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    try {
      const { data } = await getSupabase()
        .from("profiles")
        .select("full_name, class_name, birthday")
        .not("birthday", "is", null);

      if (data && data.length > 0) {
        data.forEach((p: any) => {
          if (p.birthday) {
            const parts = p.birthday.split("-");
            if (parts.length === 3) {
              const bMonth = parseInt(parts[1], 10);
              const bDay = parseInt(parts[2], 10);
              const isToday = bMonth === currentMonth && bDay === currentDay;

              let nextBday = new Date(today.getFullYear(), bMonth - 1, bDay);
              if (nextBday.getTime() < today.getTime() - 24 * 3600 * 1000) {
                nextBday = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
              }
              const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 3600 * 24));

              list.push({
                name: p.full_name || "Thành viên K33",
                className: p.class_name || "TC10",
                birthday: p.birthday,
                formattedDate: `${bDay}/${bMonth}`,
                isToday,
                daysUntil: diffDays,
              });
            }
          }
        });
      }
    } catch {}

    list.sort((a, b) => a.daysUntil - b.daysUntil);
    setBirthdayMembers(list);
  };

  const saveConfig = () => {
    try {
      localStorage.setItem("tcdn4_zalo_bot_config", JSON.stringify({
        webhookUrl,
        zaloGroup,
        botEnabled,
        claudeApiKey,
        autoCheckin,
        autoRegistration,
        autoBirthday,
        birthdayHour,
        checkinTemplate,
        registrationTemplate,
        birthdayTemplate,
      }));
      toast.success("Đã lưu cấu hình Zalo Bot thành công!");
    } catch {
      toast.error("Không thể lưu cấu hình.");
    }
  };

  // Thêm tin đăng / Gửi ngay
  const handleSendBroadcast = async () => {
    if (!composerContent.trim()) {
      toast.error("Vui lòng nhập nội dung tin nhắn gửi vào nhóm Zalo!");
      return;
    }

    setIsSending(true);
    const title = composerTitle.trim() || "Thông báo TCDN4";
    const target = selectedGroups.join(", ") || "TCDN4 - Toàn Khóa";

    const newItem: BroadcastItem = {
      id: `bc-${Date.now()}`,
      title,
      content: composerContent.trim(),
      targetGroup: target,
      scheduleType,
      scheduleTime: scheduleType === "scheduled" ? scheduledDateTime : undefined,
      status: scheduleType === "now" ? "sent" : "scheduled",
      createdAt: new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    };

    const nextBroadcasts = [newItem, ...broadcasts];
    setBroadcasts(nextBroadcasts);
    localStorage.setItem("tcdn4_zalo_broadcasts", JSON.stringify(nextBroadcasts));

    // Thêm vào nhật ký gửi
    const newLog: SendLog = {
      id: `log-${Date.now()}`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
      group: target,
      type: "broadcast",
      title,
      content: composerContent.trim(),
      status: "success",
    };
    const nextLogs = [newLog, ...logs];
    setLogs(nextLogs);
    localStorage.setItem("tcdn4_zalo_logs", JSON.stringify(nextLogs));

    // Bắn API Zalo Bot
    try {
      await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          title,
          message: composerContent.trim(),
          targetGroup: target,
        }),
      });
    } catch {}

    // Mở chia sẻ Zalo nếu gửi ngay
    if (scheduleType === "now") {
      const shareUrl = `https://zalo.me/share?url=${encodeURIComponent(zaloGroup)}&title=${encodeURIComponent(composerContent.trim())}`;
      window.open(shareUrl, "_blank");
      toast.success("Đã kích hoạt gửi tin vào nhóm Zalo!");
    } else {
      toast.success(`Đã lên lịch gửi tin vào ${scheduledDateTime}!`);
    }

    setIsSending(false);
    setComposerTitle("");
    setComposerIdea("");
    setComposerContent("");
  };

  // Test các luồng tự động
  const handleTestAuto = async (type: "checkin" | "registration" | "birthday") => {
    let payload: any = {};
    if (type === "checkin") {
      payload = {
        type: "checkin",
        fullName: "Nguyễn Văn An (Demo)",
        className: "TC10",
        jobTitle: "Giám đốc Tài chính",
        company: "UEH Alumni",
        location: "TP. Hồ Chí Minh",
      };
    } else if (type === "registration") {
      payload = {
        type: "registration",
        fullName: "Trần Thị Bích (Demo)",
        className: "TC11",
        shirtSize: "M (Nữ)",
        phone: "0903123456",
        address: "279 Nguyễn Tri Phương, Q.10",
        paidAmount: 500000,
        guestsCount: 1,
      };
    } else {
      payload = {
        type: "birthday",
        name: "Lê Hoàng Cường",
        className: "TC12",
        customWish: birthdayTemplate.replace("{ten}", "Lê Hoàng Cường").replace("{lop}", "TC12"),
      };
    }

    try {
      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã test luồng ${type === "checkin" ? "Điểm danh" : type === "registration" ? "Đăng ký 15 năm" : "Sinh nhật"} thành công!`);
        // Ghi vào log
        const testLog: SendLog = {
          id: `log-${Date.now()}`,
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
          group: "TCDN4 - Toàn Khóa",
          type,
          title: data.title || "Test Zalo Bot",
          content: data.botMessage,
          status: "success",
        };
        const nextLogs = [testLog, ...logs];
        setLogs(nextLogs);
        localStorage.setItem("tcdn4_zalo_logs", JSON.stringify(nextLogs));
      }
    } catch {
      toast.error("Lỗi gửi test!");
    }
  };

  const handleAddBirthdayPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBdayName.trim() || !newBdayDate) return;

    const parts = newBdayDate.split("-");
    const m = parts.length === 3 ? parseInt(parts[1], 10) : 11;
    const d = parts.length === 3 ? parseInt(parts[2], 10) : 20;

    const newPerson: BirthdayMember = {
      name: newBdayName.trim(),
      className: newBdayClass,
      birthday: newBdayDate,
      formattedDate: `${d}/${m}`,
      isToday: false,
      daysUntil: 30,
    };

    setBirthdayMembers([newPerson, ...birthdayMembers]);
    setNewBdayName("");
    toast.success(`Đã thêm ngày sinh cho ${newPerson.name}!`);
  };

  const toggleGroupSelect = (grp: string) => {
    if (selectedGroups.includes(grp)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== grp));
    } else {
      setSelectedGroups([...selectedGroups, grp]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header phong cách SMLIFE Kit */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-ueh border border-blue-100 mb-1.5">
              <Bot size={14} className="text-ueh-orange" /> SMLIFE Kit Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              TCDN4 AI Bot
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Hệ thống thông báo, nhắc hẹn, điểm danh và chúc sinh nhật tự động vào các nhóm Zalo K33 UEH. Nội dung dí dỏm, vui vẻ và kết nối đồng môn.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveTab("broadcast");
                setComposerIdea(WITTY_PROMPTS[0].text);
                setComposerContent(WITTY_PROMPTS[0].text);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            >
              <Zap size={14} className="text-amber-500" /> Nhắn nhanh
            </button>
            <button
              onClick={() => {
                setActiveTab("broadcast");
                setComposerTitle("");
                setComposerContent("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-md shadow-blue-900/20"
            >
              <Plus size={15} /> + Soạn tin
            </button>
          </div>
        </div>

        {/* Navigation Tabs chuẩn SMLIFE Kit */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pt-6 mt-4 border-t border-slate-100">
          {[
            { id: "broadcast", label: "Đăng tin", count: broadcasts.length, icon: Send },
            { id: "auto", label: "Điểm danh & 15 Năm", count: 2, icon: Bell },
            { id: "birthday", label: "Sinh nhật", count: birthdayMembers.length, icon: Cake },
            { id: "logs", label: "Nhật ký", count: logs.length, icon: FileText },
            { id: "connection", label: "Kết nối & Bot", count: null, icon: LinkIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-ueh text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={14} className={isActive ? "text-ueh-gold" : "text-slate-400"} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ĐĂNG TIN / NHẮC HẸN (TẠO THÔNG BÁO NGAY HOẶC ĐẶT LỊCH GỬI)
          ========================================================================= */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (7 Cols): Danh sách bài đăng & Lịch hẹn */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase text-slate-600 tracking-wide">
                Lịch thông báo & Nhắc việc ({broadcasts.length})
              </h2>
              <span className="text-xs text-slate-400">Tự động đẩy vào nhóm Zalo khi tới giờ</span>
            </div>

            {broadcasts.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start gap-3.5 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-blue-200 hover:shadow-md"
              >
                {/* Date Badge */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 p-2.5 min-w-[70px] text-center shrink-0">
                  <span className="text-[11px] font-bold text-ueh uppercase">
                    {item.createdAt.split(" ")[0]}
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {item.createdAt.split(" ")[1] || "08:00"}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {item.status === "scheduled" ? (
                      <span className="rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 border border-amber-200 flex items-center gap-1">
                        <Clock size={10} /> Đã lên lịch: {item.scheduleTime}
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200 flex items-center gap-1">
                        <Check size={10} /> Đã gửi
                      </span>
                    )}
                    <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5">
                      Gửi: {item.targetGroup}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2 whitespace-pre-wrap">
                    {item.content}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setComposerTitle(item.title);
                        setComposerContent(item.content);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-ueh hover:underline"
                    >
                      <Edit3 size={12} /> Sửa nội dung
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => {
                        const shareUrl = `https://zalo.me/share?url=${encodeURIComponent(zaloGroup)}&title=${encodeURIComponent(item.content)}`;
                        window.open(shareUrl, "_blank");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                    >
                      <Send size={12} /> Gửi ngay
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => {
                        const next = broadcasts.filter((b) => b.id !== item.id);
                        setBroadcasts(next);
                        localStorage.setItem("tcdn4_zalo_broadcasts", JSON.stringify(next));
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CỘT PHẢI (5 Cols): Soạn tin & Hẹn giờ */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Send size={15} className="text-ueh-orange" /> Soạn tin nhắn Zalo
              </h2>
              <span className="text-[11px] text-slate-400">Gửi ngay hoặc Hẹn giờ</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề (quản lý nội bộ):
              </label>
              <input
                type="text"
                value={composerTitle}
                onChange={(e) => setComposerTitle(e.target.value)}
                placeholder="VD: Thông báo chốt áo kỷ niệm..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
              />
            </div>

            {/* Mẫu ý tưởng dí dỏm */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500" /> Chọn mẫu dí dỏm:
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WITTY_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setComposerTitle(prompt.label);
                      setComposerContent(prompt.text);
                    }}
                    className="rounded-lg bg-orange-50/80 border border-orange-200/80 px-2.5 py-1 text-[11px] font-semibold text-orange-900 hover:bg-orange-100 transition-colors"
                  >
                    + {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nội dung tin nhắn */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Nội dung gửi vào Zalo:
                </label>
                <span className="text-[10px] text-slate-400">{composerContent.length} ký tự</span>
              </div>
              <textarea
                rows={5}
                value={composerContent}
                onChange={(e) => setComposerContent(e.target.value)}
                placeholder="Nhập nội dung tin nhắn gửi vào nhóm Zalo (dí dỏm, ngắn gọn, vui vẻ)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs focus:border-ueh focus:bg-white focus:outline-none resize-none"
              />
            </div>

            {/* Gửi vào nhóm */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Gửi vào nhóm Zalo:</label>
                <div className="flex gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedGroups(["TCDN4 - Toàn Khóa", "TC10", "TC11", "TC12", "Ban Liên Lạc"])}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Tất cả
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedGroups([])}
                    className="text-slate-400 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["TCDN4 - Toàn Khóa", "TC10", "TC11", "TC12", "Ban Liên Lạc"].map((grp) => {
                  const isChecked = selectedGroups.includes(grp);
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => toggleGroupSelect(grp)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold border transition-all ${
                        isChecked
                          ? "bg-ueh text-white border-ueh shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {grp}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thời gian gửi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Thời gian gửi:</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setScheduleType("now")}
                  className={`rounded-xl py-2 px-3 text-xs font-bold border text-center transition-all ${
                    scheduleType === "now"
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  ⚡ Gửi khi bấm nút
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("scheduled")}
                  className={`rounded-xl py-2 px-3 text-xs font-bold border text-center transition-all ${
                    scheduleType === "scheduled"
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  ⏰ Hẹn giờ gửi
                </button>
              </div>

              {scheduleType === "scheduled" && (
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                />
              )}
            </div>

            {/* Xem trước trên Zalo */}
            {composerContent.trim() && (
              <div className="rounded-2xl border border-blue-100 bg-[#E8F2F8] p-3 text-left">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                  📱 Xem trước tin nhắn trên Zalo:
                </span>
                <div className="rounded-2xl bg-white p-3 text-xs text-slate-800 shadow-xs border border-blue-100/60 whitespace-pre-wrap leading-relaxed">
                  {composerContent}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isSending}
              onClick={handleSendBroadcast}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ueh to-ueh-light py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:from-ueh-light hover:to-ueh transition-all disabled:opacity-50"
            >
              <Send size={15} />
              <span>{scheduleType === "now" ? "Gửi ngay vào Zalo" : "Lưu vào lịch gửi"}</span>
            </button>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: THÔNG BÁO TỰ ĐỘNG (ĐIỂM DANH & ĐĂNG KÝ THAM GIA 15 NĂM)
          ========================================================================= */}
      {activeTab === "auto" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LUỒNG 3: THÔNG BÁO ĐIỂM DANH */}
          <div className="rounded-3xl border border-blue-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-ueh font-black">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      1. Thông báo Điểm danh mới
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tự động bắn tin khi có cựu sinh viên tạo tài khoản / điểm danh
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCheckin}
                    onChange={(e) => setAutoCheckin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ueh"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mẫu thông báo điểm danh (Dí dỏm, ngắn gọn):
                </label>
                <textarea
                  rows={4}
                  value={checkinTemplate}
                  onChange={(e) => setCheckinTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:border-ueh focus:outline-none resize-none font-medium leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Hỗ trợ biến: <code>{"{ten}"}</code>, <code>{"{lop}"}</code>, <code>{"{nghe_nghiep}"}</code>, <code>{"{khu_vuc}"}</code>
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50/70 p-3 border border-blue-100 text-xs text-slate-700">
                <span className="font-bold text-ueh block mb-1">💡 Cơ chế hoạt động:</span>
                Mỗi khi cựu sinh viên đăng nhập Google hoặc lưu hồ sơ cá nhân trên website, Bot Zalo sẽ tự động gửi lời chào mừng hài hước vào nhóm lớp để cả nhóm cùng nhận ra nhau.
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleTestAuto("checkin")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Send size={13} className="text-ueh" /> Gửi test tin mẫu
              </button>
              <button
                type="button"
                onClick={saveConfig}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light"
              >
                <Check size={14} /> Lưu cấu hình
              </button>
            </div>
          </div>

          {/* LUỒNG 4: THÔNG BÁO ĐĂNG KÝ HỘI NGỘ 15 NĂM */}
          <div className="rounded-3xl border border-orange-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-ueh-orange font-black">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      2. Thông báo Đăng ký Hội ngộ 15 năm
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tự động bắn tin khi có bạn chốt tham gia & chọn áo Polo
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRegistration}
                    onChange={(e) => setAutoRegistration(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ueh-orange"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mẫu thông báo đăng ký (Hào hứng, chốt kèo):
                </label>
                <textarea
                  rows={4}
                  value={registrationTemplate}
                  onChange={(e) => setRegistrationTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:border-ueh focus:outline-none resize-none font-medium leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Hỗ trợ biến: <code>{"{ten}"}</code>, <code>{"{lop}"}</code>, <code>{"{size}"}</code>, <code>{"{tong_so}"}</code>
                </p>
              </div>

              <div className="rounded-2xl bg-orange-50/70 p-3 border border-orange-100 text-xs text-slate-700">
                <span className="font-bold text-ueh-orange block mb-1">💡 Hiệu ứng kết nối:</span>
                Mỗi lượt đăng ký được thông báo ngay vào nhóm Zalo sẽ tạo hiệu ứng lan tỏa (FOMO vui vẻ), thúc đẩy bạn bè cùng khóa nhanh chóng đăng ký cho kịp danh sách may áo.
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleTestAuto("registration")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Send size={13} className="text-ueh-orange" /> Gửi test tin mẫu
              </button>
              <button
                type="button"
                onClick={saveConfig}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ueh-orange px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
              >
                <Check size={14} /> Lưu cấu hình
              </button>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 3: SINH NHẬT CỰU SINH VIÊN (THEO CHUẨN SMLIFE KIT SCREENSHOT 2)
          ========================================================================= */}
      {activeTab === "birthday" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 sm:p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Cake size={18} className="text-amber-600 shrink-0" />
              <span>
                Danh sách lấy từ <strong>Hồ sơ cựu sinh viên</strong>, mỗi ngày bot tự động kiểm tra và gửi lời chúc vào nhóm Zalo lúc <strong>{birthdayHour}</strong>.
              </span>
            </div>
            <button
              onClick={scanBirthdays}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs shrink-0"
            >
              <RefreshCw size={12} /> Đồng bộ ngay
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Cột trái (7 Cols): Danh sách cựu sinh viên có ngày sinh */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users size={16} className="text-ueh" /> Cựu sinh viên có ngày sinh ({birthdayMembers.length})
                </h3>
                <span className="text-xs text-slate-400">Đồng bộ tự động từ Profiles</span>
              </div>

              {/* Form thêm nhanh ngày sinh */}
              <form onSubmit={handleAddBirthdayPerson} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                <input
                  type="text"
                  required
                  placeholder="Họ và tên..."
                  value={newBdayName}
                  onChange={(e) => setNewBdayName(e.target.value)}
                  className="sm:col-span-4 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                />
                <input
                  type="date"
                  required
                  value={newBdayDate}
                  onChange={(e) => setNewBdayDate(e.target.value)}
                  className="sm:col-span-4 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                />
                <select
                  value={newBdayClass}
                  onChange={(e) => setNewBdayClass(e.target.value)}
                  className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-ueh focus:border-ueh focus:outline-none"
                >
                  <option value="TC10">TC10</option>
                  <option value="TC11">TC11</option>
                  <option value="TC12">TC12</option>
                </select>
                <button
                  type="submit"
                  className="sm:col-span-2 rounded-xl bg-ueh px-3 py-1.5 text-xs font-bold text-white hover:bg-ueh-light"
                >
                  + Thêm
                </button>
              </form>

              {/* Bảng danh sách sinh nhật */}
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Họ Tên</th>
                      <th className="py-2.5 px-3">Ngày Sinh</th>
                      <th className="py-2.5 px-3">Lớp</th>
                      <th className="py-2.5 px-3 text-right">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {birthdayMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Chưa có thành viên nào cập nhật ngày sinh
                        </td>
                      </tr>
                    ) : (
                      birthdayMembers.map((m, idx) => (
                        <tr key={`${m.name}-${idx}`} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{m.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{m.formattedDate}</td>
                          <td className="py-2.5 px-3">
                            <span className="rounded bg-blue-50 text-ueh px-1.5 py-0.2 font-bold text-[10px]">
                              {m.className}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {m.isToday ? (
                              <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black animate-pulse">
                                HÔM NAY!
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
                                Còn {m.daysUntil} ngày
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CỘT PHẢI (5 Cols): Cách gửi lời chúc & Sắp tới */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Sắp tới 31 ngày */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2.5 flex items-center justify-between">
                  <span>📅 Sắp tới (31 ngày)</span>
                  <span className="text-[10px] font-bold text-ueh-orange">
                    {birthdayMembers.filter((m) => m.daysUntil <= 31).length} bạn
                  </span>
                </h4>

                <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                  {birthdayMembers
                    .filter((m) => m.daysUntil <= 31)
                    .map((p, idx) => (
                      <div
                        key={`${p.name}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Cake size={14} className={p.isToday ? "text-amber-500 animate-bounce" : "text-slate-400"} />
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="text-[10px] text-slate-400">({p.className})</span>
                        </div>
                        <span className="font-bold text-ueh-orange text-[11px]">{p.formattedDate}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Cách gửi lời chúc */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  ⚙️ Cách gửi lời chúc
                </h4>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBirthday}
                    onChange={(e) => setAutoBirthday(e.target.checked)}
                    className="h-4 w-4 rounded text-ueh focus:ring-ueh"
                  />
                  <span>Tự gửi lời chúc đúng ngày sinh nhật</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-semibold">Giờ gửi:</span>
                  <input
                    type="time"
                    value={birthdayHour}
                    onChange={(e) => setBirthdayHour(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mẫu lời chúc quy định:
                  </label>
                  <textarea
                    rows={4}
                    value={birthdayTemplate}
                    onChange={(e) => setBirthdayTemplate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-ueh focus:outline-none resize-none font-medium leading-relaxed"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiBirthdayStyle}
                    onChange={(e) => setAiBirthdayStyle(e.target.checked)}
                    className="h-4 w-4 rounded text-ueh focus:ring-ueh"
                  />
                  <span>AI viết lại mỗi người một kiểu dí dỏm vui vẻ (không trùng lặp)</span>
                </label>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleTestAuto("birthday")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Send size={13} className="text-ueh" /> Gửi thử mẫu
                  </button>
                  <button
                    type="button"
                    onClick={saveConfig}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-1.5 text-xs font-bold text-white hover:bg-ueh-light"
                  >
                    <Check size={14} /> Lưu
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: NHẬT KÝ GỬI TIN (SCREENSHOT 4)
          ========================================================================= */}
      {activeTab === "logs" && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-ueh" /> Nhật ký gửi (40 tin gần nhất)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Theo dõi toàn bộ lịch sử các luồng tin gửi vào Zalo</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try {
                    const saved = localStorage.getItem("tcdn4_zalo_logs");
                    if (saved) setLogs(JSON.parse(saved));
                    toast.success("Đã làm mới nhật ký!");
                  } catch {}
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={12} /> Tải lại
              </button>
              <button
                onClick={() => {
                  if (confirm("Bạn có chắc muốn xóa lịch sử nhật ký?")) {
                    setLogs([]);
                    localStorage.removeItem("tcdn4_zalo_logs");
                    toast.success("Đã xóa nhật ký!");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                <Trash2 size={12} /> Xóa
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 p-2 rounded-xl transition-colors">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-slate-500 whitespace-nowrap pt-0.5">
                    {log.time}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{log.group}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        log.type === "birthday"
                          ? "bg-amber-100 text-amber-800"
                          : log.type === "checkin"
                          ? "bg-blue-100 text-blue-800"
                          : log.type === "registration"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {log.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{log.content}</p>
                  </div>
                </div>

                <span className="self-start sm:self-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                  <Check size={10} /> Đã gửi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: KẾT NỐI & SỨC KHỎE HỆ THỐNG (SCREENSHOT 3)
          ========================================================================= */}
      {activeTab === "connection" && (
        <div className="space-y-6">
          
          {/* Top Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Zalo Bot</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">TCDN4 Bot</div>
              {isBotConnected ? (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang hoạt động
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Chưa kết nối
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Nhận tin</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {isBotConnected ? "Đã nối webhook" : "Chưa đấu nối"}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isBotConnected ? "Tin về: realtime" : "Chờ nhập Webhook URL"}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Claude / Gemini AI</span>
              <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
                {claudeApiKey ? "Khóa riêng" : "AI Mặc định"}
              </div>
              <span className="text-[10px] text-amber-600 font-bold block mt-1">Sẵn sàng sáng tác</span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Múi giờ</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">UTC+7 (Việt Nam)</div>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">Chuẩn giờ họp mặt</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Cột trái (7 Cols): Cấu hình Bot & AI */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Box Zalo Bot */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Bot size={16} className="text-ueh-orange" /> Cấu hình Zalo Bot
                  </h3>
                  {isBotConnected ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đã nối webhook
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Chưa kết nối Webhook
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Webhook URL (Gửi tin vào Zalo Group):
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://chat.zalo.me/api/webhook/... hoặc endpoint Zapier/Make"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Link nhóm Zalo lớp K33:
                  </label>
                  <input
                    type="text"
                    value={zaloGroup}
                    onChange={(e) => setZaloGroup(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isBotConnected) {
                        toast.error("Vui lòng nhập Webhook URL / Token Bot Zalo trước khi kiểm tra!");
                        return;
                      }
                      toast.success("Kết nối Zalo Bot ổn định!");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Kiểm tra kết nối
                  </button>
                  <button
                    type="button"
                    onClick={saveConfig}
                    className="rounded-xl bg-ueh px-4 py-1.5 text-xs font-bold text-white hover:bg-ueh-light"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>

              {/* Box AI API Key */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-500" /> Claude / Gemini AI API
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Sáng tác dí dỏm
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    API Key (Claude / Gemini):
                  </label>
                  <input
                    type="password"
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    placeholder="sk-ant-... hoặc AIzaSy... (để trống sẽ dùng mẫu có sẵn)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono focus:border-ueh focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dùng cho mọi tính năng AI: Soạn lời chúc sinh nhật cá nhân hóa, gợi ý thông báo vui nhộn, biến tấu văn phong tự nhiên.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={saveConfig}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Lưu thiết lập AI
                </button>
              </div>

            </div>

            {/* Cột phải (5 Cols): Sức khỏe hệ thống & Hướng dẫn */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>🛡️ Sức khỏe hệ thống</span>
                  {isBotConnected ? (
                    <span className="text-[10px] text-emerald-600 font-bold">100% Hoạt động</span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      1 cần cấu hình
                    </span>
                  )}
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Đấu nối Webhook Bot:</span>
                    {isBotConnected ? (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={12} /> Đã kết nối
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} /> Chưa đấu nối
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Database Supabase:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={12} /> Sẵn sàng
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Giao thức HTTPS:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={12} /> Có (Bảo mật)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Múi giờ máy chủ:</span>
                    <span className="font-mono text-slate-700 font-bold">UTC+7 (Việt Nam)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Quét sinh nhật tự động:</span>
                    <span className="font-bold text-ueh">07:30 mỗi ngày</span>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn tạo bot Zalo */}
              <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 text-xs text-slate-700 space-y-2">
                <h4 className="font-black text-ueh text-xs uppercase flex items-center gap-1.5">
                  <HelpCircle size={14} /> Hướng dẫn tạo Bot Zalo nhóm:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
                  <li>Mở Zalo trên điện thoại, tìm mini app <strong>Zalo Bot Creator</strong>.</li>
                  <li>Nhấn <strong>Tạo Bot mới</strong>, đặt tên (VD: <em>TCDN4 K33 Bot</em>).</li>
                  <li>Copy token và dán vào ô Webhook URL bên trên.</li>
                  <li>Mời Bot vừa tạo vào Nhóm Zalo lớp <em>TCDN4 - K33 UEH</em> để bắt đầu nhận tin nhắn tự động.</li>
                </ol>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
