"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  RefreshCw,
  Users,
  XCircle,
  ListChecks,
  MessageSquareWarning,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import { supabase } from "../lib/supabase/client";

type Profile = {
  role: string;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  institute_type: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean | null;
};

type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
};

type InstituteAttendance = AttendanceSummary & {
  instituteId: string;
};

type InstituteFollowUp = {
  instituteId: string;
  pendingTasks: number;
  pendingRequests: number;
  openComplaints: number;
};

function StatCard({
  title,
  value,
  subtitle,
  href,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            {value.toLocaleString("ar-EG")}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <ArrowLeft
          size={18}
          className="mt-1 shrink-0 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-slate-900"
        />
      </div>
    </Link>
  );
}

function AttendanceBadge({
  recorded,
}: {
  recorded: boolean;
}) {
  if (recorded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 size={14} />
        تم تسجيل الحضور
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
      <AlertTriangle size={14} />
      لم يسجل بعد
    </span>
  );
}

function FollowUpNumber({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: "blue" | "amber" | "red";
}) {
  const styles = {
    blue: {
      box: "bg-blue-50 text-blue-700",
      number: "text-blue-800",
    },
    amber: {
      box: "bg-amber-50 text-amber-700",
      number: "text-amber-800",
    },
    red: {
      box: "bg-red-50 text-red-700",
      number: "text-red-800",
    },
  };

  const current = styles[color];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${current.box}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-slate-500">
          {title}
        </div>

        <div
          className={`text-base font-black ${current.number}`}
        >
          {value.toLocaleString("ar-EG")}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [institutes, setInstitutes] =
    useState<Institute[]>([]);

  const [
    attendanceByInstitute,
    setAttendanceByInstitute,
  ] = useState<InstituteAttendance[]>([]);

  const [
    followUpByInstitute,
    setFollowUpByInstitute,
  ] = useState<InstituteFollowUp[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  function getTodayDate() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getEmptyAttendanceSummary(): AttendanceSummary {
    return {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
    };
  }

  function normalizeStatus(
    status: unknown
  ) {
    return String(status || "")
      .trim()
      .toLowerCase();
  }

  async function loadAttendanceData(
    instituteIds: string[]
  ) {
    if (!instituteIds.length) {
      setAttendanceByInstitute([]);
      return;
    }

    const todayDate =
      getTodayDate();

    const {
      data,
      error,
    } = await supabase
      .from("attendance")
      .select(
        "institute_id, student_id, status, attendance_date"
      )
      .in(
        "institute_id",
        instituteIds
      )
      .eq(
        "attendance_date",
        todayDate
      );

    if (error) {
      console.error(
        "Attendance dashboard error:",
        error
      );

      setAttendanceByInstitute(
        instituteIds.map(
          (instituteId) => ({
            instituteId,
            ...getEmptyAttendanceSummary(),
          })
        )
      );

      return;
    }

    const grouped: Record<
      string,
      AttendanceSummary
    > = {};

    for (const instituteId of instituteIds) {
      grouped[instituteId] =
        getEmptyAttendanceSummary();
    }

    for (const row of data || []) {
      const instituteId =
        row.institute_id;

      if (!grouped[instituteId]) {
        grouped[instituteId] =
          getEmptyAttendanceSummary();
      }

      grouped[instituteId].total += 1;

      const status =
        normalizeStatus(row.status);

      if (
        status === "present" ||
        status === "حاضر"
      ) {
        grouped[instituteId].present += 1;
      } else if (
        status === "absent" ||
        status === "غائب"
      ) {
        grouped[instituteId].absent += 1;
      } else if (
        status === "late" ||
        status === "متأخر"
      ) {
        grouped[instituteId].late += 1;
      } else if (
        status === "excused" ||
        status === "معذور"
      ) {
        grouped[instituteId].excused += 1;
      }
    }

    setAttendanceByInstitute(
      instituteIds.map(
        (instituteId) => ({
          instituteId,
          ...grouped[instituteId],
        })
      )
    );
  }

  async function loadFollowUpData(
    instituteIds: string[]
  ) {
    const grouped: Record<
      string,
      InstituteFollowUp
    > = {};

    for (const instituteId of instituteIds) {
      grouped[instituteId] = {
        instituteId,
        pendingTasks: 0,
        pendingRequests: 0,
        openComplaints: 0,
      };
    }

    /*
     * =========================================================
     * طلبات المعاهد
     * =========================================================
     */

    try {
      let requestQuery = supabase
        .from("institute_requests")
        .select(
          "id, institute_id, status"
        );

      if (
        profile?.role !==
          "super_admin" &&
        profile?.role !== "director" &&
        profile?.role !== "deputy"
      ) {
        if (instituteIds.length) {
          requestQuery =
            requestQuery.eq(
              "institute_id",
              instituteIds[0]
            );
        }
      }

      const {
        data,
        error,
      } = await requestQuery;

      if (error) {
        console.error(
          "Institute requests dashboard error:",
          error
        );
      } else {
        for (const row of data || []) {
          const status =
            normalizeStatus(
              row.status
            );

          const isPending =
            status === "pending" ||
            status === "new" ||
            status === "open" ||
            status === "قيد المراجعة" ||
            status === "معلق";

          if (!isPending) {
            continue;
          }

          if (
            row.institute_id &&
            grouped[
              row.institute_id
            ]
          ) {
            grouped[
              row.institute_id
            ].pendingRequests += 1;
          }
        }
      }
    } catch (error) {
      console.error(
        "Requests exception:",
        error
      );
    }

    /*
     * =========================================================
     * الشكاوى
     * =========================================================
     */

    try {
      let complaintQuery = supabase
        .from("complaints")
        .select(
          "id, institute_id, status"
        );

      if (
        profile?.role !==
          "super_admin" &&
        profile?.role !== "director" &&
        profile?.role !== "deputy"
      ) {
        if (instituteIds.length) {
          complaintQuery =
            complaintQuery.eq(
              "institute_id",
              instituteIds[0]
            );
        }
      }

      const {
        data,
        error,
      } = await complaintQuery;

      if (error) {
        console.error(
          "Complaints dashboard error:",
          error
        );
      } else {
        for (const row of data || []) {
          const status =
            normalizeStatus(
              row.status
            );

          const isOpen =
            status === "new" ||
            status === "pending" ||
            status === "open" ||
            status === "in_progress" ||
            status === "in progress" ||
            status === "جديدة" ||
            status === "مفتوحة" ||
            status === "قيد المتابعة";

          if (!isOpen) {
            continue;
          }

          if (
            row.institute_id &&
            grouped[
              row.institute_id
            ]
          ) {
            grouped[
              row.institute_id
            ].openComplaints += 1;
          }
        }
      }
    } catch (error) {
      console.error(
        "Complaints exception:",
        error
      );
    }

    /*
     * =========================================================
     * المهام
     * =========================================================
     */

    try {
      let taskQuery = supabase
        .from("institute_tasks")
        .select(
          "id, institute_id, status"
        );

      if (
        profile?.role !==
          "super_admin" &&
        profile?.role !==
          "director" &&
        profile?.role !==
          "deputy"
      ) {
        if (instituteIds.length) {
          taskQuery =
            taskQuery.eq(
              "institute_id",
              instituteIds[0]
            );
        }
      }

      const {
        data,
        error,
      } = await taskQuery;

      if (error) {
        console.error(
          "Tasks dashboard error:",
          error
        );

        /*
         * في حالة عدم وجود status
         * نستخدم عدد المهام الموجودة
         * كبيانات متابعة احتياطية.
         */

        try {
          let fallbackQuery =
            supabase
              .from("institute_tasks")
              .select(
                "id, institute_id"
              );

          if (
            profile?.role !==
              "super_admin" &&
            profile?.role !==
              "director" &&
            profile?.role !==
              "deputy"
          ) {
            if (instituteIds.length) {
              fallbackQuery =
                fallbackQuery.eq(
                  "institute_id",
                  instituteIds[0]
                );
            }
          }

          const {
            data: fallbackData,
          } =
            await fallbackQuery;

          for (
            const row of
              fallbackData || []
          ) {
            if (
              row.institute_id &&
              grouped[
                row.institute_id
              ]
            ) {
              grouped[
                row.institute_id
              ].pendingTasks += 1;
            }
          }
        } catch (fallbackError) {
          console.error(
            "Tasks fallback error:",
            fallbackError
          );
        }
      } else {
        for (const row of data || []) {
          const status =
            normalizeStatus(
              row.status
            );

          const isPending =
            status === "" ||
            status === "pending" ||
            status === "new" ||
            status === "open" ||
            status === "in_progress" ||
            status === "in progress" ||
            status === "قيد التنفيذ" ||
            status === "معلقة" ||
            status === "معلق";

          if (!isPending) {
            continue;
          }

          if (
            row.institute_id &&
            grouped[
              row.institute_id
            ]
          ) {
            grouped[
              row.institute_id
            ].pendingTasks += 1;
          }
        }
      }
    } catch (error) {
      console.error(
        "Tasks exception:",
        error
      );
    }

    setFollowUpByInstitute(
      instituteIds.map(
        (instituteId) =>
          grouped[instituteId] || {
            instituteId,
            pendingTasks: 0,
            pendingRequests: 0,
            openComplaints: 0,
          }
      )
    );
  }

  async function loadDashboard(
    showRefresh = false
  ) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "لم يتم العثور على المستخدم الحالي"
        );
      }

      const {
        data: profileData,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "role, full_name, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error(
          "لم يتم العثور على ملف المستخدم"
        );
      }

      const currentProfile =
        profileData as Profile;

      setProfile(
        currentProfile
      );

      let query = supabase
        .from("institutes")
        .select(
          "id, name, code, institute_type, director_name, student_count, teacher_count, is_active, directorate_id"
        )
        .order("name", {
          ascending: true,
        });

      if (
        currentProfile.role ===
          "super_admin" ||
        currentProfile.role ===
          "director" ||
        currentProfile.role ===
          "deputy"
      ) {
        if (
          !currentProfile.directorate_id
        ) {
          throw new Error(
            "الحساب غير مرتبط بإدارة تعليمية"
          );
        }

        query = query.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      } else if (
        currentProfile.role ===
          "sheikh" ||
        currentProfile.role ===
          "institute_deputy" ||
        currentProfile.role ===
          "teacher" ||
        currentProfile.role ===
          "employee" ||
        currentProfile.role ===
          "it_admin"
      ) {
        if (
          !currentProfile.institute_id
        ) {
          throw new Error(
            "الحساب غير مرتبط بمعهد"
          );
        }

        query = query.eq(
          "id",
          currentProfile.institute_id
        );
      } else {
        query = query.eq(
          "id",
          "__no_matching_institute__"
        );
      }

      const {
        data: instituteData,
        error: instituteError,
      } = await query;

      if (instituteError) {
        throw instituteError;
      }

      const loadedInstitutes =
        (instituteData ||
          []) as Institute[];

      setInstitutes(
        loadedInstitutes
      );

      const instituteIds =
        loadedInstitutes.map(
          (item) => item.id
        );

      /*
       * تحميل الحضور والمتابعة
       */
      await Promise.all([
        loadAttendanceData(
          instituteIds
        ),
        loadFollowUpData(
          instituteIds
        ),
      ]);
    } catch (error: any) {
      console.error(
        "Dashboard error:",
        error
      );

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "خطأ غير معروف";

      setErrorMessage(
        "خطأ قاعدة البيانات: " +
          message
      );

      setInstitutes([]);
      setAttendanceByInstitute([]);
      setFollowUpByInstitute([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  /*
   * =========================================================
   * الإحصائيات الأساسية
   * =========================================================
   */

  const totalInstitutes =
    institutes.length;

  const activeInstitutes =
    institutes.filter(
      (item) =>
        item.is_active !== false
    ).length;

  const inactiveInstitutes =
    institutes.filter(
      (item) =>
        item.is_active === false
    ).length;

  const totalStudents =
    institutes.reduce(
      (total, item) =>
        total +
        Number(
          item.student_count || 0
        ),
      0
    );

  const totalTeachers =
    institutes.reduce(
      (total, item) =>
        total +
        Number(
          item.teacher_count || 0
        ),
      0
    );

  const roleTitle =
    profile?.role === "it_admin"
      ? "مسؤول تكنولوجيا المعلومات"
      : profile?.role === "sheikh"
        ? "شيخ المعهد"
        : profile?.role ===
            "institute_deputy"
          ? "وكيل شيخ المعهد"
          : profile?.role ===
              "teacher"
            ? "المدرس"
            : profile?.role ===
                "employee"
              ? "الموظف"
              : profile?.role ===
                  "deputy"
                ? "وكيل الإدارة التعليمية الأزهرية"
                : "مدير الإدارة التعليمية الأزهرية";

  const welcomeName =
    profile?.full_name ||
    roleTitle;

  const isItAdmin =
    profile?.role === "it_admin";

  const isCentralManager =
    profile?.role ===
      "super_admin" ||
    profile?.role ===
      "director" ||
    profile?.role ===
      "deputy";

  const currentInstitute =
    institutes.length > 0
      ? institutes[0]
      : null;

  const instituteDetailsHref =
    currentInstitute
      ? `/institutes/${currentInstitute.id}`
      : "/";

  function getInstituteAttendance(
    instituteId: string
  ) {
    return (
      attendanceByInstitute.find(
        (item) =>
          item.instituteId ===
          instituteId
      ) || {
        instituteId,
        ...getEmptyAttendanceSummary(),
      }
    );
  }

  function getInstituteFollowUp(
    instituteId: string
  ) {
    return (
      followUpByInstitute.find(
        (item) =>
          item.instituteId ===
          instituteId
      ) || {
        instituteId,
        pendingTasks: 0,
        pendingRequests: 0,
        openComplaints: 0,
      }
    );
  }

  /*
   * =========================================================
   * البحث في المعاهد
   * =========================================================
   */

  const filteredInstitutes =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return institutes;
      }

      return institutes.filter(
        (institute) => {
          const name =
            institute.name
              ?.toLowerCase() || "";

          const code =
            institute.code
              ?.toLowerCase() || "";

          const director =
            institute.director_name
              ?.toLowerCase() || "";

          return (
            name.includes(search) ||
            code.includes(search) ||
            director.includes(search)
          );
        }
      );
    }, [
      institutes,
      searchTerm,
    ]);

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* =====================================================
              العنوان
          ====================================================== */}

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <span>الرئيسية</span>
                <span>/</span>
                <span>لوحة التحكم</span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                لوحة التحكم
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                مرحبًا {welcomeName}، إليك ملخص حالة النظام والمتابعة اليومية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadDashboard(true)
                }
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                <span>
                  {refreshing
                    ? "جاري التحديث..."
                    : "تحديث"}
                </span>
              </button>

              <Link
                href="/announcements"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                title="التنبيهات"
              >
                <Bell size={19} />
              </Link>
            </div>
          </div>

          {/* =====================================================
              البانر الرئيسي
          ====================================================== */}

          <section className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative z-10 max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                <Activity size={14} />
                منصة الإدارة التعليمية الأزهرية
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                {isItAdmin
                  ? "إدارة ومتابعة أنظمة المعهد"
                  : "الإدارة والمتابعة المركزية للمعاهد الأزهرية"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {isItAdmin
                  ? "متابعة بيانات المعهد والطلاب والمدرسين والحضور والتقارير والمهام من خلال منصة موحدة."
                  : "مركز تحكم موحد لمتابعة المعاهد والطلاب والمدرسين والحضور والطلبات والشكاوى والتقارير."}
              </p>
            </div>
          </section>

          {/* =====================================================
              رسائل الخطأ
          ====================================================== */}

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <XCircle
                  size={22}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div className="min-w-0">
                  <h3 className="font-bold text-red-800">
                    حدث خطأ أثناء تحميل البيانات
                  </h3>

                  <p className="mt-2 break-words text-sm leading-6 text-red-700">
                    {errorMessage}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      loadDashboard(true)
                    }
                    className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    المحاولة مرة أخرى
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              الملخص العام
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                الملخص العام
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                أهم المؤشرات الحالية للنظام
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={
                  isItAdmin
                    ? "المعهد التابع للحساب"
                    : "إجمالي المعاهد"
                }
                value={totalInstitutes}
                subtitle={
                  isItAdmin
                    ? "معهد مرتبط بالحساب"
                    : `${activeInstitutes.toLocaleString(
                        "ar-EG"
                      )} معهد نشط`
                }
                href={
                  isItAdmin
                    ? instituteDetailsHref
                    : "/institutes"
                }
                icon={
                  <Building2 size={22} />
                }
              />

              <StatCard
                title="إجمالي الطلاب"
                value={totalStudents}
                subtitle="طالب مسجل"
                href="/students"
                icon={
                  <GraduationCap size={22} />
                }
              />

              <StatCard
                title="إجمالي المدرسين"
                value={totalTeachers}
                subtitle="مدرس وعضو هيئة تعليمية"
                href="/teachers"
                icon={
                  <Users size={22} />
                }
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {isItAdmin
                        ? "حالة المعهد"
                        : "المعاهد النشطة"}
                    </p>

                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {activeInstitutes.toLocaleString(
                        "ar-EG"
                      )}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {isItAdmin
                        ? "معهد نشط"
                        : `${inactiveInstitutes.toLocaleString(
                            "ar-EG"
                          )} معهد غير نشط`}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={22} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              الوصول السريع
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                الوصول السريع
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                أهم الوظائف المتاحة حسب صلاحيات المستخدم
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {isCentralManager && (
                <QuickAction
                  title="إدارة المعاهد"
                  description="إضافة المعاهد وتعديل بياناتها ومتابعة حالتها."
                  href="/institutes"
                  icon={
                    <Building2 size={21} />
                  }
                />
              )}

              {isItAdmin && (
                <QuickAction
                  title="المعهد التابع للحساب"
                  description="عرض بيانات المعهد ومتابعة معلوماته الأساسية."
                  href={instituteDetailsHref}
                  icon={
                    <Building2 size={21} />
                  }
                />
              )}

              <QuickAction
                title="إدارة الطلاب"
                description="عرض الطلاب وإضافة بيانات جديدة ومتابعة الفصول."
                href="/students"
                icon={
                  <GraduationCap size={21} />
                }
              />

              <QuickAction
                title="الحضور والغياب"
                description={
                  isItAdmin
                    ? "إدخال وتعديل حضور وغياب الطلاب."
                    : "متابعة حضور وغياب الطلاب."
                }
                href="/attendance"
                icon={
                  <ClipboardList size={21} />
                }
              />

              <QuickAction
                title="التقارير والإحصائيات"
                description="عرض مؤشرات وتقارير الحضور والطلاب."
                href="/attendance-report"
                icon={
                  <FileBarChart size={21} />
                }
              />
            </div>
          </section>

          {/* =====================================================
              المعاهد — مركز المتابعة الكامل
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {isItAdmin
                    ? "المعهد التابع للحساب"
                    : "المعاهد التابعة للإدارة"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isItAdmin
                    ? "بطاقة متابعة كاملة للمعهد المرتبط بحساب مسؤول تكنولوجيا المعلومات."
                    : "كل معهد يظهر في بطاقة واحدة تشمل الطلاب والمدرسين والحضور والمهام والطلبات والشكاوى وما يحتاج تدخل المدير."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isCentralManager && (
                  <Link
                    href="/institutes"
                    className="hidden items-center gap-1 text-sm font-bold text-slate-700 hover:text-slate-950 sm:flex"
                  >
                    إدارة المعاهد
                    <ArrowLeft size={16} />
                  </Link>
                )}
              </div>
            </div>

            {/* ===================================================
                البحث
            ==================================================== */}

            {!isItAdmin &&
              institutes.length > 3 && (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="relative">
                    <Search
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(
                          event.target.value
                        )
                      }
                      placeholder="ابحث باسم المعهد أو الكود أو اسم الشيخ..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
              )}

            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-[650px] animate-pulse rounded-2xl bg-white shadow-sm"
                    />
                  )
                )}
              </div>
            ) : filteredInstitutes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Building2 size={25} />
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  {searchTerm
                    ? "لا توجد نتائج"
                    : isItAdmin
                      ? "لا يوجد معهد مرتبط بالحساب"
                      : "لا توجد بيانات معاهد"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {searchTerm
                    ? "لم يتم العثور على معهد يطابق بيانات البحث."
                    : isItAdmin
                      ? "يرجى التأكد من ارتباط حساب مسؤول تكنولوجيا المعلومات بالمعهد الصحيح."
                      : "لا توجد معاهد مرتبطة بالحساب الحالي أو تعذر تحميل بياناتها."}
                </p>

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    إظهار كل المعاهد
                  </button>
                )}

                {!searchTerm &&
                  isCentralManager && (
                    <Link
                      href="/institutes"
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Building2 size={17} />
                      إدارة المعاهد
                    </Link>
                  )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filteredInstitutes.map(
                  (institute) => {
                    const attendance =
                      getInstituteAttendance(
                        institute.id
                      );

                    const instituteFollowUp =
                      getInstituteFollowUp(
                        institute.id
                      );

                    const instituteAttendanceRate =
                      attendance.total > 0
                        ? Math.round(
                            (attendance.present /
                              attendance.total) *
                              100
                          )
                        : 0;

                    /*
                     * =========================================
                     * تحديد ما يحتاج تدخل المدير
                     * =========================================
                     */

                    const attendanceNeedsAction =
                      attendance.total === 0;

                    const tasksNeedAction =
                      instituteFollowUp.pendingTasks >
                      0;

                    const requestsNeedAction =
                      instituteFollowUp.pendingRequests >
                      0;

                    const complaintsNeedAction =
                      instituteFollowUp.openComplaints >
                      0;

                    const needsManagerIntervention =
                      attendanceNeedsAction ||
                      tasksNeedAction ||
                      requestsNeedAction ||
                      complaintsNeedAction;

                    const interventionCount =
                      Number(
                        attendanceNeedsAction
                      ) +
                      Number(
                        tasksNeedAction
                      ) +
                      Number(
                        requestsNeedAction
                      ) +
                      Number(
                        complaintsNeedAction
                      );

                    return (
                      <div
                        key={institute.id}
                        className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                          needsManagerIntervention
                            ? "border-amber-200"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="p-5">

                          {/* =====================================
                              رأس البطاقة
                          ====================================== */}

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                                <Building2 size={22} />
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-base font-black text-slate-900">
                                  {institute.name}
                                </h3>

                                {institute.code && (
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    كود المعهد:{" "}
                                    {institute.code}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span
                              className={
                                institute.is_active ===
                                false
                                  ? "shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600"
                                  : "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600"
                              }
                            >
                              {institute.is_active ===
                              false
                                ? "غير نشط"
                                : "نشط"}
                            </span>
                          </div>

                          {/* =====================================
                              الطلاب والمدرسون
                          ====================================== */}

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <GraduationCap size={15} />
                                الطلاب
                              </div>

                              <div className="mt-1 text-xl font-black text-slate-900">
                                {Number(
                                  institute.student_count ||
                                    0
                                ).toLocaleString(
                                  "ar-EG"
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Users size={15} />
                                المدرسون
                              </div>

                              <div className="mt-1 text-xl font-black text-slate-900">
                                {Number(
                                  institute.teacher_count ||
                                    0
                                ).toLocaleString(
                                  "ar-EG"
                                )}
                              </div>
                            </div>
                          </div>

                          {/* =====================================
                              الحضور داخل بطاقة المعهد
                          ====================================== */}

                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Activity
                                  size={17}
                                  className="text-slate-600"
                                />

                                <span className="text-xs font-bold text-slate-700">
                                  حضور اليوم
                                </span>
                              </div>

                              <AttendanceBadge
                                recorded={
                                  attendance.total >
                                  0
                                }
                              />
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <div className="rounded-lg bg-emerald-50 p-2.5 text-center">
                                <div className="text-[11px] text-emerald-700">
                                  حاضر
                                </div>

                                <div className="mt-1 font-black text-emerald-800">
                                  {attendance.present.toLocaleString(
                                    "ar-EG"
                                  )}
                                </div>
                              </div>

                              <div className="rounded-lg bg-red-50 p-2.5 text-center">
                                <div className="text-[11px] text-red-700">
                                  غائب
                                </div>

                                <div className="mt-1 font-black text-red-800">
                                  {attendance.absent.toLocaleString(
                                    "ar-EG"
                                  )}
                                </div>
                              </div>

                              <div className="rounded-lg bg-amber-50 p-2.5 text-center">
                                <div className="text-[11px] text-amber-700">
                                  متأخر
                                </div>

                                <div className="mt-1 font-black text-amber-800">
                                  {attendance.late.toLocaleString(
                                    "ar-EG"
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-500">
                                  نسبة الحضور
                                </span>

                                <span className="font-black text-slate-800">
                                  {instituteAttendanceRate}%
                                </span>
                              </div>

                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{
                                    width: `${Math.min(
                                      instituteAttendanceRate,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* =====================================
                              يحتاج تدخل المدير
                          ====================================== */}

                          <div
                            className={`mt-4 rounded-xl border p-4 ${
                              needsManagerIntervention
                                ? "border-amber-200 bg-amber-50/70"
                                : "border-emerald-200 bg-emerald-50/60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                {needsManagerIntervention ? (
                                  <AlertTriangle
                                    size={18}
                                    className="text-amber-600"
                                  />
                                ) : (
                                  <CheckCircle2
                                    size={18}
                                    className="text-emerald-600"
                                  />
                                )}

                                <span
                                  className={`text-sm font-black ${
                                    needsManagerIntervention
                                      ? "text-amber-800"
                                      : "text-emerald-800"
                                  }`}
                                >
                                  {needsManagerIntervention
                                    ? "يحتاج تدخل المدير"
                                    : "لا توجد عناصر تحتاج تدخل المدير"}
                                </span>
                              </div>

                              {needsManagerIntervention && (
                                <span className="rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white">
                                  {interventionCount.toLocaleString(
                                    "ar-EG"
                                  )}{" "}
                                  متابعة
                                </span>
                              )}
                            </div>

                            {needsManagerIntervention && (
                              <div className="mt-3 space-y-2">

                                {/* الحضور */}

                                {attendanceNeedsAction && (
                                  <Link
                                    href="/attendance"
                                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-100"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Activity size={15} />
                                      لم يتم تسجيل حضور اليوم
                                    </span>

                                    <ArrowLeft
                                      size={14}
                                    />
                                  </Link>
                                )}

                                {/* المهام */}

                                {tasksNeedAction && (
                                  <Link
                                    href="/institute-tasks"
                                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-blue-800 shadow-sm transition hover:bg-blue-50"
                                  >
                                    <span className="flex items-center gap-2">
                                      <ListChecks size={15} />
                                      {instituteFollowUp.pendingTasks.toLocaleString(
                                        "ar-EG"
                                      )}{" "}
                                      مهام تحتاج متابعة
                                    </span>

                                    <ArrowLeft
                                      size={14}
                                    />
                                  </Link>
                                )}

                                {/* الطلبات */}

                                {requestsNeedAction && (
                                  <Link
                                    href="/institute-requests"
                                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-50"
                                  >
                                    <span className="flex items-center gap-2">
                                      <ClipboardList size={15} />
                                      {instituteFollowUp.pendingRequests.toLocaleString(
                                        "ar-EG"
                                      )}{" "}
                                      طلبات معلقة
                                    </span>

                                    <ArrowLeft
                                      size={14}
                                    />
                                  </Link>
                                )}

                                {/* الشكاوى */}

                                {complaintsNeedAction && (
                                  <Link
                                    href="/complaints"
                                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-50"
                                  >
                                    <span className="flex items-center gap-2">
                                      <MessageSquareWarning
                                        size={15}
                                      />
                                      {instituteFollowUp.openComplaints.toLocaleString(
                                        "ar-EG"
                                      )}{" "}
                                      شكاوى مفتوحة
                                    </span>

                                    <ArrowLeft
                                      size={14}
                                    />
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>

                          {/* =====================================
                              المتابعة الإدارية
                          ====================================== */}

                          <div className="mt-4">
                            <div className="mb-3 flex items-center gap-2">
                              <ClipboardList
                                size={17}
                                className="text-slate-600"
                              />

                              <span className="text-xs font-black text-slate-700">
                                المتابعة الإدارية
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <FollowUpNumber
                                icon={
                                  <ListChecks size={15} />
                                }
                                title="المهام"
                                value={
                                  instituteFollowUp.pendingTasks
                                }
                                color="blue"
                              />

                              <FollowUpNumber
                                icon={
                                  <ClipboardList size={15} />
                                }
                                title="الطلبات"
                                value={
                                  instituteFollowUp.pendingRequests
                                }
                                color="amber"
                              />

                              <FollowUpNumber
                                icon={
                                  <MessageSquareWarning size={15} />
                                }
                                title="الشكاوى"
                                value={
                                  instituteFollowUp.openComplaints
                                }
                                color="red"
                              />
                            </div>
                          </div>

                          {/* =====================================
                              شيخ المعهد
                          ====================================== */}

                          {institute.director_name && (
                            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                              <Users
                                size={15}
                                className="text-slate-400"
                              />

                              <span className="font-semibold text-slate-700">
                                شيخ المعهد:
                              </span>

                              <span className="truncate">
                                {institute.director_name}
                              </span>
                            </div>
                          )}

                          {/* =====================================
                              أزرار الوصول المباشر
                          ====================================== */}

                          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                            <Link
                              href={`/students?institute=${institute.id}`}
                              className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
                            >
                              الطلاب
                            </Link>

                            <Link
                              href={`/teachers?institute=${institute.id}`}
                              className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
                            >
                              المدرسون
                            </Link>

                            <Link
                              href="/attendance"
                              className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
                            >
                              الحضور
                            </Link>

                            <Link
                              href="/institute-tasks"
                              className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
                            >
                              المهام
                            </Link>

                            <Link
                              href="/institute-requests"
                              className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
                            >
                              الطلبات
                            </Link>

                            <Link
                              href="/complaints"
                              className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
                            >
                              الشكاوى
                            </Link>
                          </div>

                          {/* =====================================
                              فتح ملف المعهد
                          ====================================== */}

                          <Link
                            href={`/institutes/${institute.id}`}
                            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                          >
                            فتح ملف المعهد
                            <ArrowLeft size={15} />
                          </Link>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* =====================================================
              حالة النظام
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                حالة النظام
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                حالة الخدمات الأساسية
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    قاعدة البيانات
                  </div>

                  <div className="mt-1 text-xs font-semibold text-emerald-600">
                    متصل
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    نظام الدخول والصلاحيات
                  </div>

                  <div className="mt-1 text-xs font-semibold text-emerald-600">
                    يعمل
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    حماية الصفحات
                  </div>

                  <div className="mt-1 text-xs font-semibold text-emerald-600">
                    مفعلة
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              الإعلانات
          ====================================================== */}

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                تنبيهات ومتابعة
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                آخر المستجدات والتنبيهات الإدارية
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Bell size={21} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      مركز الإعلانات
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      يمكنك متابعة الإعلانات والتعليمات من القسم المخصص.
                    </p>
                  </div>
                </div>

                <Link
                  href="/announcements"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  الانتقال إلى الإعلانات
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </div>
          </section>

          <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
            نظام إدارة المعاهد الأزهرية — منصة الإدارة والمتابعة التعليمية
          </div>
        </div>
      </div>
    </AppShell>
  );
}
