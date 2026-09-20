```tsx
"use client";

import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code?: string | null;
};

type Profile = {
  id: string;
  role: string;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type Task = {
  id: string;
  directorate_id: string | null;
  institute_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  assigned_to: string | null;
  due_date: string | null;
  response: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TaskWithInstitute = Task & {
  instituteName: string;
};

const priorityOptions = [
  {
    value: "low",
    label: "منخفضة",
  },
  {
    value: "medium",
    label: "متوسطة",
  },
  {
    value: "high",
    label: "عالية",
  },
  {
    value: "urgent",
    label: "عاجلة",
  },
];

const statusOptions = [
  {
    value: "pending",
    label: "جديدة",
  },
  {
    value: "in_progress",
    label: "قيد التنفيذ",
  },
  {
    value: "completed",
    label: "مكتملة",
  },
];

function getPriorityLabel(priority: string | null) {
  return (
    priorityOptions.find(
      (item) => item.value === priority
    )?.label ||
    priority ||
    "غير محددة"
  );
}

function getStatusLabel(status: string | null) {
  return (
    statusOptions.find(
      (item) => item.value === status
    )?.label ||
    status ||
    "غير محددة"
  );
}

function isCompleted(status: string | null) {
  return status === "completed";
}

function isOverdue(task: Task) {
  if (!task.due_date || isCompleted(task.status)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(task.due_date);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

function getPriorityClasses(priority: string | null) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700";

    case "high":
      return "bg-orange-100 text-orange-700";

    case "medium":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusClasses(status: string | null) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";

    case "in_progress":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "غير محدد";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ar-EG");
}

export default function InstituteTasksPage() {
  const [profile, setProfile] = useState<Profile | null>(
    null
  );

  const [institutes, setInstitutes] = useState<Institute[]>(
    []
  );

  const [tasks, setTasks] = useState<TaskWithInstitute[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );

  const [showForm, setShowForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const [instituteFilter, setInstituteFilter] =
    useState("all");

  const [form, setForm] = useState({
    institute_id: "",
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setProfile(null);
        setInstitutes([]);
        setTasks([]);
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, role, full_name, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .single();

      if (profileError || !profileData) {
        console.error(
          "Profile error:",
          profileError
        );

        return;
      }

      setProfile(profileData);

      let institutesQuery = supabase
        .from("institutes")
        .select("id, name, code")
        .order("name");

      if (
        profileData.role === "director" &&
        profileData.directorate_id
      ) {
        institutesQuery = institutesQuery.eq(
          "directorate_id",
          profileData.directorate_id
        );
      } else if (profileData.institute_id) {
        institutesQuery = institutesQuery.eq(
          "id",
          profileData.institute_id
        );
      }

      const {
        data: instituteData,
        error: instituteError,
      } = await institutesQuery;

      if (instituteError) {
        console.error(
          "Institutes error:",
          instituteError
        );
      }

      const loadedInstitutes =
        (instituteData || []) as Institute[];

      setInstitutes(loadedInstitutes);

      let tasksQuery = supabase
        .from("institute_tasks")
        .select(
          "id, directorate_id, institute_id, title, description, priority, status, assigned_to, due_date, response, created_by, created_at, updated_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (
        profileData.role === "director" &&
        profileData.directorate_id
      ) {
        tasksQuery = tasksQuery.eq(
          "directorate_id",
          profileData.directorate_id
        );
      } else if (profileData.institute_id) {
        tasksQuery = tasksQuery.eq(
          "institute_id",
          profileData.institute_id
        );
      }

      const {
        data: taskData,
        error: taskError,
      } = await tasksQuery;

      if (taskError) {
        console.error(
          "Tasks error:",
          taskError
        );

        setTasks([]);
        return;
      }

      const instituteMap = new Map(
        loadedInstitutes.map((item) => [
          item.id,
          item.name,
        ])
      );

      const mappedTasks: TaskWithInstitute[] = (
        (taskData || []) as Task[]
      ).map((task) => ({
        ...task,
        instituteName:
          instituteMap.get(task.institute_id) ||
          "معهد غير معروف",
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error(
        "Unexpected load error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createTask() {
    if (!profile) {
      alert("لم يتم تحميل بيانات المستخدم");
      return;
    }

    if (!form.institute_id) {
      alert("اختاري المعهد أولًا");
      return;
    }

    if (!form.title.trim()) {
      alert("اكتبي عنوان التكليف");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("institute_tasks")
        .insert({
          directorate_id:
            profile.directorate_id,
          institute_id: form.institute_id,
          title: form.title.trim(),
          description:
            form.description.trim() || null,
          priority: form.priority,
          status: "pending",
          due_date: form.due_date || null,
          created_by: profile.id,
        });

      if (error) {
        console.error(
          "Create task error:",
          error
        );

        alert(
          `تعذر إنشاء التكليف:\n${error.message}`
        );

        return;
      }

      setForm({
        institute_id: "",
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
      });

      setShowForm(false);

      await loadData();

      alert("تم إنشاء التكليف بنجاح ✅");
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(
    taskId: string,
    status: string
  ) {
    setUpdatingId(taskId);

    try {
      const { error } = await supabase
        .from("institute_tasks")
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) {
        console.error(
          "Update task error:",
          error
        );

        alert(
          `تعذر تحديث حالة التكليف:\n${error.message}`
        );

        return;
      }

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                updated_at:
                  new Date().toISOString(),
              }
            : task
        )
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredTasks = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        task.instituteName
          .toLowerCase()
          .includes(normalizedSearch) ||
        (task.description || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      const matchesInstitute =
        instituteFilter === "all" ||
        task.institute_id === instituteFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesInstitute
      );
    });
  }, [
    tasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    instituteFilter,
  ]);

  const statistics = useMemo(() => {
    const total = tasks.length;

    const completed = tasks.filter(
      (task) =>
        isCompleted(task.status)
    ).length;

    const overdue = tasks.filter(
      (task) => isOverdue(task)
    ).length;

    const urgent = tasks.filter(
      (task) =>
        task.priority === "urgent" &&
        !isCompleted(task.status)
    ).length;

    const inProgress = tasks.filter(
      (task) =>
        task.status === "in_progress"
    ).length;

    const pending = tasks.filter(
      (task) =>
        task.status === "pending"
    ).length;

    return {
      total,
      completed,
      overdue,
      urgent,
      inProgress,
      pending,
    };
  }, [tasks]);

  const isDirector =
    profile?.role === "director" ||
    profile?.role === "super_admin";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              مركز المتابعة والتكليفات
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              متابعة ما تم تكليفه للمعاهد ومعرفة ما يحتاج تدخل الإدارة.
            </p>
          </div>

          {isDirector && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
            >
              <Plus size={19} />
              تكليف جديد
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <CheckSquare size={19} />
              </div>

              <span className="text-2xl font-black text-slate-900">
                {statistics.total}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              إجمالي التكليفات
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <Clock3
                className="text-blue-600"
                size={21}
              />

              <span className="text-2xl font-black text-blue-700">
                {statistics.pending}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              تحتاج متابعة
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <RefreshCw
                className="text-indigo-600"
                size={21}
              />

              <span className="text-2xl font-black text-indigo-700">
                {statistics.inProgress}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              قيد التنفيذ
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <AlertCircle
                className="text-red-600"
                size={21}
              />

              <span className="text-2xl font-black text-red-700">
                {statistics.urgent}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              عاجلة
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <AlertCircle
                className="text-orange-600"
                size={21}
              />

              <span className="text-2xl font-black text-orange-700">
                {statistics.overdue}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              متأخرة
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <CheckCircle2
                className="text-emerald-600"
                size={21}
              />

              <span className="text-2xl font-black text-emerald-700">
                {statistics.completed}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              مكتملة
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter size={18} />
            تصفية المتابعة
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="ابحث عن تكليف أو معهد..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            <select
              value={instituteFilter}
              onChange={(event) =>
                setInstituteFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                كل المعاهد
              </option>

              {institutes.map(
                (institute) => (
                  <option
                    key={institute.id}
                    value={institute.id}
                  >
                    {institute.name}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                كل الحالات
              </option>

              {statusOptions.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                )
              )}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                كل الأولويات
              </option>

              {priorityOptions.map(
                (priority) => (
                  <option
                    key={priority.value}
                    value={priority.value}
                  >
                    {priority.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Tasks */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">
              التكليفات والمتابعة
            </h2>

            <span className="text-xs font-semibold text-slate-500">
              {filteredTasks.length} نتيجة
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                جاري تحميل المتابعة...
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
              <CheckSquare
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-base font-bold text-slate-800">
                لا توجد تكليفات حاليًا
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                عند إنشاء أول تكليف سيظهر هنا لمتابعة تنفيذه.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(
                (task) => {
                  const overdue =
                    isOverdue(task);

                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                        overdue
                          ? "ring-red-200"
                          : "ring-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-900">
                              {task.title}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getPriorityClasses(
                                task.priority
                              )}`}
                            >
                              {getPriorityLabel(
                                task.priority
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                                task.status
                              )}`}
                            >
                              {getStatusLabel(
                                task.status
                              )}
                            </span>

                            {overdue && (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                متأخر
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-sm font-bold text-slate-600">
                            {task.instituteName}
                          </div>

                          {task.description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                            {task.due_date && (
                              <span>
                                الاستحقاق:{" "}
                                {formatDate(
                                  task.due_date
                                )}
                              </span>
                            )}

                            <span>
                              أُنشئ:{" "}
                              {new Date(
                                task.created_at
                              ).toLocaleDateString(
                                "ar-EG"
                              )}
                            </span>
                          </div>

                          {task.response && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                              <div className="mb-1 text-xs font-black text-slate-700">
                                إفادة المعهد
                              </div>

                              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {task.response}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          {task.status !==
                            "in_progress" &&
                            task.status !==
                              "completed" && (
                              <button
                                type="button"
                                disabled={
                                  updatingId ===
                                  task.id
                                }
                                onClick={() =>
                                  updateTaskStatus(
                                    task.id,
                                    "in_progress"
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                              >
                                <RefreshCw
                                  size={15}
                                />
                                قيد التنفيذ
                              </button>
                            )}

                          {task.status !==
                            "completed" && (
                            <button
                              type="button"
                              disabled={
                                updatingId ===
                                task.id
                              }
                              onClick={() =>
                                updateTaskStatus(
                                  task.id,
                                  "completed"
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2
                                size={15}
                              />
                              إغلاق التكليف
                            </button>
                          )}

                          {task.status ===
                            "completed" && (
                            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2
                                size={15}
                              />
                              تم الإنجاز
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  إنشاء تكليف جديد
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  أرسل توجيهًا أو طلبًا لمعهد لمتابعة تنفيذه.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  المعهد
                </label>

                <select
                  value={form.institute_id}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        institute_id:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">
                    اختاري المعهد
                  </option>

                  {institutes.map(
                    (institute) => (
                      <option
                        key={institute.id}
                        value={institute.id}
                      >
                        {institute.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  عنوان التكليف
                </label>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="مثال: إرسال تقرير أعداد الطلاب"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  تفاصيل التكليف
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  rows={5}
                  placeholder="اكتبي المطلوب من المعهد بالتفصيل..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    الأولوية
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          priority:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  >
                    {priorityOptions.map(
                      (priority) => (
                        <option
                          key={
                            priority.value
                          }
                          value={
                            priority.value
                          }
                        >
                          {priority.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    تاريخ الاستحقاق
                  </label>

                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          due_date:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={createTask}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={17} />

                  {saving
                    ? "جاري الحفظ..."
                    : "إنشاء التكليف"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
```
