"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

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
  status: InspectionStatus;
  note: string;
};

type InspectionResults = Record<string, InspectionResult>;

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
  followUpTasks: string[];
};

type VisitForm = {
  institute: string;
  visitor: string;
  type: string;
  date: string;
  notes: string;
};

/* =========================================================
   INSPECTION FRAMEWORK
========================================================= */

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

/* =========================================================
   CONFIG
========================================================= */

const statusConfig: Record<
  VisitStatus,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  planned: {
    label: "مجدولة",
    className:
      "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock3,
  },
  completed: {
    label: "مكتملة",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  follow_up: {
    label: "تحتاج متابعة",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  cancelled: {
    label: "ملغاة",
    className:
      "bg-gray-100 text-gray-600 border-gray-200",
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
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  needs_improvement: {
    label: "يحتاج تحسين",
    shortLabel: "تحسين",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  non_compliant: {
    label: "غير مطابق",
    shortLabel: "مخالفة",
    className:
      "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

/* =========================================================
   HELPERS
========================================================= */

function emptyInspectionResults(): InspectionResults {
  return {};
}

function normalizeVisitStatus(value: unknown): VisitStatus {
  if (
    value === "planned" ||
    value === "completed" ||
    value === "follow_up" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "planned";
}

function normalizeInspectionResults(
  raw: unknown
): InspectionResults {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const source = raw as Record<string, unknown>;

  /*
    النسخة الجديدة تخزن:
    {
      items: {...},
      followUpTasks: [...]
    }

    أما البيانات القديمة فكانت تخزن البنود مباشرة.
  */
  const itemsSource =
    source.items &&
    typeof source.items === "object"
      ? (source.items as Record<string, unknown>)
      : source;

  const result: InspectionResults = {};

  for (const item of inspectionItems) {
    const value = itemsSource[item];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const current =
        value as Record<string, unknown>;

      if (
        current.status === "compliant" ||
        current.status === "needs_improvement" ||
        current.status === "non_compliant"
      ) {
        result[item] = {
          status: current.status,
          note:
            typeof current.note === "string"
              ? current.note
              : "",
        };
      }

      continue;
    }

    /*
      توافق مع البيانات القديمة:
      true = تم الفحص ومطابق
      false = لم يتم تحديده
    */
    if (typeof value === "boolean" && value) {
      result[item] = {
        status: "compliant",
        note: "",
      };
    }
  }

  return result;
}

function extractFollowUpTasks(
  raw: unknown
): string[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const source = raw as Record<string, unknown>;

  if (!Array.isArray(source.followUpTasks)) {
    return [];
  }

  return source.followUpTasks.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0
  );
}

function calculateInspectionSummary(
  results: InspectionResults
) {
  let inspected = 0;
  let compliant = 0;
  let needsImprovement = 0;
  let nonCompliant = 0;

  for (const item of inspectionItems) {
    const result = results[item];

    if (!result) {
      continue;
    }

    inspected++;

    if (result.status === "compliant") {
      compliant++;
    }

    if (result.status === "needs_improvement") {
      needsImprovement++;
    }

    if (result.status === "non_compliant") {
      nonCompliant++;
    }
  }

  const inspectionPercentage = Math.round(
    (inspected / inspectionItems.length) * 100
  );

  const compliancePercentage =
    inspected === 0
      ? 0
      : Math.round((compliant / inspected) * 100);

  return {
    inspected,
    compliant,
    needsImprovement,
    nonCompliant,
    inspectionPercentage,
    compliancePercentage,
  };
}

function deriveVisitStatus(
  results: InspectionResults
): VisitStatus {
  const summary =
    calculateInspectionSummary(results);

  if (summary.nonCompliant > 0) {
    return "follow_up";
  }

  if (summary.needsImprovement > 0) {
    return "follow_up";
  }

  if (
    summary.inspected === inspectionItems.length
  ) {
    return "completed";
  }

  return "planned";
}

function formatDate(date: string) {
  if (!date) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function todayString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   COMPONENT
========================================================= */

export default function VisitsPage() {
  const [institutes, setInstitutes] = useState<
    Institute[]
  >([]);

  // When opened from an institute profile:
  // /visits?instituteId=...
  // only that institute's visits are loaded.
  const [requestedInstituteId, setRequestedInstituteId] =
    useState("");

  const [visits, setVisits] = useState<Visit[]>([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | VisitStatus>("all");

  const [resultFilter, setResultFilter] =
    useState<
      "all" | "violations" | "follow_up"
    >("all");

  const [instituteFilter, setInstituteFilter] =
    useState("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [showDetails, setShowDetails] =
    useState(false);

  const [selectedVisit, setSelectedVisit] =
    useState<Visit | null>(null);

  const [editingVisit, setEditingVisit] =
    useState<Visit | null>(null);

  const [form, setForm] = useState<VisitForm>({
    institute: "",
    visitor: "",
    type: "زيارة متابعة دورية",
    date: todayString(),
    notes: "",
  });

  const [inspection, setInspection] =
    useState<InspectionResults>(
      emptyInspectionResults()
    );

  const [followUpTasks, setFollowUpTasks] =
    useState<string[]>([]);

  const [taskInput, setTaskInput] =
    useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadData(instituteIdOverride?: string) {
    setLoading(true);
    setErrorMessage("");

    try {
      const requestedId =
        instituteIdOverride ??
        requestedInstituteId;

      if (requestedId) {
        setInstituteFilter(requestedId);
      }
      const [
        { data: instituteData, error: instituteError },
        { data: visitData, error: visitError },
      ] = await Promise.all([
        supabase
          .from("institutes")
          .select("id,name,code")
          .order("name"),

        (() => {
          let query = supabase
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
              inspection_results,
              created_at
            `
            )
            .order("visit_date", {
              ascending: false,
            });

          if (requestedId) {
            query = query.eq(
              "institute_id",
              requestedId
            );
          }

          return query;
        })(),
      ]);

      if (instituteError) {
        throw instituteError;
      }

      if (visitError) {
        throw visitError;
      }

      const instituteList =
        (instituteData || []) as Institute[];

      setInstitutes(instituteList);

      const instituteMap = new Map(
        instituteList.map((institute) => [
          institute.id,
          institute,
        ])
      );

      const mappedVisits: Visit[] = (
        visitData || []
      ).map((item: any) => {
        const institute =
          instituteMap.get(item.institute_id);

        const inspectionResults =
          normalizeInspectionResults(
            item.inspection_results
          );

        const followTasks =
          extractFollowUpTasks(
            item.inspection_results
          );

        return {
          id: item.id,
          instituteId: item.institute_id,
          institute:
            institute?.name ||
            "معهد غير معروف",
          code: institute?.code || "-",
          visitor: item.visitor || "",
          type: item.type || "",
          date: item.visit_date || "",
          status: normalizeVisitStatus(
            item.status
          ),
          notes: item.notes || "",
          violations:
            Number(item.violations) || 0,
          recommendations:
            Number(item.recommendations) || 0,
          tasks:
            followTasks.length > 0
              ? followTasks.length
              : Number(item.tasks) || 0,
          inspectionResults,
          followUpTasks: followTasks,
        };
      });

      setVisits(mappedVisits);
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل بيانات الزيارات"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Read instituteId from the URL without useSearchParams.
    const params = new URLSearchParams(
      window.location.search
    );

    const instituteId =
      params.get("instituteId")?.trim() || "";

    setRequestedInstituteId(instituteId);

    loadData(instituteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     STATS
  ======================================================= */

  const statistics = useMemo(() => {
    const total = visits.length;

    const planned = visits.filter(
      (visit) => visit.status === "planned"
    ).length;

    const completed = visits.filter(
      (visit) => visit.status === "completed"
    ).length;

    const followUp = visits.filter(
      (visit) => visit.status === "follow_up"
    ).length;

    const cancelled = visits.filter(
      (visit) => visit.status === "cancelled"
    ).length;

    const violations = visits.reduce(
      (sum, visit) => sum + visit.violations,
      0
    );

    const recommendations = visits.reduce(
      (sum, visit) =>
        sum + visit.recommendations,
      0
    );

    const tasks = visits.reduce(
      (sum, visit) => sum + visit.tasks,
      0
    );

    let complianceSum = 0;
    let complianceCount = 0;

    visits.forEach((visit) => {
      const summary =
        calculateInspectionSummary(
          visit.inspectionResults
        );

      if (summary.inspected > 0) {
        complianceSum +=
          summary.compliancePercentage;
        complianceCount++;
      }
    });

    const averageCompliance =
      complianceCount === 0
        ? 0
        : Math.round(
            complianceSum / complianceCount
          );

    return {
      total,
      planned,
      completed,
      followUp,
      cancelled,
      violations,
      recommendations,
      tasks,
      averageCompliance,
    };
  }, [visits]);

  /* =======================================================
     FILTERS
  ======================================================= */

  const visitTypes = useMemo(() => {
    return Array.from(
      new Set(
        visits
          .map((visit) => visit.type)
          .filter(Boolean)
      )
    );
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase();

    return visits.filter((visit) => {
      const matchesSearch =
        !query ||
        visit.institute
          .toLowerCase()
          .includes(query) ||
        visit.visitor
          .toLowerCase()
          .includes(query) ||
        visit.type
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        visit.status === statusFilter;

      const matchesInstitute =
        instituteFilter === "all" ||
        visit.instituteId === instituteFilter;

      const matchesType =
        typeFilter === "all" ||
        visit.type === typeFilter;

      const summary =
        calculateInspectionSummary(
          visit.inspectionResults
        );

      const matchesResult =
        resultFilter === "all" ||
        (resultFilter === "violations" &&
          summary.nonCompliant > 0) ||
        (resultFilter === "follow_up" &&
          (summary.nonCompliant > 0 ||
            summary.needsImprovement > 0));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesInstitute &&
        matchesType &&
        matchesResult
      );
    });
  }, [
    visits,
    searchTerm,
    statusFilter,
    resultFilter,
    instituteFilter,
    typeFilter,
  ]);

  /* =======================================================
     FORM
  ======================================================= */

  function resetForm() {
    setForm({
      institute: "",
      visitor: "",
      type: "زيارة متابعة دورية",
      date: todayString(),
      notes: "",
    });

    setInspection(
      emptyInspectionResults()
    );

    setFollowUpTasks([]);
    setTaskInput("");
    setEditingVisit(null);
  }

  function openNewVisitForm() {
    resetForm();

    if (requestedInstituteId) {
      setForm((previous) => ({
        ...previous,
        institute: requestedInstituteId,
      }));
    }

    setShowForm(true);
    setShowDetails(false);
    setErrorMessage("");
  }

  function openEditVisitForm(
    visit: Visit
  ) {
    setEditingVisit(visit);

    setForm({
      institute: visit.instituteId,
      visitor: visit.visitor,
      type: visit.type,
      date: visit.date,
      notes: visit.notes,
    });

    setInspection(
      normalizeInspectionResults(
        visit.inspectionResults
      )
    );

    setFollowUpTasks([
      ...visit.followUpTasks,
    ]);

    setTaskInput("");

    setShowDetails(false);
    setShowForm(true);
    setErrorMessage("");
  }

  function updateForm(
    field: keyof VisitForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function setInspectionStatus(
    item: string,
    status: InspectionStatus
  ) {
    setInspection((previous) => ({
      ...previous,
      [item]: {
        status,
        note: previous[item]?.note || "",
      },
    }));
  }

  function setInspectionNote(
    item: string,
    note: string
  ) {
    setInspection((previous) => ({
      ...previous,
      [item]: {
        status:
          previous[item]?.status ||
          "compliant",
        note,
      },
    }));
  }

  function clearInspectionItem(
    item: string
  ) {
    setInspection((previous) => {
      const copy = { ...previous };
      delete copy[item];
      return copy;
    });
  }

  /* =======================================================
     TASKS
  ======================================================= */

  function addTask() {
    const task = taskInput.trim();

    if (!task) {
      return;
    }

    setFollowUpTasks((previous) => [
      ...previous,
      task,
    ]);

    setTaskInput("");
  }

  function removeTask(index: number) {
    setFollowUpTasks((previous) =>
      previous.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    );
  }

  function generateTasksFromInspection() {
    const generated = inspectionItems
      .filter((item) => {
        const result = inspection[item];

        return (
          result?.status ===
            "needs_improvement" ||
          result?.status ===
            "non_compliant"
        );
      })
      .map(
        (item) =>
          `متابعة ومعالجة بند: ${item}`
      );

    setFollowUpTasks((previous) => {
      const combined = [
        ...previous,
        ...generated,
      ];

      return Array.from(
        new Set(combined)
      );
    });
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveVisit() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.institute) {
      setErrorMessage(
        "من فضلك اختر المعهد."
      );
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

    const summary =
      calculateInspectionSummary(
        inspection
      );

    const calculatedStatus =
      deriveVisitStatus(inspection);

    const payloadInspection = {
      items: inspection,
      followUpTasks,
    };

    try {
      if (editingVisit) {
        const { data, error } =
          await supabase
            .from("visits")
            .update({
              institute_id:
                form.institute,
              visitor:
                form.visitor.trim(),
              type: form.type,
              visit_date: form.date,
              status: calculatedStatus,
              notes:
                form.notes.trim() || null,
              violations:
                summary.nonCompliant,
              recommendations:
                summary.needsImprovement,
              tasks:
                followUpTasks.length,
              inspection_results:
                payloadInspection,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", editingVisit.id)
            .select()
            .single();

        if (error) {
          throw error;
        }

        const selectedInstitute =
          institutes.find(
            (institute) =>
              institute.id ===
              form.institute
          );

        const updatedVisit: Visit = {
          ...editingVisit,
          instituteId:
            form.institute,
          institute:
            selectedInstitute?.name ||
            editingVisit.institute,
          code:
            selectedInstitute?.code ||
            editingVisit.code,
          visitor:
            form.visitor.trim(),
          type: form.type,
          date: form.date,
          status: calculatedStatus,
          notes: form.notes.trim(),
          violations:
            summary.nonCompliant,
          recommendations:
            summary.needsImprovement,
          tasks: followUpTasks.length,
          inspectionResults:
            inspection,
          followUpTasks: [
            ...followUpTasks,
          ],
        };

        setVisits((previous) =>
          previous.map((visit) =>
            visit.id === editingVisit.id
              ? updatedVisit
              : visit
          )
        );

        setSelectedVisit(updatedVisit);

        setSuccessMessage(
          "تم تحديث الزيارة ونتائج التفتيش بنجاح ✅"
        );
      } else {
        const {
          data: {
            user,
          },
        } = await supabase.auth.getUser();

        const { data, error } =
          await supabase
            .from("visits")
            .insert({
              institute_id:
                form.institute,
              visitor:
                form.visitor.trim(),
              type: form.type,
              visit_date: form.date,
              status: calculatedStatus,
              notes:
                form.notes.trim() || null,
              violations:
                summary.nonCompliant,
              recommendations:
                summary.needsImprovement,
              tasks:
                followUpTasks.length,
              inspection_results:
                payloadInspection,
              created_by:
                user?.id || null,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        const selectedInstitute =
          institutes.find(
            (institute) =>
              institute.id ===
              form.institute
          );

        const newVisit: Visit = {
          id: data.id,
          instituteId:
            form.institute,
          institute:
            selectedInstitute?.name ||
            "معهد غير معروف",
          code:
            selectedInstitute?.code ||
            "-",
          visitor:
            form.visitor.trim(),
          type: form.type,
          date: form.date,
          status: calculatedStatus,
          notes: form.notes.trim(),
          violations:
            summary.nonCompliant,
          recommendations:
            summary.needsImprovement,
          tasks: followUpTasks.length,
          inspectionResults:
            inspection,
          followUpTasks: [
            ...followUpTasks,
          ],
        };

        setVisits((previous) => [
          newVisit,
          ...previous,
        ]);

        setSelectedVisit(newVisit);

        setSuccessMessage(
          "تم تسجيل الزيارة بنجاح ✅"
        );
      }

      setShowForm(false);
      setEditingVisit(null);

      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "حدث خطأ أثناء حفظ الزيارة"
      );
    }
  }

  /* =======================================================
     CANCEL
  ======================================================= */

  async function cancelVisit(
    visit: Visit
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من إلغاء زيارة ${visit.institute}؟`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("visits")
          .update({
            status: "cancelled",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", visit.id);

      if (error) {
        throw error;
      }

      setVisits((previous) =>
        previous.map((current) =>
          current.id === visit.id
            ? {
                ...current,
                status: "cancelled",
              }
            : current
        )
      );

      if (
        selectedVisit?.id === visit.id
      ) {
        setSelectedVisit({
          ...visit,
          status: "cancelled",
        });
      }

      setSuccessMessage(
        "تم إلغاء الزيارة بنجاح."
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "تعذر إلغاء الزيارة"
      );
    }
  }

  /* =======================================================
     DETAILS
  ======================================================= */

  function openDetails(visit: Visit) {
    setSelectedVisit(visit);
    setShowDetails(true);
    setShowForm(false);
  }

  /* =======================================================
     PRINT
  ======================================================= */

  function printVisitReport(
    visit: Visit
  ) {
    const summary =
      calculateInspectionSummary(
        visit.inspectionResults
      );

    const popup = window.open(
      "",
      "_blank",
      "width=1100,height=850"
    );

    if (!popup) {
      setErrorMessage(
        "تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة."
      );
      return;
    }

    const inspectionRows =
      inspectionItems
        .map((item, index) => {
          const result =
            visit.inspectionResults[item];

          const status = result
            ? inspectionStatusConfig[
                result.status
              ]
            : null;

          return `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item)}</td>
              <td>
                ${
                  status
                    ? escapeHtml(
                        status.label
                      )
                    : "لم يتم الفحص"
                }
              </td>
              <td>
                ${
                  result?.note
                    ? escapeHtml(
                        result.note
                      )
                    : "-"
                }
              </td>
            </tr>
          `;
        })
        .join("");

    const tasksHtml =
      visit.followUpTasks.length > 0
        ? `
          <ul>
            ${visit.followUpTasks
              .map(
                (task) =>
                  `<li>${escapeHtml(
                    task
                  )}</li>`
              )
              .join("")}
          </ul>
        `
        : "<p>لا توجد مهام متابعة.</p>";

    popup.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>تقرير زيارة - ${escapeHtml(
          visit.institute
        )}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              Arial,
              Tahoma,
              sans-serif;

            margin: 0;
            padding: 35px;

            color: #172033;
            background: white;
            direction: rtl;
          }

          .header {
            border-bottom: 3px solid #172033;
            padding-bottom: 18px;
            margin-bottom: 25px;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 28px;
          }

          h2 {
            margin-top: 30px;
            font-size: 20px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }

          .subtitle {
            color: #64748b;
          }

          .grid {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);

            gap: 12px;
            margin: 20px 0;
          }

          .card {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 15px;
            background: #fafafa;
          }

          .label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
          }

          .value {
            font-weight: bold;
            font-size: 17px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          th,
          td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: right;
          }

          th {
            background: #f1f5f9;
          }

          .notes {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 10px;
            min-height: 80px;
          }

          li {
            margin: 8px 0;
          }

          .footer {
            margin-top: 45px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            color: #64748b;
            font-size: 12px;
          }

          @media print {
            body {
              padding: 15px;
            }

            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <h1>تقرير زيارة وتفتيش</h1>
          <div class="subtitle">
            منصة الإدارة والمتابعة التعليمية الأزهرية
          </div>
        </div>

        <div class="grid">

          <div class="card">
            <div class="label">المعهد</div>
            <div class="value">
              ${escapeHtml(
                visit.institute
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">كود المعهد</div>
            <div class="value">
              ${escapeHtml(
                visit.code
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">الزائر</div>
            <div class="value">
              ${escapeHtml(
                visit.visitor
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">نوع الزيارة</div>
            <div class="value">
              ${escapeHtml(
                visit.type
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">التاريخ</div>
            <div class="value">
              ${escapeHtml(
                formatDate(
                  visit.date
                )
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">الحالة</div>
            <div class="value">
              ${escapeHtml(
                statusConfig[
                  visit.status
                ].label
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">نسبة الالتزام</div>
            <div class="value">
              ${
                summary.compliancePercentage
              }%
            </div>
          </div>

          <div class="card">
            <div class="label">نسبة الفحص</div>
            <div class="value">
              ${
                summary.inspected
              } / ${
                inspectionItems.length
              }
            </div>
          </div>

        </div>

        <h2>نتائج التفتيش</h2>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>محور التفتيش</th>
              <th>النتيجة</th>
              <th>الملاحظات</th>
            </tr>
          </thead>

          <tbody>
            ${inspectionRows}
          </tbody>
        </table>

        <h2>ملخص النتائج</h2>

        <div class="grid">

          <div class="card">
            <div class="label">
              مطابق
            </div>
            <div class="value">
              ${
                summary.compliant
              }
            </div>
          </div>

          <div class="card">
            <div class="label">
              يحتاج تحسين
            </div>
            <div class="value">
              ${
                summary.needsImprovement
              }
            </div>
          </div>

          <div class="card">
            <div class="label">
              مخالفات
            </div>
            <div class="value">
              ${
                summary.nonCompliant
              }
            </div>
          </div>

          <div class="card">
            <div class="label">
              مهام المتابعة
            </div>
            <div class="value">
              ${
                visit.followUpTasks
                  .length
              }
            </div>
          </div>

        </div>

        <h2>مهام المتابعة</h2>

        ${tasksHtml}

        <h2>ملاحظات الزيارة</h2>

        <div class="notes">
          ${
            visit.notes
              ? escapeHtml(
                  visit.notes
                )
              : "لا توجد ملاحظات."
          }
        </div>

        <div class="footer">
          تم إنشاء التقرير من نظام إدارة المعاهد الأزهرية.
        </div>

      </body>
      </html>
    `);

    popup.document.close();

    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 400);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      dir="rtl"
      className="space-y-6 pb-10"
    >

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            الزيارات والتفتيش
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            إدارة الزيارات وتقييم المعاهد
            ومتابعة نتائج التفتيش
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw
              size={17}
            />
            تحديث
          </button>

          <button
            type="button"
            onClick={openNewVisitForm}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            <Plus size={18} />
            تسجيل زيارة جديدة
          </button>

        </div>

      </div>

      {/* ===================================================
          MESSAGES
      =================================================== */}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ShieldAlert
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            {errorMessage}
          </div>

          <button
            type="button"
            onClick={() =>
              setErrorMessage("")
            }
          >
            <X size={18} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={20}
          />
          {successMessage}
        </div>
      )}

      {/* ===================================================
          STATISTICS
      =================================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">

        <StatCard
          title="إجمالي الزيارات"
          value={statistics.total}
          icon={ClipboardList}
          iconClass="bg-gray-100 text-gray-700"
        />

        <StatCard
          title="مجدولة"
          value={statistics.planned}
          icon={Clock3}
          iconClass="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="مكتملة"
          value={statistics.completed}
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-700"
        />

        <StatCard
          title="تحتاج متابعة"
          value={statistics.followUp}
          icon={AlertTriangle}
          iconClass="bg-amber-50 text-amber-700"
        />

        <StatCard
          title="المخالفات"
          value={statistics.violations}
          icon={XCircle}
          iconClass="bg-red-50 text-red-700"
        />

        <StatCard
          title="نسبة الالتزام"
          value={`${statistics.averageCompliance}%`}
          icon={ClipboardCheck}
          iconClass="bg-indigo-50 text-indigo-700"
        />

        <StatCard
          title="التوصيات"
          value={statistics.recommendations}
          icon={FileText}
          iconClass="bg-purple-50 text-purple-700"
        />

        <StatCard
          title="مهام المتابعة"
          value={statistics.tasks}
          icon={ListChecks}
          iconClass="bg-orange-50 text-orange-700"
        />

      </div>

      {/* ===================================================
          FILTERS
      =================================================== */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900">
            البحث والتصفية
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            ابحث عن الزيارات حسب المعهد
            أو الزائر أو نوع الزيارة والنتيجة
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">

          <div className="relative lg:col-span-2">

            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="ابحث عن المعهد أو الزائر..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
            />

          </div>

          <SelectField
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(
                value as
                  | "all"
                  | VisitStatus
              )
            }
            options={[
              {
                value: "all",
                label: "كل حالات الزيارة",
              },
              {
                value: "planned",
                label: "مجدولة",
              },
              {
                value: "completed",
                label: "مكتملة",
              },
              {
                value: "follow_up",
                label: "تحتاج متابعة",
              },
              {
                value: "cancelled",
                label: "ملغاة",
              },
            ]}
          />

          {requestedInstituteId ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <div className="mb-1 text-[11px] font-semibold text-gray-400">
                المعهد المحدد
              </div>
              <div className="font-semibold text-gray-900">
                {institutes.find(
                  (institute) =>
                    institute.id ===
                    requestedInstituteId
                )?.name || "المعهد المحدد"}
              </div>
            </div>
          ) : (
            <SelectField
              value={instituteFilter}
              onChange={setInstituteFilter}
              options={[
                {
                  value: "all",
                  label: "كل المعاهد",
                },
                ...institutes.map(
                  (institute) => ({
                    value: institute.id,
                    label: institute.name,
                  })
                ),
              ]}
            />
          )}

          <SelectField
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              {
                value: "all",
                label: "كل أنواع الزيارات",
              },
              ...visitTypes.map(
                (type) => ({
                  value: type,
                  label: type,
                })
              ),
            ]}
          />

        </div>

        <div className="mt-3 flex flex-wrap gap-2">

          {[
            {
              value: "all",
              label: "كل نتائج التفتيش",
            },
            {
              value: "violations",
              label: "بها مخالفات",
            },
            {
              value: "follow_up",
              label: "تحتاج متابعة",
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setResultFilter(
                  item.value as
                    | "all"
                    | "violations"
                    | "follow_up"
                )
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                resultFilter ===
                item.value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}

        </div>

      </div>

      {/* ===================================================
          VISITS TABLE
      =================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="flex flex-col gap-2 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="font-bold text-gray-900">
              سجل الزيارات
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {filteredVisits.length} زيارة
              معروضة من أصل {visits.length}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ClipboardCheck size={15} />
            التفتيش والتقييم مرتبطان
            بالزيارة
          </div>

        </div>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <RefreshCw
                size={20}
                className="animate-spin"
              />
              جاري تحميل الزيارات...
            </div>
          </div>
        ) : filteredVisits.length ===
          0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center p-6 text-center">

            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <ClipboardList
                size={28}
                className="text-gray-500"
              />
            </div>

            <h3 className="font-semibold text-gray-900">
              لا توجد زيارات مطابقة
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              جرّب تغيير خيارات البحث
              والتصفية.
            </p>

          </div>
        ) : (
          <>

            {/* DESKTOP */}

            <div className="hidden overflow-x-auto lg:block">

              <table className="w-full min-w-[1150px] text-right">

                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500">

                    <th className="px-5 py-4 font-semibold">
                      المعهد
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      الزائر
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      نوع الزيارة
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      التاريخ
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      التفتيش
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      الحالة
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      الإجراءات
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredVisits.map(
                    (visit) => {
                      const summary =
                        calculateInspectionSummary(
                          visit.inspectionResults
                        );

                      const StatusIcon =
                        statusConfig[
                          visit.status
                        ].icon;

                      return (
                        <tr
                          key={visit.id}
                          className="transition hover:bg-gray-50/70"
                        >

                          <td className="px-5 py-4">

                            <div className="font-semibold text-gray-900">
                              {
                                visit.institute
                              }
                            </div>

                            <div className="mt-1 text-xs text-gray-400">
                              {visit.code}
                            </div>

                          </td>

                          <td className="px-5 py-4 text-sm text-gray-700">
                            {visit.visitor}
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-700">
                            {visit.type}
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {formatDate(
                              visit.date
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <div className="min-w-[150px]">

                              <div className="mb-1 flex items-center justify-between">

                                <span className="font-bold text-gray-900">
                                  {
                                    summary.compliancePercentage
                                  }
                                  %
                                </span>

                                <span className="text-xs text-gray-400">
                                  {
                                    summary.inspected
                                  }{" "}
                                  /{" "}
                                  {
                                    inspectionItems.length
                                  }
                                </span>

                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">

                                <div
                                  className={`h-full rounded-full ${
                                    summary.compliancePercentage >=
                                    80
                                      ? "bg-emerald-500"
                                      : summary.compliancePercentage >=
                                        60
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${summary.compliancePercentage}%`,
                                  }}
                                />

                              </div>

                              <div className="mt-2 flex items-center gap-2 text-[11px]">

                                <span className="text-emerald-600">
                                  ✓{" "}
                                  {
                                    summary.compliant
                                  }
                                </span>

                                <span className="text-amber-600">
                                  ⚠{" "}
                                  {
                                    summary.needsImprovement
                                  }
                                </span>

                                <span className="text-red-600">
                                  ✕{" "}
                                  {
                                    summary.nonCompliant
                                  }
                                </span>

                              </div>

                            </div>

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

                            <div className="flex items-center gap-1.5">

                              <ActionButton
                                title="التفاصيل"
                                onClick={() =>
                                  openDetails(
                                    visit
                                  )
                                }
                              >
                                <Eye
                                  size={16}
                                />
                              </ActionButton>

                              <ActionButton
                                title="تعديل واستكمال"
                                onClick={() =>
                                  openEditVisitForm(
                                    visit
                                  )
                                }
                              >
                                <Pencil
                                  size={16}
                                />
                              </ActionButton>

                              <ActionButton
                                title="طباعة التقرير"
                                onClick={() =>
                                  printVisitReport(
                                    visit
                                  )
                                }
                              >
                                <Printer
                                  size={16}
                                />
                              </ActionButton>

                              {visit.status !==
                                "cancelled" && (
                                <ActionButton
                                  title="إلغاء الزيارة"
                                  danger
                                  onClick={() =>
                                    cancelVisit(
                                      visit
                                    )
                                  }
                                >
                                  <Ban
                                    size={16}
                                  />
                                </ActionButton>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* MOBILE */}

            <div className="divide-y divide-gray-100 lg:hidden">

              {filteredVisits.map(
                (visit) => {
                  const summary =
                    calculateInspectionSummary(
                      visit.inspectionResults
                    );

                  const StatusIcon =
                    statusConfig[
                      visit.status
                    ].icon;

                  return (
                    <div
                      key={visit.id}
                      className="p-5"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <h3 className="font-bold text-gray-900">
                            {
                              visit.institute
                            }
                          </h3>

                          <p className="mt-1 text-xs text-gray-400">
                            {visit.code}
                          </p>

                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusConfig[visit.status].className}`}
                        >
                          <StatusIcon
                            size={12}
                          />
                          {
                            statusConfig[
                              visit.status
                            ].label
                          }
                        </span>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

                        <DetailItem
                          label="الزائر"
                          value={
                            visit.visitor
                          }
                        />

                        <DetailItem
                          label="نوع الزيارة"
                          value={
                            visit.type
                          }
                        />

                        <DetailItem
                          label="التاريخ"
                          value={formatDate(
                            visit.date
                          )}
                        />

                        <DetailItem
                          label="التفتيش"
                          value={`${summary.inspected} / ${inspectionItems.length}`}
                        />

                      </div>

                      <div className="mt-4 rounded-xl bg-gray-50 p-3">

                        <div className="flex items-center justify-between">

                          <span className="text-xs text-gray-500">
                            نسبة الالتزام
                          </span>

                          <strong className="text-sm text-gray-900">
                            {
                              summary.compliancePercentage
                            }
                            %
                          </strong>

                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">

                          <div
                            className={`h-full rounded-full ${
                              summary.compliancePercentage >=
                              80
                                ? "bg-emerald-500"
                                : summary.compliancePercentage >=
                                  60
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${summary.compliancePercentage}%`,
                            }}
                          />

                        </div>

                        <div className="mt-2 flex gap-3 text-[11px]">

                          <span className="text-emerald-600">
                            ✓{" "}
                            {
                              summary.compliant
                            }
                          </span>

                          <span className="text-amber-600">
                            ⚠{" "}
                            {
                              summary.needsImprovement
                            }
                          </span>

                          <span className="text-red-600">
                            ✕{" "}
                            {
                              summary.nonCompliant
                            }
                          </span>

                        </div>

                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            openDetails(
                              visit
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700"
                        >
                          <Eye size={14} />
                          التفاصيل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditVisitForm(
                              visit
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700"
                        >
                          <Pencil
                            size={14}
                          />
                          استكمال
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            printVisitReport(
                              visit
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700"
                        >
                          <Printer
                            size={14}
                          />
                          التقرير
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

      {/* ===================================================
          INSPECTION FRAMEWORK
      =================================================== */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="mb-5">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-gray-100 p-2.5">
              <ClipboardCheck
                size={20}
                className="text-gray-700"
              />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                إطار التفتيش والمتابعة
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                ثمانية محاور رئيسية لتقييم
                حالة المعهد أثناء الزيارة
              </p>
            </div>

          </div>

        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {inspectionItems.map(
            (item, index) => (
              <div
                key={item}
                className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
              >

                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-500 shadow-sm">
                  {index + 1}
                </div>

                <p className="text-sm font-semibold leading-6 text-gray-800">
                  {item}
                </p>

              </div>
            )
          )}

        </div>

      </div>

      {/* ===================================================
          NEW / EDIT MODAL
      =================================================== */}

      {showForm && (
        <Modal
          title={
            editingVisit
              ? "تعديل واستكمال الزيارة"
              : "تسجيل زيارة جديدة"
          }
          onClose={() =>
            setShowForm(false)
          }
          size="xl"
        >

          <div className="space-y-6">

            {/* BASIC DATA */}

            <div>

              <h3 className="mb-4 text-sm font-bold text-gray-900">
                بيانات الزيارة
              </h3>

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="المعهد">
                  {requestedInstituteId ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                      {institutes.find(
                        (institute) =>
                          institute.id ===
                          requestedInstituteId
                      )?.name ||
                        "المعهد المحدد"}
                    </div>
                  ) : (
                    <SelectField
                      value={form.institute}
                      onChange={(value) =>
                        updateForm(
                          "institute",
                          value
                        )
                      }
                      options={[
                        {
                          value: "",
                          label:
                            "اختر المعهد",
                        },
                        ...institutes.map(
                          (institute) => ({
                            value:
                              institute.id,
                            label:
                              institute.name,
                          })
                        ),
                      ]}
                    />
                  )}
                </FormField>

                <FormField label="الزائر">
                  <input
                    value={
                      form.visitor
                    }
                    onChange={(event) =>
                      updateForm(
                        "visitor",
                        event.target
                          .value
                      )
                    }
                    placeholder="اسم الزائر أو لجنة التفتيش"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </FormField>

                <FormField label="نوع الزيارة">
                  <SelectField
                    value={form.type}
                    onChange={(value) =>
                      updateForm(
                        "type",
                        value
                      )
                    }
                    options={[
                      {
                        value:
                          "زيارة متابعة دورية",
                        label:
                          "زيارة متابعة دورية",
                      },
                      {
                        value:
                          "زيارة مفاجئة",
                        label:
                          "زيارة مفاجئة",
                      },
                      {
                        value:
                          "زيارة تقييم",
                        label:
                          "زيارة تقييم",
                      },
                      {
                        value:
                          "زيارة متابعة",
                        label:
                          "زيارة متابعة",
                      },
                      {
                        value:
                          "زيارة تفتيش",
                        label:
                          "زيارة تفتيش",
                      },
                    ]}
                  />
                </FormField>

                <FormField label="تاريخ الزيارة">
                  <div className="relative">

                    <CalendarDays
                      size={17}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) =>
                        updateForm(
                          "date",
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pr-10 pl-4 text-sm outline-none focus:border-gray-400"
                    />

                  </div>
                </FormField>

              </div>

            </div>

            {/* INSPECTION */}

            <div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h3 className="text-sm font-bold text-gray-900">
                    نتائج التفتيش
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    اختر نتيجة كل محور تم
                    فحصه، ويمكن إضافة ملاحظة
                    لكل محور.
                  </p>

                </div>

                <InspectionSummary
                  results={inspection}
                />

              </div>

              <div className="space-y-3">

                {inspectionItems.map(
                  (item, index) => {
                    const current =
                      inspection[item];

                    return (
                      <div
                        key={item}
                        className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4"
                      >

                        <div className="flex flex-col gap-4">

                          <div className="flex items-start gap-3">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-500 shadow-sm">
                              {index + 1}
                            </div>

                            <div className="flex-1">

                              <div className="font-semibold text-gray-800">
                                {item}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">

                                {(
                                  Object.keys(
                                    inspectionStatusConfig
                                  ) as InspectionStatus[]
                                ).map(
                                  (
                                    status
                                  ) => {
                                    const config =
                                      inspectionStatusConfig[
                                        status
                                      ];

                                    const Icon =
                                      config.icon;

                                    const active =
                                      current?.status ===
                                      status;

                                    return (
                                      <button
                                        key={
                                          status
                                        }
                                        type="button"
                                        onClick={() =>
                                          setInspectionStatus(
                                            item,
                                            status
                                          )
                                        }
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                          active
                                            ? config.className
                                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                        }`}
                                      >
                                        <Icon
                                          size={
                                            14
                                          }
                                        />
                                        {
                                          config.label
                                        }
                                      </button>
                                    );
                                  }
                                )}

                                {current && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      clearInspectionItem(
                                        item
                                      )
                                    }
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400 hover:text-red-600"
                                  >
                                    مسح
                                  </button>
                                )}

                              </div>

                            </div>

                          </div>

                          {current && (
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
                              placeholder="ملاحظة على هذا المحور..."
                              rows={2}
                              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                            />
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            {/* FOLLOW UP TASKS */}

            <div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h3 className="text-sm font-bold text-gray-900">
                    مهام المتابعة
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    المهام التي يجب تنفيذها بعد
                    الزيارة.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    generateTasksFromInspection
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ListChecks
                    size={15}
                  />
                  إنشاء من نتائج التفتيش
                </button>

              </div>

              <div className="flex gap-2">

                <input
                  value={taskInput}
                  onChange={(event) =>
                    setTaskInput(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();
                      addTask();
                    }
                  }}
                  placeholder="اكتب مهمة متابعة..."
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />

                <button
                  type="button"
                  onClick={addTask}
                  className="rounded-xl bg-gray-900 px-4 text-white hover:bg-gray-800"
                >
                  <Plus size={18} />
                </button>

              </div>

              {followUpTasks.length >
                0 && (
                <div className="mt-3 space-y-2">

                  {followUpTasks.map(
                    (task, index) => (
                      <div
                        key={`${task}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500">
                          {index + 1}
                        </div>

                        <div className="flex-1 text-sm text-gray-700">
                          {task}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeTask(
                              index
                            )
                          }
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2
                            size={15}
                          />
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* NOTES */}

            <div>

              <h3 className="mb-3 text-sm font-bold text-gray-900">
                ملاحظات الزيارة
              </h3>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateForm(
                    "notes",
                    event.target.value
                  )
                }
                rows={4}
                placeholder="اكتب الملاحظات العامة والتوصيات..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
              />

            </div>

            {/* AUTO STATUS */}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

              <div className="flex items-start gap-3">

                <ClipboardCheck
                  size={20}
                  className="mt-0.5 text-blue-600"
                />

                <div>

                  <div className="font-bold text-blue-900">
                    الحالة تُحسب تلقائيًا
                  </div>

                  <p className="mt-1 text-xs leading-6 text-blue-700">
                    إذا تم فحص المحاور الثمانية
                    بالكامل ولا توجد مخالفات أو
                    توصيات، تصبح الزيارة
                    <strong>
                      {" "}
                      مكتملة
                    </strong>
                    . إذا وُجدت مخالفة أو بند
                    يحتاج تحسين تصبح
                    <strong>
                      {" "}
                      تحتاج متابعة
                    </strong>
                    . وإذا لم يكتمل التفتيش تبقى
                    <strong>
                      {" "}
                      مجدولة
                    </strong>
                    .
                  </p>

                </div>

              </div>

            </div>

            {/* BUTTONS */}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={saveVisit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <CheckCircle2
                  size={17}
                />

                {editingVisit
                  ? "حفظ التعديلات"
                  : "تسجيل الزيارة"}
              </button>

            </div>

          </div>

        </Modal>
      )}

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      {showDetails &&
        selectedVisit && (
          <Modal
            title="تفاصيل الزيارة ونتائج التفتيش"
            onClose={() =>
              setShowDetails(false)
            }
            size="xl"
          >

            {(() => {
              const summary =
                calculateInspectionSummary(
                  selectedVisit.inspectionResults
                );

              const StatusIcon =
                statusConfig[
                  selectedVisit.status
                ].icon;

              return (
                <div className="space-y-6">

                  {/* HEADER */}

                  <div className="rounded-2xl bg-gray-50 p-5">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div>

                        <h2 className="text-xl font-bold text-gray-900">
                          {
                            selectedVisit.institute
                          }
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {
                            selectedVisit.code
                          }
                        </p>

                      </div>

                      <span
                        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${statusConfig[selectedVisit.status].className}`}
                      >
                        <StatusIcon
                          size={15}
                        />

                        {
                          statusConfig[
                            selectedVisit
                              .status
                          ].label
                        }
                      </span>

                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

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
                        label="التاريخ"
                        value={formatDate(
                          selectedVisit.date
                        )}
                      />

                      <DetailItem
                        label="نسبة الفحص"
                        value={`${summary.inspected} / ${inspectionItems.length}`}
                      />

                    </div>

                  </div>

                  {/* SCORE */}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                    <MiniStat
                      label="نسبة الالتزام"
                      value={`${summary.compliancePercentage}%`}
                      className="bg-indigo-50 text-indigo-700"
                    />

                    <MiniStat
                      label="مطابق"
                      value={
                        summary.compliant
                      }
                      className="bg-emerald-50 text-emerald-700"
                    />

                    <MiniStat
                      label="يحتاج تحسين"
                      value={
                        summary.needsImprovement
                      }
                      className="bg-amber-50 text-amber-700"
                    />

                    <MiniStat
                      label="مخالفات"
                      value={
                        summary.nonCompliant
                      }
                      className="bg-red-50 text-red-700"
                    />

                    <MiniStat
                      label="مهام المتابعة"
                      value={
                        selectedVisit
                          .followUpTasks
                          .length
                      }
                      className="bg-purple-50 text-purple-700"
                    />

                  </div>

                  {/* PROGRESS */}

                  <div className="rounded-2xl border border-gray-200 p-5">

                    <div className="flex items-center justify-between">

                      <div>
                        <h3 className="font-bold text-gray-900">
                          مستوى الالتزام
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          محسوب من البنود التي تم
                          فحصها فعليًا.
                        </p>
                      </div>

                      <strong className="text-2xl font-bold text-gray-900">
                        {
                          summary.compliancePercentage
                        }
                        %
                      </strong>

                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">

                      <div
                        className={`h-full rounded-full ${
                          summary.compliancePercentage >=
                          80
                            ? "bg-emerald-500"
                            : summary.compliancePercentage >=
                              60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${summary.compliancePercentage}%`,
                        }}
                      />

                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      تم فحص{" "}
                      <strong>
                        {
                          summary.inspected
                        }
                      </strong>{" "}
                      من أصل{" "}
                      <strong>
                        {
                          inspectionItems.length
                        }
                      </strong>{" "}
                      محاور.
                    </div>

                  </div>

                  {/* INSPECTION DETAILS */}

                  <div>

                    <h3 className="mb-4 font-bold text-gray-900">
                      نتائج محاور التفتيش
                    </h3>

                    <div className="grid gap-3 md:grid-cols-2">

                      {inspectionItems.map(
                        (item, index) => {
                          const result =
                            selectedVisit
                              .inspectionResults[
                              item
                            ];

                          return (
                            <div
                              key={item}
                              className="rounded-2xl border border-gray-200 p-4"
                            >

                              <div className="flex items-start gap-3">

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                                  {index + 1}
                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="font-semibold text-gray-800">
                                    {item}
                                  </div>

                                  <div className="mt-2">

                                    {result ? (
                                      <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${inspectionStatusConfig[result.status].className}`}
                                      >
                                        {(() => {
                                          const Icon =
                                            inspectionStatusConfig[
                                              result
                                                .status
                                            ]
                                              .icon;

                                          return (
                                            <Icon
                                              size={
                                                13
                                              }
                                            />
                                          );
                                        })()}

                                        {
                                          inspectionStatusConfig[
                                            result
                                              .status
                                          ]
                                            .label
                                        }
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500">
                                        لم يتم الفحص
                                      </span>
                                    )}

                                  </div>

                                  {result?.note && (
                                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-6 text-gray-600">
                                      {
                                        result.note
                                      }
                                    </div>
                                  )}

                                </div>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>

                  {/* TASKS */}

                  <div>

                    <h3 className="mb-3 font-bold text-gray-900">
                      مهام المتابعة
                    </h3>

                    {selectedVisit
                      .followUpTasks
                      .length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                        لا توجد مهام متابعة
                        مسجلة لهذه الزيارة.
                      </div>
                    ) : (
                      <div className="space-y-2">

                        {selectedVisit.followUpTasks.map(
                          (
                            task,
                            index
                          ) => (
                            <div
                              key={`${task}-${index}`}
                              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                            >

                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500">
                                {index +
                                  1}
                              </div>

                              <div className="text-sm text-gray-700">
                                {task}
                              </div>

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </div>

                  {/* NOTES */}

                  <div>

                    <h3 className="mb-3 font-bold text-gray-900">
                      ملاحظات الزيارة
                    </h3>

                    <div className="min-h-20 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                      {selectedVisit.notes ||
                        "لا توجد ملاحظات مسجلة."}
                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-col gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">

                    <button
                      type="button"
                      onClick={() =>
                        printVisitReport(
                          selectedVisit
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Printer
                        size={17}
                      />
                      طباعة التقرير
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEditVisitForm(
                          selectedVisit
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      <Pencil
                        size={17}
                      />
                      تعديل واستكمال
                    </button>

                    {selectedVisit.status !==
                      "cancelled" && (
                      <button
                        type="button"
                        onClick={() =>
                          cancelVisit(
                            selectedVisit
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        <Ban
                          size={17}
                        />
                        إلغاء الزيارة
                      </button>
                    )}

                  </div>

                </div>
              );
            })()}

          </Modal>
        )}

    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  icon: typeof CheckCircle2;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-2">

        <div>

          <div className="text-xs text-gray-500">
            {title}
          </div>

          <div className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </div>

        </div>

        <div
          className={`rounded-xl p-2.5 ${iconClass}`}
        >
          <Icon size={18} />
        </div>

      </div>

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
    <div className="rounded-xl border border-gray-100 bg-white p-3">

      <div className="text-[11px] text-gray-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-gray-800">
        {value}
      </div>

    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
    >
      <div className="text-xs opacity-75">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>
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
    <div>
      <label className="mb-2 block text-xs font-semibold text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="relative">

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pl-10 text-sm outline-none focus:border-gray-400"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />

    </div>
  );
}

function ActionButton({
  children,
  title,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg border p-2 transition ${
        danger
          ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function InspectionSummary({
  results,
}: {
  results: InspectionResults;
}) {
  const summary =
    calculateInspectionSummary(
      results
    );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">

      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600">
        الفحص{" "}
        <strong>
          {summary.inspected}/
          {inspectionItems.length}
        </strong>
      </span>

      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
        ✓ {summary.compliant}
      </span>

      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
        ⚠ {summary.needsImprovement}
      </span>

      <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700">
        ✕ {summary.nonCompliant}
      </span>

    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  size = "lg",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "lg" | "xl";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">

      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          size === "xl"
            ? "max-w-5xl"
            : "max-w-3xl"
        }`}
      >

        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">

          <h2 className="font-bold text-gray-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>

        </div>

        <div className="overflow-y-auto p-5">
          {children}
        </div>

      </div>

    </div>
  );
}
