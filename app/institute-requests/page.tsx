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
  { value: "report", label: "تقرير" },
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
    label: "تحتاج تدخل المدير",
  },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${request.due_date}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  return due < today;
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
      return "bg-slate-50 text-slate-700 border-slate-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
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

  const [instituteFilter, setInstituteFilter] =
    useState("all");

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
      } = await supabase.auth.getUser();

      if (!user) {
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
        console.error(profileError);
        alert("تعذر تحميل بيانات المستخدم.");
        return;
      }

      const currentProfile = profileData as Profile;

      setProfile(currentProfile);

      let institutesQuery = supabase
        .from("institutes")
        .select("id, name, code, directorate_id")
        .order("name");

      if (
        currentProfile.role !== "super_admin" &&
        currentProfile.directorate_id
      ) {
        institutesQuery = institutesQuery.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      }

      const {
        data: institutesData,
        error: institutesError,
      } = await institutesQuery;

      if (institutesError) {
        console.error(institutesError);
      }

      setInstitutes(
        (institutesData ?? []) as Institute[]
      );

      let requestQuery = supabase
        .from("institute_requests")
        .select(`
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
        `)
        .order("created_at", {
          ascending: false,
        });

      if (
        currentProfile.role === "sheikh" ||
        currentProfile.role === "deputy" ||
        currentProfile.role === "employee"
      ) {
        if (!currentProfile.institute_id) {
          setRequests([]);
          return;
        }

        requestQuery = requestQuery.eq(
          "institute_id",
          currentProfile.institute_id
        );
      } else if (
        currentProfile.role === "director" &&
        currentProfile.directorate_id
      ) {
        requestQuery = requestQuery.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      }

      const {
        data: requestsData,
        error: requestsError,
      } = await requestQuery;

      if (requestsError) {
        console.error(requestsError);
        alert(
          "تعذر تحميل طلبات المعاهد: " +
            requestsError.message
        );
        return;
      }

      setRequests(
        (requestsData ?? []) as InstituteRequest[]
      );
    } catch (error) {
      console.error(error);
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
        request.description
          .toLowerCase()
          .includes(search) ||
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
        (request) => request.status === "new"
      ).length,

      inProgress: requests.filter(
        (request) => request.status === "in_progress"
      ).length,

      needsDirector: requests.filter(
        (request) =>
          request.status === "needs_director_action"
      ).length,

      overdue: requests.filter((request) =>
        isOverdue(request)
      ).length,

      resolved: requests.filter(
        (request) =>
          request.status === "resolved" ||
          request.status === "closed"
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

  function closeCreateModal() {
    setShowCreate(false);
    resetCreateForm();
  }

  function openRequest(request: InstituteRequest) {
    /*
      مهم جدًا:
      فتح الطلب لا يغير حالته.
      نقرأ الحالة الحالية من الطلب نفسه.
    */
    setSelectedRequest(request);

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
    if (!canCreate) {
      alert(
        "ليس لديك صلاحية لإنشاء طلب جديد."
      );
      return;
    }

    if (!profile?.institute_id) {
      alert(
        "لا يوجد معهد مرتبط بحساب المستخدم."
      );
      return;
    }

    if (!profile?.directorate_id) {
      alert(
        "لا توجد إدارة تعليمية مرتبطة بحساب المستخدم."
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
          directorate_id:
            profile.directorate_id,

          institute_id:
            profile.institute_id,

          created_by: profile.id,

          title: form.title.trim(),

          description:
            form.description.trim(),

          request_type:
            form.request_type,

          priority:
            form.priority,

          status: "new",

          due_date:
            form.due_date || null,
        });

      if (error) {
        console.error(error);

        alert(
          "تعذر إنشاء الطلب: " +
            error.message
        );

        return;
      }

      alert(
        "تم إرسال الطلب إلى مدير الإدارة بنجاح ✅"
      );

      closeCreateModal();

      await loadData(true);
    } catch (error) {
      console.error(error);
      alert(
        "حدث خطأ أثناء إنشاء الطلب."
      );
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

    const newStatus =
      directorForm.status;

    const newResponse =
      directorForm.director_response.trim() ||
      null;

    const newDueDate =
      directorForm.due_date || null;

    if (
      (newStatus === "resolved" ||
        newStatus === "closed") &&
      !newResponse
    ) {
      alert(
        "برجاء كتابة رد الإدارة قبل تحويل الطلب إلى تم الحل أو مغلق."
      );
      return;
    }

    /*
      تحديد بيانات الحل فقط عند الانتقال
      فعليًا إلى حالة تم الحل / مغلق.
    */
    const isNowResolved =
      newStatus === "resolved" ||
      newStatus === "closed";

    const wasResolved =
      selectedRequest.status === "resolved" ||
      selectedRequest.status === "closed";

    const newResolvedAt = isNowResolved
      ? wasResolved
        ? selectedRequest.resolved_at
        : new Date().toISOString()
      : null;

    const newResolvedBy = isNowResolved
      ? wasResolved
        ? selectedRequest.resolved_by
        : profile?.id ?? null
      : null;

    /*
      أهم إصلاح:
      لا نرسل UPDATE إلى Supabase
      إذا لم يتغير أي شيء.
      
      هذا يمنع إنشاء سجلات متابعة وهمية
      عند الضغط على حفظ بدون تعديل.
    */
    const hasChanges =
      newStatus !== selectedRequest.status ||
      newResponse !==
        selectedRequest.director_response ||
      newDueDate !== selectedRequest.due_date ||
      newResolvedAt !==
        selectedRequest.resolved_at ||
      newResolvedBy !==
        selectedRequest.resolved_by;

    if (!hasChanges) {
      alert(
        "لا توجد تغييرات جديدة لحفظها."
      );
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        status: newStatus,

        director_response:
          newResponse,

        due_date:
          newDueDate,

        updated_at:
          new Date().toISOString(),

        resolved_at:
          newResolvedAt,

        resolved_by:
          newResolvedBy,
      };

      const { error } = await supabase
        .from("institute_requests")
        .update(updateData)
        .eq(
          "id",
          selectedRequest.id
        );

      if (error) {
        console.error(error);

        alert(
          "تعذر تحديث الطلب: " +
            error.message
        );

        return;
      }

      alert(
        "تم حفظ تحديث الطلب بنجاح ✅"
      );

      closeRequest();

      await loadData(true);
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء تحديث الطلب."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50"
      >
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Bell className="h-4 w-4" />

                <span>
                  منصة الإدارة والمتابعة المركزية
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                طلبات المعاهد
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                قناة مباشرة ومنظمة بين المعاهد
                ومدير الإدارة للطلبات والمشكلات
                والاحتياجات والمتابعة حتى الحل والإغلاق.
              </p>

              {profile && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                    {isDirector
                      ? "مدير الإدارة التعليمية الأزهرية"
                      : profile.role === "sheikh"
                      ? "شيخ المعهد"
                      : "مستخدم المعهد"}
                  </span>
                </div>
              )}
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
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                تحديث
              </button>

              {canCreate && (
                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />

                  طلب جديد
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

            <StatCard
              title="إجمالي الطلبات"
              value={stats.total}
              icon={
                <FileText className="h-5 w-5" />
              }
            />

            <StatCard
              title="جديدة"
              value={stats.new}
              icon={
                <Bell className="h-5 w-5" />
              }
            />

            <StatCard
              title="قيد المعالجة"
              value={stats.inProgress}
              icon={
                <Clock3 className="h-5 w-5" />
              }
            />

            <StatCard
              title="تحتاج تدخل المدير"
              value={stats.needsDirector}
              icon={
                <AlertCircle className="h-5 w-5" />
              }
            />

            <StatCard
              title="متأخرة"
              value={stats.overdue}
              icon={
                <CalendarDays className="h-5 w-5" />
              }
            />

            <StatCard
              title="تم الحل"
              value={stats.resolved}
              icon={
                <CheckCircle2 className="h-5 w-5" />
              }
            />
          </div>

          {isDirector &&
            stats.needsDirector > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="font-semibold">
                    توجد طلبات تحتاج تدخل المدير
                  </p>

                  <p className="mt-1 text-sm">
                    يوجد حاليًا{" "}
                    {stats.needsDirector}{" "}
                    طلب يحتاج إلى إجراء من الإدارة.
                  </p>
                </div>
              </div>
            )}

          {/* Filters */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />

              <h2 className="font-semibold text-slate-900">
                البحث والتصفية
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="بحث في الطلبات..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | RequestStatus
                      | "all"
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="all">
                  كل الحالات
                </option>

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

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value as
                      | Priority
                      | "all"
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="all">
                  كل الأولويات
                </option>

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

              {isDirector ? (
                <select
                  value={instituteFilter}
                  onChange={(event) =>
                    setInstituteFilter(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="all">
                    كل المعاهد
                  </option>

                  {institutes.map(
                    (institute) => (
                      <option
                        key={institute.id}
                        value={institute.id}
                      >
                        {institute.name}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <Building2 className="ml-2 h-4 w-4" />

                  طلبات المعهد الحالي فقط
                </div>
              )}
            </div>
          </div>

          {/* Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">

              <div>
                <h2 className="font-bold text-slate-900">
                  قائمة الطلبات
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  عرض {filteredRequests.length}{" "}
                  من أصل {requests.length} طلب
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />

                  جاري تحميل الطلبات...
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">

                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>

                <h3 className="font-semibold text-slate-800">
                  لا توجد طلبات
                </h3>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  لا توجد طلبات مطابقة للبحث أو
                  الفلاتر الحالية.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {filteredRequests.map(
                  (request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() =>
                        openRequest(request)
                      }
                      className="block w-full p-5 text-right transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="mb-2 flex flex-wrap items-center gap-2">

                            <h3 className="text-base font-bold text-slate-900">
                              {request.title}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                request.status
                              )}`}
                            >
                              {statusLabel(
                                request.status
                              )}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass(
                                request.priority
                              )}`}
                            >
                              {priorityLabel(
                                request.priority
                              )}
                            </span>

                            {isOverdue(
                              request
                            ) && (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                متأخر
                              </span>
                            )}
                          </div>

                          <p className="mb-3 line-clamp-2 text-sm leading-6 text-slate-600">
                            {request.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">

                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="h-4 w-4" />

                              {request.institute
                                ?.name ??
                                "غير محدد"}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <FileText className="h-4 w-4" />

                              {typeLabel(
                                request.request_type
                              )}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4" />

                              {formatDateTime(
                                request.created_at
                              )}
                            </span>

                            {request.due_date && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-4 w-4" />

                                المتابعة:{" "}
                                {formatDate(
                                  request.due_date
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500">
                          التفاصيل

                          <ArrowLeft className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

              <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-5">

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    إنشاء طلب جديد
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    سيتم إرسال الطلب إلى مدير الإدارة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        title:
                          event.target.value,
                      }))
                    }
                    placeholder="مثال: طلب صيانة جهاز كمبيوتر"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      نوع الطلب
                    </label>

                    <select
                      value={
                        form.request_type
                      }
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          request_type:
                            event.target
                              .value as RequestType,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      {requestTypeOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={
                              option.value
                            }
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
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          priority:
                            event.target
                              .value as Priority,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                    >
                      {priorityOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      تاريخ المتابعة
                    </label>

                    <input
                      type="date"
                      value={
                        form.due_date
                      }
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          due_date:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تفاصيل الطلب
                  </label>

                  <textarea
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description:
                          event.target.value,
                      }))
                    }
                    rows={6}
                    placeholder="اكتب تفاصيل المشكلة أو الاحتياج..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5">

                <div className="min-w-0 pr-4">

                  <div className="mb-2 flex flex-wrap items-center gap-2">

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                        selectedRequest.status
                      )}`}
                    >
                      {statusLabel(
                        selectedRequest.status
                      )}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClass(
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

                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="h-4 w-4" />

                    {selectedRequest.institute
                      ?.name ??
                      "غير محدد"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeRequest}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-5">

                {/* Info */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                  <InfoItem
                    icon={
                      <FileText className="h-4 w-4" />
                    }
                    label="نوع الطلب"
                    value={typeLabel(
                      selectedRequest.request_type
                    )}
                  />

                  <InfoItem
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                    label="تاريخ الإنشاء"
                    value={formatDateTime(
                      selectedRequest.created_at
                    )}
                  />

                  <InfoItem
                    icon={
                      <Clock3 className="h-4 w-4" />
                    }
                    label="تاريخ المتابعة"
                    value={formatDate(
                      selectedRequest.due_date
                    )}
                  />
                </div>

                {/* Description */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-500" />

                    <h3 className="font-bold text-slate-900">
                      تفاصيل الطلب
                    </h3>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedRequest.description}
                  </p>
                </div>

                {/* Existing response */}
                {selectedRequest.director_response && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

                    <div className="mb-3 flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="h-5 w-5" />

                      <h3 className="font-bold">
                        رد الإدارة
                      </h3>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-emerald-900">
                      {
                        selectedRequest.director_response
                      }
                    </p>
                  </div>
                )}

                {/* Director controls */}
                {isDirector ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="mb-5">

                      <h3 className="text-lg font-bold text-slate-900">
                        متابعة الطلب
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        يمكنك تحديث حالة الطلب ورد الإدارة
                        وتاريخ المتابعة.
                      </p>
                    </div>

                    <div className="space-y-5">

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            حالة الطلب
                          </label>

                          <select
                            value={
                              directorForm.status
                            }
                            onChange={(event) =>
                              setDirectorForm(
                                (prev) => ({
                                  ...prev,
                                  status:
                                    event.target
                                      .value as RequestStatus,
                                })
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          >
                            {statusOptions.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            تاريخ المتابعة
                          </label>

                          <input
                            type="date"
                            value={
                              directorForm.due_date
                            }
                            onChange={(event) =>
                              setDirectorForm(
                                (prev) => ({
                                  ...prev,
                                  due_date:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          رد الإدارة
                        </label>

                        <textarea
                          value={
                            directorForm.director_response
                          }
                          onChange={(event) =>
                            setDirectorForm(
                              (prev) => ({
                                ...prev,
                                director_response:
                                  event.target
                                    .value,
                              })
                            )
                          }
                          rows={5}
                          placeholder="اكتب رد الإدارة أو الإجراء الذي تم اتخاذه..."
                          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                      </div>

                      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                        <button
                          type="button"
                          onClick={closeRequest}
                          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          إغلاق
                        </button>

                        <button
                          type="button"
                          onClick={updateRequest}
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}

                          حفظ التحديث
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

                    <div className="flex items-start gap-3">

                      <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                      <div>
                        <h3 className="font-bold text-blue-900">
                          متابعة الطلب
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-blue-800">
                          يتم متابعة الطلب من خلال
                          إدارة المعهد ومدير الإدارة
                          التعليمية.
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
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="mb-3 flex items-center justify-between">

        <span className="text-sm font-medium text-slate-500">
          {title}
        </span>

        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          {icon}
        </div>
      </div>

      <div className="text-2xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}

        {label}
      </div>

      <div className="text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
