"use client";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Menu,
  School,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const institutes = [
  {
    name: "معهد نور الإسلام النموذجي للغات والكمبيوتر",
    code: "AZ001",
    type: "ابتدائي",
    students: 186,
    teachers: 24,
    attendance: 94,
    status: "نشط",
  },
  {
    name: "معهد فتيات نور الإسلام",
    code: "AZ002",
    type: "إعدادي وثانوي",
    students: 241,
    teachers: 31,
    attendance: 91,
    status: "نشط",
  },
  {
    name: "معهد الخلفاء الراشدين",
    code: "AZ003",
    type: "متعدد المراحل",
    students: 328,
    teachers: 42,
    attendance: 89,
    status: "نشط",
  },
  {
    name: "معهد فتيات المدينة المنورة",
    code: "AZ004",
    type: "إعدادي وثانوي",
    students: 214,
    teachers: 28,
    attendance: 96,
    status: "نشط",
  },
];

const activities = [
  {
    title: "تم تسجيل حضور الطلاب",
    description: "تم تحديث سجل الحضور اليومي",
    time: "منذ 15 دقيقة",
    icon: CheckCircle2,
  },
  {
    title: "طلب جديد من أحد المعاهد",
    description: "طلب اعتماد نشاط طلابي",
    time: "منذ 32 دقيقة",
    icon: ClipboardList,
  },
  {
    title: "تم تحديث بيانات معهد",
    description: "تم تعديل بيانات أحد المعاهد",
    time: "منذ ساعة",
    icon: Building2,
  },
  {
    title: "تقرير حضور جديد",
    description: "تم إصدار تقرير الحضور الأسبوعي",
    time: "منذ ساعتين",
    icon: BarChart3,
  },
];

export default function DemoPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalStudents = institutes.reduce(
    (sum, institute) => sum + institute.students,
    0
  );

  const totalTeachers = institutes.reduce(
    (sum, institute) => sum + institute.teachers,
    0
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      {/* Top Demo Banner */}
      <div className="bg-slate-950 px-4 py-3 text-center text-sm text-white">
        <span className="font-semibold text-amber-300">
          نسخة تجريبية Demo
        </span>
        <span className="mx-2 text-slate-400">•</span>
        هذه الصفحة مخصصة لاستعراض إمكانيات منصة إدارة المعاهد الأزهرية
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <School size={24} />
            </div>

            <div>
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                منصة الإدارة والمتابعة التعليمية
              </h1>

              <p className="text-xs text-slate-500 sm:text-sm">
                نظام إدارة المعاهد الأزهرية
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#dashboard"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              لوحة التحكم
            </a>

            <a
              href="#institutes"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              المعاهد
            </a>

            <a
              href="#statistics"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              الإحصائيات
            </a>

            <a
              href="#activities"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              المتابعة
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              تسجيل الدخول
            </Link>

            <a
              href="#dashboard"
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              استعراض النظام
              <ArrowLeft size={16} />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-700 md:hidden"
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              <a
                href="#dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50"
              >
                لوحة التحكم
              </a>

              <a
                href="#institutes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50"
              >
                المعاهد
              </a>

              <a
                href="#statistics"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50"
              >
                الإحصائيات
              </a>

              <a
                href="#activities"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50"
              >
                المتابعة
              </a>

              <Link
                href="/login"
                className="mt-2 rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        id="dashboard"
        className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900"
      >
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-emerald-100">
                <ShieldCheck size={16} />
                منصة مركزية للإدارة والمتابعة
              </div>

              <h2 className="max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                إدارة المعاهد الأزهرية
                <span className="block text-emerald-300">
                  من مكان واحد
                </span>
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-8 text-emerald-50/80 sm:text-lg">
                منصة إلكترونية تساعد الإدارة التعليمية على متابعة المعاهد
                والطلاب والمدرسين والحضور والطلبات والشكاوى والتقارير من
                خلال لوحة تحكم مركزية.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#institutes"
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-900 shadow-lg transition hover:bg-emerald-50"
                >
                  استكشف لوحة التحكم
                  <ArrowLeft size={17} />
                </a>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  الدخول إلى النظام
                </Link>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-white p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      الإدارة التعليمية الأزهرية
                    </p>
                    <h3 className="mt-1 font-bold text-slate-900">
                      ملخص اليوم
                    </h3>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                    <Activity size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    icon={<Building2 size={18} />}
                    value="4"
                    label="معاهد"
                  />

                  <MiniStat
                    icon={<Users size={18} />}
                    value={totalStudents.toLocaleString("ar-EG")}
                    label="طلاب"
                  />

                  <MiniStat
                    icon={<GraduationCap size={18} />}
                    value={totalTeachers.toLocaleString("ar-EG")}
                    label="مدرسون"
                  />

                  <MiniStat
                    icon={<BarChart3 size={18} />}
                    value="92%"
                    label="متوسط الحضور"
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      متوسط الحضور
                    </span>
                    <span className="font-bold text-emerald-700">
                      92%
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[92%] rounded-full bg-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section
        id="statistics"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Building2 size={22} />}
            title="المعاهد"
            value="4"
            subtitle="معاهد نشطة"
          />

          <StatCard
            icon={<Users size={22} />}
            title="الطلاب"
            value={totalStudents.toLocaleString("ar-EG")}
            subtitle="طلاب مسجلون"
          />

          <StatCard
            icon={<GraduationCap size={22} />}
            title="المدرسون"
            value={totalTeachers.toLocaleString("ar-EG")}
            subtitle="مدرسون مسجلون"
          />

          <StatCard
            icon={<Activity size={22} />}
            title="الحضور"
            value="92%"
            subtitle="متوسط الحضور"
          />
        </div>
      </section>

      {/* Institutes */}
      <section
        id="institutes"
        className="border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold text-emerald-700">
                إدارة المعاهد
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                المعاهد التعليمية
              </h2>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                عرض مركزي لحالة المعاهد ومؤشرات الأداء الأساسية.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              جميع المعاهد نشطة
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {institutes.map((institute) => (
              <div
                key={institute.code}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Building2 size={21} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold leading-7 text-slate-900">
                        {institute.name}
                      </h3>

                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>الكود: {institute.code}</span>
                        <span>•</span>
                        <span>{institute.type}</span>
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {institute.status}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <InstituteMetric
                    label="الطلاب"
                    value={institute.students.toLocaleString("ar-EG")}
                  />

                  <InstituteMetric
                    label="المدرسون"
                    value={institute.teachers.toLocaleString("ar-EG")}
                  />

                  <InstituteMetric
                    label="الحضور"
                    value={`${institute.attendance}%`}
                  />
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-slate-500">
                      مؤشر الحضور
                    </span>

                    <span className="font-bold text-slate-700">
                      {institute.attendance}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width: `${institute.attendance}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold text-emerald-700">
              إمكانيات المنصة
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              نظام متكامل للإدارة والمتابعة
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Users size={22} />}
              title="إدارة الطلاب"
              description="متابعة بيانات الطلاب والفصول والحالة التعليمية."
            />

            <FeatureCard
              icon={<GraduationCap size={22} />}
              title="إدارة المدرسين"
              description="تنظيم بيانات المدرسين ومتابعة الكوادر التعليمية."
            />

            <FeatureCard
              icon={<ClipboardList size={22} />}
              title="طلبات المعاهد"
              description="استقبال الطلبات ومتابعتها واتخاذ الإجراءات المناسبة."
            />

            <FeatureCard
              icon={<AlertCircle size={22} />}
              title="الشكاوى والبلاغات"
              description="إدارة الشكاوى ومتابعة حالتها حتى إغلاقها."
            />
          </div>
        </div>
      </section>

      {/* Activities */}
      <section
        id="activities"
        className="border-t border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm font-bold text-emerald-700">
              المتابعة
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              آخر الأنشطة
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {activities.map((activity, index) => {
              const Icon = activity.icon;

              return (
                <div
                  key={`${activity.title}-${index}`}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">
                      {activity.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {activity.description}
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-900">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Bell size={26} />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold text-white sm:text-3xl">
            منصة واحدة لإدارة ومتابعة المعاهد
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-emerald-100/80 sm:text-base">
            تم تصميم المنصة لتجميع البيانات والعمليات اليومية في واجهة
            واضحة تساعد الإدارة على المتابعة واتخاذ الإجراءات بسرعة.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50"
            >
              تسجيل الدخول للنظام
              <ArrowLeft size={17} />
            </Link>

            <a
              href="#dashboard"
              className="flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              العودة إلى الأعلى
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 px-4 py-8 text-center text-sm text-slate-400">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p>
              نظام إدارة المعاهد الأزهرية
            </p>

            <p>
              نسخة تجريبية للعرض والتعريف بالمنصة
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-emerald-700">{icon}</span>
        <span className="text-lg font-extrabold text-slate-900">
          {value}
        </span>
      </div>

      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InstituteMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-lg font-extrabold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <h3 className="mt-5 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-7 text-slate-500">
        {description}
      </p>
    </div>
  );
}
