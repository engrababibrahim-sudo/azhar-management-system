"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { supabase } from "../../../lib/supabase/client";

type Profile = {
  id: string;
  role: string;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  institute_type: string | null;
};

type Facility = {
  id: string;
  institute_id: string;
  facility_type: string;
  facility_name: string;
  floor_number: number | null;
  condition: "excellent" | "good" | "needs_maintenance" | "out_of_service";
  capacity: number | null;
  notes: string | null;
  is_active: boolean;
};

type Subject = {
  id: string;
  institute_id: string;
  name: string;
  education_stage: string | null;
  subject_type: "basic" | "religious" | "language" | "activity" | "other";
  weekly_periods: number;
  is_active: boolean;
  notes: string | null;
};

type ClassItem = {
  id: string;
  name: string;
  institute_id: string;
  is_active?: boolean | null;
};

const facilityTypes = [
  "مبنى",
  "فصل",
  "معمل حاسب آلي",
  "معمل علوم",
  "مكتبة",
  "مصلى",
  "غرفة إدارية",
  "قاعة",
  "دورة مياه",
  "ملعب",
  "مخزن",
  "أخرى",
];

const conditionOptions = [
  { value: "excellent", label: "ممتازة" },
  { value: "good", label: "جيدة" },
  { value: "needs_maintenance", label: "تحتاج صيانة" },
  { value: "out_of_service", label: "خارج الخدمة" },
] as const;

const subjectTypes = [
  { value: "basic", label: "أساسية" },
  { value: "religious", label: "شرعية" },
  { value: "language", label: "لغات" },
  { value: "activity", label: "نشاط" },
  { value: "other", label: "أخرى" },
] as const;

const emptyFacility = {
  facility_type: "فصل",
  facility_name: "",
  floor_number: "",
  condition: "good" as Facility["condition"],
  capacity: "",
  notes: "",
};

const emptySubject = {
  name: "",
  education_stage: "",
  subject_type: "basic" as Subject["subject_type"],
  weekly_periods: "0",
  notes: "",
};

function conditionLabel(value: Facility["condition"]) {
  return conditionOptions.find((item) => item.value === value)?.label ?? value;
}

function conditionClass(value: Facility["condition"]) {
  if (value === "excellent") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "good") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "needs_maintenance") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default function InstituteInstitutionalPage() {
  const [instituteId, setInstituteId] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"facilities" | "classes" | "subjects">("facilities");
  const [searchTerm, setSearchTerm] = useState("");

  const [facilityModal, setFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facilityForm, setFacilityForm] = useState(emptyFacility);
  const [facilitySaving, setFacilitySaving] = useState(false);

  const [subjectModal, setSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [subjectSaving, setSubjectSaving] = useState(false);

  const canManage =
    profile?.role === "director" ||
    profile?.role === "super_admin" ||
    profile?.role === "it_admin" ||
    profile?.role === "sheikh";

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setMessage("");
    if (!instituteId) {
      setMessage("لم يتم تحديد المعهد");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("يجب تسجيل الدخول أولًا");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, institute_id, directorate_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error("لم يتم العثور على بيانات الحساب");
      setProfile(profileData);

      const { data: instituteData, error: instituteError } = await supabase
        .from("institutes")
        .select("id, name, code, institute_type")
        .eq("id", instituteId)
        .single();

      if (instituteError) throw instituteError;
      if (!instituteData) throw new Error("المعهد غير موجود");

      const isCentral = profileData.role === "director" || profileData.role === "super_admin";
      if (!isCentral && profileData.institute_id !== instituteId) {
        throw new Error("لا تملك صلاحية الوصول إلى بيانات هذا المعهد");
      }

      if (isCentral && profileData.directorate_id) {
        const { data: allowedInstitute, error: allowedError } = await supabase
          .from("institutes")
          .select("id")
          .eq("id", instituteId)
          .eq("directorate_id", profileData.directorate_id)
          .maybeSingle();
        if (allowedError) throw allowedError;
        if (!allowedInstitute) throw new Error("المعهد لا يتبع الإدارة التعليمية الحالية");
      }

      setInstitute(instituteData);

      const [facilitiesResult, subjectsResult, classesResult] = await Promise.all([
        supabase
          .from("institute_facilities")
          .select("id, institute_id, facility_type, facility_name, floor_number, condition, capacity, notes, is_active")
          .eq("institute_id", instituteId)
          .eq("is_active", true)
          .order("facility_type")
          .order("facility_name"),
        supabase
          .from("institute_subjects")
          .select("id, institute_id, name, education_stage, subject_type, weekly_periods, is_active, notes")
          .eq("institute_id", instituteId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("classes")
          .select("id, name, institute_id, is_active")
          .eq("institute_id", instituteId)
          .order("name"),
      ]);

      if (facilitiesResult.error) throw facilitiesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (classesResult.error) throw classesResult.error;

      setFacilities((facilitiesResult.data ?? []) as Facility[]);
      setSubjects((subjectsResult.data ?? []) as Subject[]);
      setClasses((classesResult.data ?? []) as ClassItem[]);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "حدث خطأ أثناء تحميل بيانات المعهد");
      setInstitute(null);
      setFacilities([]);
      setSubjects([]);
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("instituteId");
    setInstituteId(id);
  }, []);

  useEffect(() => {
    if (!instituteId) {
      setLoading(false);
      setMessage("لم يتم تحديد المعهد. افتح هذه الشاشة من الملف المؤسسي للمعهد.");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);

  const filteredFacilities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (item) =>
        item.facility_name.toLowerCase().includes(q) ||
        item.facility_type.toLowerCase().includes(q) ||
        (item.notes ?? "").toLowerCase().includes(q)
    );
  }, [facilities, searchTerm]);

  const filteredSubjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.education_stage ?? "").toLowerCase().includes(q)
    );
  }, [subjects, searchTerm]);

  const facilityStats = useMemo(() => {
    return {
      total: facilities.length,
      maintenance: facilities.filter((item) => item.condition === "needs_maintenance").length,
      capacity: facilities.reduce((sum, item) => sum + (item.capacity ?? 0), 0),
    };
  }, [facilities]);

  function openFacilityCreate() {
    setEditingFacility(null);
    setFacilityForm(emptyFacility);
    setFacilityModal(true);
  }

  function openFacilityEdit(item: Facility) {
    setEditingFacility(item);
    setFacilityForm({
      facility_type: item.facility_type,
      facility_name: item.facility_name,
      floor_number: item.floor_number?.toString() ?? "",
      condition: item.condition,
      capacity: item.capacity?.toString() ?? "",
      notes: item.notes ?? "",
    });
    setFacilityModal(true);
  }

  async function saveFacility() {
    if (!canManage) return;
    if (!instituteId) return;
    if (!facilityForm.facility_name.trim()) {
      setMessage("اكتب اسم المنشأة أولًا");
      return;
    }

    setFacilitySaving(true);
    setMessage("");
    try {
      const payload = {
        institute_id: instituteId,
        facility_type: facilityForm.facility_type,
        facility_name: facilityForm.facility_name.trim(),
        floor_number: facilityForm.floor_number ? Number(facilityForm.floor_number) : null,
        condition: facilityForm.condition,
        capacity: facilityForm.capacity ? Number(facilityForm.capacity) : null,
        notes: facilityForm.notes.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (editingFacility) {
        const { error } = await supabase
          .from("institute_facilities")
          .update(payload)
          .eq("id", editingFacility.id)
          .eq("institute_id", instituteId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("institute_facilities").insert(payload);
        if (error) throw error;
      }

      setFacilityModal(false);
      setMessage(editingFacility ? "تم تحديث المنشأة بنجاح ✅" : "تمت إضافة المنشأة بنجاح ✅");
      await loadData(true);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "تعذر حفظ المنشأة");
    } finally {
      setFacilitySaving(false);
    }
  }

  async function deleteFacility(item: Facility) {
    if (!canManage) return;
    if (!instituteId) return;
    if (!window.confirm(`هل تريد حذف «${item.facility_name}»؟`)) return;

    try {
      const { error } = await supabase
        .from("institute_facilities")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("institute_id", instituteId);
      if (error) throw error;
      setMessage("تم حذف المنشأة من القائمة بنجاح ✅");
      await loadData(true);
    } catch (error: any) {
      setMessage(error?.message || "تعذر حذف المنشأة");
    }
  }

  function openSubjectCreate() {
    setEditingSubject(null);
    setSubjectForm(emptySubject);
    setSubjectModal(true);
  }

  function openSubjectEdit(item: Subject) {
    setEditingSubject(item);
    setSubjectForm({
      name: item.name,
      education_stage: item.education_stage ?? "",
      subject_type: item.subject_type,
      weekly_periods: String(item.weekly_periods ?? 0),
      notes: item.notes ?? "",
    });
    setSubjectModal(true);
  }

  async function saveSubject() {
    if (!canManage) return;
    if (!instituteId) return;
    if (!subjectForm.name.trim()) {
      setMessage("اكتب اسم المادة أولًا");
      return;
    }

    setSubjectSaving(true);
    setMessage("");
    try {
      const payload = {
        institute_id: instituteId,
        name: subjectForm.name.trim(),
        education_stage: subjectForm.education_stage.trim() || null,
        subject_type: subjectForm.subject_type,
        weekly_periods: Number(subjectForm.weekly_periods) || 0,
        notes: subjectForm.notes.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (editingSubject) {
        const { error } = await supabase
          .from("institute_subjects")
          .update(payload)
          .eq("id", editingSubject.id)
          .eq("institute_id", instituteId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("institute_subjects").insert(payload);
        if (error) throw error;
      }

      setSubjectModal(false);
      setMessage(editingSubject ? "تم تحديث المادة بنجاح ✅" : "تمت إضافة المادة بنجاح ✅");
      await loadData(true);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "تعذر حفظ المادة");
    } finally {
      setSubjectSaving(false);
    }
  }

  async function deleteSubject(item: Subject) {
    if (!canManage) return;
    if (!instituteId) return;
    if (!window.confirm(`هل تريد حذف مادة «${item.name}»؟`)) return;

    try {
      const { error } = await supabase
        .from("institute_subjects")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("institute_id", instituteId);
      if (error) throw error;
      setMessage("تم حذف المادة من القائمة بنجاح ✅");
      await loadData(true);
    } catch (error: any) {
      setMessage(error?.message || "تعذر حذف المادة");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div dir="rtl" className="flex min-h-[70vh] items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-sm text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            جاري تحميل الملف المؤسسي للمعهد...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link href="/institutes" className="hover:text-slate-900">المعاهد</Link>
                <ArrowRight size={15} />
                <span>الملف المؤسسي</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 md:text-3xl">
                {institute?.name ?? "الملف المؤسسي"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {institute?.code ? `كود المعهد: ${institute.code}` : ""}
                {institute?.institute_type ? ` • ${institute.institute_type}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                تحديث
              </button>
              <Link
                href={`/institutes`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Building2 size={18} />
                قائمة المعاهد
              </Link>
            </div>
          </div>

          {message && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              <span>{message}</span>
              <button onClick={() => setMessage("")}><X size={18} /></button>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">المنشآت المسجلة</span>
                <Building2 className="text-slate-700" size={22} />
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{facilityStats.total}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">تحتاج صيانة</span>
                <Layers3 className="text-amber-600" size={22} />
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{facilityStats.maintenance}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">الطاقة الاستيعابية</span>
                <Users className="text-blue-600" size={22} />
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{facilityStats.capacity}</div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <button
                onClick={() => { setActiveTab("facilities"); setSearchTerm(""); }}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${activeTab === "facilities" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Building2 size={19} /> المبنى والمنشآت
              </button>
              <button
                onClick={() => { setActiveTab("classes"); setSearchTerm(""); }}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${activeTab === "classes" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <GraduationCap size={19} /> الفصول
              </button>
              <button
                onClick={() => { setActiveTab("subjects"); setSearchTerm(""); }}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${activeTab === "subjects" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <BookOpen size={19} /> المواد الدراسية
              </button>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === "classes" ? "ابحث عن فصل..." : activeTab === "subjects" ? "ابحث عن مادة..." : "ابحث عن منشأة..."}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-semibold outline-none focus:border-slate-400"
              />
            </div>

            {activeTab === "facilities" && canManage && (
              <button onClick={openFacilityCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                <Plus size={19} /> إضافة منشأة
              </button>
            )}
            {activeTab === "subjects" && canManage && (
              <button onClick={openSubjectCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                <Plus size={19} /> إضافة مادة
              </button>
            )}
          </div>

          {activeTab === "facilities" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredFacilities.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
                  <Building2 className="mx-auto mb-3 text-slate-300" size={40} />
                  <p className="font-black">لا توجد منشآت مسجلة حتى الآن</p>
                  <p className="mt-1 text-sm">ابدأ بإضافة الفصول والمعامل والمرافق التابعة للمعهد.</p>
                </div>
              ) : filteredFacilities.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Building2 size={21} /></div>
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-900">{item.facility_name}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{item.facility_type}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${conditionClass(item.condition)}`}>{conditionLabel(item.condition)}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">الدور</span><span className="font-black">{item.floor_number ?? "-"}</span></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">السعة</span><span className="font-black">{item.capacity ?? "-"}</span></div>
                  </div>

                  {item.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{item.notes}</p>}

                  {canManage && (
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      <button onClick={() => openFacilityEdit(item)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Edit3 size={16} className="ml-1 inline" /> تعديل</button>
                      <button onClick={() => deleteFacility(item)} className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={16} className="inline" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "classes" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {classes.filter((item) => item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())).length === 0 ? (
                <div className="py-16 text-center text-slate-500"><GraduationCap className="mx-auto mb-3 text-slate-300" size={40} /><p className="font-black">لا توجد فصول مسجلة لهذا المعهد</p><p className="mt-1 text-sm">يمكن إدارة الفصول من شاشة الفصول الرئيسية.</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {classes.filter((item) => item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())).map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700">{index + 1}</div><div><h3 className="font-black text-slate-900">{item.name}</h3><p className="mt-1 text-xs text-slate-500">الفصل تابع لهذا المعهد فقط</p></div></div>
                      <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><CheckCircle2 size={14} /> {item.is_active === false ? "غير نشط" : "نشط"}</span><Link href={`/students?instituteId=${instituteId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">طلاب الفصل</Link></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "subjects" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredSubjects.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500"><BookOpen className="mx-auto mb-3 text-slate-300" size={40} /><p className="font-black">لا توجد مواد دراسية مسجلة حتى الآن</p><p className="mt-1 text-sm">أضف المواد حسب المرحلة والنوع وعدد الحصص الأسبوعية.</p></div>
              ) : filteredSubjects.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{item.name}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{item.education_stage || "كل المراحل"}</p></div><BookOpen className="text-slate-500" size={21} /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">النوع</span><span className="font-bold text-slate-800">{subjectTypes.find((x) => x.value === item.subject_type)?.label}</span></div><div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">حصص أسبوعية</span><span className="font-black text-slate-800">{item.weekly_periods}</span></div></div>
                  {item.notes && <p className="mt-4 text-sm leading-6 text-slate-600">{item.notes}</p>}
                  {canManage && <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><button onClick={() => openSubjectEdit(item)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Edit3 size={16} className="ml-1 inline" /> تعديل</button><button onClick={() => deleteSubject(item)} className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={16} className="inline" /></button></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {facilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" dir="rtl">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-black">{editingFacility ? "تعديل المنشأة" : "إضافة منشأة"}</h2><p className="mt-1 text-sm text-slate-500">بيانات المنشأة داخل هذا المعهد فقط</p></div><button onClick={() => setFacilityModal(false)}><X /></button></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">نوع المنشأة<select value={facilityForm.facility_type} onChange={(e) => setFacilityForm({ ...facilityForm, facility_type: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3">{facilityTypes.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-700">اسم المنشأة<input value={facilityForm.facility_name} onChange={(e) => setFacilityForm({ ...facilityForm, facility_name: e.target.value })} placeholder="مثال: فصل 1/أ" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-bold text-slate-700">رقم الدور<input type="number" min="0" value={facilityForm.floor_number} onChange={(e) => setFacilityForm({ ...facilityForm, floor_number: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-bold text-slate-700">السعة<input type="number" min="0" value={facilityForm.capacity} onChange={(e) => setFacilityForm({ ...facilityForm, capacity: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-bold text-slate-700">الحالة<select value={facilityForm.condition} onChange={(e) => setFacilityForm({ ...facilityForm, condition: e.target.value as Facility["condition"] })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3">{conditionOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-700 md:col-span-2">ملاحظات<textarea value={facilityForm.notes} onChange={(e) => setFacilityForm({ ...facilityForm, notes: e.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label>
            </div>
            <div className="mt-6 flex gap-3"><button onClick={() => setFacilityModal(false)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">إلغاء</button><button onClick={saveFacility} disabled={facilitySaving} className="flex-1 rounded-xl bg-slate-900 py-3 font-bold text-white disabled:opacity-60">{facilitySaving ? "جاري الحفظ..." : "حفظ"}</button></div>
          </div>
        </div>
      )}

      {subjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" dir="rtl">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-black">{editingSubject ? "تعديل المادة" : "إضافة مادة دراسية"}</h2><p className="mt-1 text-sm text-slate-500">المادة مرتبطة بهذا المعهد فقط</p></div><button onClick={() => setSubjectModal(false)}><X /></button></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">اسم المادة<input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="مثال: اللغة العربية" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-bold text-slate-700">المرحلة<input value={subjectForm.education_stage} onChange={(e) => setSubjectForm({ ...subjectForm, education_stage: e.target.value })} placeholder="مثال: ابتدائي" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-bold text-slate-700">نوع المادة<select value={subjectForm.subject_type} onChange={(e) => setSubjectForm({ ...subjectForm, subject_type: e.target.value as Subject["subject_type"] })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3">{subjectTypes.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-700">الحصص الأسبوعية<input type="number" min="0" value={subjectForm.weekly_periods} onChange={(e) => setSubjectForm({ ...subjectForm, weekly_periods: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>
              <label className="text-sm font-bold text-slate-700 md:col-span-2">ملاحظات<textarea value={subjectForm.notes} onChange={(e) => setSubjectForm({ ...subjectForm, notes: e.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label>
            </div>
            <div className="mt-6 flex gap-3"><button onClick={() => setSubjectModal(false)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">إلغاء</button><button onClick={saveSubject} disabled={subjectSaving} className="flex-1 rounded-xl bg-slate-900 py-3 font-bold text-white disabled:opacity-60">{subjectSaving ? "جاري الحفظ..." : "حفظ"}</button></div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
