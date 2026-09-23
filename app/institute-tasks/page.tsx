"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code?: string | null;
  directorate_id?: string | null;
};

type Profile = {
  id: string;
  role: string;
  full_name?: string | null;
  institute_id?: string | null;
  directorate_id?: string | null;
};

type TaskSubmission = {
  id: string;
  task_id: string;
  target_id: string;
  institute_id: string;
  submitted_by: string;
  submission_no: number;
  notes?: string | null;
  status: "submitted" | "returned" | "approved";
  director_note?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TaskAttachment = {
  id: string;
  submission_id: string;
  file_name: string;
  storage_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

type TaskSubmissionView = TaskSubmission & {
  attachments: TaskAttachment[];
};

type TaskTarget = {
  id: string;
  task_id: string;
  institute_id: string;
  status: "pending" | "in_progress" | "submitted" | "completed" | "late";
  response?: string | null;
  responded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  institute_name?: string;
  latest_submission?: TaskSubmissionView | null;
};

type Task = {
  id: string;
  assignment_group_id?: string | null;
  directorate_id?: string | null;
  institute_id?: string | null;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  assigned_to?: string | null;
  due_date?: string | null;
  response?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TaskView = Task & {
  targets: TaskTarget[];
};

const priorityOptions = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
] as const;

const statusOptions = [
  { value: "pending", label: "جديد" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "submitted", label: "تم التسليم" },
  { value: "completed", label: "مكتمل" },
] as const;

const HIDDEN_STORAGE_KEY = "azhar_institute_tasks_hidden_v2";

function getPriorityLabel(priority?: string | null) {
  return priorityOptions.find((item) => item.value === priority)?.label ?? "متوسطة";
}

function getStatusLabel(status?: string | null) {
  return statusOptions.find((item) => item.value === status)?.label ?? "جديد";
}

function getPriorityClass(priority?: string | null) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "low":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

function getStatusClass(status?: string | null) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "submitted":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "in_progress":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "late":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-sky-100 text-sky-700 border-sky-200";
  }
}

function getOverallTaskStatus(targets: TaskTarget[]) {
  if (!targets.length) return "pending";

  if (targets.every((target) => target.status === "completed")) {
    return "completed";
  }

  if (targets.some((target) => target.status === "submitted")) {
    return "submitted";
  }

  if (targets.some((target) => target.status === "in_progress")) {
    return "in_progress";
  }

  return "pending";
}

function getTargetCounts(targets: TaskTarget[]) {
  return {
    pending: targets.filter((target) => target.status === "pending").length,
    inProgress: targets.filter((target) => target.status === "in_progress").length,
    submitted: targets.filter((target) => target.status === "submitted").length,
    completed: targets.filter((target) => target.status === "completed").length,
    late: targets.filter((target) => target.status === "late").length,
  };
}

function isTargetOverdue(target: TaskTarget, dueDate?: string | null) {
  if (!dueDate || target.status === "completed") return false;

  const due = new Date(`${dueDate}T23:59:59`);
  return due.getTime() < Date.now();
}

function formatDate(date?: string | null) {
  if (!date) return "غير محدد";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "غير محدد";

  return value.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCreatedDate(date?: string | null) {
  if (!date) return "غير محدد";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "غير محدد";

  return value.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function createGroupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function InstituteTasksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [tasks, setTasks] = useState<TaskView[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);

  const [updatingTargetId, setUpdatingTargetId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const [submissionTarget, setSubmissionTarget] = useState<TaskTarget | null>(null);
  const [submissionTask, setSubmissionTask] = useState<TaskView | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [reviewSubmission, setReviewSubmission] = useState<TaskSubmissionView | null>(null);
  const [reviewTask, setReviewTask] = useState<TaskView | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const [hiddenTaskIds, setHiddenTaskIds] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [instituteFilter, setInstituteFilter] = useState("all");
  const [selectedInstituteStatusId, setSelectedInstituteStatusId] = useState<string | null>(null);

  const [targetMode, setTargetMode] = useState<"all" | "selected" | "single">("single");
  const [selectedInstitutes, setSelectedInstitutes] = useState<string[]>([]);

  const [form, setForm] = useState({
    institute_id: "",
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    due_date: "",
  });

  const isDirector =
    profile?.role === "director" || profile?.role === "super_admin";

  const isInstituteUser =
    profile?.role === "sheikh" ||
    profile?.role === "deputy" ||
    profile?.role === "employee";

  const visibleTasks = useMemo(() => {
    if (showArchivedTasks) return tasks;

    const hidden = new Set(hiddenTaskIds);
    return tasks.filter((task) => !hidden.has(task.id));
  }, [tasks, hiddenTaskIds, showArchivedTasks]);

  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return visibleTasks.filter((task) => {
      const overallStatus = getOverallTaskStatus(task.targets);

      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description ?? "").toLowerCase().includes(query) ||
        task.targets.some((target) =>
          (target.institute_name ?? "").toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "all" || overallStatus === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      const matchesInstitute =
        instituteFilter === "all" ||
        task.targets.some((target) => target.institute_id === instituteFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesInstitute
      );
    });
  }, [
    visibleTasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    instituteFilter,
  ]);

  const statistics = useMemo(() => {
    const total = visibleTasks.length;

    const pending = visibleTasks.filter(
      (task) => getOverallTaskStatus(task.targets) === "pending"
    ).length;

    const inProgress = visibleTasks.filter(
      (task) => getOverallTaskStatus(task.targets) === "in_progress"
    ).length;

    const submitted = visibleTasks.filter(
      (task) => getOverallTaskStatus(task.targets) === "submitted"
    ).length;

    const completed = visibleTasks.filter(
      (task) => getOverallTaskStatus(task.targets) === "completed"
    ).length;

    const urgent = visibleTasks.filter(
      (task) =>
        task.priority === "urgent" &&
        getOverallTaskStatus(task.targets) !== "completed"
    ).length;

    const overdue = visibleTasks.filter(
      (task) =>
        task.targets.some((target) =>
          isTargetOverdue(target, task.due_date)
        ) &&
        getOverallTaskStatus(task.targets) !== "completed"
    ).length;

    return {
      total,
      pending,
      inProgress,
      submitted,
      urgent,
      overdue,
      completed,
    };
  }, [visibleTasks]);

  const directorAttentionTasks = useMemo(() => {
    if (!isDirector) return [];
    return visibleTasks.filter((task) => {
      const overall = getOverallTaskStatus(task.targets);
      if (overall === "completed") return false;
      return task.priority === "urgent" || task.targets.some((target) => isTargetOverdue(target, task.due_date));
    });
  }, [visibleTasks, isDirector]);

  const directorReviewCount = useMemo(() => {
    if (!isDirector) return 0;
    return visibleTasks.reduce((count, task) => count + task.targets.filter((target) => target.status === "submitted" && target.latest_submission?.status === "submitted").length, 0);
  }, [visibleTasks, isDirector]);

  const directorFollowUpTasks = useMemo(() => {
    if (!isDirector) return [];
    return visibleTasks.filter((task) => {
      const overall = getOverallTaskStatus(task.targets);
      if (overall === "completed") return false;
      const needsAttention = task.priority === "urgent" || task.targets.some((target) => isTargetOverdue(target, task.due_date));
      if (needsAttention) return false;
      return task.targets.some((target) => target.status === "pending" || target.status === "in_progress");
    });
  }, [visibleTasks, isDirector]);

  const directorUpcomingTasks = useMemo(() => {
    if (!isDirector) return [];

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    return visibleTasks
      .filter((task) => {
        const overall = getOverallTaskStatus(task.targets);
        if (overall === "completed" || !task.due_date) return false;

        const due = new Date(`${task.due_date}T23:59:59`);
        if (Number.isNaN(due.getTime())) return false;

        const overdue = task.targets.some((target) =>
          isTargetOverdue(target, task.due_date)
        );

        return !overdue && due >= now && due <= end;
      })
      .sort((a, b) => {
        const da = a.due_date ? new Date(`${a.due_date}T23:59:59`).getTime() : Infinity;
        const db = b.due_date ? new Date(`${b.due_date}T23:59:59`).getTime() : Infinity;
        return da - db;
      });
  }, [visibleTasks, isDirector]);

  const directorInstituteStatus = useMemo(() => {
    if (!isDirector) return [];

    return institutes.map((institute) => {
      const instituteTargets = visibleTasks.flatMap((task) =>
        task.targets.filter((target) => target.institute_id === institute.id)
      );

      const completed = instituteTargets.filter(
        (target) => target.status === "completed"
      ).length;

      const inProgress = instituteTargets.filter(
        (target) => target.status === "in_progress"
      ).length;

      const overdue = instituteTargets.filter((target) =>
        isTargetOverdue(
          target,
          visibleTasks.find((task) => task.id === target.task_id)?.due_date
        )
      ).length;

      const reportsWaiting = instituteTargets.filter(
        (target) =>
          target.status === "submitted" &&
          target.latest_submission?.status === "submitted"
      ).length;

      return {
        ...institute,
        total: instituteTargets.length,
        completed,
        inProgress,
        overdue,
        reportsWaiting,
      };
    });
  }, [institutes, visibleTasks, isDirector]);

  const selectedInstituteStatus = useMemo(() => {
    if (!isDirector || !selectedInstituteStatusId) return null;
    return directorInstituteStatus.find((institute) => institute.id === selectedInstituteStatusId) ?? null;
  }, [directorInstituteStatus, selectedInstituteStatusId, isDirector]);

  const selectedInstituteTasks = useMemo(() => {
    if (!selectedInstituteStatusId) return [];
    return visibleTasks
      .map((task) => ({
        task,
        target: task.targets.find((target) => target.institute_id === selectedInstituteStatusId),
      }))
      .filter((item) => Boolean(item.target));
  }, [visibleTasks, selectedInstituteStatusId]);

  function getStoredHiddenIds() {
    if (typeof window === "undefined") return [];

    try {
      const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  function saveHiddenIds(ids: string[]) {
    if (typeof window === "undefined") return;

    const unique = Array.from(new Set(ids));
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(unique));
    setHiddenTaskIds(unique);
  }

  async function loadData(showSpinner = true) {
    if (showSpinner) setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        setProfile(null);
        setTasks([]);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, full_name, institute_id, directorate_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setProfile(null);
        setTasks([]);
        return;
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      const director =
        currentProfile.role === "director" ||
        currentProfile.role === "super_admin";

      let instituteQuery = supabase
        .from("institutes")
        .select("id, name, code, directorate_id")
        .order("name");

      if (director) {
        if (currentProfile.directorate_id) {
          instituteQuery = instituteQuery.eq(
            "directorate_id",
            currentProfile.directorate_id
          );
        }
      } else if (currentProfile.institute_id) {
        instituteQuery = instituteQuery.eq("id", currentProfile.institute_id);
      } else {
        instituteQuery = instituteQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }

      const { data: instituteData, error: instituteError } =
        await instituteQuery;

      if (instituteError) throw instituteError;

      const instituteList = (instituteData ?? []) as Institute[];
      setInstitutes(instituteList);

      const instituteIds = instituteList.map((institute) => institute.id);

      const targetSelect =
        "id, task_id, institute_id, status, response, responded_at, created_at, updated_at";

      let targetData: any[] | null = null;
      let targetError: any = null;

      if (!director) {
        if (!currentProfile.institute_id) {
          setTasks([]);
          return;
        }

        const result = await supabase
          .from("institute_task_targets")
          .select(targetSelect)
          .eq("institute_id", currentProfile.institute_id)
          .order("created_at", { ascending: true });

        targetData = result.data;
        targetError = result.error;
      } else if (instituteIds.length) {
        const result = await supabase
          .from("institute_task_targets")
          .select(targetSelect)
          .in("institute_id", instituteIds)
          .order("created_at", { ascending: true });

        targetData = result.data;
        targetError = result.error;
      } else {
        const result = await supabase
          .from("institute_task_targets")
          .select(targetSelect)
          .order("created_at", { ascending: true });

        targetData = result.data;
        targetError = result.error;
      }

      if (targetError) throw targetError;

      const rawTargets = (targetData ?? []) as TaskTarget[];

      const taskIds = Array.from(
        new Set(rawTargets.map((target) => target.task_id))
      );

      let taskData: Task[] = [];

      if (director) {
        let taskQuery = supabase
          .from("institute_tasks")
          .select(
            "id, assignment_group_id, directorate_id, institute_id, title, description, priority, status, assigned_to, due_date, response, created_by, created_at, updated_at"
          )
          .order("created_at", { ascending: false });

        if (currentProfile.directorate_id) {
          taskQuery = taskQuery.eq(
            "directorate_id",
            currentProfile.directorate_id
          );
        }

        const { data, error } = await taskQuery;
        if (error) throw error;

        taskData = (data ?? []) as Task[];
      } else if (taskIds.length) {
        const { data, error } = await supabase
          .from("institute_tasks")
          .select(
            "id, assignment_group_id, directorate_id, institute_id, title, description, priority, status, assigned_to, due_date, response, created_by, created_at, updated_at"
          )
          .in("id", taskIds)
          .order("created_at", { ascending: false });

        if (error) throw error;

        taskData = (data ?? []) as Task[];
      }

      const missingTargetTaskIds = taskData
        .filter((task) => !rawTargets.some((target) => target.task_id === task.id))
        .map((task) => task.id);

      let extraTargets: TaskTarget[] = [];

      if (director && missingTargetTaskIds.length) {
        const { data, error } = await supabase
          .from("institute_task_targets")
          .select(
            "id, task_id, institute_id, status, response, responded_at, created_at, updated_at"
          )
          .in("task_id", missingTargetTaskIds)
          .order("created_at", { ascending: true });

        if (error) throw error;

        extraTargets = (data ?? []) as TaskTarget[];
      }

      const allTargets = [...rawTargets, ...extraTargets];

      const targetIds = allTargets
        .filter((target) => !target.id.startsWith("legacy-"))
        .map((target) => target.id);

      let submissionData: TaskSubmission[] = [];
      let attachmentData: TaskAttachment[] = [];

      if (targetIds.length) {
        const { data: submissions, error: submissionsError } = await supabase
          .from("institute_task_submissions")
          .select(
            "id, task_id, target_id, institute_id, submitted_by, submission_no, notes, status, director_note, submitted_at, reviewed_at, reviewed_by, created_at, updated_at"
          )
          .in("target_id", targetIds)
          .order("submission_no", { ascending: false });

        if (submissionsError) throw submissionsError;
        submissionData = (submissions ?? []) as TaskSubmission[];

        const submissionIds = submissionData.map((item) => item.id);
        if (submissionIds.length) {
          const { data: attachments, error: attachmentsError } = await supabase
            .from("institute_task_submission_attachments")
            .select(
              "id, submission_id, file_name, storage_path, mime_type, file_size, created_at"
            )
            .in("submission_id", submissionIds)
            .order("created_at", { ascending: true });

          if (attachmentsError) throw attachmentsError;
          attachmentData = (attachments ?? []) as TaskAttachment[];
        }
      }

      const latestByTarget = new Map<string, TaskSubmissionView>();
      for (const submission of submissionData) {
        if (!latestByTarget.has(submission.target_id)) {
          latestByTarget.set(submission.target_id, {
            ...submission,
            attachments: attachmentData.filter(
              (attachment) => attachment.submission_id === submission.id
            ),
          });
        }
      }

      const targetsWithSubmissions = allTargets.map((target) => ({
        ...target,
        latest_submission: latestByTarget.get(target.id) ?? null,
      }));

      const instituteMap = new Map(
        instituteList.map((institute) => [institute.id, institute.name])
      );

      const targetsWithNames = targetsWithSubmissions.map((target) => ({
        ...target,
        institute_name:
          instituteMap.get(target.institute_id) ?? "معهد غير معروف",
      }));

      const grouped = new Map<string, TaskView>();

      for (const task of taskData) {
        const groupKey = task.assignment_group_id || task.id;
        const taskTargets = targetsWithNames.filter(
          (target) => target.task_id === task.id
        );

        const existing = grouped.get(groupKey);

        if (existing) {
          existing.targets = [
            ...existing.targets,
            ...taskTargets.filter(
              (newTarget) =>
                !existing.targets.some(
                  (oldTarget) => oldTarget.id === newTarget.id
                )
            ),
          ];
        } else {
          grouped.set(groupKey, {
            ...task,
            targets: taskTargets,
          });
        }
      }

      for (const task of taskData) {
        const groupKey = task.assignment_group_id || task.id;
        const group = grouped.get(groupKey);

        if (group && group.targets.length === 0 && task.institute_id) {
          group.targets = [
            {
              id: `legacy-${task.id}`,
              task_id: task.id,
              institute_id: task.institute_id,
              status:
                task.status === "completed"
                  ? "completed"
                  : task.status === "submitted"
                    ? "submitted"
                    : task.status === "in_progress"
                      ? "in_progress"
                      : "pending",
              response: task.response,
              institute_name:
                instituteMap.get(task.institute_id) ?? "معهد غير معروف",
            },
          ];
        }
      }

      setTasks(Array.from(grouped.values()));

      const currentHidden = getStoredHiddenIds();
      const currentTaskIds = Array.from(grouped.values()).map((task) => task.id);

      if (typeof window !== "undefined") {
        const keyExists = localStorage.getItem(HIDDEN_STORAGE_KEY) !== null;

        if (!keyExists) {
          saveHiddenIds(currentTaskIds);
          setShowArchivedTasks(false);
        } else {
          const cleaned = currentHidden.filter((id) =>
            currentTaskIds.includes(id)
          );
          saveHiddenIds(cleaned);
        }
      }
    } catch (error: any) {
      console.error("loadData error:", error);
      alert(error?.message ?? "حدث خطأ أثناء تحميل التكليفات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm({
      institute_id: "",
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
    });
    setSelectedInstitutes([]);
    setTargetMode("single");
  }

  function toggleInstituteSelection(id: string) {
    setSelectedInstitutes((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function getSelectedTargetInstitutes() {
    if (targetMode === "all") {
      return institutes.map((institute) => institute.id);
    }

    if (targetMode === "selected") {
      return selectedInstitutes;
    }

    return form.institute_id ? [form.institute_id] : [];
  }

  async function createTask() {
    if (!profile) {
      alert("لم يتم العثور على بيانات المستخدم");
      return;
    }

    if (!isDirector) {
      alert("إنشاء التكليفات متاح لمدير الإدارة فقط");
      return;
    }

    if (!form.title.trim()) {
      alert("اكتب عنوان التكليف");
      return;
    }

    const targetInstitutes = getSelectedTargetInstitutes();

    if (!targetInstitutes.length) {
      alert("اختر معهدًا واحدًا على الأقل");
      return;
    }

    setSaving(true);

    try {
      const assignmentGroupId = createGroupId();

      const { data: createdTask, error: taskError } = await supabase
        .from("institute_tasks")
        .insert({
          assignment_group_id: assignmentGroupId,
          directorate_id: profile.directorate_id,
          institute_id: null,
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          status: "pending",
          due_date: form.due_date || null,
          created_by: profile.id,
        })
        .select(
          "id, assignment_group_id, directorate_id, institute_id, title, description, priority, status, assigned_to, due_date, response, created_by, created_at, updated_at"
        )
        .single();

      if (taskError) throw taskError;
      if (!createdTask) throw new Error("تعذر إنشاء التكليف");

      const targetRows = targetInstitutes.map((instituteId) => ({
        task_id: createdTask.id,
        institute_id: instituteId,
        status: "pending",
      }));

      const { error: targetError } = await supabase
        .from("institute_task_targets")
        .insert(targetRows);

      if (targetError) {
        await supabase.from("institute_tasks").delete().eq("id", createdTask.id);
        throw targetError;
      }

      alert(
        `تم إنشاء تكليف واحد بنجاح وإرساله إلى ${targetInstitutes.length} معهد`
      );

      resetForm();
      setShowForm(false);
      await loadData(false);
    } catch (error: any) {
      console.error("createTask error:", error);
      alert(error?.message ?? "حدث خطأ أثناء إنشاء التكليف");
    } finally {
      setSaving(false);
    }
  }

  function hideTask(taskId: string) {
    const next = [...hiddenTaskIds, taskId];
    saveHiddenIds(next);
    setExpandedTaskId((current) => (current === taskId ? null : current));
  }

  function restoreTask(taskId: string) {
    saveHiddenIds(hiddenTaskIds.filter((id) => id !== taskId));
  }

  async function deleteTask(task: TaskView) {
    if (!isDirector) return;

    const confirmed = window.confirm(
      "سيتم إخفاء هذا التكليف من الصفحة فقط، ولن يتم حذفه من قاعدة البيانات. هل تريد المتابعة؟"
    );

    if (!confirmed) return;

    setDeletingTaskId(task.id);

    try {
      hideTask(task.id);
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function deleteAllTasks() {
    if (!isDirector || !visibleTasks.length) return;

    const confirmed = window.confirm(
      "سيتم إخفاء التكليفات الحالية من الصفحة فقط، ولن يتم حذف أي بيانات من قاعدة البيانات. هل تريد المتابعة؟"
    );

    if (!confirmed) return;

    setDeletingAll(true);

    try {
      const ids = visibleTasks.map((task) => task.id);
      saveHiddenIds([...hiddenTaskIds, ...ids]);
      setExpandedTaskId(null);
      alert("تم تنظيف عرض الصفحة فقط. بيانات التكليفات ما زالت محفوظة في قاعدة البيانات.");
    } finally {
      setDeletingAll(false);
    }
  }

  async function updateTargetStatus(
    task: TaskView,
    target: TaskTarget,
    status: TaskTarget["status"]
  ) {
    if (target.id.startsWith("legacy-")) {
      alert("هذا تكليف قديم لا يحتوي على سجل متابعة للمعهد.");
      return;
    }

    if (!isDirector && !isInstituteUser) return;

    if (
      isInstituteUser &&
      profile?.institute_id !== target.institute_id
    ) {
      return;
    }

    if (isDirector && status !== "completed") {
      return;
    }

    setUpdatingTargetId(target.id);

    try {
      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "submitted") {
        updatePayload.responded_at = new Date().toISOString();
      }

      if (status === "completed") {
        updatePayload.responded_at =
          target.responded_at ?? new Date().toISOString();
      }

      const { error: targetError } = await supabase
        .from("institute_task_targets")
        .update(updatePayload)
        .eq("id", target.id);

      if (targetError) throw targetError;

      const updatedTargets = task.targets.map((item) =>
        item.id === target.id
          ? {
              ...item,
              status,
              responded_at:
                updatePayload.responded_at ?? item.responded_at,
              updated_at: updatePayload.updated_at,
            }
          : item
      );

      const overallStatus = getOverallTaskStatus(updatedTargets);

      const { error: taskError } = await supabase
        .from("institute_tasks")
        .update({
          status: overallStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: overallStatus,
                targets: updatedTargets,
              }
            : item
        )
      );
    } catch (error: any) {
      console.error("updateTargetStatus error:", error);
      alert(error?.message ?? "حدث خطأ أثناء تحديث حالة التكليف");
    } finally {
      setUpdatingTargetId(null);
    }
  }

  function openSubmissionForm(task: TaskView, target: TaskTarget) {
    if (!isInstituteUser || profile?.institute_id !== target.institute_id) return;
    setSubmissionTask(task);
    setSubmissionTarget(target);
    setSubmissionNotes("");
    setSubmissionFile(null);
  }

  function closeSubmissionForm() {
    if (submissionSaving) return;
    setSubmissionTask(null);
    setSubmissionTarget(null);
    setSubmissionNotes("");
    setSubmissionFile(null);
  }

  function formatReportFileSize(size?: number | null) {
    if (!size) return "";
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function safeReportFileName(fileName: string) {
    return fileName
      .replace(/[^\w\u0600-\u06FF.\- ]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 180);
  }

  async function submitInstituteReport() {
    if (!profile || !submissionTask || !submissionTarget || !submissionFile) {
      alert("اختر ملف التقرير أولاً.");
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
    ]);

    if (!allowedTypes.has(submissionFile.type) && !submissionFile.type.startsWith("image/")) {
      alert("نوع الملف غير مسموح. استخدم PDF أو Word أو Excel أو صورة.");
      return;
    }

    if (submissionFile.size > 10 * 1024 * 1024) {
      alert("حجم التقرير يتجاوز الحد المسموح وهو 10 MB.");
      return;
    }

    setSubmissionSaving(true);
    try {
      const nextNo = (submissionTarget.latest_submission?.submission_no ?? 0) + 1;
      const { data: submission, error: submissionError } = await supabase
        .from("institute_task_submissions")
        .insert({
          task_id: submissionTask.id,
          target_id: submissionTarget.id,
          institute_id: submissionTarget.institute_id,
          submitted_by: profile.id,
          submission_no: nextNo,
          notes: submissionNotes.trim() || null,
          status: "submitted",
        })
        .select(
          "id, task_id, target_id, institute_id, submitted_by, submission_no, notes, status, director_note, submitted_at, reviewed_at, reviewed_by, created_at, updated_at"
        )
        .single();

      if (submissionError) throw submissionError;
      if (!submission) throw new Error("تعذر إنشاء سجل التقرير.");

      const storagePath = `${submissionTarget.institute_id}/${submissionTask.id}/${submission.id}/${safeReportFileName(submissionFile.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("task-reports")
        .upload(storagePath, submissionFile, {
          contentType: submissionFile.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        await supabase.from("institute_task_submissions").delete().eq("id", submission.id);
        throw uploadError;
      }

      const { data: attachment, error: attachmentError } = await supabase
        .from("institute_task_submission_attachments")
        .insert({
          submission_id: submission.id,
          file_name: submissionFile.name,
          storage_path: storagePath,
          mime_type: submissionFile.type || null,
          file_size: submissionFile.size,
        })
        .select("id, submission_id, file_name, storage_path, mime_type, file_size, created_at")
        .single();

      if (attachmentError) {
        await supabase.storage.from("task-reports").remove([storagePath]);
        await supabase.from("institute_task_submissions").delete().eq("id", submission.id);
        throw attachmentError;
      }

      const now = new Date().toISOString();
      const latestSubmission: TaskSubmissionView = {
        ...(submission as TaskSubmission),
        attachments: [attachment as TaskAttachment],
      };
      const updatedTargets = submissionTask.targets.map((target) =>
        target.id === submissionTarget.id
          ? { ...target, status: "submitted" as const, responded_at: now, updated_at: now, latest_submission: latestSubmission }
          : target
      );
      const overallStatus = getOverallTaskStatus(updatedTargets);

      const { error: targetError } = await supabase
        .from("institute_task_targets")
        .update({ status: "submitted", responded_at: now, updated_at: now })
        .eq("id", submissionTarget.id);
      if (targetError) throw targetError;

      const { error: taskError } = await supabase
        .from("institute_tasks")
        .update({ status: overallStatus, updated_at: now })
        .eq("id", submissionTask.id);
      if (taskError) throw taskError;

      setTasks((current) =>
        current.map((task) =>
          task.id === submissionTask.id ? { ...task, status: overallStatus, targets: updatedTargets } : task
        )
      );

      alert("تم رفع التقرير وإرساله إلى مدير الإدارة للمراجعة ✅");
      closeSubmissionForm();
    } catch (error: any) {
      console.error("submitInstituteReport:", error);
      alert(error?.message ?? "حدث خطأ أثناء إرسال التقرير.");
    } finally {
      setSubmissionSaving(false);
    }
  }

  async function openReportFile(attachment: TaskAttachment) {
    setOpeningAttachmentId(attachment.id);
    try {
      const { data, error } = await supabase.storage
        .from("task-reports")
        .createSignedUrl(attachment.storage_path, 300);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("تعذر إنشاء رابط التقرير.");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      console.error("openReportFile:", error);
      alert(error?.message ?? "تعذر فتح التقرير.");
    } finally {
      setOpeningAttachmentId(null);
    }
  }

  function openReview(task: TaskView, target: TaskTarget) {
    if (!isDirector || !target.latest_submission) return;
    setReviewTask(task);
    setReviewSubmission(target.latest_submission);
    setReviewNote("");
  }

  function closeReview() {
    if (reviewSaving) return;
    setReviewTask(null);
    setReviewSubmission(null);
    setReviewNote("");
  }

  async function reviewTaskSubmission(action: "approved" | "returned") {
    if (!profile || !reviewTask || !reviewSubmission) return;
    if (action === "returned" && !reviewNote.trim()) {
      alert("اكتب ملاحظة توضح المطلوب من المعهد قبل إعادة التقرير.");
      return;
    }

    setReviewSaving(true);
    try {
      const now = new Date().toISOString();
      const { error: submissionError } = await supabase
        .from("institute_task_submissions")
        .update({
          status: action,
          director_note: action === "returned" ? reviewNote.trim() : null,
          reviewed_at: now,
          reviewed_by: profile.id,
          updated_at: now,
        })
        .eq("id", reviewSubmission.id);
      if (submissionError) throw submissionError;

      const nextTargetStatus: TaskTarget["status"] = action === "approved" ? "completed" : "in_progress";
      const { error: targetError } = await supabase
        .from("institute_task_targets")
        .update({ status: nextTargetStatus, updated_at: now })
        .eq("id", reviewSubmission.target_id);
      if (targetError) throw targetError;

      const updatedTargets = reviewTask.targets.map((target) =>
        target.id === reviewSubmission.target_id
          ? {
              ...target,
              status: nextTargetStatus,
              updated_at: now,
              latest_submission: {
                ...reviewSubmission,
                status: action,
                director_note: action === "returned" ? reviewNote.trim() : null,
                reviewed_at: now,
                reviewed_by: profile.id,
              },
            }
          : target
      );
      const overallStatus = getOverallTaskStatus(updatedTargets);

      const { error: taskError } = await supabase
        .from("institute_tasks")
        .update({ status: overallStatus, updated_at: now })
        .eq("id", reviewTask.id);
      if (taskError) throw taskError;

      setTasks((current) =>
        current.map((task) =>
          task.id === reviewTask.id ? { ...task, status: overallStatus, targets: updatedTargets } : task
        )
      );

      alert(action === "approved" ? "تم اعتماد التقرير وإغلاق مهمة المعهد ✅" : "تمت إعادة التقرير إلى المعهد لاستكماله وإعادة إرساله.");
      closeReview();
    } catch (error: any) {
      console.error("reviewTaskSubmission:", error);
      alert(error?.message ?? "حدث خطأ أثناء مراجعة التقرير.");
    } finally {
      setReviewSaving(false);
    }
  }

  function renderTargetAction(task: TaskView, target: TaskTarget) {
    const busy = updatingTargetId === target.id;

    if (target.status === "completed") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <Check size={16} />
          تم الإنجاز
        </div>
      );
    }

    if (isDirector) {
      if (target.status === "submitted") {
        if (target.latest_submission) {
          return (
            <button
              type="button"
              onClick={() => openReview(task, target)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <Eye size={16} />
              مراجعة التقرير
            </button>
          );
        }
        return <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">تم التسليم — لا يوجد ملف تقرير</div>;
      }

      if (target.status === "in_progress") {
        return <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">في انتظار تسليم المعهد</div>;
      }

      return <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">في انتظار بدء التنفيذ من المعهد</div>;
    }

    if (profile?.institute_id !== target.institute_id) return null;

    if (target.status === "pending" || target.status === "late") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => updateTargetStatus(task, target, "in_progress")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          بدء التنفيذ
        </button>
      );
    }

    if (target.status === "in_progress") {
      return (
        <button
          type="button"
          onClick={() => openSubmissionForm(task, target)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          <Send size={16} />
          تسليم التقرير
        </button>
      );
    }

    if (target.status === "submitted") {
      return <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">تم إرسال التقرير — في انتظار مراجعة المدير</div>;
    }

    return null;
  }

  function taskNeedsAttention(task: TaskView) {
    const overall = getOverallTaskStatus(task.targets);

    if (overall === "completed") return false;

    if (task.priority === "urgent") return true;

    return task.targets.some((target) =>
      isTargetOverdue(target, task.due_date)
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-100 p-4 md:p-6" dir="rtl">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-blue-600">
                  <FileText size={22} />
                  <span className="text-sm font-semibold">الإدارة والمتابعة</span>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  التكليفات والمتابعة
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  متابعة دورة التكليف من إصدار الإدارة إلى تنفيذ المعهد والتسليم والاعتماد، مع
                  عرض الاستثناءات التي تحتاج تدخل الإدارة.
                </p>
              </div>

              {isDirector && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    تكليف جديد
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowArchivedTasks((value) => !value)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Eye size={18} />
                    {showArchivedTasks ? "إخفاء المحفوظة" : "عرض المحفوظة"}
                  </button>

                  <button
                    type="button"
                    disabled={deletingAll || !visibleTasks.length}
                    onClick={deleteAllTasks}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingAll ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                    تنظيف الصفحة
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {[
              {
                label: "إجمالي التكليفات",
                value: statistics.total,
                icon: FileText,
                className: "text-blue-600 bg-blue-50",
              },
              {
                label: "جديدة",
                value: statistics.pending,
                icon: Bell,
                className: "text-sky-600 bg-sky-50",
              },
              {
                label: "قيد التنفيذ",
                value: statistics.inProgress,
                icon: Clock3,
                className: "text-amber-600 bg-amber-50",
              },
              {
                label: "تم التسليم",
                value: statistics.submitted,
                icon: Send,
                className: "text-violet-600 bg-violet-50",
              },
              {
                label: "عاجلة",
                value: statistics.urgent,
                icon: AlertCircle,
                className: "text-red-600 bg-red-50",
              },
              {
                label: "متأخرة",
                value: statistics.overdue,
                icon: ArrowDown,
                className: "text-orange-600 bg-orange-50",
              },
              {
                label: "مكتملة",
                value: statistics.completed,
                icon: Check,
                className: "text-emerald-600 bg-emerald-50",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.className}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="text-2xl font-bold text-slate-900">
                    {item.value}
                  </div>

                  <div className="mt-1 text-xs font-medium text-slate-500">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          {isDirector && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <Clock3 size={19} className="text-blue-600" />
                  <h2 className="font-bold text-slate-900">لوحة المدير الآن</h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  اختصار سريع لما يحتاج قرارًا أو متابعة الآن، بدل البحث داخل جميع التكليفات.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => directorAttentionTasks[0] && setExpandedTaskId(directorAttentionTasks[0].id)}
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-semibold text-red-700">يحتاج تدخلك الآن</div>
                  <div className="mt-1 text-3xl font-bold text-red-900">{directorAttentionTasks.length}</div>
                  <div className="mt-1 text-xs text-red-700">متأخر أو عاجل</div>
                </button>

                <button
                  type="button"
                  onClick={() => directorFollowUpTasks[0] && setExpandedTaskId(directorFollowUpTasks[0].id)}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-semibold text-amber-700">يحتاج متابعة</div>
                  <div className="mt-1 text-3xl font-bold text-amber-900">{directorFollowUpTasks.length}</div>
                  <div className="mt-1 text-xs text-amber-700">لم يبدأ أو قيد التنفيذ</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const first = visibleTasks.find((task) =>
                      task.targets.some(
                        (target) =>
                          target.status === "submitted" &&
                          target.latest_submission?.status === "submitted"
                      )
                    );
                    if (first) setExpandedTaskId(first.id);
                  }}
                  className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-semibold text-violet-700">تقارير للمراجعة</div>
                  <div className="mt-1 text-3xl font-bold text-violet-900">{directorReviewCount}</div>
                  <div className="mt-1 text-xs text-violet-700">بانتظار اعتماد المدير</div>
                </button>

                <button
                  type="button"
                  onClick={() => directorUpcomingTasks[0] && setExpandedTaskId(directorUpcomingTasks[0].id)}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-semibold text-blue-700">مواعيد خلال 7 أيام</div>
                  <div className="mt-1 text-3xl font-bold text-blue-900">{directorUpcomingTasks.length}</div>
                  <div className="mt-1 text-xs text-blue-700">قبل أن تتحول لمتأخر</div>
                </button>
              </div>

              {(directorAttentionTasks.length > 0 || directorUpcomingTasks.length > 0) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {directorAttentionTasks.slice(0, 3).map((task) => {
                    const overdueCount = task.targets.filter((target) =>
                      isTargetOverdue(target, task.due_date)
                    ).length;
                    return (
                      <button
                        key={`smart-attention-${task.id}`}
                        type="button"
                        onClick={() => setExpandedTaskId(task.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-right transition hover:bg-red-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{task.title}</div>
                          <div className="mt-1 text-xs text-red-700">
                            {overdueCount > 0 ? `${overdueCount} حالة متأخرة` : "يحتاج تدخل المدير"}
                          </div>
                        </div>
                        <ChevronDown size={18} className="shrink-0 text-red-500" />
                      </button>
                    );
                  })}

                  {directorUpcomingTasks.slice(0, 3).map((task) => (
                    <button
                      key={`smart-upcoming-${task.id}`}
                      type="button"
                      onClick={() => setExpandedTaskId(task.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-right transition hover:bg-blue-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{task.title}</div>
                        <div className="mt-1 text-xs text-blue-700">
                          الاستحقاق: {task.due_date ? formatDate(task.due_date) : "بدون موعد"}
                        </div>
                      </div>
                      <ChevronDown size={18} className="shrink-0 text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isDirector && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"><AlertCircle size={20} /></div>
                  <div><div className="text-sm font-bold text-red-800">يحتاج انتباه المدير</div><div className="mt-1 text-2xl font-bold text-red-900">{directorAttentionTasks.length}</div><p className="mt-1 text-xs leading-5 text-red-700">تكليفات عاجلة أو متأخرة وتحتاج تدخلاً.</p></div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Clock3 size={20} /></div>
                  <div><div className="text-sm font-bold text-amber-800">يحتاج متابعة</div><div className="mt-1 text-2xl font-bold text-amber-900">{directorFollowUpTasks.length}</div><p className="mt-1 text-xs leading-5 text-amber-700">تكليفات لم تبدأ أو ما زالت قيد التنفيذ.</p></div>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Send size={20} /></div>
                  <div><div className="text-sm font-bold text-violet-800">تقارير بانتظار المراجعة</div><div className="mt-1 text-2xl font-bold text-violet-900">{directorReviewCount}</div><p className="mt-1 text-xs leading-5 text-violet-700">تقارير أرسلها المعهد ولم يعتمدها المدير بعد.</p></div>
                </div>
              </div>
            </div>
          )}

          {isDirector && directorAttentionTasks.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex items-center gap-2"><AlertCircle size={19} className="text-red-600" /><h2 className="font-bold text-slate-900">ما يحتاج انتباهك الآن</h2></div>
              <div className="space-y-2">
                {directorAttentionTasks.slice(0, 5).map((task) => {
                  const counts = getTargetCounts(task.targets);
                  const overdueCount = task.targets.filter((target) => isTargetOverdue(target, task.due_date)).length;
                  return (
                    <button key={task.id} type="button" onClick={() => setExpandedTaskId(task.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-right transition hover:bg-red-50">
                      <div className="min-w-0"><div className="truncate font-semibold text-slate-900">{task.title}</div><div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">{overdueCount > 0 && <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">{overdueCount} متأخر</span>}{counts.pending > 0 && <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">{counts.pending} جديد</span>}{counts.inProgress > 0 && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{counts.inProgress} قيد التنفيذ</span>}</div></div>
                      <ChevronDown size={18} className="shrink-0 text-red-500" />
                    </button>
                  );
                })}
              </div>
              {directorAttentionTasks.length > 5 && <p className="mt-3 text-xs text-slate-500">يوجد {directorAttentionTasks.length - 5} تكليفات أخرى تحتاج انتباهًا.</p>}
            </div>
          )}

          {showArchivedTasks && isDirector && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              أنت الآن تعرض جميع التكليفات المحفوظة في قاعدة البيانات، بما فيها التكليفات التي تم
              تنظيفها من العرض سابقًا. لا يوجد حذف من قاعدة البيانات.
            </div>
          )}

          {isDirector && (
            <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Users size={19} className="text-blue-600" />
                    <h2 className="font-bold">حالة المعاهد</h2>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    ملخص سريع لحالة تنفيذ التكليفات في كل معهد، لتعرف أين تحتاج المتابعة أو التدخل.
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {directorInstituteStatus.length} معاهد
                </div>
              </div>

              {directorInstituteStatus.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  لا توجد معاهد ضمن الإدارة الحالية.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {directorInstituteStatus.map((institute) => (
                    <button
                      key={institute.id}
                      type="button"
                      onClick={() =>
                        setSelectedInstituteStatusId((current) =>
                          current === institute.id ? null : institute.id
                        )
                      }
                      className={`w-full rounded-xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm ${
                        selectedInstituteStatusId === institute.id
                          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">
                            {institute.name}
                          </div>
                          {institute.code && (
                            <div className="mt-1 text-xs text-slate-400">
                              {institute.code}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                          {institute.total} تكليف
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                          <div className="text-xs text-emerald-700">مكتمل</div>
                          <div className="mt-1 text-xl font-bold text-emerald-800">
                            {institute.completed}
                          </div>
                        </div>

                        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                          <div className="text-xs text-amber-700">قيد التنفيذ</div>
                          <div className="mt-1 text-xl font-bold text-amber-800">
                            {institute.inProgress}
                          </div>
                        </div>

                        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                          <div className="text-xs text-red-700">متأخر</div>
                          <div className="mt-1 text-xl font-bold text-red-800">
                            {institute.overdue}
                          </div>
                        </div>

                        <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
                          <div className="text-xs text-violet-700">تقارير للمراجعة</div>
                          <div className="mt-1 text-xl font-bold text-violet-800">
                            {institute.reportsWaiting}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
                        <span className="text-slate-500">إجمالي التكليفات الحالية</span>
                        <span className="font-semibold text-slate-700">
                          {institute.total}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-blue-700">
                        <span>{selectedInstituteStatusId === institute.id ? "إخفاء التفاصيل" : "عرض تكليفات المعهد"}</span>
                        {selectedInstituteStatusId === institute.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedInstituteStatus && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 md:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users size={18} className="text-blue-600" />
                        <h3 className="font-bold text-slate-900">تكليفات {selectedInstituteStatus.name}</h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">عرض حالة هذا المعهد فقط، مع الحفاظ على التكليف الجماعي كما هو.</p>
                    </div>
                    <button type="button" onClick={() => setSelectedInstituteStatusId(null)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <X size={15} />
                      عرض كل المعاهد
                    </button>
                  </div>
                  {selectedInstituteTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-blue-200 bg-white px-4 py-6 text-center text-sm text-slate-500">لا توجد تكليفات لهذا المعهد حاليًا.</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedInstituteTasks.map(({ task, target }) => {
                        if (!target) return null;
                        const overdue = isTargetOverdue(target, task.due_date);
                        const targetLabel = overdue ? "متأخر" : target.status === "pending" ? "جديد" : target.status === "in_progress" ? "قيد التنفيذ" : target.status === "submitted" ? "تم التسليم" : "مكتمل";
                        const targetClass = overdue ? "bg-red-100 text-red-700 border-red-200" : getStatusClass(target.status);
                        return (
                          <button key={`${task.id}-${target.id}`} type="button" onClick={() => setExpandedTaskId(task.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right transition hover:border-blue-200 hover:shadow-sm">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">{task.title}</div>
                              <div className="mt-1 text-xs text-slate-500">الاستحقاق: {formatDate(task.due_date)}</div>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${targetClass}`}>{targetLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <Filter size={18} />
              <h2 className="font-bold">البحث والتصفية</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث عن تكليف أو معهد..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-10 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-400"
              >
                <option value="all">كل الحالات</option>
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-400"
              >
                <option value="all">كل الأولويات</option>
                {priorityOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={instituteFilter}
                onChange={(event) => setInstituteFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-400"
              >
                <option value="all">كل المعاهد</option>
                {institutes.map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 size={24} className="animate-spin" />
                جاري تحميل التكليفات...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  عرض {filteredTasks.length} من {visibleTasks.length} تكليف
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRefreshing(true);
                    loadData(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  تحديث
                </button>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <FileText className="mx-auto mb-4 text-slate-300" size={44} />
                  <h3 className="text-lg font-bold text-slate-700">
                    لا توجد تكليفات في العرض الحالي
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {isDirector && !showArchivedTasks
                      ? "يمكنك إنشاء تكليف جديد أو عرض التكليفات المحفوظة."
                      : "جرّب تغيير البحث أو الفلاتر."}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const overallStatus = getOverallTaskStatus(task.targets);
                  const counts = getTargetCounts(task.targets);
                  const expanded = expandedTaskId === task.id;
                  const needsAttention = taskNeedsAttention(task);

                  return (
                    <div
                      key={task.id}
                      className={`overflow-hidden rounded-2xl bg-white shadow-sm ${
                        needsAttention ? "ring-1 ring-orange-200" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTaskId((current) =>
                            current === task.id ? null : task.id
                          )
                        }
                        className="w-full p-4 text-right md:p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">
                                {task.title}
                              </h3>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                                  task.priority
                                )}`}
                              >
                                {getPriorityLabel(task.priority)}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  overallStatus
                                )}`}
                              >
                                {getStatusLabel(overallStatus)}
                              </span>

                              {needsAttention && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  يحتاج متابعة
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                {task.description}
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600">
                                <Users size={14} />
                                {task.targets.length} معهد
                              </span>

                              {counts.pending > 0 && (
                                <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sky-700">
                                  {counts.pending} جديد
                                </span>
                              )}

                              {counts.inProgress > 0 && (
                                <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700">
                                  {counts.inProgress} قيد التنفيذ
                                </span>
                              )}

                              {counts.submitted > 0 && (
                                <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-violet-700">
                                  {counts.submitted} بانتظار الاعتماد
                                </span>
                              )}

                              {counts.completed > 0 && (
                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
                                  {counts.completed} مكتمل
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-start gap-2 text-xs text-slate-500 lg:items-end">
                            <span>
                              الاستحقاق:{" "}
                              <strong className="text-slate-700">
                                {formatDate(task.due_date)}
                              </strong>
                            </span>

                            <span>
                              الإنشاء: {formatCreatedDate(task.created_at)}
                            </span>

                            <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                              {expanded ? "إخفاء التفاصيل" : "متابعة المعاهد"}
                              {expanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </span>
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 md:p-5">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-800">
                                حالة التنفيذ حسب المعهد
                              </h4>
                              <p className="mt-1 text-xs text-slate-500">
                                كل معهد له حالة مستقلة داخل نفس التكليف الجماعي.
                              </p>
                            </div>

                            {isDirector && (
                              <button
                                type="button"
                                disabled={deletingTaskId === task.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteTask(task);
                                }}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingTaskId === task.id ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                                إخفاء من الصفحة
                              </button>
                            )}
                          </div>

                          <div className="grid gap-3">
                            {task.targets.map((target) => {
                              const overdue = isTargetOverdue(
                                target,
                                task.due_date
                              );

                              return (
                                <div
                                  key={target.id}
                                  className="rounded-xl border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-slate-800">
                                          {target.institute_name}
                                        </span>

                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                            target.status
                                          )}`}
                                        >
                                          {target.status === "late"
                                            ? "متأخر"
                                            : getStatusLabel(target.status)}
                                        </span>

                                        {overdue && (
                                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                            تجاوز الموعد
                                          </span>
                                        )}
                                      </div>

                                      {target.response && (
                                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                                          <strong className="text-slate-700">
                                            الرد:
                                          </strong>{" "}
                                          {target.response}
                                        </div>
                                      )}

                                      {target.latest_submission && (
                                        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                                          <div className="mb-2 flex items-center justify-between gap-2">
                                            <div className="text-sm font-bold text-violet-900">
                                              تقرير التنفيذ رقم {target.latest_submission.submission_no}
                                            </div>
                                            <span className="text-xs text-violet-700">
                                              {target.latest_submission.status === "submitted"
                                                ? "بانتظار المراجعة"
                                                : target.latest_submission.status === "returned"
                                                  ? "أعيد للمعهد"
                                                  : "تم الاعتماد"}
                                            </span>
                                          </div>

                                          {target.latest_submission.notes && (
                                            <p className="mb-3 text-sm leading-6 text-slate-600">
                                              <strong className="text-slate-700">ملاحظات المعهد:</strong>{" "}
                                              {target.latest_submission.notes}
                                            </p>
                                          )}

                                          {target.latest_submission.director_note && (
                                            <p className="mb-3 rounded-lg bg-orange-50 p-3 text-sm leading-6 text-orange-800">
                                              <strong>ملاحظة المدير:</strong>{" "}
                                              {target.latest_submission.director_note}
                                            </p>
                                          )}

                                          <div className="space-y-2">
                                            {target.latest_submission.attachments.map((attachment) => (
                                              <button
                                                key={attachment.id}
                                                type="button"
                                                onClick={() => openReportFile(attachment)}
                                                disabled={openingAttachmentId === attachment.id}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-violet-100 bg-white px-3 py-2 text-right text-sm text-violet-800 hover:bg-violet-50 disabled:opacity-60"
                                              >
                                                <span className="flex min-w-0 items-center gap-2">
                                                  {openingAttachmentId === attachment.id ? (
                                                    <Loader2 size={16} className="shrink-0 animate-spin" />
                                                  ) : (
                                                    <FileText size={16} className="shrink-0" />
                                                  )}
                                                  <span className="truncate">{attachment.file_name}</span>
                                                </span>
                                                <span className="shrink-0 text-xs text-slate-500">
                                                  {formatReportFileSize(attachment.file_size)}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="shrink-0">
                                      {renderTargetAction(task, target)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {submissionTarget && submissionTask && isInstituteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" dir="rtl">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">تسليم تقرير التكليف</h2>
                <p className="mt-1 text-sm text-slate-500">{submissionTask.title}</p>
              </div>
              <button type="button" onClick={closeSubmissionForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="space-y-5 p-5">
              {submissionTarget.latest_submission?.status === "returned" && submissionTarget.latest_submission.director_note && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
                  <div className="mb-1 font-bold">ملاحظة مدير الإدارة:</div>
                  {submissionTarget.latest_submission.director_note}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">ملف التقرير</label>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setSubmissionFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                <p className="mt-2 text-xs text-slate-500">PDF أو Word أو Excel أو صورة — الحد الأقصى 10 MB.</p>
                {submissionFile && <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">الملف المختار: <strong>{submissionFile.name}</strong><span className="mr-2 text-xs text-slate-500">({formatReportFileSize(submissionFile.size)})</span></div>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">ملاحظات المعهد</label>
                <textarea value={submissionNotes} onChange={(event) => setSubmissionNotes(event.target.value)} rows={4} placeholder="اكتب أي ملاحظات أو توضيحات للمدير..." className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400" />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">بعد الإرسال سيظهر التقرير لدى مدير الإدارة للمراجعة، ويمكنه اعتماده أو إعادته للمعهد.</div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeSubmissionForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">إلغاء</button>
                <button type="button" disabled={submissionSaving || !submissionFile} onClick={submitInstituteReport} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                  {submissionSaving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  إرسال التقرير للمدير
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewSubmission && reviewTask && isDirector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" dir="rtl">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">مراجعة تقرير المعهد</h2>
                <p className="mt-1 text-sm text-slate-500">{reviewTask.title}</p>
              </div>
              <button type="button" onClick={closeReview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <div className="font-bold text-violet-900">{reviewTask.targets.find((item) => item.id === reviewSubmission.target_id)?.institute_name ?? "المعهد"}</div>
                <div className="mt-1 text-xs text-violet-700">تسليم رقم {reviewSubmission.submission_no}</div>
              </div>

              {reviewSubmission.notes && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"><div className="mb-1 font-bold">ملاحظات المعهد</div>{reviewSubmission.notes}</div>}

              <div>
                <div className="mb-2 text-sm font-bold text-slate-700">الملف المرفق</div>
                <div className="space-y-2">
                  {reviewSubmission.attachments.length ? reviewSubmission.attachments.map((attachment) => (
                    <button key={attachment.id} type="button" onClick={() => openReportFile(attachment)} disabled={openingAttachmentId === attachment.id} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm hover:bg-slate-50 disabled:opacity-60">
                      <span className="flex min-w-0 items-center gap-3">{openingAttachmentId === attachment.id ? <Loader2 size={18} className="shrink-0 animate-spin text-blue-600" /> : <FileText size={18} className="shrink-0 text-blue-600" />}<span className="truncate font-semibold text-slate-800">{attachment.file_name}</span></span>
                      <span className="shrink-0 text-xs text-slate-500">{formatReportFileSize(attachment.file_size)}</span>
                    </button>
                  )) : <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">لا يوجد ملف مرفق.</div>}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">ملاحظة المدير</label>
                <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} placeholder="عند الإعادة للمعهد اكتب ما المطلوب استكماله..." className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400" />
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" disabled={reviewSaving} onClick={() => reviewTaskSubmission("returned")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60">{reviewSaving ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}إعادة للمعهد</button>
                <button type="button" disabled={reviewSaving} onClick={() => reviewTaskSubmission("approved")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{reviewSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}اعتماد وإغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && isDirector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          dir="rtl"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  إنشاء تكليف جديد
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  يمكنك إرسال نفس التكليف إلى معهد واحد أو عدة معاهد.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  عنوان التكليف
                </label>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="مثال: إرسال تقرير أعداد الطلاب"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  تفاصيل التكليف
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="اكتب المطلوب من المعهد بالتفصيل..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    الأولوية
                  </label>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as typeof current.priority,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                  >
                    {priorityOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        due_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  إرسال التكليف إلى
                </label>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: "single", label: "معهد واحد" },
                    { value: "selected", label: "معاهد محددة" },
                    { value: "all", label: "كل المعاهد" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setTargetMode(
                          item.value as "all" | "selected" | "single"
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        targetMode === item.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetMode === "single" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    المعهد
                  </label>
                  <select
                    value={form.institute_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        institute_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">اختر المعهد</option>
                    {institutes.map((institute) => (
                      <option key={institute.id} value={institute.id}>
                        {institute.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetMode === "selected" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      اختر المعاهد
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {selectedInstitutes.length} محدد
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {institutes.map((institute) => {
                      const selected = selectedInstitutes.includes(institute.id);

                      return (
                        <button
                          key={institute.id}
                          type="button"
                          onClick={() => toggleInstituteSelection(institute.id)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-3 text-right text-sm transition ${
                            selected
                              ? "border-blue-400 bg-blue-50 text-blue-800"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{institute.name}</span>
                          {selected && <Check size={18} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetMode === "all" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  سيتم إنشاء <strong>تكليف واحد</strong> وربطه بكل المعاهد الظاهرة
                  للإدارة الحالية. لكل معهد سجل متابعة مستقل.
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={createTask}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  إنشاء التكليف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
