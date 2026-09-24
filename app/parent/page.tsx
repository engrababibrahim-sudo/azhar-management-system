
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
} from "lucide-react";
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
  class_id: string | null;
  is_active: boolean;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
};

export default function ParentPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [institutes, setInstitutes] = useState<Record<string, Institute>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadParentData();
  }, []);

  async function loadParentData() {
    setLoading(true);
    setError("");

    try {
      // --------------------------------------------------
      // 1) Get logged-in user
      // --------------------------------------------------
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("يجب تسجيل الدخول أولًا");
        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // 2) Load parent profile
      // --------------------------------------------------
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Parent profile error:", profileError);

        setError("لم يتم العثور على بيانات ولي الأمر");
        setLoading(false);
        return;
      }

      if (profileData.role !== "parent") {
        setError("هذا الحساب ليس حساب ولي أمر");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // --------------------------------------------------
      // 3) Load students linked to this parent
      // --------------------------------------------------
      const { data: studentsData, error: studentsError } =
        await supabase
          .from("students")
          .select(
            "id, full_name, student_code, gender, date_of_birth, institute_id, class_id, is_active"
          )
          .eq("parent_id", user.id)
          .order("full_name");

      if (studentsError) {
        console.error("Students error:", studentsError);

        setError("تعذر تحميل بيانات الأبناء");
        setLoading(false);
        return;
      }

      const loadedStudents = studentsData || [];

      setStudents(loadedStudents);

      // --------------------------------------------------
      // 4) Load institutes connected to the students
      // --------------------------------------------------
      if (loadedStudents.length > 0) {
        const instituteIds = [
          ...new Set(
            loadedStudents
              .map((student) => student.institute_id)
              .filter(Boolean)
          ),
        ];

        if (instituteIds.length > 0) {
          const {
            data: institutesData,
            error: institutesError,
          } = await supabase
            .from("institutes")
            .select("id, name, code")
            .in("id", instituteIds);

          if (institutesError) {
            console.error(
              "Institutes load error:",
              institutesError
            );

            setError(
              "تم تحميل بيانات الأبناء، ولكن تعذر تحميل بيانات المعهد. " +
                institutesError.message
            );

            setInstitutes({});
          } else {
            const instituteMap: Record<string, Institute> = {};

            (institutesData || []).forEach((institute) => {
              instituteMap[institute.id] = institute;
            });

            setInstitutes(instituteMap);
          }
        }
      }
    } catch (err) {
      console.error("Parent dashboard error:", err);
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" size={24} />
          <span>جاري تحميل لوحة ولي الأمر...</span>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------
  return (
    <main dir="rtl" className="min-h-screen bg-slate-100">
      {/* Header */}
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
              {/* Parent complaints button */}
              <Link
                href="/parent-complaints"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
              >
                <MessageSquareWarning size={19} />
                شكاوى أولياء الأمور
              </Link>

              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center">
                <Users size={24} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Linked children */}
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

          {/* Active children */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  الأبناء النشطون
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {
                    students.filter(
                      (student) => student.is_active
                    ).length
                  }
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
            </div>
          </div>

          {/* Attendance */}
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

          {/* Complaints */}
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

              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center group-hover:bg-red-100 transition">
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

        {/* Quick complaint section */}
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

        {/* Children */}
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Baby className="text-emerald-700" size={24} />

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
                عند قيام إدارة المعهد بربط أحد الأبناء بهذا
                الحساب، ستظهر بياناته هنا تلقائيًا.
              </p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {students.map((student) => {
                const institute =
                  institutes[student.institute_id];

                return (
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
                      {/* Institute */}
                      <div className="flex items-start gap-3 text-sm">
                        <BookOpen
                          size={18}
                          className="text-slate-400 mt-0.5 shrink-0"
                        />

                        <span className="text-slate-600">
                          المعهد:
                        </span>

                        <span className="font-semibold text-slate-800">
                          {institute?.name || "غير محدد"}
                        </span>
                      </div>

                      {/* Institute code */}
                      {institute?.code && (
                        <div className="text-sm text-slate-500">
                          كود المعهد:{" "}
                          <span className="font-semibold text-slate-700">
                            {institute.code}
                          </span>
                        </div>
                      )}

                      {/* Gender */}
                      {student.gender && (
                        <div className="text-sm text-slate-600">
                          النوع:{" "}
                          <span className="font-semibold text-slate-800">
                            {student.gender}
                          </span>
                        </div>
                      )}

                      {/* Date of birth */}
                      {student.date_of_birth && (
                        <div className="text-sm text-slate-600">
                          تاريخ الميلاد:{" "}
                          <span className="font-semibold text-slate-800">
                            {student.date_of_birth}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className="rounded-xl bg-emerald-50 text-emerald-700 py-2.5 text-sm font-semibold hover:bg-emerald-100 transition"
                      >
                        متابعة الحضور
                      </button>

                      <button
                        type="button"
                        className="rounded-xl bg-slate-100 text-slate-700 py-2.5 text-sm font-semibold hover:bg-slate-200 transition"
                      >
                        التفاصيل
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

