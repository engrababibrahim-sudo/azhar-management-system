"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building2, GraduationCap, Users, ClipboardCheck,
  BarChart3, Bell, MessageSquare, ClipboardList, FileText, Settings,
  UserCheck, CalendarDays, BookOpen, UserPlus, Send, AlertTriangle,
  CircleCheck, TrendingUp, LogOut, ArrowRight, RefreshCw,
  MessageSquareWarning, Menu, X, FolderOpen, Search, Printer
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

type Institute = {
  id: string; name: string; code: string | null; institute_type: string | null;
  educational_stage: string | null; director_name: string | null;
  student_count: number | null; teacher_count: number | null; is_active: boolean;
};

type Counts = { students: number; teachers: number; activeStudents: number; activeTeachers: number };

export default function InstituteDashboard() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params.id as string;
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [counts, setCounts] = useState<Counts>({ students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function loadInstitute(showRefresh = false) {
    if (!instituteId) return;
    showRefresh ? setRefreshing(true) : setLoading(true);
    setError("");
    const { data, error } = await supabase.from("institutes").select("id,name,code,institute_type,educational_stage,director_name,student_count,teacher_count,is_active").eq("id", instituteId).single();
    if (error) { console.error(error); setError(error.message); setInstitute(null); }
    else {
      setInstitute(data);
      const [students, teachers, activeStudents, activeTeachers] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institute_id", instituteId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institute_id", instituteId),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institute_id", instituteId).eq("is_active", true),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institute_id", instituteId).eq("is_active", true),
      ]);
      setCounts({ students: students.count ?? 0, teachers: teachers.count ?? 0, activeStudents: activeStudents.count ?? 0, activeTeachers: activeTeachers.count ?? 0 });
    }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { loadInstitute(); }, [instituteId]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) { alert("حدث خطأ أثناء تسجيل الخروج"); return; }
    router.replace("/login"); router.refresh();
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50"><div className="rounded-2xl bg-white p-10 text-center shadow-sm"><RefreshCw size={35} className="mx-auto animate-spin text-slate-400"/><p className="mt-4 text-slate-500">جاري تحميل الملف المؤسسي...</p></div></main>;

  if (error || !institute) return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50"><div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><AlertTriangle size={40} className="mx-auto text-red-500"/><h1 className="mt-4 text-xl font-bold">تعذر تحميل المعهد</h1><p className="mt-3 text-sm text-red-600">{error || "المعهد غير موجود"}</p><Link href="/institutes" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"><ArrowRight size={17}/>العودة إلى المعاهد</Link></div></main>;

  const attendance = counts.activeStudents ? Math.round((counts.activeStudents / counts.students) * 100) : 0;
  const studentActiveRate = counts.students ? Math.round((counts.activeStudents / counts.students) * 100) : 0;
  const teacherActiveRate = counts.teachers ? Math.round((counts.activeTeachers / counts.teachers) * 100) : 0;

  return <main dir="rtl" className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 print:bg-white">
    <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 flex-col bg-slate-950 text-white lg:flex print:hidden">
      <Brand institute={institute}/>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        <MenuItem icon={LayoutDashboard} title="الملف المؤسسي" active />
        <Link href={`/students?instituteId=${institute.id}`}><MenuItem icon={GraduationCap} title="الطلاب"/></Link>
        <Link href={`/teachers?instituteId=${institute.id}`}><MenuItem icon={Users} title="المعلمين والموظفين"/></Link>
        <Link href={`/attendance?instituteId=${institute.id}`}><MenuItem icon={ClipboardCheck} title="الحضور والغياب"/></Link>
        <Link href={`/attendance-report?instituteId=${institute.id}`}><MenuItem icon={BarChart3} title="تقارير الحضور"/></Link>
        <Link href={`/institute-tasks?instituteId=${institute.id}`}><MenuItem icon={ClipboardList} title="التكليفات"/></Link>
        <Link href={`/complaints?instituteId=${institute.id}`}><MenuItem icon={MessageSquareWarning} title="الشكاوى والبلاغات"/></Link>
        <Link href={`/visits?instituteId=${institute.id}`}><MenuItem icon={ClipboardCheck} title="الزيارات والتفتيش"/></Link>
      </nav>
      <div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-slate-900">إ</div><div><div className="text-sm font-semibold">إدارة المعهد</div><div className="text-xs text-slate-400">شيخ المعهد</div></div></div><button onClick={handleLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500 hover:text-white"><LogOut size={18}/>تسجيل الخروج</button></div>
    </aside>

    {mobileMenuOpen && <div className="fixed inset-0 z-50 lg:hidden print:hidden"><button aria-label="إغلاق القائمة" onClick={()=>setMobileMenuOpen(false)} className="absolute inset-0 bg-slate-950/60"/><aside className="absolute right-0 top-0 flex h-full w-[min(86vw,320px)] flex-col bg-slate-950 text-white"><div className="flex items-center justify-between border-b border-white/10 p-5"><div className="font-bold">نظام الإدارة الأزهرية</div><button onClick={()=>setMobileMenuOpen(false)}><X size={22}/></button></div><div className="p-4 text-sm font-semibold">{institute.name}</div><nav className="flex-1 space-y-1 px-4"><Link href={`/students?instituteId=${institute.id}`} onClick={()=>setMobileMenuOpen(false)}><MenuItem icon={GraduationCap} title="الطلاب"/></Link><Link href={`/teachers?instituteId=${institute.id}`} onClick={()=>setMobileMenuOpen(false)}><MenuItem icon={Users} title="المعلمين والموظفين"/></Link><Link href={`/attendance?instituteId=${institute.id}`} onClick={()=>setMobileMenuOpen(false)}><MenuItem icon={ClipboardCheck} title="الحضور والغياب"/></Link><Link href={`/visits?instituteId=${institute.id}`} onClick={()=>setMobileMenuOpen(false)}><MenuItem icon={ClipboardCheck} title="الزيارات والتفتيش"/></Link></nav><div className="p-4"><button onClick={handleLogout} className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-red-300"><LogOut size={18} className="inline ml-2"/>تسجيل الخروج</button></div></aside></div>}

    <section className="min-w-0 lg:mr-72">
      <header className="border-b border-slate-200 bg-white print:hidden"><div className="flex min-h-20 items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button onClick={()=>setMobileMenuOpen(true)} className="rounded-xl border p-2.5 lg:hidden"><Menu size={21}/></button><div><div className="text-xs text-slate-400">الإدارة التعليمية الأزهرية</div><h1 className="mt-1 text-xl font-bold">الملف المؤسسي للمعهد</h1></div></div><div className="flex gap-2"><button onClick={handlePrint} className="rounded-xl border border-slate-200 p-2.5" title="طباعة"><Printer size={20}/></button><button onClick={()=>loadInstitute(true)} className="rounded-xl border border-slate-200 p-2.5" title="تحديث"><RefreshCw size={20} className={refreshing ? "animate-spin" : ""}/></button><Link href="/institutes" className="hidden items-center gap-2 rounded-xl border px-3 py-2.5 text-sm sm:flex"><ArrowRight size={17}/>كل المعاهد</Link></div></div></header>

      <div className="space-y-6 p-3 sm:p-6 lg:p-8">
        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Building2 size={30}/></div><div><div className="text-sm text-slate-400">الملف المؤسسي</div><h2 className="mt-1 text-2xl font-bold">{institute.name}</h2><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300"><span>الكود: {institute.code || "-"}</span><span>•</span><span>{institute.educational_stage || "-"}</span><span>•</span><span>{institute.institute_type || "-"}</span></div></div></div><div className="rounded-2xl bg-white/10 px-5 py-4"><div className="text-xs text-slate-400">شيخ المعهد</div><div className="mt-1 font-semibold">{institute.director_name || "-"}</div><div className="mt-2 text-xs">{institute.is_active ? "المعهد نشط" : "المعهد غير نشط"}</div></div></div></section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard icon={GraduationCap} title="الطلاب" value={counts.students.toLocaleString("ar-EG")} description={`${counts.activeStudents.toLocaleString("ar-EG")} نشط`}/><StatCard icon={Users} title="المعلمون" value={counts.teachers.toLocaleString("ar-EG")} description={`${counts.activeTeachers.toLocaleString("ar-EG")} نشط`}/><StatCard icon={UserCheck} title="معدل نشاط الطلاب" value={`${studentActiveRate}%`} description="من إجمالي الطلاب" positive={studentActiveRate >= 90}/><StatCard icon={CircleCheck} title="معدل نشاط المعلمين" value={`${teacherActiveRate}%`} description="من إجمالي المعلمين" positive={teacherActiveRate >= 90}/></section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="rounded-3xl border bg-white p-5 shadow-sm lg:col-span-2"><SectionTitle icon={Building2} title="البيانات الأساسية" text="المعلومات الرسمية المتاحة للمعهد"/><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="اسم المعهد" value={institute.name}/><Info label="كود المعهد" value={institute.code}/><Info label="نوع المعهد" value={institute.institute_type}/><Info label="المرحلة التعليمية" value={institute.educational_stage}/><Info label="شيخ المعهد" value={institute.director_name}/><Info label="حالة المعهد" value={institute.is_active ? "نشط" : "غير نشط"}/></div></div><div className="rounded-3xl border bg-white p-5 shadow-sm"><SectionTitle icon={TrendingUp} title="مؤشرات الملف" text="محسوبة من البيانات الحالية"/><Progress title="نشاط الطلاب" value={studentActiveRate}/><Progress title="نشاط المعلمين" value={teacherActiveRate}/><Progress title="اكتمال البيانات الأساسية" value={[institute.name,institute.code,institute.institute_type,institute.educational_stage,institute.director_name].filter(Boolean).length * 20}/></div></section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><ProfileCard icon={GraduationCap} title="إدارة الطلاب" text="البيانات والحالة الدراسية" href={`/students?instituteId=${institute.id}`}/><ProfileCard icon={Users} title="المعلمون والعاملون" text="بيانات العاملين بالمعهد" href={`/teachers?instituteId=${institute.id}`}/><ProfileCard icon={ClipboardCheck} title="الحضور والتقارير" text="الحضور والغياب والتقارير" href={`/attendance-report?instituteId=${institute.id}`}/><ProfileCard icon={ClipboardCheck} title="الزيارات والتفتيش" text="نتائج الزيارات والملاحظات" href={`/visits?instituteId=${institute.id}`}/></section>

        <section className="rounded-3xl border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><SectionTitle icon={FolderOpen} title="أقسام الملف المؤسسي" text="أقسام جاهزة للتوسع وربط المستندات والبيانات الرسمية"/><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">نسخة العمل الحالية</span></div><div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"><SimpleCard icon={FileText} title="المستندات والأرشيف" text="مكان مخصص لربط مستندات المعهد عند إضافة وحدة الأرشيف."/><SimpleCard icon={Building2} title="المبنى والمنشآت" text="ملخص المبنى والمرافق والتجهيزات، مع إمكانية التوسع لاحقًا."/><SimpleCard icon={BookOpen} title="الفصول والمواد" text="إدارة الفصول والمواد والجدول الدراسي من خلال وحداتها المتخصصة."/><SimpleCard icon={ClipboardList} title="التكليفات" text="متابعة التكليفات الواردة من الإدارة التعليمية." href={`/institute-tasks?instituteId=${institute.id}`}/><SimpleCard icon={MessageSquareWarning} title="الشكاوى والبلاغات" text="متابعة البلاغات والشكاوى المرتبطة بالمعهد." href={`/complaints?instituteId=${institute.id}`}/><SimpleCard icon={Send} title="المراسلات والطلبات" text="متابعة الطلبات والمراسلات المرتبطة بالمعهد." href={`/institute-requests?instituteId=${institute.id}`}/></div></section>

        <section className="rounded-3xl bg-slate-900 p-6 text-white"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h3 className="text-lg font-bold">الخطوة التالية في الملف المؤسسي</h3><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">يمكن الآن التوسع في وحدات المبنى والمستندات والأرشيف وربطها بهذا الملف المؤسسي.</p></div><Link href="/institutes" className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"><Search size={18}/>العودة لإدارة المعاهد</Link></div></section>
        <footer className="border-t py-6 text-center text-xs text-slate-400">نظام إدارة ومتابعة المعاهد الأزهرية — الملف المؤسسي V3.0</footer>
      </div>
    </section>
  </main>;
}

function Brand({institute}:{institute:Institute}) { return <div className="border-b border-white/10 px-6 py-6"><div className="text-lg font-bold">نظام الإدارة الأزهرية</div><div className="mt-1 text-xs text-slate-400">الملف المؤسسي للمعهد</div><div className="mt-5 rounded-2xl bg-white/5 p-4"><div className="text-xs text-slate-400">المعهد الحالي</div><div className="mt-2 font-semibold leading-6">{institute.name}</div><div className="mt-2 text-xs text-slate-400">كود المعهد: {institute.code || "-"}</div></div></div>; }
function MenuItem({icon:Icon,title,active=false}:{icon:any;title:string;active?:boolean}) { return <div className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${active ? "bg-white font-semibold text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{title}</div>; }
function StatCard({icon:Icon,title,value,description,positive=false}:{icon:any;title:string;value:string;description:string;positive?:boolean}) { return <div className="rounded-2xl border bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5"><div className="flex items-start justify-between"><div><div className="text-sm text-slate-500">{title}</div><div className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</div><div className="mt-1 text-xs text-slate-400">{description}</div></div><div className="rounded-2xl bg-slate-100 p-3"><Icon size={21}/></div></div>{positive && <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600"><TrendingUp size={14}/>مؤشر جيد</div>}</div>; }
function SectionTitle({icon:Icon,title,text}:{icon:any;title:string;text:string}) { return <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-slate-100 p-2"><Icon size={19}/></div><div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{text}</p></div></div>; }
function Info({label,value}:{label:string;value:string|null}) { return <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-2 font-semibold text-slate-800">{value || "غير مسجل"}</div></div>; }
function Progress({title,value}:{title:string;value:number}) { const v=Math.max(0,Math.min(100,value)); return <div className="mb-5"><div className="mb-2 flex justify-between text-sm"><span>{title}</span><strong>{v}%</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{width:`${v}%`}}/></div></div>; }
function ProfileCard({icon:Icon,title,text,href}:{icon:any;title:string;text:string;href:string}) { return <Link href={href} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100"><Icon size={20}/></div><div className="font-bold">{title}</div><div className="mt-2 text-xs leading-6 text-slate-500">{text}</div><div className="mt-4 flex items-center gap-1 text-xs font-semibold">فتح القسم <ArrowRight size={14}/></div></Link>; }
function SimpleCard({icon:Icon,title,text,href}:{icon:any;title:string;text:string;href?:string}) { const body=<><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><Icon size={19}/></div><div className="mt-3 font-semibold">{title}</div><div className="mt-1 text-xs leading-6 text-slate-500">{text}</div>{href && <div className="mt-3 text-xs font-semibold">فتح القسم ←</div>}</>; return href ? <Link href={href} className="rounded-2xl border p-4 hover:bg-slate-50">{body}</Link> : <div className="rounded-2xl border border-dashed p-4">{body}</div>; }
