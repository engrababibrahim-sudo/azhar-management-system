
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  ClipboardCheck,
  BarChart3,
  ClipboardList,
  FileText,
  UserCheck,
  BookOpen,
  Send,
  AlertTriangle,
  CircleCheck,
  TrendingUp,
  LogOut,
  ArrowRight,
  RefreshCw,
  MessageSquareWarning,
  Menu,
  X,
  FolderOpen,
  Search,
  Printer,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code: string | null;
  institute_type: string | null;
  educational_stage: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean;
};

type Counts = {
  students: number;
  teachers: number;
  activeStudents: number;
  activeTeachers: number;
};

type InstituteClass = {
  id: string;
  name: string;
  institute_id: string;
  is_active: boolean | null;
};

export default function InstituteDashboard() {
  const params = useParams();
  const router = useRouter();

  const instituteId = params.id as string;

  const [institute, setInstitute] = useState<Institute | null>(null);

  const [counts, setCounts] = useState<Counts>({
    students: 0,
    teachers: 0,
    activeStudents: 0,
    activeTeachers: 0,
  });

  const [classes, setClasses] = useState<InstituteClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [classesError, setClassesError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function loadInstitute(showRefresh = false) {
    if (!instituteId) return;

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setClassesError("");

    const {
      data,
      error: instituteError,
    } = await supabase
      .from("institutes")
      .select(
        "id,name,code,institute_type,educational_stage,director_name,student_count,teacher_count,is_active"
      )
      .eq("id", instituteId)
      .single();

    if (instituteError) {
      console.error(instituteError);

      setError(instituteError.message);
      setInstitute(null);
      setClasses([]);

      setLoading(false);
      setRefreshing(false);

      return;
    }

    setInstitute(data);

    const [
      students,
      teachers,
      activeStudents,
      activeTeachers,
      classesResult,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", instituteId),

      supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", instituteId),

      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", instituteId)
        .eq("is_active", true),

      supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", instituteId)
        .eq("is_active", true),

      /*
       * مهم:
       * نجلب الفصول الخاصة بالمعهد الحالي فقط.
       */
      supabase
        .from("classes")
        .select("id,name,institute_id,is_active")
        .eq("institute_id", instituteId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    setCounts({
      students: students.count ?? 0,
      teachers: teachers.count ?? 0,
      activeStudents: activeStudents.count ?? 0,
      activeTeachers: activeTeachers.count ?? 0,
    });

    if (classesResult.error) {
      console.error(classesResult.error);

      setClasses([]);
      setClassesError("تعذر تحميل فصول المعهد.");
    } else {
      setClasses((classesResult.data ?? []) as InstituteClass[]);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadInstitute();
  }, [instituteId]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("حدث خطأ أثناء تسجيل الخروج");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <RefreshCw
            size={35}
            className="mx-auto animate-spin text-slate-400"
          />

          <p className="mt-4 text-slate-500">
            جاري تحميل الملف المؤسسي...
          </p>
        </div>
      </main>
    );
  }

  if (error || !institute) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle
            size={40}
            className="mx-auto text-red-500"
          />

          <h1 className="mt-4 text-xl font-bold">
            تعذر تحميل المعهد
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {error || "المعهد غير موجود"}
          </p>

          <Link
            href="/institutes"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowRight size={17} />
            العودة إلى المعاهد
          </Link>
        </div>
      </main>
    );
  }

  const studentActiveRate = counts.students
    ? Math.round(
        (counts.activeStudents / counts.students) * 100
      )
    : 0;

  const teacherActiveRate = counts.teachers
    ? Math.round(
        (counts.activeTeachers / counts.teachers) * 100
      )
    : 0;

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 print:bg-white"
    >
      {/* =========================
          Desktop Sidebar
      ========================== */}

      <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 flex-col bg-slate-950 text-white lg:flex print:hidden">
        <Brand institute={institute} />

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <MenuItem
            icon={LayoutDashboard}
            title="الملف المؤسسي"
            active
          />

          <Link
            href={`/students?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={GraduationCap}
              title="الطلاب"
            />
          </Link>

          <Link
            href={`/teachers?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={Users}
              title="المعلمين والموظفين"
            />
          </Link>

          <Link
            href={`/attendance?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={ClipboardCheck}
              title="الحضور والغياب"
            />
          </Link>

          <Link
            href={`/attendance-report?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={BarChart3}
              title="تقارير الحضور"
            />
          </Link>

          <Link
            href={`/institute-tasks?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={ClipboardList}
              title="التكليفات"
            />
          </Link>

          <Link
            href={`/complaints?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={MessageSquareWarning}
              title="الشكاوى والبلاغات"
            />
          </Link>

          <Link
            href={`/visits?instituteId=${institute.id}`}
          >
            <MenuItem
              icon={ClipboardCheck}
              title="الزيارات والتفتيش"
            />
          </Link>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-slate-900">
              إ
            </div>

            <div>
              <div className="text-sm font-semibold">
                إدارة المعهد
              </div>

              <div className="text-xs text-slate-400">
                شيخ المعهد
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500 hover:text-white"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* =========================
          Mobile Menu
      ========================== */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            aria-label="إغلاق القائمة"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/60"
          />

          <aside className="absolute right-0 top-0 flex h-full w-[min(86vw,320px)] flex-col bg-slate-950 text-white">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="font-bold">
                نظام الإدارة الأزهرية
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-4 text-sm font-semibold">
              {institute.name}
            </div>

            <nav className="flex-1 space-y-1 px-4">
              <Link
                href={`/students?instituteId=${institute.id}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MenuItem
                  icon={GraduationCap}
                  title="الطلاب"
                />
              </Link>

              <Link
                href={`/teachers?instituteId=${institute.id}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MenuItem
                  icon={Users}
                  title="المعلمين والموظفين"
                />
              </Link>

              <Link
                href={`/attendance?instituteId=${institute.id}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MenuItem
                  icon={ClipboardCheck}
                  title="الحضور والغياب"
                />
              </Link>

              <Link
                href={`/visits?instituteId=${institute.id}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MenuItem
                  icon={ClipboardCheck}
                  title="الزيارات والتفتيش"
                />
              </Link>
            </nav>

            <div className="p-4">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-red-300"
              >
                <LogOut
                  size={18}
                  className="inline ml-2"
                />

                تسجيل الخروج
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* =========================
          Main
      ========================== */}

      <section className="min-w-0 lg:mr-72">
        {/* Header */}

        <header className="border-b border-slate-200 bg-white print:hidden">
          <div className="flex min-h-20 items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl border p-2.5 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div>
                <div className="text-xs text-slate-400">
                  الإدارة التعليمية الأزهرية
                </div>

                <h1 className="mt-1 text-xl font-bold">
                  الملف المؤسسي للمعهد
                </h1>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="rounded-xl border border-slate-200 p-2.5"
                title="طباعة"
              >
                <Printer size={20} />
              </button>

              <button
                onClick={() => loadInstitute(true)}
                className="rounded-xl border border-slate-200 p-2.5"
                title="تحديث"
              >
                <RefreshCw
                  size={20}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

              <Link
                href="/institutes"
                className="hidden items-center gap-2 rounded-xl border px-3 py-2.5 text-sm sm:flex"
              >
                <ArrowRight size={17} />
                كل المعاهد
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-3 sm:p-6 lg:p-8">
          {/* =========================
              Institute Header
          ========================== */}

          <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Building2 size={30} />
                </div>

                <div>
                  <div className="text-sm text-slate-400">
                    الملف المؤسسي
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    {institute.name}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span>
                      الكود: {institute.code || "-"}
                    </span>

                    <span>•</span>

                    <span>
                      {institute.educational_stage || "-"}
                    </span>

                    <span>•</span>

                    <span>
                      {institute.institute_type || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="text-xs text-slate-400">
                  شيخ المعهد
                </div>

                <div className="mt-1 font-semibold">
                  {institute.director_name || "-"}
                </div>

                <div className="mt-2 text-xs">
                  {institute.is_active
                    ? "المعهد نشط"
                    : "المعهد غير نشط"}
                </div>
              </div>
            </div>
          </section>

          {/* =========================
              Statistics
          ========================== */}

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              icon={GraduationCap}
              title="الطلاب"
              value={counts.students.toLocaleString(
                "ar-EG"
              )}
              description={`${counts.activeStudents.toLocaleString(
                "ar-EG"
              )} نشط`}
            />

            <StatCard
              icon={Users}
              title="المعلمون"
              value={counts.teachers.toLocaleString(
                "ar-EG"
              )}
              description={`${counts.activeTeachers.toLocaleString(
                "ar-EG"
              )} نشط`}
            />

            <StatCard
              icon={UserCheck}
              title="معدل نشاط الطلاب"
              value={`${studentActiveRate}%`}
              description="من إجمالي الطلاب"
              positive={studentActiveRate >= 90}
            />

            <StatCard
              icon={CircleCheck}
              title="معدل نشاط المعلمين"
              value={`${teacherActiveRate}%`}
              description="من إجمالي المعلمين"
              positive={teacherActiveRate >= 90}
            />
          </section>

          {/* =========================
              Basic Data
          ========================== */}

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border bg-white p-5 shadow-sm lg:col-span-2">
              <SectionTitle
                icon={Building2}
                title="البيانات الأساسية"
                text="المعلومات الرسمية المتاحة للمعهد"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info
                  label="اسم المعهد"
                  value={institute.name}
                />

                <Info
                  label="كود المعهد"
                  value={institute.code}
                />

                <Info
                  label="نوع المعهد"
                  value={institute.institute_type}
                />

                <Info
                  label="المرحلة التعليمية"
                  value={institute.educational_stage}
                />

                <Info
                  label="شيخ المعهد"
                  value={institute.director_name}
                />

                <Info
                  label="حالة المعهد"
                  value={
                    institute.is_active
                      ? "نشط"
                      : "غير نشط"
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <SectionTitle
                icon={TrendingUp}
                title="مؤشرات الملف"
                text="محسوبة من البيانات الحالية"
              />

              <Progress
                title="نشاط الطلاب"
                value={studentActiveRate}
              />

              <Progress
                title="نشاط المعلمين"
                value={teacherActiveRate}
              />

              <Progress
                title="اكتمال البيانات الأساسية"
                value={
                  [
                    institute.name,
                    institute.code,
                    institute.institute_type,
                    institute.educational_stage,
                    institute.director_name,
                  ].filter(Boolean).length * 20
                }
              />
            </div>
          </section>

          {/* =========================
              Main Profile Sections
          ========================== */}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ProfileCard
              icon={GraduationCap}
              title="إدارة الطلاب"
              text="البيانات والحالة الدراسية"
              href={`/students?instituteId=${institute.id}`}
            />

            <ProfileCard
              icon={Users}
              title="المعلمون والعاملون"
              text="بيانات العاملين بالمعهد"
              href={`/teachers?instituteId=${institute.id}`}
            />

            <ProfileCard
              icon={ClipboardCheck}
              title="الحضور والتقارير"
              text="الحضور والغياب والتقارير"
              href={`/attendance-report?instituteId=${institute.id}`}
            />

            <ProfileCard
              icon={ClipboardCheck}
              title="الزيارات والتفتيش"
              text="نتائج الزيارات والملاحظات"
              href={`/visits?instituteId=${institute.id}`}
            />
          </section>

          {/* ==================================================
              فصول المعهد
              ================================================== */}

          <section className="rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                icon={GraduationCap}
                title="فصول المعهد"
                text="الفصول المسجلة داخل هذا المعهد فقط"
              />

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {classes.length.toLocaleString(
                  "ar-EG"
                )}{" "}
                فصل
              </span>
            </div>

            <div className="p-5">
              {classesError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {classesError}
                </div>
              ) : classes.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">
                  لا توجد فصول مسجلة لهذا المعهد حاليًا.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="rounded-2xl border bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                          <BookOpen size={20} />
                        </div>

                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          نشط
                        </span>
                      </div>

                      <h3 className="mt-4 font-bold text-slate-900">
                        {classItem.name}
                      </h3>

                      <p className="mt-2 text-xs text-slate-500">
                        معهد: {institute.name}
                      </p>

                      {/* 
                        أهم تعديل:
                        classId يتم إرساله مع instituteId
                        حتى تعرض صفحة الطلاب طلاب هذا الفصل فقط.
                      */}

                      <Link
                        href={`/students?instituteId=${institute.id}&classId=${classItem.id}`}
                        className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white transition hover:bg-slate-700"
                      >
                        <GraduationCap size={16} />

                        طلاب الفصل

                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* =========================
              Institutional Sections
          ========================== */}

          <section className="rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                icon={FolderOpen}
                title="أقسام الملف المؤسسي"
                text="أقسام جاهزة للتوسع وربط المستندات والبيانات الرسمية"
              />

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                نسخة العمل الحالية
              </span>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <SimpleCard
                icon={FileText}
                title="المستندات والأرشيف"
                text="مكان مخصص لربط مستندات المعهد عند إضافة وحدة الأرشيف."
              />

              <SimpleCard
                icon={Building2}
                title="المبنى والمنشآت"
                text="بيانات المبنى والفصول والمرافق والتجهيزات يمكن ربطها لاحقًا بجدول مخصص."
              />

              <SimpleCard
                icon={BookOpen}
                title="الفصول والمواد"
                text="مساحة مهيأة لربط الفصول والمواد والجدول الدراسي."
              />

              <SimpleCard
                icon={ClipboardList}
                title="التكليفات"
                text="متابعة التكليفات الواردة من الإدارة التعليمية."
                href={`/institute-tasks?instituteId=${institute.id}`}
              />

              <SimpleCard
                icon={MessageSquareWarning}
                title="الشكاوى والبلاغات"
                text="متابعة البلاغات والشكاوى المرتبطة بالمعهد."
                href={`/complaints?instituteId=${institute.id}`}
              />

              <SimpleCard
                icon={Send}
                title="المراسلات والطلبات"
                text="واجهة ربط مستقبلية للمراسلات وسير الموافقات."
                href={`/institute-requests?instituteId=${institute.id}`}
              />
            </div>
          </section>

          {/* =========================
              Footer Action
          ========================== */}

          <section className="rounded-3xl bg-slate-900 p-6 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  الخطوة التالية في الملف المؤسسي
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                  يمكن الآن بناء وحدات المبنى والمستندات والأرشيف وربطها بهذا الملف،
                  بدل إنشاء صفحات منفصلة مكررة للـDashboard.
                </p>
              </div>

              <Link
                href="/institutes"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
              >
                <Search size={18} />
                العودة لإدارة المعاهد
              </Link>
            </div>
          </section>

          <footer className="border-t py-6 text-center text-xs text-slate-400">
            نظام إدارة ومتابعة المعاهد الأزهرية — الملف المؤسسي V3.0
          </footer>
        </div>
      </section>
    </main>
  );
}

/* ==================================================
   Components
================================================== */

function Brand({
  institute,
}: {
  institute: Institute;
}) {
  return (
    <div className="border-b border-white/10 px-6 py-6">
      <div className="text-lg font-bold">
        نظام الإدارة الأزهرية
      </div>

      <div className="mt-1 text-xs text-slate-400">
        الملف المؤسسي للمعهد
      </div>

      <div className="mt-5 rounded-2xl bg-white/5 p-4">
        <div className="text-xs text-slate-400">
          المعهد الحالي
        </div>

        <div className="mt-2 font-semibold leading-6">
          {institute.name}
        </div>

        <div className="mt-2 text-xs text-slate-400">
          كود المعهد: {institute.code || "-"}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  title,
  active = false,
}: {
  icon: any;
  title: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
        active
          ? "bg-white font-semibold text-slate-950"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} />
      {title}
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  description,
  positive = false,
}: {
  icon: any;
  title: string;
  value: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">
            {title}
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {value}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {description}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon size={21} />
        </div>
      </div>

      {positive && (
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <TrendingUp size={14} />
          مؤشر جيد
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-slate-100 p-2">
        <Icon size={19} />
      </div>

      <div>
        <h3 className="font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs text-slate-400">
        {label}
      </div>

      <div className="mt-2 font-semibold text-slate-800">
        {value || "غير مسجل"}
      </div>
    </div>
  );
}

function Progress({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  const v = Math.max(
    0,
    Math.min(100, value)
  );

  return (
    <div className="mb-5">
      <div className="mb-2 flex justify-between text-sm">
        <span>{title}</span>

        <strong>{v}%</strong>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800"
          style={{
            width: `${v}%`,
          }}
        />
      </div>
    </div>
  );
}

function ProfileCard({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: any;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
        <Icon size={20} />
      </div>

      <div className="font-bold">
        {title}
      </div>

      <div className="mt-2 text-xs leading-6 text-slate-500">
        {text}
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold">
        فتح القسم
        <ArrowRight size={14} />
      </div>
    </Link>
  );
}

function SimpleCard({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: any;
  title: string;
  text: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <Icon size={19} />
      </div>

      <div className="mt-3 font-semibold">
        {title}
      </div>

      <div className="mt-1 text-xs leading-6 text-slate-500">
        {text}
      </div>

      {href && (
        <div className="mt-3 text-xs font-semibold">
          فتح القسم ←
        </div>
      )}
    </>
  );

  return href ? (
    <Link
      href={href}
      className="rounded-2xl border p-4 hover:bg-slate-50"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-dashed p-4">
      {body}
    </div>
  );
}
