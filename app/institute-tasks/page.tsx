"use client";

import {
AlertCircle,
CheckCircle2,
CheckSquare,
ChevronDown,
ChevronUp,
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
assignment_group_id: string | null;
directorate_id: string | null;
institute_id: string | null;
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

type TaskTarget = {
id: string;
task_id: string;
institute_id: string;
status: string | null;
response: string | null;
responded_at: string | null;
created_at: string;
updated_at: string;
};

type TaskTargetView = TaskTarget & {
instituteName: string;
};

type TaskView = Task & {
targets: TaskTargetView[];
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
value: "submitted",
label: "تم التسليم",
},
{
value: "completed",
label: "مكتملة",
},
];

function getPriorityLabel(priority: string | null) {
const item = priorityOptions.find(
(option) => option.value === priority
);

return item ? item.label : priority || "غير محددة";
}

function getStatusLabel(status: string | null) {
const item = statusOptions.find(
(option) => option.value === status
);

return item ? item.label : status || "غير محددة";
}

function getPriorityClasses(priority: string | null) {
if (priority === "urgent") {
return "bg-red-100 text-red-700";
}

if (priority === "high") {
return "bg-orange-100 text-orange-700";
}

if (priority === "medium") {
return "bg-amber-100 text-amber-700";
}

return "bg-slate-100 text-slate-600";
}

function getStatusClasses(status: string | null) {
if (status === "completed") {
return "bg-emerald-100 text-emerald-700";
}

if (status === "submitted") {
return "bg-purple-100 text-purple-700";
}

if (status === "in_progress") {
return "bg-blue-100 text-blue-700";
}

return "bg-slate-100 text-slate-700";
}

function isTargetOverdue(
task: Task,
target: TaskTargetView
) {
if (!task.due_date || target.status === "completed") {
return false;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const due = new Date(
task.due_date + "T00:00:00"
);

if (Number.isNaN(due.getTime())) {
return false;
}

return due < today;
}

function formatDate(value: string | null) {
if (!value) {
return "غير محدد";
}

const date = new Date(
value + "T00:00:00"
);

if (Number.isNaN(date.getTime())) {
return value;
}

return date.toLocaleDateString("ar-EG");
}

function formatCreatedDate(value: string) {
const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return value;
}

return date.toLocaleDateString("ar-EG");
}

function getOverallTaskStatus(
targets: TaskTargetView[]
) {
if (targets.length === 0) {
return "pending";
}

const statuses = targets.map(
(target) => target.status || "pending"
);

if (
statuses.every(
(status) => status === "completed"
)
) {
return "completed";
}

if (
statuses.some(
(status) => status === "submitted"
)
) {
return "submitted";
}

if (
statuses.some(
(status) => status === "in_progress"
)
) {
return "in_progress";
}

return "pending";
}

function getTargetCounts(
targets: TaskTargetView[]
) {
return {
total: targets.length,
pending: targets.filter(
(target) =>
(target.status || "pending") ===
"pending"
).length,
inProgress: targets.filter(
(target) =>
target.status === "in_progress"
).length,
submitted: targets.filter(
(target) =>
target.status === "submitted"
).length,
completed: targets.filter(
(target) =>
target.status === "completed"
).length,
};
}

function createGroupId() {
if (
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
) {
return crypto.randomUUID();
}

return (
Date.now().toString(36) +
Math.random()
.toString(36)
.substring(2)
);
}

export default function InstituteTasksPage() {
const [profile, setProfile] =
useState<Profile | null>(null);

const [institutes, setInstitutes] =
useState<Institute[]>([]);

const [tasks, setTasks] =
useState<TaskView[]>([]);

const [loading, setLoading] =
useState(true);

const [saving, setSaving] =
useState(false);

const [
updatingTargetId,
setUpdatingTargetId,
] = useState<string | null>(null);

const [showForm, setShowForm] =
useState(false);

const [
expandedTaskId,
setExpandedTaskId,
] = useState<string | null>(null);

const [searchTerm, setSearchTerm] =
useState("");

const [statusFilter, setStatusFilter] =
useState("all");

const [
priorityFilter,
setPriorityFilter,
] = useState("all");

const [
instituteFilter,
setInstituteFilter,
] = useState("all");

const [
targetMode,
setTargetMode,
] = useState<
"all" | "selected" | "single"

> ("single");

const [
selectedInstitutes,
setSelectedInstitutes,
] = useState<string[]>([]);

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

  const {
    data: profileData,
    error: profileError,
  } = await supabase
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

  const currentProfile =
    profileData as Profile;

  setProfile(currentProfile);

  const isDirector =
    currentProfile.role ===
      "director" ||
    currentProfile.role ===
      "super_admin";

  let institutesQuery =
    supabase
      .from("institutes")
      .select(
        "id, name, code"
      )
      .order("name");

  if (
    isDirector &&
    currentProfile.directorate_id
  ) {
    institutesQuery =
      institutesQuery.eq(
        "directorate_id",
        currentProfile.directorate_id
      );
  } else if (
    currentProfile.institute_id
  ) {
    institutesQuery =
      institutesQuery.eq(
        "id",
        currentProfile.institute_id
      );
  }

  const {
    data: instituteData,
    error: instituteError,
  } =
    await institutesQuery;

  if (instituteError) {
    console.error(
      "Institutes error:",
      instituteError
    );
  }

  const loadedInstitutes =
    (instituteData ||
      []) as Institute[];

  setInstitutes(
    loadedInstitutes
  );

  let targetQuery =
    supabase
      .from(
        "institute_task_targets"
      )
      .select(
        "id, task_id, institute_id, status, response, responded_at, created_at, updated_at"
      );

  if (!isDirector) {
    if (
      !currentProfile.institute_id
    ) {
      setTasks([]);
      return;
    }

    targetQuery =
      targetQuery.eq(
        "institute_id",
        currentProfile.institute_id
      );
  }

  const {
    data: targetData,
    error: targetError,
  } =
    await targetQuery.order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (targetError) {
    console.error(
      "Targets error:",
      targetError
    );
    setTasks([]);
    return;
  }

  const loadedTargets =
    (targetData ||
      []) as TaskTarget[];

  const targetTaskIds = Array.from(
    new Set(
      loadedTargets.map(
        (target) =>
          target.task_id
      )
    )
  );

  let tasksQuery =
    supabase
      .from("institute_tasks")
      .select(
        "id, assignment_group_id, directorate_id, institute_id, title, description, priority, status, assigned_to, due_date, response, created_by, created_at, updated_at"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (isDirector) {
    if (
      currentProfile.directorate_id
    ) {
      tasksQuery =
        tasksQuery.eq(
          "directorate_id",
          currentProfile.directorate_id
        );
    }
  } else {
    if (
      targetTaskIds.length ===
      0
    ) {
      setTasks([]);
      return;
    }

    tasksQuery =
      tasksQuery.in(
        "id",
        targetTaskIds
      );
  }

  const {
    data: taskData,
    error: taskError,
  } =
    await tasksQuery;

  if (taskError) {
    console.error(
      "Tasks error:",
      taskError
    );
    setTasks([]);
    return;
  }

  const taskRows =
    (taskData ||
      []) as Task[];

  if (
    taskRows.length === 0
  ) {
    setTasks([]);
    return;
  }

  const taskIds =
    taskRows.map(
      (task) => task.id
    );

  let finalTargets =
    loadedTargets.filter(
      (target) =>
        taskIds.includes(
          target.task_id
        )
    );

  /*
   * For directors, the first target query
   * already contains all targets.
   * This keeps the query efficient and
   * avoids exposing unrelated data to
   * institute users.
   */
  if (isDirector) {
    const missingTaskIds =
      taskIds.filter(
        (taskId) =>
          !finalTargets.some(
            (target) =>
              target.task_id ===
              taskId
          )
      );

    if (
      missingTaskIds.length >
      0
    ) {
      const {
        data: extraTargets,
        error:
          extraTargetError,
      } =
        await supabase
          .from(
            "institute_task_targets"
          )
          .select(
            "id, task_id, institute_id, status, response, responded_at, created_at, updated_at"
          )
          .in(
            "task_id",
            missingTaskIds
          );

      if (
        extraTargetError
      ) {
        console.error(
          "Extra targets error:",
          extraTargetError
        );
      }

      if (
        extraTargets
      ) {
        finalTargets =
          finalTargets.concat(
            extraTargets as TaskTarget[]
          );
      }
    }
  }

  const instituteMap =
    new Map(
      loadedInstitutes.map(
        (institute) => [
          institute.id,
          institute.name,
        ]
      )
    );

  /*
   * Group targets by task.
   */
  const targetsByTask =
    new Map<
      string,
      TaskTargetView[]
    >();

  for (const target of finalTargets) {
    const existing =
      targetsByTask.get(
        target.task_id
      ) || [];

    existing.push({
      ...target,
      instituteName:
        instituteMap.get(
          target.institute_id
        ) ||
        "معهد غير معروف",
    });

    targetsByTask.set(
      target.task_id,
      existing
    );
  }

  /*
   * Map tasks to targets.
   * Old records without target rows
   * remain visible as legacy tasks.
   */
  const mappedTasks =
    taskRows.map(
      (task) => {
        let taskTargets =
          targetsByTask.get(
            task.id
          ) || [];

        if (
          taskTargets.length ===
            0 &&
          task.institute_id
        ) {
          taskTargets = [
            {
              id:
                "legacy-" +
                task.id,
              task_id:
                task.id,
              institute_id:
                task.institute_id,
              status:
                task.status ||
                "pending",
              response:
                task.response,
              responded_at:
                null,
              created_at:
                task.created_at,
              updated_at:
                task.updated_at,
              instituteName:
                instituteMap.get(
                  task.institute_id
                ) ||
                "معهد غير معروف",
            },
          ];
        }

        return {
          ...task,
          targets:
            taskTargets,
        };
      }
    );

  /*
   * Remove duplicate logical rows
   * when several task records share the
   * same assignment_group_id.
   */
  const grouped =
    new Map<
      string,
      TaskView
    >();

  for (const task of mappedTasks) {
    const groupKey =
      task.assignment_group_id ||
      task.id;

    const existing =
      grouped.get(groupKey);

    if (!existing) {
      grouped.set(
        groupKey,
        task
      );
      continue;
    }

    const mergedTargets =
      new Map<
        string,
        TaskTargetView
      >();

    [
      ...existing.targets,
      ...task.targets,
    ].forEach(
      (target) => {
        mergedTargets.set(
          target.id,
          target
        );
      }
    );

    grouped.set(
      groupKey,
      {
        ...existing,
        targets:
          Array.from(
            mergedTargets.values()
          ),
        updated_at:
          task.updated_at >
          existing.updated_at
            ? task.updated_at
            : existing.updated_at,
      }
    );
  }

  setTasks(
    Array.from(
      grouped.values()
    )
  );
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

function getTargetInstituteIds() {
if (targetMode === "all") {
return institutes.map(
(institute) =>
institute.id
);
}


if (
  targetMode === "selected"
) {
  return selectedInstitutes;
}

if (form.institute_id) {
  return [form.institute_id];
}

return [];


}

function toggleInstitute(
instituteId: string
) {
setSelectedInstitutes(
(current) => {
if (
current.includes(
instituteId
)
) {
return current.filter(
(id) =>
id !==
instituteId
);
}


    return [
      ...current,
      instituteId,
    ];
  }
);


}

function selectAllInstitutes() {
setSelectedInstitutes(
institutes.map(
(institute) =>
institute.id
)
);
}

function clearSelectedInstitutes() {
setSelectedInstitutes([]);
}

async function createTask() {
if (!profile) {
alert(
"لم يتم تحميل بيانات المستخدم"
);
return;
}

if (
  !form.title.trim()
) {
  alert(
    "اكتبي عنوان التكليف"
  );
  return;
}

const targetInstituteIds =
  getTargetInstituteIds();

if (
  targetInstituteIds.length ===
  0
) {
  alert(
    "اختاري المعهد أو المعاهد المستهدفة أولًا"
  );
  return;
}

setSaving(true);

try {
  /*
   * One logical task = one row.
   * One assignment_group_id identifies
   * the logical assignment.
   */
  const assignmentGroupId =
    createGroupId();

  const {
    data: createdTask,
    error: taskError,
  } = await supabase
    .from(
      "institute_tasks"
    )
    .insert({
      assignment_group_id:
        assignmentGroupId,
      directorate_id:
        profile.directorate_id,
      institute_id: null,
      title:
        form.title.trim(),
      description:
        form.description.trim() ||
        null,
      priority:
        form.priority,
      status: "pending",
      due_date:
        form.due_date ||
        null,
      created_by:
        profile.id,
    })
    .select(
      "id"
    )
    .single();

  if (
    taskError ||
    !createdTask
  ) {
    console.error(
      "Create task error:",
      taskError
    );

    alert(
      "تعذر إنشاء التكليف:\n" +
        (taskError?.message ||
          "حدث خطأ غير معروف")
    );

    return;
  }

  const targetRows =
    targetInstituteIds.map(
      (instituteId) => ({
        task_id:
          createdTask.id,
        institute_id:
          instituteId,
        status:
          "pending",
        response: null,
        responded_at:
          null,
      })
    );

  const {
    error: targetError,
  } = await supabase
    .from(
      "institute_task_targets"
    )
    .insert(
      targetRows
    );

  if (targetError) {
    console.error(
      "Create targets error:",
      targetError
    );

    await supabase
      .from(
        "institute_tasks"
      )
      .delete()
      .eq(
        "id",
        createdTask.id
      );

    alert(
      "تعذر تسجيل المعاهد المستهدفة:\n" +
        targetError.message
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

  setTargetMode(
    "single"
  );

  setSelectedInstitutes(
    []
  );

  setShowForm(false);

  await loadData();

  alert(
    "تم إنشاء تكليف واحد بنجاح وإرساله إلى " +
      targetInstituteIds.length +
      " معهد"
  );
} finally {
  setSaving(false);
}


}

async function updateTargetStatus(
taskId: string,
target: TaskTargetView,
status: string
) {
if (
target.id.startsWith(
"legacy-"
)
) {
alert(
"هذا تكليف قديم. لا يمكن تغيير حالته من النسخة الجماعية الجديدة."
);
return;
}


setUpdatingTargetId(
  target.id
);

try {
  const now =
    new Date().toISOString();

  const updatePayload: {
    status: string;
    updated_at: string;
    responded_at?: string | null;
  } = {
    status,
    updated_at: now,
  };

  if (
    status === "submitted"
  ) {
    updatePayload.responded_at =
      now;
  }

  const {
    error,
  } = await supabase
    .from(
      "institute_task_targets"
    )
    .update(
      updatePayload
    )
    .eq(
      "id",
      target.id
    );

  if (error) {
    console.error(
      "Update target error:",
      error
    );

    alert(
      "تعذر تحديث حالة المعهد:\n" +
        error.message
    );

    return;
  }

  /*
   * Keep the parent task status synchronized
   * for backward compatibility.
   */
  const currentTask =
    tasks.find(
      (task) =>
        task.id ===
        taskId
    );

  if (currentTask) {
    const updatedTargets =
      currentTask.targets.map(
        (currentTarget) =>
          currentTarget.id ===
          target.id
            ? {
                ...currentTarget,
                status,
                updated_at:
                  now,
                responded_at:
                  status ===
                  "submitted"
                    ? now
                    : currentTarget.responded_at,
              }
            : currentTarget
      );

    const overallStatus =
      getOverallTaskStatus(
        updatedTargets
      );

    await supabase
      .from(
        "institute_tasks"
      )
      .update({
        status:
          overallStatus,
        updated_at:
          now,
      })
      .eq(
        "id",
        taskId
      );

    setTasks(
      (current) =>
        current.map(
          (task) =>
            task.id ===
            taskId
              ? {
                  ...task,
                  targets:
                    updatedTargets,
                  status:
                    overallStatus,
                  updated_at:
                    now,
                }
              : task
        )
    );
  }
} finally {
  setUpdatingTargetId(
    null
  );
}


}

const isDirector =
profile?.role ===
"director" ||
profile?.role ===
"super_admin";

const filteredTasks =
useMemo(() => {
const normalizedSearch =
searchTerm
.trim()
.toLowerCase();


  return tasks.filter(
    (task) => {
      const targetNames =
        task.targets
          .map(
            (target) =>
              target.instituteName.toLowerCase()
          )
          .join(" ");

      const matchesSearch =
        !normalizedSearch ||
        task.title
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        (
          task.description ||
          ""
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        targetNames.includes(
          normalizedSearch
        );

      const overallStatus =
        getOverallTaskStatus(
          task.targets
        );

      const matchesStatus =
        statusFilter ===
          "all" ||
        overallStatus ===
          statusFilter;

      const matchesPriority =
        priorityFilter ===
          "all" ||
        task.priority ===
          priorityFilter;

      const matchesInstitute =
        instituteFilter ===
          "all" ||
        task.targets.some(
          (target) =>
            target.institute_id ===
            instituteFilter
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesInstitute
      );
    }
  );
}, [
  tasks,
  searchTerm,
  statusFilter,
  priorityFilter,
  instituteFilter,
]);


const statistics =
useMemo(() => {
let pending = 0;
let inProgress = 0;
let submitted = 0;
let completed = 0;
let urgent = 0;
let overdue = 0;


  for (const task of tasks) {
    const counts =
      getTargetCounts(
        task.targets
      );

    pending +=
      counts.pending;

    inProgress +=
      counts.inProgress;

    submitted +=
      counts.submitted;

    completed +=
      counts.completed;

    if (
      task.priority ===
        "urgent" &&
      getOverallTaskStatus(
        task.targets
      ) !== "completed"
    ) {
      urgent += 1;
    }

    if (
      task.targets.some(
        (target) =>
          isTargetOverdue(
            task,
            target
          )
      )
    ) {
      overdue += 1;
    }
  }

  return {
    tasks:
      tasks.length,
    pending,
    inProgress,
    submitted,
    completed,
    urgent,
    overdue,
  };
}, [tasks]);


const targetCount =
getTargetInstituteIds()
.length;

return ( <AppShell> <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"> <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"> <div> <h1 className="text-2xl font-black text-slate-900">
مركز المتابعة والتكليفات </h1>


        <p className="mt-2 text-sm text-slate-500">
          إرسال التكليفات للمعاهد ومتابعة التنفيذ والتدخل عند الحاجة.
        </p>
      </div>

      {isDirector && (
        <button
          type="button"
          onClick={() =>
            setShowForm(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
        >
          <Plus size={19} />
          تكليف جديد
        </button>
      )}
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <CheckSquare size={19} />

          <span className="text-2xl font-black text-slate-900">
            {statistics.tasks}
          </span>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">
          إجمالي التكليفات
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <Clock3
            className="text-slate-600"
            size={21}
          />

          <span className="text-2xl font-black text-slate-700">
            {statistics.pending}
          </span>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">
          جديدة
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <RefreshCw
            className="text-blue-600"
            size={21}
          />

          <span className="text-2xl font-black text-blue-700">
            {statistics.inProgress}
          </span>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">
          قيد التنفيذ
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <Send
            className="text-purple-600"
            size={21}
          />

          <span className="text-2xl font-black text-purple-700">
            {statistics.submitted}
          </span>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">
          تم التسليم
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
            value={
              searchTerm
            }
            onChange={(
              event
            ) =>
              setSearchTerm(
                event.target
                  .value
              )
            }
            placeholder="ابحث عن تكليف أو معهد..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        <select
          value={
            instituteFilter
          }
          onChange={(
            event
          ) =>
            setInstituteFilter(
              event.target
                .value
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
                key={
                  institute.id
                }
                value={
                  institute.id
                }
              >
                {
                  institute.name
                }
              </option>
            )
          )}
        </select>

        <select
          value={
            statusFilter
          }
          onChange={(
            event
          ) =>
            setStatusFilter(
              event.target
                .value
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
                key={
                  status.value
                }
                value={
                  status.value
                }
              >
                {
                  status.label
                }
              </option>
            )
          )}
        </select>

        <select
          value={
            priorityFilter
          }
          onChange={(
            event
          ) =>
            setPriorityFilter(
              event.target
                .value
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
                key={
                  priority.value
                }
                value={
                  priority.value
                }
              >
                {
                  priority.label
                }
              </option>
            )
          )}
        </select>
      </div>
    </div>

    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">
          التكليفات والمتابعة
        </h2>

        <span className="text-xs font-semibold text-slate-500">
          {filteredTasks.length} تكليف
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
      ) : filteredTasks.length ===
        0 ? (
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
        <div className="space-y-4">
          {filteredTasks.map(
            (task) => {
              const overallStatus =
                getOverallTaskStatus(
                  task.targets
                );

              const counts =
                getTargetCounts(
                  task.targets
                );

              const overdue =
                task.targets.some(
                  (target) =>
                    isTargetOverdue(
                      task,
                      target
                    )
                );

              const isExpanded =
                expandedTaskId ===
                task.id;

              return (
                <div
                  key={
                    task.id
                  }
                  className={
                    "overflow-hidden rounded-2xl bg-white shadow-sm ring-1 " +
                    (overdue
                      ? "ring-red-200"
                      : "ring-slate-200")
                  }
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {
                              task.title
                            }
                          </h3>

                          <span
                            className={
                              "rounded-full px-2.5 py-1 text-[11px] font-bold " +
                              getPriorityClasses(
                                task.priority
                              )
                            }
                          >
                            {getPriorityLabel(
                              task.priority
                            )}
                          </span>

                          <span
                            className={
                              "rounded-full px-2.5 py-1 text-[11px] font-bold " +
                              getStatusClasses(
                                overallStatus
                              )
                            }
                          >
                            {getStatusLabel(
                              overallStatus
                            )}
                          </span>

                          {overdue && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                              متأخر
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                            {
                              task.description
                            }
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                            {counts.total} معهد مستهدف
                          </span>

                          {counts.pending >
                            0 && (
                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                              {
                                counts.pending
                              }{" "}
                              جديدة
                            </span>
                          )}

                          {counts.inProgress >
                            0 && (
                            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                              {
                                counts.inProgress
                              }{" "}
                              قيد التنفيذ
                            </span>
                          )}

                          {counts.submitted >
                            0 && (
                            <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
                              {
                                counts.submitted
                              }{" "}
                              تم التسليم
                            </span>
                          )}

                          {counts.completed >
                            0 && (
                            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                              {
                                counts.completed
                              }{" "}
                              مكتملة
                            </span>
                          )}
                        </div>

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
                            {formatCreatedDate(
                              task.created_at
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTaskId(
                              isExpanded
                                ? null
                                : task.id
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp
                                size={16}
                              />
                              إخفاء التفاصيل
                            </>
                          ) : (
                            <>
                              <ChevronDown
                                size={16}
                              />
                              متابعة المعاهد
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">
                            حالة كل معهد
                          </h4>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            كل معهد له حالة مستقلة داخل نفس التكليف.
                          </p>
                        </div>

                        <span className="text-xs font-bold text-slate-500">
                          {
                            counts.completed
                          }{" "}
                          /{" "}
                          {
                            counts.total
                          }{" "}
                          مكتملة
                        </span>
                      </div>

                      <div className="space-y-3">
                        {task.targets.map(
                          (
                            target
                          ) => {
                            const targetOverdue =
                              isTargetOverdue(
                                task,
                                target
                              );

                            const isUpdating =
                              updatingTargetId ===
                              target.id;

                            return (
                              <div
                                key={
                                  target.id
                                }
                                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h5 className="text-sm font-black text-slate-900">
                                        {
                                          target.instituteName
                                        }
                                      </h5>

                                      <span
                                        className={
                                          "rounded-full px-2.5 py-1 text-[11px] font-bold " +
                                          getStatusClasses(
                                            target.status
                                          )
                                        }
                                      >
                                        {getStatusLabel(
                                          target.status
                                        )}
                                      </span>

                                      {targetOverdue && (
                                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                          متأخر
                                        </span>
                                      )}
                                    </div>

                                    {target.response && (
                                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                        <div className="mb-1 text-xs font-black text-slate-700">
                                          إفادة المعهد
                                        </div>

                                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                          {
                                            target.response
                                          }
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    {target.status ===
                                      "pending" &&
                                      !isDirector && (
                                        <button
                                          type="button"
                                          disabled={
                                            isUpdating
                                          }
                                          onClick={() =>
                                            updateTargetStatus(
                                              task.id,
                                              target,
                                              "in_progress"
                                            )
                                          }
                                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                        >
                                          <RefreshCw
                                            size={
                                              15
                                            }
                                          />
                                          بدء التنفيذ
                                        </button>
                                      )}

                                    {target.status ===
                                      "in_progress" &&
                                      !isDirector && (
                                        <button
                                          type="button"
                                          disabled={
                                            isUpdating
                                          }
                                          onClick={() =>
                                            updateTargetStatus(
                                              task.id,
                                              target,
                                              "submitted"
                                            )
                                          }
                                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                                        >
                                          <Send
                                            size={
                                              15
                                            }
                                          />
                                          تم التسليم
                                        </button>
                                      )}

                                    {target.status ===
                                      "submitted" &&
                                      isDirector && (
                                        <button
                                          type="button"
                                          disabled={
                                            isUpdating
                                          }
                                          onClick={() =>
                                            updateTargetStatus(
                                              task.id,
                                              target,
                                              "completed"
                                            )
                                          }
                                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                          <CheckCircle2
                                            size={
                                              15
                                            }
                                          />
                                          اعتماد وإغلاق
                                        </button>
                                      )}

                                    {target.status ===
                                      "completed" && (
                                      <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">
                                        <CheckCircle2
                                          size={
                                            15
                                          }
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
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  </div>

  {showForm && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              إنشاء تكليف جديد
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              أرسل توجيهًا أو طلبًا لمعهد واحد أو عدة معاهد أو جميع المعاهد.
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
              إرسال التكليف إلى
            </label>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setTargetMode(
                    "all"
                  );

                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      institute_id:
                        "",
                    })
                  );

                  setSelectedInstitutes(
                    []
                  );
                }}
                className={
                  "rounded-xl border px-4 py-3 text-sm font-bold transition " +
                  (targetMode ===
                  "all"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                }
              >
                كل المعاهد
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetMode(
                    "selected"
                  );

                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      institute_id:
                        "",
                    })
                  );
                }}
                className={
                  "rounded-xl border px-4 py-3 text-sm font-bold transition " +
                  (targetMode ===
                  "selected"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                }
              >
                عدة معاهد
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetMode(
                    "single"
                  );

                  setSelectedInstitutes(
                    []
                  );
                }}
                className={
                  "rounded-xl border px-4 py-3 text-sm font-bold transition " +
                  (targetMode ===
                  "single"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                }
              >
                معهد واحد
              </button>
            </div>
          </div>

          {targetMode ===
            "single" && (
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                المعهد
              </label>

              <select
                value={
                  form.institute_id
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      institute_id:
                        event
                          .target
                          .value,
                    })
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  اختاري المعهد
                </option>

                {institutes.map(
                  (
                    institute
                  ) => (
                    <option
                      key={
                        institute.id
                      }
                      value={
                        institute.id
                      }
                    >
                      {
                        institute.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {targetMode ===
            "all" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm font-black text-blue-800">
                سيتم إنشاء تكليف واحد لجميع المعاهد
              </div>

              <div className="mt-1 text-xs font-semibold text-blue-700">
                عدد المعاهد المستهدفة:{" "}
                {
                  institutes.length
                }
              </div>
            </div>
          )}

          {targetMode ===
            "selected" && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-black text-slate-800">
                    اختاري المعاهد المستهدفة
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    تم اختيار{" "}
                    {
                      selectedInstitutes.length
                    }{" "}
                    معهد
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={
                      selectAllInstitutes
                    }
                    className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    تحديد الكل
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearSelectedInstitutes
                    }
                    className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto">
                {institutes.map(
                  (
                    institute
                  ) => {
                    const checked =
                      selectedInstitutes.includes(
                        institute.id
                      );

                    return (
                      <label
                        key={
                          institute.id
                        }
                        className={
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition " +
                          (checked
                            ? "border-slate-900 bg-white"
                            : "border-slate-200 bg-white hover:bg-slate-50")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={() =>
                            toggleInstitute(
                              institute.id
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />

                        <span className="text-sm font-semibold text-slate-700">
                          {
                            institute.name
                          }
                        </span>
                      </label>
                    );
                  }
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              عنوان التكليف
            </label>

            <input
              value={
                form.title
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    title:
                      event
                        .target
                        .value,
                  })
                )
              }
              placeholder="مثال: مراجعة جاهزية المعاهد للعام الدراسي"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              تفاصيل التكليف
            </label>

            <textarea
              value={
                form.description
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    description:
                      event
                        .target
                        .value,
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
                value={
                  form.priority
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      priority:
                        event
                          .target
                          .value,
                    })
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"
              >
                {priorityOptions.map(
                  (
                    priority
                  ) => (
                    <option
                      key={
                        priority.value
                      }
                      value={
                        priority.value
                      }
                    >
                      {
                        priority.label
                      }
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
                value={
                  form.due_date
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      due_date:
                        event
                          .target
                          .value,
                    })
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
            عدد المعاهد المستهدفة:{" "}
            <span className="text-slate-950">
              {
                targetCount
              }
            </span>
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
              onClick={
                createTask
              }
              disabled={
                saving
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} />

              {saving
                ? "جاري الإرسال..."
                : "إرسال التكليف"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
</AppShell>


);
}
