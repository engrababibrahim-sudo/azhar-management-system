"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  Target,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type VisitStatus =
  | "planned"
  | "completed"
  | "follow_up"
  | "cancelled";

type InspectionStatus =
  | "compliant"
  | "needs_improvement"
  | "non_compliant";

type Institute = {
  id: string;
  name: string;
  code: string;
};

type InspectionResult = {
  status?: InspectionStatus;
  note?: string;
};

type FollowUpTask = {
  id: string;
  title: string;
  responsible: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "open" | "completed";
  sourceItem?: string;
};

type InspectionResults = Record<
  string,
  InspectionResult | boolean
>;

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
  inspectionResults: InspectionResults;
  followUpTasks: FollowUpTask[];
};

type DraftInspection = Record<
  string,
  {
    status: InspectionStatus | "";
    note: string;
  }
>;

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

const inspectionStatusConfig: Record<
  InspectionStatus,
  {
    label: string;
    shortLabel: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  compliant: {
    label: "مطابق",
    shortLabel: "مطابق",
    className: "border-green-200 bg-green-50 text-green-700",
    icon: CheckCircle2,
  },
  needs_improvement: {
    label: "يحتاج تحسين",
    shortLabel: "تحسين",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  non_compliant: {
    label: "غير مطابق",
    shortLabel: "غير مطابق",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
};

function getInspectionResult(
  results: InspectionResults | undefined,
  item: string
): InspectionResult {
  const value = results?.[item];

  if (typeof value === "boolean") {
    return {
      status: value ? "compliant" : "non_compliant",
      note: "",
    };
  }

  if (value && typeof value === "object") {
    return {
      status: value.status,
      note: value.note || "",
    };
  }

  return {
    status: undefined,
    note: "",
  };
}

function getFollowUpTasks(
  results: InspectionResults | undefined
): FollowUpTask[] {
  const raw = results?.__followUpTasks;

  if (Array.isArray(raw)) {
    return raw as unknown as FollowUpTask[];
  }

  return [];
}

function buildInspectionResults(
  draft: DraftInspection,
  tasks: FollowUpTask[]
): InspectionResults {
  const results: InspectionResults = {};

  Object.entries(draft).forEach(([item, value]) => {
    if (value.status) {
      results[item] = {
        status: value.status,
        note: value.note.trim(),
      };
    }
  });

  if (tasks.length > 0) {
    results.__followUpTasks = tasks as unknown as InspectionResult;
  }

  return results;
}

function calculateInspectionStats(
  results: InspectionResults | undefined
) {
  let inspected = 0;
  let compliant = 0;
  let needsImprovement = 0;
  let nonCompliant = 0;

  inspectionItems.forEach((item) => {
    const result = getInspectionResult(results, item);

    if (!result.status) return;

    inspected += 1;

    if (result.status === "compliant") {
      compliant += 1;
    }

    if (result.status === "needs_improvement") {
      needsImprovement += 1;
    }

    if (result.status === "non_compliant") {
      nonCompliant += 1;
    }
  });

  const percentage =
    inspected === 0
      ? 0
      : Math.round((compliant / inspected) * 100);

  return {
    inspected,
    compliant,
    needsImprovement,
    nonCompliant,
    percentage,
  };
}

function calculateVisitStatus(
  results: InspectionResults | undefined,
  currentStatus?: VisitStatus
): VisitStatus {
  if (currentStatus === "cancelled") {
    return "cancelled";
  }

  const stats = calculateInspectionStats(results);

  if (stats.inspected === 0) {
    return "planned";
  }

  if (
    stats.nonCompliant > 0 ||
    stats.needsImprovement > 0
  ) {
    return "follow_up";
  }

  if (stats.inspected === inspectionItems.length) {
    return "completed";
  }

  return "planned";
}

function makeEmptyDraft(): DraftInspection {
  const draft: DraftInspection = {};

  inspectionItems.forEach((item) => {
    draft[item] = {
      status: "",
      note: "",
    };
  });

  return draft;
}

function createDraftFromVisit(
  visit: Visit
): DraftInspection {
  const draft = makeEmptyDraft();

  inspectionItems.forEach((item) => {
    const result = getInspectionResult(
      visit.inspectionResults,
      item
    );

    draft[item] = {
      status: result.status || "",
      note: result.note || "",
    };
  });

  return draft;
}

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

  const [inspectionFilter, setInspectionFilter] =
    useState<
      "all" | "violations" | "follow_up"
    >("all");

  const [showForm, setShowForm] = useState(false);
  const [selectedVisit, setSelectedVisit] =
    useState<Visit | null>(null);

  const [editingVisitId, setEditingVisitId] =
    useState<string | null>(null);

  const [form, setForm] = useState({
    institute: "",
    visitor: "",
    type: "زيارة متابعة دورية",
    date: "",
    notes: "",
  });

  const [draftInspection, setDraftInspection] =
    useState<DraftInspection>(makeEmptyDraft());

  const [followUpTasks, setFollowUpTasks] =
    useState<FollowUpTask[]>([]);

  const [taskForm, setTaskForm] = useState({
    title: "",
    responsible: "",
    dueDate: "",
    priority: "medium" as
      | "low"
      | "medium"
      | "high",
  });

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
          .order("visit_date", {
            ascending: false,
          }),
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
            previous.institute ||
            loadedInstitutes[0].id,
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
        const institute = instituteMap.get(
          item.institute_id
        );

        const inspectionResults =
          (item.inspection_results ||
            {}) as InspectionResults;

        const storedTasks =
          getFollowUpTasks(inspectionResults);

        return {
          id: item.id,
          instituteId: item.institute_id,
          institute:
            institute?.name || "معهد غير معروف",
          code: institute?.code || "-",
          visitor: item.visitor || "",
          type: item.type || "",
          date: item.visit_date || "",
          status:
            (item.status as VisitStatus) ||
            calculateVisitStatus(
              inspectionResults
            ),
          notes: item.notes || "",
          violations: Number(
            item.violations || 0
          ),
          recommendations: Number(
            item.recommendations || 0
          ),
          tasks: Number(
            item.tasks || storedTasks.length || 0
          ),
          inspectionResults,
          followUpTasks: storedTasks,
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

  const statistics = useMemo(() => {
    const completed =
      visits.filter(
        (visit) => visit.status === "completed"
      ).length;

    const followUp =
      visits.filter(
        (visit) => visit.status === "follow_up"
      ).length;

    const planned =
      visits.filter(
        (visit) => visit.status === "planned"
      ).length;

    const cancelled =
      visits.filter(
        (visit) => visit.status === "cancelled"
      ).length;

    const violations = visits.reduce(
      (sum, visit) =>
        sum + Number(visit.violations || 0),
      0
    );

    const recommendations = visits.reduce(
      (sum, visit) =>
        sum +
        Number(visit.recommendations || 0),
      0
    );

    const totalTasks = visits.reduce(
      (sum, visit) =>
        sum + Number(visit.tasks || 0),
      0
    );

    const inspectedItems = visits.reduce(
      (sum, visit) =>
        sum +
        calculateInspectionStats(
          visit.inspectionResults
        ).inspected,
      0
    );

    const compliantItems = visits.reduce(
      (sum, visit) =>
        sum +
        calculateInspectionStats(
          visit.inspectionResults
        ).compliant,
      0
    );

    const compliancePercentage =
      inspectedItems === 0
        ? 0
        : Math.round(
            (compliantItems /
              inspectedItems) *
              100
          );

    return {
      total: visits.length,
      planned,
      completed,
      followUp,
      cancelled,
      violations,
      recommendations,
      totalTasks,
      compliancePercentage,
    };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

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
          .includes(searchValue) ||
        visit.notes
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        visit.status === statusFilter;

      const matchesInspection =
        inspectionFilter === "all" ||
        (inspectionFilter === "violations" &&
          visit.violations > 0) ||
        (inspectionFilter === "follow_up" &&
          visit.status === "follow_up");

      return (
        matchesSearch &&
        matchesStatus &&
        matchesInspection
      );
    });
  }, [
    visits,
    search,
    statusFilter,
    inspectionFilter,
  ]);

  const formInspectionStats = useMemo(() => {
    const results =
      buildInspectionResults(
        draftInspection,
        followUpTasks
      );

    return calculateInspectionStats(results);
  }, [draftInspection, followUpTasks]);

  function openNewVisitForm() {
    setErrorMessage("");
    setEditingVisitId(null);

    setForm({
      institute: institutes[0]?.id || "",
      visitor: "",
      type: "زيارة متابعة دورية",
      date: "",
      notes: "",
    });

    setDraftInspection(makeEmptyDraft());
    setFollowUpTasks([]);

    setTaskForm({
      title: "",
      responsible: "",
      dueDate: "",
      priority: "medium",
    });

    setShowForm(true);
  }

  function openEditVisitForm(visit: Visit) {
    setErrorMessage("");
    setEditingVisitId(visit.id);

    setForm({
      institute: visit.instituteId,
      visitor: visit.visitor,
      type: visit.type,
      date: visit.date,
      notes: visit.notes,
    });

    setDraftInspection(
      createDraftFromVisit(visit)
    );

    setFollowUpTasks(
      visit.followUpTasks || []
    );

    setTaskForm({
      title: "",
      responsible: "",
      dueDate: "",
      priority: "medium",
    });

    setSelectedVisit(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingVisitId(null);
  }

  function setInspectionStatus(
    item: string,
    status: InspectionStatus
  ) {
    setDraftInspection((previous) => ({
      ...previous,
      [item]: {
        ...previous[item],
        status,
      },
    }));
  }

  function setInspectionNote(
    item: string,
    note: string
  ) {
    setDraftInspection((previous) => ({
      ...previous,
      [item]: {
        ...previous[item],
        note,
      },
    }));
  }

  function addFollowUpTask() {
    if (!taskForm.title.trim()) {
      setErrorMessage(
        "اكتب اسم مهمة المتابعة أولًا."
      );
      return;
    }

    const task: FollowUpTask = {
      id: crypto.randomUUID(),
      title: taskForm.title.trim(),
      responsible:
        taskForm.responsible.trim() ||
        "يحدد لاحقًا",
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      status: "open",
    };

    setFollowUpTasks((previous) => [
      ...previous,
      task,
    ]);

    setTaskForm({
      title: "",
      responsible: "",
      dueDate: "",
      priority: "medium",
    });

    setErrorMessage("");
  }

  function removeFollowUpTask(id: string) {
    setFollowUpTasks((previous) =>
      previous.filter((task) => task.id !== id)
    );
  }

  function toggleTaskStatus(id: string) {
    setFollowUpTasks((previous) =>
      previous.map((task) =>
        task.id === id
          ? {
              ...task,
              status:
                task.status === "open"
                  ? "completed"
                  : "open",
            }
          : task
      )
    );
  }

  async function createVisit() {
    if (!form.institute) {
      setErrorMessage("من فضلك اختر المعهد.");
      return;
    }

    if (!form.visitor.trim()) {
      setErrorMessage(
        "من فضلك أدخل اسم الزائر."
      );
      return;
    }

    if (!form.date) {
      setErrorMessage(
        "من فضلك اختر تاريخ الزيارة."
      );
      return;
    }

    const inspected =
      formInspectionStats.inspected;

    if (inspected === 0) {
      setErrorMessage(
        "من فضلك قيّم بندًا واحدًا على الأقل من بنود التفتيش."
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const inspectionResults =
        buildInspectionResults(
          draftInspection,
          followUpTasks
        );

      const stats =
        calculateInspectionStats(
          inspectionResults
        );

      const calculatedStatus =
        calculateVisitStatus(
          inspectionResults
        );

      const violations =
        stats.nonCompliant;

      const recommendations =
        stats.needsImprovement;

      const tasks =
        followUpTasks.length;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (editingVisitId) {
        const { data, error } =
          await supabase
            .from("visits")
            .update({
              institute_id: form.institute,
              visitor: form.visitor.trim(),
              type: form.type,
              visit_date: form.date,
              status: calculatedStatus,
              notes:
                form.notes.trim() || null,
              violations,
              recommendations,
              tasks,
              inspection_results:
                inspectionResults,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", editingVisitId)
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
            `تعذر تحديث الزيارة: ${error.message}`
          );
        }

        const institute = institutes.find(
          (item) =>
            item.id === data.institute_id
        );

        const updatedVisit: Visit = {
          id: data.id,
          instituteId: data.institute_id,
          institute:
            institute?.name ||
            "معهد غير معروف",
          code: institute?.code || "-",
          visitor: data.visitor,
          type: data.type,
          date: data.visit_date,
          status:
            data.status as VisitStatus,
          notes: data.notes || "",
          violations: Number(
            data.violations || 0
          ),
          recommendations: Number(
            data.recommendations || 0
          ),
          tasks: Number(data.tasks || 0),
          inspectionResults:
            data.inspection_results || {},
          followUpTasks,
        };

        setVisits((previous) =>
          previous.map((visit) =>
            visit.id === updatedVisit.id
              ? updatedVisit
              : visit
          )
        );
      } else {
        const { data, error } =
          await supabase
            .from("visits")
            .insert({
              institute_id: form.institute,
              visitor: form.visitor.trim(),
              type: form.type,
              visit_date: form.date,
              status: calculatedStatus,
              notes:
                form.notes.trim() || null,
              violations,
              recommendations,
              tasks,
              inspection_results:
                inspectionResults,
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
          (item) =>
            item.id === data.institute_id
        );

        const newVisit: Visit = {
          id: data.id,
          instituteId: data.institute_id,
          institute:
            institute?.name ||
            "معهد غير معروف",
          code: institute?.code || "-",
          visitor: data.visitor,
          type: data.type,
          date: data.visit_date,
          status:
            data.status as VisitStatus,
          notes: data.notes || "",
          violations: Number(
            data.violations || 0
          ),
          recommendations: Number(
            data.recommendations || 0
          ),
          tasks: Number(data.tasks || 0),
          inspectionResults:
            data.inspection_results || {},
          followUpTasks,
        };

        setVisits((previous) => [
          newVisit,
          ...previous,
        ]);
      }

      setShowForm(false);
      setEditingVisitId(null);
      setDraftInspection(makeEmptyDraft());
      setFollowUpTasks([]);
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

  function formatDate(date: string) {
    if (!date) return "-";

    try {
      return new Intl.DateTimeFormat(
        "ar-EG",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      ).format(
        new Date(`${date}T00:00:00`)
      );
    } catch {
      return date;
    }
  }

  function formatShortDate(date: string) {
    if (!date) return "غير محدد";

    try {
      return new Intl.DateTimeFormat(
        "ar-EG",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      ).format(
        new Date(`${date}T00:00:00`)
      );
    } catch {
      return date;
    }
  }

  function printVisitReport(visit: Visit) {
    const stats =
      calculateInspectionStats(
        visit.inspectionResults
      );

    const taskRows =
      visit.followUpTasks
        .map(
          (task) => `
            <tr>
              <td>${escapeHtml(task.title)}</td>
              <td>${escapeHtml(task.responsible)}</td>
              <td>${escapeHtml(
                task.dueDate
                  ? formatShortDate(
                      task.dueDate
                    )
                  : "غير محدد"
              )}</td>
              <td>${
                task.status === "completed"
                  ? "مكتملة"
                  : "مفتوحة"
              }</td>
            </tr>
          `
        )
        .join("");

    const inspectionRows =
      inspectionItems
        .map((item) => {
          const result =
            getInspectionResult(
              visit.inspectionResults,
              item
            );

          const statusText = result.status
            ? inspectionStatusConfig[
                result.status
              ].label
            : "لم يتم التقييم";

          return `
            <tr>
              <td>${escapeHtml(item)}</td>
              <td>${escapeHtml(
                statusText
              )}</td>
              <td>${escapeHtml(
                result.note || "-"
              )}</td>
            </tr>
          `;
        })
        .join("");

    const reportWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!reportWindow) {
      setErrorMessage(
        "تعذر فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة."
      );
      return;
    }

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>تقرير زيارة - ${escapeHtml(
            visit.institute
          )}</title>
          <style>
            body {
              font-family: Arial, Tahoma, sans-serif;
              direction: rtl;
              margin: 0;
              padding: 30px;
              color: #1e293b;
              background: white;
            }

            .header {
              border-bottom: 3px solid #4f46e5;
              padding-bottom: 18px;
              margin-bottom: 25px;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 25px;
            }

            h2 {
              margin: 25px 0 12px;
              font-size: 18px;
            }

            .muted {
              color: #64748b;
              font-size: 13px;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 20px 0;
            }

            .card {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px;
              text-align: center;
            }

            .number {
              font-size: 23px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th, td {
              border: 1px solid #e2e8f0;
              padding: 9px;
              text-align: right;
              font-size: 12px;
            }

            th {
              background: #f8fafc;
            }

            .notes {
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 10px;
              padding: 15px;
              line-height: 1.9;
              white-space: pre-wrap;
            }

            .footer {
              margin-top: 35px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              color: #64748b;
              font-size: 11px;
              text-align: center;
            }

            @media print {
              body {
                padding: 10mm;
              }

              .no-print {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>تقرير زيارة وتفتيش</h1>
            <div class="muted">
              منصة إدارة ومتابعة المعاهد الأزهرية
            </div>
          </div>

          <table>
            <tr>
              <th>المعهد</th>
              <td>${escapeHtml(
                visit.institute
              )}</td>
              <th>الكود</th>
              <td>${escapeHtml(
                visit.code
              )}</td>
            </tr>
            <tr>
              <th>الزائر</th>
              <td>${escapeHtml(
                visit.visitor
              )}</td>
              <th>نوع الزيارة</th>
              <td>${escapeHtml(
                visit.type
              )}</td>
            </tr>
            <tr>
              <th>التاريخ</th>
              <td>${escapeHtml(
                formatDate(visit.date)
              )}</td>
              <th>الحالة</th>
              <td>${escapeHtml(
                statusConfig[visit.status]
                  .label
              )}</td>
            </tr>
          </table>

          <h2>ملخص نتيجة التفتيش</h2>

          <div class="grid">
            <div class="card">
              <div class="number">${
                stats.percentage
              }%</div>
              <div class="muted">
                نسبة الالتزام
              </div>
            </div>

            <div class="card">
              <div class="number">${
                stats.compliant
              }</div>
              <div class="muted">
                مطابق
              </div>
            </div>

            <div class="card">
              <div class="number">${
                stats.needsImprovement
              }</div>
              <div class="muted">
                يحتاج تحسين
              </div>
            </div>

            <div class="card">
              <div class="number">${
                stats.nonCompliant
              }</div>
              <div class="muted">
                غير مطابق
              </div>
            </div>
          </div>

          <h2>تفاصيل التفتيش</h2>

          <table>
            <thead>
              <tr>
                <th>بند التفتيش</th>
                <th>النتيجة</th>
                <th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${inspectionRows}
            </tbody>
          </table>

          <h2>الملاحظات العامة</h2>

          <div class="notes">
            ${escapeHtml(
              visit.notes ||
                "لا توجد ملاحظات عامة."
            )}
          </div>

          <h2>مهام المتابعة</h2>

          ${
            taskRows
              ? `
                <table>
                  <thead>
                    <tr>
                      <th>المهمة</th>
                      <th>المسؤول</th>
                      <th>الاستحقاق</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taskRows}
                  </tbody>
                </table>
              `
              : `<div class="notes">لا توجد مهام متابعة.</div>`
          }

          <div class="footer">
            تم إنشاء التقرير من نظام إدارة ومتابعة المعاهد الأزهرية
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);

    reportWindow.document.close();
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
                إدارة الزيارات وتقييم المعاهد ومتابعة نتائج التفتيش
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="إجمالي الزيارات"
          value={statistics.total}
          icon={<ClipboardList size={22} />}
          className="bg-white"
        />

        <StatCard
          title="مجدولة"
          value={statistics.planned}
          icon={<Clock3 size={22} />}
          className="bg-blue-50"
        />

        <StatCard
          title="مكتملة"
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

        <StatCard
          title="نسبة الالتزام"
          value={statistics.compliancePercentage}
          suffix="%"
          icon={<Target size={22} />}
          className="bg-indigo-50"
        />
      </div>

      {/* Secondary Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard
          title="التوصيات"
          value={statistics.recommendations}
          icon={<FileText size={20} />}
        />

        <InfoCard
          title="مهام المتابعة"
          value={statistics.totalTasks}
          icon={<ClipboardList size={20} />}
        />

        <InfoCard
          title="الزيارات الملغاة"
          value={statistics.cancelled}
          icon={<XCircle size={20} />}
        />
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Search
            size={18}
            className="text-indigo-600"
          />

          <div>
            <h2 className="font-bold text-slate-800">
              البحث والتصفية
            </h2>

            <p className="text-xs text-slate-400">
              ابحث عن الزيارات حسب المعهد أو الزائر أو النتيجة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_200px]">
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
              placeholder="ابحث باسم المعهد أو الكود أو اسم الزائر أو نوع الزيارة..."
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
              كل حالات الزيارة
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

          <select
            value={inspectionFilter}
            onChange={(event) =>
              setInspectionFilter(
                event.target.value as
                  | "all"
                  | "violations"
                  | "follow_up"
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">
              كل نتائج التفتيش
            </option>

            <option value="violations">
              بها مخالفات
            </option>

            <option value="follow_up">
              تحتاج متابعة
            </option>
          </select>
        </div>

        {(search ||
          statusFilter !== "all" ||
          inspectionFilter !== "all") && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-2.5">
            <span className="text-xs font-medium text-indigo-700">
              تم تطبيق فلاتر البحث
            </span>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setInspectionFilter("all");
              }}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
            >
              مسح الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Visits */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              سجل الزيارات
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredVisits.length} زيارة معروضة من أصل{" "}
              {visits.length}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            التفتيش والتقييم مرتبطان بالزيارة
          </div>
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
                ? "لم يتم تسجيل أي زيارة حتى الآن."
                : "لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية."}
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
              <table className="w-full min-w-[1200px] text-right">
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
                      التفتيش
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
                  {filteredVisits.map(
                    (visit) => {
                      const StatusIcon =
                        statusConfig[
                          visit.status
                        ].icon;

                      const stats =
                        calculateInspectionStats(
                          visit.inspectionResults
                        );

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
                            {formatDate(
                              visit.date
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {stats.inspected >
                            0 ? (
                              <div className="min-w-[125px]">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">
                                    {
                                      stats.percentage
                                    }
                                    %
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    {
                                      stats.inspected
                                    }{" "}
                                    /{" "}
                                    {
                                      inspectionItems.length
                                    }
                                  </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full ${
                                      stats.percentage >=
                                      80
                                        ? "bg-green-500"
                                        : stats.percentage >=
                                            60
                                          ? "bg-amber-500"
                                          : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${stats.percentage}%`,
                                    }}
                                  />
                                </div>

                                <div className="mt-1 flex gap-2 text-[10px]">
                                  <span className="text-green-600">
                                    ✓{" "}
                                    {
                                      stats.compliant
                                    }
                                  </span>

                                  <span className="text-amber-600">
                                    ⚠{" "}
                                    {
                                      stats.needsImprovement
                                    }
                                  </span>

                                  <span className="text-red-600">
                                    ✕{" "}
                                    {
                                      stats.nonCompliant
                                    }
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                لم يبدأ التفتيش
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig[visit.status].className}`}
                            >
                              <StatusIcon
                                size={14}
                              />

                              {
                                statusConfig[
                                  visit.status
                                ].label
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedVisit(
                                    visit
                                  )
                                }
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                التفاصيل
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditVisitForm(
                                    visit
                                  )
                                }
                                className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                استكمال
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredVisits.map(
                (visit) => {
                  const StatusIcon =
                    statusConfig[
                      visit.status
                    ].icon;

                  const stats =
                    calculateInspectionStats(
                      visit.inspectionResults
                    );

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
                          <StatusIcon
                            size={13}
                          />

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
                            {formatDate(
                              visit.date
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">
                            نتيجة التفتيش
                          </span>

                          <span className="text-sm font-bold text-indigo-700">
                            {
                              stats.percentage
                            }
                            %
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{
                              width: `${stats.percentage}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="rounded-lg bg-green-50 py-1.5 text-green-700">
                            مطابق{" "}
                            {
                              stats.compliant
                            }
                          </div>

                          <div className="rounded-lg bg-amber-50 py-1.5 text-amber-700">
                            تحسين{" "}
                            {
                              stats.needsImprovement
                            }
                          </div>

                          <div className="rounded-lg bg-red-50 py-1.5 text-red-700">
                            مخالفة{" "}
                            {
                              stats.nonCompliant
                            }
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedVisit(
                              visit
                            )
                          }
                          className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          التفاصيل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditVisitForm(
                              visit
                            )
                          }
                          className="rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          استكمال الزيارة
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
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
              ثمانية محاور رئيسية لتقييم حالة المعهد أثناء الزيارة
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

      {/* New/Edit Visit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingVisitId
                    ? "استكمال وتحديث الزيارة"
                    : "تسجيل زيارة جديدة"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  أدخل بيانات الزيارة ثم قيّم جميع البنود التي تم فحصها
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

            <div className="space-y-6 p-5">
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Basic Information */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <CalendarDays size={17} />
                  </div>

                  <h3 className="font-bold text-slate-800">
                    بيانات الزيارة
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      المعهد
                    </label>

                    <select
                      value={form.institute}
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            institute:
                              event.target.value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">
                        اختر المعهد
                      </option>

                      {institutes.map(
                        (institute) => (
                          <option
                            key={institute.id}
                            value={institute.id}
                          >
                            {institute.name} —{" "}
                            {institute.code}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      اسم الزائر
                    </label>

                    <input
                      value={form.visitor}
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            visitor:
                              event.target.value,
                          })
                        )
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
                        setForm(
                          (previous) => ({
                            ...previous,
                            type: event.target.value,
                          })
                        )
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
                        setForm(
                          (previous) => ({
                            ...previous,
                            date: event.target.value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </section>

              {/* Live Result */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ResultCard
                  title="تم فحص"
                  value={
                    formInspectionStats.inspected
                  }
                  className="bg-slate-50"
                />

                <ResultCard
                  title="مطابق"
                  value={
                    formInspectionStats.compliant
                  }
                  className="bg-green-50"
                />

                <ResultCard
                  title="يحتاج تحسين"
                  value={
                    formInspectionStats.needsImprovement
                  }
                  className="bg-amber-50"
                />

                <ResultCard
                  title="غير مطابق"
                  value={
                    formInspectionStats.nonCompliant
                  }
                  className="bg-red-50"
                />
              </div>

              {/* Inspection */}
              <section>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      التقييم التفصيلي للتفتيش
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      اختر نتيجة كل بند واكتب الملاحظة عند الحاجة
                    </p>
                  </div>

                  <div className="rounded-xl bg-indigo-50 px-4 py-2 text-center">
                    <span className="text-xs text-indigo-600">
                      نسبة الالتزام الحالية
                    </span>

                    <div className="text-xl font-bold text-indigo-700">
                      {
                        formInspectionStats.percentage
                      }
                      %
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {inspectionItems.map(
                    (item, index) => {
                      const current =
                        draftInspection[
                          item
                        ];

                      return (
                        <div
                          key={item}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                              {index + 1}
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">
                                {item}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                حدد نتيجة الفحص
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            {(
                              Object.keys(
                                inspectionStatusConfig
                              ) as InspectionStatus[]
                            ).map(
                              (status) => {
                                const config =
                                  inspectionStatusConfig[
                                    status
                                  ];

                                const Icon =
                                  config.icon;

                                const active =
                                  current.status ===
                                  status;

                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() =>
                                      setInspectionStatus(
                                        item,
                                        status
                                      )
                                    }
                                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                      active
                                        ? config.className
                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                                    }`}
                                  >
                                    <Icon
                                      size={17}
                                    />

                                    {
                                      config.label
                                    }
                                  </button>
                                );
                              }
                            )}
                          </div>

                          <div className="mt-3">
                            <textarea
                              value={
                                current.note
                              }
                              onChange={(
                                event
                              ) =>
                                setInspectionNote(
                                  item,
                                  event.target
                                    .value
                                )
                              }
                              rows={2}
                              placeholder="ملاحظات هذا البند..."
                              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              {/* Follow Up Tasks */}
              <section>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <ClipboardList size={19} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800">
                      مهام المتابعة
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      أنشئ مهامًا مرتبطة بنتائج الزيارة لمتابعة المعهد
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_180px_150px_auto]">
                    <input
                      value={
                        taskForm.title
                      }
                      onChange={(event) =>
                        setTaskForm(
                          (previous) => ({
                            ...previous,
                            title:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="اسم مهمة المتابعة"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />

                    <input
                      value={
                        taskForm.responsible
                      }
                      onChange={(event) =>
                        setTaskForm(
                          (previous) => ({
                            ...previous,
                            responsible:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="المسؤول"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />

                    <input
                      type="date"
                      value={
                        taskForm.dueDate
                      }
                      onChange={(event) =>
                        setTaskForm(
                          (previous) => ({
                            ...previous,
                            dueDate:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />

                    <select
                      value={
                        taskForm.priority
                      }
                      onChange={(event) =>
                        setTaskForm(
                          (previous) => ({
                            ...previous,
                            priority:
                              event.target
                                .value as
                                | "low"
                                | "medium"
                                | "high",
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="low">
                        أولوية منخفضة
                      </option>

                      <option value="medium">
                        أولوية متوسطة
                      </option>

                      <option value="high">
                        أولوية عالية
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={
                        addFollowUpTask
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                    >
                      <Plus size={17} />
                      إضافة
                    </button>
                  </div>

                  {followUpTasks.length >
                    0 && (
                    <div className="mt-4 space-y-2">
                      {followUpTasks.map(
                        (task) => (
                          <div
                            key={task.id}
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                              <ClipboardList
                                size={18}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`font-semibold ${
                                  task.status ===
                                  "completed"
                                    ? "text-slate-400 line-through"
                                    : "text-slate-800"
                                }`}
                              >
                                {task.title}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                                <span>
                                  المسؤول:{" "}
                                  {
                                    task.responsible
                                  }
                                </span>

                                <span>
                                  الاستحقاق:{" "}
                                  {task.dueDate
                                    ? formatShortDate(
                                        task.dueDate
                                      )
                                    : "غير محدد"}
                                </span>

                                <span>
                                  الأولوية:{" "}
                                  {task.priority ===
                                  "high"
                                    ? "عالية"
                                    : task.priority ===
                                        "medium"
                                      ? "متوسطة"
                                      : "منخفضة"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleTaskStatus(
                                    task.id
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                  task.status ===
                                  "completed"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {task.status ===
                                "completed"
                                  ? "مكتملة"
                                  : "مفتوحة"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  removeFollowUpTask(
                                    task.id
                                  )
                                }
                                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                              >
                                <X
                                  size={17}
                                />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* General Notes */}
              <section>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الملاحظات العامة للزيارة
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        notes:
                          event.target.value,
                      })
                    )
                  }
                  rows={4}
                  placeholder="اكتب الملاحظات أو التوصيات العامة..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </section>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  الحالة النهائية ستُحدد تلقائيًا بناءً على نتائج التفتيش.
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                        <CheckCircle2
                          size={18}
                        />

                        {editingVisitId
                          ? "حفظ تحديث الزيارة"
                          : "حفظ الزيارة"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit Details Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {(() => {
              const stats =
                calculateInspectionStats(
                  selectedVisit.inspectionResults
                );

              const StatusIcon =
                statusConfig[
                  selectedVisit.status
                ].icon;

              return (
                <>
                  <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        تفاصيل الزيارة والتفتيش
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedVisit.institute}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVisit(
                          null
                        )
                      }
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="space-y-6 p-5">
                    {/* Header info */}
                    <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailItem
                        label="المعهد"
                        value={
                          selectedVisit.institute
                        }
                      />

                      <DetailItem
                        label="كود المعهد"
                        value={
                          selectedVisit.code
                        }
                      />

                      <DetailItem
                        label="الزائر"
                        value={
                          selectedVisit.visitor
                        }
                      />

                      <DetailItem
                        label="نوع الزيارة"
                        value={
                          selectedVisit.type
                        }
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
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig[selectedVisit.status].className}`}
                        >
                          <StatusIcon
                            size={14}
                          />

                          {
                            statusConfig[
                              selectedVisit
                                .status
                            ].label
                          }
                        </span>
                      </div>
                    </div>

                    {/* Inspection summary */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">
                          ملخص نتيجة التفتيش
                        </h3>

                        <span className="text-2xl font-bold text-indigo-700">
                          {stats.percentage}%
                        </span>
                      </div>

                      <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            stats.percentage >=
                            80
                              ? "bg-green-500"
                              : stats.percentage >=
                                  60
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${stats.percentage}%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MiniStat
                          label="تم فحص"
                          value={
                            stats.inspected
                          }
                        />

                        <MiniStat
                          label="مطابق"
                          value={
                            stats.compliant
                          }
                        />

                        <MiniStat
                          label="يحتاج تحسين"
                          value={
                            stats.needsImprovement
                          }
                        />

                        <MiniStat
                          label="غير مطابق"
                          value={
                            stats.nonCompliant
                          }
                        />
                      </div>
                    </div>

                    {/* Inspection Details */}
                    <div>
                      <h3 className="mb-3 font-bold text-slate-800">
                        تفاصيل بنود التفتيش
                      </h3>

                      <div className="space-y-3">
                        {inspectionItems.map(
                          (item) => {
                            const result =
                              getInspectionResult(
                                selectedVisit.inspectionResults,
                                item
                              );

                            return (
                              <div
                                key={item}
                                className="rounded-2xl border border-slate-200 p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {item}
                                    </p>

                                    {result.note && (
                                      <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {result.note}
                                      </p>
                                    )}
                                  </div>

                                  {result.status ? (
                                    (() => {
                                      const config =
                                        inspectionStatusConfig[
                                          result.status
                                        ];

                                      const Icon =
                                        config.icon;

                                      return (
                                        <span
                                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.className}`}
                                        >
                                          <Icon
                                            size={
                                              15
                                            }
                                          />

                                          {
                                            config.label
                                          }
                                        </span>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-xs font-medium text-slate-400">
                                      لم يتم تقييم هذا البند
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">
                          مهام المتابعة
                        </h3>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {
                            selectedVisit
                              .followUpTasks
                              .length
                          }{" "}
                          مهمة
                        </span>
                      </div>

                      {selectedVisit
                        .followUpTasks.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
                          لا توجد مهام متابعة لهذه الزيارة.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedVisit.followUpTasks.map(
                            (task) => (
                              <div
                                key={task.id}
                                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                  <ClipboardList
                                    size={17}
                                  />
                                </div>

                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {task.title}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    المسؤول:{" "}
                                    {
                                      task.responsible
                                    }

                                    {" • "}

                                    الاستحقاق:{" "}
                                    {task.dueDate
                                      ? formatShortDate(
                                          task.dueDate
                                        )
                                      : "غير محدد"}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                    task.status ===
                                    "completed"
                                      ? "bg-green-50 text-green-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {task.status ===
                                  "completed"
                                    ? "مكتملة"
                                    : "مفتوحة"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* General Notes */}
                    <div>
                      <h3 className="mb-2 font-bold text-slate-800">
                        الملاحظات العامة
                      </h3>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        {selectedVisit.notes ||
                          "لا توجد ملاحظات عامة مسجلة لهذه الزيارة."}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() =>
                          printVisitReport(
                            selectedVisit
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <Printer size={18} />
                        طباعة التقرير
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEditVisitForm(
                            selectedVisit
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <ClipboardCheck
                          size={18}
                        />
                        استكمال / تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVisit(
                            null
                          )
                        }
                        className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Components
// ---------------------------------------------------------

function StatCard({
  title,
  value,
  icon,
  className,
  suffix = "",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
  suffix?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${
        className || "bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-indigo-600 shadow-sm">
          {icon}
        </div>

        <span className="text-3xl font-bold text-slate-900">
          {value}
          {suffix}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-600">
        {title}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-400">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 p-3 text-center ${
        className || "bg-white"
      }`}
    >
      <p className="text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
