"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  MessageSquareWarning,
  UserRound,
  Users,
  XCircle,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  student_code: string | null;
  gender: string | null;
  date_of_birth: string | null;
  institute_id: string;
  institute_name: string | null;
  institute_code: string | null;
  class_id: string | null;
  is_active: boolean;
};

type ParentProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
};

type AttendanceRecord = {
  student_id: string;
  attendance_date: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string | null;
};

type ParentDashboardResponse = {
  success: boolean;
  message?: string;
  parent?: ParentProfile;
  students?: Student[];
};

const statusInfo = {
  present: {
    label: "حاضر",
    icon: CheckCircle2,
    wrapper:
      "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  absent: {
    label: "غائب",
    icon: XCircle,
    wrapper:
      "bg-red-50 border-red-200 text-red-700",
  },
  late: {
    label: "متأخر",
    icon: Clock3,
    wrapper:
      "bg-amber-50 border-amber-200 text-amber-700",
  },
  excused: {
    label: "معذور",
    icon: CalendarDays,
    wrapper:
      "bg-blue-50 border-blue-200 text-blue-700",
  },
};

export default function ParentAttendancePage() {
  const searchParams = useSearchParams();

  const studentId =
    searchParams.get("student_id");

  const [parent, setParent] =
    useState<ParentProfile | null>(null);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [loading, setLoading] =
    useState(true);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadParentAndStudent();
  }, [studentId]);

  useEffect(() => {
    if (student) {
      loadAttendance();
    }
  }, [student, selectedMonth]);

  async function loadParentAndStudent() {
    setLoading(true);
    setError("");

    try {
      const nationalId =
        sessionStorage.getItem(
          "parent_national_id"
        );

      const email =
        sessionStorage.getItem(
          "parent_email"
        );

      if (!nationalId || !email) {
        window.location.href =
          "/parent-login";
        return;
      }

      if (!studentId) {
        setError(
          "لم يتم تحديد الطالب المطلوب عرض حضوره."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // تحميل بيانات ولي الأمر وأبنائه
      // ---------------------------------------------
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "get_parent_dashboard",
        {
          p_national_id: nationalId,
          p_email: email,
        }
      );

      if (rpcError) {
        console.error(
          "Parent dashboard error:",
          rpcError
        );

        setError(
          "تعذر التحقق من بيانات ولي الأمر."
        );

        setLoading(false);
        return;
      }

      const result =
        data as ParentDashboardResponse;

      if (
        !result?.success ||
        !result.parent
      ) {
        sessionStorage.removeItem(
          "parent_national_id"
        );

        sessionStorage.removeItem(
          "parent_email"
        );

        setError(
          "بيانات ولي الأمر غير صحيحة أو لم يعد الحساب نشطًا."
        );

        setLoading(false);

        setTimeout(() => {
          window.location.href =
            "/parent-login";
        }, 1500);

        return;
      }

      // ---------------------------------------------
      // البحث عن الطالب داخل أبناء ولي الأمر فقط
      // ---------------------------------------------
      const linkedStudent =
        (result.students || []).find(
          (item) => item.id === studentId
        );

      if (!linkedStudent) {
        setError(
          "هذا الطالب غير مرتبط بحساب ولي الأمر."
        );

        setLoading(false);
        return;
      }

      setParent(result.parent);
      setStudent(linkedStudent);
    } catch (err) {
      console.error(
        "Parent attendance error:",
        err
      );

      setError(
        "حدث خطأ غير متوقع أثناء تحميل بيانات الطالب."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    if (!student) {
      return;
    }

    setAttendanceLoading(true);
    setError("");

    try {
      const startDate =
        `${selectedMonth}-01`;

      const [year, month] =
        selectedMonth.split("-");

      const lastDay = new Date(
        Number(year),
        Number(month),
        0
      ).getDate();

      const endDate =
        `${selectedMonth}-${String(
          lastDay
        ).padStart(2, "0")}`;

      const {
        data,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "student_id, attendance_date, status, notes"
        )
        .eq(
          "student_id",
          student.id
        )
        .eq(
          "institute_id",
          student.institute_id
        )
        .gte(
          "attendance_date",
          startDate
        )
        .lte(
          "attendance_date",
          endDate
        )
        .order(
          "attendance_date",
          {
            ascending: false,
          }
        );

      if (attendanceError) {
        console.error(
          "Attendance error:",
          attendanceError
        );

        setError(
          "تعذر تحميل سجل حضور الطالب."
        );

        setAttendance([]);
        setAttendanceLoading(false);
        return;
      }

      setAttendance(
        (data || []) as AttendanceRecord[]
      );
    } catch (err) {
      console.error(err);

      setError(
        "حدث خطأ أثناء تحميل سجل الحضور."
      );
    } finally {
      setAttendanceLoading(false);
    }
  }

  const statistics = useMemo(() => {
    return {
      present: attendance.filter(
        (item) =>
          item.status === "present"
      ).length,

      absent: attendance.filter(
        (item) =>
          item.status === "absent"
      ).length,

      late: attendance.filter(
        (item) =>
          item.status === "late"
      ).length,

      excused: attendance.filter(
        (item) =>
          item.status === "excused"
      ).length,
    };
  }, [attendance]);

  const attendanceRate =
    attendance.length > 0
      ? Math.round(
          (statistics.present /
            attendance.length) *
            100
        )
      : 0;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4 text-slate-600">
          <Loader2
            size={34}
            className="animate-spin text-emerald-700"
          />

          <span className="font-semibold">
            جاري تحميل بيانات الحضور...
          </span>
        </div>
      </main>
    );
  }

  if (error && !student) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 p-6"
      >
        <div className="max-w-3xl mx-auto">

          <Link
            href="/parent"
            className="inline-flex items-center gap-2 text-emerald-700 font-semibold mb-6"
          >
            <ArrowRight size={19} />
            العودة إلى لوحة ولي الأمر
          </Link>

          <div className="bg-white rounded-3xl border border-red-200 p-8 text-center">

            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={30} />
            </div>

            <h1 className="text-xl font-bold text-slate-800">
              تعذر فتح سجل الحضور
            </h1>

            <p className="text-red-600 mt-3">
              {error}
            </p>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100"
    >

      {/* ==================================================
          Header
      ================================================== */}
      <header className="bg-white border-b border-slate-200">

        <div className="max-w-7xl mx-auto px-6 py-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <Link
                href="/parent"
                className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-semibold mb-3"
              >
                <ArrowRight size={18} />
                العودة إلى لوحة ولي الأمر
              </Link>

              <h1 className="text-2xl font-bold text-slate-800">
                متابعة الحضور والغياب
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                سجل حضور الطالب ومتابعته شهريًا
              </p>

            </div>

            <div className="flex items-center gap-3">

              <Link
                href="/parent-complaints"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
              >
                <MessageSquareWarning
                  size={18}
                />
                الشكاوى
              </Link>

              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center">
                <Users size={24} />
              </div>

            </div>

          </div>

        </div>

      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ==================================================
            Error
        ================================================== */}
        {error && student && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 font-semibold flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* ==================================================
            Student Information
        ================================================== */}
        {student && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 mb-6">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div className="flex items-center gap-4">

                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <GraduationCap
                    size={31}
                  />
                </div>

                <div>

                  <h2 className="text-2xl font-bold text-slate-800">
                    {student.full_name}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {student.student_code
                      ? `كود الطالب: ${student.student_code}`
                      : "كود الطالب غير مسجل"}
                  </p>

                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">

                  <BookOpen size={17} />

                  {student.institute_name ||
                    "المعهد غير محدد"}

                </span>

                <span
                  className={
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold " +
                    (student.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500")
                  }
                >
                  {student.is_active
                    ? "طالب نشط"
                    : "غير نشط"}
                </span>

              </div>

            </div>

          </section>
        )}

        {/* ==================================================
            Month Filter
        ================================================== */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">

            <div>

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                الشهر
              </label>

              <div className="relative">

                <CalendarDays
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(
                      event.target.value
                    )
                  }
                  className="w-full md:w-64 rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-emerald-500"
                />

              </div>

            </div>

            <div className="text-sm text-slate-500">
              ولي الأمر:{" "}
              <span className="font-bold text-slate-700">
                {parent?.full_name ||
                  "ولي الأمر"}
              </span>
            </div>

          </div>

        </section>

        {/* ==================================================
            Statistics
        ================================================== */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

          <div className="bg-white rounded-2xl border border-slate-200 p-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <CalendarDays size={23} />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  السجلات
                </p>

                <p className="text-2xl font-bold text-slate-800">
                  {attendance.length}
                </p>

              </div>

            </div>

          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 p-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 size={23} />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  حاضر
                </p>

                <p className="text-2xl font-bold text-emerald-700">
                  {statistics.present}
                </p>

              </div>

            </div>

          </div>

          <div className="bg-white rounded-2xl border border-red-200 p-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                <XCircle size={23} />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  غائب
                </p>

                <p className="text-2xl font-bold text-red-700">
                  {statistics.absent}
                </p>

              </div>

            </div>

          </div>

          <div className="bg-white rounded-2xl border border-amber-200 p-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock3 size={23} />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  متأخر
                </p>

                <p className="text-2xl font-bold text-amber-700">
                  {statistics.late}
                </p>

              </div>

            </div>

          </div>

          <div className="bg-white rounded-2xl border border-blue-200 p-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <GraduationCap size={23} />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  نسبة الحضور
                </p>

                <p className="text-2xl font-bold text-blue-700">
                  {attendanceRate}%
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            Attendance Table
        ================================================== */}
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">

            <div className="flex items-center gap-3">

              <CalendarDays
                size={24}
                className="text-emerald-700"
              />

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  سجل الحضور والغياب
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  بيانات المتابعة الخاصة بهذا الطالب فقط
                </p>

              </div>

            </div>

          </div>

          {attendanceLoading ? (

            <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-500">

              <Loader2
                size={30}
                className="animate-spin text-emerald-700"
              />

              <span className="font-semibold">
                جاري تحميل سجل الحضور...
              </span>

            </div>

          ) : attendance.length === 0 ? (

            <div className="p-12 text-center">

              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={30} />
              </div>

              <h3 className="text-lg font-bold text-slate-700">
                لا توجد سجلات حضور
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                لا توجد بيانات حضور مسجلة لهذا الطالب خلال الشهر المحدد.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">
                      التاريخ
                    </th>

                    <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">
                      اليوم
                    </th>

                    <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">
                      الحالة
                    </th>

                    <th className="text-right px-6 py-4 text-sm font-bold text-slate-700">
                      ملاحظات
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {attendance.map(
                    (record) => {

                      const info =
                        statusInfo[
                          record.status
                        ];

                      const StatusIcon =
                        info.icon;

                      return (
                        <tr
                          key={
                            `${record.student_id}-${record.attendance_date}`
                          }
                          className="hover:bg-slate-50 transition"
                        >

                          <td className="px-6 py-5">

                            <div className="font-semibold text-slate-800">
                              {formatDate(
                                record.attendance_date
                              )}
                            </div>

                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {getArabicDay(
                              record.attendance_date
                            )}
                          </td>

                          <td className="px-6 py-5">

                            <span
                              className={
                                "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold " +
                                info.wrapper
                              }
                            >

                              <StatusIcon
                                size={17}
                              />

                              {info.label}

                            </span>

                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {record.notes ||
                              "—"}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* ==================================================
            Bottom Information
        ================================================== */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">

          <div className="flex items-start gap-3">

            <UserRound
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>

              <p className="font-bold">
                خصوصية بيانات الطالب
              </p>

              <p className="mt-1">
                يتم عرض سجل الحضور للطالب المرتبط بحساب ولي الأمر فقط، ولا يمكن من هذه الصفحة الوصول إلى سجلات الطلاب الآخرين.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatDate(dateString: string) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(date);
}

function getArabicDay(
  dateString: string
) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      weekday: "long",
    }
  ).format(date);
}
