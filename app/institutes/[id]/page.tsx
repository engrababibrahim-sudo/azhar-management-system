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
  Bell,
  MessageSquare,
  ClipboardList,
  FileText,
  Settings,
  UserCheck,
  CalendarDays,
  BookOpen,
  UserPlus,
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

export default function InstituteDashboard() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params.id as string;

  const [institute, setInstitute] = useState<Institute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function loadInstitute() {
    if (!instituteId) {
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("institutes")
      .select(
        `
        id,
        name,
        code,
        institute_type,
        educational_stage,
        director_name,
        student_count,
        teacher_count,
        is_active
        `
      )
      .eq("id", instituteId)
      .single();

    if (error) {
      console.error("INSTITUTE ERROR:", error);
      setError(error.message);
      setInstitute(null);
    } else {
      setInstitute(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInstitute();
  }, [instituteId]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      alert("حدث خطأ أثناء تسجيل الخروج");
      return;
    }

    router.replace("/login");
    router.refresh();
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
            جاري تحميل بيانات المعهد...
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

          <h1 className="mt-4 text-xl font-bold text-slate-900">
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

  const studentCount = institute.student_count || 0;
  const teacherCount = institute.teacher_count || 0;

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800"
    >
      <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 flex-col bg-slate-950 text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="text-lg font-bold">
            نظام الإدارة الأزهرية
          </div>

          <div className="mt-1 text-xs text-slate-400">
            لوحة إدارة المعهد
          </div>
        </div>

        <div className="border-b border-white/10 px-5 py-5">
          <div className="rounded-2xl bg-white/5 p-4">
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

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <MenuItem
            icon={LayoutDashboard}
            title="لوحة التحكم"
            active
          />

          <Link href="/students">
            <MenuItem
              icon={GraduationCap}
              title="الطلاب"
            />
          </Link>

          <Link href="/teachers">
            <MenuItem
              icon={Users}
              title="المعلمين والموظفين"
            />
          </Link>

          <Link href="/attendance">
            <MenuItem
              icon={ClipboardCheck}
              title="الحضور والغياب"
            />
          </Link>

          <Link href="/attendance-report">
            <MenuItem
              icon={BarChart3}
              title="تقارير الحضور"
            />
          </Link>

          <MenuItem
            icon={BarChart3}
            title="النتائج"
          />

          <Link href="/institute-tasks">
            <MenuItem
              icon={ClipboardList}
              title="التكليفات"
            />
          </Link>

          <MenuItem
            icon={MessageSquare}
            title="المراسلات"
          />

          <Link href="/complaints">
            <MenuItem
              icon={MessageSquareWarning}
              title="الشكاوى والبلاغات"
            />
          </Link>

          <MenuItem
            icon={FileText}
            title="التقارير"
          />

          <MenuItem
            icon={CalendarDays}
            title="الجدول الدراسي"
          />

          <MenuItem
            icon={BookOpen}
            title="المواد الدراسية"
          />

          <MenuItem
            icon={Settings}
            title="إعدادات المعهد"
          />
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-900">
              إ
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold">
                إدارة المعهد
              </div>

              <div className="text-xs text-slate-400">
                شيخ المعهد
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 flex h-full w-[min(86vw,320px)] flex-col bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div>
                <div className="text-base font-bold">نظام الإدارة الأزهرية</div>
                <div className="mt-1 text-xs text-slate-400">لوحة إدارة المعهد</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="إغلاق القائمة"
              >
                <X size={22} />
              </button>
            </div>

            <div className="border-b border-white/10 px-5 py-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-xs text-slate-400">المعهد الحالي</div>
                <div className="mt-2 font-semibold leading-6">{institute.name}</div>
                <div className="mt-2 text-xs text-slate-400">كود المعهد: {institute.code || "-"}</div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="w-full text-right">
                <MenuItem icon={LayoutDashboard} title="لوحة التحكم" active />
              </button>
              <Link href="/students" onClick={() => setMobileMenuOpen(false)}><MenuItem icon={GraduationCap} title="الطلاب" /></Link>
              <Link href="/teachers" onClick={() => setMobileMenuOpen(false)}><MenuItem icon={Users} title="المعلمين والموظفين" /></Link>
              <Link href="/attendance" onClick={() => setMobileMenuOpen(false)}><MenuItem icon={ClipboardCheck} title="الحضور والغياب" /></Link>
              <Link href="/attendance-report" onClick={() => setMobileMenuOpen(false)}><MenuItem icon={BarChart3} title="تقارير الحضور" /></Link>
              <Link href="/institute-tasks" onClick={() => setMobileMenuOpen(false)}><MenuItem icon={ClipboardList} title="التكليفات" /></Link>
              <Link href="/complaints" onClick={() => setMobileMenuOpen(false)}><MenuItem icon={MessageSquareWarning} title="الشكاوى والبلاغات" /></Link>
            </nav>

            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </div>
      )}

      <section className="min-w-0 lg:mr-72">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:flex-nowrap lg:px-8 lg:py-0">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex shrink-0 items-center justify-center rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
                aria-label="فتح القائمة"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0">
              <div className="truncate text-xs text-slate-400">
                الإدارة التعليمية الأزهرية
              </div>

              <h1 className="mt-1 text-xl font-bold text-slate-900">
                لوحة تحكم المعهد
              </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/institutes"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium hover:bg-slate-50 sm:flex"
              >
                <ArrowRight size={17} />
                كل المعاهد
              </Link>

              <button
                type="button"
                className="relative rounded-xl border border-slate-200 p-2.5"
              >
                <Bell size={20} />

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  3
                </span>
              </button>

              <button
                type="button"
                className="rounded-xl border border-slate-200 p-2.5"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-4 p-3 sm:space-y-6 sm:p-6 lg:p-8">
          <section className="rounded-2xl bg-slate-900 p-4 text-white shadow-xl sm:rounded-3xl sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-16 sm:w-16 sm:rounded-2xl">
                  <Building2 size={30} />
                </div>

                <div>
                  <div className="text-sm text-slate-400">
                    المعهد
                  </div>

                  <h2 className="mt-1 break-words text-xl font-bold sm:text-2xl">
                    {institute.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span>
                      كود: {institute.code || "-"}
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

              <div className="w-full rounded-2xl bg-white/10 px-4 py-3 sm:w-auto sm:px-5 sm:py-4">
                <div className="text-xs text-slate-400">
                  شيخ المعهد
                </div>

                <div className="mt-1 font-semibold">
                  {institute.director_name || "-"}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              icon={GraduationCap}
              title="الطلاب"
              value={studentCount.toLocaleString("ar-EG")}
              description="إجمالي الطلاب"
            />

            <StatCard
              icon={Users}
              title="المعلمين"
              value={teacherCount.toLocaleString("ar-EG")}
              description="إجمالي المعلمين"
            />

            <StatCard
              icon={ClipboardCheck}
              title="الحضور اليوم"
              value="96%"
              description="معدل الحضور"
              positive
            />

            <StatCard
              icon={BarChart3}
              title="نسبة النجاح"
              value="94%"
              description="آخر نتائج معتمدة"
              positive
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    متابعة المعهد
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    أهم المؤشرات التي تحتاجها إدارة المعهد
                  </p>
                </div>

                <BarChart3 size={21} />
              </div>

              <div className="space-y-5">
                <ProgressRow
                  title="انتظام الطلاب"
                  value={96}
                  target="90%"
                />

                <ProgressRow
                  title="انتظام المعلمين"
                  value={98}
                  target="95%"
                />

                <ProgressRow
                  title="تنفيذ الخطة الدراسية"
                  value={93}
                  target="90%"
                />

                <ProgressRow
                  title="الأنشطة الطلابية"
                  value={88}
                  target="80%"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    التنبيهات
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    تحتاج إلى مراجعة
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-2 text-red-600">
                  <Bell size={19} />
                </div>
              </div>

              <div className="space-y-3">
                <Alert
                  title="متابعة الطلاب"
                  text="يوجد طلاب يحتاجون إلى متابعة"
                  danger
                />

                <Alert
                  title="تقرير الحضور"
                  text="يحتاج مراجعة"
                />

                <Alert
                  title="تكليف إداري"
                  text="يوجد تكليف جديد"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-bold">
                إجراءات سريعة
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                العمليات الأكثر استخدامًا داخل المعهد
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Link href="/students">
                <Action
                  icon={UserPlus}
                  title="إضافة طالب"
                />
              </Link>

              <Link href="/attendance">
                <Action
                  icon={UserCheck}
                  title="تسجيل الحضور"
                />
              </Link>

              <Link href="/attendance-report">
                <Action
                  icon={FileText}
                  title="تقرير الحضور"
                />
              </Link>

              <Link href="/institute-tasks">
                <Action
                  icon={ClipboardList}
                  title="التكليفات"
                />
              </Link>

              <Action
                icon={Send}
                title="إرسال للإدارة"
              />

              <Link href="/complaints">
                <Action
                  icon={MessageSquareWarning}
                  title="الشكاوى والبلاغات"
                />
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h3 className="font-bold">
                  التكليفات الواردة من الإدارة التعليمية
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  التكليفات التي تحتاج إلى تنفيذ أو رد
                </p>
              </div>

              <Link
                href="/institute-tasks"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                عرض كل التكليفات
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              <Task
                title="رفع تقرير الحضور الأسبوعي"
                date="موعد التسليم: غدًا"
                status="مطلوب"
                urgent
              />

              <Task
                title="إرسال خطة الأنشطة الطلابية"
                date="موعد التسليم: 15 سبتمبر"
                status="قيد التنفيذ"
              />

              <Task
                title="تحديث بيانات العاملين"
                date="تم إرسال التكليف منذ يومين"
                status="تم الرد"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    حضور الطلاب
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    ملخص اليوم
                  </p>
                </div>

                <ClipboardCheck size={21} />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <AttendanceBox
                  value="816"
                  label="حاضر"
                  type="success"
                />

                <AttendanceBox
                  value="24"
                  label="غائب"
                  type="danger"
                />

                <AttendanceBox
                  value="10"
                  label="متأخر"
                  type="warning"
                />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span>نسبة الحضور</span>
                  <strong>96%</strong>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: "96%" }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
              <div className="mb-6">
                <h3 className="font-bold">
                  آخر الأنشطة
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  سجل مختصر لأحدث العمليات
                </p>
              </div>

              <div className="space-y-4">
                <Activity
                  text="تم تسجيل حضور الطلاب"
                  time="منذ 15 دقيقة"
                />

                <Activity
                  text="تم إرسال تقرير إلى الإدارة التعليمية"
                  time="منذ ساعة"
                />

                <Activity
                  text="تم تحديث بيانات أحد الطلاب"
                  time="منذ ساعتين"
                />

                <Activity
                  text="تم استلام تكليف جديد من الإدارة"
                  time="منذ 3 ساعات"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-slate-900 p-6 text-white">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  تقارير المعهد
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                  يستطيع مدير المعهد استخراج تقارير الطلاب والحضور
                  والعاملين والتكليفات ورفعها للإدارة التعليمية.
                </p>
              </div>

              <Link
                href="/attendance-report"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
              >
                <FileText size={18} />
                فتح التقارير
              </Link>
            </div>
          </section>

          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
            نظام إدارة ومتابعة المعاهد الأزهرية — لوحة المعهد V2.0
          </footer>
        </div>
      </section>
    </main>
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
  const menuClass = active
    ? "bg-white font-semibold text-slate-950"
    : "text-slate-300 hover:bg-white/10 hover:text-white";

  return (
    <div
      className={
        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition " +
        menuClass
      }
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
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

function ProgressRow({
  title,
  value,
  target,
}: {
  title: string;
  value: number;
  target: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{title}</span>

        <span className="font-bold">
          {value}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800"
          style={{ width: value + "%" }}
        />
      </div>

      <div className="mt-1 text-[11px] text-slate-400">
        المستهدف {target}
      </div>
    </div>
  );
}

function Alert({
  title,
  text,
  danger = false,
}: {
  title: string;
  text: string;
  danger?: boolean;
}) {
  const alertClass = danger
    ? "bg-red-50 text-red-600"
    : "bg-amber-50 text-amber-600";

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <div className={"rounded-xl p-2 " + alertClass}>
        <AlertTriangle size={16} />
      </div>

      <div>
        <div className="text-sm font-semibold">
          {title}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {text}
        </div>
      </div>
    </div>
  );
}

function Action({
  icon: Icon,
  title,
}: {
  icon: any;
  title: string;
}) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <Icon size={19} />
      </div>

      <div className="text-sm font-semibold">
        {title}
      </div>
    </div>
  );
}

function Task({
  title,
  date,
  status,
  urgent = false,
}: {
  title: string;
  date: string;
  status: string;
  urgent?: boolean;
}) {
  const taskClass = urgent
    ? "bg-red-50 text-red-700"
    : status === "تم الرد"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";

  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5">
          <ClipboardList size={18} />
        </div>

        <div>
          <div className="font-semibold">
            {title}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {date}
          </div>
        </div>
      </div>

      <span
        className={
          "w-fit rounded-full px-3 py-1.5 text-xs font-semibold " +
          taskClass
        }
      >
        {status}
      </span>
    </div>
  );
}

function AttendanceBox({
  value,
  label,
  type,
}: {
  value: string;
  label: string;
  type: "success" | "danger" | "warning";
}) {
  const style =
    type === "success"
      ? "bg-emerald-50 text-emerald-700"
      : type === "danger"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";

  return (
    <div className={"rounded-2xl p-3 text-center sm:p-4 " + style}>
      <div className="text-xl font-bold sm:text-2xl">
        {value}
      </div>

      <div className="mt-1 text-xs">
        {label}
      </div>
    </div>
  );
}

function Activity({
  text,
  time,
}: {
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <CircleCheck size={16} />
      </div>

      <div>
        <div className="break-words text-sm font-medium">
          {text}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          {time}
        </div>
      </div>
    </div>
  );
}
