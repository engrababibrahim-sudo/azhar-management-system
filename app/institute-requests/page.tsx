```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
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
  description: string;
  request_type: RequestType;
  priority: Priority;
  status: RequestStatus;
  due_date: string | null;
  director_response: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  institute?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

const requestTypeOptions: {
  value: RequestType;
  label: string;
}[] = [
  { value: "problem", label: "مشكلة" },
  { value: "need", label: "احتياج" },
  { value: "support", label: "دعم" },
  { value: "approval", label: "طلب اعتماد" },
  { value: "report", label: "بلاغ" },
  { value: "other", label: "أخرى" },
];

const priorityOptions: {
  value: Priority;
  label: string;
}[] = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

const statusOptions: {
  value: RequestStatus;
  label: string;
}[] = [
  { value: "new", label: "جديد" },
  { value: "in_progress", label: "قيد المعالجة" },
  {
    value: "needs_director_action",
    label: "يحتاج تدخل المدير",
  },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isOverdue(request: InstituteRequest) {
  if (!request.due_date) return false;

  if (
    request.status === "resolved" ||
    request.status === "closed"
  ) {
    return false;
  }

  return new Date(request.due_date).getTime() < Date.now();
}

function statusLabel(status: RequestStatus) {
  return (
    statusOptions.find((item) => item.value === status)?.label ??
    status
  );
}

function priorityLabel(priority: Priority) {
  return (
    priorityOptions.find((item) => item.value === priority)?.label ??
    priority
  );
}

function typeLabel(type: RequestType) {
  return (
    requestTypeOptions.find((item) => item.value === type)?.label ??
    type
  );
}

function statusClass(status: RequestStatus) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "in_progress":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "needs_director_action":
      return "bg-red-50 text-red-700 border-red-200";

    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "closed":
      return "bg-slate-100 text-slate-700 border-slate-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function priorityClass(priority: Priority) {
  switch (priority) {
    case "urgent":
      return "bg-red-50 text-red-700 border-red-200";

    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "low":
      return "bg-slate-50 text-slate-600 border-slate-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default function InstituteRequestsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [requests, setRequests] = useState<InstituteRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    RequestStatus | "all"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<
    Priority | "all"
  >("all");
  const [instituteFilter, setInstituteFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<InstituteRequest | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "need" as RequestType,
    priority: "medium" as Priority,
    due_date: "",
  });

  const [directorForm, setDirectorForm] = useState({
    status: "new" as RequestStatus,
    director_response: "",
    due_date: "",
  });

  const isDirector =
    profile?.role === "director" ||
    profile?.role === "super_admin";

  const canCreate =
    profile?.role === "sheikh" ||
    profile?.role === "deputy" ||
    profile?.role === "employee";

  async function loadData(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href =
          "/login?redirect=%2Finstitute-requests";
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, role, full_name, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        alert("تعذر تحميل بيانات المستخدم.");
        return;
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      let instituteQuery = supabase
        .from("institutes")
        .select("id, name, code, directorate_id")
        .order("name");

      if (
        currentProfile.role !== "super_admin" &&
        currentProfile.directorate_id
      ) {
        instituteQuery = instituteQuery.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      }

      const {
        data: institutesData,
        error: institutesError,
      } = await instituteQuery;

      if (institutesError) {
        console.error(
          "Institutes error:",
          institutesError
        );
      }

      setInstitutes((institutesData ?? []) as Institute[]);

      let requestQuery = supabase
        .from("institute_requests")
        .select(
          `
            id,
            directorate_id,
            institute_id,
            created_by,
            title,
            description,
            request_type,
            priority,
            status,
            due_date,
            director_response,
            resolved_at,
            resolved_by,
            created_at,
            updated_at,
            institute:institutes (
              id,
              name,
              code
            )
          `
        )
        .order("created_at", { ascending: false });

      if (
        currentProfile.role === "sheikh" ||
        currentProfile.role === "deputy" ||
        currentProfile.role === "employee"
      ) {
        if (currentProfile.institute_id) {
          requestQuery = requestQuery.eq(
            "institute_id",
            currentProfile.institute_id
          );
        } else {
          setRequests([]);
          return;
        }
      } else if (
        currentProfile.role === "director"
      ) {
        if (currentProfile.directorate_id) {
          requestQuery = requestQuery.eq(
            "directorate_id",
            currentProfile.directorate_id
          );
        } else {
          setRequests([]);
          return;
        }
      }

      const {
        data: requestsData,
        error: requestsError,
      } = await requestQuery;

      if (requestsError) {
        console.error(
          "Requests error:",
          requestsError
        );
        alert(
          `تعذر تحميل الطلبات: ${requestsError.message}`
        );
        return;
      }

      setRequests(
        (requestsData ?? []) as unknown as InstituteRequest[]
      );
    } catch (error) {
      console.error("Load data error:", error);
      alert("حدث خطأ أثناء تحميل البيانات.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRequests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !search ||
        request.title.toLowerCase().includes(search) ||
        request.description.toLowerCase().includes(search) ||
        request.institute?.name
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        request.priority === priorityFilter;

      const matchesInstitute =
        instituteFilter === "all" ||
        request.institute_id === instituteFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesInstitute
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
    priorityFilter,
    instituteFilter,
  ]);

  const stats = useMemo(() => {
    return {
      total: requests.length,

      new: requests.filter(
        (item) => item.status === "new"
      ).length,

      inProgress: requests.filter(
        (item) => item.status === "in_progress"
      ).length,

      needsDirector: requests.filter(
        (item) =>
          item.status === "needs_director_action"
      ).length,

      overdue: requests.filter((item) =>
        isOverdue(item)
      ).length,

      resolved: requests.filter(
        (item) => item.status === "resolved"
      ).length,
    };
  }, [requests]);

  function resetCreateForm() {
    setForm({
      title: "",
      description: "",
      request_type: "need",
      priority: "medium",
      due_date: "",
    });
  }

  function openCreateModal() {
    resetCreateForm();
    setShowCreate(true);
  }

  function closeCreateModal() {
    setShowCreate(false);
    resetCreateForm();
  }

  function openRequest(request: InstituteRequest) {
    setSelectedRequest(request);

    /*
     * مهم:
     * عند فتح الطلب لا نقوم بتحويل "جديد" إلى "قيد المعالجة".
     * يتم عرض الحالة الحالية كما هي تمامًا من قاعدة البيانات.
     */
    setDirectorForm({
      status: request.status,
      director_response:
        request.director_response ?? "",
      due_date: request.due_date ?? "",
    });
  }

  function closeRequest() {
    setSelectedRequest(null);

    setDirectorForm({
      status: "new",
      director_response: "",
      due_date: "",
    });
  }

  async function createRequest() {
    if (!profile) {
      alert("بيانات المستخدم غير متاحة.");
      return;
    }

    if (!canCreate) {
      alert("ليس لديك صلاحية إنشاء طلب.");
      return;
    }

    if (!profile.institute_id) {
      alert(
        "لا يوجد معهد مرتبط بحسابك. يرجى مراجعة مدير النظام."
      );
      return;
    }

    if (!profile.directorate_id) {
      alert(
        "لا توجد إدارة تعليمية مرتبطة بحسابك."
      );
      return;
    }

    if (!form.title.trim()) {
      alert("برجاء كتابة عنوان الطلب.");
      return;
    }

    if (!form.description.trim()) {
      alert("برجاء كتابة تفاصيل الطلب.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("institute_requests")
        .insert({
          directorate_id: profile.directorate_id,
          institute_id: profile.institute_id,
          created_by: profile.id,
          title: form.title.trim(),
          description: form.description.trim(),
          request_type: form.request_type,
          priority: form.priority,
          status: "new",
          due_date: form.due_date || null,
        });

      if (error) {
        console.error("Create request error:", error);
        alert(
          `تعذر إنشاء الطلب:\n${error.message}`
        );
        return;
      }

      alert("تم إرسال الطلب بنجاح ✅");

      closeCreateModal();
      await loadData(true);
    } catch (error) {
      console.error(
        "Create request exception:",
        error
      );
      alert("حدث خطأ أثناء إرسال الطلب.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest() {
    if (!selectedRequest) return;

    if (!isDirector) {
      alert(
        "تعديل حالة الطلب ورد الإدارة متاح لمدير الإدارة فقط."
      );
      return;
    }

    if (
      (directorForm.status === "resolved" ||
        directorForm.status === "closed") &&
      !directorForm.director_response.trim()
    ) {
      alert(
        "برجاء كتابة رد الإدارة قبل تحويل الطلب إلى تم الحل أو مغلق."
      );
      return;
    }

    try {
      setSaving(true);

      const updateData: {
        status: RequestStatus;
        director_response: string | null;
        due_date: string | null;
        updated_at: string;
        resolved_at?: string | null;
        resolved_by?: string | null;
      } = {
        status: directorForm.status,
        director_response:
          directorForm.director_response.trim() || null,
        due_date:
          directorForm.due_date || null,
        updated_at: new Date().toISOString(),
      };

      if (
        directorForm.status === "resolved" ||
        directorForm.status === "closed"
      ) {
        updateData.resolved_at =
          selectedRequest.resolved_at ??
          new Date().toISOString();

        updateData.resolved_by = profile?.id ?? null;
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
      }

      const { error } = await supabase
        .from("institute_requests")
        .update(updateData)
        .eq("id", selectedRequest.id);

      if (error) {
        console.error(
          "Update request error:",
          error
        );

        alert(
          `تعذر حفظ تحديث الطلب:\n${error.message}`
        );

        return;
      }

      alert("تم حفظ تحديث الطلب بنجاح ✅");

      closeRequest();
      await loadData(true);
    } catch (error) {
      console.error(
        "Update request exception:",
        error
      );

      alert("حدث خطأ أثناء حفظ تحديث الطلب.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div
          className="flex min-h-[70vh] items-center justify-center"
          dir="rtl"
        >
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>جاري تحميل طلبات المعاهد...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="space-y-6 pb-10"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              <span>طلبات المعاهد</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              طلبات المعاهد
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              قناة مباشرة ومنظمة بين المعاهد ومدير الإدارة
              للطلبات والمشكلات والاحتياجات والمتابعة حتى
              الحل والإغلاق.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              تحديث
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                طلب جديد
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="إجمالي الطلبات"
            value={stats.total}
          />

          <StatCard
            icon={<Bell className="h-5 w-5" />}
            label="جديدة"
            value={stats.new}
          />

          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="قيد المعالجة"
            value={stats.inProgress}
          />

          <StatCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="تحتاج تدخل المدير"
            value={stats.needsDirector}
          />

          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="متأخرة"
            value={stats.overdue}
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="تم الحل"
            value={stats.resolved}
          />
        </div>

        {/* Director warning */}
        {isDirector && stats.needsDirector > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <div className="font-semibold">
                توجد طلبات تحتاج تدخل المدير
              </div>

              <div className="mt-1 text-sm leading-6">
                يوجد {stats.needsDirector} طلب
                {stats.needsDirector === 1
                  ? ""
                  : "ات"} بحاجة إلى مراجعتك واتخاذ إجراء.
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="h-4 w-4" />
            تصفية الطلبات
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="بحث في الطلبات..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | RequestStatus
                    | "all"
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                كل الحالات
              </option>

              {statusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value as
                    | Priority
                    | "all"
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                كل الأولويات
              </option>

              {priorityOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            {isDirector ? (
              <select
                value={instituteFilter}
                onChange={(e) =>
                  setInstituteFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="all">
                  كل المعاهد
                </option>

                {institutes.map((institute) => (
                  <option
                    key={institute.id}
                    value={institute.id}
                  >
                    {institute.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                طلبات المعهد الحالي فقط
              </div>
            )}
          </div>
        </div>

        {/* Requests */}
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <FileText className="h-7 w-7 text-slate-400" />
            </div>

            <h3 className="font-semibold text-slate-800">
              لا توجد طلبات
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              لا توجد طلبات مطابقة للفلاتر الحالية.
            </p>

            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                إنشاء طلب جديد
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">
                        {request.title}
                      </h2>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass(
                          request.priority
                        )}`}
                      >
                        {priorityLabel(
                          request.priority
                        )}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                          request.status
                        )}`}
                      >
                        {statusLabel(
                          request.status
                        )}
                      </span>

                      {isOverdue(request) && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          متأخر
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {request.institute?.name ??
                          "—"}
                      </span>

                      <span>
                        النوع:{" "}
                        {typeLabel(
                          request.request_type
                        )}
                      </span>

                      <span>
                        إنشاء:{" "}
                        {formatDateTime(
                          request.created_at
                        )}
                      </span>

                      <span>
                        آخر تحديث:{" "}
                        {formatDateTime(
                          request.updated_at
                        )}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                      {request.description}
                    </p>

                    {request.director_response && (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                          <MessageSquare className="h-3.5 w-3.5" />
                          رد الإدارة
                        </div>

                        <p className="text-sm leading-6 text-emerald-900">
                          {request.director_response}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openRequest(request)
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    عرض الطلب
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    إنشاء طلب جديد
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    سيتم إرسال الطلب مباشرة إلى مدير
                    الإدارة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    عنوان الطلب
                  </label>

                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="مثال: طلب حبر للطابعة"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تفاصيل الطلب
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description:
                          e.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="اكتب تفاصيل الطلب أو المشكلة..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      نوع الطلب
                    </label>

                    <select
                      value={form.request_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          request_type:
                            e.target
                              .value as RequestType,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      {requestTypeOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      الأولوية
                    </label>

                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          priority:
                            e.target
                              .value as Priority,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      {priorityOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      تاريخ الاستحقاق
                    </label>

                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          due_date:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={createRequest}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    إرسال الطلب
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                        selectedRequest.status
                      )}`}
                    >
                      {statusLabel(
                        selectedRequest.status
                      )}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass(
                        selectedRequest.priority
                      )}`}
                    >
                      {priorityLabel(
                        selectedRequest.priority
                      )}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRequest.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {selectedRequest.institute?.name ??
                      "—"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRequest}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-5">
                {/* Request info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoItem
                    label="نوع الطلب"
                    value={typeLabel(
                      selectedRequest.request_type
                    )}
                  />

                  <InfoItem
                    label="تاريخ الإنشاء"
                    value={formatDateTime(
                      selectedRequest.created_at
                    )}
                  />

                  <InfoItem
                    label="آخر تحديث"
                    value={formatDateTime(
                      selectedRequest.updated_at
                    )}
                  />

                  <InfoItem
                    label="تاريخ الاستحقاق"
                    value={formatDate(
                      selectedRequest.due_date
                    )}
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-800">
                    تفاصيل الطلب
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {selectedRequest.description}
                  </div>
                </div>

                {/* Existing response */}
                {selectedRequest.director_response && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <MessageSquare className="h-4 w-4" />
                      رد الإدارة الحالي
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                      {
                        selectedRequest.director_response
                      }
                    </div>
                  </div>
                )}

                {/* Director controls */}
                {isDirector ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-5">
                      <h3 className="font-bold text-slate-900">
                        متابعة المدير
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        يمكنك تحديث حالة الطلب والرد
                        وتاريخ الاستحقاق.
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          حالة الطلب
                        </label>

                        <select
                          value={
                            directorForm.status
                          }
                          onChange={(e) =>
                            setDirectorForm(
                              (prev) => ({
                                ...prev,
                                status:
                                  e.target
                                    .value as RequestStatus,
                              })
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                        >
                          {statusOptions.map(
                            (option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          تاريخ الاستحقاق
                        </label>

                        <input
                          type="date"
                          value={
                            directorForm.due_date
                          }
                          onChange={(e) =>
                            setDirectorForm(
                              (prev) => ({
                                ...prev,
                                due_date:
                                  e.target.value,
                              })
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          رد الإدارة
                        </label>

                        <textarea
                          value={
                            directorForm.director_response
                          }
                          onChange={(e) =>
                            setDirectorForm(
                              (prev) => ({
                                ...prev,
                                director_response:
                                  e.target.value,
                              })
                            )
                          }
                          rows={5}
                          placeholder="اكتب رد الإدارة أو الإجراء الذي تم اتخاذه..."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <button
                          type="button"
                          onClick={closeRequest}
                          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          إغلاق
                        </button>

                        <button
                          type="button"
                          onClick={updateRequest}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}

                          حفظ تحديث الطلب
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                      <div>
                        <div className="font-semibold text-blue-900">
                          متابعة الطلب
                        </div>

                        <p className="mt-1 text-sm leading-6 text-blue-800">
                          يمكنك متابعة حالة الطلب ورد
                          الإدارة من هذه الصفحة. تعديل القرار
                          الإداري متاح لمدير الإدارة فقط.
                        </p>
                      </div>
                    </div>
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>

      <div className="text-2xl font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {label}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
```
