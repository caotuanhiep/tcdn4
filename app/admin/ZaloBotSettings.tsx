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
  Key, 
  MessageSquare, 
  Users, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Bell, 
  Radio, 
  FileText, 
  UserCheck, 
  Zap, 
  ExternalLink, 
  Share2, 
  ArrowRight, 
  Wand2, 
  Smartphone, 
  CheckCheck, 
  Hash, 
  Shield, 
  Info,
  ChevronRight,
  Settings,
  Save,
  DollarSign,
  Cpu,
  Database
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";

const DEFAULT_ZALO_GROUP = "https://zalo.me/g/yodibu606";

export interface ZaloGroupItem {
  id: string;
  name: string;
  link?: string;
  verifyCode: string;
  chatId?: string;
  verifiedAt?: string;
  status: "verified" | "pending";
  isDefault: boolean;
  receiveCheckin: boolean;
  receiveRegistration: boolean;
  receiveBirthday: boolean;
  receivePayment?: boolean;
  createdAt: string;
}

const INITIAL_GROUPS: ZaloGroupItem[] = [
  {
    id: "grp-all",
    name: "TCDN4 - Toàn Khóa K33",
    link: "https://zalo.me/g/yodibu606",
    verifyCode: "#TCDN4-ALL",
    status: "verified",
    isDefault: true,
    receiveCheckin: true,
    receiveRegistration: true,
    receiveBirthday: true,
    receivePayment: false,
    createdAt: "18/11/2026",
  },
  {
    id: "grp-tc10",
    name: "Lớp TC10 - K33 UEH",
    link: "",
    verifyCode: "#TCDN4-TC10",
    status: "verified",
    isDefault: false,
    receiveCheckin: true,
    receiveRegistration: true,
    receiveBirthday: true,
    receivePayment: false,
    createdAt: "18/11/2026",
  },
  {
    id: "grp-tc11",
    name: "Lớp TC11 - K33 UEH",
    link: "",
    verifyCode: "#TCDN4-TC11",
    status: "verified",
    isDefault: false,
    receiveCheckin: true,
    receiveRegistration: true,
    receiveBirthday: true,
    receivePayment: false,
    createdAt: "18/11/2026",
  },
  {
    id: "grp-tc12",
    name: "Lớp TC12 - K33 UEH",
    link: "",
    verifyCode: "#TCDN4-TC12",
    status: "verified",
    isDefault: false,
    receiveCheckin: true,
    receiveRegistration: true,
    receiveBirthday: true,
    receivePayment: false,
    createdAt: "18/11/2026",
  },
  {
    id: "grp-bll",
    name: "Ban Liên Lạc & Tổ Hậu Cần",
    link: "",
    verifyCode: "#TCDN4-BLL",
    status: "verified",
    isDefault: false,
    receiveCheckin: true,
    receiveRegistration: true,
    receiveBirthday: false,
    receivePayment: true,
    createdAt: "18/11/2026",
  },
];

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
  targetGroups: string[];
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
    group: "TCDN4 - Toàn Khóa K33",
    type: "birthday",
    title: "Chúc mừng sinh nhật",
    content: "Chúc mừng sinh nhật đồng môn! Tuổi mới phong độ, tiền vào như nước và mãi trẻ khỏe!",
    status: "success",
  },
  {
    id: "log-2",
    time: "17:30 18/11",
    group: "TCDN4 - Toàn Khóa K33",
    type: "registration",
    title: "Đăng ký họp mặt 15 năm",
    content: "Đã có thêm bạn chốt kèo tham gia họp mặt tại Cơ sở B và rinh áo Polo kỷ niệm!",
    status: "success",
  },
  {
    id: "log-3",
    time: "10:15 18/11",
    group: "Lớp TC10 - K33 UEH",
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
    content: "Kính gửi anh chị em TCDN4 - K33 UEH! Chỉ còn ít ngày nữa là đến Thứ 7 ngày 12/12/2026. Lịch trình gặp mặt tại Cơ sở B lúc 9:00 sáng. Anh chị em vào chốt áo đồng phục sớm nhé!\n👉 Chi tiết: https://tcdn4.top/#event",
    targetGroups: ["TCDN4 - Toàn Khóa K33"],
    scheduleType: "scheduled",
    scheduleTime: "2026-12-01 08:00",
    status: "scheduled",
    createdAt: "19/11/2026 08:00",
  },
  {
    id: "bc-2",
    title: "Nhắc nhở chốt size áo kỷ niệm",
    content: "Anh chị em ơi! Hạn chót may áo polo đồng phục kỷ niệm 15 năm là 30/11. Ai chưa đăng ký size áo thì nhanh chân vào chọn để Ban tổ chức ship kịp nhé!\n👉 Chọn size áo: https://tcdn4.top/#event",
    targetGroups: ["TCDN4 - Toàn Khóa K33"],
    scheduleType: "now",
    status: "sent",
    createdAt: "18/11/2026 14:00",
  },
];

const AI_TONE_OPTIONS = [
  { id: "funny", label: "🎭 Dí dỏm, hài hước", desc: "Phong cách sinh viên K33, cà khịa vui vẻ, giục giã nhẹ nhàng" },
  { id: "warm", label: "❤️ Ấm áp, hoài niệm", desc: "Tình cảm, gợi nhớ kỷ niệm 15 năm, tri ân thầy cô bạn bè" },
  { id: "urgent", label: "⚡ Hào hứng, chốt gấp", desc: "Giục giã chốt size áo, giữ slot tiệc trưa kẻo hết chỗ" },
  { id: "formal", label: "📢 Trang trọng BLL", desc: "Thông báo chính thức lịch trình, địa điểm từ Ban liên lạc" },
  { id: "birthday", label: "🎂 Mừng sinh nhật", desc: "Lời chúc sinh nhật đồng môn dí dỏm, tài lộc dồi dào" },
];

const AI_MODELS = [
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", tag: "Mới nhất", desc: "Tư duy sâu & phân tích database siêu thông minh" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", tag: "Khuyên dùng", desc: "Hài hước, sắc sảo, tự nhiên, trả lời siêu chuẩn" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", tag: "Siêu tốc", desc: "Phản hồi nhanh chớp mắt, tiết kiệm token" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tag: "Google AI", desc: "Tốc độ nhanh, ổn định từ hệ sinh thái Google" },
];

export default function ZaloBotSettings() {
  const toast = useToast();

  // Navigation Tabs: broadcast | auto | birthday | logs | connection
  const [activeTab, setActiveTab] = useState<"broadcast" | "auto" | "birthday" | "logs" | "connection">("broadcast");
  const [isSavingAutoTemplates, setIsSavingAutoTemplates] = useState(false);
  const [isSavingBirthdayTemplate, setIsSavingBirthdayTemplate] = useState(false);

  // Token & Bot Nhóm Zalo Connection
  const [botToken, setBotToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [botName, setBotName] = useState("TCDN4 K33 Bot");
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [botLiveInfo, setBotLiveInfo] = useState<{ id: string; display_name: string; account_name: string } | null>(null);
  const [showAdvancedWebhook, setShowAdvancedWebhook] = useState(false);
  const [editingChatIdGroup, setEditingChatIdGroup] = useState<ZaloGroupItem | null>(null);
  const [customChatIdInput, setCustomChatIdInput] = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [aiModel, setAiModel] = useState("claude-3-5-sonnet-20241022");
  const [aiChatQuery, setAiChatQuery] = useState("");
  const [aiChatResponse, setAiChatResponse] = useState<string | null>(null);
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);
  const [isSavingGroups, setIsSavingGroups] = useState(false);

  // Groups Management (SMLIFE Kit Model)
  const [groups, setGroups] = useState<ZaloGroupItem[]>(INITIAL_GROUPS);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLink, setNewGroupLink] = useState("");

  // Broadcasts / Soạn tin
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>(INITIAL_BROADCASTS);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerContent, setComposerContent] = useState(
    "🔥 KÈO NÀY KHÔNG ĐI LÀ TIẾC 15 NĂM ĐẤY ANH EM ƠI!\nThanh xuân có 1 lần, 15 năm mới có 1 ngày hội ngộ tại Cơ sở B ngày 12/12. Bỏ qua deadline, gác lại âu lo, mình cùng về lại trường xưa nâng ly nhé! 🍻\n👉 Đăng ký ngay: https://tcdn4.top/#event"
  );
  const [composerTargetGroups, setComposerTargetGroups] = useState<string[]>(["grp-all"]);
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduledDateTime, setScheduledDateTime] = useState("2026-12-01T08:00");
  const [isSending, setIsSending] = useState(false);

  // Auto-triggers (Điểm danh & Đăng ký 15 năm & Chuyển khoản)
  const [autoCheckin, setAutoCheckin] = useState(true);
  const [autoRegistration, setAutoRegistration] = useState(true);
  const [autoPayment, setAutoPayment] = useState(true);
  const [checkinTemplate, setCheckinTemplate] = useState(
    "🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\nSau 15 năm 'mất tích', cựu sinh viên {ten} ({lop}) vừa chính thức lộ diện điểm danh trên Alumni Hub!\n👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory"
  );
  const [registrationTemplate, setRegistrationTemplate] = useState(
    "🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n{ten} ({lop}) đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size {size}!\n🍻 Đã có {tong_so} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.\n👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event"
  );
  const [paymentTemplate, setPaymentTemplate] = useState(
    "🔔 [XÁC NHẬN CHUYỂN KHOẢN THÀNH CÔNG - SEPAY]\n━━━━━━━━━━━━━━━━━━━━\n👤 Thành viên: {ten} ({lop})\n💰 Số tiền: +{so_tien} VNĐ\n👕 Size áo: {size}\n🏦 Ngân hàng: {ngan_hang}\n📝 Nội dung: {noi_dung}\n⏰ Thời gian: {thoi_gian}\n🔢 Mã GD: {ma_gd}\n━━━━━━━━━━━━━━━━━━━━\n✨ Trạng thái: ĐÃ XÁC NHẬN 100% THAM GIA HỘI NGỘ 15 NĂM!\n🎉 Ban Liên Lạc xin trân trọng cảm ơn bạn đã hoàn tất đóng góp!"
  );

  // Sinh nhật
  const [birthdayMembers, setBirthdayMembers] = useState<BirthdayMember[]>([]);
  const [autoBirthday, setAutoBirthday] = useState(true);
  const [birthdayHour, setBirthdayHour] = useState("07:30");
  const [birthdayTemplate, setBirthdayTemplate] = useState(
    "🎂 ALO ALO CẢ NHÀ ƠI!\nHôm nay là sinh nhật của bạn {ten} ({lop})! 🎉\nThay mặt đại gia đình TCDN4 K33, chúc bạn tuổi mới ngày càng phong độ, tiền vào như nước Sông Sài Gòn, sự nghiệp thăng hoa và mãi giữ tinh thần trẻ khỏe thời sinh viên nhé! 🍻\n👉 Gửi lời chúc tới {ten}: https://tcdn4.top"
  );
  // Sinh nhật testing
  const [testBirthdayGroupId, setTestBirthdayGroupId] = useState<string>("grp-all");
  const [testBirthdayMemberName, setTestBirthdayMemberName] = useState<string>("");
  const [testBirthdayMemberClass, setTestBirthdayMemberClass] = useState<string>("");
  const [isSendingTestBirthday, setIsSendingTestBirthday] = useState<boolean>(false);

  // Logs
  const [logs, setLogs] = useState<SendLog[]>(INITIAL_LOGS);

  // AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetField, setAiTargetField] = useState<"broadcast" | "checkin" | "registration" | "birthday" | "payment">("broadcast");
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState<string>("funny");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState("");

  // Copy helper
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem("tcdn4_zalo_bot_config");
      if (savedConfig) {
        const p = JSON.parse(savedConfig);
        if (p.botToken || p.zaloToken) setBotToken(p.botToken || p.zaloToken);
        if (p.webhookUrl) setWebhookUrl(p.webhookUrl);
        if (p.botName) setBotName(p.botName);
        if (typeof p.autoCheckin === "boolean") setAutoCheckin(p.autoCheckin);
        if (typeof p.autoRegistration === "boolean") setAutoRegistration(p.autoRegistration);
        if (typeof p.autoBirthday === "boolean") setAutoBirthday(p.autoBirthday);
        if (typeof p.autoPayment === "boolean") setAutoPayment(p.autoPayment);
        if (p.birthdayHour) setBirthdayHour(p.birthdayHour);
        if (p.checkinTemplate) setCheckinTemplate(p.checkinTemplate);
        if (p.registrationTemplate) setRegistrationTemplate(p.registrationTemplate);
        if (p.birthdayTemplate) setBirthdayTemplate(p.birthdayTemplate);
        if (p.paymentTemplate) setPaymentTemplate(p.paymentTemplate);
        if (p.aiApiKey || p.claudeApiKey || p.geminiApiKey) setClaudeApiKey(p.aiApiKey || p.claudeApiKey || p.geminiApiKey);
        if (p.aiModel) setAiModel(p.aiModel);
      }

      const savedGroups = localStorage.getItem("tcdn4_zalo_groups");
      if (savedGroups) setGroups(JSON.parse(savedGroups));

      const savedBroadcasts = localStorage.getItem("tcdn4_zalo_broadcasts");
      if (savedBroadcasts) setBroadcasts(JSON.parse(savedBroadcasts));

      const savedLogs = localStorage.getItem("tcdn4_zalo_logs");
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    } catch {}

    // Tải cấu hình và danh sách nhóm từ server (đã lưu tập trung trên Supabase Storage)
    fetch("/api/settings/zalo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.config) {
          if (d.config.botToken) setBotToken(d.config.botToken);
          if (d.config.webhookUrl) setWebhookUrl(d.config.webhookUrl);
          if (d.config.botName) setBotName(d.config.botName);
          if (d.config.aiApiKey) setClaudeApiKey(d.config.aiApiKey);
          if (d.config.aiModel) setAiModel(d.config.aiModel);
          if (typeof d.config.autoCheckin === "boolean") setAutoCheckin(d.config.autoCheckin);
          if (typeof d.config.autoRegistration === "boolean") setAutoRegistration(d.config.autoRegistration);
          if (typeof d.config.autoBirthday === "boolean") setAutoBirthday(d.config.autoBirthday);
          if (typeof d.config.autoPayment === "boolean") setAutoPayment(d.config.autoPayment);
          if (d.config.checkinTemplate) setCheckinTemplate(d.config.checkinTemplate);
          if (d.config.registrationTemplate) setRegistrationTemplate(d.config.registrationTemplate);
          if (d.config.birthdayTemplate) setBirthdayTemplate(d.config.birthdayTemplate);
          if (d.config.paymentTemplate) setPaymentTemplate(d.config.paymentTemplate);
          if (Array.isArray(d.config.groups) && d.config.groups.length > 0) {
            setGroups(d.config.groups);
            try {
              localStorage.setItem("tcdn4_zalo_groups", JSON.stringify(d.config.groups));
            } catch {}
          }
        }
      })
      .catch(() => {});

    // Kiểm tra thông tin live bot từ Zalo Bot Platform
    fetch("/api/zalo-bot", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.botInfo) {
          setBotLiveInfo(d.botInfo);
          if (d.botInfo.display_name) setBotName(d.botInfo.display_name);
        }
      })
      .catch(() => {});

    scanBirthdays();
  }, []);

  const saveBotConfig = async (patch: Record<string, any>) => {
    try {
      const saved = localStorage.getItem("tcdn4_zalo_bot_config");
      const current = saved ? JSON.parse(saved) : {};
      const updated = { ...current, ...patch };
      localStorage.setItem("tcdn4_zalo_bot_config", JSON.stringify(updated));

      await fetch("/api/settings/zalo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

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

  // Handle Save Bot Connection
  const handleSaveConnection = async () => {
    if (!botToken.trim()) {
      toast.error("Vui lòng nhập Bot API Token từ ứng dụng Bot Elephant!");
      return;
    }
    setIsCheckingToken(true);
    try {
      await saveBotConfig({ 
        botToken: botToken.trim(), 
        webhookUrl: webhookUrl.trim(),
        botName: botName.trim(),
        isTokenValid: true 
      });
      setIsTokenValid(true);

      const checkRes = await fetch("/api/zalo-bot", { cache: "no-store" });
      const checkData = await checkRes.json().catch(() => null);
      if (checkData?.botInfo) {
        setBotLiveInfo(checkData.botInfo);
        if (checkData.botInfo.display_name) setBotName(checkData.botInfo.display_name);
        toast.success(`Đã kết nối thành công: ${checkData.botInfo.display_name} (${checkData.botInfo.account_name})!`);
      } else {
        toast.success("Đã lưu cấu hình Bot Nhóm Zalo thành công lên máy chủ!");
      }
    } catch {
      toast.error("Lỗi khi lưu cấu hình!");
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handleTestSendGroup = async (grp: ZaloGroupItem) => {
    if (!grp.chatId) {
      toast.info(
        `Nhóm "${grp.name}" chưa kết nối Chat ID! Hãy mời Bot Elephant vào nhóm, bổ nhiệm làm Phó nhóm và soạn: @Bot /verify ${grp.verifyCode}`
      );
      return;
    }

    try {
      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          targetGroupId: grp.id,
          targetChatId: grp.chatId,
          targetGroupName: grp.name,
          title: `Tin thử nghiệm tới ${grp.name}`,
          message: `🔥 Alo alo! Đây là tin thử nghiệm từ hệ thống TCDN4 Alumni Hub kết nối trực tiếp tới nhóm "${grp.name}" qua Bot Elephant! 🍻`,
        }),
      });
      const data = await res.json();
      if (data.success && data.sentSuccessCount > 0) {
        toast.success(`Đã bắn tin thành công trực tiếp vào nhóm Zalo "${grp.name}"!`);
      } else {
        toast.error(
          data.message ||
            data.sendResults?.[0]?.error ||
            "Không thể gửi tin tới Zalo Bot. Vui lòng kiểm tra lại quyền trong nhóm!"
        );
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi tin thử nghiệm");
    }
  };

  const handleSaveManualChatId = async () => {
    if (!editingChatIdGroup) return;
    const trimmed = customChatIdInput.trim();
    const updated = groups.map((g) => {
      if (g.id === editingChatIdGroup.id) {
        return {
          ...g,
          chatId: trimmed || undefined,
          status: (trimmed ? "verified" : "pending") as "verified" | "pending",
          verifiedAt: trimmed ? new Date().toISOString() : undefined,
        };
      }
      return g;
    });
    setGroups(updated);
    setEditingChatIdGroup(null);
    setCustomChatIdInput("");
    await handleSaveGroupsToServer(updated);
    toast.success(`Đã cập nhật Chat ID cho nhóm "${editingChatIdGroup.name}"!`);
  };

  const handleSaveAutoTemplates = async () => {
    setIsSavingAutoTemplates(true);
    try {
      await saveBotConfig({
        autoCheckin,
        autoRegistration,
        checkinTemplate,
        registrationTemplate,
        autoPayment,
        paymentTemplate,
      });
      toast.success("Đã lưu mẫu tin nhắn Điểm danh, 15 Năm & Chuyển khoản thành công lên máy chủ!");
    } catch {
      toast.error("Lỗi khi lưu cấu hình mẫu tin nhắn!");
    } finally {
      setIsSavingAutoTemplates(false);
    }
  };

  const handleSaveBirthdayTemplate = async () => {
    setIsSavingBirthdayTemplate(true);
    try {
      await saveBotConfig({
        autoBirthday,
        birthdayHour,
        birthdayTemplate,
      });
      toast.success("Đã lưu cấu hình và mẫu tin nhắn sinh nhật thành công lên máy chủ!");
    } catch {
      toast.error("Lỗi khi lưu cấu hình sinh nhật!");
    } finally {
      setIsSavingBirthdayTemplate(false);
    }
  };

  // Gửi thử tin nhắn chúc mừng sinh nhật chọn nhóm có sẵn
  const handleSendTestBirthday = async (overrideMember?: { name: string; className: string }) => {
    const memberName = overrideMember?.name || testBirthdayMemberName || birthdayMembers[0]?.name || "Nguyễn Văn Tuấn";
    const memberClass = overrideMember?.className || testBirthdayMemberClass || birthdayMembers[0]?.className || "TC10";
    const message = birthdayTemplate
      .replace(/\{ten\}/g, memberName)
      .replace(/\{lop\}/g, memberClass);

    const targetGroup = groups.find((g) => g.id === testBirthdayGroupId);

    if (testBirthdayGroupId !== "all" && targetGroup && !targetGroup.chatId) {
      toast.error(
        `Nhóm "${targetGroup.name}" chưa kết nối Chat ID! Vui lòng mời Bot Elephant vào nhóm và gõ lệnh: /verify ${targetGroup.verifyCode}`
      );
      return;
    }

    setIsSendingTestBirthday(true);
    try {
      const payload: any = {
        type: "birthday",
        name: memberName,
        className: memberClass,
        customWish: message,
      };

      if (testBirthdayGroupId && testBirthdayGroupId !== "all") {
        payload.targetGroupId = testBirthdayGroupId;
        if (targetGroup?.chatId) {
          payload.targetChatId = targetGroup.chatId;
          payload.targetGroupName = targetGroup.name;
        }
      }

      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      const targetDesc = testBirthdayGroupId === "all"
        ? "Tất cả nhóm Zalo"
        : (targetGroup?.name || "Nhóm đã chọn");

      const newLog: SendLog = {
        id: `log-bday-${Date.now()}`,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
        group: targetDesc,
        type: "birthday",
        title: `Thử nghiệm chúc mừng sinh nhật: ${memberName} (${memberClass})`,
        content: message,
        status: (resData.sentSuccessCount > 0 || resData.externalWebhookSent) ? "success" : "pending",
      };

      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      try {
        const existing = localStorage.getItem("tcdn4_zalo_logs");
        const parsed = existing ? JSON.parse(existing) : [];
        localStorage.setItem("tcdn4_zalo_logs", JSON.stringify([newLog, ...parsed]));
      } catch {}

      if (resData.success && (resData.sentSuccessCount > 0 || resData.externalWebhookSent)) {
        toast.success(`Đã gửi thử tin mừng sinh nhật "${memberName}" tới ${targetDesc}!`);
      } else {
        const errMsg = resData.message || resData.error || "Gửi tin thử nghiệm không thành công. Kiểm tra lại kết nối Bot!";
        toast.error(errMsg);
      }
    } catch (err: any) {
      toast.error("Lỗi khi gửi tin sinh nhật thử nghiệm: " + (err?.message || "Lỗi mạng"));
    } finally {
      setIsSendingTestBirthday(false);
    }
  };

  // Lưu toàn bộ danh sách nhóm Zalo lên máy chủ (đồng bộ ngay sang điện thoại)
  const handleSaveGroupsToServer = async (groupsToSave?: ZaloGroupItem[]) => {
    const list = groupsToSave || groups;
    setIsSavingGroups(true);
    try {
      const res = await fetch("/api/settings/zalo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: list }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Lỗi lưu danh sách nhóm");
      }
      try {
        localStorage.setItem("tcdn4_zalo_groups", JSON.stringify(list));
      } catch {}
      toast.success("Đã đồng bộ danh sách nhóm Zalo lên máy chủ! Mở trên điện thoại sẽ thấy ngay.");
    } catch (err: any) {
      toast.error("Không thể lưu lên máy chủ: " + (err?.message || "Lỗi mạng"));
    } finally {
      setIsSavingGroups(false);
    }
  };

  // Bật/tắt phân loại nhận tin cho từng nhóm (Điểm danh / 15 Năm / Sinh nhật / Chuyển khoản)
  const handleToggleGroupPermission = async (
    groupId: string,
    field: "receiveCheckin" | "receiveRegistration" | "receiveBirthday" | "receivePayment"
  ) => {
    const updated = groups.map((g) => (g.id === groupId ? { ...g, [field]: !g[field] } : g));
    setGroups(updated);
    try {
      localStorage.setItem("tcdn4_zalo_groups", JSON.stringify(updated));
    } catch {}
    await handleSaveGroupsToServer(updated);
  };

  // Add group
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm Zalo!");
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newGrp: ZaloGroupItem = {
      id: `grp-${Date.now()}`,
      name: newGroupName.trim(),
      link: newGroupLink.trim(),
      verifyCode: `#TCDN4-${randomSuffix}`,
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };

    const updated = [...groups, newGrp];
    setGroups(updated);
    setNewGroupName("");
    setNewGroupLink("");
    setIsAddGroupModalOpen(false);

    toast.success(`Đã thêm nhóm "${newGrp.name}"!`);
    await handleSaveGroupsToServer(updated);
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa nhóm này khỏi danh sách nhận tin?")) {
      const updated = groups.filter((g) => g.id !== id);
      setGroups(updated);
      toast.success("Đã xóa nhóm!");
      await handleSaveGroupsToServer(updated);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Đã sao chép vào bộ nhớ tạm!");
  };

  // Trigger AI assistant
  const handleOpenAiAssistant = (field: "broadcast" | "checkin" | "registration" | "birthday" | "payment") => {
    setAiTargetField(field);
    if (field === "birthday") setAiTone("birthday");
    else if (field === "checkin") setAiTone("funny");
    else if (field === "registration") setAiTone("urgent");
    else if (field === "payment") setAiTone("formal");
    else setAiTone("funny");

    setAiTopic("");
    setAiGeneratedResult("");
    setIsAiModalOpen(true);
  };

  const handleGenerateAiMessage = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/ai-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          tone: aiTone,
          apiKey: claudeApiKey.trim() || undefined,
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setAiGeneratedResult(data.content);
        const engineLabel =
          data.provider === "claude" ? `Claude AI (${data.model || aiModel})` : data.provider === "gemini" ? "Gemini AI" : "K33 Engine";
        toast.success(`Trợ lý ${engineLabel} đã tạo nội dung thành công!`);
      } else {
        toast.error("Không thể tạo nội dung, vui lòng thử lại!");
      }
    } catch {
      toast.error("Lỗi kết nối tới máy chủ AI!");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAiChatQuery = async (customQuery?: string) => {
    const query = (customQuery || aiChatQuery).trim();
    if (!query) {
      toast.error("Vui lòng nhập câu hỏi để tra cứu thông tin!");
      return;
    }
    if (customQuery) setAiChatQuery(customQuery);
    setIsAiChatLoading(true);
    setAiChatResponse(null);
    try {
      const res = await fetch("/api/ai-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: query,
          tone: "chat",
          apiKey: claudeApiKey.trim() || undefined,
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setAiChatResponse(data.content);
        toast.success("AI đã trả lời từ dữ liệu thời gian thực!");
      } else {
        toast.error(data.error || "Không thể lấy phản hồi từ AI");
      }
    } catch {
      toast.error("Lỗi khi kết nối tới AI");
    } finally {
      setIsAiChatLoading(false);
    }
  };

  const handleApplyAiMessage = () => {
    if (!aiGeneratedResult) return;
    if (aiTargetField === "broadcast") {
      setComposerContent(aiGeneratedResult);
    } else if (aiTargetField === "checkin") {
      setCheckinTemplate(aiGeneratedResult);
      saveBotConfig({ checkinTemplate: aiGeneratedResult });
    } else if (aiTargetField === "registration") {
      setRegistrationTemplate(aiGeneratedResult);
      saveBotConfig({ registrationTemplate: aiGeneratedResult });
    } else if (aiTargetField === "birthday") {
      setBirthdayTemplate(aiGeneratedResult);
      saveBotConfig({ birthdayTemplate: aiGeneratedResult });
    } else if (aiTargetField === "payment") {
      setPaymentTemplate(aiGeneratedResult);
      saveBotConfig({ paymentTemplate: aiGeneratedResult });
    }
    setIsAiModalOpen(false);
    toast.success("Đã áp dụng nội dung AI vào khung soạn thảo!");
  };

  // Broadcast send handler
  const handleSendBroadcast = async () => {
    if (!composerContent.trim()) {
      toast.error("Vui lòng nhập nội dung tin nhắn cần gửi!");
      return;
    }
    if (composerTargetGroups.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 nhóm Zalo nhận tin!");
      return;
    }

    setIsSending(true);
    const targetNames = groups
      .filter((g) => composerTargetGroups.includes(g.id))
      .map((g) => g.name)
      .join(", ");

    try {
      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          title: composerTitle || "Thông báo từ Ban Liên Lạc",
          message: composerContent,
          targetGroups: targetNames,
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      });

      const resData = await res.json();

      const newLog: SendLog = {
        id: `log-${Date.now()}`,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
        group: targetNames,
        type: "broadcast",
        title: composerTitle || "Thông báo tức thì",
        content: composerContent,
        status: resData.webhookSent ? "success" : "pending",
      };

      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      try {
        localStorage.setItem("tcdn4_zalo_logs", JSON.stringify(updatedLogs));
      } catch {}

      if (resData.webhookSent) {
        toast.success(`Đã phát loa tin nhắn tới: ${targetNames}!`);
      } else {
        toast.info(
          `Đã tạo thông báo thành công! (Lưu ý: Chưa gắn Webhook Bot nhóm nên tin chưa tự động đẩy vào Zalo)`
        );
      }
    } catch {
      toast.error("Gửi tin thất bại, vui lòng thử lại!");
    } finally {
      setIsSending(false);
    }
  };

  // Reusable Zalo Chat Phone Mockup Preview Component
  const renderZaloPreview = (title: string, message: string, targetGroupName?: string) => {
    return (
      <div className="w-full max-w-sm mx-auto rounded-3xl border border-slate-300/80 bg-white shadow-xl overflow-hidden flex flex-col h-[520px]">
        {/* Phone Top Header (Zalo Blue) */}
        <div className="bg-[#0068FF] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/80 text-sm">‹</span>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0 border border-white/30">
              <Users size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate max-w-[170px] leading-tight">
                {targetGroupName || "TCDN4 - Toàn Khóa K33"}
              </div>
              <div className="text-[10px] text-blue-100 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Bot đang hoạt động</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-white/90">
            <Smartphone size={15} />
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 bg-[#E7EBF0] p-3.5 overflow-y-auto space-y-3 flex flex-col justify-end">
          <div className="text-center">
            <span className="rounded-full bg-slate-300/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
              Hôm nay lúc {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="flex items-start gap-2 max-w-[94%]">
            <div className="h-7 w-7 rounded-full bg-[#0068FF] text-white flex items-center justify-center shrink-0 shadow-xs border border-white mt-1">
              <Bot size={14} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1 pl-1">
                <span className="text-[11px] font-bold text-slate-700">TCDN4 Bot Nhóm</span>
                <span className="rounded bg-blue-100 text-[#0068FF] text-[9px] font-black px-1.5 py-0.2">BOT NHÓM</span>
              </div>

              {/* Message Bubble */}
              <div className="bg-white rounded-2xl rounded-tl-xs p-3 text-xs text-slate-800 shadow-sm border border-slate-200/60 leading-relaxed whitespace-pre-wrap break-words">
                {title && <div className="font-bold text-ueh mb-1 border-b border-slate-100 pb-1">{title}</div>}
                <div>{message || "Chưa có nội dung xem trước..."}</div>
                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                  <span>{new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  <CheckCheck size={12} className="text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Input Mockup */}
        <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center gap-2 shrink-0">
          <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-xs text-slate-400">
            Nhập tin nhắn vào nhóm...
          </div>
          <div className="h-7 w-7 rounded-full bg-[#0068FF] text-white flex items-center justify-center shrink-0">
            <Send size={13} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-ueh border border-blue-100 mb-1.5">
              <Bot size={14} className="text-ueh-orange" /> Bot Nhóm Zalo K33
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Quản Lý Bot Nhóm Zalo K33
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Tự động hóa thông báo đến các nhóm Zalo lớp K33 (TC10, TC11, TC12, Ban Liên Lạc). Quản lý đăng tin sự kiện, điểm danh và kết nối AI thông minh.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pt-5 mt-4 border-t border-slate-100">
          {[
            { id: "broadcast", label: "Đăng tin", count: broadcasts.length, icon: Send },
            { id: "auto", label: "Điểm danh & 15 Năm", count: 2, icon: Bell },
            { id: "birthday", label: "Sinh nhật", count: birthdayMembers.length, icon: Cake },
            { id: "logs", label: "Nhật ký gửi tin", count: logs.length, icon: FileText },
            { id: "connection", label: "Đấu nối Zalo & Nhóm", count: groups.length, icon: LinkIcon },
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
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
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

      {/* ========================================================================= */}
      {/* TAB 1: ĐẤU NỐI BOT NHÓM ZALO & QUẢN LÝ NHÓM                               */}
      {/* ========================================================================= */}
      {activeTab === "connection" && (
        <div className="space-y-6">
          {/* Card 1: Cấu hình Bot Nhóm Zalo */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bot size={20} className="text-[#0068FF]" /> Kết Nối Bot Nhóm Zalo (Bot Elephant)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tích hợp nền tảng Zalo Bot Platform (Bot Elephant). Tự động đẩy tin vào nhóm thông qua Zalo Bot API chính thức.
                </p>
              </div>

              {botLiveInfo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={13} /> Đã kết nối: {botLiveInfo.display_name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-ueh border border-blue-200">
                  <Bot size={13} /> {botToken ? "Đã lưu Token" : "Chờ thiết lập"}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Bot API Token */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bot API Token (Lấy từ Mini App Bot Elephant trên Zalo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Dán mã Bot Token (định dạng bot_id:secret_key)..."
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono focus:border-ueh focus:outline-none"
                  />
                  <button
                    onClick={handleSaveConnection}
                    disabled={isCheckingToken}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0068FF] px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-xs shrink-0"
                  >
                    {isCheckingToken ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    <span>{isCheckingToken ? "Đang kiểm tra..." : "Lưu & Kiểm Tra"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Token này dùng để website gọi API chính thức <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">https://bot-api.zaloplatforms.com/bot.../sendMessage</code> đẩy tin thẳng vào nhóm.
                </p>
              </div>

              {/* Webhook Callback Của Website */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-sky-50/50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[#0068FF] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                      <Bot size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{botLiveInfo?.display_name || botName}</span>
                        <span className="rounded bg-blue-100 text-[#0068FF] text-[10px] font-black px-1.5 py-0.2">BOT ELEPHANT</span>
                        {botLiveInfo?.account_name && (
                          <span className="text-[11px] text-slate-400 font-mono">@{botLiveInfo.account_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-700">Webhook URL Nhận Tin (Callback):</span>
                        <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-ueh font-bold">
                          https://tcdn4.top/api/zalo-bot
                        </code>
                        <button
                          onClick={() => handleCopy("https://tcdn4.top/api/zalo-bot", "endpoint")}
                          className="text-slate-400 hover:text-ueh p-0.5"
                          title="Sao chép Endpoint URL"
                        >
                          {copiedCode === "endpoint" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        fetch("/api/zalo-bot", { cache: "no-store" })
                          .then((r) => r.json())
                          .then((d) => {
                            if (d?.botInfo) {
                              setBotLiveInfo(d.botInfo);
                              toast.success(`Bot đang hoạt động: ${d.botInfo.display_name} (${d.botInfo.account_name})!`);
                            } else {
                              toast.success("Endpoint /api/zalo-bot đang hoạt động bình thường!");
                            }
                          })
                          .catch(() => toast.error("Không thể kết nối tới endpoint /api/zalo-bot"));
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs shrink-0"
                    >
                      Kiểm tra Kết Nối
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-blue-100 text-[11px] text-slate-600">
                  👉 <strong>Cài đặt trong Mini App Bot Elephant:</strong> Mở Zalo ➔ Tìm <strong>Bot Elephant</strong> ➔ Tab <strong>Thiết lập chung</strong> ➔ Dán liên kết <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-700">https://tcdn4.top/api/zalo-bot</code> vào ô <strong>Webhook URL</strong> ➔ Bấm <strong>Lưu thay đổi</strong>.
                </div>
              </div>

              {/* Tùy chọn Webhook Đẩy Tin Ngoài (Thu gọn) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedWebhook(!showAdvancedWebhook)}
                  className="text-xs text-slate-500 hover:text-ueh font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAdvancedWebhook ? "▼ Thu gọn" : "▶ Cấu hình Webhook trung gian bên ngoài (Tùy chọn nâng cao)"}</span>
                </button>

                {showAdvancedWebhook && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Webhook URL ngoài (n8n, Make, Custom Forwarder):
                    </label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="Để trống nếu đã dùng Bot Elephant chính thức của Zalo..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-ueh focus:outline-none bg-white"
                    />
                    <p className="text-[11px] text-slate-500">
                      Mặc định hệ thống tự động đẩy tin thẳng qua Zalo Bot Platform API nên bạn <strong>không cần điền</strong> ô này.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Quản lý danh sách các Nhóm Zalo & Mã mời Bot vào nhóm */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-ueh" /> Danh Sách Nhóm Zalo & Mã Mời Bot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý các nhóm Zalo nhận thông báo tự động. Dữ liệu được đồng bộ tức thời giữa máy tính và điện thoại.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleSaveGroupsToServer()}
                  disabled={isSavingGroups}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs"
                  title="Lưu danh sách nhóm lên máy chủ để đồng bộ sang điện thoại"
                >
                  <Save size={14} />
                  <span>{isSavingGroups ? "Đang đồng bộ..." : "Lưu Cấu Hình Nhóm"}</span>
                </button>
                <button
                  onClick={() => setIsAddGroupModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-3.5 py-2 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-xs"
                >
                  <Plus size={14} /> + Thêm Nhóm Zalo Mới
                </button>
              </div>
            </div>

            {/* Hộp quy trình 3 bước mời Bot vào Nhóm Zalo & Khắc phục lỗi */}
            <div className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                <Info size={14} className="text-amber-700" /> Quy trình 3 bước để Bot phản hồi và liên kết nhóm Zalo:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-800">
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="font-bold text-ueh mb-0.5">1. Mời Bot & Bổ nhiệm Phó Nhóm</div>
                  <p className="text-[11px] text-slate-600">
                    Mời <strong>Bot Elephant</strong> vào nhóm Zalo. <strong>Rất quan trọng:</strong> Bổ nhiệm Bot làm <strong>Phó Nhóm</strong> để Zalo cấp phép gửi tin nhắn tự động.
                  </p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="font-bold text-ueh mb-0.5">2. Khai báo Webhook Callback</div>
                  <p className="text-[11px] text-slate-600">
                    Trong Mini App Bot Elephant ➔ tab Thiết lập chung ➔ điền Webhook URL: <code className="bg-amber-100 font-bold px-1 rounded">https://tcdn4.top/api/zalo-bot</code> rồi bấm Lưu.
                  </p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="font-bold text-ueh mb-0.5">3. Nhắn mã xác nhận liên kết</div>
                  <p className="text-[11px] text-slate-600">
                    Soạn vào nhóm: <code className="bg-amber-100 font-bold px-1 rounded">@Bot Elephant /verify #MÃ_NHÓM</code>. Bot sẽ trả lời chúc mừng ngay và lưu Chat ID kết nối!
                  </p>
                </div>
              </div>
            </div>

            {/* Bảng nhóm Zalo */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tên Nhóm Zalo</th>
                    <th className="py-2.5 px-3">Cú Pháp Nhắn Vào Nhóm</th>
                    <th className="py-2.5 px-3 text-center">Chat ID & Trạng Thái</th>
                    <th className="py-2.5 px-3 text-center">Tự Động Nhận Tin</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((grp) => (
                    <tr key={grp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-blue-50 text-[#0068FF] flex items-center justify-center text-xs">
                            <Users size={13} />
                          </div>
                          <span>{grp.name}</span>
                          {grp.isDefault && (
                            <span className="rounded bg-ueh/10 text-ueh text-[9px] font-bold px-1.5 py-0.2">Mặc định</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1 font-mono font-bold text-ueh text-xs border border-slate-200">
                          <Hash size={12} className="text-slate-400" />
                          <span>@Bot /verify {grp.verifyCode}</span>
                          <button
                            onClick={() => handleCopy(`@Bot Elephant /verify ${grp.verifyCode}`, grp.id)}
                            className="ml-1 text-slate-400 hover:text-ueh"
                            title="Sao chép cú pháp /verify kèm tag Bot"
                          >
                            {copiedCode === grp.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {grp.chatId ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} /> ID: {grp.chatId}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChatIdGroup(grp);
                                setCustomChatIdInput(grp.chatId || "");
                              }}
                              className="text-slate-400 hover:text-ueh p-0.5"
                              title="Sửa Chat ID thủ công"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                              <Clock size={11} /> Chờ gửi /verify
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChatIdGroup(grp);
                                setCustomChatIdInput("");
                              }}
                              className="text-xs text-blue-600 hover:underline font-semibold"
                              title="Nhập Chat ID thủ công"
                            >
                              + ID
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => handleToggleGroupPermission(grp.id, "receiveCheckin")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              grp.receiveCheckin
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            title="Bấm để bật/tắt nhận tin Điểm danh"
                          >
                            {grp.receiveCheckin ? "✓ Điểm danh" : "✕ Điểm danh"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupPermission(grp.id, "receiveRegistration")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              grp.receiveRegistration
                                ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            title="Bấm để bật/tắt nhận tin Đăng ký 15 Năm"
                          >
                            {grp.receiveRegistration ? "✓ 15 Năm" : "✕ 15 Năm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupPermission(grp.id, "receiveBirthday")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              grp.receiveBirthday
                                ? "bg-pink-100 text-pink-800 hover:bg-pink-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            title="Bấm để bật/tắt nhận tin Sinh nhật"
                          >
                            {grp.receiveBirthday ? "✓ Sinh nhật" : "✕ Sinh nhật"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupPermission(grp.id, "receivePayment")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              grp.receivePayment
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                            title="Bấm để bật/tắt nhận thông báo chuyển khoản SePay"
                          >
                            {grp.receivePayment ? "✓ Chuyển khoản" : "✕ Chuyển khoản"}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleTestSendGroup(grp)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            Bắn tin test
                          </button>
                          {!grp.isDefault && (
                            <button
                              onClick={() => handleDeleteGroup(grp.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Xóa nhóm"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nút lưu cấu hình nhóm & quyền nhận tin */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                💡 <span className="font-semibold text-slate-700">Mẹo:</span> Nhóm <strong>Ban Liên Lạc</strong> được bật nhận tin <strong>Chuyển khoản SePay</strong>. Bấm nút màu bên trên để bật/tắt quyền nhận tin cho từng nhóm.
              </span>
              <button
                type="button"
                onClick={() => handleSaveGroupsToServer()}
                disabled={isSavingGroups}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ueh-navy hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSavingGroups ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSavingGroups ? "Đang đồng bộ..." : "Lưu Quyền Nhận Tin Của Các Nhóm"}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Cấu Hình Khóa API Claude (Anthropic AI) & Database K33 */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Wand2 size={18} className="text-ueh-orange" /> Cấu Hình Claude AI & Tra Cứu Database K33
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tích hợp Claude 3.7 / 3.5 Sonnet truy cập dữ liệu thời gian thực từ Supabase để trả lời hỏi đáp và soạn thảo văn bản.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shrink-0 self-start sm:self-auto">
                <Database size={13} className="text-emerald-600" />
                <span>Supabase Realtime Live</span>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Khóa Anthropic Claude API Key (hoặc Gemini API Key):
              </label>
              <div className="flex gap-2 max-w-xl">
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="Dán Anthropic Claude API Key (sk-ant-api...)"
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono focus:border-ueh focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!claudeApiKey.trim()) {
                      toast.error("Vui lòng nhập API Key của Claude!");
                      return;
                    }
                    await saveBotConfig({ aiApiKey: claudeApiKey.trim(), aiModel });
                    toast.success("Đã lưu khóa API và Model lên máy chủ! Dùng chung cho cả máy tính & điện thoại.");
                  }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  Lưu Khóa
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Khóa API được lưu tập trung trên Supabase Storage máy chủ, mọi thiết bị Admin đều sử dụng chung mà không cần cấu hình lại.
              </p>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu size={14} className="text-purple-600" /> Chọn Model AI Kích Hoạt:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {AI_MODELS.map((m) => {
                  const isSelected = aiModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setAiModel(m.id);
                        saveBotConfig({ aiModel: m.id });
                        toast.success(`Đã kích hoạt model: ${m.name}`);
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                          : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isSelected ? "text-purple-900" : "text-slate-800"}`}>
                          {m.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-purple-200 text-purple-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {m.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khung Hỏi Thử Trí Tuệ Nhân Tạo K33 (Tra Cứu Database Trực Tiếp) */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/30 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles size={14} className="text-ueh-gold" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Hỏi Đáp Thử Nghiệm AI K33 (Tra Cứu Database Trực Tiếp)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Kiểm tra khả năng AI trích xuất dữ liệu thực từ tcdn4.top: thành viên, khu vực, đăng ký, sinh nhật...
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 hidden sm:inline-block">
                  Model: {AI_MODELS.find((m) => m.id === aiModel)?.name || aiModel}
                </span>
              </div>

              {/* Câu hỏi gợi ý nhanh */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { text: "📊 Có bao nhiêu người đã đăng ký 15 năm?", query: "Có bao nhiêu người đã đăng ký tham gia họp mặt 15 năm và danh sách gồm những ai?" },
                  { text: "📍 Có những ai đang ở Hà Nội hoặc Nước ngoài?", query: "Có những cựu sinh viên nào đang ở khu vực Hà Nội hoặc Nước ngoài?" },
                  { text: "🔍 Tìm thông tin bạn Cao Tuấn Hiệp", query: "Thông tin của bạn Cao Tuấn Hiệp trong danh bạ là gì?" },
                  { text: "🎂 Ai có sinh nhật trong tháng này?", query: "Những ai có ngày sinh nhật trong tháng này?" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAiChatQuery(item.query)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-blue-200 hover:border-ueh hover:bg-blue-50/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
                  >
                    {item.text}
                  </button>
                ))}
              </div>

              {/* Ô nhập câu hỏi custom */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiChatQuery}
                  onChange={(e) => setAiChatQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAiChatQuery();
                    }
                  }}
                  placeholder="Nhập câu hỏi bất kỳ (VD: Ai ở Quận 7?, Có bạn nào làm ngân hàng không?)..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-ueh focus:outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleAiChatQuery()}
                  disabled={isAiChatLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ueh hover:bg-ueh-light px-4 py-2 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isAiChatLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{isAiChatLoading ? "AI đang tra cứu..." : "Hỏi AI"}</span>
                </button>
              </div>

              {/* Khung hiển thị câu trả lời */}
              {aiChatResponse && (
                <div className="rounded-xl border border-blue-200 bg-white p-3.5 space-y-2 animate-in fade-in shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-ueh">Phản Hồi Từ AI K33:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(aiChatResponse);
                        toast.success("Đã copy phản hồi của AI!");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-ueh cursor-pointer"
                    >
                      <Copy size={12} /> Sao chép
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                    {aiChatResponse}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ĐĂNG TIN (TÍCH HỢP XEM TRƯỚC VÀ AI SOẠN TIN)                       */}
      {/* ========================================================================= */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Form soạn tin & chọn nhóm */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Send size={18} className="text-ueh" /> Soạn Tin Nhắn Gửi Nhóm Zalo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nội dung soạn thảo sẽ hiển thị trực tiếp ở màn hình xem trước bên phải.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setComposerTitle("");
                    setComposerContent("");
                    toast.info("Đã làm mới khung soạn tin!");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
                >
                  <Plus size={14} /> + Soạn tin mới
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAiAssistant("broadcast")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-all"
                >
                  <Sparkles size={13} className="text-ueh-gold" /> Trợ lý AI Viết tin
                </button>
              </div>
            </div>

            {/* Chọn nhóm Zalo nhận tin */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gửi tới các Nhóm Zalo:
              </label>
              <div className="flex flex-wrap gap-2">
                {groups.map((grp) => {
                  const isChecked = composerTargetGroups.includes(grp.id);
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setComposerTargetGroups(composerTargetGroups.filter((id) => id !== grp.id));
                        } else {
                          setComposerTargetGroups([...composerTargetGroups, grp.id]);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                        isChecked
                          ? "bg-ueh text-white border-ueh shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Users size={12} />
                      <span>{grp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tiêu đề thông báo (Tùy chọn)
              </label>
              <input
                type="text"
                value={composerTitle}
                onChange={(e) => setComposerTitle(e.target.value)}
                placeholder="VD: 🔥 THÔNG BÁO CHỐT SIZE ÁO POLO 15 NĂM"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nội dung tin nhắn Zalo *
                </label>
                <span className="text-[11px] text-slate-400">
                  {composerContent.length} ký tự
                </span>
              </div>
              <textarea
                rows={7}
                value={composerContent}
                onChange={(e) => setComposerContent(e.target.value)}
                placeholder="Nhập nội dung tin nhắn gửi vào nhóm Zalo..."
                className="w-full rounded-2xl border border-slate-300 p-3 text-xs leading-relaxed focus:border-ueh focus:outline-none font-sans"
              />
            </div>

            {/* Lịch gửi */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleType === "now"}
                    onChange={() => setScheduleType("now")}
                    className="text-ueh"
                  />
                  <span>Gửi ngay lập tức</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleType === "scheduled"}
                    onChange={() => setScheduleType("scheduled")}
                    className="text-ueh"
                  />
                  <span>Lên lịch gửi</span>
                </label>
              </div>

              {scheduleType === "scheduled" && (
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-ueh"
                />
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setComposerTitle("");
                  setComposerContent("");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Xóa trắng
              </button>

              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-xl bg-ueh px-6 py-2.5 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-md shadow-blue-900/20"
              >
                {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{isSending ? "Đang phát loa..." : "Phát Loa Tin Nhắn"}</span>
              </button>
            </div>
          </div>

          {/* Cột phải: Xem trước tin nhắn Zalo Live */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={14} className="text-[#0068FF]" /> Xem trước hiển thị Zalo (Live)
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Tự động cập nhật
              </span>
            </div>
            {renderZaloPreview(composerTitle, composerContent, groups.find((g) => composerTargetGroups.includes(g.id))?.name)}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ĐIỂM DANH & 15 NĂM (TÍCH HỢP XEM TRƯỚC VÀ AI SOẠN TIN)            */}
      {/* ========================================================================= */}
      {activeTab === "auto" && (
        <div className="space-y-6">
          {/* Thanh tiêu đề & Nút Lưu Cấu Hình Mẫu Tin */}
          <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-sky-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell size={18} className="text-ueh" /> Cấu Hình Mẫu Tin Điểm Danh, 15 Năm & Chuyển Khoản (SePay)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các mẫu tin nhắn dưới đây sẽ được Bot tự động bắn vào nhóm Zalo khi có sự kiện. Bấm nút Lưu để áp dụng.
              </p>
            </div>
            <button
              onClick={handleSaveAutoTemplates}
              disabled={isSavingAutoTemplates}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all shrink-0 cursor-pointer"
            >
              {isSavingAutoTemplates ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSavingAutoTemplates ? "Đang lưu..." : "Lưu Cấu Hình Mẫu Tin"}</span>
            </button>
          </div>

          {/* Section 1: Thông báo Điểm danh */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck size={18} className="text-blue-600" /> 1. Thông Báo Điểm Danh Mới
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tự động bắn tin vào nhóm Zalo khi có cựu sinh viên tạo tài khoản hoặc điểm danh.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCheckin}
                      onChange={(e) => {
                        setAutoCheckin(e.target.checked);
                        saveBotConfig({ autoCheckin: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ueh"></div>
                  </label>
                  <button
                    onClick={() => handleOpenAiAssistant("checkin")}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-bold text-ueh border border-blue-200 hover:bg-blue-100"
                  >
                    <Wand2 size={12} className="text-ueh-orange" /> AI Viết Lại
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mẫu tin nhắn (Sử dụng các biến: &#123;ten&#125;, &#123;lop&#125;, &#123;nghe_nghiep&#125;)
                </label>
                <textarea
                  rows={5}
                  value={checkinTemplate}
                  onChange={(e) => {
                    setCheckinTemplate(e.target.value);
                    saveBotConfig({ checkinTemplate: e.target.value });
                  }}
                  className="w-full rounded-2xl border border-slate-300 p-3 text-xs leading-relaxed focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Gợi ý:</span>
                <button
                  onClick={() => {
                    const sample = "🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\nSau 15 năm 'mất tích', cựu sinh viên {ten} ({lop}) vừa chính thức lộ diện điểm danh trên Alumni Hub!\n👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory";
                    setCheckinTemplate(sample);
                    saveBotConfig({ checkinTemplate: sample });
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold hover:bg-slate-200"
                >
                  Mẫu Dí dỏm
                </button>
                <button
                  onClick={() => {
                    const sample = "📢 CHÀO MỪNG ĐỒNG MÔN!\nThành viên {ten} ({lop}) vừa hoàn tất điểm danh và cập nhật hồ sơ cá nhân trên Alumni Hub TCDN4.\n👉 Vào xem danh bạ: https://tcdn4.top/#directory";
                    setCheckinTemplate(sample);
                    saveBotConfig({ checkinTemplate: sample });
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold hover:bg-slate-200"
                >
                  Mẫu Trang trọng
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 self-start px-1">
                Xem trước tin nhắn Điểm danh (Ví dụ mẫu: Hiệp Cao Tuấn)
              </span>
              {renderZaloPreview(
                "",
                checkinTemplate.replace("{ten}", "Hiệp Cao Tuấn").replace("{lop}", "TC12").replace("{nghe_nghiep}", "Founder - CEO SMLIFE")
              )}
            </div>
          </div>

          {/* Section 2: Thông báo Đăng ký tham gia 15 Năm */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar size={18} className="text-ueh-orange" /> 2. Thông Báo Đăng Ký Họp Mặt 15 Năm
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tự động chúc mừng và tạo không khí hào hứng khi có bạn đăng ký tham gia họp mặt & nhận áo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRegistration}
                      onChange={(e) => {
                        setAutoRegistration(e.target.checked);
                        saveBotConfig({ autoRegistration: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ueh"></div>
                  </label>
                  <button
                    onClick={() => handleOpenAiAssistant("registration")}
                    className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-bold text-ueh-orange border border-orange-200 hover:bg-orange-100"
                  >
                    <Wand2 size={12} /> AI Viết Lại
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mẫu tin nhắn (Sử dụng các biến: &#123;ten&#125;, &#123;lop&#125;, &#123;size&#125;, &#123;tong_so&#125;)
                </label>
                <textarea
                  rows={5}
                  value={registrationTemplate}
                  onChange={(e) => {
                    setRegistrationTemplate(e.target.value);
                    saveBotConfig({ registrationTemplate: e.target.value });
                  }}
                  className="w-full rounded-2xl border border-slate-300 p-3 text-xs leading-relaxed focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Gợi ý:</span>
                <button
                  onClick={() => {
                    const sample = "🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n{ten} ({lop}) đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size {size}!\n🍻 Đã có {tong_so} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.\n👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event";
                    setRegistrationTemplate(sample);
                    saveBotConfig({ registrationTemplate: sample });
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold hover:bg-slate-200"
                >
                  Mẫu Hào hứng
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 self-start px-1">
                Xem trước tin nhắn Đăng ký 15 năm (Ví dụ mẫu)
              </span>
              {renderZaloPreview(
                "",
                registrationTemplate.replace("{ten}", "Hiệp Cao Tuấn").replace("{lop}", "TC12").replace("{size}", "XL (Nam)").replace("{tong_so}", "36")
              )}
            </div>
          </div>

          {/* Section 3: Thông báo Xác nhận Chuyển khoản (SePay) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" /> 3. Thông Báo Xác Nhận Chuyển Khoản (SePay)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tự động bắn tin xác nhận khi thành viên chuyển khoản qua SePay. Mặc định gửi riêng vào nhóm <strong>Ban Liên Lạc</strong> (hoặc nhóm có bật quyền &apos;Chuyển khoản&apos;).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer" title="Bật/Tắt tự động gửi tin nhắn khi SePay khớp thanh toán">
                    <input
                      type="checkbox"
                      checked={autoPayment}
                      onChange={(e) => {
                        setAutoPayment(e.target.checked);
                        saveBotConfig({ autoPayment: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAiAssistant("payment")}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                  >
                    <Wand2 size={12} /> AI Viết Lại
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mẫu tin nhắn (Sử dụng các biến: &#123;ten&#125;, &#123;lop&#125;, &#123;so_tien&#125;, &#123;size&#125;, &#123;ngan_hang&#125;, &#123;noi_dung&#125;, &#123;thoi_gian&#125;, &#123;ma_gd&#125;)
                </label>
                <textarea
                  rows={8}
                  value={paymentTemplate}
                  onChange={(e) => {
                    setPaymentTemplate(e.target.value);
                    saveBotConfig({ paymentTemplate: e.target.value });
                  }}
                  className="w-full rounded-2xl border border-slate-300 p-3 text-xs font-mono leading-relaxed focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Gợi ý mẫu:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = "🔔 [XÁC NHẬN CHUYỂN KHOẢN THÀNH CÔNG - SEPAY]\n━━━━━━━━━━━━━━━━━━━━\n👤 Thành viên: {ten} ({lop})\n💰 Số tiền: +{so_tien} VNĐ\n👕 Size áo: {size}\n🏦 Ngân hàng: {ngan_hang}\n📝 Nội dung: {noi_dung}\n⏰ Thời gian: {thoi_gian}\n🔢 Mã GD: {ma_gd}\n━━━━━━━━━━━━━━━━━━━━\n✨ Trạng thái: ĐÃ XÁC NHẬN 100% THAM GIA HỘI NGỘ 15 NĂM!\n🎉 Ban Liên Lạc xin trân trọng cảm ơn bạn đã hoàn tất đóng góp!";
                    setPaymentTemplate(sample);
                    saveBotConfig({ paymentTemplate: sample });
                  }}
                  className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-semibold hover:bg-emerald-100 cursor-pointer"
                >
                  Mẫu Chuẩn BLL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sample = "💰 TING TING! SEPAY XÁC NHẬN ĐÓNG GÓP HỘI NGỘ 15 NĂM\n━━━━━━━━━━━━━━━━━━━━\n👤 Người chuyển: {ten} ({lop})\n💵 Số tiền: +{so_tien} VNĐ\n👕 Size áo: {size}\n🏦 Ngân hàng: {ngan_hang}\n📌 Mã GD: {ma_gd}\n⏰ Lúc: {thoi_gian}\n━━━━━━━━━━━━━━━━━━━━\n👏 BLL đã tự động khóa slot tham dự cho bạn!";
                    setPaymentTemplate(sample);
                    saveBotConfig({ paymentTemplate: sample });
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Mẫu Ngắn Gọn
                </button>
              </div>

              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-xs text-blue-900 leading-relaxed">
                🎯 <strong>Cơ chế định tuyến Zalo:</strong> Khi SePay gửi webhook báo thanh toán thành công, hệ thống sẽ lọc nhóm Zalo nào có quyền <code>✓ Chuyển khoản</code> (mặc định là nhóm Ban Liên Lạc) để gửi tin. Các nhóm khác sẽ không bị làm phiền.
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 self-start px-1">
                Xem trước tin nhắn Xác nhận chuyển khoản (Ví dụ mẫu)
              </span>
              {renderZaloPreview(
                "",
                paymentTemplate
                  .replace("{ten}", "Cao Tuấn Hiệp")
                  .replace("{lop}", "TC12")
                  .replace("{so_tien}", "1.000.000")
                  .replace("{size}", "XL (Nam)")
                  .replace("{ngan_hang}", "MBBank")
                  .replace("{noi_dung}", "TCDN4 CAO TUAN HIEP 0972555211")
                  .replace("{thoi_gian}", "14:30 23/11/2026")
                  .replace("{ma_gd}", "FT261123987654")
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CHÚC MỪNG SINH NHẬT (TÍCH HỢP XEM TRƯỚC VÀ AI SOẠN TIN)           */}
      {/* ========================================================================= */}
      {activeTab === "birthday" && (
        <div className="space-y-6">
          {/* Thanh tiêu đề & nút Lưu mẫu tin sinh nhật */}
          <div className="rounded-3xl border border-pink-200/80 bg-gradient-to-r from-pink-50/80 via-white to-rose-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cake size={18} className="text-pink-600" /> Cấu Hình Mẫu Tin Chúc Mừng Sinh Nhật
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bot sẽ tự động quét danh bạ và gửi tin nhắn chúc mừng vào nhóm Zalo. Bấm nút Lưu để áp dụng.
              </p>
            </div>
            <button
              onClick={handleSaveBirthdayTemplate}
              disabled={isSavingBirthdayTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all shrink-0 cursor-pointer"
            >
              {isSavingBirthdayTemplate ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSavingBirthdayTemplate ? "Đang lưu..." : "Lưu Cấu Hình Sinh Nhật"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Cake size={18} className="text-pink-500" /> Tự Động Chúc Mừng Sinh Nhật
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hàng ngày bot sẽ tự động quét danh bạ và bắn tin chúc mừng vào nhóm Zalo đúng ngày sinh nhật.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBirthday}
                      onChange={(e) => {
                        setAutoBirthday(e.target.checked);
                        saveBotConfig({ autoBirthday: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ueh"></div>
                  </label>
                  <button
                    onClick={() => handleOpenAiAssistant("birthday")}
                    className="inline-flex items-center gap-1 rounded-xl bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-700 border border-pink-200 hover:bg-pink-100"
                  >
                    <Wand2 size={12} /> AI Viết Lời Chúc
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Giờ gửi tin mỗi ngày:
                  </label>
                  <input
                    type="time"
                    value={birthdayHour}
                    onChange={(e) => {
                      setBirthdayHour(e.target.value);
                      saveBotConfig({ birthdayHour: e.target.value });
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mẫu tin nhắn chúc mừng (Sử dụng biến: &#123;ten&#125;, &#123;lop&#125;)
                </label>
                <textarea
                  rows={5}
                  value={birthdayTemplate}
                  onChange={(e) => {
                    setBirthdayTemplate(e.target.value);
                    saveBotConfig({ birthdayTemplate: e.target.value });
                  }}
                  className="w-full rounded-2xl border border-slate-300 p-3 text-xs leading-relaxed focus:border-ueh focus:outline-none"
                />
              </div>
            </div>

            {/* Danh sách sinh nhật sắp tới */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar size={15} className="text-ueh" /> Danh sách sinh nhật đồng môn sắp tới ({birthdayMembers.length})
              </h4>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {birthdayMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa có thông tin ngày sinh trong danh bạ</p>
                ) : (
                  birthdayMembers.slice(0, 8).map((m, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 font-bold">{m.className}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-slate-500">{m.formattedDate}</span>
                        {m.isToday ? (
                          <span className="rounded-full bg-pink-100 text-pink-700 px-2 py-0.5 text-[10px] font-bold">Hôm nay 🎉</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">còn {m.daysUntil} ngày</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setTestBirthdayMemberName(m.name);
                            setTestBirthdayMemberClass(m.className || "TC10");
                            handleSendTestBirthday(m);
                          }}
                          disabled={isSendingTestBirthday}
                          className="inline-flex items-center gap-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 px-2 py-1 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                          title={`Bắn tin chúc mừng sinh nhật ${m.name} vào nhóm Zalo`}
                        >
                          <Send size={10} />
                          <span>Gửi thử</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 self-start px-1">
              Xem trước tin nhắn Sinh nhật & Gửi thử
            </span>
            {renderZaloPreview(
              "",
              birthdayTemplate
                .replace(/\{ten\}/g, testBirthdayMemberName || birthdayMembers[0]?.name || "Nguyễn Văn Tuấn")
                .replace(/\{lop\}/g, testBirthdayMemberClass || birthdayMembers[0]?.className || "TC10"),
              testBirthdayGroupId === "all" ? "Tất cả nhóm Zalo" : (groups.find((g) => g.id === testBirthdayGroupId)?.name || "TCDN4 - Toàn Khóa K33")
            )}

            {/* Hộp cấu hình gửi thử tin nhắn vào nhóm Zalo */}
            <div className="w-full max-w-sm mt-5 rounded-3xl border border-pink-200/90 bg-gradient-to-br from-pink-50/50 via-white to-rose-50/30 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                    <Send size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">
                      Gửi Thử Tin Sinh Nhật
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Chọn nhóm Zalo có sẵn để kiểm tra tin
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                  Bắn tin test
                </span>
              </div>

              {/* 1. Chọn nhóm Zalo có sẵn */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Nhóm Zalo nhận tin thử:
                  </label>
                  {groups.find((g) => g.id === testBirthdayGroupId)?.chatId ? (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Đã nối Chat ID
                    </span>
                  ) : testBirthdayGroupId !== "all" ? (
                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      <AlertCircle size={11} /> Chưa có Chat ID
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTestBirthdayGroupId("all")}
                    className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      testBirthdayGroupId === "all"
                        ? "bg-pink-600 text-white border-pink-600 shadow-xs ring-2 ring-pink-600/20"
                        : "bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📢</span>
                      <span>Tất cả nhóm (nhận sinh nhật)</span>
                    </span>
                    {testBirthdayGroupId === "all" && <Check size={14} />}
                  </button>

                  {groups.map((grp) => {
                    const isSelected = testBirthdayGroupId === grp.id;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setTestBirthdayGroupId(grp.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer text-left ${
                          isSelected
                            ? "bg-pink-600 text-white border-pink-600 shadow-xs ring-2 ring-pink-600/20"
                            : "bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="truncate font-bold leading-tight">{grp.name.replace(" - K33 UEH", "").replace(" - Toàn Khóa K33", "")}</div>
                          <div className={`text-[9px] font-medium flex items-center gap-1 mt-0.5 ${isSelected ? "text-pink-100" : grp.chatId ? "text-emerald-600" : "text-amber-500"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${grp.chatId ? (isSelected ? "bg-emerald-300" : "bg-emerald-500") : (isSelected ? "bg-amber-200" : "bg-amber-400")}`}></span>
                            <span>{grp.chatId ? "Đã nối Bot" : "Chưa nối"}</span>
                          </div>
                        </div>
                        {isSelected && <Check size={13} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const curr = groups.find((g) => g.id === testBirthdayGroupId);
                  if (curr && !curr.chatId && testBirthdayGroupId !== "all") {
                    return (
                      <p className="text-[10px] text-amber-800 mt-2 bg-amber-50 rounded-xl p-2.5 border border-amber-200 leading-relaxed">
                        ⚠ Nhóm <strong>{curr.name}</strong> chưa kết nối Chat ID. Hãy mời <strong>Bot Elephant</strong> vào nhóm, bổ nhiệm làm Phó nhóm và soạn tin: <code className="font-bold text-slate-900 bg-white px-1 py-0.5 rounded border border-amber-300">/verify {curr.verifyCode}</code>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* 2. Chọn thành viên mẫu */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thành viên mẫu để thử tin:
                </label>
                {birthdayMembers.length > 0 ? (
                  <select
                    value={testBirthdayMemberName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTestBirthdayMemberName(val);
                      const found = birthdayMembers.find((m) => m.name === val);
                      if (found) setTestBirthdayMemberClass(found.className || "TC10");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-pink-500 focus:outline-none"
                  >
                    <option value="">
                      {birthdayMembers[0].name} ({birthdayMembers[0].className}) - Mặc định
                    </option>
                    {birthdayMembers.map((m, idx) => (
                      <option key={idx} value={m.name}>
                        {m.name} ({m.className}) - {m.isToday ? "🎉 Hôm nay" : m.formattedDate}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={testBirthdayMemberName}
                      onChange={(e) => setTestBirthdayMemberName(e.target.value)}
                      placeholder="Họ và tên (VD: Cao Tuấn Hiệp)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-pink-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={testBirthdayMemberClass}
                      onChange={(e) => setTestBirthdayMemberClass(e.target.value)}
                      placeholder="Lớp (VD: TC10)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Nút gửi thử nghiệm */}
              <button
                type="button"
                onClick={() => handleSendTestBirthday()}
                disabled={isSendingTestBirthday}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSendingTestBirthday ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>
                  {isSendingTestBirthday 
                    ? "Đang gửi thử tin..." 
                    : `Gửi Thử Tin Nhắn Tới ${testBirthdayGroupId === "all" ? "Tất cả nhóm Zalo" : (groups.find((g) => g.id === testBirthdayGroupId)?.name || "Nhóm đã chọn")}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* TAB 5: NHẬT KÝ GỬI TIN                                                    */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-ueh" /> Lịch Sử Phát Tin Zalo Bot
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhật ký toàn bộ tin nhắn đã phát loa, thông báo tự động và sinh nhật.
              </p>
            </div>
            <button
              onClick={() => {
                setLogs([]);
                try {
                  localStorage.removeItem("tcdn4_zalo_logs");
                } catch {}
                toast.success("Đã xóa nhật ký!");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600"
            >
              Xóa lịch sử
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Chưa có lịch sử phát tin nào</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.title}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                        {log.group}
                      </span>
                    </div>
                    <p className="text-slate-600 max-w-xl leading-relaxed whitespace-pre-wrap">{log.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[11px]">
                    <Clock size={12} />
                    <span>{log.time}</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2">
                      Thành công
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM NHÓM ZALO MỚI                                               */}
      {/* ========================================================================= */}
      {isAddGroupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsAddGroupModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-[#0068FF]" /> Thêm Nhóm Zalo Mới
              </h3>
              <button
                onClick={() => setIsAddGroupModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên nhóm Zalo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nhóm Bóng Đá TCDN4 K33"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Link tham gia nhóm (Tùy chọn)
                </label>
                <input
                  type="url"
                  placeholder="https://zalo.me/g/..."
                  value={newGroupLink}
                  onChange={(e) => setNewGroupLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-100">
                💡 Hệ thống sẽ tự động cấp một mã xác minh riêng (ví dụ: <code className="font-bold">#TCDN4-XXXX</code>) để bạn mời Bot vào nhóm và kích hoạt nhận tin.
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGroupModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white hover:bg-ueh-light shadow-xs"
                >
                  Tạo Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRỢ LÝ AI SOẠN TIN NHẮN (AI WRITER ASSISTANT)                    */}
      {/* ========================================================================= */}
      {isAiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsAiModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles size={16} className="text-ueh-gold" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Trợ Lý AI Viết Tin Zalo K33</h3>
                  <p className="text-[11px] text-slate-500">Tạo tin nhắn dí dỏm, hào sảng và đúng chất sinh viên UEH.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Chọn Model AI */}
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                <Cpu size={13} className="text-purple-600" /> Model AI:
              </span>
              <select
                value={aiModel}
                onChange={(e) => {
                  setAiModel(e.target.value);
                  saveBotConfig({ aiModel: e.target.value });
                  toast.success(`Đã chọn model: ${AI_MODELS.find((m) => m.id === e.target.value)?.name || e.target.value}`);
                }}
                className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn Tone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Chọn phong cách văn phong (Tone):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AI_TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAiTone(t.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      aiTone === t.id
                        ? "bg-blue-50 border-ueh text-ueh shadow-xs ring-1 ring-ueh/30"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nhập ý tưởng hoặc chọn prompt nhanh */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                2. Nhập ý tưởng chính cần nhắn (Hoặc chọn gợi ý):
              </label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="VD: Nhắc anh em chốt áo kẻo may trễ, rủ rê đi tăng 2..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none mb-2"
              />

              {/* Prompt chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Rủ rê họp mặt 15 năm tại Cơ sở B",
                  "Nhắc chốt size áo Polo kỷ niệm kẻo lỡ",
                  "Tìm bạn đồng môn sau 15 năm mất tích",
                  "Thông báo tiệc trưa và tiết mục văn nghệ",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAiTopic(chip)}
                    className="rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-ueh px-2 py-0.5 text-[10px] font-medium text-slate-600 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút Tạo nội dung AI */}
            <button
              type="button"
              onClick={handleGenerateAiMessage}
              disabled={isAiGenerating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-ueh py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all"
            >
              {isAiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
              <span>{isAiGenerating ? "AI đang suy nghĩ và viết văn..." : "✨ AI Tạo Nội Dung Ngay"}</span>
            </button>

            {/* Kết quả do AI sinh ra */}
            {aiGeneratedResult && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-ueh">
                  <span>Nội dung AI đề xuất:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiGeneratedResult);
                      toast.success("Đã copy nội dung!");
                    }}
                    className="text-[11px] text-slate-500 hover:text-ueh flex items-center gap-1"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
                <div className="bg-white rounded-xl p-3 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200/60 max-h-40 overflow-y-auto">
                  {aiGeneratedResult}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleApplyAiMessage}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-ueh-light"
                  >
                    <Check size={13} /> Áp Dụng Vào Soạn Thảo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SỬA HOẶC GẮN CHAT ID THỦ CÔNG CHO NHÓM                          */}
      {/* ========================================================================= */}
      {editingChatIdGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditingChatIdGroup(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#0068FF] flex items-center justify-center">
                  <Hash size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Gắn Chat ID Zalo</h3>
                  <p className="text-[11px] text-slate-500">{editingChatIdGroup.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingChatIdGroup(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chat ID của nhóm Zalo
                </label>
                <input
                  type="text"
                  value={customChatIdInput}
                  onChange={(e) => setCustomChatIdInput(e.target.value)}
                  placeholder="Ví dụ: 246845883529197922 hoặc -123456789"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-blue-50/70 p-3 text-[11px] text-blue-900 border border-blue-100 space-y-1">
                <p>💡 <strong>Cách lấy Chat ID tự động (khuyên dùng):</strong></p>
                <p>Mời Bot Elephant vào nhóm, bổ nhiệm Phó Nhóm và soạn: <code className="font-bold bg-white px-1 py-0.5 rounded text-[#0068FF]">@Bot Elephant /verify {editingChatIdGroup.verifyCode}</code>. Bot sẽ tự động gán Chat ID vào đây.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingChatIdGroup(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualChatId}
                  className="rounded-xl bg-[#0068FF] px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                >
                  Lưu Chat ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
