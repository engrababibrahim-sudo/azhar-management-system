"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  UserPlus,
  Pencil,
  Power,
  RefreshCw,
  X,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
} from "lucide-react";

import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Role =
  | "super_admin"
  | "director"
  | "deputy"
  | "sheikh"
  | "institute_deputy"
  | "employee"
  | "teacher"
  | "parent"
  | "student";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  directorate_id: string | null;
  institute_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  directorate_id: string | null;
};

/*
|--------------------------------------------------------------------------
| أسماء الأدوار
|--------------------------------------------------------------------------
*/

const roleLabels: Record<Role, string> = {
  super_admin: "مدير الإدارة التعليمية",
  director: "مدير الإدارة التعليمية (قديم)",
  deputy: "وكيل الإدارة التعليمية",
  sheikh: "شيخ المعهد",
  institute_deputy: "وكيل شيخ المعهد",
  employee: "موظف",
  teacher: "مدرس",
  parent: "ولي أمر",
  student: "طالب",
};

const roleColors: Record<Role, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  director: "bg-gray-100 text-gray-700",
  deputy: "bg-indigo-100 text-indigo-800",
  sheikh: "bg-blue-100 text-blue-800",
  institute_deputy: "bg-cyan-100 text-cyan-800",
  employee: "bg-gray-100 text-gray-800",
  teacher: "bg-green-100 text-green-800",
  parent: "bg-emerald-100 text-emerald-800",
  student: "bg-orange-100 text-orange-800",
};

/*
|--------------------------------------------------------------------------
| الأدوار المسموح بإضافتها
|--------------------------------------------------------------------------
*/

const selectableRoles: {
  value: Role;
  label: string;
}[] = [
  {
    value: "super_admin",
    label: "مدير الإدارة التعليمية",
  },
  {
    value: "deputy",
    label: "وكيل الإدارة التعليمية",
  },
  {
    value: "sheikh",
    label: "شيخ المعهد",
  },
  {
    value: "institute_deputy",
    label: "وكيل شيخ المعهد",
  },
  {
    value: "employee",
    label: "موظف",
  },
  {
    value: "teacher",
    label: "مدرس",
  },
  {
    value: "parent",
    label: "ولي أمر",
  },
  {
    value: "student",
    label: "طالب",
  },
];

/*
|--------------------------------------------------------------------------
| أدوار الفلتر
|--------------------------------------------------------------------------
*/

const filterRoles: {
  value: string;
  label: string;
}[] = [
  {
    value: "super_admin",
    label: "مدير الإدارة التعليمية",
  },
  {
    value: "deputy",
    label: "وكيل الإدارة التعليمية",
  },
  {
    value: "sheikh",
    label: "شيخ المعهد",
  },
  {
    value: "institute_deputy",
    label: "وكيل شيخ المعهد",
  },
  {
    value: "employee",
    label: "موظف",
  },
  {
    value: "teacher",
    label: "مدرس",
  },
  {
    value: "parent",
    label: "ولي أمر",
  },
  {
    value: "student",
    label: "طالب",
  },
];

/*
|--------------------------------------------------------------------------
| الصفحة
|--------------------------------------------------------------------------
*/

export default function UsersPage() {
  return (
    <AppShell>
      <UsersManagement />
    </AppShell>
  );
}

/*
|--------------------------------------------------------------------------
| إدارة المستخدمين
|--------------------------------------------------------------------------
*/

function UsersManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);

  const [currentUserRole, setCurrentUserRole] =
    useState<Role | null>(null);

  const [currentAuthUserId, setCurrentAuthUserId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [instituteFilter, setInstituteFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);

  const [editingUser, setEditingUser] =
    useState<Profile | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    role: "employee" as Role,
    institute_id: "",
    is_active: true,
  });

  const [message, setMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | تحميل البيانات
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      /*
      |--------------------------------------------------------------------------
      | المستخدم الحالي
      |--------------------------------------------------------------------------
      */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("يجب تسجيل الدخول أولًا");
        setLoading(false);
        return;
      }

      setCurrentAuthUserId(user.id);

      /*
      |--------------------------------------------------------------------------
      | بيانات المستخدم الحالي
      |--------------------------------------------------------------------------
      */

      const {
        data: currentProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role, directorate_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !currentProfile) {
        console.error(profileError);

        setMessage(
          "لم يتم العثور على بيانات المستخدم الحالي"
        );

        setLoading(false);
        return;
      }

      const role = currentProfile.role as Role;

      /*
      |--------------------------------------------------------------------------
      | صلاحية الدخول
      |--------------------------------------------------------------------------
      */

      if (
        role !== "super_admin" &&
        role !== "director"
      ) {
        setMessage(
          "ليس لديك صلاحية الوصول إلى إدارة المستخدمين"
        );

        setLoading(false);
        return;
      }

      setCurrentUserRole(role);

      const directorateId =
        currentProfile.directorate_id;

      /*
      |--------------------------------------------------------------------------
      | تحميل المعاهد التابعة للإدارة
      |--------------------------------------------------------------------------
      */

      let institutesQuery = supabase
        .from("institutes")
        .select(
          "id, name, code, directorate_id"
        )
        .order("name");

      if (directorateId) {
        institutesQuery =
          institutesQuery.eq(
            "directorate_id",
            directorateId
          );
      }

      const {
        data: institutesData,
        error: institutesError,
      } = await institutesQuery;

      if (institutesError) {
        console.error(institutesError);

        setMessage(
          "حدث خطأ أثناء تحميل المعاهد"
        );

        setLoading(false);
        return;
      }

      const loadedInstitutes =
        (institutesData || []) as Institute[];

      setInstitutes(loadedInstitutes);

      const instituteIds =
        loadedInstitutes.map(
          (institute) => institute.id
        );

      /*
      |--------------------------------------------------------------------------
      | تحميل المستخدمين الأساسيين للإدارة
      |--------------------------------------------------------------------------
      |
      | يشمل:
      | super_admin
      | director القديم
      | deputy
      | sheikh
      | institute_deputy
      | employee
      | teacher
      |
      */

      const {
        data: directUsers,
        error: directUsersError,
      } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          phone,
          email,
          role,
          directorate_id,
          institute_id,
          is_active,
          created_at,
          updated_at
          `
        )
        .eq(
          "directorate_id",
          directorateId
        )
        .order("full_name");

      if (directUsersError) {
        console.error(directUsersError);

        setMessage(
          "حدث خطأ أثناء تحميل مستخدمي الإدارة"
        );

        setLoading(false);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | تحميل الطلاب التابعين لمعاهد الإدارة
      |--------------------------------------------------------------------------
      |
      | نحتاج هذه البيانات حتى نعرف:
      | - أولياء الأمور المرتبطين بهذه المعاهد
      | - الطلاب التابعين لهذه الإدارة
      |
      */

      let relatedUsers: Profile[] = [];

      if (instituteIds.length > 0) {
        const {
          data: studentsData,
          error: studentsError,
        } = await supabase
          .from("students")
          .select(
            `
            id,
            parent_id,
            institute_id
            `
          )
          .in(
            "institute_id",
            instituteIds
          );

        if (studentsError) {
          console.error(
            "students lookup error:",
            studentsError
          );
        } else {
          const students =
            studentsData || [];

          /*
          |--------------------------------------------------------------------------
          | الطلاب
          |--------------------------------------------------------------------------
          */

          const studentIds =
            students.map(
              (student) => student.id
            );

          /*
          |--------------------------------------------------------------------------
          | أولياء الأمور
          |--------------------------------------------------------------------------
          */

          const parentIds = Array.from(
            new Set(
              students
                .map(
                  (student) =>
                    student.parent_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
            )
          );

          /*
          |--------------------------------------------------------------------------
          | جلب الطلاب من profiles
          |--------------------------------------------------------------------------
          */

          if (studentIds.length > 0) {
            const {
              data: studentProfiles,
              error: studentProfilesError,
            } = await supabase
              .from("profiles")
              .select(
                `
                id,
                full_name,
                phone,
                email,
                role,
                directorate_id,
                institute_id,
                is_active,
                created_at,
                updated_at
                `
              )
              .in(
                "id",
                studentIds
              );

            if (!studentProfilesError) {
              relatedUsers.push(
                ...((studentProfiles ||
                  []) as Profile[])
              );
            } else {
              console.error(
                studentProfilesError
              );
            }
          }

          /*
          |--------------------------------------------------------------------------
          | جلب أولياء الأمور
          |--------------------------------------------------------------------------
          */

          if (parentIds.length > 0) {
            const {
              data: parentProfiles,
              error: parentProfilesError,
            } = await supabase
              .from("profiles")
              .select(
                `
                id,
                full_name,
                phone,
                email,
                role,
                directorate_id,
                institute_id,
                is_active,
                created_at,
                updated_at
                `
              )
              .in(
                "id",
                parentIds
              );

            if (!parentProfilesError) {
              relatedUsers.push(
                ...((parentProfiles ||
                  []) as Profile[])
              );
            } else {
              console.error(
                parentProfilesError
              );
            }
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | دمج المستخدمين بدون تكرار
      |--------------------------------------------------------------------------
      */

      const allUsersMap =
        new Map<string, Profile>();

      [
        ...((directUsers ||
          []) as Profile[]),
        ...relatedUsers,
      ].forEach((profile) => {
        allUsersMap.set(
          profile.id,
          profile
        );
      });

      const allUsers =
        Array.from(
          allUsersMap.values()
        ).sort((a, b) =>
          a.full_name.localeCompare(
            b.full_name,
            "ar"
          )
        );

      setUsers(allUsers);
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ غير متوقع"
      );
    }

    setLoading(false);
  }

  /*
  |--------------------------------------------------------------------------
  | فلترة المستخدمين
  |--------------------------------------------------------------------------
  */

  const filteredUsers = useMemo(() => {
    const search =
      searchTerm
        .trim()
        .toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.full_name
          .toLowerCase()
          .includes(search) ||
        (user.email || "")
          .toLowerCase()
          .includes(search) ||
        (user.phone || "")
          .toLowerCase()
          .includes(search);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      const matchesInstitute =
        instituteFilter === "all" ||
        user.institute_id ===
          instituteFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesInstitute
      );
    });
  }, [
    users,
    searchTerm,
    roleFilter,
    instituteFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | الإحصائيات
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    return {
      total: users.length,

      active: users.filter(
        (u) => u.is_active !== false
      ).length,

      inactive: users.filter(
        (u) => u.is_active === false
      ).length,

      sheikhs: users.filter(
        (u) => u.role === "sheikh"
      ).length,

      teachers: users.filter(
        (u) => u.role === "teacher"
      ).length,

      parents: users.filter(
        (u) => u.role === "parent"
      ).length,
    };
  }, [users]);

  /*
  |--------------------------------------------------------------------------
  | اسم المعهد
  |--------------------------------------------------------------------------
  */

  function getInstituteName(
    instituteId: string | null
  ) {
    if (!instituteId) {
      return "—";
    }

    const institute =
      institutes.find(
        (item) =>
          item.id === instituteId
      );

    return institute
      ? institute.name
      : "غير محدد";
  }

  /*
  |--------------------------------------------------------------------------
  | فتح إضافة مستخدم
  |--------------------------------------------------------------------------
  */

  function openAddModal() {
    setEditingUser(null);

    setForm({
      full_name: "",
      phone: "",
      email: "",
      role: "employee",
      institute_id: "",
      is_active: true,
    });

    setMessage("");
    setShowModal(true);
  }

  /*
  |--------------------------------------------------------------------------
  | فتح تعديل مستخدم
  |--------------------------------------------------------------------------
  */

  function openEditModal(
    user: Profile
  ) {
    setEditingUser(user);

    setForm({
      full_name:
        user.full_name || "",

      phone:
        user.phone || "",

      email:
        user.email || "",

      role: user.role,

      institute_id:
        user.institute_id || "",

      is_active:
        user.is_active !== false,
    });

    setMessage("");
    setShowModal(true);
  }

  /*
  |--------------------------------------------------------------------------
  | إغلاق النافذة
  |--------------------------------------------------------------------------
  */

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingUser(null);
  }

  /*
  |--------------------------------------------------------------------------
  | حفظ المستخدم
  |--------------------------------------------------------------------------
  */

  async function saveUser() {
    if (!form.full_name.trim()) {
      setMessage(
        "يرجى إدخال اسم المستخدم"
      );

      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user: currentAuthUser },
      } = await supabase.auth.getUser();

      if (!currentAuthUser) {
        setMessage(
          "انتهت جلسة تسجيل الدخول"
        );

        setSaving(false);
        return;
      }

      const {
        data: currentProfile,
      } = await supabase
        .from("profiles")
        .select(
          "role, directorate_id"
        )
        .eq(
          "id",
          currentAuthUser.id
        )
        .maybeSingle();

      if (!currentProfile) {
        setMessage(
          "تعذر التحقق من صلاحيات المستخدم"
        );

        setSaving(false);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | تعديل مستخدم
      |--------------------------------------------------------------------------
      */

      if (editingUser) {
        const updateData = {
          full_name:
            form.full_name.trim(),

          phone:
            form.phone.trim() || null,

          email:
            form.email.trim() || null,

          role: form.role,

          institute_id:
            form.institute_id || null,

          is_active:
            form.is_active,

          updated_at:
            new Date().toISOString(),
        };

        const {
          error,
        } = await supabase
          .from("profiles")
          .update(updateData)
          .eq(
            "id",
            editingUser.id
          );

        if (error) {
          console.error(error);

          setMessage(
            "حدث خطأ أثناء تحديث بيانات المستخدم"
          );

          setSaving(false);
          return;
        }

        setMessage(
          "تم تحديث بيانات المستخدم بنجاح ✅"
        );

        setShowModal(false);
        setEditingUser(null);

        await loadData();
      } else {
        /*
        |--------------------------------------------------------------------------
        | إضافة مستخدم جديد
        |--------------------------------------------------------------------------
        */

        setMessage(
          "إضافة حساب دخول جديد تحتاج إلى إنشاء مستخدم في Supabase Auth. سننفذها في خطوة إنشاء المستخدمين."
        );

        setSaving(false);
        return;
      }
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ غير متوقع"
      );
    }

    setSaving(false);
  }

  /*
  |--------------------------------------------------------------------------
  | تفعيل / تعطيل المستخدم
  |--------------------------------------------------------------------------
  */

  async function toggleUserStatus(
    user: Profile
  ) {
    if (
      currentAuthUserId &&
      user.id === currentAuthUserId
    ) {
      setMessage(
        "لا يمكن تعطيل حساب المستخدم الحالي"
      );

      return;
    }

    const newStatus =
      user.is_active === false;

    const confirmed =
      window.confirm(
        newStatus
          ? `هل تريد تفعيل المستخدم "${user.full_name}"؟`
          : `هل تريد تعطيل المستخدم "${user.full_name}"؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("profiles")
        .update({
          is_active:
            newStatus,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          user.id
        );

      if (error) {
        console.error(error);

        setMessage(
          "تعذر تغيير حالة المستخدم"
        );

        return;
      }

      setMessage(
        newStatus
          ? "تم تفعيل المستخدم بنجاح ✅"
          : "تم تعطيل المستخدم بنجاح ✅"
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ غير متوقع"
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | شاشة التحميل
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw
              className="mx-auto animate-spin mb-4 text-blue-600"
              size={36}
            />

            <p className="text-gray-600">
              جاري تحميل المستخدمين...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | الواجهة
  |--------------------------------------------------------------------------
  */

  return (
    <AppShell>
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">

            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                إدارة المستخدمين
              </h1>

              <p className="text-gray-500 mt-2">
                إدارة مستخدمي الإدارة التعليمية والمعاهد التابعة لها
              </p>
            </div>

            <div className="flex gap-3">

              <button
                type="button"
                onClick={loadData}
                className="flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-xl font-semibold"
              >
                <RefreshCw size={19} />
                تحديث
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold"
              >
                <UserPlus size={19} />
                إضافة مستخدم
              </button>

            </div>
          </div>

          {/* Message */}

          {message && (
            <div className="mb-6 bg-white border border-blue-200 text-blue-700 rounded-xl p-4">
              {message}
            </div>
          )}

          {/* Statistics */}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">

            <StatCard
              title="إجمالي المستخدمين"
              value={statistics.total}
              icon={<Users size={21} />}
            />

            <StatCard
              title="نشط"
              value={statistics.active}
              icon={<ShieldCheck size={21} />}
            />

            <StatCard
              title="غير نشط"
              value={statistics.inactive}
              icon={<Power size={21} />}
            />

            <StatCard
              title="الشيوخ"
              value={statistics.sheikhs}
              icon={<Building2 size={21} />}
            />

            <StatCard
              title="المدرسون"
              value={statistics.teachers}
              icon={<Users size={21} />}
            />

            <StatCard
              title="أولياء الأمور"
              value={statistics.parents}
              icon={<Users size={21} />}
            />

          </div>

          {/* Filters */}

          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Search */}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  بحث
                </label>

                <div className="relative">

                  <Search
                    size={19}
                    className="absolute right-3 top-3 text-gray-400"
                  />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    placeholder="الاسم أو البريد أو الهاتف..."
                    className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>
              </div>

              {/* Role Filter */}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الدور
                </label>

                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="all">
                    جميع الأدوار
                  </option>

                  {filterRoles.map(
                    (role) => (
                      <option
                        key={
                          role.value
                        }
                        value={
                          role.value
                        }
                      >
                        {role.label}
                      </option>
                    )
                  )}

                </select>
              </div>

              {/* Institute Filter */}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  المعهد
                </label>

                <select
                  value={instituteFilter}
                  onChange={(e) =>
                    setInstituteFilter(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="all">
                    جميع المعاهد
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
              </div>

            </div>
          </div>

          {/* Users Table */}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            <div className="p-6 border-b">

              <h2 className="text-xl font-bold text-gray-800">
                المستخدمون
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                عدد النتائج:{" "}
                {filteredUsers.length}
              </p>

            </div>

            {filteredUsers.length ===
            0 ? (
              <div className="text-center py-16 text-gray-500">
                لا توجد بيانات مطابقة
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="text-right px-6 py-4">
                        المستخدم
                      </th>

                      <th className="text-right px-6 py-4">
                        الدور
                      </th>

                      <th className="text-right px-6 py-4">
                        المعهد
                      </th>

                      <th className="text-center px-6 py-4">
                        الحالة
                      </th>

                      <th className="text-center px-6 py-4">
                        الإجراءات
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y">

                    {filteredUsers.map(
                      (user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50"
                        >

                          <td className="px-6 py-5">

                            <div className="font-semibold text-gray-800">
                              {
                                user.full_name
                              }
                            </div>

                            <div className="flex flex-col gap-1 mt-1 text-sm text-gray-500">

                              {user.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={14} />
                                  {
                                    user.email
                                  }
                                </span>
                              )}

                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} />
                                  {
                                    user.phone
                                  }
                                </span>
                              )}

                            </div>

                          </td>

                          <td className="px-6 py-5">

                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                                roleColors[
                                  user.role
                                ] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {
                                roleLabels[
                                  user.role
                                ] ||
                                user.role
                              }
                            </span>

                          </td>

                          <td className="px-6 py-5 text-gray-600">
                            {getInstituteName(
                              user.institute_id
                            )}
                          </td>

                          <td className="px-6 py-5 text-center">

                            {user.is_active !==
                            false ? (
                              <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                                <span className="w-2 h-2 bg-green-600 rounded-full" />
                                نشط
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                                <span className="w-2 h-2 bg-red-600 rounded-full" />
                                غير نشط
                              </span>
                            )}

                          </td>

                          <td className="px-6 py-5">

                            <div className="flex justify-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    user
                                  )
                                }
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                title="تعديل"
                              >
                                <Pencil
                                  size={18}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleUserStatus(
                                    user
                                  )
                                }
                                className={`p-2 rounded-lg ${
                                  user.is_active !==
                                  false
                                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                                    : "bg-green-50 text-green-700 hover:bg-green-100"
                                }`}
                                title={
                                  user.is_active !==
                                  false
                                    ? "تعطيل"
                                    : "تفعيل"
                                }
                              >
                                <Power
                                  size={18}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* Modal */}

      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">

            {/* Modal Header */}

            <div className="flex items-center justify-between px-6 py-5 border-b">

              <div>

                <h2 className="text-xl font-bold text-gray-800">
                  {editingUser
                    ? "تعديل المستخدم"
                    : "إضافة مستخدم"}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {editingUser
                    ? "تعديل بيانات المستخدم وصلاحياته"
                    : "إضافة مستخدم جديد للنظام"}
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={21} />
              </button>

            </div>

            {/* Modal Body */}

            <div className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Full Name */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الاسم الكامل *
                  </label>

                  <input
                    type="text"
                    value={
                      form.full_name
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          full_name:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* Email */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          email:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* Phone */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الهاتف
                  </label>

                  <input
                    type="text"
                    value={
                      form.phone
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          phone:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* Role */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الدور
                  </label>

                  <select
                    value={
                      form.role
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          role: e.target
                            .value as Role,
                        })
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    {editingUser?.role ===
                      "director" && (
                      <option value="director">
                        مدير الإدارة التعليمية (قديم)
                      </option>
                    )}

                    {selectableRoles.map(
                      (role) => (
                        <option
                          key={
                            role.value
                          }
                          value={
                            role.value
                          }
                        >
                          {
                            role.label
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* Institute */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    المعهد
                  </label>

                  <select
                    value={
                      form.institute_id
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          institute_id:
                            e.target
                              .value,
                        })
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="">
                      بدون معهد
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

                </div>

                {/* Active */}

                <div className="md:col-span-2">

                  <label className="flex items-center gap-3 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        form.is_active
                      }
                      onChange={(e) =>
                        setForm(
                          (current) => ({
                            ...current,
                            is_active:
                              e.target
                                .checked,
                          })
                        )
                      }
                      className="w-5 h-5"
                    />

                    <span className="font-semibold text-gray-700">
                      المستخدم نشط
                    </span>

                  </label>

                </div>

              </div>

              {/* Actions */}

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={
                    saveUser
                  }
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingUser
                    ? "حفظ التعديلات"
                    : "إضافة المستخدم"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}
    </AppShell>
  );
}

/*
|--------------------------------------------------------------------------
| بطاقة الإحصائيات
|--------------------------------------------------------------------------
*/

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
    <div className="bg-white rounded-2xl shadow-sm p-5">

      <div className="flex items-center gap-3">

        <div className="text-blue-600">
          {icon}
        </div>

        <div>

          <p className="text-gray-500 text-sm">
            {title}
          </p>

          <p className="text-2xl font-bold text-gray-800">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}
