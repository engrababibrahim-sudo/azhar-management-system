"use client";

import {
  Activity,
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Users,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  role: string;
  full_name: string | null;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  institute_type: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean | null;
};

type FormData = {
  name: string;
  code: string;
  institute_type: string;
  director_name: string;
  student_count: string;
  teacher_count: string;
  is_active: boolean;
};

const emptyForm: FormData = {
  name: "",
  code: "",
  institute_type: "",
  director_name: "",
  student_count: "0",
  teacher_count: "0",
  is_active: true,
};

export default function InstitutesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInstitute, setEditingInstitute] =
    useState<Institute | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadInstitutes(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("لم يتم العثور على المستخدم الحالي");
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "role, full_name, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error("لم يتم العثور على ملف المستخدم");
      }

      setProfile(profileData);

      if (
        profileData.role !== "director" &&
        profileData.role !== "deputy" &&
        profileData.role !== "super_admin"
      ) {
        throw new Error(
          "ليس لديك صلاحية الوصول إلى إدارة المعاهد"
        );
      }

      let query = supabase
        .from("institutes")
        .select(
          "id, name, code, institute_type, director_name, student_count, teacher_count, is_active"
        )
        .order("name", { ascending: true });

      if (
        profileData.role === "director" ||
        profileData.role === "deputy"
      ) {
        if (!profileData.directorate_id) {
          throw new Error(
            "الحساب غير مرتبط بإدارة تعليمية"
          );
        }

        query = query.eq(
          "directorate_id",
          profileData.directorate_id
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setInstitutes((data || []) as Institute[]);
    } catch (error: any) {
      console.error("Institutes page error:", error);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "خطأ غير معروف";

      setErrorMessage("خطأ قاعدة البيانات: " + message);
      setInstitutes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInstitutes();
  }, []);

  const filteredInstitutes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return institutes.filter((institute) => {
      const matchesSearch =
        !normalizedSearch ||
        institute.name.toLowerCase().includes(normalizedSearch) ||
        (institute.code || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (institute.director_name || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          institute.is_active !== false) ||
        (statusFilter === "inactive" &&
          institute.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [institutes, searchTerm, statusFilter]);

  const totalInstitutes = institutes.length;

  const activeInstitutes = institutes.filter(
    (item) => item.is_active !== false
  ).length;

  const inactiveInstitutes = institutes.filter(
    (item) => item.is_active === false
  ).length;

  const totalStudents = institutes.reduce(
    (sum, item) => sum + Number(item.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (sum, item) => sum + Number(item.teacher_count || 0),
    0
  );

  function openAddModal() {
    setEditingInstitute(null);
    setForm(emptyForm);
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  function openEditModal(institute: Institute) {
    setEditingInstitute(institute);

    setForm({
      name: institute.name || "",
      code: institute.code || "",
      institute_type: institute.institute_type || "",
      director_name: institute.director_name || "",
      student_count: String(institute.student_count || 0),
      teacher_count: String(institute.teacher_count || 0),
      is_active: institute.is_active !== false,
    });

    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingInstitute(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (saving) return;

    if (!form.name.trim()) {
      setErrorMessage("يرجى إدخال اسم المعهد");
      return;
    }

    if (!form.code.trim()) {
      setErrorMessage("يرجى إدخال كود المعهد");
      return;
    }

    if (!profile) {
      setErrorMessage("لم يتم تحميل بيانات المستخدم");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingInstitute) {
        const { error } = await supabase
          .from("institutes")
          .update({
            name: form.name.trim(),
            code: form.code.trim(),
            institute_type:
              form.institute_type.trim() || null,
            director_name:
              form.director_name.trim() || null,
            student_count:
              Number(form.student_count) || 0,
            teacher_count:
              Number(form.teacher_count) || 0,
            is_active: form.is_active,
          })
          .eq("id", editingInstitute.id);

        if (error) {
          throw error;
        }

        setSuccessMessage(
          "تم تعديل بيانات المعهد بنجاح"
        );
      } else {
        if (!profile.directorate_id) {
          throw new Error(
            "الحساب غير مرتبط بإدارة تعليمية"
          );
        }

        const { error } = await supabase
          .from("institutes")
          .insert({
            name: form.name.trim(),
            code: form.code.trim(),
            institute_type:
              form.institute_type.trim() || null,
            director_name:
              form.director_name.trim() || null,
            student_count:
              Number(form.student_count) || 0,
            teacher_count:
              Number(form.teacher_count) || 0,
            is_active: form.is_active,
            directorate_id: profile.directorate_id,
          });

        if (error) {
          throw error;
        }

        setSuccessMessage(
          "تم إضافة المعهد بنجاح"
        );
      }

      await loadInstitutes(true);

      setTimeout(() => {
        setModalOpen(false);
        setEditingInstitute(null);
        setForm(emptyForm);
        setSuccessMessage("");
      }, 700);
    } catch (error: any) {
      console.error("Save institute error:", error);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "حدث خطأ أثناء حفظ البيانات";

      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleInstitute(institute: Institute) {
    const nextStatus = institute.is_active === false;

    const confirmed = window.confirm(
      nextStatus
        ? "هل تريد تفعيل هذا المعهد؟"
        : "هل تريد إيقاف هذا المعهد؟"
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("institutes")
        .update({
          is_active: nextStatus,
        })
        .eq("id", institute.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        nextStatus
          ? "تم تفعيل المعهد بنجاح"
          : "تم إيقاف المعهد بنجاح"
      );

      await loadInstitutes(true);
    } catch (error: any) {
      console.error("Toggle institute error:", error);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "حدث خطأ أثناء تحديث حالة المعهد";

      setErrorMessage(message);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link
                  href="/"
                  className="hover:text-slate-900"
                >
                  الرئيسية
                </Link>

                <span>/</span>

                <span>إدارة المعاهد</span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                إدارة المعاهد
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                إدارة ومتابعة المعاهد التابعة للإدارة التعليمية
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadInstitutes(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />

                تحديث
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus size={18} />
                إضافة معهد
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle
                  size={21}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                  <div className="font-bold text-red-800">
                    حدث خطأ
                  </div>

                  <div className="mt-1 break-words text-sm text-red-700">
                    {errorMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  size={21}
                  className="text-emerald-600"
                />

                <div className="font-semibold text-emerald-800">
                  {successMessage}
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    إجمالي المعاهد
                  </div>

                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {totalInstitutes.toLocaleString("ar-EG")}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Building2 size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    المعاهد النشطة
                  </div>

                  <div className="mt-2 text-3xl font-black text-emerald-600">
                    {activeInstitutes.toLocaleString("ar-EG")}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    إجمالي الطلاب
                  </div>

                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {totalStudents.toLocaleString("ar-EG")}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    إجمالي المدرسين
                  </div>

                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {totalTeachers.toLocaleString("ar-EG")}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <UserRound size={21} />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="ابحث باسم المعهد أو الكود أو اسم الشيخ..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="all">كل الحالات</option>
                <option value="active">المعاهد النشطة</option>
                <option value="inactive">المعاهد غير النشطة</option>
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                عرض{" "}
                <strong className="text-slate-800">
                  {filteredInstitutes.length}
                </strong>{" "}
                من{" "}
                <strong className="text-slate-800">
                  {institutes.length}
                </strong>{" "}
                معهد
              </span>

              {(searchTerm || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="font-semibold text-slate-700 hover:text-slate-950"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>
          ) : filteredInstitutes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Building2 size={28} />
              </div>

              <h2 className="mt-5 text-lg font-black text-slate-900">
                لا توجد معاهد
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                لا توجد بيانات مطابقة للبحث الحالي.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Plus size={18} />
                إضافة معهد جديد
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredInstitutes.map((institute) => {
                const active =
                  institute.is_active !== false;

                return (
                  <div
                    key={institute.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <div className="border-b border-slate-100 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <Building2 size={23} />
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate font-black text-slate-900">
                              {institute.name}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                              {institute.code
                                ? "كود: " + institute.code
                                : "بدون كود"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={
                            active
                              ? "shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                              : "shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                          }
                        >
                          {active ? "نشط" : "غير نشط"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-5">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Users size={14} />
                          الطلاب
                        </div>

                        <div className="mt-2 text-xl font-black text-slate-900">
                          {Number(
                            institute.student_count || 0
                          ).toLocaleString("ar-EG")}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <UserRound size={14} />
                          المدرسون
                        </div>

                        <div className="mt-2 text-xl font-black text-slate-900">
                          {Number(
                            institute.teacher_count || 0
                          ).toLocaleString("ar-EG")}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        {institute.institute_type && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              نوع المعهد
                            </span>

                            <span className="font-semibold text-slate-800">
                              {institute.institute_type}
                            </span>
                          </div>
                        )}

                        {institute.director_name && (
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-500">
                              شيخ المعهد
                            </span>

                            <span className="text-left font-semibold text-slate-800">
                              {institute.director_name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <Link
                          href={"/institutes/" + institute.id}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-950 px-2 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          <Eye size={15} />
                          التفاصيل
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(institute)
                          }
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Edit3 size={15} />
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleInstitute(institute)
                          }
                          className={
                            active
                              ? "inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                              : "inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          }
                        >
                          {active ? (
                            <XCircle size={15} />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}

                          {active ? "إيقاف" : "تفعيل"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Activity size={19} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  إدارة مركزية للمعاهد
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  البيانات المعروضة مرتبطة مباشرة بقاعدة البيانات،
                  ويمكن للإدارة إضافة المعاهد وتحديث بياناتها
                  ومتابعة حالتها من خلال هذه الصفحة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingInstitute
                    ? "تعديل بيانات المعهد"
                    : "إضافة معهد جديد"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  أدخل البيانات الأساسية للمعهد
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {successMessage}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    اسم المعهد *
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value,
                      })
                    }
                    placeholder="مثال: معهد نور الإسلام الابتدائي"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    كود المعهد *
                  </label>

                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        code: event.target.value,
                      })
                    }
                    placeholder="مثال: AZ-1004"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    نوع المعهد
                  </label>

                  <select
                    value={form.institute_type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        institute_type: event.target.value,
                      })
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="">اختر النوع</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="إعدادي">إعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                    <option value="إعدادي وثانوي">
                      إعدادي وثانوي
                    </option>
                    <option value="ابتدائي وإعدادي">
                      ابتدائي وإعدادي
                    </option>
                    <option value="متعدد المراحل">
                      متعدد المراحل
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    اسم شيخ المعهد
                  </label>

                  <input
                    type="text"
                    value={form.director_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        director_name:
                          event.target.value,
                      })
                    }
                    placeholder="مثال: الشيخ أحمد محمد"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    عدد الطلاب
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.student_count}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        student_count:
                          event.target.value,
                      })
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    عدد المدرسين
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.teacher_count}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        teacher_count:
                          event.target.value,
                      })
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          is_active:
                            event.target.checked,
                        })
                      }
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        المعهد نشط
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        يمكن إيقاف المعهد مؤقتًا دون حذف بياناته.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingInstitute
                        ? "حفظ التعديلات"
                        : "إضافة المعهد"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
