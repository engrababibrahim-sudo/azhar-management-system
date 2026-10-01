"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  Power,
  PowerOff,
  Printer,
} from "lucide-react";

import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Role =
  | "super_admin"
  | "director"
  | "deputy"
  | "employee"
  | "sheikh"
  | "teacher"
  | "student"
  | "parent";

type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  directorate_id: string | null;
  institute_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  directorate_id: string | null;
};

type Announcement = {
  id: string;
  directorate_id: string | null;
  institute_id: string | null;
  title: string;
  content: string;
  priority: string;
  created_by: string | null;
  created_at: string;
  announcement_type: string;
  target_type: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  updated_at: string;
  institute?: Institute | null;
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مهمة",
  urgent: "عاجلة",
};

const typeLabels: Record<string, string> = {
  general: "عام",
  academic: "تعليمي",
  administrative: "إداري",
  urgent: "عاجل",
  event: "فعالية",
  maintenance: "صيانة",
  technology: "تكنولوجيا",
  other: "أخرى",
};

function getPriorityClass(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "low":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function getTypeClass(type: string) {
  switch (type) {
    case "urgent":
      return "bg-red-50 text-red-700 border-red-200";
    case "academic":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "administrative":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "event":
      return "bg-green-50 text-green-700 border-green-200";
    case "maintenance":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "technology":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export default function AnnouncementsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal",
    announcement_type: "general",
    target_type: "all",
    institute_id: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  const isManager =
    profile?.role === "director" ||
    profile?.role === "super_admin";

  const isSheikh = profile?.role === "sheikh";

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          role,
          directorate_id,
          institute_id
        `
        )
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error("تعذر تحميل بيانات المستخدم.");
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      await Promise.all([
        loadInstitutes(currentProfile),
        loadAnnouncements(currentProfile),
      ]);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "حدث خطأ أثناء تحميل الإعلانات.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInstitutes(currentProfile: Profile) {
    let query = supabase
      .from("institutes")
      .select("id, name, directorate_id")
      .order("name");

    if (
      currentProfile.role !== "super_admin" &&
      currentProfile.directorate_id
    ) {
      query = query.eq(
        "directorate_id",
        currentProfile.directorate_id
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return;
    }

    setInstitutes((data || []) as Institute[]);
  }

  async function loadAnnouncements(currentProfile: Profile) {
    let query = supabase
      .from("announcements")
      .select(
        `
        id,
        directorate_id,
        institute_id,
        title,
        content,
        priority,
        created_by,
        created_at,
        announcement_type,
        target_type,
        is_active,
        start_date,
        end_date,
        updated_at,
        institute:institutes (
          id,
          name,
          directorate_id
        )
      `
      )
      .order("created_at", { ascending: false });

    if (currentProfile.role !== "super_admin") {
      if (currentProfile.directorate_id) {
        query = query.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      }
    }

    if (currentProfile.role === "sheikh") {
      if (!currentProfile.institute_id) {
        setAnnouncements([]);
        return;
      }

      query = query.or(
        `target_type.eq.all,institute_id.eq.${currentProfile.institute_id}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      alert("تعذر تحميل الإعلانات.");
      return;
    }

    const normalized = (data || []).map((item: any) => ({
      ...item,
      institute: Array.isArray(item.institute)
        ? item.institute[0] ?? null
        : item.institute ?? null,
    }));

    setAnnouncements(normalized as Announcement[]);
  }

  function resetForm() {
    setForm({
      title: "",
      content: "",
      priority: "normal",
      announcement_type: "general",
      target_type: "all",
      institute_id: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });

    setEditingAnnouncement(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);

    setForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority || "normal",
      announcement_type:
        announcement.announcement_type || "general",
      target_type: announcement.target_type || "all",
      institute_id: announcement.institute_id || "",
      start_date: announcement.start_date
        ? new Date(announcement.start_date)
            .toISOString()
            .slice(0, 16)
        : "",
      end_date: announcement.end_date
        ? new Date(announcement.end_date)
            .toISOString()
            .slice(0, 16)
        : "",
      is_active: announcement.is_active,
    });

    setShowForm(true);
  }

  function openDetails(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
    setShowDetails(true);
  }

  async function saveAnnouncement() {
    if (!profile) return;

    if (!form.title.trim()) {
      alert("من فضلك أدخل عنوان الإعلان.");
      return;
    }

    if (!form.content.trim()) {
      alert("من فضلك أدخل محتوى الإعلان.");
      return;
    }

    if (!profile.directorate_id && profile.role !== "super_admin") {
      alert("لم يتم العثور على الإدارة التعليمية المرتبطة بحسابك.");
      return;
    }

    if (
      form.target_type === "institute" &&
      !form.institute_id
    ) {
      alert("من فضلك اختر المعهد المستهدف.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        directorate_id: profile.directorate_id,
        institute_id:
          form.target_type === "all"
            ? null
            : form.institute_id || null,
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        announcement_type: form.announcement_type,
        target_type: form.target_type,
        is_active: form.is_active,
        start_date: form.start_date
          ? new Date(form.start_date).toISOString()
          : new Date().toISOString(),
        end_date: form.end_date
          ? new Date(form.end_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", editingAnnouncement.id);

        if (error) throw error;

        alert("تم تحديث الإعلان بنجاح ✅");
      } else {
        const { error } = await supabase
          .from("announcements")
          .insert({
            ...payload,
            created_by: profile.id,
          });

        if (error) throw error;

        alert("تم نشر الإعلان بنجاح ✅");
      }

      setShowForm(false);
      resetForm();

      await loadAnnouncements(profile);
    } catch (error: any) {
      console.error(error);
      alert(
        error.message ||
          "حدث خطأ أثناء حفظ الإعلان."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAnnouncement(
    announcement: Announcement
  ) {
    if (!isManager) return;

    const { error } = await supabase
      .from("announcements")
      .update({
        is_active: !announcement.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcement.id);

    if (error) {
      console.error(error);
      alert("تعذر تغيير حالة الإعلان.");
      return;
    }

    await loadAnnouncements(profile!);
  }

  async function deleteAnnouncement(
    announcement: Announcement
  ) {
    if (!isManager) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الإعلان:\n\n${announcement.title}`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcement.id);

    if (error) {
      console.error(error);
      alert("تعذر حذف الإعلان.");
      return;
    }

    alert("تم حذف الإعلان.");

    setShowDetails(false);
    setSelectedAnnouncement(null);

    await loadAnnouncements(profile!);
  }

  function handlePrintAnnouncements() {
    if (filteredAnnouncements.length === 0) {
      alert("لا توجد إعلانات مطابقة للطباعة.");
      return;
    }

    const now = new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    const filterParts = [
      searchTerm.trim() ? `البحث: ${searchTerm.trim()}` : "",
      typeFilter !== "all"
        ? `النوع: ${typeLabels[typeFilter] || typeFilter}`
        : "",
      priorityFilter !== "all"
        ? `الأولوية: ${priorityLabels[priorityFilter] || priorityFilter}`
        : "",
      statusFilter !== "all"
        ? `الحالة: ${statusFilter === "active" ? "نشطة" : "غير نشطة"}`
        : "",
    ].filter(Boolean);

    const total = filteredAnnouncements.length;
    const active = filteredAnnouncements.filter((item) => item.is_active).length;
    const inactive = total - active;
    const urgent = filteredAnnouncements.filter(
      (item) => item.priority === "urgent"
    ).length;

    const rows = filteredAnnouncements
      .map(
        (announcement, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="title">${escapeHtml(announcement.title)}</td>
            <td>${escapeHtml(
              announcement.target_type === "all"
                ? "جميع المعاهد"
                : announcement.institute?.name || "معهد محدد"
            )}</td>
            <td>${escapeHtml(
              typeLabels[announcement.announcement_type] ||
                announcement.announcement_type
            )}</td>
            <td>${escapeHtml(
              priorityLabels[announcement.priority] || announcement.priority
            )}</td>
            <td>${announcement.is_active ? "نشط" : "غير نشط"}</td>
            <td>${escapeHtml(formatDate(announcement.start_date))}</td>
            <td>${escapeHtml(formatDate(announcement.end_date))}</td>
          </tr>
        `
      )
      .join("");

    const filtersHtml = filterParts.length
      ? `<div class="filters"><strong>الفلاتر:</strong> ${filterParts
          .map(escapeHtml)
          .join(" &nbsp; | &nbsp; ")}</div>`
      : `<div class="filters"><strong>الفلاتر:</strong> جميع الإعلانات</div>`;

    const printWindow = window.open("", "_blank", "width=1400,height=900");

    if (!printWindow) {
      alert("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>تقرير الإعلانات</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Tahoma, sans-serif;
            direction: rtl;
            color: #111827;
            margin: 0;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #1d4ed8;
            padding-bottom: 14px;
            margin-bottom: 16px;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
          }
          .subtitle {
            color: #4b5563;
            font-size: 13px;
            margin-top: 5px;
          }
          .meta {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin: 12px 0;
            font-size: 12px;
            color: #374151;
          }
          .filters {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            padding: 9px 12px;
            border-radius: 7px;
            font-size: 12px;
            margin-bottom: 14px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
          }
          .stat {
            border: 1px solid #e5e7eb;
            border-radius: 7px;
            padding: 9px;
            text-align: center;
          }
          .stat strong {
            display: block;
            font-size: 18px;
            margin-bottom: 3px;
          }
          .stat span {
            font-size: 11px;
            color: #6b7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 7px 6px;
            font-size: 10.5px;
            vertical-align: middle;
            text-align: right;
            word-wrap: break-word;
          }
          th {
            background: #f1f5f9;
            font-weight: 800;
          }
          th:first-child, td:first-child {
            width: 4%;
            text-align: center;
          }
          th:nth-child(2), td:nth-child(2) { width: 22%; }
          th:nth-child(3), td:nth-child(3) { width: 17%; }
          th:nth-child(4), td:nth-child(4) { width: 11%; }
          th:nth-child(5), td:nth-child(5) { width: 10%; }
          th:nth-child(6), td:nth-child(6) { width: 10%; }
          th:nth-child(7), td:nth-child(7),
          th:nth-child(8), td:nth-child(8) { width: 13%; }
          .footer {
            margin-top: 12px;
            font-size: 10px;
            color: #6b7280;
            text-align: center;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">نظام إدارة المعاهد الأزهرية</div>
          <div class="subtitle">تقرير الإعلانات</div>
        </div>

        <div class="meta">
          <div><strong>النطاق:</strong> جميع الإعلانات المعروضة</div>
          <div><strong>عدد النتائج:</strong> ${total}</div>
          <div><strong>تاريخ الطباعة:</strong> ${escapeHtml(now)}</div>
        </div>

        ${filtersHtml}

        <div class="stats">
          <div class="stat"><strong>${total}</strong><span>إجمالي النتائج</span></div>
          <div class="stat"><strong>${active}</strong><span>إعلانات نشطة</span></div>
          <div class="stat"><strong>${inactive}</strong><span>إعلانات غير نشطة</span></div>
          <div class="stat"><strong>${urgent}</strong><span>إعلانات عاجلة</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>م</th>
              <th>عنوان الإعلان</th>
              <th>المعهد / النطاق</th>
              <th>النوع</th>
              <th>الأولوية</th>
              <th>الحالة</th>
              <th>يبدأ من</th>
              <th>ينتهي في</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">
          نظام إدارة المعاهد الأزهرية — تقرير الإعلانات
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  const filteredAnnouncements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const matchesSearch =
        !term ||
        announcement.title
          .toLowerCase()
          .includes(term) ||
        announcement.content
          .toLowerCase()
          .includes(term) ||
        announcement.institute?.name
          ?.toLowerCase()
          .includes(term);

      const matchesPriority =
        priorityFilter === "all" ||
        announcement.priority === priorityFilter;

      const matchesType =
        typeFilter === "all" ||
        announcement.announcement_type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          announcement.is_active) ||
        (statusFilter === "inactive" &&
          !announcement.is_active);

      return (
        matchesSearch &&
        matchesPriority &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    announcements,
    searchTerm,
    priorityFilter,
    typeFilter,
    statusFilter,
  ]);

  const activeCount = announcements.filter(
    (item) => item.is_active
  ).length;

  const inactiveCount = announcements.filter(
    (item) => !item.is_active
  ).length;

  const urgentCount = announcements.filter(
    (item) => item.priority === "urgent"
  ).length;

  if (loading) {
    return (
      <AppShell>
        <div
          dir="rtl"
          className="min-h-[60vh] flex items-center justify-center"
        >
          <div className="flex items-center gap-3 text-gray-600">
            <RefreshCw className="w-5 h-5 animate-spin" />
            جاري تحميل الإعلانات...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div dir="rtl" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-blue-700" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  الإعلانات
                </h1>

                <p className="text-sm text-gray-500 mt-1">
                  منصة مركزية لنشر الإعلانات والتعليمات
                  ومتابعتها داخل المعاهد
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                {isManager
                  ? "مدير الإدارة"
                  : isSheikh
                  ? "شيخ المعهد"
                  : "مستخدم النظام"}
              </span>

              {profile?.full_name && (
                <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                  {profile.full_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAnnouncements}
              disabled={filteredAnnouncements.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>

            <button
              onClick={() => profile && loadAnnouncements(profile)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>

            {isManager && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                إعلان جديد
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  إجمالي الإعلانات
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {announcements.length}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  الإعلانات النشطة
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {activeCount}
                </p>
              </div>

              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  غير النشطة
                </p>
                <p className="text-3xl font-bold text-gray-500 mt-2">
                  {inactiveCount}
                </p>
              </div>

              <PowerOff className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  إعلانات عاجلة
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {urgentCount}
                </p>
              </div>

              <Megaphone className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-blue-600" />

            <div>
              <h2 className="font-bold text-gray-900">
                البحث والتصفية
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                ابحث عن إعلان أو قم بتصفية النتائج حسب
                النوع والأولوية والحالة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="ابحث في الإعلانات..."
                className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="all">
                كل أنواع الإعلانات
              </option>

              {Object.entries(typeLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="all">
                كل الأولويات
              </option>

              {Object.entries(priorityLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="all">
                كل الحالات
              </option>

              <option value="active">
                نشطة
              </option>

              <option value="inactive">
                غير نشطة
              </option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">
              قائمة الإعلانات
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              عرض {filteredAnnouncements.length} من أصل{" "}
              {announcements.length} إعلان
            </p>
          </div>

          {filteredAnnouncements.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-gray-400" />
              </div>

              <h3 className="mt-4 font-bold text-gray-800">
                لا توجد إعلانات
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                {isManager
                  ? "يمكنك إنشاء أول إعلان من زر إعلان جديد."
                  : "لا توجد إعلانات موجهة إلى معهدك حاليًا."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAnnouncements.map(
                (announcement) => (
                  <div
                    key={announcement.id}
                    className="p-5 hover:bg-gray-50 transition"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPriorityClass(
                              announcement.priority
                            )}`}
                          >
                            {priorityLabels[
                              announcement.priority
                            ] ||
                              announcement.priority}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${getTypeClass(
                              announcement.announcement_type
                            )}`}
                          >
                            {typeLabels[
                              announcement.announcement_type
                            ] ||
                              announcement.announcement_type}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              announcement.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {announcement.is_active
                              ? "نشط"
                              : "غير نشط"}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            openDetails(
                              announcement
                            )
                          }
                          className="text-right block w-full"
                        >
                          <h3 className="text-lg font-bold text-gray-900 hover:text-blue-700 transition">
                            {announcement.title}
                          </h3>

                          <p className="text-sm text-gray-600 mt-2 leading-7 line-clamp-2">
                            {announcement.content}
                          </p>
                        </button>

                        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />

                            {announcement.target_type ===
                            "all"
                              ? "جميع المعاهد"
                              : announcement.institute
                                  ?.name ||
                                "معهد محدد"}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4" />
                            {formatDate(
                              announcement.start_date
                            )}
                          </span>

                          {announcement.end_date && (
                            <span>
                              حتى{" "}
                              {formatDate(
                                announcement.end_date
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            openDetails(
                              announcement
                            )
                          }
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </button>

                        {isManager && (
                          <>
                            <button
                              onClick={() =>
                                openEdit(
                                  announcement
                                )
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              <Edit3 className="w-4 h-4" />
                              تعديل
                            </button>

                            <button
                              onClick={() =>
                                toggleAnnouncement(
                                  announcement
                                )
                              }
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                announcement.is_active
                                  ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {announcement.is_active ? (
                                <PowerOff className="w-4 h-4" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}

                              {announcement.is_active
                                ? "إيقاف"
                                : "تفعيل"}
                            </button>

                            <button
                              onClick={() =>
                                deleteAnnouncement(
                                  announcement
                                )
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {showForm &&
          createPortal(
            <div
              dir="rtl"
              className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingAnnouncement
                        ? "تعديل الإعلان"
                        : "إعلان جديد"}
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      أدخل بيانات الإعلان وحدد المعاهد
                      المستهدفة.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setShowForm(false)
                    }
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      عنوان الإعلان
                    </label>

                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          title: e.target.value,
                        })
                      }
                      placeholder="مثال: تعليمات بدء الدراسة"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        نوع الإعلان
                      </label>

                      <select
                        value={
                          form.announcement_type
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            announcement_type:
                              e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
                      >
                        {Object.entries(
                          typeLabels
                        ).map(
                          ([value, label]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        الأولوية
                      </label>

                      <select
                        value={form.priority}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            priority:
                              e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
                      >
                        {Object.entries(
                          priorityLabels
                        ).map(
                          ([value, label]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      محتوى الإعلان
                    </label>

                    <textarea
                      value={form.content}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          content:
                            e.target.value,
                        })
                      }
                      rows={6}
                      placeholder="اكتب تفاصيل الإعلان هنا..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <label className="block text-sm font-bold text-blue-900 mb-3">
                      نطاق الإعلان
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            target_type: "all",
                            institute_id: "",
                          })
                        }
                        className={`p-4 rounded-xl border text-right transition ${
                          form.target_type ===
                          "all"
                            ? "border-blue-500 bg-white ring-2 ring-blue-100"
                            : "border-blue-100 bg-blue-50"
                        }`}
                      >
                        <div className="font-bold text-gray-900">
                          جميع المعاهد
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          الإعلان يظهر لكل معاهد
                          الإدارة التعليمية.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            target_type:
                              "institute",
                          })
                        }
                        className={`p-4 rounded-xl border text-right transition ${
                          form.target_type ===
                          "institute"
                            ? "border-blue-500 bg-white ring-2 ring-blue-100"
                            : "border-blue-100 bg-blue-50"
                        }`}
                      >
                        <div className="font-bold text-gray-900">
                          معهد محدد
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          الإعلان يظهر لمعهد واحد
                          فقط.
                        </div>
                      </button>
                    </div>

                    {form.target_type ===
                      "institute" && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          اختر المعهد
                        </label>

                        <select
                          value={
                            form.institute_id
                          }
                          onChange={(e) =>
                            setForm({
                              ...form,
                              institute_id:
                                e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
                        >
                          <option value="">
                            اختر المعهد
                          </option>

                          {institutes.map(
                            (institute) => (
                              <option
                                key={
                                  institute.id
                                }
                                value={
                                  institute.id
                                }
                              >
                                {institute.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        يبدأ من
                      </label>

                      <input
                        type="datetime-local"
                        value={
                          form.start_date
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            start_date:
                              e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ينتهي في
                      </label>

                      <input
                        type="datetime-local"
                        value={
                          form.end_date
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            end_date:
                              e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_active:
                            e.target.checked,
                        })
                      }
                      className="w-5 h-5"
                    />

                    <div>
                      <div className="font-semibold text-gray-800">
                        الإعلان نشط
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        عند إلغاء التفعيل لن يظهر الإعلان
                        للمستخدمين.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5 flex items-center justify-end gap-3">
                  <button
                    onClick={() =>
                      setShowForm(false)
                    }
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    إلغاء
                  </button>

                  <button
                    onClick={saveAnnouncement}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {saving && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}

                    {editingAnnouncement
                      ? "حفظ التعديلات"
                      : "نشر الإعلان"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Details Modal */}
        {showDetails &&
          selectedAnnouncement &&
          createPortal(
            <div
              dir="rtl"
              className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-blue-700" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        تفاصيل الإعلان
                      </h2>

                      <p className="text-xs text-gray-500 mt-1">
                        بيانات الإعلان ونطاق النشر
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setShowDetails(false)
                    }
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getPriorityClass(
                        selectedAnnouncement.priority
                      )}`}
                    >
                      الأولوية:{" "}
                      {priorityLabels[
                        selectedAnnouncement.priority
                      ] ||
                        selectedAnnouncement.priority}
                    </span>

                    <span
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${getTypeClass(
                        selectedAnnouncement.announcement_type
                      )}`}
                    >
                      {typeLabels[
                        selectedAnnouncement
                          .announcement_type
                      ] ||
                        selectedAnnouncement
                          .announcement_type}
                    </span>

                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        selectedAnnouncement.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selectedAnnouncement.is_active
                        ? "نشط"
                        : "غير نشط"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedAnnouncement.title}
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5">
                    <p className="text-gray-700 leading-8 whitespace-pre-wrap">
                      {
                        selectedAnnouncement.content
                      }
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-gray-100 bg-white">
                      <div className="text-xs text-gray-500 mb-1">
                        نطاق الإعلان
                      </div>

                      <div className="font-semibold text-gray-900">
                        {selectedAnnouncement.target_type ===
                        "all"
                          ? "جميع المعاهد"
                          : selectedAnnouncement
                              .institute?.name ||
                            "معهد محدد"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-white">
                      <div className="text-xs text-gray-500 mb-1">
                        تاريخ النشر
                      </div>

                      <div className="font-semibold text-gray-900">
                        {formatDate(
                          selectedAnnouncement.created_at
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-white">
                      <div className="text-xs text-gray-500 mb-1">
                        يبدأ من
                      </div>

                      <div className="font-semibold text-gray-900">
                        {formatDate(
                          selectedAnnouncement.start_date
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-white">
                      <div className="text-xs text-gray-500 mb-1">
                        ينتهي في
                      </div>

                      <div className="font-semibold text-gray-900">
                        {formatDate(
                          selectedAnnouncement.end_date
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
                  {isManager && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetails(false);
                          openEdit(
                            selectedAnnouncement
                          );
                        }}
                        className="px-5 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 inline-flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        تعديل
                      </button>

                      <button
                        onClick={() =>
                          deleteAnnouncement(
                            selectedAnnouncement
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 inline-flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </>
                  )}

                  <button
                    onClick={() =>
                      setShowDetails(false)
                    }
                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </AppShell>
  );
}
