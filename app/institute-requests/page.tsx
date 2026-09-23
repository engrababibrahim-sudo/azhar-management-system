"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
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
  role: Role;
  full_name?: string | null;
  institute_id?: string | null;
  directorate_id?: string | null;
};

type Institute = {
  id: string;
  name: string;
  code?: string | null;
  directorate_id?: string | null;
};

type RequestType =
  | "problem"
  | "need"
  | "support"
  | "approval"
  | "report"
  | "other";

type Priority = "low" | "medium" | "high" | "urgent";

type RequestStatus =
  | "new"
  | "in_progress"
  | "needs_director_action"
  | "resolved"
  | "closed";

type InstituteRequest = {
  id: string;
  directorate_id: string;
  institute_id: string;
  created_by: string;
  title: string;
  description: string | null;
  request_type: RequestType;
  priority: Priority;
  status: RequestStatus;
  due_date: string | null;
  director_response: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  institute?: { name: string; code?: string | null } | null;
};

const typeOptions: { value: RequestType; label: string }[] = [
  { value: "problem", label: "مشكلة" },
  { value: "need", label: "احتياج" },
  { value: "support", label: "طلب دعم" },
  { value: "approval", label: "طلب موافقة" },
  { value: "report", label: "بلاغ" },
  { value: "other", label: "أخرى" },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

const statusOptions: { value: RequestStatus; label: string }[] = [
  { value: "new", label: "جديد" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "needs_director_action", label: "يحتاج تدخل المدير" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

const requestTypeLabels = Object.fromEntries(
  typeOptions.map((item) => [item.value, item.label])
) as Record<RequestType, string>;

const priorityLabels = Object.fromEntries(
  priorityOptions.map((item) => [item.value, item.label])
) as Record<Priority, string>;

const statusLabels = Object.fromEntries(
  statusOptions.map((item) => [item.value, item.label])
) as Record<RequestStatus, string>;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isOverdue(request: InstituteRequest) {
  if (!request.due_date || request.status === "resolved" || request.status === "closed") {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${request.due_date}T00:00:00`) < today;
}

function statusClass(status: RequestStatus) {
  if (status === "new") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "needs_director_action") return "bg-red-50 text-red-700 border-red-200";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function priorityClass(priority: Priority) {
  if (priority === "urgent") return "bg-red-50 text-red-700 border-red-200";
  if (priority === "high") return "bg-orange-50 text-orange-700 border-orange-200";
  if (priority === "medium") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function InstituteRequestsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [requests, setRequests] = useState<InstituteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [instituteFilter, setInstituteFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InstituteRequest | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "problem" as RequestType,
    priority: "medium" as Priority,
    due_date: "",
  });

  const [directorForm, setDirectorForm] = useState({
    status: "in_progress" as RequestStatus,
    director_response: "",
    due_date: "",
  });

  const isDirector = profile?.role === "director" || profile?.role === "super_admin";
  const canCreate =
    profile?.role === "sheikh" ||
    profile?.role === "deputy" ||
    profile?.role === "employee";

  async function loadData(showSpinner = false) {
    if (showSpinner) setRefreshing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login?redirect=%2Finstitute-requests";
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, full_name, institute_id, directorate_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData as Profile);

      let instituteQuery = supabase
        .from("institutes")
        .select("id, name, code, directorate_id")
        .order("name");

      if (profileData.role !== "super_admin") {
        if (!profileData.directorate_id) {
          setInstitutes([]);
        } else {
          instituteQuery = instituteQuery.eq(
            "directorate_id",
            profileData.directorate_id
          );
          const { data: instituteData, error: instituteError } =
            await instituteQuery;
          if (instituteError) throw instituteError;
          setInstitutes((instituteData ?? []) as Institute[]);
        }
      } else {
        const { data: instituteData, error: instituteError } =
          await instituteQuery;
        if (instituteError) throw instituteError;
        setInstitutes((instituteData ?? []) as Institute[]);
      }

      let requestQuery = supabase
        .from("institute_requests")
        .select(
          "id, directorate_id, institute_id, created_by, title, description, request_type, priority, status, due_date, director_response, resolved_at, resolved_by, created_at, updated_at, institute:institutes(name, code)"
        )
        .order("created_at", { ascending: false });

      if (
        profileData.role === "sheikh" ||
        profileData.role === "deputy" ||
        profileData.role === "employee"
      ) {
        if (!profileData.institute_id) {
          setRequests([]);
        } else {
          requestQuery = requestQuery.eq("institute_id", profileData.institute_id);
          const { data: requestData, error: requestError } =
            await requestQuery;
          if (requestError) throw requestError;
          setRequests((requestData ?? []) as unknown as InstituteRequest[]);
        }
      } else if (
        profileData.role === "director" ||
        profileData.role === "super_admin"
      ) {
        if (profileData.role === "director" && profileData.directorate_id) {
          requestQuery = requestQuery.eq(
            "directorate_id",
            profileData.directorate_id
          );
        }
        const { data: requestData, error: requestError } =
          await requestQuery;
        if (requestError) throw requestError;
        setRequests((requestData ?? []) as unknown as InstituteRequest[]);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error("loadInstituteRequests:", error);
      alert(error?.message ?? "حدث خطأ أثناء تحميل طلبات المعاهد.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !normalized ||
        request.title.toLowerCase().includes(normalized) ||
        (request.description ?? "").toLowerCase().includes(normalized) ||
        (request.institute?.name ?? "").toLowerCase().includes(normalized);

      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || request.priority === priorityFilter;

      const matchesInstitute =
        instituteFilter === "all" || request.institute_id === instituteFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesInstitute;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter, instituteFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      new: requests.filter((item) => item.status === "new").length,
      inProgress: requests.filter((item) => item.status === "in_progress").length,
      needsAction: requests.filter(
        (item) => item.status === "needs_director_action"
      ).length,
      overdue: requests.filter(isOverdue).length,
      resolved: requests.filter((item) => item.status === "resolved").length,
    };
  }, [requests]);

  function openRequest(request: InstituteRequest) {
    setSelectedRequest(request);
    setDirectorForm({
      status:
        request.status === "new"
          ? "in_progress"
          : request.status,
      director_response: request.director_response ?? "",
      due_date: request.due_date ?? "",
    });
  }

  async function createRequest() {
    if (!profile?.institute_id || !profile.directorate_id) {
      alert("لم يتم العثور على بيانات المعهد أو الإدارة الخاصة بالحساب.");
      return;
    }

    if (!form.title.trim()) {
      alert("اكتبي عنوان الطلب أولًا.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("institute_requests").insert({
        directorate_id: profile.directorate_id,
        institute_id: profile.institute_id,
        created_by: profile.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        request_type: form.request_type,
        priority: form.priority,
        status: "new",
        due_date: form.due_date || null,
      });

      if (error) throw error;

      alert("تم إرسال الطلب إلى مدير الإدارة بنجاح ✅");

      setForm({
        title: "",
        description: "",
        request_type: "problem",
        priority: "medium",
        due_date: "",
      });
      setShowCreate(false);
      await loadData();
    } catch (error: any) {
      console.error("createInstituteRequest:", error);
      alert(error?.message ?? "حدث خطأ أثناء إرسال الطلب.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest() {
    if (!selectedRequest || !isDirector) return;

    if (
      (directorForm.status === "resolved" ||
        directorForm.status === "closed") &&
      !directorForm.director_response.trim()
    ) {
      alert("اكتب رد المدير قبل تحويل الطلب إلى تم الحل أو مغلق.");
      return;
    }

    setSaving(true);

    try {
      const updates: Record<string, unknown> = {
        status: directorForm.status,
        director_response: directorForm.director_response.trim() || null,
        due_date: directorForm.due_date || null,
        updated_at: new Date().toISOString(),
      };

      if (
        directorForm.status === "resolved" ||
        directorForm.status === "closed"
      ) {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = profile?.id ?? null;
      } else {
        updates.resolved_at = null;
        updates.resolved_by = null;
      }

      const { error } = await supabase
        .from("institute_requests")
        .update(updates)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      alert(
        directorForm.status === "closed"
          ? "تم إغلاق الطلب بنجاح ✅"
          : "تم تحديث الطلب بنجاح ✅"
      );

      setSelectedRequest(null);
      await loadData();
    } catch (error: any) {
      console.error("updateInstituteRequest:", error);
      alert(error?.message ?? "حدث خطأ أثناء تحديث الطلب.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
              <MessageSquare size={18} />
              الإدارة والمتابعة
            </div>
            <h1 className="text-3xl font-black text-slate-900">
              طلبات المعاهد
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              قناة مباشرة ومنظمة بين المعاهد ومدير الإدارة للطلبات والمشكلات
              والاحتياجات والمتابعة حتى الحل والإغلاق.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
              تحديث
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus size={18} />
                طلب جديد
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "إجمالي الطلبات", value: stats.total },
            { label: "جديدة", value: stats.new },
            { label: "قيد المعالجة", value: stats.inProgress },
            { label: "تحتاج تدخل المدير", value: stats.needsAction },
            { label: "متأخرة", value: stats.overdue },
            { label: "تم الحل", value: stats.resolved },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-xs font-semibold text-slate-500">
                {item.label}
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Filter size={19} />
            البحث والتصفية
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث في الطلبات..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-3 pr-10 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | RequestStatus
                )
              }
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
            >
              <option value="all">كل الحالات</option>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as "all" | Priority
                )
              }
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
            >
              <option value="all">كل الأولويات</option>
              {priorityOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {isDirector ? (
              <select
                value={instituteFilter}
                onChange={(event) => setInstituteFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
              >
                <option value="all">كل المعاهد</option>
                {institutes.map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                <Clock3 size={17} className="ml-2" />
                طلبات المعهد الحالي فقط
              </div>
            )}
          </div>
        </div>

        {isDirector && stats.needsAction > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-red-600" size={21} />
              <div>
                <h2 className="font-black text-red-800">
                  يحتاج تدخلك الآن
                </h2>
                <p className="mt-1 text-sm leading-6 text-red-700">
                  يوجد {stats.needsAction} طلب يحتاج قرارًا أو تدخلًا مباشرًا
                  من الإدارة.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">
              {isDirector ? "طلبات المعاهد" : "طلبات معهدك"}
            </h2>
            <span className="text-sm font-semibold text-slate-500">
              عرض {filteredRequests.length} من {requests.length} طلب
            </span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <MessageSquare
                size={38}
                className="mx-auto text-slate-300"
              />
              <h3 className="mt-4 font-black text-slate-700">
                لا توجد طلبات
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {canCreate
                  ? "يمكنك إنشاء أول طلب للمدير من زر «طلب جديد»."
                  : "لا توجد طلبات مطابقة للفلاتر الحالية."}
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => openRequest(request)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">
                        {request.title}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityClass(
                          request.priority
                        )}`}
                      >
                        {priorityLabels[request.priority]}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                          request.status
                        )}`}
                      >
                        {statusLabels[request.status]}
                      </span>

                      {isOverdue(request) && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                          متأخر
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        النوع: {requestTypeLabels[request.request_type]}
                      </span>
                      <span>
                        المعهد: {request.institute?.name ?? "—"}
                      </span>
                      <span>
                        الإنشاء: {formatDateTime(request.created_at)}
                      </span>
                      {request.due_date && (
                        <span>
                          المتابعة: {formatDate(request.due_date)}
                        </span>
                      )}
                    </div>

                    {request.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {request.description}
                      </p>
                    )}

                    {request.director_response && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                        <span className="font-bold text-slate-900">
                          رد الإدارة:
                        </span>{" "}
                        {request.director_response}
                      </div>
                    )}
                  </div>

                  <div className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">
                    <Eye size={17} />
                    عرض الطلب
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    إنشاء طلب جديد
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    سيصل الطلب مباشرة إلى مدير الإدارة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    عنوان الطلب
                  </label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="مثال: طلب صيانة جهاز كمبيوتر"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    تفاصيل الطلب
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="اكتب التفاصيل التي يحتاجها المدير لفهم الطلب واتخاذ الإجراء..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      نوع الطلب
                    </label>
                    <select
                      value={form.request_type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          request_type: event.target.value as RequestType,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                    >
                      {typeOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      الأولوية
                    </label>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priority: event.target.value as Priority,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                    >
                      {priorityOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      موعد المتابعة
                    </label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          due_date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={createRequest}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    إرسال الطلب
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityClass(
                        selectedRequest.priority
                      )}`}
                    >
                      {priorityLabels[selectedRequest.priority]}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                        selectedRequest.status
                      )}`}
                    >
                      {statusLabels[selectedRequest.status]}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedRequest.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedRequest.institute?.name ?? "المعهد"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  <div>
                    <span className="font-bold">نوع الطلب:</span>{" "}
                    {requestTypeLabels[selectedRequest.request_type]}
                  </div>
                  <div>
                    <span className="font-bold">تاريخ الإنشاء:</span>{" "}
                    {formatDateTime(selectedRequest.created_at)}
                  </div>
                  <div>
                    <span className="font-bold">آخر تحديث:</span>{" "}
                    {formatDateTime(selectedRequest.updated_at)}
                  </div>
                  {selectedRequest.due_date && (
                    <div>
                      <span className="font-bold">موعد المتابعة:</span>{" "}
                      {formatDate(selectedRequest.due_date)}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 font-black text-slate-800">
                    تفاصيل الطلب
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                    {selectedRequest.description || "لا توجد تفاصيل إضافية."}
                  </div>
                </div>

                {selectedRequest.director_response && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h3 className="font-black text-blue-900">رد الإدارة</h3>
                    <p className="mt-2 text-sm leading-7 text-blue-800">
                      {selectedRequest.director_response}
                    </p>
                  </div>
                )}

                {isDirector ? (
                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    <h3 className="text-lg font-black text-slate-900">
                      متابعة المدير
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          الحالة
                        </label>
                        <select
                          value={directorForm.status}
                          onChange={(event) =>
                            setDirectorForm((current) => ({
                              ...current,
                              status: event.target.value as RequestStatus,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                        >
                          {statusOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          موعد المتابعة
                        </label>
                        <input
                          type="date"
                          value={directorForm.due_date}
                          onChange={(event) =>
                            setDirectorForm((current) => ({
                              ...current,
                              due_date: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        رد المدير
                      </label>
                      <textarea
                        value={directorForm.director_response}
                        onChange={(event) =>
                          setDirectorForm((current) => ({
                            ...current,
                            director_response: event.target.value,
                          }))
                        }
                        rows={5}
                        placeholder="اكتب الإجراء أو الرد أو المطلوب من المعهد..."
                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={updateRequest}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Check size={18} />
                      )}
                      حفظ تحديث الطلب
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    يمكنك متابعة حالة الطلب ورد الإدارة من هذه الصفحة. تعديل
                    القرار الإداري متاح لمدير الإدارة فقط.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
