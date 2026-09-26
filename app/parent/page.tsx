"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Baby,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Loader2,
  MessageSquareWarning,
  Users,
  ArrowLeft,
  PlusCircle,
  ClipboardList,
  LogOut,
  Mail,
  Phone,
  X,
  UserRound,
  School,
  Hash,
  VenusAndMars,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
};

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

type DashboardResponse = {
  success: boolean;
  message?: string;
  parent?: Profile;
  students?: Student[];
};

export default function ParentPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // الطالب المختار لعرض التفاصيل
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  useEffect(() => {
    loadParentData();
  }, []);

  async function loadParentData() {
    setLoading(true);
    setError("");

    try {
      // --------------------------------------------------
      // 1) بيانات دخول ولي الأمر
      // --------------------------------------------------
      const nationalId = sessionStorage.getItem("parent_national_id");
      const email = sessionStorage.getItem("parent_email");

      if (!nationalId || !email) {
        router.replace("/parent-login");
        return;
      }

      // --------------------------------------------------
      // 2) تحميل لوحة ولي الأمر
      // --------------------------------------------------
      const { data, error: rpcError } = await supabase.rpc(
        "get_parent_dashboard",
        {
          p_national_id: nationalId,
          p_email: email,
        }
      );

      if (rpcError) {
        console.error("Parent dashboard RPC error:", rpcError);

        setError(
          "تعذر تحميل بيانات ولي الأمر. يرجى المحاولة مرة أخرى."
        );

        setLoading(false);
        return;
      }

      const result = data as DashboardResponse;

      if (!result?.success || !result.parent) {
        sessionStorage.removeItem("parent_national_id");
        sessionStorage.removeItem("parent_email");

        setError(
          result?.message ||
            "بيانات ولي الأمر غير صحيحة أو لم يعد الحساب نشطًا."
        );

        setLoading(false);

        setTimeout(() => {
          router.replace("/parent-login");
        }, 1800);

        return;
      }

      // --------------------------------------------------
      // 3) حفظ البيانات
      // --------------------------------------------------
      setProfile(result.parent);
      setStudents(result.students || []);
    } catch (err) {
      console.error("Parent dashboard error:", err);

      setError(
        "حدث خطأ غير متوقع أثناء تحميل لوحة ولي الأمر."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // تسجيل الخروج
  // --------------------------------------------------
  function handleLogout() {
    sessionStorage.removeItem("parent_national_id");
    sessionStorage.removeItem("parent_email");

    router.replace("/parent-login");
  }

  // --------------------------------------------------
  // متابعة حضور الطالب
  // --------------------------------------------------
  function handleAttendance(student: Student) {
    /*
      نرسل بيانات الطالب في الرابط.
      سننشئ صفحة /parent/attendance في الخطوة التالية
      لتعرض حضور هذا الطالب فقط.
    */
    router.push(
      `/parent/attendance?student_id=${encodeURIComponent(
        student.id
      )}`
    );
  }

  // --------------------------------------------------
  // عرض تفاصيل الطالب
  // --------------------------------------------------
  function handleStudentDetails(student: Student) {
    setSelectedStudent(student);
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4 text-slate-600">
          <Loader2
            className="animate-spin text-emerald-700"
            size={32}
          />

          <span className="font-semibold">
            جاري تحميل لوحة ولي الأمر...
          </span>
        </div>
      </main>
    );
  }

  const activeStudents = students.filter(
    (student) => student.is_active
  ).length;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100">

      {/* ==================================================
          Header
      ================================================== */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                لوحة ولي الأمر
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                مرحبًا {profile?.full_name || "ولي الأمر"}
              </p>
            </div>

            <div className="flex items-center gap-3">

              <Link
                href="/parent-complaints"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
              >
                <MessageSquareWarning size={19} />
                شكاوى أولياء الأمور
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition"
              >
                <LogOut size={18} />
                خروج
              </button>

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
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 font-semibold">
            {error}
          </div>
        )}

        {/* ==================================================
            Parent Information
        ================================================== */}
        {profile && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 mb-8">

            <div className="flex items-center gap-3 mb-5">

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  بيانات ولي الأمر
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  بيانات الحساب المستخدم للدخول إلى النظام
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-3">

                  <Users
                    size={20}
                    className="text-emerald-700"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      الاسم
                    </p>

                    <p className="font-bold text-slate-800 mt-1">
                      {profile.full_name || "ولي الأمر"}
                    </p>
                  </div>

                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-3">

                  <Mail
                    size={20}
                    className="text-blue-700"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      البريد الإلكتروني
                    </p>

                    <p className="font-bold text-slate-800 mt-1 break-all">
                      {profile.email || "غير مسجل"}
                    </p>
                  </div>

                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-3">

                  <Phone
                    size={20}
                    className="text-purple-700"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      رقم الهاتف
                    </p>

                    <p className="font-bold text-slate-800 mt-1">
                      {profile.phone || "غير مسجل"}
                    </p>
                  </div>

                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-3">

                  <GraduationCap
                    size={20}
                    className="text-amber-700"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      نوع الحساب
                    </p>

                    <p className="font-bold text-slate-800 mt-1">
                      ولي أمر
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </section>
        )}

        {/* ==================================================
            Statistics
        ================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  الأبناء المرتبطون
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {students.length}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users size={24} />
              </div>

            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  الأبناء النشطون
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {activeStudents}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>

            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  الحضور والغياب
                </p>

                <p className="text-sm font-semibold text-slate-700 mt-2">
                  متابعة الأبناء
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <CalendarCheck size={24} />
              </div>

            </div>
          </div>

          <Link
            href="/parent-complaints"
            className="group bg-white rounded-2xl border border-red-200 p-5 hover:border-red-400 hover:shadow-md transition cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  الشكاوى
                </p>

                <p className="text-base font-bold text-slate-800 mt-2 group-hover:text-red-700 transition">
                  تقديم ومتابعة الشكاوى
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  اضغط للدخول إلى مركز الشكاوى
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                <MessageSquareWarning size={24} />
              </div>

            </div>

            <div className="mt-4 flex items-center justify-between text-sm">

              <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                <PlusCircle size={17} />
                تقديم شكوى
              </span>

              <ArrowLeft
                size={18}
                className="text-red-500 group-hover:-translate-x-1 transition"
              />

            </div>

          </Link>

        </section>

        {/* ==================================================
            Quick Complaint
        ================================================== */}
        <section className="mb-8">

          <div className="rounded-3xl bg-gradient-to-l from-red-700 to-red-500 text-white p-6 shadow-sm">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div>

                <div className="flex items-center gap-3">

                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <MessageSquareWarning size={26} />
                  </div>

                  <div>

                    <h2 className="text-xl font-bold">
                      هل لديك مشكلة أو ملاحظة؟
                    </h2>

                    <p className="text-sm text-red-100 mt-1">
                      يمكنك تقديم شكوى ومتابعتها حتى يتم التعامل معها من المعهد.
                    </p>

                  </div>

                </div>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">

                <Link
                  href="/parent-complaints"
                  className="inline-flex items-center justify-center gap-2 bg-white text-red-700 hover:bg-red-50 px-5 py-3 rounded-xl font-bold transition"
                >
                  <PlusCircle size={20} />
                  تقديم شكوى جديدة
                </Link>

                <Link
                  href="/parent-complaints"
                  className="inline-flex items-center justify-center gap-2 bg-red-800/40 hover:bg-red-800/60 text-white border border-white/20 px-5 py-3 rounded-xl font-bold transition"
                >
                  <ClipboardList size={20} />
                  متابعة الشكاوى
                </Link>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            Children
        ================================================== */}
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">

            <div className="flex items-center gap-3">

              <Baby
                className="text-emerald-700"
                size={24}
              />

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  أبنائي
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  الطلاب المرتبطون بحساب ولي الأمر
                </p>

              </div>

            </div>

          </div>

          {students.length === 0 ? (

            <div className="p-10 text-center">

              <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                <Users size={30} />
              </div>

              <h3 className="text-lg font-bold text-slate-700">
                لم يتم ربط أي طالب بهذا الحساب بعد
              </h3>

              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                عند قيام إدارة المعهد بربط أحد الأبناء بهذا الحساب،
                ستظهر بياناته هنا تلقائيًا.
              </p>

            </div>

          ) : (

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

              {students.map((student) => (

                <div
                  key={student.id}
                  className="rounded-2xl border border-slate-200 p-5 hover:shadow-md transition"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <h3 className="text-lg font-bold text-slate-800">
                        {student.full_name}
                      </h3>

                      {student.student_code && (
                        <p className="text-sm text-slate-500 mt-1">
                          كود الطالب: {student.student_code}
                        </p>
                      )}

                    </div>

                    <span
                      className={
                        "px-3 py-1 rounded-full text-xs font-semibold " +
                        (student.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {student.is_active ? "نشط" : "غير نشط"}
                    </span>

                  </div>

                  <div className="mt-5 space-y-3">

                    <div className="flex items-start gap-3 text-sm">
                      <BookOpen
                        size={18}
                        className="text-slate-400 mt-0.5 shrink-0"
                      />

                      <span className="text-slate-600">
                        المعهد:
                      </span>

                      <span className="font-semibold text-slate-800">
                        {student.institute_name || "غير محدد"}
                      </span>
                    </div>

                    {student.institute_code && (
                      <div className="text-sm text-slate-500">
                        كود المعهد:{" "}
                        <span className="font-semibold text-slate-700">
                          {student.institute_code}
                        </span>
                      </div>
                    )}

                    {student.gender && (
                      <div className="text-sm text-slate-600">
                        النوع:{" "}
                        <span className="font-semibold text-slate-800">
                          {student.gender}
                        </span>
                      </div>
                    )}

                    {student.date_of_birth && (
                      <div className="text-sm text-slate-600">
                        تاريخ الميلاد:{" "}
                        <span className="font-semibold text-slate-800">
                          {student.date_of_birth}
                        </span>
                      </div>
                    )}

                  </div>

                  {/* ==================================================
                      Actions
                  ================================================== */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">

                    {/* متابعة الحضور */}
                    <button
                      type="button"
                      onClick={() => handleAttendance(student)}
                      className="rounded-xl bg-emerald-50 text-emerald-700 py-2.5 text-sm font-semibold hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                    >
                      <CalendarCheck size={17} />
                      متابعة الحضور
                    </button>

                    {/* التفاصيل */}
                    <button
                      type="button"
                      onClick={() => handleStudentDetails(student)}
                      className="rounded-xl bg-slate-100 text-slate-700 py-2.5 text-sm font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
                    >
                      <UserRound size={17} />
                      التفاصيل
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>

      {/* ==================================================
          Student Details Modal
      ================================================== */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedStudent(null)}
        >

          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="bg-emerald-700 text-white px-6 py-5">

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <GraduationCap size={25} />
                  </div>

                  <div>

                    <h2 className="text-xl font-bold">
                      بيانات الطالب
                    </h2>

                    <p className="text-sm text-emerald-100 mt-1">
                      {selectedStudent.full_name}
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                  aria-label="إغلاق"
                >
                  <X size={22} />
                </button>

              </div>

            </div>

            {/* Modal Body */}
            <div className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Name */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

                  <div className="flex items-center gap-3">

                    <UserRound
                      size={20}
                      className="text-emerald-700"
                    />

                    <div>

                      <p className="text-xs text-slate-500">
                        اسم الطالب
                      </p>

                      <p className="font-bold text-slate-800 mt-1">
                        {selectedStudent.full_name}
                      </p>

                    </div>

                  </div>

                </div>

                {/* Student Code */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

                  <div className="flex items-center gap-3">

                    <Hash
                      size={20}
                      className="text-blue-700"
                    />

                    <div>

                      <p className="text-xs text-slate-500">
                        كود الطالب
                      </p>

                      <p className="font-bold text-slate-800 mt-1">
                        {selectedStudent.student_code || "غير مسجل"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* Gender */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

                  <div className="flex items-center gap-3">

                    <VenusAndMars
                      size={20}
                      className="text-purple-700"
                    />

                    <div>

                      <p className="text-xs text-slate-500">
                        النوع
                      </p>

                      <p className="font-bold text-slate-800 mt-1">
                        {selectedStudent.gender || "غير محدد"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* Institute */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

                  <div className="flex items-center gap-3">

                    <School
                      size={20}
                      className="text-amber-700"
                    />

                    <div>

                      <p className="text-xs text-slate-500">
                        المعهد
                      </p>

                      <p className="font-bold text-slate-800 mt-1">
                        {selectedStudent.institute_name ||
                          "غير محدد"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* Institute Code */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

                  <div className="flex items-center gap-3">

                    <BookOpen
                      size={20}
                      className="text-cyan-700"
                    />

                    <div>

                      <p className="text-xs text-slate-500">
                        كود المعهد
                      </p>

                      <p className="font-bold text-slate-800 mt-1">
                        {selectedStudent.institute_code ||
                          "غير مسجل"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* Status */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

                  <div className="flex items-center gap-3">

                    <GraduationCap
                      size={20}
                      className="text-emerald-700"
                    />

                    <div>

                      <p className="text-xs text-slate-500">
                        حالة الطالب
                      </p>

                      <p
                        className={
                          "font-bold mt-1 " +
                          (selectedStudent.is_active
                            ? "text-emerald-700"
                            : "text-slate-500")
                        }
                      >
                        {selectedStudent.is_active
                          ? "نشط"
                          : "غير نشط"}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">

                <button
                  type="button"
                  onClick={() => handleAttendance(selectedStudent)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 font-bold transition"
                >
                  <CalendarCheck size={19} />
                  متابعة الحضور والغياب
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="sm:w-32 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 font-bold transition"
                >
                  إغلاق
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
