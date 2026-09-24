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
  Bell,
  Settings,
  FileSpreadsheet,
  CalendarCheck,
  UserRound,
  ChevronLeft,
  Menu,
  X,
  LogOut,
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

export default function Home() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

    if (!value) return institutes;

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

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 text-slate-800"
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed right-0 top-0 z-50 h-screen w-72
          bg-slate-950 text-white
          transition-transform duration-300
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg">
                <Building2 size={25} />
              </div>

              <div>
                <h1 className="font-bold">Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©</h1>
                <p className="mt-1 text-xs text-slate-400">
                  Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯ Ø§Ù„Ø£Ø²Ù‡Ø±ÙŠØ©
                </p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute left-4 top-5 rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold text-slate-500">
              Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
            </p>

            <SidebarLink
              href="/"
              icon={<LayoutDashboard size={19} />}
              label="Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…"
              active
            />

            <SidebarLink
              href="/institutes"
              icon={<Building2 size={19} />}
              label="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯"
            />

            <SidebarLink
              href="/students"
              icon={<GraduationCap size={19} />}
              label="Ø§Ù„Ø·Ù„Ø§Ø¨"
            />

            <SidebarLink
              href="/teachers"
              icon={<Users size={19} />}
              label="Ø§Ù„Ù…Ø¯Ø±Ø³ÙˆÙ†"
            />

            <SidebarLink
              href="/attendance"
              icon={<CalendarCheck size={19} />}
              label="Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„ØºÙŠØ§Ø¨"
            />

            <SidebarLink
              href="/attendance-report"
              icon={<BarChart3 size={19} />}
              label="Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± ÙˆØ§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª"
            />

            <div className="my-6 border-t border-white/10" />

            <p className="mb-3 px-3 text-xs font-semibold text-slate-500">
              Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©
            </p>

            <SidebarLink
              href="/tasks"
              icon={<ClipboardCheck size={19} />}
              label="Ø§Ù„Ù…Ù‡Ø§Ù… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©"
            />

            <SidebarLink
              href="/announcements"
              icon={<Bell size={19} />}
              label="Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª"
            />

            <SidebarLink
              href="/import"
              icon={<FileSpreadsheet size={19} />}
              label="Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª"
            />

            <SidebarLink
              href="/settings"
              icon={<Settings size={19} />}
              label="Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª"
            />
          </nav>

          {/* User */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600">
                <UserRound size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  Ù…Ø¯ÙŠØ± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Ù…Ø¯ÙŠØ± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={18} />
              ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:mr-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 hover:bg-slate-50 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Ù†Ø¸Ø§Ù… Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù…Ø±ÙƒØ²ÙŠØ©
                </p>

                <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                  Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ© Ø§Ù„Ø£Ø²Ù‡Ø±ÙŠØ©
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadInstitutes}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</span>
              </button>

              <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 hover:bg-slate-50">
                <Bell size={19} />

                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Welcome */}
          <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8">
            <div className="relative z-10 max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Ø§Ù„Ù†Ø¸Ø§Ù… ÙŠØ¹Ù…Ù„ Ø¨Ø´ÙƒÙ„ Ø·Ø¨ÙŠØ¹ÙŠ
              </div>

              <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                Ù…Ø±Ø­Ø¨Ù‹Ø§ Ø¨Ùƒ ÙÙŠ Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                ØªØ§Ø¨Ø¹ Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯ ÙˆØ§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ§Ù„Ù…Ø¯Ø±Ø³ÙŠÙ† Ù…Ù† Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯ØŒ
                ÙˆØ§Ø­ØµÙ„ Ø¹Ù„Ù‰ ØµÙˆØ±Ø© Ø´Ø§Ù…Ù„Ø© Ø¹Ù† Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/institutes"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
                >
                  Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯
                  <ArrowLeft size={17} />
                </Link>

                <Link
                  href="/attendance-report"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Ø¹Ø±Ø¶ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±
                  <BarChart3 size={17} />
                </Link>
              </div>
            </div>

            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-emerald-400/5 blur-3xl" />
          </section>

          {/* Stats */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯"
              value={institutes.length}
              subtitle={`${activeInstitutes} Ù…Ø¹Ù‡Ø¯ Ù†Ø´Ø·`}
              icon={<Building2 size={23} />}
            />

            <StatCard
              title="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨"
              value={totalStudents.toLocaleString("ar-EG")}
              subtitle="Ø·Ù„Ø§Ø¨ Ù…Ø³Ø¬Ù„ÙˆÙ†"
              icon={<GraduationCap size={23} />}
            />

            <StatCard
              title="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠÙ†"
              value={totalTeachers.toLocaleString("ar-EG")}
              subtitle="Ø£Ø¹Ø¶Ø§Ø¡ Ù‡ÙŠØ¦Ø© Ø§Ù„ØªØ¯Ø±ÙŠØ³"
              icon={<Users size={23} />}
            />

            <StatCard
              title="Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…"
              value="Ù…ØªØµÙ„"
              subtitle="Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¹Ù…Ù„"
              icon={<CheckCircle2 size={23} />}
              success
            />
          </section>

          {/* Quick Actions */}
          <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <QuickAction
              href="/institutes"
              icon={<Building2 size={21} />}
              title="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯"
              subtitle="Ø¹Ø±Ø¶ ÙˆØ¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯"
            />

            <QuickAction
              href="/students"
              icon={<GraduationCap size={21} />}
              title="Ø§Ù„Ø·Ù„Ø§Ø¨"
              subtitle="Ø¥Ø¯Ø§Ø±Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø§Ø¨"
            />

            <QuickAction
              href="/attendance"
              icon={<CalendarCheck size={21} />}
              title="Ø§Ù„Ø­Ø¶ÙˆØ±"
              subtitle="Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„ØºÙŠØ§Ø¨"
            />

            <QuickAction
              href="/attendance-report"
              icon={<BarChart3 size={21} />}
              title="Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±"
              subtitle="Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©"
            />
          </section>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-bold">
                    Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯
                  </p>

                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Institutes */}
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Building2 size={21} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯ Ø§Ù„ØªØ§Ø¨Ø¹Ø© Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ø±ÙŠØ¹Ø© Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯ ÙˆØ­Ø§Ù„ØªÙ‡Ø§
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative w-full lg:w-96">
                  <Search
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ø§Ø¨Ø­Ø« Ø¨Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù‡Ø¯ Ø£Ùˆ Ø§Ù„ÙƒÙˆØ¯ Ø£Ùˆ Ø§Ù„Ø´ÙŠØ®..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="p-14 text-center">
                <Loader2
                  className="mx-auto animate-spin text-emerald-600"
                  size={36}
                />

                <p className="mt-4 text-sm text-slate-500">
                  Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯...
                </p>
              </div>
            )}

            {/* Empty */}
            {!loading &&
              !error &&
              filteredInstitutes.length === 0 && (
                <div className="p-14 text-center">
                  <Building2
                    size={42}
                    className="mx-auto text-slate-300"
                  />

                  <h3 className="mt-4 font-bold text-slate-800">
                    Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù…Ø¹Ø§Ù‡Ø¯ Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„Ø¨Ø­Ø«.
                  </p>
                </div>
              )}

            {/* Institute Cards */}
            {!loading && filteredInstitutes.length > 0 && (
              <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredInstitutes.map((institute) => (
                  <InstituteCard
                    key={institute.id}
                    institute={institute}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Bottom Sections */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* System Status */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„ ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={22} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <StatusRow
                  title="Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª"
                  value="Ù…ØªØµÙ„"
                />

                <StatusRow
                  title="Ø®Ø¯Ù…Ø© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„"
                  value="ØªØ¹Ù…Ù„"
                />

                <StatusRow
                  title="Ø®Ø¯Ù…Ø© Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯"
                  value={`${activeInstitutes} Ù†Ø´Ø·`}
                />
              </div>
            </section>

            {/* Recent Activity */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Ø¢Ø®Ø± Ø§Ù„Ø£Ù†Ø´Ø·Ø©
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Ù†Ø¸Ø±Ø© Ø³Ø±ÙŠØ¹Ø© Ø¹Ù„Ù‰ Ù†Ø´Ø§Ø· Ø§Ù„Ù†Ø¸Ø§Ù…
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <ClipboardCheck size={21} />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Activity
                  icon={<Building2 size={17} />}
                  title="ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯"
                  description={`${institutes.length} Ù…Ø¹Ø§Ù‡Ø¯ Ù…Ø³Ø¬Ù„Ø© Ø­Ø§Ù„ÙŠÙ‹Ø§`}
                />

                <Activity
                  icon={<GraduationCap size={17} />}
                  title="Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø§Ø¨"
                  description={`${totalStudents.toLocaleString(
                    "ar-EG"
                  )} Ø·Ø§Ù„Ø¨ Ù…Ø³Ø¬Ù„`}
                />

                <Activity
                  icon={<Users size={17} />}
                  title="Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠÙ†"
                  description={`${totalTeachers.toLocaleString(
                    "ar-EG"
                  )} Ù…Ø¯Ø±Ø³ Ù…Ø³Ø¬Ù„`}
                />
              </div>
            </section>
          </div>

          <footer className="py-8 text-center text-xs text-slate-400">
            Ù†Ø¸Ø§Ù… Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¹Ø§Ù‡Ø¯ Ø§Ù„Ø£Ø²Ù‡Ø±ÙŠØ© â€” Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©
          </footer>
        </div>
      </div>
    </main>
  );
}

/* =========================
   Sidebar Link
========================= */

function SidebarLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition
        ${
          active
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/* =========================
   Stat Card
========================= */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  success = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              success ? "text-emerald-600" : "text-slate-900"
            }`}
          >
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            success
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Quick Action
========================= */

function QuickAction({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {title}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}

/* =========================
   Institute Card
========================= */

function InstituteCard({
  institute,
}: {
  institute: Institute;
}) {
  const students = institute.student_count || 0;
  const teachers = institute.teacher_count || 0;
  const active = institute.is_active !== false;

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700">
            <Building2 size={21} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-900">
              {institute.name}
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {institute.code}
            </p>
          </div>
        </div>

        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ù†Ø´Ø·
          </span>
        ) : (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
            ØºÙŠØ± Ù†Ø´Ø·
          </span>
        )}
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-sm">
          <UserRound size={16} className="text-slate-400" />

          <span className="text-slate-500">
            Ø´ÙŠØ® Ø§Ù„Ù…Ø¹Ù‡Ø¯:
          </span>

          <span className="font-semibold text-slate-800">
            {institute.director_name || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric
          icon={<GraduationCap size={17} />}
          title="Ø§Ù„Ø·Ù„Ø§Ø¨"
          value={students.toLocaleString("ar-EG")}
        />

        <Metric
          icon={<Users size={17} />}
          title="Ø§Ù„Ù…Ø¯Ø±Ø³ÙˆÙ†"
          value={teachers.toLocaleString("ar-EG")}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-400">
            Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            {institute.educational_stage ||
              institute.institute_type ||
              "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}
          </p>
        </div>

        <Link
          href={`/institutes/${institute.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
        >
          ÙØªØ­ Ø§Ù„Ù…Ø¹Ù‡Ø¯
          <ChevronLeft size={15} />
        </Link>
      </div>
    </div>
  );
}

/* =========================
   Metric
========================= */

function Metric({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs">{title}</span>
      </div>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* =========================
   Status Row
========================= */

function StatusRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="text-sm text-slate-600">
          {title}
        </span>
      </div>

      <span className="text-sm font-bold text-emerald-700">
        {value}
      </span>
    </div>
  );
}

/* =========================
   Activity
========================= */

function Activity({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
