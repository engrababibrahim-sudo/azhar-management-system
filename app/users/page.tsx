"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Building2,
  CheckCircle2,
  Edit3,
  MonitorCog,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

/* =========================================================
   Types
========================================================= */

type Role =
  | "super_admin"
  | "director"
  | "deputy"
  | "it_admin"
  | "sheikh"
  | "institute_deputy"
  | "teacher"
  | "employee"
  | "parent"
  | "student";

type UserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  institute_id: string | null;
  directorate_id: string | null;
  institute_name?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

type Institute = {
  id: string;
  name: string;
  code?: string | null;
  directorate_id?: string | null;
  is_active?: boolean | null;
};

type CurrentUser = {
  id: string;
  role: Role;
  institute_id: string | null;
  directorate_id: string | null;
  full_name?: string | null;
};

type UsersApiResponse = {
  users?: UserRecord[];
  institutes?: Institute[];
  currentUser?: CurrentUser;
  error?: string;
  message?: string;
};

type UserForm = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  institute_id: string;
};

/* =========================================================
   Role labels
========================================================= */

const roleLabels: Record<Role, string> = {
  super_admin: "مدير الإدارة التعليمية",
  director: "مدير الإدارة التعليمية",
  deputy: "وكيل الإدارة التعليمية",
  it_admin: "مسؤول IT للمعهد",
  sheikh: "شيخ المعهد",
  institute_deputy: "وكيل شيخ المعهد",
  teacher: "مدرس",
  employee: "موظف",
  parent: "ولي أمر",
  student: "طالب",
};

/* =========================================================
   Role colors
========================================================= */

const roleColors: Record<Role, string> = {
  super_admin:
    "bg-purple-100 text-purple-700 border-purple-200",

  director:
    "bg-purple-100 text-purple-700 border-purple-200",

  deputy:
    "bg-indigo-100 text-indigo-700 border-indigo-200",

  it_admin:
    "bg-cyan-100 text-cyan-700 border-cyan-200",

  sheikh:
    "bg-emerald-100 text-emerald-700 border-emerald-200",

  institute_deputy:
    "bg-teal-100 text-teal-700 border-teal-200",

  teacher:
    "bg-blue-100 text-blue-700 border-blue-200",

  employee:
    "bg-slate-100 text-slate-700 border-slate-200",

  parent:
    "bg-orange-100 text-orange-700 border-orange-200",

  student:
    "bg-amber-100 text-amber-700 border-amber-200",
};

/* =========================================================
   Form default
========================================================= */

const emptyForm: UserForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  role: "sheikh",
  institute_id: "",
};

/* =========================================================
   Main Page
========================================================= */

export default function UsersPage() {
  return (
    <AppShell>
      <UsersManagement />
    </AppShell>
  );
}

/* =========================================================
   Users Management
========================================================= */

function UsersManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>(
    "all"
  );
  const [instituteFilter, setInstituteFilter] =
    useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] =
    useState<UserRecord | null>(null);

  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  /* =======================================================
     Determine current role
  ======================================================= */

  const isSuperAdmin =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "director";

  const isItAdmin = currentUser?.role === "it_admin";

  /* =======================================================
     Allowed roles
  ======================================================= */

  /*
   * مدير الإدارة:
   * يستطيع إنشاء الأدوار المطلوبة على مستوى الإدارة
   * والمعاهد، ومن ضمنها IT Admin.
   *
   * مسؤول IT:
   * يعمل داخل معهده فقط.
   * لا يستطيع إنشاء IT Admin آخر.
   * ولا يستطيع إنشاء الأدوار المركزية.
   */
  const selectableRoles = useMemo<Role[]>(() => {
    if (isSuperAdmin) {
      return [
        "super_admin",
        "deputy",
        "it_admin",
        "sheikh",
        "institute_deputy",
        "teacher",
        "employee",
      ];
    }

    if (isItAdmin) {
      return [
        "sheikh",
        "institute_deputy",
        "teacher",
        "employee",
      ];
    }

    return [];
  }, [isSuperAdmin, isItAdmin]);

  /* =======================================================
     Filter roles
  ======================================================= */

  const filterRoles = useMemo<Role[]>(() => {
    const found = new Set<Role>();

    users.forEach((user) => {
      found.add(user.role);
    });

    /*
     * نضيف الأدوار المتاحة للحساب الحالي حتى تظهر
     * في الفلتر حتى لو لم يوجد مستخدم منها بعد.
     */
    selectableRoles.forEach((role) => {
      found.add(role);
    });

    return Array.from(found);
  }, [users, selectableRoles]);

  /* =======================================================
     Get session token
  ======================================================= */

  const getAccessToken = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(
        "تعذر الحصول على جلسة تسجيل الدخول"
      );
    }

    if (!session?.access_token) {
      throw new Error(
        "انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى"
      );
    }

    return session.access_token;
  };

  /* =======================================================
     Load users
  ======================================================= */

  const loadData = async (
    showRefreshLoading = false
  ) => {
    try {
      if (showRefreshLoading) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const token = await getAccessToken();

      const response = await fetch(
        "/api/users/create",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const data: UsersApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "تعذر تحميل المستخدمين"
        );
      }

      setUsers(data.users || []);
      setInstitutes(data.institutes || []);

      if (data.currentUser) {
        setCurrentUser(data.currentUser);
      }
    } catch (err) {
      console.error("Users load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل المستخدمين"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     Initial load
  ======================================================= */

  useEffect(() => {
    loadData();
  }, []);

  /* =======================================================
     Current institute for IT Admin
  ======================================================= */

  const currentInstitute = useMemo(() => {
    if (!isItAdmin || !currentUser?.institute_id) {
      return null;
    }

    return (
      institutes.find(
        (institute) =>
          institute.id === currentUser.institute_id
      ) || null
    );
  }, [
    isItAdmin,
    currentUser?.institute_id,
    institutes,
  ]);

  /* =======================================================
     Filter users
  ======================================================= */

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        (user.full_name || "")
          .toLowerCase()
          .includes(keyword) ||
        (user.email || "")
          .toLowerCase()
          .includes(keyword) ||
        (user.phone || "")
          .toLowerCase()
          .includes(keyword);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      const matchesInstitute =
        instituteFilter === "all" ||
        user.institute_id === instituteFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesInstitute
      );
    });
  }, [
    users,
    search,
    roleFilter,
    instituteFilter,
  ]);

  /* =======================================================
     Statistics
  ======================================================= */

  const statistics = useMemo(() => {
    const total = users.length;

    const active = users.filter(
      (user) => user.is_active
    ).length;

    const inactive = users.filter(
      (user) => !user.is_active
    ).length;

    const itAdmins = users.filter(
      (user) => user.role === "it_admin"
    ).length;

    const sheikhs = users.filter(
      (user) => user.role === "sheikh"
    ).length;

    const teachers = users.filter(
      (user) => user.role === "teacher"
    ).length;

    const parents = users.filter(
      (user) => user.role === "parent"
    ).length;

    return {
      total,
      active,
      inactive,
      itAdmins,
      sheikhs,
      teachers,
      parents,
    };
  }, [users]);

  /* =======================================================
     Open create modal
  ======================================================= */

  const openCreateModal = () => {
    setEditingUser(null);

    const defaultRole =
      selectableRoles[0] || "sheikh";

    setForm({
      ...emptyForm,
      role: defaultRole,
      institute_id:
        isItAdmin && currentUser?.institute_id
          ? currentUser.institute_id
          : "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  /* =======================================================
     Open edit modal
  ======================================================= */

  const openEditModal = (user: UserRecord) => {
    /*
     * IT Admin لا يستطيع تعديل:
     * - مستخدم خارج معهده
     * - IT Admin آخر
     * - الأدوار المركزية
     */
    if (
      isItAdmin &&
      user.institute_id !==
        currentUser?.institute_id
    ) {
      setError(
        "لا يمكنك تعديل مستخدم من معهد آخر"
      );
      return;
    }

    if (
      isItAdmin &&
      user.role === "it_admin"
    ) {
      setError(
        "لا يمكنك تعديل مسؤول IT آخر"
      );
      return;
    }

    setEditingUser(user);

    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      role: user.role,
      institute_id: user.institute_id || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  /* =======================================================
     Close modal
  ======================================================= */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  /* =======================================================
     Form change
  ======================================================= */

  const updateForm = (
    field: keyof UserForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* =======================================================
     Role change
  ======================================================= */

  const handleRoleChange = (role: Role) => {
    /*
     * الأدوار المركزية لا تحتاج institute_id
     */
    const centralRole =
      role === "super_admin" ||
      role === "director" ||
      role === "deputy";

    setForm((previous) => ({
      ...previous,
      role,
      institute_id: centralRole
        ? ""
        : isItAdmin && currentUser?.institute_id
        ? currentUser.institute_id
        : previous.institute_id,
    }));
  };

  /* =======================================================
     Save user
  ======================================================= */

  const saveUser = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.full_name.trim()) {
      setError("من فضلك أدخل اسم المستخدم");
      return;
    }

    if (!form.email.trim()) {
      setError("من فضلك أدخل البريد الإلكتروني");
      return;
    }

    if (!editingUser && !form.password) {
      setError("من فضلك أدخل كلمة المرور");
      return;
    }

    if (
      !editingUser &&
      form.password.length < 6
    ) {
      setError(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      );
      return;
    }

    if (
      !selectableRoles.includes(form.role) &&
      !(
        editingUser &&
        isSuperAdmin &&
        form.role === "super_admin"
      )
    ) {
      setError(
        "ليس لديك صلاحية لاختيار هذا الدور"
      );
      return;
    }

    const instituteRequired =
      form.role === "it_admin" ||
      form.role === "sheikh" ||
      form.role === "institute_deputy" ||
      form.role === "teacher" ||
      form.role === "employee";

    if (
      instituteRequired &&
      !form.institute_id
    ) {
      setError(
        "يجب اختيار المعهد لهذا الدور"
      );
      return;
    }

    /*
     * IT Admin لا يستطيع تغيير المعهد.
     */
    if (
      isItAdmin &&
      form.institute_id !==
        currentUser?.institute_id
    ) {
      setError(
        "مسؤول IT يمكنه إدارة مستخدمي معهده فقط"
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getAccessToken();

      if (editingUser) {
        /* ==========================
           Update
        ========================== */

        const response = await fetch(
          "/api/users/create",
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: editingUser.id,
              full_name: form.full_name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim() || null,
              role: form.role,
              institute_id:
                form.institute_id || null,
              password:
                form.password.trim() || undefined,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "تعذر تعديل المستخدم"
          );
        }

        setSuccess(
          "تم تعديل بيانات المستخدم بنجاح"
        );
      } else {
        /* ==========================
           Create
        ========================== */

        const response = await fetch(
          "/api/users/create",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              full_name: form.full_name.trim(),
              email: form.email.trim(),
              password: form.password,
              phone: form.phone.trim() || null,
              role: form.role,
              institute_id:
                form.institute_id || null,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "تعذر إنشاء المستخدم"
          );
        }

        setSuccess(
          "تم إنشاء المستخدم بنجاح"
        );
      }

      await loadData(true);

      setShowModal(false);
      setEditingUser(null);
      setForm(emptyForm);
    } catch (err) {
      console.error("Save user error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ المستخدم"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     Toggle user status
  ======================================================= */

  const toggleUserStatus = async (
    user: UserRecord
  ) => {
    if (
      isItAdmin &&
      user.institute_id !==
        currentUser?.institute_id
    ) {
      setError(
        "لا يمكنك تعديل مستخدم من معهد آخر"
      );
      return;
    }

    if (
      isItAdmin &&
      user.role === "it_admin"
    ) {
      setError(
        "لا يمكنك تعديل حالة مسؤول IT"
      );
      return;
    }

    const action = user.is_active
      ? "تعطيل"
      : "تفعيل";

    const confirmed = window.confirm(
      `هل أنت متأكد من ${action} المستخدم "${user.full_name || user.email}"؟`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const token = await getAccessToken();

      const response = await fetch(
        "/api/users/create",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: user.id,
            is_active: !user.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "تعذر تحديث حالة المستخدم"
        );
      }

      setSuccess(
        user.is_active
          ? "تم تعطيل المستخدم بنجاح"
          : "تم تفعيل المستخدم بنجاح"
      );

      await loadData(true);
    } catch (err) {
      console.error(
        "Toggle user status error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحديث حالة المستخدم"
      );
    }
  };

  /* =======================================================
     Institute name
  ======================================================= */

  const getInstituteName = (
    user: UserRecord
  ) => {
    if (user.institute_name) {
      return user.institute_name;
    }

    if (!user.institute_id) {
      return "الإدارة التعليمية";
    }

    const institute = institutes.find(
      (item) =>
        item.id === user.institute_id
    );

    return (
      institute?.name ||
      "معهد غير معروف"
    );
  };

  /* =======================================================
     Loading
  ======================================================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[60vh] items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

          <p className="text-sm text-slate-500">
            جاري تحميل المستخدمين...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     Render
  ======================================================= */

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* =========================================
          Header
      ========================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            إدارة المستخدمين
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isItAdmin
              ? `إدارة مستخدمي ${currentInstitute?.name || "المعهد"}`
              : "إدارة مستخدمي الإدارة التعليمية والمعاهد التابعة لها"}
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            تحديث
          </button>

          {(isSuperAdmin || isItAdmin) && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              <UserPlus size={19} />

              إضافة مستخدم
            </button>
          )}

        </div>
      </div>

      {/* =========================================
          Scope Notice
      ========================================== */}

      {isItAdmin && (
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-800">

          <MonitorCog
            size={22}
            className="shrink-0"
          />

          <div>
            <div className="font-bold">
              صلاحيات مسؤول تكنولوجيا المعلومات
            </div>

            <div className="mt-1">
              يمكنك إدارة مستخدمي معهدك فقط، ولا يمكنك
              إدارة المستخدمين المركزيين أو مسؤول IT آخر.
            </div>
          </div>

        </div>
      )}

      {/* =========================================
          Error
      ========================================== */}

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* =========================================
          Success
      ========================================== */}

      {success && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">

          <div className="flex items-center gap-2">
            <CheckCircle2 size={19} />
            <span>{success}</span>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* =========================================
          Statistics
      ========================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">

        <StatCard
          title="إجمالي المستخدمين"
          value={statistics.total}
          icon={<Users size={22} />}
        />

        <StatCard
          title="نشط"
          value={statistics.active}
          icon={<CheckCircle2 size={22} />}
        />

        <StatCard
          title="غير نشط"
          value={statistics.inactive}
          icon={<Power size={22} />}
        />

        <StatCard
          title="مسؤولو IT"
          value={statistics.itAdmins}
          icon={<MonitorCog size={22} />}
        />

        <StatCard
          title="شيوخ المعاهد"
          value={statistics.sheikhs}
          icon={<ShieldCheck size={22} />}
        />

        <StatCard
          title="المدرسون"
          value={statistics.teachers}
          icon={<Users size={22} />}
        />

      </div>

      {/* =========================================
          Filters
      ========================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {/* Search */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              بحث
            </label>

            <div className="relative">

              <Search
                size={19}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="الاسم أو البريد أو الهاتف..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-11 pl-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              الدور
            </label>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value as
                    | "all"
                    | Role
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">
                جميع الأدوار
              </option>

              {filterRoles.map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>

          {/* Institute Filter */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              المعهد
            </label>

            <select
              value={
                isItAdmin
                  ? currentUser?.institute_id ||
                    "all"
                  : instituteFilter
              }
              disabled={isItAdmin}
              onChange={(event) =>
                setInstituteFilter(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600"
            >
              {isItAdmin ? (
                <option
                  value={
                    currentUser?.institute_id ||
                    "all"
                  }
                >
                  {currentInstitute?.name ||
                    "معهدي"}
                </option>
              ) : (
                <>
                  <option value="all">
                    جميع المعاهد
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
                </>
              )}
            </select>
          </div>

        </div>
      </div>

      {/* =========================================
          Users Table
      ========================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              المستخدمون
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              عدد النتائج:{" "}
              {filteredUsers.length}
            </p>
          </div>

          <Activity
            size={22}
            className="text-slate-400"
          />

        </div>

        {filteredUsers.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users size={27} />
            </div>

            <h3 className="text-base font-bold text-slate-700">
              لا يوجد مستخدمون
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              {isItAdmin
                ? "لا يوجد مستخدمون مسجلون حاليًا في معهدك أو لا توجد نتائج مطابقة للبحث."
                : "لا توجد نتائج مطابقة للفلاتر الحالية."}
            </p>

            {(isSuperAdmin || isItAdmin) && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <UserPlus size={18} />
                إضافة مستخدم
              </button>
            )}

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[950px] text-right">

              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">

                  <th className="px-5 py-4 text-xs font-bold text-slate-500">
                    المستخدم
                  </th>

                  <th className="px-5 py-4 text-xs font-bold text-slate-500">
                    البريد الإلكتروني
                  </th>

                  <th className="px-5 py-4 text-xs font-bold text-slate-500">
                    الدور
                  </th>

                  <th className="px-5 py-4 text-xs font-bold text-slate-500">
                    المعهد
                  </th>

                  <th className="px-5 py-4 text-xs font-bold text-slate-500">
                    الحالة
                  </th>

                  <th className="px-5 py-4 text-xs font-bold text-slate-500">
                    الإجراءات
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredUsers.map((user) => {

                  const canEdit =
                    isSuperAdmin ||
                    (
                      isItAdmin &&
                      user.institute_id ===
                        currentUser?.institute_id &&
                      user.role !== "it_admin"
                    );

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >

                      {/* User */}
                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <UserRound size={19} />
                          </div>

                          <div className="min-w-0">

                            <div className="truncate font-semibold text-slate-800">
                              {user.full_name ||
                                "بدون اسم"}
                            </div>

                            {user.phone && (
                              <div className="mt-1 text-xs text-slate-500">
                                {user.phone}
                              </div>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {user.email || "—"}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">

                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                            roleColors[user.role],
                          ].join(" ")}
                        >
                          {roleLabels[user.role]}
                        </span>

                      </td>

                      {/* Institute */}
                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">

                          <Building2
                            size={17}
                            className="text-slate-400"
                          />

                          <span>
                            {getInstituteName(
                              user
                            )}
                          </span>

                        </div>

                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            غير نشط
                          </span>
                        )}

                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">

                        {canEdit ? (
                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  user
                                )
                              }
                              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Edit3
                                size={15}
                              />
                              تعديل
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleUserStatus(
                                  user
                                )
                              }
                              className={[
                                "flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
                                user.is_active
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
                              ].join(" ")}
                            >
                              <Power
                                size={15}
                              />

                              {user.is_active
                                ? "تعطيل"
                                : "تفعيل"}
                            </button>

                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            غير متاح
                          </span>
                        )}

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =========================================
          Add / Edit Modal
      ========================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingUser
                    ? "تعديل المستخدم"
                    : "إضافة مستخدم جديد"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {isItAdmin
                    ? "إضافة أو تعديل مستخدم داخل المعهد فقط"
                    : "إدارة حسابات مستخدمي الإدارة والمعاهد"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            {/* Form */}
            <form
              onSubmit={saveUser}
              className="space-y-5 p-6"
            >

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  اسم المستخدم
                </label>

                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) =>
                    updateForm(
                      "full_name",
                      event.target.value
                    )
                  }
                  placeholder="اكتب الاسم بالكامل"
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Email + Phone */}
              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    البريد الإلكتروني
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="example@email.com"
                    disabled={
                      saving || !!editingUser
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    رقم الهاتف
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="01xxxxxxxxx"
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {editingUser
                    ? "كلمة مرور جديدة - اختياري"
                    : "كلمة المرور"}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateForm(
                      "password",
                      event.target.value
                    )
                  }
                  placeholder={
                    editingUser
                      ? "اتركها فارغة إذا لم ترد تغييرها"
                      : "6 أحرف على الأقل"
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الدور
                </label>

                <select
                  value={form.role}
                  onChange={(event) =>
                    handleRoleChange(
                      event.target.value as Role
                    )
                  }
                  disabled={
                    saving ||
                    (
                      !!editingUser &&
                      isItAdmin
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                >
                  {selectableRoles.map(
                    (role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {roleLabels[role]}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Institute */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  المعهد
                </label>

                <select
                  value={form.institute_id}
                  onChange={(event) =>
                    updateForm(
                      "institute_id",
                      event.target.value
                    )
                  }
                  disabled={
                    saving ||
                    isItAdmin ||
                    form.role ===
                      "super_admin" ||
                    form.role ===
                      "director" ||
                    form.role === "deputy"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                >
                  {form.role ===
                    "super_admin" ||
                  form.role === "director" ||
                  form.role === "deputy" ? (
                    <option value="">
                      الإدارة التعليمية
                    </option>
                  ) : (
                    <>
                      <option value="">
                        اختر المعهد
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
                    </>
                  )}
                </select>

                {isItAdmin && (
                  <p className="mt-2 text-xs text-cyan-700">
                    تم تثبيت المعهد على معهد مسؤول
                    تكنولوجيا المعلومات.
                  </p>
                )}
              </div>

              {/* Form Error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      {editingUser ? (
                        <Edit3 size={18} />
                      ) : (
                        <UserPlus size={18} />
                      )}

                      {editingUser
                        ? "حفظ التعديلات"
                        : "إضافة المستخدم"}
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Stat Card
========================================================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <div>
          <div className="text-xs font-medium text-slate-500">
            {title}
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

      </div>

    </div>
  );
}
