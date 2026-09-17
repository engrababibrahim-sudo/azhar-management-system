"use client";

import {
  Bell,
  BookOpenCheck,
  Building2,
  CheckSquare,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageSquareWarning,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import LogoutButton from "./LogoutButton";

type Profile = {
  role: string;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  name: string;
};

const roleLabels: Record<string, string> = {
  super_admin: "مدير النظام",
  director: "مدير الإدارة",
  deputy: "وكيل الإدارة",
  sheikh: "شيخ المعهد",
  teacher: "مدرس",
  employee: "موظف",
  student: "طالب",
  parent: "ولي أمر",
};

const allMenuItems = [
  {
    title: "لوحة التحكم",
    href: "/",
    icon: LayoutDashboard,
    roles: ["director", "sheikh", "deputy", "super_admin"],
  },
  {
    title: "إدارة المعاهد",
    href: "/institutes",
    icon: Building2,
    roles: ["director", "deputy", "super_admin"],
  },
  {
    title: "الطلاب",
    href: "/students",
    icon: GraduationCap,
    roles: [
      "director",
      "sheikh",
      "deputy",
      "teacher",
      "super_admin",
    ],
  },
  {
    title: "المدرسون",
    href: "/teachers",
    icon: Users,
    roles: ["director", "sheikh", "deputy", "super_admin"],
  },
  {
    title: "الحضور والغياب",
    href: "/attendance",
    icon: ClipboardList,
    roles: [
      "director",
      "sheikh",
      "deputy",
      "teacher",
      "super_admin",
    ],
  },
  {
    title: "التقارير والإحصائيات",
    href: "/attendance-report",
    icon: FileBarChart,
    roles: ["director", "sheikh", "deputy", "super_admin"],
  },
  {
    title: "المهام والمتابعة",
    href: "/tasks",
    icon: CheckSquare,
    roles: ["director", "sheikh", "deputy", "super_admin"],
  },
  {
    title: "الإعلانات",
    href: "/announcements",
    icon: Megaphone,
    roles: [
      "director",
      "sheikh",
      "deputy",
      "teacher",
      "super_admin",
    ],
  },
  {
    title: "الشكاوى والبلاغات",
    href: "/complaints",
    icon: MessageSquareWarning,
    roles: [
      "director",
      "sheikh",
      "deputy",
      "teacher",
      "employee",
      "parent",
      "super_admin",
    ],
  },
  {
    title: "استيراد البيانات",
    href: "/import",
    icon: BookOpenCheck,
    roles: ["director", "super_admin"],
  },
  {
    title: "الإعدادات",
    href: "/settings",
    icon: Settings,
    roles: ["director", "super_admin"],
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingProfile(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, full_name, institute_id, directorate_id")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        if (profileData.institute_id) {
          const { data: instituteData } = await supabase
            .from("institutes")
            .select("name")
            .eq("id", profileData.institute_id)
            .single();

          if (instituteData) {
            setInstitute(instituteData);
          }
        }
      }

      setLoadingProfile(false);
    }

    loadProfile();
  }, []);

  const role = profile?.role || "";

  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(role)
  );

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-50
          h-screen
          w-[min(18rem,calc(100vw-1rem))]
          overflow-hidden
          bg-slate-950 text-white
          shadow-2xl
          transform-gpu
          transition-transform duration-300 ease-in-out
          ${
            sidebarOpen
              ? "translate-x-0"
              : "translate-x-full"
          }
          lg:translate-x-0
        `}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Logo */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
            <Link
              href="/"
              onClick={closeSidebar}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
                <Building2 size={22} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-bold">
                  نظام إدارة المعاهد
                </div>

                <div className="mt-1 truncate text-xs text-slate-400">
                  الإدارة التعليمية الأزهرية
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={closeSidebar}
              aria-label="إغلاق القائمة"
              className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Profile */}
          <div className="shrink-0 border-b border-white/10 px-3 py-3">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
                  <UserRound size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  {loadingProfile ? (
                    <>
                      <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                      <div className="mt-2 h-3 w-16 animate-pulse rounded bg-white/10" />
                    </>
                  ) : (
                    <>
                      <div className="truncate text-sm font-bold">
                        {profile?.full_name || "المستخدم"}
                      </div>

                      <div className="mt-1 truncate text-xs text-slate-400">
                        {roleLabels[role] || "مستخدم"}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {institute && (
                <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-xs text-slate-400">
                  <Building2
                    size={15}
                    className="mt-0.5 shrink-0"
                  />

                  <span className="break-words leading-5">
                    {institute.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-3 px-3 text-[11px] font-bold tracking-wide text-slate-500">
              القائمة الرئيسية
            </div>

            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;

                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`
                      flex items-center gap-3 rounded-xl px-4 py-3
                      text-sm font-medium
                      transition
                      ${
                        active
                          ? "bg-white text-slate-950 shadow-lg"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <Icon size={19} className="shrink-0" />
                    <span className="truncate">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Notifications */}
          <div className="shrink-0 px-3 pb-2">
            <Link
              href="/announcements"
              onClick={closeSidebar}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Bell size={19} className="shrink-0" />
              <span className="truncate">
                التنبيهات والإشعارات
              </span>
            </Link>
          </div>

          {/* Logout */}
          <div className="shrink-0 border-t border-white/10 p-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-screen w-full lg:pr-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
          >
            <Menu size={23} />
          </button>

          <Link
            href="/"
            className="min-w-0 flex-1 px-2 text-center text-sm font-bold text-slate-900"
          >
            <span className="block truncate">
              نظام إدارة المعاهد الأزهرية
            </span>
          </Link>

          <Link
            href="/announcements"
            aria-label="التنبيهات"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
          >
            <Bell size={21} />
          </Link>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
