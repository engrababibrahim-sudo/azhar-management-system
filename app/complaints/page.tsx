"use client";

import { createPortal } from "react-dom";
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

type Role =
  | "super_admin"
  | "director"
  | "deputy"
  | "it_admin"
  | "employee"
  | "sheikh"
  | "teacher"
  | "student"
  | "parent";

type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  directorate_id?: string | null;
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
    id?: string;
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

  if (status === "received") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ar-EG");
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("ar-EG");
}

export default function ComplaintsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /*
   * undefined = لم يتم قراءة الرابط بعد
   * null      = لا يوجد instituteId في الرابط
   * string    = يوجد معهد محدد في الرابط
   */
  const [requestedInstituteId, setRequestedInstituteId] = useState<
    string | null | undefined
  >(undefined);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [instituteFilter, setInstituteFilter] = useState("all");

  const [showNewComplaint, setShowNewComplaint] = useState(false);
  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("other");
  const [newPriority, setNewPriority] = useState("normal");

  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("new");

  const isCentralManager =
    profile?.role === "super_admin" ||
    profile?.role === "director" ||
    profile?.role === "deputy";

  const isDirector =
    profile?.role === "director" ||
    profile?.role === "super_admin" ||
    profile?.role === "deputy";

  const canCreateComplaint =
    profile?.role === "parent" ||
    profile?.role === "sheikh" ||
    profile?.role === "teacher" ||
    profile?.role === "employee";

  const canManageComplaint =
    profile?.role === "director" ||
    profile?.role === "super_admin";

  /*
   * ---------------------------------------------------------
   * قراءة instituteId من الرابط
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const instituteId = params.get("instituteId");

    setRequestedInstituteId(instituteId);
  }, []);

  /*
   * ---------------------------------------------------------
   * تحميل البيانات
   * ---------------------------------------------------------
   */

  async function loadData(
    showSpinner = true,
    requestedInstituteIdOverride?: string | null
  ) {
    if (showSpinner) {
      setLoading(true);
    }

    setError("");

    try {
      /*
       * -------------------------------------------------------
       * المستخدم الحالي
       * -------------------------------------------------------
       */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setError("يجب تسجيل الدخول أولًا.");
        setComplaints([]);

        if (showSpinner) {
          setLoading(false);
        }

        return;
      }

      /*
       * -------------------------------------------------------
       * بيانات المستخدم
       * -------------------------------------------------------
       */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, role, full_name, institute_id, directorate_id"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        setError("تعذر العثور على بيانات المستخدم.");
        setComplaints([]);

        if (showSpinner) {
          setLoading(false);
        }

        return;
      }

      const currentProfile = profileData as Profile;

      setProfile(currentProfile);

      /*
       * -------------------------------------------------------
       * نطاق الحساب
       * -------------------------------------------------------
       */

      const centralManager =
        currentProfile.role === "super_admin" ||
        currentProfile.role === "director" ||
        currentProfile.role === "deputy";

      const instituteUser =
        currentProfile.role === "sheikh" ||
        currentProfile.role === "teacher" ||
        currentProfile.role === "employee" ||
        currentProfile.role === "it_admin";

      /*
       * -------------------------------------------------------
       * تحميل المعاهد
       * -------------------------------------------------------
       */

      let instituteQuery = supabase
        .from("institutes")
        .select("id, name, directorate_id")
        .order("name", {
          ascending: true,
        });

      /*
       * المدير يرى فقط معاهد إدارته التعليمية
       */

      if (centralManager) {
        if (!currentProfile.directorate_id) {
          setInstitutes([]);
          setComplaints([]);
          setError(
            "الحساب الإداري غير مرتبط بإدارة تعليمية."
          );

          if (showSpinner) {
            setLoading(false);
          }

          return;
        }

        instituteQuery = instituteQuery.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      }

      /*
       * مستخدم المعهد يرى معهده فقط
       */

      else if (instituteUser) {
        if (!currentProfile.institute_id) {
          setInstitutes([]);
          setComplaints([]);
          setError(
            "الحساب غير مرتبط بمعهد."
          );

          if (showSpinner) {
            setLoading(false);
          }

          return;
        }

        instituteQuery = instituteQuery.eq(
          "id",
          currentProfile.institute_id
        );
      }

      /*
       * ولي الأمر لا يحتاج قائمة المعاهد
       */

      else if (currentProfile.role !== "parent") {
        instituteQuery = instituteQuery.eq(
          "id",
          "00000000-0000-0000-0000-000000000000"
        );
      }

      const {
        data: institutesData,
        error: institutesError,
      } = await instituteQuery;

      if (institutesError) {
        throw institutesError;
      }

      const currentInstitutes =
        (institutesData || []) as Institute[];

      setInstitutes(currentInstitutes);

      /*
       * -------------------------------------------------------
       * تحديد المعهد الفعلي
       * -------------------------------------------------------
       *
       * مدير الإدارة:
       *
       * /complaints
       * => كل المعاهد التابعة لإدارته
       *
       * /complaints?instituteId=XXX
       * => المعهد XXX فقط
       *
       * مستخدم المعهد:
       * => معهد حسابه فقط مهما كان instituteId في الرابط
       */

      let effectiveInstituteIds =
        currentInstitutes.map(
          (institute) => institute.id
        );

      if (centralManager) {
        /*
         * لا يوجد instituteId
         * => كل معاهد الإدارة
         */

        if (!requestedInstituteIdOverride) {
          setInstituteFilter("all");
        }

        /*
         * يوجد instituteId
         * => تحقق أولًا أنه تابع لإدارة المدير
         */

        if (requestedInstituteIdOverride) {
          const requestedInstitute =
            currentInstitutes.find(
              (institute) =>
                institute.id ===
                requestedInstituteIdOverride
            );

          if (!requestedInstitute) {
            setComplaints([]);
            setInstituteFilter("all");
            setError(
              "المعهد المطلوب غير تابع للإدارة التعليمية الحالية."
            );

            if (showSpinner) {
              setLoading(false);
            }

            return;
          }

          /*
           * هنا يتم حصر الاستعلام نفسه
           * في المعهد المحدد
           */

          effectiveInstituteIds = [
            requestedInstitute.id,
          ];

          setInstituteFilter(
            requestedInstitute.id
          );
        }
      }

      /*
       * -------------------------------------------------------
       * تحميل الشكاوى
       * -------------------------------------------------------
       */

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
          institute:institutes (
            id,
            name
          )
        `
        )
        .order("created_at", {
          ascending: false,
        });

      /*
       * -------------------------------------------------------
       * مستخدمو المعهد
       * -------------------------------------------------------
       */

      if (instituteUser) {
        if (!currentProfile.institute_id) {
          setComplaints([]);

          if (showSpinner) {
            setLoading(false);
          }

          return;
        }

        query = query.eq(
          "institute_id",
          currentProfile.institute_id
        );
      }

      /*
       * -------------------------------------------------------
       * ولي الأمر
       * -------------------------------------------------------
       */

      if (currentProfile.role === "parent") {
        query = query.eq(
          "parent_id",
          user.id
        );
      }

      /*
       * -------------------------------------------------------
       * المدير / الوكيل
       * -------------------------------------------------------
       */

      if (centralManager) {
        if (!currentProfile.directorate_id) {
          setComplaints([]);

          if (showSpinner) {
            setLoading(false);
          }

          return;
        }

        /*
         * الحماية الأساسية:
         *
         * الاستعلام لا يجلب إلا المعاهد الموجودة
         * داخل effectiveInstituteIds.
         *
         * عند فتح بطاقة معهد:
         * effectiveInstituteIds = [instituteId]
         *
         * وبالتالي لا يمكن أن تظهر شكاوى المعاهد الأخرى.
         */

        if (effectiveInstituteIds.length === 0) {
          setComplaints([]);

          if (showSpinner) {
            setLoading(false);
          }

          return;
        }

        query = query.in(
          "institute_id",
          effectiveInstituteIds
        );
      }

      /*
       * -------------------------------------------------------
       * تنفيذ الاستعلام
       * -------------------------------------------------------
       */

      const {
        data,
        error: complaintsError,
      } = await query;

      if (complaintsError) {
        throw complaintsError;
      }

      const normalizedComplaints: Complaint[] =
        (data || []).map(
          (complaint: any) => ({
            ...complaint,

            institute:
              Array.isArray(
                complaint.institute
              )
                ? complaint.institute[0] ??
                  null
                : complaint.institute ??
                  null,
          })
        );

      /*
       * -------------------------------------------------------
       * حماية إضافية نهائية
       * -------------------------------------------------------
       *
       * حتى لو حدث خطأ في أي جزء من الاستعلام،
       * لا نسمح للواجهة بعرض شكوى من معهد آخر
       * عند وجود instituteId.
       */

      let finalComplaints =
        normalizedComplaints;

      if (
        centralManager &&
        requestedInstituteIdOverride
      ) {
        finalComplaints =
          normalizedComplaints.filter(
            (complaint) =>
              complaint.institute_id ===
              requestedInstituteIdOverride
          );
      }

      /*
       * مستخدم المعهد:
       * حماية إضافية في الواجهة أيضًا.
       */

      if (
        instituteUser &&
        currentProfile.institute_id
      ) {
        finalComplaints =
          finalComplaints.filter(
            (complaint) =>
              complaint.institute_id ===
              currentProfile.institute_id
          );
      }

      setComplaints(
        finalComplaints
      );
    } catch (err) {
      console.error(
        "LOAD COMPLAINTS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الشكاوى."
      );

      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * التحميل الأول
   * ---------------------------------------------------------
   *
   * ننتظر قراءة instituteId من الرابط أولًا.
   */

  useEffect(() => {
    if (requestedInstituteId !== undefined) {
      loadData(
        true,
        requestedInstituteId
      );
    }
  }, [requestedInstituteId]);

  /*
   * ---------------------------------------------------------
   * تصفية النتائج
   * ---------------------------------------------------------
   */

  const filteredComplaints = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return complaints.filter(
      (complaint) => {
        const matchesSearch =
          !search ||
          complaint.title
            .toLowerCase()
            .includes(search) ||
          complaint.description
            .toLowerCase()
            .includes(search) ||
          complaint.institute?.name
            ?.toLowerCase()
            .includes(search);

        const matchesStatus =
          statusFilter === "all" ||
          complaint.status ===
            statusFilter;

        const matchesPriority =
          priorityFilter === "all" ||
          complaint.priority ===
            priorityFilter;

        const matchesInstitute =
          instituteFilter === "all" ||
          complaint.institute_id ===
            instituteFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesInstitute
        );
      }
    );
  }, [
    complaints,
    searchTerm,
    statusFilter,
    priorityFilter,
    instituteFilter,
  ]);

  /*
   * ---------------------------------------------------------
   * الإحصائيات
   * ---------------------------------------------------------
   */

  const statistics = useMemo(() => {
    return {
      total: complaints.length,

      newCount: complaints.filter(
        (item) =>
          item.status === "new"
      ).length,

      inProgress: complaints.filter(
        (item) =>
          item.status ===
          "in_progress"
      ).length,

      escalated: complaints.filter(
        (item) =>
          item.status ===
          "escalated"
      ).length,

      resolved: complaints.filter(
        (item) =>
          item.status ===
            "resolved" ||
          item.status === "closed"
      ).length,
    };
  }, [complaints]);

  /*
   * ---------------------------------------------------------
   * إنشاء شكوى
   * ---------------------------------------------------------
   */

  async function createComplaint() {
    if (!profile) {
      return;
    }

    if (!newTitle.trim()) {
      alert("اكتبي عنوان الشكوى.");
      return;
    }

    if (!newDescription.trim()) {
      alert("اكتبي تفاصيل الشكوى.");
      return;
    }

    if (!profile.institute_id) {
      alert(
        "هذا الحساب غير مرتبط بمعهد، لذلك لا يمكن إنشاء الشكوى."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert(
          "يجب تسجيل الدخول أولًا."
        );
        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from("complaints")
        .insert({
          institute_id:
            profile.institute_id,

          parent_id:
            profile.role === "parent"
              ? user.id
              : null,

          created_by: user.id,

          source:
            profile.role === "parent"
              ? "parent"
              : "institute",

          complaint_type: newType,

          title: newTitle.trim(),

          description:
            newDescription.trim(),

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

        return;
      }

      setNewTitle("");
      setNewDescription("");
      setNewType("other");
      setNewPriority("normal");
      setShowNewComplaint(false);

      alert(
        "تم إرسال الشكوى بنجاح ✅"
      );

      await loadData(
        true,
        requestedInstituteId
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * تحديث الشكوى
   * ---------------------------------------------------------
   */

  async function updateComplaint() {
    if (
      !selectedComplaint ||
      !profile
    ) {
      return;
    }

    if (!canManageComplaint) {
      alert(
        "لا توجد لديك صلاحية لتعديل حالة الشكوى."
      );
      return;
    }

    const statusChanged =
      newStatus !==
      selectedComplaint.status;

    const responseChanged =
      responseText.trim() !==
      (
        selectedComplaint.director_response ||
        ""
      ).trim();

    if (
      !statusChanged &&
      !responseChanged
    ) {
      alert(
        "لا توجد تغييرات جديدة لحفظها."
      );
      return;
    }

    setSaving(true);

    try {
      const updateData: Record<
        string,
        string | null
      > = {
        updated_at:
          new Date().toISOString(),
      };

      if (statusChanged) {
        updateData.status =
          newStatus;

        if (
          newStatus === "escalated"
        ) {
          updateData.escalated_at =
            selectedComplaint.escalated_at ||
            new Date().toISOString();
        } else {
          updateData.escalated_at =
            selectedComplaint.escalated_at;
        }

        if (
          newStatus === "resolved"
        ) {
          updateData.resolved_at =
            selectedComplaint.resolved_at ||
            new Date().toISOString();
        }

        if (
          newStatus === "closed"
        ) {
          updateData.closed_at =
            selectedComplaint.closed_at ||
            new Date().toISOString();
        }

        if (
          newStatus !== "resolved" &&
          newStatus !== "closed"
        ) {
          updateData.resolved_at =
            selectedComplaint.resolved_at;

          updateData.closed_at =
            selectedComplaint.closed_at;
        }
      }

      if (responseChanged) {
        updateData.director_response =
          responseText.trim() ||
          null;
      }

      const {
        error: updateError,
      } = await supabase
        .from("complaints")
        .update(updateData)
        .eq(
          "id",
          selectedComplaint.id
        );

      if (updateError) {
        console.error(
          "UPDATE COMPLAINT ERROR:",
          updateError
        );

        alert(
          "تعذر تحديث الشكوى:\n" +
            updateError.message
        );

        return;
      }

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (
        user &&
        responseText.trim()
      ) {
        const {
          error: historyError,
        } = await supabase
          .from("complaint_updates")
          .insert({
            complaint_id:
              selectedComplaint.id,

            user_id: user.id,

            status:
              newStatus ||
              selectedComplaint.status,

            note: responseText.trim(),
          });

        if (historyError) {
          console.warn(
            "COMPLAINT HISTORY ERROR:",
            historyError
          );
        }
      }

      alert(
        "تم تحديث الشكوى بنجاح ✅"
      );

      closeComplaint();

      await loadData(
        true,
        requestedInstituteId
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * فتح تفاصيل الشكوى
   * ---------------------------------------------------------
   */

  function openComplaint(
    complaint: Complaint
  ) {
    setSelectedComplaint(
      complaint
    );

    setResponseText(
      complaint.director_response ||
        ""
    );

    setNewStatus(
      complaint.status
    );
  }

  function closeComplaint() {
    setSelectedComplaint(null);
    setResponseText("");
    setNewStatus("new");
  }

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <AppShell>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50"
      >
        {/* =====================================================
            HEADER
        ====================================================== */}

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

                {profile && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {isDirector
                        ? "مدير الإدارة"
                        : profile.role ===
                          "parent"
                        ? "ولي أمر"
                        : profile.role ===
                          "it_admin"
                        ? "مسؤول تكنولوجيا المعلومات"
                        : "المعهد"}
                    </span>

                    {profile.full_name && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {profile.full_name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    loadData(
                      true,
                      requestedInstituteId
                    )
                  }
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    size={18}
                    className={
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  />

                  تحديث
                </button>

                {canCreateComplaint && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowNewComplaint(
                        true
                      )
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
          {/* =====================================================
              STATISTICS
          ====================================================== */}

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

          {/* =====================================================
              FILTERS
          ====================================================== */}

          <div className="mt-7 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-bold text-slate-900">
                البحث والتصفية
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                ابحث عن شكوى أو قم بتصفية النتائج حسب الحالة والأولوية والمعهد.
              </p>
            </div>

            <div
              className={`grid gap-4 ${
                isDirector
                  ? "md:grid-cols-4"
                  : "md:grid-cols-3"
              }`}
            >
              <div className="relative">
                <Search
                  size={19}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  placeholder="ابحث في الشكاوى..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 outline-none focus:border-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="all">
                  كل الحالات
                </option>

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

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="all">
                  كل الأولويات
                </option>

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

              {isDirector && (
                <select
                  value={instituteFilter}
                  onChange={(e) =>
                    setInstituteFilter(
                      e.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
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
              )}
            </div>

            {isCentralManager &&
              requestedInstituteId && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  <Building2 size={18} />

                  <span>
                    يتم عرض شكاوى المعهد المحدد فقط
                  </span>
                </div>
              )}
          </div>

          {/* =====================================================
              LOADING
          ====================================================== */}

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

          {/* =====================================================
              ERROR
          ====================================================== */}

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

                  <button
                    type="button"
                    onClick={() =>
                      loadData(
                        true,
                        requestedInstituteId
                      )
                    }
                    className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              EMPTY
          ====================================================== */}

          {!loading &&
            !error &&
            filteredComplaints.length ===
              0 && (
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

                {canCreateComplaint && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowNewComplaint(
                        true
                      )
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    <Plus size={18} />
                    تقديم أول شكوى
                  </button>
                )}
              </div>
            )}

          {/* =====================================================
              COMPLAINTS LIST
          ====================================================== */}

          {!loading &&
            !error &&
            filteredComplaints.length >
              0 && (
              <div className="mt-7">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    قائمة الشكاوى والبلاغات
                  </h2>

                  <span className="text-sm text-slate-500">
                    عرض{" "}
                    {
                      filteredComplaints.length
                    }{" "}
                    من أصل{" "}
                    {complaints.length}{" "}
                    بلاغ
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredComplaints.map(
                    (complaint) => (
                      <button
                        type="button"
                        key={
                          complaint.id
                        }
                        onClick={() =>
                          openComplaint(
                            complaint
                          )
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
                                  complaint
                                    .complaint_type
                                ] ||
                                  complaint.complaint_type}
                              </span>
                            </div>

                            <h2 className="mt-3 text-lg font-bold text-slate-900">
                              {
                                complaint.title
                              }
                            </h2>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                              {
                                complaint.description
                              }
                            </p>
                          </div>

                          <div className="min-w-[240px] space-y-3 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                              <Building2
                                size={17}
                              />

                              <span>
                                {complaint
                                  .institute
                                  ?.name ||
                                  "المعهد غير محدد"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock3
                                size={17}
                              />

                              <span>
                                {formatDate(
                                  complaint.created_at
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
              </div>
            )}
        </div>

        {/* =====================================================
            NEW COMPLAINT MODAL
        ====================================================== */}

        {showNewComplaint &&
          typeof document !==
            "undefined" &&
          createPortal(
            <div
              dir="rtl"
              className="fixed inset-0 z-[9999] overflow-y-auto"
            >
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() =>
                  !saving &&
                  setShowNewComplaint(
                    false
                  )
                }
              />

              <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  className="relative z-[10000] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div className="flex items-center justify-between border-b px-6 py-5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        تقديم شكوى أو بلاغ
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        سيتم ربط الشكوى بالمعهد المرتبط بالحساب تلقائيًا.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setShowNewComplaint(
                          false
                        )
                      }
                      className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-6">
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          عنوان الشكوى
                        </label>

                        <input
                          value={
                            newTitle
                          }
                          onChange={(e) =>
                            setNewTitle(
                              e.target.value
                            )
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
                          value={
                            newType
                          }
                          onChange={(e) =>
                            setNewType(
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                        >
                          {Object.entries(
                            complaintTypes
                          ).map(
                            ([
                              value,
                              label,
                            ]) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {
                                  label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          الأولوية
                        </label>

                        <select
                          value={
                            newPriority
                          }
                          onChange={(e) =>
                            setNewPriority(
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                        >
                          {Object.entries(
                            priorityLabels
                          ).map(
                            ([
                              value,
                              label,
                            ]) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {
                                  label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          تفاصيل الشكوى
                        </label>

                        <textarea
                          value={
                            newDescription
                          }
                          onChange={(e) =>
                            setNewDescription(
                              e.target.value
                            )
                          }
                          rows={7}
                          placeholder="اكتب تفاصيل المشكلة بالتفصيل..."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="flex justify-end gap-3 border-t pt-5">
                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            setShowNewComplaint(
                              false
                            )
                          }
                          className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        >
                          إلغاء
                        </button>

                        <button
                          type="button"
                          onClick={
                            createComplaint
                          }
                          disabled={
                            saving
                          }
                          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? (
                            <RefreshCw
                              size={
                                18
                              }
                              className="animate-spin"
                            />
                          ) : (
                            <Send
                              size={
                                18
                              }
                            />
                          )}

                          {saving
                            ? "جاري الإرسال..."
                            : "إرسال الشكوى"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* =====================================================
            COMPLAINT DETAILS MODAL
        ====================================================== */}

        {selectedComplaint &&
          typeof document !==
            "undefined" &&
          createPortal(
            <div
              dir="rtl"
              className="fixed inset-0 z-[9999] overflow-y-auto"
            >
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() =>
                  !saving &&
                  closeComplaint()
                }
              />

              <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  className="relative z-[10000] flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  {/* Modal Header */}

                  <div className="flex items-start justify-between border-b px-6 py-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            selectedComplaint.status
                          )}`}
                        >
                          {statusLabels[
                            selectedComplaint
                              .status
                          ] ||
                            selectedComplaint.status}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                            selectedComplaint.priority
                          )}`}
                        >
                          {priorityLabels[
                            selectedComplaint
                              .priority
                          ] ||
                            selectedComplaint.priority}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-bold text-slate-900">
                        {
                          selectedComplaint.title
                        }
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        تفاصيل ومتابعة الشكوى
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={
                        closeComplaint
                      }
                      className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  {/* Modal Body */}

                  <div className="overflow-y-auto p-6">
                    <div className="space-y-6">
                      {/* Basic Information */}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Building2
                              size={16}
                            />

                            المعهد
                          </div>

                          <p className="mt-2 font-semibold text-slate-900">
                            {selectedComplaint
                              .institute
                              ?.name ||
                              "المعهد غير محدد"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <FileText
                              size={16}
                            />

                            نوع الشكوى
                          </div>

                          <p className="mt-2 font-semibold text-slate-900">
                            {complaintTypes[
                              selectedComplaint
                                .complaint_type
                            ] ||
                              selectedComplaint.complaint_type}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Clock3
                              size={16}
                            />

                            تاريخ الإنشاء
                          </div>

                          <p className="mt-2 font-semibold text-slate-900">
                            {formatDateTime(
                              selectedComplaint.created_at
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <UserRound
                              size={16}
                            />

                            مصدر البلاغ
                          </div>

                          <p className="mt-2 font-semibold text-slate-900">
                            {selectedComplaint.source ===
                            "parent"
                              ? "ولي أمر"
                              : "المعهد"}
                          </p>
                        </div>
                      </div>

                      {/* Complaint Details */}

                      <div className="rounded-2xl bg-slate-50 p-5">
                        <h4 className="font-bold text-slate-900">
                          تفاصيل الشكوى
                        </h4>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {
                            selectedComplaint.description
                          }
                        </p>
                      </div>

                      {/* Institute Response */}

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

                      {/* Director Response */}

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

                      {/* Read Only Notice */}

                      {!canManageComplaint && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                          <div className="flex items-start gap-3">
                            <MessageSquareWarning
                              size={21}
                              className="mt-0.5 text-blue-600"
                            />

                            <div>
                              <h4 className="font-bold text-blue-900">
                                متابعة الشكوى
                              </h4>

                              <p className="mt-1 text-sm leading-6 text-blue-800">
                                يمكنك متابعة حالة الشكوى ورد مدير الإدارة من خلال هذه الصفحة. يتم تحديث حالة الشكوى والإجراءات من خلال مدير الإدارة التعليمية.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Director Management */}

                      {canManageComplaint && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              إدارة الشكوى
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                              يمكن لمدير الإدارة تحديث الحالة وإضافة الرد والإجراء المتخذ.
                            </p>
                          </div>

                          <div className="mt-5">
                            <label className="mb-2 block text-sm font-semibold">
                              حالة الشكوى
                            </label>

                            <select
                              value={
                                newStatus
                              }
                              onChange={(
                                e
                              ) =>
                                setNewStatus(
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                            >
                              {Object.entries(
                                statusLabels
                              ).map(
                                ([
                                  value,
                                  label,
                                ]) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {
                                      label
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="mt-5">
                            <label className="mb-2 block text-sm font-semibold">
                              رد مدير الإدارة
                            </label>

                            <textarea
                              value={
                                responseText
                              }
                              onChange={(
                                e
                              ) =>
                                setResponseText(
                                  e.target.value
                                )
                              }
                              rows={5}
                              placeholder="اكتب الرد أو الإجراء الذي تم اتخاذه..."
                              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}

                  <div className="flex flex-col-reverse gap-3 border-t bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={
                        closeComplaint
                      }
                      className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      إغلاق
                    </button>

                    {canManageComplaint && (
                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={
                          updateComplaint
                        }
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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

                        {saving
                          ? "جاري الحفظ..."
                          : "حفظ التحديث"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
      </main>
    </AppShell>
  );
}
