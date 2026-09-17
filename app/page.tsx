"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "./components/AppShell";
import { supabase } from "../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code: string;
  institute_type: string | null;
  education_stage: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean | null;
};

type Profile = {
  role: string;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
};

type QuickActionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
  href,
}: StatCardProps) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function QuickAction({
  title,
  description,
  icon,
  href,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <ArrowLeft
        size={18}
        className="shrink-0 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-slate-700"
      />
    </Link>
  );
}

function SystemStatus() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900">
            حالة النظام
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            آخر حالة للخدمات الأساسية
          </p>
        </div>

        <Activity size={20} className="text-slate-500" />
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">
              قاعدة البيانات
            </span>
          </div>

          <span className="text-xs font-semibold text-emerald-600">
            متصل
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">
              نظام الدخول والصلاحيات
            </span>
          </div>

          <span className="text-xs font-semibold text-emerald-600">
            يعمل
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">
              حماية الصفحات
            </span>
          </div>

          <span className="text-xs font-semibold text-emerald-600">
            مفعلة
          </span>
        </div>
      </div>
    </div>
  );
}

function InstituteCard({
  institute,
}: {
  institute: Institute;
}) {
  return (
    <Link
      href={`/institutes/${institute.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Building2 size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-bold text-slate-900">
                {institute.name}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                كود المعهد: {institute.code}
              </p>
            </div>

            <span
              className={
                institute.is_active
                  ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                  : "shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700"
              }
            >
              {institute.is_active ? "نشط" : "غير نشط"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <GraduationCap size={15} />
                <span className="text-[11px]">الطلاب</span>
              </div>

              <p className="mt-1 font-bold text-slate-900">
                {institute.student_count ?? 0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Users size={15} />
                <span className="text-[11px]">المدرسون</span>
              </div>

              <p className="mt-1 font-bold text-slate-900">
                {institute.teacher_count ?? 0}
              </p>
            </div>
          </div>

          {institute.education_stage && (
            <p className="mt-4 text-xs text-slate-500">
              المرحلة: {institute.education_stage}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard(showRefresh = false) {
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
        setProfile(null);
        setInstitutes([]);
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "role, full_name, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      let institutesQuery = supabase
        .from("institutes")
        .select(
          "id, name, code, institute_type, education_stage, director_name, student_count, teacher_count, is_active"
        )
        .order("name", { ascending: true });

      if (
        profileData.role === "director" ||
        profileData.role === "deputy" ||
        profileData.role === "super_admin"
      ) {
        if (
          profileData.role !== "super_admin" &&
          profileData.directorate_id
        ) {
          institutesQuery = institutesQuery.eq(
            "directorate_id",
            profileData.directorate_id
          );
        }
      } else if (
        profileData.role === "sheikh" &&
        profileData.institute_id
      ) {
        institutesQuery = institutesQuery.eq(
          "id",
          profileData.institute_id
        );
      } else {
        setInstitutes([]);
        return;
      }

      const {
        data: institutesData,
        error: institutesError,
      } = await institutesQuery;

      if (institutesError) {
        throw institutesError;
      }

      setInstitutes(institutesData || []);
    } catch (error) {
      console.error("Dashboard error:", error);
      setErrorMessage(
        "تعذر تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredInstitutes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return institutes;
    }

    return institutes.filter((institute) => {
      const name = institute.name?.toLowerCase() || "";
      const code = institute.code?.toLowerCase() || "";
      const stage =
        institute.education_stage?.toLowerCase() || "";

      return (
        name.includes(term) ||
        code.includes(term) ||
        stage.includes(term)
      );
    });
  }, [institutes, searchTerm]);

  const activeInstitutes = institutes.filter(
    (institute) => institute.is_active
  ).length;

  const inactiveInstitutes =
    institutes.length - activeInstitutes;

  const totalStudents = institutes.reduce(
    (total, institute) =>
      total + Number(institute.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (total, institute) =>
      total + Number(institute.teacher_count || 0),
    0
  );

  const isDirector =
    profile?.role === "director" ||
    profile?.role === "deputy" ||
    profile?.role === "super_admin";

  return (
    <AppShell>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 text-slate-800"
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>الرئيسية</span>
                <span>/</span>
                <span className="text-slate-800">
                  لوحة التحكم
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                لوحة التحكم
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {profile?.full_name
                  ? `مرحبًا ${profile.full_name}، إليك ملخص حالة النظام`
                  : "إليك ملخص حالة النظام والإدارة التعليمية"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />

                <span>
                  {refreshing ? "جاري التحديث..." : "تحديث"}
                </span>
              </button>

              <Link
                href="/announcements"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="التنبيهات"
              >
                <Bell size={19} />
              </Link>
            </div>
          </div>

          {/* Hero */}
          <section className="mb-6 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                  <Activity size={14} />
                  منصة الإدارة التعليمية الأزهرية
                </div>

                <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                  الإدارة والمتابعة المركزية للمعاهد الأزهرية
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                  متابعة المعاهد والطلاب والمدرسين والحضور
                  والتقارير والمهام من خلال منصة موحدة.
                </p>
              </div>

              <div className="hidden h-24 w-24 items-center justify-center rounded-3xl bg-white/10 lg:flex">
                <Building2 size={42} />
              </div>
            </div>
          </section>

          {/* Error */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  حدث خطأ
                </p>

                <p className="mt-1 text-sm">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Statistics */}
          <section className="mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                الملخص العام
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                مؤشرات سريعة عن البيانات المتاحة
              </p>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-2xl bg-white"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="إجمالي المعاهد"
                  value={institutes.length}
                  subtitle={
                    activeInstitutes +
                    " معهد نشط"
                  }
                  icon={<Building2 size={23} />}
                  href={isDirector ? "/institutes" : undefined}
                />

                <StatCard
                  title="إجمالي الطلاب"
                  value={totalStudents}
                  subtitle="طالب مسجل"
                  icon={<GraduationCap size={23} />}
                  href="/students"
                />

                <StatCard
                  title="إجمالي المدرسين"
                  value={totalTeachers}
                  subtitle="مدرس وعضو هيئة تعليمية"
                  icon={<Users size={23} />}
                  href="/teachers"
                />

                <StatCard
                  title="المعاهد النشطة"
                  value={activeInstitutes}
                  subtitle={
                    inactiveInstitutes +
                    " معهد غير نشط"
                  }
                  icon={<CheckCircle2 size={23} />}
                />
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                الوصول السريع
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أهم الوظائف المتاحة حسب صلاحيات المستخدم
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {isDirector && (
                <QuickAction
                  title="إدارة المعاهد"
                  description="إضافة المعاهد وتعديل بياناتها ومتابعة حالتها."
                  icon={<Building2 size={22} />}
                  href="/institutes"
                />
              )}

              <QuickAction
                title="إدارة الطلاب"
                description="عرض الطلاب وإضافة بيانات جديدة ومتابعة الفصول."
                icon={<GraduationCap size={22} />}
                href="/students"
              />

              <QuickAction
                title="الحضور والغياب"
                description="تسجيل ومتابعة حضور وغياب الطلاب."
                icon={<ClipboardCheck size={22} />}
                href="/attendance"
              />

              <QuickAction
                title="التقارير والإحصائيات"
                description="عرض مؤشرات وتقارير الحضور والطلاب."
                icon={<FileBarChart size={22} />}
                href="/attendance-report"
              />
            </div>
          </section>

          {/* Main content */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Institutes */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {isDirector
                        ? "المعاهد التابعة للإدارة"
                        : "بيانات المعهد"}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {isDirector
                        ? "استعرض المعاهد وانتقل إلى تفاصيل أي معهد"
                        : "بيانات المعهد المرتبط بحسابك"}
                    </p>
                  </div>

                  {isDirector && (
                    <Link
                      href="/institutes"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
                    >
                      عرض الكل
                      <ArrowLeft size={16} />
                    </Link>
                  )}
                </div>

                {isDirector && (
                  <div className="relative mt-5">
                    <Search
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="ابحث باسم المعهد أو الكود أو المرحلة..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {loading ? (
                    <>
                      <div className="h-36 animate-pulse rounded-2xl bg-slate-50" />
                      <div className="h-36 animate-pulse rounded-2xl bg-slate-50" />
                    </>
                  ) : filteredInstitutes.length > 0 ? (
                    filteredInstitutes.map((institute) => (
                      <InstituteCard
                        key={institute.id}
                        institute={institute}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-8 text-center">
                      <Building2
                        size={32}
                        className="mx-auto text-slate-400"
                      />

                      <p className="mt-3 font-semibold text-slate-700">
                        لا توجد بيانات معاهد
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {searchTerm
                          ? "لم يتم العثور على نتائج مطابقة للبحث."
                          : "لا توجد معاهد مرتبطة بالحساب الحالي."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side */}
            <div className="space-y-6">
              <SystemStatus />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <BookOpen
                      size={20}
                      className="text-slate-700"
                    />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      تنبيهات ومتابعة
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      آخر المستجدات
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <Bell
                      size={18}
                      className="mt-0.5 shrink-0 text-slate-500"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        مركز الإعلانات
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        يمكنك متابعة الإعلانات والتعليمات
                        من القسم المخصص.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/announcements"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950"
                  >
                    الانتقال إلى الإعلانات
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
            نظام إدارة المعاهد الأزهرية — منصة الإدارة
            والمتابعة التعليمية
          </footer>
        </div>
      </main>
    </AppShell>
  );
}
