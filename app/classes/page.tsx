"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Edit3,
  Loader2,
  Plus,
  Save,
  School,
  Users,
  X,
} from "lucide-react";

import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  id: string;
  role: string;
  institute_id: string | null;
  directorate_id: string | null;
  full_name: string | null;
  is_active: boolean;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  directorate_id: string | null;
};

type EducationalStage = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type Grade = {
  id: string;
  stage_id: string;
  name: string;
  code: string | null;
  sort_order: number;
  is_active: boolean;
};

type ClassItem = {
  id: string;
  institute_id: string;
  grade_id: string | null;
  name: string;
  academic_year: string;
  section: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type StudentCount = Record<string, number>;

const defaultForm = {
  stageId: "",
  gradeId: "",
  name: "",
  academicYear: "",
  section: "",
  capacity: "",
};

export default function ClassesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);

  const [stages, setStages] = useState<EducationalStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [studentCounts, setStudentCounts] = useState<StudentCount>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [form, setForm] = useState(defaultForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("");

  const isDirector = profile?.role === "director";

  const canManage =
    profile?.role === "sheikh" ||
    profile?.role === "deputy" ||
    profile?.role === "employee";

  const filteredFormGrades = useMemo(() => {
    if (!form.stageId) return [];

    return grades
      .filter(
        (grade) => grade.stage_id === form.stageId && grade.is_active === true
      )
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [grades, form.stageId]);

  const filteredGrades = useMemo(() => {
    if (!selectedStageFilter) return grades;

    return grades
      .filter(
        (grade) =>
          grade.stage_id === selectedStageFilter && grade.is_active === true
      )
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [grades, selectedStageFilter]);

  const visibleClasses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return classes.filter((item) => {
      const grade = grades.find((g) => g.id === item.grade_id);

      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.section || "").toLowerCase().includes(term) ||
        (item.academic_year || "").toLowerCase().includes(term) ||
        (grade?.name || "").toLowerCase().includes(term);

      const matchesStage =
        !selectedStageFilter ||
        grade?.stage_id === selectedStageFilter;

      const matchesGrade =
        !selectedGradeFilter || item.grade_id === selectedGradeFilter;

      return matchesSearch && matchesStage && matchesGrade;
    });
  }, [
    classes,
    grades,
    searchTerm,
    selectedStageFilter,
    selectedGradeFilter,
  ]);

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!form.stageId) {
      setForm((current) => ({
        ...current,
        gradeId: "",
      }));
      return;
    }

    const gradeStillValid = grades.some(
      (grade) =>
        grade.id === form.gradeId &&
        grade.stage_id === form.stageId &&
        grade.is_active
    );

    if (!gradeStillValid) {
      setForm((current) => ({
        ...current,
        gradeId: "",
      }));
    }
  }, [form.stageId, grades]);

  useEffect(() => {
    if (!selectedStageFilter) {
      setSelectedGradeFilter("");
      return;
    }

    const gradeStillValid = grades.some(
      (grade) =>
        grade.id === selectedGradeFilter &&
        grade.stage_id === selectedStageFilter &&
        grade.is_active
    );

    if (!gradeStillValid) {
      setSelectedGradeFilter("");
    }
  }, [selectedStageFilter, selectedGradeFilter, grades]);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("لم يتم العثور على المستخدم الحالي.");
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, role, institute_id, directorate_id, full_name, is_active"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error("لم يتم العثور على ملف المستخدم.");
      }

      setProfile(profileData);

      if (
        !["director", "sheikh", "deputy", "employee"].includes(
          profileData.role
        )
      ) {
        throw new Error("ليس لديك صلاحية الوصول إلى إدارة الفصول.");
      }

      let instituteQuery = supabase
        .from("institutes")
        .select("id, name, code, directorate_id");

      if (profileData.role !== "director") {
        if (!profileData.institute_id) {
          throw new Error("لم يتم ربط حسابك بمعهد.");
        }

        instituteQuery = instituteQuery.eq(
          "id",
          profileData.institute_id
        );
      } else if (profileData.directorate_id) {
        instituteQuery = instituteQuery.eq(
          "directorate_id",
          profileData.directorate_id
        );
      }

      const { data: instituteData, error: instituteError } =
        await instituteQuery.limit(1).maybeSingle();

      if (instituteError) {
        throw instituteError;
      }

      if (instituteData) {
        setInstitute(instituteData);
      }

      const { data: stagesData, error: stagesError } = await supabase
        .from("educational_stages")
        .select("id, name, code, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (stagesError) {
        throw stagesError;
      }

      setStages(stagesData || []);

      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select(
          "id, stage_id, name, code, sort_order, is_active"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (gradesError) {
        throw gradesError;
      }

      setGrades(gradesData || []);

      await loadClasses(profileData, instituteData || null);
    } catch (error) {
      console.error("Classes page error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحميل إدارة الفصول."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadClasses(
    currentProfile: Profile,
    currentInstitute: Institute | null
  ) {
    let query = supabase
      .from("classes")
      .select(
        "id, institute_id, grade_id, name, academic_year, section, capacity, is_active, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (currentProfile.role !== "director") {
      if (!currentProfile.institute_id) {
        setClasses([]);
        setStudentCounts({});
        return;
      }

      query = query.eq("institute_id", currentProfile.institute_id);
    } else if (currentProfile.directorate_id) {
      const { data: institutesData, error: institutesError } = await supabase
        .from("institutes")
        .select("id")
        .eq("directorate_id", currentProfile.directorate_id);

      if (institutesError) {
        throw institutesError;
      }

      const instituteIds = (institutesData || []).map(
        (item) => item.id
      );

      if (instituteIds.length === 0) {
        setClasses([]);
        setStudentCounts({});
        return;
      }

      query = query.in("institute_id", instituteIds);
    } else if (currentInstitute?.id) {
      query = query.eq("institute_id", currentInstitute.id);
    }

    const { data: classesData, error: classesError } = await query;

    if (classesError) {
      throw classesError;
    }

    const loadedClasses = classesData || [];

    setClasses(loadedClasses);

    await loadStudentCounts(loadedClasses);
  }

  async function loadStudentCounts(classItems: ClassItem[]) {
    if (classItems.length === 0) {
      setStudentCounts({});
      return;
    }

    const classIds = classItems.map((item) => item.id);

    const { data, error } = await supabase
      .from("students")
      .select("id, class_id")
      .in("class_id", classIds);

    if (error) {
      console.warn("Student counts could not be loaded:", error);
      setStudentCounts({});
      return;
    }

    const counts: StudentCount = {};

    (data || []).forEach((student) => {
      if (!student.class_id) return;

      counts[student.class_id] =
        (counts[student.class_id] || 0) + 1;
    });

    setStudentCounts(counts);
  }

  function openAddModal() {
    setEditingClass(null);
    setForm({
      ...defaultForm,
      academicYear: getDefaultAcademicYear(),
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowModal(true);
  }

  function openEditModal(item: ClassItem) {
    const grade = grades.find((g) => g.id === item.grade_id);

    setEditingClass(item);

    setForm({
      stageId: grade?.stage_id || "",
      gradeId: item.grade_id || "",
      name: item.name,
      academicYear: item.academic_year,
      section: item.section || "",
      capacity:
        item.capacity !== null && item.capacity !== undefined
          ? String(item.capacity)
          : "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingClass(null);
    setForm(defaultForm);
  }

  async function saveClass() {
    if (!canManage) {
      setErrorMessage("ليس لديك صلاحية إضافة أو تعديل الفصول.");
      return;
    }

    if (!profile?.institute_id) {
      setErrorMessage("حسابك غير مرتبط بمعهد.");
      return;
    }

    const className = form.name.trim();
    const academicYear = form.academicYear.trim();
    const section = form.section.trim();

    if (!form.gradeId) {
      setErrorMessage("اختاري الصف الدراسي.");
      return;
    }

    if (!className) {
      setErrorMessage("اكتبي اسم الفصل.");
      return;
    }

    if (!academicYear) {
      setErrorMessage("اكتبي العام الدراسي.");
      return;
    }

    let capacity: number | null = null;

    if (form.capacity.trim()) {
      const parsedCapacity = Number(form.capacity);

      if (
        !Number.isInteger(parsedCapacity) ||
        parsedCapacity <= 0
      ) {
        setErrorMessage("السعة يجب أن تكون رقمًا صحيحًا أكبر من صفر.");
        return;
      }

      capacity = parsedCapacity;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        institute_id: profile.institute_id,
        grade_id: form.gradeId,
        name: className,
        academic_year: academicYear,
        section: section || null,
        capacity,
        is_active: true,
      };

      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update(payload)
          .eq("id", editingClass.id)
          .eq("institute_id", profile.institute_id);

        if (error) {
          throw error;
        }

        setSuccessMessage("تم تحديث الفصل بنجاح.");
      } else {
        const { error } = await supabase
          .from("classes")
          .insert(payload);

        if (error) {
          throw error;
        }

        setSuccessMessage("تم إنشاء الفصل بنجاح.");
      }

      setShowModal(false);
      setEditingClass(null);
      setForm(defaultForm);

      await loadClasses(profile, institute);
    } catch (error) {
      console.error("Save class error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حفظ الفصل."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleClass(item: ClassItem) {
    if (!canManage) return;

    if (!profile?.institute_id) {
      setErrorMessage("حسابك غير مرتبط بمعهد.");
      return;
    }

    const nextStatus = !item.is_active;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase
        .from("classes")
        .update({
          is_active: nextStatus,
        })
        .eq("id", item.id)
        .eq("institute_id", profile.institute_id);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        nextStatus
          ? "تم تفعيل الفصل."
          : "تم تعطيل الفصل."
      );

      await loadClasses(profile, institute);
    } catch (error) {
      console.error("Toggle class error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث حالة الفصل."
      );
    }
  }

  function getDefaultAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();

    return `${year}/${year + 1}`;
  }

  function getStageName(stageId: string | null) {
    if (!stageId) return "غير محددة";

    return (
      stages.find((stage) => stage.id === stageId)?.name ||
      "غير محددة"
    );
  }

  function getGradeName(gradeId: string | null) {
    if (!gradeId) return "غير محدد";

    return (
      grades.find((grade) => grade.id === gradeId)?.name ||
      "غير محدد"
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <Loader2
              size={36}
              className="animate-spin text-emerald-600"
            />
            <p className="font-semibold">
              جاري تحميل إدارة الفصول...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (errorMessage && !profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h2 className="text-lg font-bold">
              تعذر فتح إدارة الفصول
            </h2>

            <p className="mt-2 text-sm">
              {errorMessage}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 rounded-3xl bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-600 p-5 text-white shadow-lg md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-emerald-100">
                <School size={20} />
                <span className="text-sm font-semibold">
                  إدارة الفصول
                </span>
              </div>

              <h1 className="text-2xl font-black md:text-3xl">
                إدارة الفصول الدراسية
              </h1>

              <p className="mt-2 text-sm text-emerald-50 md:text-base">
                {isDirector
                  ? "متابعة الفصول الدراسية التابعة للمعاهد"
                  : institute?.name || "المعهد"}
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-emerald-700 shadow-md transition hover:bg-emerald-50"
              >
                <Plus size={20} />
                إضافة فصل
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <BookOpen size={22} />
            </div>

            <p className="text-sm font-semibold text-slate-500">
              إجمالي الفصول
            </p>

            <p className="mt-1 text-3xl font-black text-slate-800">
              {classes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <School size={22} />
            </div>

            <p className="text-sm font-semibold text-slate-500">
              الفصول النشطة
            </p>

            <p className="mt-1 text-3xl font-black text-slate-800">
              {classes.filter((item) => item.is_active).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Users size={22} />
            </div>

            <p className="text-sm font-semibold text-slate-500">
              الطلاب المرتبطون بفصول
            </p>

            <p className="mt-1 text-3xl font-black text-slate-800">
              {Object.values(studentCounts).reduce(
                (sum, count) => sum + count,
                0
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <CalendarDays size={22} />
            </div>

            <p className="text-sm font-semibold text-slate-500">
              النتائج المعروضة
            </p>

            <p className="mt-1 text-3xl font-black text-slate-800">
              {visibleClasses.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                بحث
              </label>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="ابحث باسم الفصل أو القسم أو العام..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                المرحلة التعليمية
              </label>

              <select
                value={selectedStageFilter}
                onChange={(event) =>
                  setSelectedStageFilter(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">كل المراحل</option>

                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                الصف الدراسي
              </label>

              <select
                value={selectedGradeFilter}
                onChange={(event) =>
                  setSelectedGradeFilter(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">كل الصفوف</option>

                {filteredGrades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  قائمة الفصول
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  عدد النتائج: {visibleClasses.length}
                </p>
              </div>

              {institute && !isDirector && (
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  {institute.name}
                  {institute.code ? ` — ${institute.code}` : ""}
                </div>
              )}
            </div>
          </div>

          {visibleClasses.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BookOpen size={30} />
              </div>

              <h3 className="text-lg font-black text-slate-700">
                لا توجد فصول
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                لا توجد فصول مسجلة حاليًا. عند توفر الفصول الحقيقية
                للمعهد، يمكن لمسؤول المعهد إضافتها من خلال زر
                "إضافة فصل".
              </p>

              {canManage && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
                >
                  <Plus size={19} />
                  إضافة أول فصل
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50">
                    <tr className="text-right text-sm font-black text-slate-600">
                      <th className="px-5 py-4">
                        المرحلة
                      </th>
                      <th className="px-5 py-4">
                        الصف
                      </th>
                      <th className="px-5 py-4">
                        الفصل
                      </th>
                      <th className="px-5 py-4">
                        القسم
                      </th>
                      <th className="px-5 py-4">
                        العام الدراسي
                      </th>
                      <th className="px-5 py-4">
                        السعة
                      </th>
                      <th className="px-5 py-4">
                        الطلاب
                      </th>
                      <th className="px-5 py-4">
                        الحالة
                      </th>
                      {canManage && (
                        <th className="px-5 py-4">
                          الإجراءات
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleClasses.map((item) => {
                      const grade = grades.find(
                        (g) => g.id === item.grade_id
                      );

                      const count = studentCounts[item.id] || 0;

                      return (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {getStageName(grade?.stage_id || null)}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-800">
                            {grade?.name || "غير محدد"}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-slate-800">
                            {item.name}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {item.section || "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {item.academic_year}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {item.capacity ?? "—"}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {count}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                item.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.is_active
                                ? "نشط"
                                : "غير نشط"}
                            </span>
                          </td>

                          {canManage && (
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(item)
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                                  title="تعديل"
                                >
                                  <Edit3 size={17} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleClass(item)
                                  }
                                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                    item.is_active
                                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  {item.is_active
                                    ? "تعطيل"
                                    : "تفعيل"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="grid gap-4 p-4 md:hidden">
                {visibleClasses.map((item) => {
                  const grade = grades.find(
                    (g) => g.id === item.grade_id
                  );

                  const count = studentCounts[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-emerald-600">
                            {getStageName(grade?.stage_id || null)}
                          </p>

                          <h3 className="mt-1 text-lg font-black text-slate-800">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {grade?.name || "غير محدد"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.is_active
                            ? "نشط"
                            : "غير نشط"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            القسم
                          </p>
                          <p className="mt-1 font-bold text-slate-700">
                            {item.section || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            العام الدراسي
                          </p>
                          <p className="mt-1 font-bold text-slate-700">
                            {item.academic_year}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            السعة
                          </p>
                          <p className="mt-1 font-bold text-slate-700">
                            {item.capacity ?? "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            الطلاب
                          </p>
                          <p className="mt-1 font-bold text-slate-700">
                            {count}
                          </p>
                        </div>
                      </div>

                      {canManage && (
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(item)
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"
                          >
                            <Edit3 size={17} />
                            تعديل
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleClass(item)
                            }
                            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${
                              item.is_active
                                ? "bg-red-50 text-red-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {item.is_active
                              ? "تعطيل"
                              : "تفعيل"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  {editingClass
                    ? "تعديل الفصل"
                    : "إضافة فصل جديد"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  أدخلي بيانات الفصل الفعلية الخاصة بالمعهد.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Stage */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  المرحلة التعليمية
                </label>

                <select
                  value={form.stageId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stageId: event.target.value,
                      gradeId: "",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    اختر المرحلة التعليمية
                  </option>

                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  الصف الدراسي
                </label>

                <select
                  value={form.gradeId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gradeId: event.target.value,
                    }))
                  }
                  disabled={!form.stageId}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none disabled:bg-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    {form.stageId
                      ? "اختر الصف الدراسي"
                      : "اختر المرحلة أولًا"}
                  </option>

                  {filteredFormGrades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class name */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  اسم الفصل
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="مثال: فصل 1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Section */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  القسم
                  <span className="mr-1 text-xs font-normal text-slate-400">
                    (اختياري)
                  </span>
                </label>

                <input
                  type="text"
                  value={form.section}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      section: event.target.value,
                    }))
                  }
                  placeholder="مثال: أ"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Academic year */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  العام الدراسي
                </label>

                <input
                  type="text"
                  value={form.academicYear}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      academicYear: event.target.value,
                    }))
                  }
                  placeholder="مثال: 2026/2027"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  سعة الفصل
                  <span className="mr-1 text-xs font-normal text-slate-400">
                    (اختياري)
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      capacity: event.target.value,
                    }))
                  }
                  placeholder="مثال: 40"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={saveClass}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      {editingClass ? (
                        <Save size={19} />
                      ) : (
                        <Plus size={19} />
                      )}

                      {editingClass
                        ? "حفظ التعديلات"
                        : "إنشاء الفصل"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
