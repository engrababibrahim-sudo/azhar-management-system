"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Filter,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

type VisitStatus = "planned" | "completed" | "follow_up" | "cancelled";

type Visit = {
  id: number;
  institute: string;
  code: string;
  visitor: string;
  type: string;
  date: string;
  status: VisitStatus;
  notes: string;
  violations: number;
  recommendations: number;
  tasks: number;
};

const institutes = [
  {
    id: "AZ003",
    name: "معهد الخلفاء الراشدين",
  },
  {
    id: "AZ-0004",
    name: "معهد فتيات المدينة المنورة",
  },
  {
    id: "AZ002",
    name: "معهد فتيات نور الاسلام",
  },
  {
    id: "AZ001",
    name: "معهد نورالإسلام النموذجى للغات والكمبيوتر",
  },
];

const initialVisits: Visit[] = [
  {
    id: 1,
    institute: "معهد نورالإسلام النموذجى للغات والكمبيوتر",
    code: "AZ001",
    visitor: "مدير الإدارة التعليمية الأزهرية",
    type: "زيارة متابعة دورية",
    date: "2026-09-28",
    status: "completed",
    notes: "متابعة انتظام العملية التعليمية وسجلات الحضور.",
    violations: 1,
    recommendations: 3,
    tasks: 2,
  },
  {
    id: 2,
    institute: "معهد فتيات نور الاسلام",
    code: "AZ002",
    visitor: "موجه الإدارة",
    type: "زيارة متابعة",
    date: "2026-09-25",
    status: "follow_up",
    notes: "توجد بعض الملاحظات التي تحتاج إلى متابعة.",
    violations: 2,
    recommendations: 4,
    tasks: 3,
  },
  {
    id: 3,
    institute: "معهد الخلفاء الراشدين",
    code: "AZ003",
    visitor: "مفتش الإدارة",
    type: "زيارة تفتيش",
    date: "2026-09-20",
    status: "completed",
    notes: "تمت مراجعة عدد من الملفات والسجلات.",
    violations: 0,
    recommendations: 2,
    tasks: 1,
  },
  {
    id: 4,
    institute: "معهد فتيات المدينة المنورة",
    code: "AZ-0004",
    visitor: "مدير الإدارة التعليمية الأزهرية",
    type: "زيارة دورية",
    date: "2026-10-05",
    status: "planned",
    notes: "",
    violations: 0,
    recommendations: 0,
    tasks: 0,
  },
];

const inspectionItems = [
  "انتظام الحضور والانصراف",
  "انتظام العملية التعليمية",
  "سجلات الطلاب",
  "سجلات المدرسين",
  "الانضباط الإداري",
  "النظافة والسلامة",
  "الوسائل التعليمية",
  "الأنشطة الطلابية",
];

const statusConfig: Record<
  VisitStatus,
  { label: string; className: string }
> = {
  planned: {
    label: "مخططة",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "منفذة",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  follow_up: {
    label: "تحتاج متابعة",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cancelled: {
    label: "ملغاة",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VisitStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const [form, setForm] = useState({
    institute: institutes[0].id,
    visitor: "",
    type: "زيارة متابعة دورية",
    date: "",
    notes: "",
  });

  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const filteredVisits = useMemo(() => {
    const value = search.trim().toLowerCase();

    return visits.filter((visit) => {
      const matchesSearch =
        !value ||
        visit.institute.toLowerCase().includes(value) ||
        visit.code.toLowerCase().includes(value) ||
        visit.visitor.toLowerCase().includes(value) ||
        visit.type.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "all" || visit.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [visits, search, statusFilter]);

  const statistics = useMemo(() => {
    return {
      total: visits.length,
      completed: visits.filter((v) => v.status === "completed").length,
      planned: visits.filter((v) => v.status === "planned").length,
      followUp: visits.filter((v) => v.status === "follow_up").length,
    };
  }, [visits]);

  function resetForm() {
    setForm({
      institute: institutes[0].id,
      visitor: "",
      type: "زيارة متابعة دورية",
      date: "",
      notes: "",
    });
    setChecks({});
  }

  function createVisit() {
    if (!form.visitor || !form.date) {
      alert("يرجى إدخال اسم الزائر وتاريخ الزيارة.");
      return;
    }

    const institute = institutes.find((item) => item.id === form.institute);

    if (!institute) return;

    const newVisit: Visit = {
      id: Date.now(),
      institute: institute.name,
      code: institute.id,
      visitor: form.visitor,
      type: form.type,
      date: form.date,
      status: "planned",
      notes: form.notes,
      violations: 0,
      recommendations: 0,
      tasks: 0,
    };

    setVisits((current) => [newVisit, ...current]);
    setShowForm(false);
    resetForm();
  }

  function toggleCheck(item: string) {
    setChecks((current) => ({
      ...current,
      [item]: !current[item],
    }));
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ClipboardCheck size={25} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    الزيارات والتفتيش
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    إدارة زيارات المعاهد ومتابعة الملاحظات والتوصيات والمهام
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">
                  الإدارة والمتابعة المركزية
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-green-700">
                  نظام متابعة الزيارات
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus size={19} />
              إضافة زيارة جديدة
            </button>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="إجمالي الزيارات"
            value={statistics.total}
            icon={<ClipboardList size={21} />}
            description="كل الزيارات المسجلة"
          />

          <StatCard
            title="زيارات منفذة"
            value={statistics.completed}
            icon={<CheckCircle2 size={21} />}
            description="زيارات تم تنفيذها"
          />

          <StatCard
            title="زيارات مخططة"
            value={statistics.planned}
            icon={<CalendarDays size={21} />}
            description="زيارات قادمة"
          />

          <StatCard
            title="تحتاج متابعة"
            value={statistics.followUp}
            icon={<AlertTriangle size={21} />}
            description="زيارات بها إجراءات لاحقة"
          />
        </section>

        {/* Search / Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم المعهد أو الكود أو الزائر أو نوع الزيارة..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | VisitStatus)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="planned">مخططة</option>
                <option value="completed">منفذة</option>
                <option value="follow_up">تحتاج متابعة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          </div>
        </section>

        {/* Visits */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold text-slate-900">سجل الزيارات</h2>
              <p className="mt-1 text-xs text-slate-500">
                جميع الزيارات والمتابعات المسجلة بالنظام
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              {filteredVisits.length} زيارة
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <th className="px-5 py-4 font-medium">المعهد</th>
                  <th className="px-5 py-4 font-medium">نوع الزيارة</th>
                  <th className="px-5 py-4 font-medium">الزائر</th>
                  <th className="px-5 py-4 font-medium">التاريخ</th>
                  <th className="px-5 py-4 font-medium">الحالة</th>
                  <th className="px-5 py-4 font-medium">المتابعة</th>
                  <th className="px-5 py-4 font-medium"></th>
                </tr>
              </thead>

              <tbody>
                {filteredVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {visit.institute}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {visit.code}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {visit.type}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {visit.visitor}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {visit.date}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusConfig[visit.status].className}`}
                      >
                        {statusConfig[visit.status].label}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        <SmallCount
                          value={visit.violations}
                          label="مخالفة"
                          danger
                        />
                        <SmallCount
                          value={visit.recommendations}
                          label="توصية"
                        />
                        <SmallCount value={visit.tasks} label="مهمة" />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedVisit(visit)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {filteredVisits.map((visit) => (
              <div
                key={visit.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {visit.institute}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {visit.code}
                    </p>
                  </div>

                  <span
                    className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] ${statusConfig[visit.status].className}`}
                  >
                    {statusConfig[visit.status].label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <InfoItem label="نوع الزيارة" value={visit.type} />
                  <InfoItem label="التاريخ" value={visit.date} />
                  <InfoItem label="الزائر" value={visit.visitor} />
                  <InfoItem
                    label="المتابعة"
                    value={`${visit.tasks} مهام`}
                  />
                </div>

                <button
                  onClick={() => setSelectedVisit(visit)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700"
                >
                  عرض التفاصيل
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {filteredVisits.length === 0 && (
            <div className="p-12 text-center">
              <ClipboardList
                size={35}
                className="mx-auto text-slate-300"
              />
              <p className="mt-3 font-semibold text-slate-600">
                لا توجد زيارات مطابقة
              </p>
              <p className="mt-1 text-xs text-slate-400">
                جرّبي تغيير البحث أو الفلتر.
              </p>
            </div>
          )}
        </section>

        {/* Inspection framework */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                محاور التفتيش والمتابعة
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                يمكن استخدام هذه المحاور عند تنفيذ الزيارة وتسجيل نتائجها.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {inspectionItems.map((item) => (
              <button
                key={item}
                onClick={() => toggleCheck(item)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-right text-sm transition ${
                  checks[item]
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
              >
                {checks[item] ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <div className="h-[18px] w-[18px] rounded-full border-2 border-slate-300" />
                )}

                <span>{item}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* New visit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  إضافة زيارة جديدة
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  تسجيل زيارة جديدة ضمن خطة المتابعة
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="المعهد">
                  <select
                    value={form.institute}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        institute: event.target.value,
                      }))
                    }
                    className="input-style"
                  >
                    {institutes.map((institute) => (
                      <option key={institute.id} value={institute.id}>
                        {institute.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="نوع الزيارة">
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="input-style"
                  >
                    <option>زيارة متابعة دورية</option>
                    <option>زيارة تفتيش</option>
                    <option>زيارة طارئة</option>
                    <option>زيارة تقييم</option>
                    <option>زيارة متابعة شكوى</option>
                  </select>
                </FormField>

                <FormField label="اسم الزائر">
                  <input
                    value={form.visitor}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        visitor: event.target.value,
                      }))
                    }
                    placeholder="مثال: مدير الإدارة التعليمية"
                    className="input-style"
                  />
                </FormField>

                <FormField label="تاريخ الزيارة">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="input-style"
                  />
                </FormField>
              </div>

              <FormField label="ملاحظات أولية">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="أدخل أي ملاحظات أو أهداف للزيارة..."
                  className="input-style resize-none"
                />
              </FormField>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex gap-3">
                  <FileText
                    size={20}
                    className="mt-0.5 text-indigo-600"
                  />

                  <div>
                    <p className="font-semibold text-indigo-900">
                      بعد إنشاء الزيارة
                    </p>

                    <p className="mt-1 text-xs leading-6 text-indigo-700">
                      ستظهر الزيارة في سجل الزيارات ويمكن لاحقًا إضافة نتائج
                      التفتيش والملاحظات والتوصيات والمهام الناتجة عنها.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-5 sm:flex-row sm:justify-start">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                onClick={createVisit}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                إنشاء الزيارة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit details modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-600" />

                  <span className="text-xs text-slate-400">
                    {selectedVisit.code}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  {selectedVisit.institute}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedVisit.type}
                </p>
              </div>

              <button
                onClick={() => setSelectedVisit(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <DetailBox
                  icon={<CalendarDays size={18} />}
                  label="التاريخ"
                  value={selectedVisit.date}
                />

                <DetailBox
                  icon={<UserCheck size={18} />}
                  label="الزائر"
                  value={selectedVisit.visitor}
                />

                <DetailBox
                  icon={<AlertTriangle size={18} />}
                  label="المخالفات"
                  value={String(selectedVisit.violations)}
                  danger
                />

                <DetailBox
                  icon={<ClipboardList size={18} />}
                  label="المهام"
                  value={String(selectedVisit.tasks)}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-800">حالة الزيارة</h3>

                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs ${statusConfig[selectedVisit.status].className}`}
                >
                  {statusConfig[selectedVisit.status].label}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-800">الملاحظات</h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {selectedVisit.notes || "لا توجد ملاحظات مسجلة حاليًا."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FollowCard
                  title="المخالفات"
                  value={selectedVisit.violations}
                  icon={<XCircle size={20} />}
                  danger
                />

                <FollowCard
                  title="التوصيات"
                  value={selectedVisit.recommendations}
                  icon={<FileText size={20} />}
                />

                <FollowCard
                  title="المهام الناتجة"
                  value={selectedVisit.tasks}
                  icon={<ClipboardList size={20} />}
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 text-amber-600"
                  />

                  <div>
                    <h3 className="font-bold text-amber-900">
                      المتابعة الإدارية
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      يمكن لاحقًا ربط هذه الزيارة بالمهام والطلبات والشكاوى
                      وإسناد الإجراءات المطلوبة إلى المعهد أو المسؤول المختص.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <button
                onClick={() => setSelectedVisit(null)}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SmallCount({
  value,
  label,
  danger = false,
}: {
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <span
      className={`rounded-lg px-2 py-1 text-[10px] ${
        danger && value > 0
          ? "bg-red-50 text-red-600"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {value} {label}
    </span>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-700">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function DetailBox({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div
        className={`mb-2 ${
          danger ? "text-red-500" : "text-indigo-500"
        }`}
      >
        {icon}
      </div>

      <p className="text-[10px] text-slate-400">{label}</p>

      <p
        className={`mt-1 text-sm font-bold ${
          danger ? "text-red-600" : "text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FollowCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger && value > 0
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`mb-3 ${
          danger && value > 0 ? "text-red-500" : "text-indigo-500"
        }`}
      >
        {icon}
      </div>

      <p className="text-xs text-slate-500">{title}</p>

      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
