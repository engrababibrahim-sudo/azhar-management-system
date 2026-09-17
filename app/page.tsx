"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  Search,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  UserCog,
  Megaphone,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  Bell,
  ChevronLeft,
  Activity,
  School,
  ClipboardList,
} from "lucide-react";

import { supabase } from "../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code: string;
  institute_type: string | null;
  educational_stage: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean | null;
};

const menuItems = [
  {
    title: "لوحة التحكم",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "إدارة المعاهد",
    href: "/institutes",
    icon: Building2,
  },
  {
    title: "الطلاب",
    href: "/students",
    icon: GraduationCap,
  },
  {
    title: "المدرسون",
    href: "/teachers",
    icon: UserCog,
  },
  {
    title: "الحضور والغياب",
    href: "/attendance",
    icon: ClipboardCheck,
  },
  {
    title: "التقارير والإحصائيات",
    href: "/attendance-report",
    icon: BarChart3,
  },
  {
    title: "المهام والمتابعة",
    href: "/tasks",
    icon: ClipboardList,
  },
  {
    title: "الإعلانات",
    href: "/announcements",
    icon: Megaphone,
  },
  {
    title: "استيراد البيانات",
    href: "/import",
    icon: FileSpreadsheet,
  },
  {
    title: "الإعدادات",
    href: "/settings",
    icon: Settings,
  },
];

export default function Home() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function loadInstitutes() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("institutes")
      .select(`
        id,
        name,
        code,
        institute_type,
        educational_stage,
        director_name,
        student_count,
        teacher_count,
        is_active
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
      setInstitutes([]);
    } else {
      setInstitutes(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInstitutes();
  }, []);

  const filteredInstitutes = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return institutes;
    }

    return institutes.filter((institute) =>
      [
        institute.name,
        institute.code,
        institute.director_name,
        institute.institute_type,
        institute.educational_stage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [institutes, search]);

  const totalStudents = institutes.reduce(
    (sum, institute) => sum + (institute.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (sum, institute) => sum + (institute.teacher_count || 0),
    0
  );

  const activeInstitutes = institutes.filter(
    (institute) => institute.is_active !== false
  ).length;

  const inactiveInstitutes = institutes.filter(
    (institute) => institute.is_active === false
  ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 text-slate-800"
    >
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 z-50
          h-screen w-72
          bg-slate-950 text-white
          transform transition-transform duration-300
          lg:translate-x-0
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
                <School size={25} />
              </div>

              <div>
                <h1 className="font-bold text-lg">
                  الإدارة الأزهرية
                </h1>

                <p className="text-xs text-slate-400 mt-1">
                  نظام الإدارة والمتابعة
                </p>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="mr-auto lg:hidden text-slate-400 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Profile */}
          <div className="p-5">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
                  م
                </div>

                <div>
                  <p className="font-semibold text-sm">
                    مدير الإدارة
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    الإدارة التعليمية الأزهرية
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-4 flex-1 overflow-y-auto">
            <p className="text-xs text-slate-500 font-semibold px-3 mb-3">
              القائمة الرئيسية
            </p>

            <div className="space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3
                      px-4 py-3
                      rounded-xl
                      transition
                      ${
                        index === 0
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <Icon size={19} />

                    <span className="text-sm font-medium">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom */}
          <div className="p-4 border-t border-white/10">
            <div className="rounded-2xl bg-emerald-600/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Activity size={18} />

                <span className="text-sm font-semibold">
                  النظام يعمل
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                جميع الخدمات متاحة حاليًا
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:mr-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
              >
                <Menu size={22} />
              </button>

              <div>
                <p className="text-xs text-slate-400">
                  الإدارة التعليمية الأزهرية
                </p>

                <h2 className="font-bold text-lg">
                  لوحة الإدارة والمتابعة
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="relative w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
                title="الإشعارات"
              >
                <Bell size={19} />

                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <button
                onClick={loadInstitutes}
                disabled={loading}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />

                تحديث
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 lg:p-10 mb-8">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-emerald-300 text-xs font-semibold mb-5">
                <CheckCircle2 size={15} />
                النظام متصل ويعمل بشكل طبيعي
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                مرحبًا بك في لوحة الإدارة التعليمية
              </h1>

              <p className="mt-4 text-slate-300 leading-7 max-w-2xl">
                نظام مركزي لإدارة ومتابعة المعاهد الأزهرية،
                ومتابعة الطلاب والمدرسين والحضور والتقارير
                والمهام والبيانات الإدارية من مكان واحد.
              </p>

              <div className="flex flex-wrap gap-3 mt-7">
                <Link
                  href="/institutes"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition"
                >
                  إدارة المعاهد
                  <ArrowLeft size={17} />
                </Link>

                <Link
                  href="/attendance-report"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold transition"
                >
                  عرض التقارير
                  <BarChart3 size={17} />
                </Link>
              </div>
            </div>

            <div className="absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute left-40 -top-24 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl" />
          </section>

          {/* Statistics */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="إجمالي المعاهد"
              value={institutes.length}
              subtitle={`${activeInstitutes} معهد نشط`}
              icon={<Building2 size={23} />}
            />

            <StatCard
              title="إجمالي الطلاب"
              value={totalStudents.toLocaleString("ar-EG")}
              subtitle="طلاب مسجلون"
              icon={<GraduationCap size={23} />}
            />

            <StatCard
              title="إجمالي المدرسين"
              value={totalTeachers.toLocaleString("ar-EG")}
              subtitle="أعضاء هيئة التدريس"
              icon={<Users size={23} />}
            />

            <StatCard
              title="حالة المعاهد"
              value={activeInstitutes}
              subtitle={
                inactiveInstitutes > 0
                  ? `${inactiveInstitutes} غير نشط`
                  : "جميع المعاهد نشطة"
              }
              icon={<Activity size={23} />}
            />
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  الوصول السريع
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  أهم الإجراءات المستخدمة في الإدارة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickAction
                href="/institutes"
                icon={<Building2 size={21} />}
                title="المعاهد"
                description="إدارة المعاهد"
              />

              <QuickAction
                href="/students"
                icon={<GraduationCap size={21} />}
                title="الطلاب"
                description="بيانات الطلاب"
              />

              <QuickAction
                href="/teachers"
                icon={<UserCog size={21} />}
                title="المدرسون"
                description="بيانات المدرسين"
              />

              <QuickAction
                href="/attendance"
                icon={<ClipboardCheck size={21} />}
                title="الحضور"
                description="متابعة الحضور"
              />
            </div>
          </section>

          {/* Status */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">
                    حالة النظام
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    ملخص حالة البيانات والخدمات
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Activity size={21} />
                </div>
              </div>

              <div className="space-y-4">
                <SystemStatus
                  title="قاعدة البيانات"
                  description="Supabase / PostgreSQL"
                />

                <SystemStatus
                  title="خدمة المعاهد"
                  description={`${institutes.length} معاهد مسجلة`}
                />

                <SystemStatus
                  title="خدمة البيانات"
                  description={`${totalStudents.toLocaleString(
                    "ar-EG"
                  )} طالب و ${totalTeachers.toLocaleString(
                    "ar-EG"
                  )} مدرس`}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bell size={21} />
                </div>

                <div>
                  <h2 className="font-bold">
                    التنبيهات
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    آخر المستجدات
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />

                  <div>
                    <p className="text-sm font-semibold">
                      النظام جاهز للعمل
                    </p>

                    <p className="text-xs text-slate-500 mt-1 leading-5">
                      تم الاتصال بقاعدة البيانات وتحميل بيانات
                      المعاهد بنجاح.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Institutes */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    المعاهد التابعة للإدارة
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    عرض سريع للمعاهد المسجلة ويمكن فتح تفاصيل
                    أي معهد
                  </p>
                </div>

                <div className="relative w-full lg:w-80">
                  <Search
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن معهد أو شيخ..."
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
                  />
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="p-16 text-center">
                <Loader2
                  size={38}
                  className="animate-spin mx-auto text-emerald-600"
                />

                <p className="mt-4 text-slate-500">
                  جاري تحميل بيانات المعاهد...
                </p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="m-6 rounded-2xl bg-red-50 border border-red-200 p-5 text-red-700">
                <div className="flex items-start gap-3">
                  <AlertCircle size={21} />

                  <div>
                    <p className="font-bold">
                      حدث خطأ أثناء تحميل المعاهد
                    </p>

                    <p className="text-sm mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty */}
            {!loading &&
              !error &&
              filteredInstitutes.length === 0 && (
                <div className="p-16 text-center">
                  <Building2
                    size={42}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-4 font-semibold text-slate-600">
                    لا توجد معاهد مطابقة للبحث
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    جرّبي البحث باسم المعهد أو الكود أو شيخ
                    المعهد
                  </p>
                </div>
              )}

            {/* Institute Cards */}
            {!loading &&
              !error &&
              filteredInstitutes.length > 0 && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredInstitutes.map((institute) => (
                    <InstituteCard
                      key={institute.id}
                      institute={institute}
                    />
                  ))}
                </div>
              )}
          </section>

          {/* Footer */}
          <footer className="py-8 text-center">
            <p className="text-xs text-slate-400">
              نظام إدارة المعاهد الأزهرية © 2026
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-3xl font-bold mt-2 text-slate-900">
            {value}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            {subtitle}
          </p>
        </div>

        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
          {icon}
        </div>

        <ChevronLeft
          size={18}
          className="text-slate-300 group-hover:text-emerald-600 transition"
        />
      </div>

      <h3 className="font-bold mt-4">
        {title}
      </h3>

      <p className="text-xs text-slate-400 mt-1">
        {description}
      </p>
    </Link>
  );
}

function SystemStatus({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 size={18} />
        </div>

        <div>
          <p className="text-sm font-semibold">
            {title}
          </p>

          <p className="text-xs text-slate-400 mt-1">
            {description}
          </p>
        </div>
      </div>

      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
        يعمل
      </span>
    </div>
  );
}

function InstituteCard({
  institute,
}: {
  institute: Institute;
}) {
  const isActive = institute.is_active !== false;

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Building2 size={23} />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold truncate">
              {institute.name}
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              {institute.code}
            </p>
          </div>
        </div>

        {isActive ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 size={13} />
            نشط
          </span>
        ) : (
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
            غير نشط
          </span>
        )}
      </div>

      <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            شيخ المعهد
          </span>

          <span className="text-sm font-semibold text-slate-700">
            {institute.director_name || "غير محدد"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            المرحلة
          </span>

          <span className="text-sm font-semibold text-slate-700">
            {institute.educational_stage ||
              institute.institute_type ||
              "غير محدد"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <GraduationCap size={16} />

            <span className="text-xs">
              الطلاب
            </span>
          </div>

          <p className="font-bold mt-1">
            {(institute.student_count || 0).toLocaleString(
              "ar-EG"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Users size={16} />

            <span className="text-xs">
              المدرسون
            </span>
          </div>

          <p className="font-bold mt-1">
            {(institute.teacher_count || 0).toLocaleString(
              "ar-EG"
            )}
          </p>
        </div>
      </div>

      <Link
        href={`/institutes/${institute.id}`}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-950 text-white hover:bg-emerald-700 transition font-semibold text-sm"
      >
        فتح المعهد
        <ArrowLeft size={16} />
      </Link>
    </div>
  );
}
