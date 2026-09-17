"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  GraduationCap,
  X,
  Loader2,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  institute_id: string | null;
  directorate_id: string | null;
};

type ParentProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string;
};

type ClassItem = {
  id: string;
  name: string;
  grade_level: string | null;
  section: string | null;
};

type Student = {
  id: string;
  student_code: string | null;
  full_name: string;
  gender: string | null;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  class_id: string | null;
  parent_id: string | null;
  is_active: boolean;
};

export default function StudentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<ParentProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  const [showForm, setShowForm] = useState(false);

  // بيانات الطالب الجديد
  const [studentCode, setStudentCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [classId, setClassId] = useState("");

  // حساب ولي الأمر المرتبط
  const [parentId, setParentId] = useState("");

  // ==========================================
  // تحميل بيانات المستخدم والمعهد
  // ==========================================

  async function loadUserAndInstitute() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1 - معرفة المستخدم الحالي
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        throw new Error("لم يتم العثور على المستخدم المسجل الدخول.");
      }

      // 2 - جلب Profile الخاص بالمستخدم
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, institute_id, directorate_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(
          "تعذر تحميل بيانات المستخدم: " + profileError.message
        );
      }

      if (!profileData) {
        throw new Error("لم يتم العثور على ملف المستخدم.");
      }

      setProfile(profileData);

      // ==========================================
      // الشيخ
      // ==========================================

      if (profileData.role === "sheikh") {
        if (!profileData.institute_id) {
          throw new Error(
            "حساب الشيخ غير مرتبط بمعهد. يرجى مراجعة بيانات المستخدم."
          );
        }

        // 3 - جلب بيانات المعهد المرتبط بالشيخ
        const { data: instituteData, error: instituteError } =
          await supabase
            .from("institutes")
            .select("id, name, code")
            .eq("id", profileData.institute_id)
            .single();

        if (instituteError) {
          throw new Error(
            "تعذر تحميل بيانات المعهد: " + instituteError.message
          );
        }

        setInstitute(instituteData);

        // 4 - تحميل الفصول والطلاب
        await loadClassesAndStudents(profileData.institute_id);

        // 5 - تحميل حسابات أولياء الأمور
        await loadParents();

        return;
      }

      // ==========================================
      // المدير المركزي
      // ==========================================

      if (profileData.role === "director") {
        throw new Error(
          "حساب المدير سيستخدم لوحة الإدارة المركزية. صفحة الطلاب هنا مخصصة حاليًا لشيخ المعهد."
        );
      }

      throw new Error(
        "هذا الحساب ليس لديه صلاحية الدخول إلى صفحة الطلاب."
      );
    } catch (err: any) {
      console.error("LOAD ERROR:", err);
      setError(err.message || "حدث خطأ أثناء تحميل البيانات.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // تحميل حسابات أولياء الأمور
  // ==========================================

  async function loadParents() {
    const { data, error: parentsError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("role", "parent")
      .order("full_name");

    if (parentsError) {
      console.error("PARENTS LOAD ERROR:", parentsError);

      throw new Error(
        "تعذر تحميل حسابات أولياء الأمور: " +
          parentsError.message
      );
    }

    setParents(data || []);
  }

  // ==========================================
  // تحميل الفصول والطلاب
  // ==========================================

  async function loadClassesAndStudents(instituteId: string) {
    setError("");

    // الفصول
    const {
      data: classesData,
      error: classesError,
    } = await supabase
      .from("classes")
      .select("id, name, grade_level, section")
      .eq("institute_id", instituteId)
      .eq("is_active", true)
      .order("name");

    if (classesError) {
      throw new Error(
        "حدث خطأ أثناء تحميل الفصول: " + classesError.message
      );
    }

    setClasses(classesData || []);

    // الطلاب
    const {
      data: studentsData,
      error: studentsError,
    } = await supabase
      .from("students")
      .select(
        `
        id,
        student_code,
        full_name,
        gender,
        phone,
        guardian_name,
        guardian_phone,
        class_id,
        parent_id,
        is_active
      `
      )
      .eq("institute_id", instituteId)
      .order("full_name");

    if (studentsError) {
      throw new Error(
        "حدث خطأ أثناء تحميل الطلاب: " + studentsError.message
      );
    }

    setStudents(studentsData || []);
  }

  // ==========================================
  // تشغيل الصفحة
  // ==========================================

  useEffect(() => {
    loadUserAndInstitute();
  }, []);

  // ==========================================
  // الفلترة والبحث
  // ==========================================

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        student.full_name.toLowerCase().includes(search) ||
        (student.student_code || "").toLowerCase().includes(search) ||
        (student.phone || "").includes(search) ||
        (student.guardian_name || "")
          .toLowerCase()
          .includes(search);

      const matchesClass =
        selectedClass === "all" ||
        student.class_id === selectedClass;

      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  // ==========================================
  // اسم الفصل
  // ==========================================

  function getClassName(classId: string | null) {
    if (!classId) return "غير محدد";

    const classItem = classes.find(
      (item) => item.id === classId
    );

    return classItem?.name || "غير محدد";
  }

  // ==========================================
  // اسم ولي الأمر المرتبط
  // ==========================================

  function getParentName(parentId: string | null) {
    if (!parentId) return null;

    const parent = parents.find(
      (item) => item.id === parentId
    );

    return parent?.full_name || null;
  }

  // ==========================================
  // اختيار ولي الأمر
  // ==========================================

  function handleParentChange(value: string) {
    setParentId(value);

    if (!value) {
      return;
    }

    const selectedParent = parents.find(
      (parent) => parent.id === value
    );

    if (!selectedParent) {
      return;
    }

    // تعبئة بيانات ولي الأمر تلقائيًا
    setGuardianName(selectedParent.full_name || "");
    setGuardianPhone(selectedParent.phone || "");
  }

  // ==========================================
  // تنظيف النموذج
  // ==========================================

  function resetForm() {
    setStudentCode("");
    setStudentName("");
    setGender("");
    setPhone("");
    setGuardianName("");
    setGuardianPhone("");
    setClassId("");
    setParentId("");
  }

  // ==========================================
  // إضافة طالب
  // ==========================================

  async function handleAddStudent(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!profile?.institute_id) {
      setError("لم يتم تحديد المعهد المرتبط بالحساب.");
      return;
    }

    if (!studentName.trim()) {
      setError("من فضلك أدخل اسم الطالب.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } =
        await supabase
          .from("students")
          .insert({
            institute_id: profile.institute_id,
            class_id: classId || null,
            student_code: studentCode.trim() || null,
            full_name: studentName.trim(),
            gender: gender || null,
            phone: phone.trim() || null,
            guardian_name:
              guardianName.trim() || null,
            guardian_phone:
              guardianPhone.trim() || null,
            parent_id: parentId || null,
            is_active: true,
          })
          .select()
          .single();

      if (insertError) {
        throw new Error(
          "تعذر حفظ الطالب: " +
            insertError.message
        );
      }

      if (data) {
        setStudents((prev) => [
          ...prev,
          data as Student,
        ]);
      }

      setSuccess(
        parentId
          ? "تم حفظ الطالب وربطه بحساب ولي الأمر بنجاح."
          : "تم حفظ الطالب بنجاح."
      );

      resetForm();
      setShowForm(false);
    } catch (err: any) {
      console.error("INSERT ERROR:", err);

      setError(
        err.message ||
          "حدث خطأ أثناء حفظ الطالب."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // إعادة تحميل
  // ==========================================

  async function handleRefresh() {
    if (!profile?.institute_id) return;

    setLoading(true);
    setError("");

    try {
      await loadClassesAndStudents(
        profile.institute_id
      );

      await loadParents();

      setSuccess("تم تحديث البيانات.");
    } catch (err: any) {
      setError(
        err.message ||
          "حدث خطأ أثناء تحديث البيانات."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // واجهة التحميل
  // ==========================================

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" />

          <p className="mt-4 text-slate-600">
            جاري تحميل بيانات الطلاب...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // الواجهة الرئيسية
  // ==========================================

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <div className="flex items-center gap-3">

                <div className="bg-blue-100 p-3 rounded-xl">
                  <GraduationCap className="w-7 h-7 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    إدارة الطلاب
                  </h1>

                  <p className="text-sm text-slate-500 mt-1">
                    {institute?.name || "المعهد"}
                  </p>
                </div>

              </div>
            </div>

            <div className="flex gap-2">

              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>

              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                  resetForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                <Plus className="w-5 h-5" />
                إضافة طالب
              </button>

            </div>

          </div>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5">
            {success}
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  إجمالي الطلاب
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {students.length}
                </p>
              </div>

              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="w-7 h-7 text-blue-600" />
              </div>

            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  عدد الفصول
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {classes.length}
                </p>
              </div>

              <div className="bg-purple-100 p-3 rounded-xl">
                <GraduationCap className="w-7 h-7 text-purple-600" />
              </div>

            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  الطلاب النشطون
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {
                    students.filter(
                      (s) => s.is_active
                    ).length
                  }
                </p>
              </div>

              <div className="bg-green-100 p-3 rounded-xl">
                <Users className="w-7 h-7 text-green-600" />
              </div>

            </div>
          </div>

        </div>

        {/* SEARCH + FILTER */}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="relative">

              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="ابحث باسم الطالب أو الكود أو ولي الأمر..."
                className="w-full border border-slate-200 rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <select
              value={selectedClass}
              onChange={(e) =>
                setSelectedClass(e.target.value)
              }
              className="w-full border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">
                جميع الفصول
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>

          </div>

        </div>

        {/* STUDENTS TABLE */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="p-5 border-b border-slate-200">

            <h2 className="font-bold text-lg text-slate-800">
              قائمة الطلاب
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              عدد النتائج: {filteredStudents.length}
            </p>

          </div>

          {filteredStudents.length === 0 ? (

            <div className="text-center py-16">

              <Users className="w-14 h-14 mx-auto text-slate-300" />

              <h3 className="text-lg font-semibold text-slate-600 mt-4">
                لا يوجد طلاب
              </h3>

              <p className="text-slate-400 mt-2">
                ابدأ بإضافة أول طالب إلى المعهد.
              </p>

              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700"
              >
                إضافة طالب
              </button>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-right">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      الكود
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      اسم الطالب
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      الفصل
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      ولي الأمر
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      الحساب
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      الهاتف
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                      الحالة
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredStudents.map(
                    (student) => {

                      const linkedParent =
                        getParentName(
                          student.parent_id
                        );

                      return (
                        <tr
                          key={student.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {student.student_code || "-"}
                          </td>

                          <td className="px-5 py-4">

                            <div className="font-semibold text-slate-800">
                              {student.full_name}
                            </div>

                            {student.gender && (
                              <div className="text-xs text-slate-400 mt-1">
                                {student.gender}
                              </div>
                            )}

                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {getClassName(
                              student.class_id
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {student.guardian_name || "-"}
                          </td>

                          <td className="px-5 py-4">

                            {linkedParent ? (

                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <UserRound className="w-3.5 h-3.5" />
                                مرتبط
                              </span>

                            ) : (

                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                غير مرتبط
                              </span>

                            )}

                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {student.guardian_phone ||
                              student.phone ||
                              "-"}
                          </td>

                          <td className="px-5 py-4">

                            {student.is_active ? (

                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                نشط
                              </span>

                            ) : (

                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                غير نشط
                              </span>

                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* ADD STUDENT MODAL */}

      {showForm && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}

            <div className="flex items-center justify-between p-5 border-b border-slate-200">

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  إضافة طالب جديد
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {institute?.name}
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* Form */}

            <form
              onSubmit={handleAddStudent}
              className="p-5 space-y-5"
            >

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* الاسم */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    اسم الطالب *
                  </label>

                  <input
                    value={studentName}
                    onChange={(e) =>
                      setStudentName(e.target.value)
                    }
                    placeholder="أدخل اسم الطالب بالكامل"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />

                </div>

                {/* كود الطالب */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    كود الطالب
                  </label>

                  <input
                    value={studentCode}
                    onChange={(e) =>
                      setStudentCode(e.target.value)
                    }
                    placeholder="كود الطالب"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* الجنس */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الجنس
                  </label>

                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(e.target.value)
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="">
                      اختر
                    </option>

                    <option value="ذكر">
                      ذكر
                    </option>

                    <option value="أنثى">
                      أنثى
                    </option>

                  </select>

                </div>

                {/* الفصل */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الفصل
                  </label>

                  <select
                    value={classId}
                    onChange={(e) =>
                      setClassId(e.target.value)
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="">
                      اختر الفصل
                    </option>

                    {classes.map((item) => (

                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>

                    ))}

                  </select>

                  {classes.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      لا توجد فصول معرفة لهذا المعهد حاليًا.
                    </p>
                  )}

                </div>

                {/* ولي الأمر المرتبط */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">

                    حساب ولي الأمر

                  </label>

                  <select
                    value={parentId}
                    onChange={(e) =>
                      handleParentChange(
                        e.target.value
                      )
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="">
                      بدون ربط حاليًا
                    </option>

                    {parents.map((parent) => (

                      <option
                        key={parent.id}
                        value={parent.id}
                      >
                        {parent.full_name}
                        {parent.email
                          ? ` — ${parent.email}`
                          : ""}
                      </option>

                    ))}

                  </select>

                  {parents.length === 0 ? (

                    <p className="text-xs text-amber-600 mt-2">
                      لا توجد حسابات أولياء أمور متاحة حاليًا.
                      يمكن إضافة الحساب لاحقًا.
                    </p>

                  ) : (

                    <p className="text-xs text-slate-400 mt-2">
                      عند اختيار ولي الأمر سيتم ربط الطالب
                      بحسابه مباشرة.
                    </p>

                  )}

                </div>

                {/* هاتف الطالب */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    هاتف الطالب
                  </label>

                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="رقم الهاتف"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* اسم ولي الأمر */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    اسم ولي الأمر
                  </label>

                  <input
                    value={guardianName}
                    onChange={(e) =>
                      setGuardianName(e.target.value)
                    }
                    placeholder="اسم ولي الأمر"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* هاتف ولي الأمر */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    هاتف ولي الأمر
                  </label>

                  <input
                    value={guardianPhone}
                    onChange={(e) =>
                      setGuardianPhone(e.target.value)
                    }
                    placeholder="رقم هاتف ولي الأمر"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50"
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl"
                >

                  {saving && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {saving
                    ? "جاري الحفظ..."
                    : "حفظ الطالب"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
