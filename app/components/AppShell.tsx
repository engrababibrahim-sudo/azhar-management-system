"use client";

import {
  Bell,
  Building2,
  CheckSquare,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Megaphone,
  Settings,
  Users,
  UserRound,
  X,
  BookOpenCheck,
  MessageSquareWarning,
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
    roles: ["director", "sheikh", "deputy", "teacher", "super_admin"],
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
    roles: ["director", "sheikh", "deputy", "teacher", "super_admin"],
  },
  {
    title: "التقارير والإحصائيات",
    href: "/attendance-report",
    icon: FileBarChart,
    roles: ["director", "sheikh", "deputy", "super_admin"],
  },
  {
    title: "المهام والمتابعة",

    // تم تعديل هذا الرابط فقط
    href: "/institute-tasks",

    icon: CheckSquare,
    roles: ["director", "sheikh", "deputy", "super_admin"],
  },
  {
    title: "الإعلانات",
    href: "/announcements",
    icon: Megaphone,
    roles: ["director", "sheikh", "deputy", "teacher", "super_admin"],
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
  title: "شكاوى أولياء الأمور",
  href: "/parent-complaints",
  icon: MessageSquareWarning,
  roles: ["director", "deputy", "super_admin"],
},
{
  title: "استيراد البيانات",
  href: "/import",
  icon: BookOpenCheck,
  roles: ["director", "super_admin"],
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
    <div className="min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 z-50
          h-screen w-72
          bg-slate-950 text-white
          shadow-2xl
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <Link
              href="/"
              onClick={closeSidebar}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
                <Building2 size={23} />
              </div>

              <div>
                <div className="text-sm font-bold">
                  نظام إدارة المعاهد
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  الإدارة التعليمية الأزهرية
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={closeSidebar}
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Profile */}
          <div className="border-b border-white/10 px-4 py-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
                  <UserRound size={21} />
                </div>

                <div className="min-w-0">
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

                      <div className="mt-1 text-xs text-slate-400">
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

                  <span className="leading-5">
                    {institute.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                      pathname.startsWith(`${item.href}/`);

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
                    <Icon size={19} />

                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Notifications */}
          <div className="px-3 pb-2">
            <Link
              href="/announcements"
              onClick={closeSidebar}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Bell size={19} />

              <span>التنبيهات والإشعارات</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-white/10 p-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-screen lg:pr-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          >
            <Menu size={23} />
          </button>

          <Link
            href="/"
            className="text-sm font-bold text-slate-900"
          >
            نظام إدارة المعاهد الأزهرية
          </Link>

          <Link
            href="/announcements"
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          >
            <Bell size={21} />
          </Link>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
