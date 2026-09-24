"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  UserRound,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
  Save,
} from "lucide-react";

import { supabase } from "../../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code: string | null;
  institute_type: string | null;
  educational_stage: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean;
};

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    institute_type: "",
    educational_stage: "",
    director_name: "",
    student_count: "0",
    teacher_count: "0",
  });

  async function loadInstitutes() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("institutes")
      .select(
        `
        id,
        name,
        code,
        institute_type,
        educational_stage,
        director_name,
        student_count,
        teacher_count,
        is_active
        `
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setError(error.message);
      setInstitutes([]);
    } else {
      setInstitutes(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInstitutes();
  }, []);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData({
      name: "",
      code: "",
      institute_type: "",
      educational_stage: "",
      director_name: "",
      student_count: "0",
      teacher_count: "0",
    });
  }

  async function handleAddInstitute(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("من فضلك أدخل اسم المعهد.");
      return;
    }

    if (!formData.code.trim()) {
      setError("من فضلك أدخل كود المعهد.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("يجب تسجيل الدخول أولًا.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, directorate_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        setError("لم يتم العثور على بيانات صلاحيات المستخدم.");
        return;
      }

      if (profile.role !== "director") {
        setError("هذه العملية متاحة لمدير الإدارة التعليمية فقط.");
        return;
      }

      if (!profile.directorate_id) {
        setError("لم يتم ربط حساب المدير بالإدارة التعليمية.");
        return;
      }

      const studentCount = Number(formData.student_count);
      const teacherCount = Number(formData.teacher_count);

      if (
        Number.isNaN(studentCount) ||
        studentCount < 0 ||
        Number.isNaN(teacherCount) ||
        teacherCount < 0
      ) {
        setError("أعداد الطلاب والمدرسين يجب أن تكون أرقامًا صحيحة.");
        return;
      }

      const { error: insertError } = await supabase
        .from("institutes")
        .insert({
          directorate_id: profile.directorate_id,
          name: formData.name.trim(),
          code: formData.code.trim(),
          institute_type: formData.institute_type || null,
          educational_stage: formData.educational_stage || null,
          director_name: formData.director_name.trim() || null,
          student_count: studentCount,
          teacher_count: teacherCount,
          is_active: true,
        });

      if (insertError) {
        console.error("INSERT ERROR:", insertError);

        if (insertError.code === "23505") {
          setError("كود المعهد مستخدم بالفعل. من فضلك استخدم كودًا مختلفًا.");
        } else {
          setError(insertError.message);
        }

        return;
      }

      setSuccessMessage("تم إضافة المعهد بنجاح ✅");

      resetForm();
      setShowAddForm(false);

      await loadInstitutes();

      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ غير متوقع أثناء إضافة المعهد.");
    } finally {
      setSaving(false);
    }
  }

  const filteredInstitutes = institutes.filter((institute) => {
    const search = searchTerm.toLowerCase();

    return (
      institute.name?.toLowerCase().includes(search) ||
      institute.code?.toLowerCase().includes(search) ||
      institute.director_name?.toLowerCase().includes(search)
    );
  });

  const totalStudents = institutes.reduce(
    (total, institute) => total + (institute.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (total, institute) => total + (institute.teacher_count || 0),
    0
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-800"
    >
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              إدارة المعاهد الأزهرية
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              الإدارة التعليمية الأزهرية
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowAddForm(true);
                setError("");
                setSuccessMessage("");
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={18} />
              إضافة معهد
            </button>

            <button
              onClick={loadInstitutes}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {/* Add Institute Form */}
        {showAddForm && (
          <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  إضافة معهد جديد
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أدخل بيانات المعهد ليتم تسجيله ضمن الإدارة التعليمية.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError("");
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddInstitute}>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                {/* Name */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    اسم المعهد *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="مثال: معهد نور الإسلام الابتدائي"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    كود المعهد *
                  </label>

                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleFormChange}
                    placeholder="مثال: AZ-1004"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    نوع المعهد
                  </label>

                  <select
                    name="institute_type"
                    value={formData.institute_type}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="">اختر النوع</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="إعدادي">إعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                    <option value="ابتدائي وإعدادي">
                      ابتدائي وإعدادي
                    </option>
                    <option value="إعدادي وثانوي">
                      إعدادي وثانوي
                    </option>
                    <option value="ابتدائي وإعدادي وثانوي">
                      ابتدائي وإعدادي وثانوي
                    </option>
                  </select>
                </div>

                {/* Stage */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    المرحلة التعليمية
                  </label>

                  <select
                    name="educational_stage"
                    value={formData.educational_stage}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="">اختر المرحلة</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="إعدادي">إعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                    <option value="متعدد المراحل">
                      متعدد المراحل
                    </option>
                  </select>
                </div>

                {/* Sheikh */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    اسم شيخ المعهد
                  </label>

                  <input
                    type="text"
                    name="director_name"
                    value={formData.director_name}
                    onChange={handleFormChange}
                    placeholder="اسم شيخ المعهد"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                {/* Students */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    عدد الطلاب
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="student_count"
                    value={formData.student_count}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                {/* Teachers */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    عدد المدرسين
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="teacher_count"
                    value={formData.teacher_count}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

              </div>

              {/* Form Error */}
              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} />

                    <p className="text-sm font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={18} />

                  {saving
                    ? "جاري الحفظ..."
                    : "حفظ المعهد"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowAddForm(false);
                    setError("");
                    resetForm();
                  }}
                  className="rounded-xl border px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي المعاهد
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {institutes.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <Building2 size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي الطلاب
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalStudents.toLocaleString("ar-EG")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <GraduationCap size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي المدرسين
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalTeachers.toLocaleString("ar-EG")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <Users size={25} />
              </div>
            </div>
          </div>

        </div>

        {/* Search */}
        <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="relative">
            <Search
              size={20}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المعهد أو الكود أو شيخ المعهد..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-12 pl-4 outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border bg-white p-12 text-center">
            <RefreshCw
              size={30}
              className="mx-auto animate-spin text-slate-400"
            />

            <p className="mt-4 text-slate-500">
              جاري تحميل بيانات المعاهد...
            </p>
          </div>
        )}

        {/* Error outside form */}
        {!loading && error && !showAddForm && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} />

              <div>
                <h2 className="font-bold">
                  حدث خطأ أثناء تحميل المعاهد
                </h2>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredInstitutes.length === 0 && (
            <div className="mt-8 rounded-2xl border bg-white p-12 text-center">
              <Building2
                size={45}
                className="mx-auto text-slate-300"
              />

              <h2 className="mt-4 text-lg font-bold">
                لا توجد معاهد
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                لم يتم العثور على معاهد مطابقة للبحث.
              </p>
            </div>
          )}

        {/* Institutes */}
        {!loading &&
          !error &&
          filteredInstitutes.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredInstitutes.map((institute) => (
                <div
                  key={institute.id}
                  className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  {/* Title */}
                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div className="rounded-xl bg-slate-100 p-3">
                        <Building2 size={22} />
                      </div>

                      <div>
                        <h2 className="font-bold">
                          {institute.name}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          الكود: {institute.code || "غير محدد"}
                        </p>
                      </div>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        institute.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {institute.is_active
                        ? "نشط"
                        : "غير نشط"}
                    </span>

                  </div>

                  {/* Info */}
                  <div className="mt-6 space-y-3">

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-500">
                        النوع
                      </span>

                      <span className="text-sm font-medium">
                        {institute.institute_type || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-500">
                        المرحلة
                      </span>

                      <span className="text-sm font-medium">
                        {institute.educational_stage || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-500">
                        شيخ المعهد
                      </span>

                      <span className="flex items-center gap-2 text-sm font-medium">
                        <UserRound size={16} />
                        {institute.director_name || "-"}
                      </span>
                    </div>

                  </div>

                  {/* Statistics */}
                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div className="rounded-xl border p-4 text-center">
                      <GraduationCap
                        size={20}
                        className="mx-auto"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        الطلاب
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {(institute.student_count || 0).toLocaleString(
                          "ar-EG"
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 text-center">
                      <Users
                        size={20}
                        className="mx-auto"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        المدرسون
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {(institute.teacher_count || 0).toLocaleString(
                          "ar-EG"
                        )}
                      </p>
                    </div>

                  </div>

                  {/* Open */}
                  <Link
                    href={`/institutes/${institute.id}`}
                    className="mt-5 block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    فتح لوحة المعهد
                  </Link>

                </div>
              ))}

            </div>
          )}

      </div>
    </main>
  );
}