"use client";

import { createPortal } from "react-dom";
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
  | "it_admin"
  | "employee"
  | "sheikh"
  | "institute_deputy"
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
  { value: "approval", label: "طلب موافقة" },
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
    label: "تحتاج تدخل المدير",
  },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "غير محدد";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
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
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "in_progress":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "needs_director_action":
      return "bg-red-50 text-red-700 border border-red-200";
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "closed":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function priorityClass(priority: Priority) {
  switch (priority) {
    case "low":
      return "bg-slate-50 text-slate-600 border border-slate-200";
    case "medium":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "high":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "urgent":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

export default function InstituteRequestsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [requests, setRequests] = useState<InstituteRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [requestedInstituteId, setRequestedInstituteId] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RequestStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] =
    useState<Priority | "all">("all");
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

  const selectedInstitute = useMemo(() => {
    if (!requestedInstituteId) return null;

    return (
      institutes.find(
        (institute) => institute.id === requestedInstituteId
      ) ?? null
    );
  }, [institutes, requestedInstituteId]);

  async function loadData(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      /*
       * مهم جدًا:
       * نقرأ instituteId من الرابط مباشرة في كل عملية تحميل.
       * بهذا الشكل لو انتقل المدير من معهد لمعهد
       * لا نعتمد على state قديمة.
       */
      const urlInstituteId =
        typeof window !== "undefined"
          ? new URLSearchParams(
              window.location.search
            ).get("instituteId")
          : null;

      setRequestedInstituteId(urlInstituteId);

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

      if (profileError || !profileData) {
        console.error(profileError);
        alert("تعذر تحميل بيانات المستخدم.");
        return;
      }

      const currentProfile = profileData as Profile;

      setProfile(currentProfile);

      const currentIsDirector =
        currentProfile.role === "director" ||
        currentProfile.role === "super_admin";

      /*
       * ============================================
       * تحميل المعاهد المسموح بها للمستخدم
       * ============================================
       */

      let institutesQuery = supabase
        .from("institutes")
        .select("id, name, code, directorate_id")
        .order("name");

      if (currentProfile.directorate_id) {
        institutesQuery = institutesQuery.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      }

      if (
        !currentIsDirector &&
        currentProfile.institute_id
      ) {
        institutesQuery = institutesQuery.eq(
          "id",
          currentProfile.institute_id
        );
      }

      const {
        data: institutesData,
        error: institutesError,
      } = await institutesQuery;

      if (institutesError) {
        console.error(institutesError);
        alert("تعذر تحميل بيانات المعاهد.");
        return;
      }

      const availableInstitutes =
        (institutesData ?? []) as Institute[];

      setInstitutes(availableInstitutes);

      /*
       * ============================================
       * تحديد المعهد النهائي
       * ============================================
       *
       * مدير الإدارة:
       *   - بدون instituteId = كل المعاهد
       *   - مع instituteId = المعهد المحدد فقط
       *
       * المستخدم داخل المعهد:
       *   - دائمًا معهده فقط
       *   - نتجاهل أي instituteId في الرابط
       */

      let effectiveInstituteId: string | null = null;

      if (currentIsDirector) {
        if (urlInstituteId) {
          const selectedBelongsToDirectorate =
            availableInstitutes.some(
              (institute) =>
                institute.id === urlInstituteId
            );

          if (selectedBelongsToDirectorate) {
            effectiveInstituteId = urlInstituteId;
          } else {
            alert(
              "المعهد المحدد غير تابع للمديرية الحالية."
            );
            effectiveInstituteId = null;
          }
        }
      } else {
        effectiveInstituteId =
          currentProfile.institute_id ?? null;
      }

      /*
       * ============================================
       * تحميل الطلبات
       * ============================================
       */

      let requestsQuery = supabase
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

      /*
       * مدير الإدارة
       */
      if (currentIsDirector) {
        if (effectiveInstituteId) {
          /*
           * هذه هي أهم نقطة:
           * إذا دخلنا من بطاقة معهد،
           * نستعلم فقط عن هذا المعهد.
           */
          requestsQuery = requestsQuery.eq(
            "institute_id",
            effectiveInstituteId
          );
        } else if (currentProfile.directorate_id) {
          /*
           * الدخول المباشر بدون instituteId:
           * يعرض جميع طلبات معاهد المديرية.
           */
          requestsQuery = requestsQuery.eq(
            "directorate_id",
            currentProfile.directorate_id
          );
        } else {
          /*
           * لا توجد مديرية للمستخدم.
           */
          requestsQuery = requestsQuery.eq(
            "institute_id",
            "00000000-0000-0000-0000-000000000000"
          );
        }
      } else {
        /*
         * المستخدم داخل المعهد:
         * يشاهد معهده فقط.
         */
        if (currentProfile.institute_id) {
          requestsQuery = requestsQuery.eq(
            "institute_id",
            currentProfile.institute_id
          );
        } else {
          requestsQuery = requestsQuery.eq(
            "institute_id",
            "00000000-0000-0000-0000-000000000000"
          );
        }
      }

      const {
        data: requestsData,
        error: requestsError,
      } = await requestsQuery;

      if (requestsError) {
        console.error(requestsError);
        alert("تعذر تحميل طلبات المعاهد.");
        return;
      }

      const normalizedRequests: InstituteRequest[] = (
        requestsData ?? []
      ).map((request: any) => ({
        ...request,
        institute: Array.isArray(request.institute)
          ? request.institute[0] ?? null
          : request.institute ?? null,
      }));

      setRequests(normalizedRequests);

      /*
       * عند الدخول من بطاقة معهد:
       * نثبت فلتر المعهد على نفس المعهد.
       */
      if (effectiveInstituteId) {
        setInstituteFilter(effectiveInstituteId);
      } else {
        setInstituteFilter("all");
      }
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل البيانات.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
   * أول تحميل للصفحة.
   */
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openRequest(request: InstituteRequest) {
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

  function resetCreateForm() {
    setForm({
      title: "",
      description: "",
      request_type: "need",
      priority: "medium",
      due_date: "",
    });
  }

  async function createRequest() {
    if (!canCreate || !profile) return;

    if (!profile.institute_id) {
      alert("لا يوجد معهد مرتبط بحساب المستخدم.");
      return;
    }

    if (!profile.directorate_id) {
      alert("لا توجد مديرية مرتبطة بحساب المستخدم.");
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
        console.error(error);
        alert(`تعذر إنشاء الطلب:\n${error.message}`);
        return;
      }

      alert("تم إرسال الطلب بنجاح ✅");

      resetCreateForm();
      setShowCreate(false);

      await loadData(true);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء إنشاء الطلب.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest() {
    if (!isDirector || !selectedRequest || !profile) {
      return;
    }

    try {
      setSaving(true);

      const newStatus = directorForm.status;

      const newResponse =
        directorForm.director_response.trim() || null;

      const newDueDate =
        directorForm.due_date || null;

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
          : profile.id
        : null;

      const hasChanges =
        newStatus !== selectedRequest.status ||
        newResponse !== selectedRequest.director_response ||
        newDueDate !== selectedRequest.due_date ||
        newResolvedAt !== selectedRequest.resolved_at ||
        newResolvedBy !== selectedRequest.resolved_by;

      if (!hasChanges) {
        alert("لا توجد تغييرات جديدة لحفظها.");
        return;
      }

      const { error } = await supabase
        .from("institute_requests")
        .update({
          status: newStatus,
          director_response: newResponse,
          due_date: newDueDate,
          updated_at: new Date().toISOString(),
          resolved_at: newResolvedAt,
          resolved_by: newResolvedBy,
        })
        .eq("id", selectedRequest.id);

      if (error) {
        console.error(error);
        alert(`تعذر حفظ التحديث:\n${error.message}`);
        return;
      }

      alert("تم حفظ تحديث الطلب بنجاح ✅");

      closeRequest();

      await loadData(true);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ التحديث.");
    } finally {
      setSaving(false);
    }
  }

  const filteredRequests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !search ||
        request.title
          .toLowerCase()
          .includes(search) ||
        request.description
          .toLowerCase()
          .includes(search) ||
        (request.institute?.name ?? "")
          .toLowerCase()
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

  const stats = useMemo(
    () => ({
      total: requests.length,

      newCount: requests.filter(
        (request) => request.status === "new"
      ).length,

      inProgress: requests.filter(
        (request) =>
          request.status === "in_progress"
      ).length,

      needsDirector: requests.filter(
        (request) =>
          request.status ===
          "needs_director_action"
      ).length,

      overdue: requests.filter((request) =>
        isOverdue(request)
      ).length,

      resolved: requests.filter(
        (request) =>
          request.status === "resolved" ||
          request.status === "closed"
      ).length,
    }),
    [requests]
  );

  const pageTitle = isDirector
    ? "مدير الإدارة التعليمية الأزهرية"
    : profile?.role === "sheikh"
      ? "شيخ المعهد"
      : "منصة الإدارة والمتابعة المركزية";

  if (loading) {
    return (
      <AppShell>
        <div
          dir="rtl"
          className="flex min-h-[70vh] items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />

            <p className="font-bold text-slate-600">
              جارٍ تحميل طلبات المعاهد...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50"
      >
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-600">
                  <Building2 className="h-4 w-4" />

                  <span>
                    منصة الإدارة والمتابعة المركزية
                  </span>
                </div>

                <h1 className="text-2xl font-black text-slate-900">
                  طلبات المعاهد
                </h1>

                {selectedInstitute && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                    <Building2 className="h-4 w-4" />

                    المعهد المحدد:

                    <span>
                      {selectedInstitute.name}
                    </span>
                  </div>
                )}

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  قناة مباشرة ومنظمة بين المعاهد ومدير
                  الإدارة للطلبات والمشكلات والاحتياجات
                  والمتابعة حتى الحل.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-bold text-slate-500">
                    {pageTitle}
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-900">
                    {profile?.full_name ||
                      (isDirector
                        ? "مدير الإدارة"
                        : "المستخدم")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />

                    طلب جديد
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {isDirector &&
            requestedInstituteId &&
            selectedInstitute && (
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-indigo-600" />

                  <div>
                    <div className="text-xs font-bold text-indigo-600">
                      عرض خاص بالمعهد
                    </div>

                    <div className="font-black text-indigo-900">
                      {selectedInstitute.name}
                    </div>
                  </div>
                </div>

                <a
                  href="/institute-requests"
                  className="inline-flex items-center justify-center rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  عرض كل الطلبات
                </a>
              </div>
            )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  إجمالي الطلبات
                </span>

                <FileText className="h-5 w-5 text-indigo-600" />
              </div>

              <div className="text-3xl font-black text-slate-900">
                {stats.total}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-blue-700">
                  جديدة
                </span>

                <Bell className="h-5 w-5 text-blue-600" />
              </div>

              <div className="text-3xl font-black text-blue-900">
                {stats.newCount}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-amber-700">
                  قيد المعالجة
                </span>

                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>

              <div className="text-3xl font-black text-amber-900">
                {stats.inProgress}
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-red-700">
                  تحتاج تدخل المدير
                </span>

                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>

              <div className="text-3xl font-black text-red-900">
                {stats.needsDirector}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-orange-700">
                  متأخرة
                </span>

                <Clock3 className="h-5 w-5 text-orange-600" />
              </div>

              <div className="text-3xl font-black text-orange-900">
                {stats.overdue}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700">
                  تم الحل
                </span>

                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="text-3xl font-black text-emerald-900">
                {stats.resolved}
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-600" />

              <h2 className="text-lg font-black text-slate-900">
                البحث والتصفية
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="ابحث في الطلبات..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  طلبات المعهد الحالي فقط
                </div>
              )}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  قائمة الطلبات
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  عرض {filteredRequests.length} من أصل{" "}
                  {requests.length} طلب
                </p>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />

                <h3 className="mt-4 text-lg font-black text-slate-800">
                  لا توجد طلبات
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  لا توجد طلبات مطابقة للبحث والتصفية الحالية.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map(
                  (request) => {
                    const overdue =
                      isOverdue(request);

                    return (
                      <article
                        key={request.id}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-slate-900">
                                {request.title}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                  request.status
                                )}`}
                              >
                                {statusLabel(
                                  request.status
                                )}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(
                                  request.priority
                                )}`}
                              >
                                {priorityLabel(
                                  request.priority
                                )}
                              </span>
                            </div>

                            <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600">
                              {request.description}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-slate-500">
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

                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  overdue
                                    ? "font-black text-red-600"
                                    : ""
                                }`}
                              >
                                <Clock3 className="h-4 w-4" />

                                المتابعة:{" "}
                                {request.due_date
                                  ? formatDate(
                                      request.due_date
                                    )
                                  : "غير محدد"}

                                {overdue && (
                                  <AlertCircle className="h-4 w-4" />
                                )}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openRequest(request)
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            التفاصيل

                            <ArrowLeft className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </main>

        {showCreate &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              dir="rtl"
              className="fixed inset-0 z-[9999] overflow-y-auto"
            >
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => {
                  if (!saving)
                    setShowCreate(false);
                }}
              />

              <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  className="relative z-[10000] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        إنشاء طلب جديد
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        أرسل طلبك إلى مدير الإدارة
                        التعليمية الأزهرية.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowCreate(false)
                      }
                      disabled={saving}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-5 p-6">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        عنوان الطلب
                      </label>

                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              title:
                                event.target
                                  .value,
                            })
                          )
                        }
                        placeholder="مثال: طلب صيانة جهاز كمبيوتر"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          نوع الطلب
                        </label>

                        <select
                          value={
                            form.request_type
                          }
                          onChange={(event) =>
                            setForm(
                              (current) => ({
                                ...current,
                                request_type:
                                  event.target
                                    .value as RequestType,
                              })
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          {requestTypeOptions.map(
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
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          الأولوية
                        </label>

                        <select
                          value={
                            form.priority
                          }
                          onChange={(event) =>
                            setForm(
                              (current) => ({
                                ...current,
                                priority:
                                  event.target
                                    .value as Priority,
                              })
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          {priorityOptions.map(
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
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        تفاصيل الطلب
                      </label>

                      <textarea
                        value={
                          form.description
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              description:
                                event.target
                                  .value,
                            })
                          )
                        }
                        rows={5}
                        placeholder="اكتب تفاصيل المشكلة أو الاحتياج..."
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        تاريخ المتابعة المطلوب
                      </label>

                      <input
                        type="date"
                        value={
                          form.due_date
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              due_date:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCreate(false)
                        }
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />

                        إلغاء
                      </button>

                      <button
                        type="button"
                        onClick={
                          createRequest
                        }
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            جارٍ الإرسال...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            إرسال الطلب
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {selectedRequest &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              dir="rtl"
              className="fixed inset-0 z-[9999] overflow-y-auto"
            >
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={closeRequest}
              />

              <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  className="relative z-[10000] flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                            selectedRequest.status
                          )}`}
                        >
                          {statusLabel(
                            selectedRequest.status
                          )}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(
                            selectedRequest.priority
                          )}`}
                        >
                          {priorityLabel(
                            selectedRequest.priority
                          )}
                        </span>
                      </div>

                      <h2 className="text-xl font-black text-slate-900">
                        {selectedRequest.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={closeRequest}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="إغلاق"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                          <Building2 className="h-4 w-4" />
                          المعهد
                        </div>

                        <div className="font-bold text-slate-900">
                          {selectedRequest
                            .institute?.name ??
                            "غير محدد"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                          <FileText className="h-4 w-4" />
                          نوع الطلب
                        </div>

                        <div className="font-bold text-slate-900">
                          {typeLabel(
                            selectedRequest.request_type
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                          <CalendarDays className="h-4 w-4" />
                          تاريخ الإنشاء
                        </div>

                        <div className="font-bold text-slate-900">
                          {formatDateTime(
                            selectedRequest.created_at
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                          <Clock3 className="h-4 w-4" />
                          تاريخ المتابعة
                        </div>

                        <div className="font-bold text-slate-900">
                          {selectedRequest.due_date
                            ? formatDate(
                                selectedRequest.due_date
                              )
                            : "غير محدد"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="font-black text-slate-900">
                          تفاصيل الطلب
                        </h3>
                      </div>

                      <div className="p-5">
                        <p className="whitespace-pre-wrap leading-8 text-slate-700">
                          {
                            selectedRequest.description
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="flex items-center gap-2 font-black text-slate-900">
                          <MessageSquare className="h-5 w-5" />
                          رد الإدارة
                        </h3>
                      </div>

                      <div className="p-5">
                        {selectedRequest.director_response ? (
                          <p className="whitespace-pre-wrap leading-8 text-slate-700">
                            {
                              selectedRequest.director_response
                            }
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">
                            لم يتم إضافة رد من الإدارة حتى الآن.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="font-black text-slate-900">
                          متابعة الطلب
                        </h3>
                      </div>

                      <div className="p-5">
                        {isDirector ? (
                          <div className="space-y-5">
                            <div>
                              <label className="mb-2 block text-sm font-bold text-slate-700">
                                حالة الطلب
                              </label>

                              <select
                                value={
                                  directorForm.status
                                }
                                onChange={(event) =>
                                  setDirectorForm(
                                    (current) => ({
                                      ...current,
                                      status:
                                        event.target
                                          .value as RequestStatus,
                                    })
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                                      {
                                        option.label
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold text-slate-700">
                                تاريخ المتابعة
                              </label>

                              <input
                                type="date"
                                value={
                                  directorForm.due_date
                                }
                                onChange={(event) =>
                                  setDirectorForm(
                                    (current) => ({
                                      ...current,
                                      due_date:
                                        event.target
                                          .value,
                                    })
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold text-slate-700">
                                رد الإدارة
                              </label>

                              <textarea
                                value={
                                  directorForm.director_response
                                }
                                onChange={(event) =>
                                  setDirectorForm(
                                    (current) => ({
                                      ...current,
                                      director_response:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                rows={4}
                                placeholder="اكتب رد الإدارة أو الإجراء الذي تم اتخاذه..."
                                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              />
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={
                                  closeRequest
                                }
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                                إغلاق
                              </button>

                              <button
                                type="button"
                                onClick={
                                  updateRequest
                                }
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {saving ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    جارٍ الحفظ...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    حفظ التحديث
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                              <div className="flex items-start gap-3">
                                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                                <div>
                                  <p className="font-bold text-blue-900">
                                    متابعة الطلب
                                  </p>

                                  <p className="mt-1 text-sm leading-7 text-blue-800">
                                    يمكنك متابعة حالة الطلب
                                    ورد الإدارة من خلال هذه
                                    الصفحة. يتم تحديث حالة
                                    الطلب من خلال مدير الإدارة
                                    التعليمية.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex justify-end border-t border-slate-200 pt-5">
                              <button
                                type="button"
                                onClick={
                                  closeRequest
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                              >
                                <X className="h-4 w-4" />
                                إغلاق
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </AppShell>
  );
}
