"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type VisitStatus =
  | "planned"
  | "completed"
  | "follow_up"
  | "cancelled";

type Institute = {
  id: string;
  name: string;
  code: string;
};

type Visit = {
  id: string;
  instituteId: string;
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
  inspectionResults: Record<string, boolean>;
};

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
  {
    label: string;
    className: string;
    icon: typeof Clock3;
  }
> = {
  planned: {
    label: "مجدولة",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock3,
  },
  completed: {
    label: "مكتملة",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  follow_up: {
    label: "تحتاج متابعة",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ClipboardList,
  },
  cancelled: {
    label: "ملغاة",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export default function VisitsPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | VisitStatus
  >("all");

  const [showForm, setShowForm] = useState(false);
  const [selectedVisit, setSelectedVisit] =
    useState<Visit | null>(null);

  const [form, setForm] = useState({
    institute: "",
    visitor: "",
    type: "زيارة متابعة دورية",
    date: "",
    notes: "",
  });

  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------
  // تحميل المعاهد والزيارات من Supabase
  // ---------------------------------------------------------
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        institutesResult,
        visitsResult,
      ] = await Promise.all([
        supabase
          .from("institutes")
          .select("id,name,code")
          .order("name", { ascending: true }),

        supabase
          .from("visits")
          .select(
            `
              id,
              institute_id,
              visitor,
              type,
              visit_date,
              status,
              notes,
              violations,
              recommendations,
              tasks,
              inspection_results
            `
          )
          .order("visit_date", { ascending: false }),
      ]);

      if (institutesResult.error) {
        throw new Error(
          `تعذر تحميل المعاهد: ${institutesResult.error.message}`
        );
      }

      if (visitsResult.error) {
        throw new Error(
          `تعذر تحميل الزيارات: ${visitsResult.error.message}`
        );
      }

      const loadedInstitutes =
        (institutesResult.data ?? []) as Institute[];

      setInstitutes(loadedInstitutes);

      if (loadedInstitutes.length > 0) {
        setForm((previous) => ({
          ...previous,
          institute:
            previous.institute || loadedInstitutes[0].id,
        }));
      }

      const instituteMap = new Map(
        loadedInstitutes.map((institute) => [
          institute.id,
          institute,
        ])
      );

      const mappedVisits: Visit[] = (
        visitsResult.data ?? []
      ).map((item: any) => {
        const institute = instituteMap.get(item.institute_id);

        return {
          id: item.id,
          instituteId: item.institute_id,
          institute:
            institute?.name || "معهد غير معروف",
          code: institute?.code || "-",
          visitor: item.visitor || "",
          type: item.type || "",
          date: item.visit_date || "",
          status: item.status as VisitStatus,
          notes: item.notes || "",
          violations: Number(item.violations || 0),
          recommendations: Number(
            item.recommendations || 0
          ),
          tasks: Number(item.tasks || 0),
          inspectionResults:
            item.inspection_results || {},
        };
      });

      setVisits(mappedVisits);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحميل البيانات"
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // الإحصائيات
  // ---------------------------------------------------------
  const statistics = useMemo(() => {
    return {
      total: visits.length,
      planned: visits.filter(
        (visit) => visit.status === "planned"
      ).length,
      completed: visits.filter(
        (visit) => visit.status === "completed"
      ).length,
      followUp: visits.filter(
        (visit) => visit.status === "follow_up"
      ).length,
      violations: visits.reduce(
        (sum, visit) => sum + visit.violations,
        0
      ),
    };
  }, [visits]);

  // ---------------------------------------------------------
  // فلترة الزيارات
  // ---------------------------------------------------------
  const filteredVisits = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return visits.filter((visit) => {
      const matchesSearch =
        !searchValue ||
        visit.institute
          .toLowerCase()
          .includes(searchValue) ||
        visit.code
          .toLowerCase()
          .includes(searchValue) ||
        visit.visitor
          .toLowerCase()
          .includes(searchValue) ||
        visit.type
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        visit.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [visits, search, statusFilter]);

  // ---------------------------------------------------------
  // فتح نموذج زيارة جديدة
  // ---------------------------------------------------------
  function openNewVisitForm() {
    setErrorMessage("");

    setChecks({});

    setForm({
      institute: institutes[0]?.id || "",
      visitor: "",
      type: "زيارة متابعة دورية",
      date: "",
      notes: "",
    });

    setShowForm(true);
  }

  // ---------------------------------------------------------
  // إغلاق النموذج
  // ---------------------------------------------------------
  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setChecks({});
  }

  // ---------------------------------------------------------
  // تغيير حالة بند التفتيش
  // ---------------------------------------------------------
  function toggleCheck(item: string) {
    setChecks((previous) => ({
      ...previous,
      [item]: !previous[item],
    }));
  }

  // ---------------------------------------------------------
  // إضافة زيارة إلى Supabase
  // ---------------------------------------------------------
  async function createVisit() {
    if (!form.institute) {
      setErrorMessage("من فضلك اختر المعهد.");
      return;
    }

    if (!form.visitor.trim()) {
      setErrorMessage("من فضلك أدخل اسم الزائر.");
      return;
    }

    if (!form.date) {
      setErrorMessage("من فضلك اختر تاريخ الزيارة.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("visits")
        .insert({
          institute_id: form.institute,
          visitor: form.visitor.trim(),
          type: form.type,
          visit_date: form.date,
          status: "planned",
          notes: form.notes.trim() || null,
          violations: 0,
          recommendations: 0,
          tasks: 0,
          inspection_results: checks,
          created_by: user?.id || null,
        })
        .select(
          `
            id,
            institute_id,
            visitor,
            type,
            visit_date,
            status,
            notes,
            violations,
            recommendations,
            tasks,
            inspection_results
          `
        )
        .single();

      if (error) {
        throw new Error(
          `تعذر حفظ الزيارة: ${error.message}`
        );
      }

      const institute = institutes.find(
        (item) => item.id === data.institute_id
      );

      const newVisit: Visit = {
        id: data.id,
        instituteId: data.institute_id,
        institute:
          institute?.name || "معهد غير معروف",
        code: institute?.code || "-",
        visitor: data.visitor,
        type: data.type,
        date: data.visit_date,
        status: data.status as VisitStatus,
        notes: data.notes || "",
        violations: Number(data.violations || 0),
        recommendations: Number(
          data.recommendations || 0
        ),
        tasks: Number(data.tasks || 0),
        inspectionResults:
          data.inspection_results || {},
      };

      setVisits((previous) => [
        newVisit,
        ...previous,
      ]);

      setShowForm(false);
      setChecks({});

      setForm({
        institute: institutes[0]?.id || "",
        visitor: "",
        type: "زيارة متابعة دورية",
        date: "",
        notes: "",
      });
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حفظ الزيارة"
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------
  // تنسيق التاريخ
  // ---------------------------------------------------------
  function formatDate(date: string) {
    if (!date) return "-";

    try {
      return new Intl.DateTimeFormat("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(`${date}T00:00:00`));
    } catch {
      return date;
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <ClipboardCheck size={23} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                الزيارات والتفتيش
              </h1>

              <p className="text-sm text-slate-500">
                متابعة زيارات المعاهد ونتائج التفتيش
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewVisitForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={19} />
          تسجيل زيارة جديدة
        </button>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <ShieldAlert
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="font-semibold">
              حدث خطأ
            </p>

            <p className="mt-1 text-sm">
              {errorMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="إجمالي الزيارات"
          value={statistics.total}
          icon={<ClipboardList size={22} />}
          className="bg-white"
        />

        <StatCard
          title="زيارات مجدولة"
          value={statistics.planned}
          icon={<Clock3 size={22} />}
          className="bg-blue-50"
        />

        <StatCard
          title="زيارات مكتملة"
          value={statistics.completed}
          icon={<CheckCircle2 size={22} />}
          className="bg-green-50"
        />

        <StatCard
          title="تحتاج متابعة"
          value={statistics.followUp}
          icon={<ClipboardCheck size={22} />}
          className="bg-amber-50"
        />

        <StatCard
          title="المخالفات"
          value={statistics.violations}
          icon={<ShieldAlert size={22} />}
          className="bg-red-50"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ابحث باسم المعهد أو الكود أو اسم الزائر..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "all"
                  | VisitStatus
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">
              كل الحالات
            </option>
            <option value="planned">
              مجدولة
            </option>
            <option value="completed">
              مكتملة
            </option>
            <option value="follow_up">
              تحتاج متابعة
            </option>
            <option value="cancelled">
              ملغاة
            </option>
          </select>
        </div>
      </div>

      {/* Visits */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold text-slate-900">
            سجل الزيارات
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            جميع الزيارات المسجلة للمعاهد
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

              <p className="text-sm text-slate-500">
                جاري تحميل الزيارات...
              </p>
            </div>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ClipboardCheck size={30} />
            </div>

            <h3 className="font-bold text-slate-800">
              لا توجد زيارات
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              {visits.length === 0
                ? "لم يتم تسجيل أي زيارة حتى الآن. يمكنك تسجيل أول زيارة للمعهد."
                : "لا توجد نتائج مطابقة للبحث أو الفلتر الحالي."}
            </p>

            {visits.length === 0 && (
              <button
                type="button"
                onClick={openNewVisitForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus size={18} />
                تسجيل أول زيارة
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[950px] text-right">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-4">
                      المعهد
                    </th>

                    <th className="px-5 py-4">
                      الزائر
                    </th>

                    <th className="px-5 py-4">
                      نوع الزيارة
                    </th>

                    <th className="px-5 py-4">
                      التاريخ
                    </th>

                    <th className="px-5 py-4">
                      الحالة
                    </th>

                    <th className="px-5 py-4">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredVisits.map((visit) => {
                    const StatusIcon =
                      statusConfig[visit.status].icon;

                    return (
                      <tr
                        key={visit.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {visit.institute}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {visit.code}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {visit.visitor}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {visit.type}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(visit.date)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig[visit.status].className}`}
                          >
                            <StatusIcon size={14} />
                            {
                              statusConfig[
                                visit.status
                              ].label
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedVisit(visit)
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredVisits.map((visit) => {
                const StatusIcon =
                  statusConfig[visit.status].icon;

                return (
                  <div
                    key={visit.id}
                    className="p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {visit.institute}
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {visit.code}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig[visit.status].className}`}
                      >
                        <StatusIcon size={13} />
                        {
                          statusConfig[
                            visit.status
                          ].label
                        }
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">
                          الزائر
                        </p>
                        <p className="mt-1 font-medium text-slate-700">
                          {visit.visitor}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          التاريخ
                        </p>
                        <p className="mt-1 font-medium text-slate-700">
                          {formatDate(visit.date)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVisit(visit)
                      }
                      className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Inspection Framework */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardCheck size={21} />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              إطار التفتيش والمتابعة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              البنود الأساسية التي يمكن مراجعتها أثناء زيارة المعهد
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {inspectionItems.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>

                <span className="text-sm font-medium text-slate-700">
                  {item}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Visit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  تسجيل زيارة جديدة
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  سيتم حفظ الزيارة مباشرة في قاعدة البيانات
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    المعهد
                  </label>

                  <select
                    value={form.institute}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        institute:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">
                      اختر المعهد
                    </option>

                    {institutes.map((institute) => (
                      <option
                        key={institute.id}
                        value={institute.id}
                      >
                        {institute.name} —{" "}
                        {institute.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    اسم الزائر
                  </label>

                  <input
                    value={form.visitor}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        visitor:
                          event.target.value,
                      }))
                    }
                    placeholder="مثال: مفتش الإدارة التعليمية"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    نوع الزيارة
                  </label>

                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        type: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option>
                      زيارة متابعة دورية
                    </option>
                    <option>
                      زيارة تفتيش
                    </option>
                    <option>
                      زيارة مفاجئة
                    </option>
                    <option>
                      زيارة متابعة شكوى
                    </option>
                    <option>
                      زيارة تقييم
                    </option>
                    <option>
                      زيارة أخرى
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تاريخ الزيارة
                  </label>

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Checklist */}
              <div>
                <div className="mb-3">
                  <h3 className="font-bold text-slate-800">
                    بنود التفتيش الأولية
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    حدد البنود التي تم فحصها أثناء الزيارة
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {inspectionItems.map((item) => {
                    const checked = !!checks[item];

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleCheck(item)
                        }
                        className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
                          checked
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            checked
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {checked && (
                            <CheckCircle2
                              size={15}
                            />
                          )}
                        </span>

                        <span className="text-sm font-medium">
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  ملاحظات الزيارة
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="اكتب الملاحظات أو التوصيات الأولية..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={createVisit}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      حفظ الزيارة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit Details Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  تفاصيل الزيارة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedVisit.institute}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedVisit(null)
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem
                  label="المعهد"
                  value={selectedVisit.institute}
                />

                <DetailItem
                  label="كود المعهد"
                  value={selectedVisit.code}
                />

                <DetailItem
                  label="الزائر"
                  value={selectedVisit.visitor}
                />

                <DetailItem
                  label="نوع الزيارة"
                  value={selectedVisit.type}
                />

                <DetailItem
                  label="تاريخ الزيارة"
                  value={formatDate(
                    selectedVisit.date
                  )}
                />

                <div>
                  <p className="mb-1 text-xs text-slate-400">
                    الحالة
                  </p>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig[selectedVisit.status].className}`}
                  >
                    {
                      statusConfig[
                        selectedVisit.status
                      ].label
                    }
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MiniStat
                  label="مخالفات"
                  value={
                    selectedVisit.violations
                  }
                />

                <MiniStat
                  label="توصيات"
                  value={
                    selectedVisit.recommendations
                  }
                />

                <MiniStat
                  label="مهام"
                  value={selectedVisit.tasks}
                />
              </div>

              <div>
                <h3 className="mb-3 font-bold text-slate-800">
                  بنود التفتيش
                </h3>

                <div className="space-y-2">
                  {inspectionItems.map((item) => {
                    const checked =
                      !!selectedVisit
                        .inspectionResults?.[
                        item
                      ];

                    return (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                      >
                        <span className="text-sm text-slate-700">
                          {item}
                        </span>

                        {checked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <CheckCircle2
                              size={16}
                            />
                            تم الفحص
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            لم يتم تحديده
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-bold text-slate-800">
                  الملاحظات
                </h3>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  {selectedVisit.notes ||
                    "لا توجد ملاحظات مسجلة لهذه الزيارة."}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedVisit(null)
                }
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// مكونات صغيرة
// ---------------------------------------------------------

function StatCard({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${className || "bg-white"}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-indigo-600 shadow-sm">
          {icon}
        </div>

        <span className="text-3xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-600">
        {title}
      </p>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">
        {label}
      </p>

      <p className="text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}
