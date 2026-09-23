import Link from "next/link";
import { usePathname } from "next/navigation";
import {
LayoutDashboard,
Building2,
Users,
GraduationCap,
ClipboardCheck,
BarChart3,
ListTodo,
MessageSquarePlus,
Megaphone,
MessageSquareWarning,
Upload,
Settings,
Bell,
Menu,
X,
} from "lucide-react";
import { useEffect, useState } from "react";

import LogoutButton from "./LogoutButton";
import { supabase } from "../../lib/supabase/client";

type Role =
| "super_admin"
| "director"
| "deputy"
| "sheikh"
| "teacher"
| "employee"
| "student"
| "parent";

type MenuItem = {
label: string;
href: string;
icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
roles?: Role[];
};

const allMenuItems: MenuItem[] = [
{
label: "لوحة التحكم",
href: "/",
icon: LayoutDashboard,
},
{
label: "إدارة المعاهد",
href: "/institutes",
icon: Building2,
},
{
label: "الطلاب",
href: "/students",
icon: Users,
},
{
label: "المدرسون",
href: "/teachers",
icon: GraduationCap,
},
{
label: "الحضور والغياب",
href: "/attendance",
icon: ClipboardCheck,
},
{
label: "التقارير والإحصائيات",
href: "/attendance-report",
icon: BarChart3,
},
{
label: "المهام والمتابعة",
href: "/institute-tasks",
icon: ListTodo,
},
{
label: "طلبات المعاهد",
href: "/institute-requests",
icon: MessageSquarePlus,
},
{
label: "الإعلانات",
href: "/announcements",
icon: Megaphone,
},
{
label: "الشكاوى والبلاغات",
href: "/complaints",
icon: MessageSquareWarning,
},
{
label: "استيراد البيانات",
href: "/import",
icon: Upload,
},
{
label: "الإعدادات",
href: "/settings",
icon: Settings,
},
];

const roleLabels: Record<Role, string> = {
super_admin: "مدير النظام",
director: "مدير الإدارة",
deputy: "وكيل الإدارة",
sheikh: "شيخ المعهد",
teacher: "مدرس",
employee: "موظف",
student: "طالب",
parent: "ولي أمر",
};

export default function AppShell({
children,
}: {
children: React.ReactNode;
}) {
const pathname = usePathname();

const [role, setRole] = useState<Role | null>(null);
const [fullName, setFullName] = useState("المستخدم");
const [loading, setLoading] = useState(true);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

useEffect(() => {
let mounted = true;

async function loadProfile() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!mounted) return;

    if (!user) {
      setRole(null);
      setFullName("المستخدم");
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!mounted) return;

    if (error) {
      console.error("Profile loading error:", error);
      setRole(null);
      setFullName("المستخدم");
      setLoading(false);
      return;
    }

    if (profile) {
      setRole(profile.role as Role);
      setFullName(profile.full_name || "المستخدم");
    } else {
      setRole(null);
      setFullName("المستخدم");
    }
  } catch (error) {
    console.error("Unexpected profile error:", error);

    if (mounted) {
      setRole(null);
      setFullName("المستخدم");
    }
  } finally {
    if (mounted) {
      setLoading(false);
    }
  }
}

loadProfile();

return () => {
  mounted = false;
};

}, []);

useEffect(() => {
setMobileMenuOpen(false);
}, [pathname]);

const visibleMenuItems = allMenuItems.filter((item) => {
if (!item.roles || item.roles.length === 0) {
return true;
}

if (!role) {
  return false;
}

return item.roles.includes(role);

});

function isActive(href: string) {
if (href === "/") {
return pathname === "/";
}

return pathname === href || pathname.startsWith(href + "/");

}

return (
<div className="min-h-screen bg-slate-100" dir="rtl">
{/* Mobile Header */}
<div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
<button
type="button"
onClick={() => setMobileMenuOpen(true)}
className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100"
aria-label="فتح القائمة"
>
<Menu size={24} />
</button>

    <div className="text-center">
      <div className="text-sm font-bold text-slate-900">
        نظام إدارة المعاهد الأزهرية
      </div>

      <div className="text-xs text-slate-500">
        الإدارة والمتابعة المركزية
      </div>
    </div>

    <Link
      href="/announcements"
      className="relative rounded-xl p-2 text-slate-700 transition hover:bg-slate-100"
      aria-label="الإشعارات"
    >
      <Bell size={22} />
    </Link>
  </div>

  {/* Mobile Overlay */}
  {mobileMenuOpen && (
    <button
      type="button"
      aria-label="إغلاق القائمة"
      onClick={() => setMobileMenuOpen(false)}
      className="fixed inset-0 z-40 bg-black/30 lg:hidden"
    />
  )}

  {/* Sidebar */}
  <aside
    className={[
      "fixed right-0 top-0 z-50 flex h-screen w-72 flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300",
      mobileMenuOpen ? "translate-x-0" : "translate-x-full",
      "lg:translate-x-0",
    ].join(" ")}
  >
    {/* Sidebar Header */}
    <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
      <div>
        <div className="text-base font-extrabold text-slate-900">
          نظام إدارة المعاهد الأزهرية
        </div>

        <div className="mt-1 text-xs text-slate-500">
          منصة الإدارة والمتابعة المركزية
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(false)}
        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
        aria-label="إغلاق القائمة"
      >
        <X size={20} />
      </button>
    </div>

    {/* User */}
    <div className="border-b border-slate-200 px-5 py-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-900">
          {loading ? "جاري التحميل..." : fullName}
        </div>

        <div className="mt-1 text-xs font-medium text-slate-500">
          {role ? roleLabels[role] : "المستخدم"}
        </div>
      </div>
    </div>

    {/* Menu */}
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={[
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>

    {/* Logout */}
    <div className="border-t border-slate-200 p-3">
      <LogoutButton />
    </div>
  </aside>

  {/* Main Content */}
  <main className="min-h-screen lg:mr-72">
    {children}
  </main>
</div>

);
}

بعد اللصق:
