"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareWarning,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";

import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  role: string;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
};

type Complaint = {
  id: string;
  institute_id: string;
  student_id: string | null;
  parent_id: string | null;
  complaint_type: string;
  title: string;
  description: string;
  priority: string;
  source: string;
  status: string;
  institute_response: string | null;
  director_response: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  institute?: {
    name: string;
  } | null;
};

const complaintTypes: Record<string, string> = {
  academic: "تعليمية",
  administrative: "إدارية",
  student: "شؤون طلاب",
  teacher: "مدرسين",
  maintenance: "صيانة",
  technology: "أجهزة / تكنولوجيا",
  internet: "إنترنت",
  transport: "انتقالات",
  other: "أخرى",
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مهمة",
  urgent: "عاجلة",
};

const statusLabels: Record<string, string> = {
  new: "جديدة",
  received: "تم الاستلام",
  in_progress: "قيد المعالجة",
  waiting_parent: "في انتظار ولي الأمر",
  escalated: "مصعدة للمدير",
  resolved: "تم الحل",
  closed: "مغلقة",
};

function priorityClass(priority: string) {
  if (priority === "urgent") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "high") {
    return "bg-orange-100 text-orange-700";
  }

  if (priority === "low") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-blue-100 text-blue-700";
}

function statusClass(status: string) {
  if (status === "resolved" || status === "closed") {
    return "bg-green-100 text-green-700";
  }

  if (status === "escalated") {
    return "bg-red-100 text-red-700";
  }

  if (status === "in_progress") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function ComplaintsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showNewComplaint, setShowNewComplaint] = useState(false);
  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("other");
  const [newPriority, setNewPriority] = useState("normal");

  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("يجب تسجيل الدخول أولًا.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select(
          "role, full_name, institute_id, directorate_id"
        )
        .eq("id", user.id)
        .single();

    if (profileError || !profileData) {
      setError(
        profileError?.message ||
          "تعذر العثور على بيانات المستخدم."
      );
      setLoading(false);
      return;
    }

    setProfile(profileData);

    let query = supabase
      .from("complaints")
      .select(
        `
        id,
        institute_id,
        student_id,
        parent_id,
        complaint_type,
        title,
        description,
        priority,
        source,
        status,
        institute_response,
        director_response,
        escalated_at,
        resolved_at,
        closed_at,
        created_by,
        created_at,
        updated_at,
        institute:institutes(name)
        `
      )
      .order("created_at", { ascending: false });

    if (
      profileData.role === "sheikh" ||
      profileData.role === "teacher" ||
      profileData.role === "employee"
    ) {
      if (!profileData.institute_id) {
        setComplaints([]);
        setLoading(false);
        return;
      }

      query = query.eq(
        "institute_id",
        profileData.institute_id
      );
    }

    if (profileData.role === "parent") {
      query = query.eq("parent_id", user.id);
    }

    const { data, error: complaintsError } = await query;

    if (complaintsError) {
      console.error(
        "COMPLAINTS ERROR:",
        complaintsError
      );
      setError(complaintsError.message);
      setComplaints([]);
    } else {
      setComplaints(
        (data || []) as unknown as Complaint[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredComplaints = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesSearch =
        !search ||
        complaint.title.toLowerCase().includes(search) ||
        complaint.description.toLowerCase().includes(search) ||
        complaint.institute?.name
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        complaint.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    complaints,
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  const statistics = useMemo(() => {
    return {
      total: complaints.length,
      newCount: complaints.filter(
        (item) => item.status === "new"
      ).length,
      inProgress: complaints.filter(
        (item) => item.status === "in_progress"
      ).length,
      escalated: complaints.filter(
        (item) => item.status === "escalated"
      ).length,
      resolved: complaints.filter(
        (item) =>
          item.status === "resolved" ||
          item.status === "closed"
      ).length,
    };
  }, [complaints]);

  const canCreateComplaint =
    profile?.role === "parent" ||
    profile?.role === "sheikh" ||
    profile?.role === "teacher" ||
    profile?.role === "employee";

  const canManageComplaint =
    profile?.role === "director" ||
    profile?.role === "deputy" ||
    profile?.role === "super_admin" ||
    profile?.role === "sheikh" ||
    profile?.role === "teacher" ||
    profile?.role === "employee";

  async function createComplaint() {
    if (!profile) return;

    if (!newTitle.trim()) {
      alert("اكتبي عنوان الشكوى.");
      return;
    }

    if (!newDescription.trim()) {
      alert("اكتبي تفاصيل الشكوى.");
      return;
    }

    let instituteId = profile.institute_id;

    if (!instituteId) {
      alert(
        "هذا الحساب غير مرتبط بمعهد، لذلك لا يمكن إنشاء الشكوى."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("يجب تسجيل الدخول أولًا.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("complaints")
      .insert({
        institute_id: instituteId,
        parent_id:
          profile.role === "parent" ? user.id : null,
        created_by: user.id,
        source:
          profile.role === "parent"
            ? "parent"
            : "institute",
        complaint_type: newType,
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        status: "new",
      });

    if (insertError) {
      console.error(
        "CREATE COMPLAINT ERROR:",
        insertError
      );

      alert(
        "تعذر إنشاء الشكوى:\n" +
          insertError.message
      );

      setSaving(false);
      return;
    }

    setNewTitle("");
    setNewDescription("");
    setNewType("other");
    setNewPriority("normal");
    setShowNewComplaint(false);

    await loadData();

    setSaving(false);
  }

  async function updateComplaint() {
    if (!selectedComplaint || !profile) return;

    if (
      !responseText.trim() &&
      !newStatus
    ) {
      alert(
        "اكتبي الرد أو اختاري حالة جديدة."
      );
      return;
    }

    setSaving(true);

    const updateData: Record<string, string | null> = {};

    if (newStatus) {
      updateData.status = newStatus;

      if (newStatus === "escalated") {
        updateData.escalated_at =
          new Date().toISOString();
      }

      if (newStatus === "resolved") {
        updateData.resolved_at =
          new Date().toISOString();
      }

      if (newStatus === "closed") {
        updateData.closed_at =
          new Date().toISOString();
      }
    }

    if (responseText.trim()) {
      if (
        profile.role === "director" ||
        profile.role === "deputy" ||
        profile.role === "super_admin"
      ) {
        updateData.director_response =
          responseText.trim();
      } else {
        updateData.institute_response =
          responseText.trim();
      }
    }

    const { error: updateError } =
      await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", selectedComplaint.id);

    if (updateError) {
      console.error(
        "UPDATE COMPLAINT ERROR:",
        updateError
      );

      alert(
        "تعذر تحديث الشكوى:\n" +
          updateError.message
      );

      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && responseText.trim()) {
      await supabase
        .from("complaint_updates")
        .insert({
          complaint_id: selectedComplaint.id,
          user_id: user.id,
          status:
            newStatus ||
            selectedComplaint.status,
          note: responseText.trim(),
        });
    }

    setResponseText("");
    setNewStatus("");
    setSelectedComplaint(null);

    await loadData();

    setSaving(false);
  }

  function openComplaint(complaint: Complaint) {
    setSelectedComplaint(complaint);
    setResponseText("");
    setNewStatus(complaint.status);
  }

  return (
    <AppShell>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50"
      >
        {/* Header */}
        <div className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900 p-3 text-white">
                    <MessageSquareWarning
                      size={25}
                    />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      الشكاوى والبلاغات
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      نظام موحد لاستقبال الشكاوى ومتابعتها وحلها
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={loadData}
                  className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={18} />
                  تحديث
                </button>

                {canCreateComplaint && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowNewComplaint(true)
                    }
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    <Plus size={19} />
                    تقديم شكوى
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    إجمالي البلاغات
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {statistics.total}
                  </p>
                </div>

                <FileText
                  size={25}
                  className="text-slate-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    جديدة
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {statistics.newCount}
                  </p>
                </div>

                <AlertCircle
                  size={25}
                  className="text-slate-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    قيد المعالجة
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {statistics.inProgress}
                  </p>
                </div>

                <Clock3
                  size={25}
                  className="text-slate-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    مصعدة
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {statistics.escalated}
                  </p>
                </div>

                <MessageSquareWarning
                  size={25}
                  className="text-slate-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    تم الحل
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {statistics.resolved}
                  </p>
                </div>

                <CheckCircle2
                  size={25}
                  className="text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-7 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search
                  size={19}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  placeholder="ابحث في الشكاوى..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 outline-none focus:border-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="all">
                  كل الحالات
                </option>

                {Object.entries(statusLabels).map(
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

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="all">
                  كل الأولويات
                </option>

                {Object.entries(
                  priorityLabels
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-7 rounded-2xl border bg-white p-14 text-center">
              <RefreshCw
                size={32}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-4 text-slate-500">
                جاري تحميل الشكاوى...
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={23}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <h2 className="font-bold">
                    حدث خطأ
                  </h2>

                  <p className="mt-1 text-sm">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading &&
            !error &&
            filteredComplaints.length === 0 && (
              <div className="mt-7 rounded-2xl border bg-white p-14 text-center">
                <MessageSquareWarning
                  size={48}
                  className="mx-auto text-slate-300"
                />

                <h2 className="mt-4 text-lg font-bold">
                  لا توجد شكاوى أو بلاغات
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  لم يتم العثور على بيانات مطابقة للبحث أو الفلاتر الحالية.
                </p>
              </div>
            )}

          {/* Complaints */}
          {!loading &&
            !error &&
            filteredComplaints.length > 0 && (
              <div className="mt-7 space-y-4">
                {filteredComplaints.map(
                  (complaint) => (
                    <button
                      type="button"
                      key={complaint.id}
                      onClick={() =>
                        openComplaint(complaint)
                      }
                      className="w-full rounded-2xl border bg-white p-6 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                complaint.status
                              )}`}
                            >
                              {statusLabels[
                                complaint.status
                              ] ||
                                complaint.status}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                                complaint.priority
                              )}`}
                            >
                              {priorityLabels[
                                complaint.priority
                              ] ||
                                complaint.priority}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {complaintTypes[
                                complaint.complaint_type
                              ] ||
                                complaint.complaint_type}
                            </span>
                          </div>

                          <h2 className="mt-3 text-lg font-bold text-slate-900">
                            {complaint.title}
                          </h2>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {complaint.description}
                          </p>
                        </div>

                        <div className="min-w-[220px] space-y-3 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Building2
                              size={17}
                            />

                            <span>
                              {complaint.institute
                                ?.name ||
                                "المعهد غير محدد"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock3
                              size={17}
                            />

                            <span>
                              {new Date(
                                complaint.created_at
                              ).toLocaleDateString(
                                "ar-EG"
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <UserRound
                              size={17}
                            />

                            <span>
                              {complaint.source ===
                              "parent"
                                ? "شكوى ولي أمر"
                                : "بلاغ من المعهد"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
        </div>

        {/* New Complaint Modal */}
        {showNewComplaint && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">
                    تقديم شكوى أو بلاغ
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    سيتم ربط الشكوى بالمعهد المرتبط بالحساب تلقائيًا.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowNewComplaint(false)
                  }
                  className="rounded-xl p-2 hover:bg-slate-100"
                >
                  <X size={21} />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    عنوان الشكوى
                  </label>

                  <input
                    value={newTitle}
                    onChange={(e) =>
                      setNewTitle(e.target.value)
                    }
                    placeholder="اكتب عنوانًا مختصرًا للمشكلة"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    نوع الشكوى
                  </label>

                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    {Object.entries(
                      complaintTypes
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    الأولوية
                  </label>

                  <select
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    {Object.entries(
                      priorityLabels
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    تفاصيل الشكوى
                  </label>

                  <textarea
                    value={newDescription}
                    onChange={(e) =>
                      setNewDescription(
                        e.target.value
                      )
                    }
                    rows={6}
                    placeholder="اكتب تفاصيل المشكلة بالتفصيل..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowNewComplaint(false)
                    }
                    className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={createComplaint}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={18} />
                    )}

                    {saving
                      ? "جاري الإرسال..."
                      : "إرسال الشكوى"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Complaint Details Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">
                    تفاصيل الشكوى
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    متابعة الإجراءات والحالة
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedComplaint(null)
                  }
                  className="rounded-xl p-2 hover:bg-slate-100"
                >
                  <X size={21} />
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        selectedComplaint.status
                      )}`}
                    >
                      {statusLabels[
                        selectedComplaint.status
                      ] ||
                        selectedComplaint.status}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                        selectedComplaint.priority
                      )}`}
                    >
                      {priorityLabels[
                        selectedComplaint.priority
                      ] ||
                        selectedComplaint.priority}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold">
                    {selectedComplaint.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Building2 size={17} />

                    <span>
                      {selectedComplaint.institute
                        ?.name ||
                        "المعهد غير محدد"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <h4 className="font-bold">
                    تفاصيل الشكوى
                  </h4>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {selectedComplaint.description}
                  </p>
                </div>

                {selectedComplaint.institute_response && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <h4 className="font-bold text-blue-900">
                      رد المعهد
                    </h4>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-blue-800">
                      {
                        selectedComplaint.institute_response
                      }
                    </p>
                  </div>
                )}

                {selectedComplaint.director_response && (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
                    <h4 className="font-bold text-purple-900">
                      رد مدير الإدارة
                    </h4>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-purple-800">
                      {
                        selectedComplaint.director_response
                      }
                    </p>
                  </div>
                )}

                {canManageComplaint && (
                  <div className="rounded-2xl border bg-white p-5">
                    <h4 className="font-bold">
                      تحديث الشكوى
                    </h4>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-semibold">
                        الحالة
                      </label>

                      <select
                        value={newStatus}
                        onChange={(e) =>
                          setNewStatus(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                      >
                        {Object.entries(
                          statusLabels
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

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-semibold">
                        الرد أو الإجراء
                      </label>

                      <textarea
                        value={responseText}
                        onChange={(e) =>
                          setResponseText(
                            e.target.value
                          )
                        }
                        rows={5}
                        placeholder="اكتب الإجراء الذي تم اتخاذه أو الرد على الشكوى..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={updateComplaint}
                      disabled={saving}
                      className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2
                          size={18}
                        />
                      )}

                      حفظ التحديث
                    </button>
                  </div>
                )}

                <div className="border-t pt-4 text-xs text-slate-400">
                  تاريخ البلاغ:{" "}
                  {new Date(
                    selectedComplaint.created_at
                  ).toLocaleString("ar-EG")}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
