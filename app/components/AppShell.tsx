"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  Building2,
  ClipboardList,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquareWarning,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import LogoutButton from "./LogoutButton";
import { supabase } from "../../lib/supabase/client";

type AppRole =
  | "super_admin"
  | "director"
  | "deputy"
  | "it_admin"
  | "sheikh"
  | "institute_deputy"
  | "teacher"
  | "employee"
  | "student"
  | "parent";

type Profile = {
  role: AppRole;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  roles?: AppRole[];
};

const ALL_MANAGEMENT_ROLES: AppRole[] = [
  "super_admin",
  "director",
  "deputy",
  "it_admin",
  "sheikh",
  "institute_deputy",
  "teacher",
  "employee",
  "student",
  "parent",
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setProfile(null);
            setLoadingProfile(false);
          }

          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "role, full_name, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("AppShell profile error:", error);
        }

        if (mounted) {
          setProfile(data as Profile | null);
          setLoadingProfile(false);
        }
      } catch (error) {
        console.error("AppShell error:", error);

        if (mounted) {
          setProfile(null);
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const role = profile?.role;

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "لوحة التحكم",
      icon: LayoutDashboard,
      roles: ALL_MANAGEMENT_ROLES,
    },

    {
      href: "/institutes",
      label: "إدارة المعاهد",
      icon: Building2,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "it_admin",
      ],
    },

    /*
     * إدارة المستخدمين
     * مدير الإدارة: إدارة جميع المستخدمين
     * مسؤول IT: إدارة مستخدمي معهده فقط
     */
    {
      href: "/users",
      label: "إدارة المستخدمين",
      icon: UserCog,
      roles: [
        "super_admin",
        "director",
        "it_admin",
      ],
    },

    {
      href: "/students",
      label: "الطلاب",
      icon: GraduationCap,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
        "teacher",
        "employee",
      ],
    },

    {
      href: "/teachers",
      label: "المدرسون",
      icon: Users,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
        "employee",
      ],
    },

    {
      href: "/attendance",
      label: "الحضور والغياب",
      icon: ClipboardList,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "teacher",
      ],
    },

    {
      href: "/attendance-report",
      label: "التقارير والإحصائيات",
      icon: FileBarChart,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
      ],
    },

    {
      href: "/institute-tasks",
      label: "المهام والمتابعة",
      icon: BookOpenCheck,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
        "employee",
      ],
    },

    {
      href: "/institute-requests",
      label: "طلبات المعاهد",
      icon: FileText,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
        "employee",
      ],
    },

    {
      href: "/announcements",
      label: "الإعلانات",
      icon: Bell,
      roles: ALL_MANAGEMENT_ROLES,
    },

    {
      href: "/complaints",
      label: "الشكاوى والبلاغات",
      icon: MessageSquareWarning,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
        "employee",
      ],
    },

    {
      href: "/parent-complaints",
      label: "شكاوى أولياء الأمور",
      icon: MessageSquareWarning,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "employee",
      ],
    },

    {
      href: "/import",
      label: "استيراد البيانات",
      icon: Upload,
      roles: [
        "super_admin",
        "director",
        "deputy",
        "sheikh",
        "institute_deputy",
        "it_admin",
      ],
    },

    {
      href: "/settings",
      label: "الإعدادات",
      icon: Settings,
      roles: ALL_MANAGEMENT_ROLES,
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) {
      return true;
    }

    if (!role) {
      return false;
    }

    return item.roles.includes(role);
  });

  const roleLabel = (() => {
    switch (role) {
      case "super_admin":
        return "مدير الإدارة التعليمية الأزهرية";

      case "director":
        return "مدير الإدارة التعليمية الأزهرية";

      case "deputy":
        return "وكيل الإدارة التعليمية الأزهرية";

      case "it_admin":
        return "مسؤول تكنولوجيا المعلومات";

      case "sheikh":
        return "شيخ المعهد";

      case "institute_deputy":
        return "وكيل شيخ المعهد";

      case "teacher":
        return "مدرس";

      case "employee":
        return "موظف";

      case "student":
        return "طالب";

      case "parent":
        return "ولي أمر";

      default:
        return "نظام إدارة المعاهد الأزهرية";
    }
  })();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      {/* =========================================
          القائمة الجانبية
      ========================================== */}
      <aside className="fixed right-0 top-0 z-40 flex h-screen w-72 flex-col border-l border-slate-200 bg-white shadow-sm">

        {/* الشعار */}
        <div className="flex h-20 shrink-0 items-center border-b border-slate-200 px-5">
          <div className="flex w-full items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <ShieldCheck
                size={24}
                strokeWidth={2}
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                نظام إدارة المعاهد الأزهرية
              </div>

              <div className="mt-1 truncate text-xs text-slate-500">
                منصة الإدارة التعليمية الأزهرية
              </div>
            </div>

          </div>
        </div>

        {/* بيانات المستخدم */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <UserRound size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-800">
                {loadingProfile
                  ? "جاري التحميل..."
                  : profile?.full_name || "المستخدم"}
              </div>

              <div className="mt-1 truncate text-xs text-slate-500">
                {roleLabel}
              </div>
            </div>

          </div>
        </div>

        {/* =========================================
            روابط القائمة
        ========================================== */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">

            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.2 : 1.9}
                  />

                  <span>{item.label}</span>

                  {/* علامة خاصة بإدارة المستخدمين */}
                  {item.href === "/users" &&
                    role === "super_admin" && (
                      <span
                        className={[
                          "mr-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100 text-emerald-700",
                        ].join(" ")}
                      >
                        إدارة
                      </span>
                    )}
                </Link>
              );
            })}

          </div>
        </nav>

        {/* تسجيل الخروج */}
        <div className="shrink-0 border-t border-slate-200 p-3">
          <LogoutButton />
        </div>

      </aside>

      {/* =========================================
          المحتوى الرئيسي
      ========================================== */}
      <div className="min-h-screen pr-72">

        {/* الهيدر */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-8 shadow-sm backdrop-blur">

          <div>
            <div className="text-lg font-bold text-slate-900">
              {roleLabel}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              نظام إدارة المعاهد الأزهرية
            </div>
          </div>

          <div className="flex items-center gap-3">

            {/* الإشعارات */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              title="الإشعارات"
            >
              <Bell size={19} />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* بيانات المستخدم */}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-800">
                {profile?.full_name || "المستخدم"}
              </div>

              <div className="text-xs text-slate-500">
                {roleLabel}
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <UserRound size={20} />
            </div>

          </div>
        </header>

        {/* =========================================
            محتوى الصفحة
        ========================================== */}
        <main className="min-h-[calc(100vh-5rem)] p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
