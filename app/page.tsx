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

type DashboardFollowUp = {
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

function MiniMetric({
  title,
  value,
  icon,
  className = "",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {value.toLocaleString("ar-EG")}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
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

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [institutes, setInstitutes] = useState<Institute[]>([]);

  const [attendanceByInstitute, setAttendanceByInstitute] =
    useState<InstituteAttendance[]>([]);

  const [followUp, setFollowUp] =
    useState<DashboardFollowUp>({
      pendingRequests: 0,
      openComplaints: 0,
    });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [today, setToday] = useState("");

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

  async function loadAttendanceData(
    instituteIds: string[]
  ) {
    if (!instituteIds.length) {
      setAttendanceByInstitute([]);
      return;
    }

    const todayDate = getTodayDate();

    const {
      data,
      error,
    } = await supabase
      .from("attendance")
      .select(
        "institute_id, student_id, status, attendance_date"
      )
      .in("institute_id", instituteIds)
      .eq("attendance_date", todayDate);

    if (error) {
      console.error(
        "Attendance dashboard error:",
        error
      );

      /*
       * لا نوقف لوحة التحكم بالكامل إذا حدثت مشكلة
       * في بيانات الحضور.
       */
      setAttendanceByInstitute([]);
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
      const instituteId = row.institute_id;

      if (!grouped[instituteId]) {
        grouped[instituteId] =
          getEmptyAttendanceSummary();
      }

      grouped[instituteId].total += 1;

      if (row.status === "present") {
        grouped[instituteId].present += 1;
      } else if (row.status === "absent") {
        grouped[instituteId].absent += 1;
      } else if (row.status === "late") {
        grouped[instituteId].late += 1;
      } else if (row.status === "excused") {
        grouped[instituteId].excused += 1;
      }
    }

    setAttendanceByInstitute(
      instituteIds.map((instituteId) => ({
        instituteId,
        ...grouped[instituteId],
      }))
    );
  }

  async function loadFollowUpData(
    instituteIds: string[]
  ) {
    let pendingRequests = 0;
    let openComplaints = 0;

    /*
     * =========================================================
     * الطلبات المعلقة
     * =========================================================
     */

    try {
      let requestQuery = supabase
        .from("institute_requests")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "pending");

      /*
       * الإدارة المركزية ترى طلبات الإدارة كلها.
       * مستخدم المعهد يرى طلبات معهده فقط.
       */
      if (
        profile?.role !== "super_admin" &&
        profile?.role !== "director" &&
        profile?.role !== "deputy"
      ) {
        if (instituteIds.length) {
          requestQuery = requestQuery.eq(
            "institute_id",
            instituteIds[0]
          );
        }
      }

      const {
        count,
        error,
      } = await requestQuery;

      if (error) {
        console.error(
          "Pending requests error:",
          error
        );
      } else {
        pendingRequests = count || 0;
      }
    } catch (error) {
      console.error(
        "Pending requests exception:",
        error
      );
    }

    /*
     * =========================================================
     * الشكاوى المفتوحة
     * =========================================================
     */

    try {
      let complaintQuery = supabase
        .from("complaints")
        .select("id", {
          count: "exact",
          head: true,
        })
        .in("status", [
          "new",
          "pending",
          "open",
        ]);

      if (
        profile?.role !== "super_admin" &&
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
        count,
        error,
      } = await complaintQuery;

      if (error) {
        console.error(
          "Open complaints error:",
          error
        );
      } else {
        openComplaints = count || 0;
      }
    } catch (error) {
      console.error(
        "Open complaints exception:",
        error
      );
    }

    setFollowUp({
      pendingRequests,
      openComplaints,
    });
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
      } = await supabase.auth.getUser();

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
      } = await supabase
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

      setProfile(currentProfile);

      let query = supabase
        .from("institutes")
        .select(
          "id, name, code, institute_type, director_name, student_count, teacher_count, is_active, directorate_id"
        )
        .order("name", {
          ascending: true,
        });

      /*
       * =========================================================
       * صلاحيات عرض المعاهد
       * =========================================================
       */

      if (
        currentProfile.role === "super_admin" ||
        currentProfile.role === "director" ||
        currentProfile.role === "deputy"
      ) {
        if (!currentProfile.directorate_id) {
          throw new Error(
            "الحساب غير مرتبط بإدارة تعليمية"
          );
        }

        query = query.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
      } else if (
        currentProfile.role === "sheikh" ||
        currentProfile.role ===
          "institute_deputy" ||
        currentProfile.role === "teacher" ||
        currentProfile.role === "employee" ||
        currentProfile.role === "it_admin"
      ) {
        if (!currentProfile.institute_id) {
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

      setInstitutes(loadedInstitutes);

      const instituteIds =
        loadedInstitutes.map(
          (item) => item.id
        );

      const currentDate =
        getTodayDate();

      setToday(currentDate);

      /*
       * تشغيل بيانات المتابعة والحضور
       * بشكل مستقل حتى لا تعطل لوحة التحكم.
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

  /*
   * =========================================================
   * إحصائيات الحضور اليوم
   * =========================================================
   */

  const attendanceSummary =
    useMemo(() => {
      return attendanceByInstitute.reduce(
        (summary, item) => ({
          present:
            summary.present +
            item.present,

          absent:
            summary.absent +
            item.absent,

          late:
            summary.late +
            item.late,

          excused:
            summary.excused +
            item.excused,

          total:
            summary.total +
            item.total,
        }),
        getEmptyAttendanceSummary()
      );
    }, [attendanceByInstitute]);

  const attendanceRate =
    attendanceSummary.total > 0
      ? Math.round(
          (attendanceSummary.present /
            attendanceSummary.total) *
            100
        )
      : 0;

  const recordedInstitutes =
    attendanceByInstitute.filter(
      (item) => item.total > 0
    ).length;

  const notRecordedInstitutes =
    Math.max(
      totalInstitutes -
        recordedInstitutes,
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
          : profile?.role === "teacher"
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
    profile?.role === "director" ||
    profile?.role === "deputy";

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
                value={
                  totalInstitutes
                }
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
                  <GraduationCap
                    size={22}
                  />
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
              مؤشرات اليوم
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  مؤشرات اليوم
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  ملخص الحضور والغياب المسجل اليوم
                </p>
              </div>

              {today && (
                <span className="text-xs font-semibold text-slate-400">
                  {today}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MiniMetric
                title="الحضور"
                value={
                  attendanceSummary.present
                }
                icon={
                  <CheckCircle2 size={20} />
                }
              />

              <MiniMetric
                title="الغياب"
                value={
                  attendanceSummary.absent
                }
                icon={
                  <XCircle size={20} />
                }
              />

              <MiniMetric
                title="التأخير"
                value={
                  attendanceSummary.late
                }
                icon={
                  <Activity size={20} />
                }
              />

              <MiniMetric
                title="المعاهد التي سجلت"
                value={
                  recordedInstitutes
                }
                icon={
                  <Building2 size={20} />
                }
              />

              <MiniMetric
                title="نسبة الحضور"
                value={
                  attendanceRate
                }
                icon={
                  <FileBarChart size={20} />
                }
              />
            </div>
          </section>

          {/* =====================================================
              يحتاج تدخل المدير
          ====================================================== */}

          {isCentralManager && (
            <section className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-black text-slate-900">
                  يحتاج تدخل المدير
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أهم العناصر التي تحتاج إلى متابعة إدارية
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {/* طلبات معلقة */}

                <Link
                  href="/institute-requests"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <ClipboardList
                        size={22}
                      />
                    </div>

                    <span
                      className={
                        followUp.pendingRequests >
                        0
                          ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                          : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                      }
                    >
                      {followUp.pendingRequests >
                      0
                        ? "تحتاج متابعة"
                        : "لا توجد طلبات معلقة"}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    طلبات المعاهد المعلقة
                  </p>

                  <p className="mt-1 text-3xl font-black text-slate-900">
                    {followUp.pendingRequests.toLocaleString(
                      "ar-EG"
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-500 group-hover:text-slate-900">
                    مراجعة الطلبات
                    <ArrowLeft size={14} />
                  </div>
                </Link>

                {/* الشكاوى */}

                <Link
                  href="/complaints"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <AlertTriangle
                        size={22}
                      />
                    </div>

                    <span
                      className={
                        followUp.openComplaints >
                        0
                          ? "rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700"
                          : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                      }
                    >
                      {followUp.openComplaints >
                      0
                        ? "تحتاج متابعة"
                        : "لا توجد شكاوى مفتوحة"}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    الشكاوى المفتوحة
                  </p>

                  <p className="mt-1 text-3xl font-black text-slate-900">
                    {followUp.openComplaints.toLocaleString(
                      "ar-EG"
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-500 group-hover:text-slate-900">
                    مراجعة الشكاوى
                    <ArrowLeft size={14} />
                  </div>
                </Link>

                {/* الحضور */}

                <Link
                  href="/attendance"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Activity size={22} />
                    </div>

                    <span
                      className={
                        notRecordedInstitutes >
                        0
                          ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                          : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                      }
                    >
                      {notRecordedInstitutes >
                      0
                        ? "توجد متابعة"
                        : "تم التسجيل"}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    المعاهد التي لم تسجل الحضور
                  </p>

                  <p className="mt-1 text-3xl font-black text-slate-900">
                    {notRecordedInstitutes.toLocaleString(
                      "ar-EG"
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-500 group-hover:text-slate-900">
                    متابعة الحضور
                    <ArrowLeft size={14} />
                  </div>
                </Link>
              </div>
            </section>
          )}

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
                  <GraduationCap
                    size={21}
                  />
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
                  <ClipboardList
                    size={21}
                  />
                }
              />

              <QuickAction
                title="التقارير والإحصائيات"
                description="عرض مؤشرات وتقارير الحضور والطلاب."
                href="/attendance-report"
                icon={
                  <FileBarChart
                    size={21}
                  />
                }
              />
            </div>
          </section>

          {/* =====================================================
              حالة الحضور لكل معهد
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  حالة الحضور اليوم
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  متابعة تسجيل الحضور في كل معهد
                </p>
              </div>

              <Link
                href="/attendance"
                className="hidden items-center gap-1 text-sm font-bold text-slate-700 hover:text-slate-950 sm:flex"
              >
                فتح الحضور والغياب
                <ArrowLeft size={16} />
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-52 animate-pulse rounded-2xl bg-white shadow-sm"
                    />
                  )
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {institutes.map(
                  (institute) => {
                    const attendance =
                      getInstituteAttendance(
                        institute.id
                      );

                    const instituteAttendanceRate =
                      attendance.total >
                      0
                        ? Math.round(
                            (attendance.present /
                              attendance.total) *
                              100
                          )
                        : 0;

                    return (
                      <Link
                        key={
                          institute.id
                        }
                        href={`/institutes/${institute.id}`}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                              <Building2
                                size={21}
                              />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-slate-900">
                                {
                                  institute.name
                                }
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  institute.code
                                }
                              </p>
                            </div>
                          </div>

                          <AttendanceBadge
                            recorded={
                              attendance.total >
                              0
                            }
                          />
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-emerald-50 p-3">
                            <div className="text-xs text-emerald-700">
                              حاضر
                            </div>

                            <div className="mt-1 text-lg font-black text-emerald-800">
                              {attendance.present.toLocaleString(
                                "ar-EG"
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl bg-red-50 p-3">
                            <div className="text-xs text-red-700">
                              غائب
                            </div>

                            <div className="mt-1 text-lg font-black text-red-800">
                              {attendance.absent.toLocaleString(
                                "ar-EG"
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl bg-amber-50 p-3">
                            <div className="text-xs text-amber-700">
                              متأخر
                            </div>

                            <div className="mt-1 text-lg font-black text-amber-800">
                              {attendance.late.toLocaleString(
                                "ar-EG"
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-500">
                              نسبة الحضور
                            </span>

                            <span className="font-black text-slate-900">
                              {instituteAttendanceRate}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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

                        <div className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-slate-500 transition group-hover:text-slate-900">
                          عرض تفاصيل المعهد
                          <ArrowLeft
                            size={14}
                          />
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* =====================================================
              المعاهد
          ====================================================== */}

          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {isItAdmin
                    ? "المعهد التابع للحساب"
                    : "المعاهد التابعة للإدارة"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isItAdmin
                    ? "بيانات المعهد المرتبط بحساب مسؤول تكنولوجيا المعلومات."
                    : "استعرض المعاهد وانتقل إلى تفاصيل أي معهد."}
                </p>
              </div>

              {isCentralManager && (
                <Link
                  href="/institutes"
                  className="hidden items-center gap-1 text-sm font-bold text-slate-700 hover:text-slate-950 sm:flex"
                >
                  عرض الكل
                  <ArrowLeft size={16} />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-52 animate-pulse rounded-2xl bg-white shadow-sm"
                    />
                  )
                )}
              </div>
            ) : institutes.length ===
              0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Building2
                    size={25}
                  />
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  {isItAdmin
                    ? "لا يوجد معهد مرتبط بالحساب"
                    : "لا توجد بيانات معاهد"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {isItAdmin
                    ? "يرجى التأكد من ارتباط حساب مسؤول تكنولوجيا المعلومات بالمعهد الصحيح."
                    : "لا توجد معاهد مرتبطة بالحساب الحالي أو تعذر تحميل بياناتها."}
                </p>

                {isCentralManager && (
                  <Link
                    href="/institutes"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Building2
                      size={17}
                    />
                    إدارة المعاهد
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {institutes.map(
                  (institute) => {
                    const attendance =
                      getInstituteAttendance(
                        institute.id
                      );

                    return (
                      <Link
                        key={
                          institute.id
                        }
                        href={`/institutes/${institute.id}`}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                              <Building2
                                size={21}
                              />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-slate-900">
                                {
                                  institute.name
                                }
                              </h3>

                              {institute.code && (
                                <p className="mt-1 text-xs text-slate-500">
                                  كود المعهد:{" "}
                                  {
                                    institute.code
                                  }
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

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">
                              الطلاب
                            </div>

                            <div className="mt-1 text-lg font-black text-slate-900">
                              {Number(
                                institute.student_count ||
                                  0
                              ).toLocaleString(
                                "ar-EG"
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">
                              المدرسون
                            </div>

                            <div className="mt-1 text-lg font-black text-slate-900">
                              {Number(
                                institute.teacher_count ||
                                  0
                              ).toLocaleString(
                                "ar-EG"
                              )}
                            </div>
                          </div>
                        </div>

                        {/* حالة الحضور داخل كارت المعهد */}

                        <div className="mt-4 rounded-xl bg-slate-50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">
                              حضور اليوم
                            </span>

                            <AttendanceBadge
                              recorded={
                                attendance.total >
                                0
                              }
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-xs text-emerald-600">
                                حاضر
                              </div>

                              <div className="mt-1 font-black text-slate-900">
                                {
                                  attendance.present
                                }
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-red-600">
                                غائب
                              </div>

                              <div className="mt-1 font-black text-slate-900">
                                {
                                  attendance.absent
                                }
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-amber-600">
                                متأخر
                              </div>

                              <div className="mt-1 font-black text-slate-900">
                                {
                                  attendance.late
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        {institute.director_name && (
                          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">
                              شيخ المعهد:
                            </span>{" "}
                            {
                              institute.director_name
                            }
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-slate-500 transition group-hover:text-slate-900">
                          عرض تفاصيل المعهد
                          <ArrowLeft
                            size={14}
                          />
                        </div>
                      </Link>
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
                  <CheckCircle2
                    size={21}
                  />
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
                  <CheckCircle2
                    size={21}
                  />
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
                  <CheckCircle2
                    size={21}
                  />
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
