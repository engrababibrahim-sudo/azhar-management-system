"use client";

import {
  Activity,
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
import { useEffect, useState } from "react";
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
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            {value.toLocaleString("ar-EG")}
          </p>

          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
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
          <h3 className="font-bold text-slate-900">{title}</h3>

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

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        throw new Error("لم يتم العثور على المستخدم الحالي");
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name, institute_id, directorate_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error("لم يتم العثور على ملف المستخدم");
      }

      setProfile(profileData as Profile);

      let query = supabase
        .from("institutes")
        .select(
          "id, name, code, institute_type, director_name, student_count, teacher_count, is_active"
        )
        .order("name", { ascending: true });

      /*
       * =========================================================
       * صلاحيات عرض المعاهد في لوحة التحكم
       * =========================================================
       *
       * super_admin:
       * يرى جميع معاهد الإدارة التعليمية التابعة له.
       *
       * director:
       * للتوافق مع البيانات القديمة.
       *
       * deputy:
       * يرى معاهد الإدارة التابعة له.
       *
       * sheikh / institute_deputy / teacher / employee:
       * يرى المعهد المرتبط بحسابه.
       *
       * it_admin:
       * يرى المعهد المرتبط بحسابه فقط.
       *
       * =========================================================
       */

      if (
        profileData.role === "super_admin" ||
        profileData.role === "director" ||
        profileData.role === "deputy"
      ) {
        if (!profileData.directorate_id) {
          throw new Error("الحساب غير مرتبط بإدارة تعليمية");
        }

        query = query.eq(
          "directorate_id",
          profileData.directorate_id
        );
      } else if (
        profileData.role === "sheikh" ||
        profileData.role === "institute_deputy" ||
        profileData.role === "teacher" ||
        profileData.role === "employee" ||
        profileData.role === "it_admin"
      ) {
        if (!profileData.institute_id) {
          throw new Error("الحساب غير مرتبط بمعهد");
        }

        query = query.eq("id", profileData.institute_id);
      } else {
        /*
         * أي دور غير معروف لا يرى بيانات المعاهد.
         */
        query = query.eq("id", "__no_matching_institute__");
      }

      const {
        data: instituteData,
        error: instituteError,
      } = await query;

      if (instituteError) {
        throw instituteError;
      }

      setInstitutes((instituteData || []) as Institute[]);
    } catch (error: any) {
      console.error("Dashboard error:", error);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "خطأ غير معروف";

      setErrorMessage("خطأ قاعدة البيانات: " + message);
      setInstitutes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalInstitutes = institutes.length;

  const activeInstitutes = institutes.filter(
    (item) => item.is_active !== false
  ).length;

  const inactiveInstitutes = institutes.filter(
    (item) => item.is_active === false
  ).length;

  const totalStudents = institutes.reduce(
    (total, item) => total + Number(item.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (total, item) => total + Number(item.teacher_count || 0),
    0
  );

  const roleTitle =
    profile?.role === "it_admin"
      ? "مسؤول تكنولوجيا المعلومات"
      : profile?.role === "sheikh"
        ? "شيخ المعهد"
        : profile?.role === "institute_deputy"
          ? "وكيل شيخ المعهد"
          : profile?.role === "teacher"
            ? "المدرس"
            : profile?.role === "employee"
              ? "الموظف"
              : profile?.role === "deputy"
                ? "وكيل الإدارة التعليمية الأزهرية"
                : "مدير الإدارة التعليمية الأزهرية";

  const welcomeName =
    profile?.full_name || roleTitle;

  const isItAdmin = profile?.role === "it_admin";

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
                مرحبًا {welcomeName}، إليك ملخص حالة النظام
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
                  className={refreshing ? "animate-spin" : ""}
                />

                <span>
                  {refreshing ? "جاري التحديث..." : "تحديث"}
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
                  : "متابعة المعاهد والطلاب والمدرسين والحضور والتقارير والمهام من خلال منصة موحدة."}
              </p>
            </div>
          </section>

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
                    onClick={() => loadDashboard(true)}
                    className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    المحاولة مرة أخرى
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                الملخص العام
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                مؤشرات سريعة عن البيانات المتاحة
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="إجمالي المعاهد"
                value={totalInstitutes}
                subtitle={activeInstitutes + " معهد نشط"}
                href="/institutes"
                icon={<Building2 size={22} />}
              />

              <StatCard
                title="إجمالي الطلاب"
                value={totalStudents}
                subtitle="طالب مسجل"
                href="/students"
                icon={<GraduationCap size={22} />}
              />

              <StatCard
                title="إجمالي المدرسين"
                value={totalTeachers}
                subtitle="مدرس وعضو هيئة تعليمية"
                href="/teachers"
                icon={<Users size={22} />}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      المعاهد النشطة
                    </p>

                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {activeInstitutes.toLocaleString("ar-EG")}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {inactiveInstitutes.toLocaleString("ar-EG")} معهد غير نشط
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={22} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  الوصول السريع
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أهم الوظائف المتاحة حسب صلاحيات المستخدم
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickAction
                title="إدارة المعاهد"
                description="إضافة المعاهد وتعديل بياناتها ومتابعة حالتها."
                href="/institutes"
                icon={<Building2 size={21} />}
              />

              <QuickAction
                title="إدارة الطلاب"
                description="عرض الطلاب وإضافة بيانات جديدة ومتابعة الفصول."
                href="/students"
                icon={<GraduationCap size={21} />}
              />

              <QuickAction
                title="الحضور والغياب"
                description={
                  isItAdmin
                    ? "إدخال وتعديل حضور وغياب الطلاب."
                    : "متابعة حضور وغياب الطلاب."
                }
                href="/attendance"
                icon={<ClipboardList size={21} />}
              />

              <QuickAction
                title="التقارير والإحصائيات"
                description="عرض مؤشرات وتقارير الحضور والطلاب."
                href="/attendance-report"
                icon={<FileBarChart size={21} />}
              />
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {isItAdmin
                    ? "المعهد التابع للحساب"
                    : "المعاهد التابعة للإدارة"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  استعرض المعاهد وانتقل إلى تفاصيل أي معهد
                </p>
              </div>

              <Link
                href="/institutes"
                className="hidden items-center gap-1 text-sm font-bold text-slate-700 hover:text-slate-950 sm:flex"
              >
                عرض الكل
                <ArrowLeft size={16} />
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-52 animate-pulse rounded-2xl bg-white shadow-sm"
                  />
                ))}
              </div>
            ) : institutes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Building2 size={25} />
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  لا توجد بيانات معاهد
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  لا توجد معاهد مرتبطة بالحساب الحالي أو تعذر تحميل بياناتها.
                </p>

                <Link
                  href="/institutes"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Building2 size={17} />
                  إدارة المعاهد
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {institutes.map((institute) => (
                  <Link
                    key={institute.id}
                    href={"/institutes/" + institute.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                          <Building2 size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-900">
                            {institute.name}
                          </h3>

                          {institute.code && (
                            <p className="mt-1 text-xs text-slate-500">
                              كود المعهد: {institute.code}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={
                          institute.is_active === false
                            ? "shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600"
                            : "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600"
                        }
                      >
                        {institute.is_active === false
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
                            institute.student_count || 0
                          ).toLocaleString("ar-EG")}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">
                          المدرسون
                        </div>

                        <div className="mt-1 text-lg font-black text-slate-900">
                          {Number(
                            institute.teacher_count || 0
                          ).toLocaleString("ar-EG")}
                        </div>
                      </div>
                    </div>

                    {institute.director_name && (
                      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          شيخ المعهد:
                        </span>{" "}
                        {institute.director_name}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-slate-500 transition group-hover:text-slate-900">
                      عرض تفاصيل المعهد
                      <ArrowLeft size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

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

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                تنبيهات ومتابعة
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                آخر المستجدات
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
