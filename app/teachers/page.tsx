
"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Users,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string;
};

type Teacher = {
  id: string;
  institute_id: string;
  full_name: string;
  teacher_code: string | null;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  qualification: string | null;
  is_active: boolean;
  created_at: string;
};

export default function TeachersPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [selectedInstitute, setSelectedInstitute] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const [fullName, setFullName] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      loadTeachers();
    }
  }, [profile, selectedInstitute]);

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, institute_id, directorate_id"
        )
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);

      /*
       * شيخ / نائب / موظف:
       * يرى مدرسين المعهد المرتبط بحسابه فقط.
       */
      if (
        data.role === "sheikh" ||
        data.role === "deputy" ||
        data.role === "employee"
      ) {
        if (!data.institute_id) {
          throw new Error("الحساب غير مرتبط بمعهد.");
        }

        const { data: institute, error: instituteError } =
          await supabase
            .from("institutes")
            .select("id, name, code")
            .eq("id", data.institute_id)
            .single();

        if (instituteError) throw instituteError;

        setInstitutes([institute]);
        setSelectedInstitute(institute.id);
      } else {
        /*
         * المدير / super_admin:
         * يرى المعاهد التابعة للإدارة التعليمية.
         */
        let query = supabase
          .from("institutes")
          .select("id, name, code")
          .order("name");

        if (
          data.role !== "super_admin" &&
          data.directorate_id
        ) {
          query = query.eq(
            "directorate_id",
            data.directorate_id
          );
        }

        const {
          data: instituteData,
          error: institutesError,
        } = await query;

        if (institutesError) throw institutesError;

        setInstitutes(instituteData || []);

        if (instituteData?.length === 1) {
          setSelectedInstitute(instituteData[0].id);
        }
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحميل بيانات المستخدم."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTeachers() {
    if (!profile) return;

    setLoadingTeachers(true);
    setMessage("");

    try {
      let query = supabase
        .from("teachers")
        .select(
          "id, institute_id, full_name, teacher_code, phone, email, specialization, qualification, is_active, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      /*
       * شيخ / نائب / موظف:
       * يتم تقييد النتائج بمعهد الحساب.
       */
      if (
        profile.role === "sheikh" ||
        profile.role === "deputy" ||
        profile.role === "employee"
      ) {
        if (!profile.institute_id) {
          setTeachers([]);
          return;
        }

        query = query.eq(
          "institute_id",
          profile.institute_id
        );
      } else if (selectedInstitute) {
        /*
         * المدير:
         * عند اختيار معهد، يعرض مدرسين هذا المعهد.
         */
        query = query.eq(
          "institute_id",
          selectedInstitute
        );
      } else if (
        profile.role !== "super_admin" &&
        profile.directorate_id
      ) {
        /*
         * المدير بدون اختيار معهد:
         * نحتاج الحصول على المعاهد التابعة للإدارة أولًا.
         */
        const { data: directorateInstitutes, error } =
          await supabase
            .from("institutes")
            .select("id")
            .eq(
              "directorate_id",
              profile.directorate_id
            );

        if (error) throw error;

        const instituteIds =
          directorateInstitutes?.map(
            (item) => item.id
          ) || [];

        if (instituteIds.length === 0) {
          setTeachers([]);
          return;
        }

        query = query.in(
          "institute_id",
          instituteIds
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setTeachers(data || []);
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء تحميل بيانات المدرسين."
      );
    } finally {
      setLoadingTeachers(false);
    }
  }

  function resetForm() {
    setFullName("");
    setTeacherCode("");
    setPhone("");
    setEmail("");
    setSpecialization("");
    setQualification("");
  }

  async function addTeacher() {
    if (!selectedInstitute) {
      alert("من فضلك اختاري المعهد أولًا.");
      return;
    }

    if (!fullName.trim()) {
      alert("اسم المعلم مطلوب.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("teachers")
        .insert({
          institute_id: selectedInstitute,
          full_name: fullName.trim(),
          teacher_code:
            teacherCode.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          specialization:
            specialization.trim() || null,
          qualification:
            qualification.trim() || null,
          is_active: true,
        });

      if (error) throw error;

      setShowAddModal(false);
      resetForm();

      await loadTeachers();

      setMessage("تم إضافة المدرس بنجاح.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إضافة المدرس."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredTeachers = teachers.filter(
    (teacher) => {
      const search = searchTerm
        .trim()
        .toLowerCase();

      if (!search) return true;

      return (
        teacher.full_name
          ?.toLowerCase()
          .includes(search) ||
        teacher.teacher_code
          ?.toLowerCase()
          .includes(search) ||
        teacher.phone
          ?.toLowerCase()
          .includes(search) ||
        teacher.email
          ?.toLowerCase()
          .includes(search) ||
        teacher.specialization
          ?.toLowerCase()
          .includes(search)
      );
    }
  );

  const selectedInstituteName =
    institutes.find(
      (institute) =>
        institute.id === selectedInstitute
    )?.name || "";

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <RefreshCw
            size={32}
            className="mx-auto mb-4 animate-spin"
          />

          <p className="text-slate-600">
            جاري تحميل بيانات المدرسين...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AppShell>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 text-slate-900"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* العنوان */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 text-green-700 p-3 rounded-2xl">
                  <GraduationCap size={30} />
                </div>

                <div>
                  <h1 className="text-3xl font-bold">
                    المدرسون
                  </h1>

                  <p className="text-slate-500 mt-1">
                    إدارة ومتابعة بيانات المدرسين
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadTeachers}
                disabled={loadingTeachers}
                className="bg-white border border-slate-200 px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-50"
              >
                <RefreshCw
                  size={18}
                  className={
                    loadingTeachers
                      ? "animate-spin"
                      : ""
                  }
                />

                تحديث
              </button>

              {(profile?.role === "sheikh" ||
                profile?.role === "deputy" ||
                profile?.role === "employee" ||
                profile?.role === "director" ||
                profile?.role === "super_admin") && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-800"
                >
                  <Plus size={19} />
                  إضافة مدرس
                </button>
              )}
            </div>
          </div>

          {/* رسالة */}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 mb-6">
              {message}
            </div>
          )}

          {/* اختيار المعهد للمدير */}
          {profile &&
            (profile.role === "director" ||
              profile.role === "super_admin") && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <label className="block font-bold mb-3">
                  المعهد
                </label>

                <select
                  value={selectedInstitute}
                  onChange={(event) =>
                    setSelectedInstitute(
                      event.target.value
                    )
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white"
                >
                  <option value="">
                    {profile.role === "super_admin"
                      ? "جميع المعاهد"
                      : "جميع معاهد الإدارة"}
                  </option>

                  {institutes.map((institute) => (
                    <option
                      key={institute.id}
                      value={institute.id}
                    >
                      {institute.name} -{" "}
                      {institute.code}
                    </option>
                  ))}
                </select>

                {!selectedInstitute && (
                  <p className="text-sm text-slate-500 mt-2">
                    يتم عرض المدرسين حسب نطاق صلاحيات الحساب.
                  </p>
                )}
              </div>
            )}

          {/* معلومات المعهد */}
          {selectedInstituteName && (
            <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                  <Users size={22} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    المعهد الحالي
                  </p>

                  <p className="font-bold text-lg">
                    {selectedInstituteName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    إجمالي المدرسين
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {teachers.length}
                  </p>
                </div>

                <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                  <Users size={25} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    المدرسون النشطون
                  </p>

                  <p className="text-3xl font-bold mt-2 text-green-600">
                    {
                      teachers.filter(
                        (teacher) =>
                          teacher.is_active
                      ).length
                    }
                  </p>
                </div>

                <div className="bg-green-100 text-green-700 p-3 rounded-xl">
                  <BookOpen size={25} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    نتائج البحث
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {filteredTeachers.length}
                  </p>
                </div>

                <div className="bg-purple-100 text-purple-700 p-3 rounded-xl">
                  <Search size={25} />
                </div>
              </div>
            </div>
          </div>

          {/* البحث */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
            <div className="relative">
              <Search
                size={20}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="ابحث باسم المدرس أو الكود أو الهاتف أو التخصص..."
                className="w-full border border-slate-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* جدول المدرسين */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                قائمة المدرسين
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                البيانات المعروضة يتم تحميلها مباشرة من جدول
                المدرسين في قاعدة البيانات.
              </p>
            </div>

            {loadingTeachers ? (
              <div className="p-12 text-center">
                <RefreshCw
                  size={30}
                  className="mx-auto mb-3 animate-spin"
                />

                <p className="text-slate-500">
                  جاري تحميل المدرسين...
                </p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-12 text-center">
                <Users
                  size={50}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h3 className="text-lg font-bold text-slate-700">
                  لا يوجد مدرسون
                </h3>

                <p className="text-slate-500 mt-2">
                  عند استيراد مدرسين من صفحة استيراد البيانات
                  سيظهرون هنا تلقائيًا.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-4">
                        كود المعلم
                      </th>

                      <th className="p-4">
                        اسم المعلم
                      </th>

                      <th className="p-4">
                        الهاتف
                      </th>

                      <th className="p-4">
                        البريد الإلكتروني
                      </th>

                      <th className="p-4">
                        التخصص
                      </th>

                      <th className="p-4">
                        المؤهل
                      </th>

                      <th className="p-4">
                        الحالة
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTeachers.map(
                      (teacher) => (
                        <tr
                          key={teacher.id}
                          className="border-b last:border-b-0 hover:bg-slate-50"
                        >
                          <td className="p-4 font-medium">
                            {teacher.teacher_code ||
                              "-"}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 text-green-700 p-2 rounded-xl">
                                <GraduationCap
                                  size={18}
                                />
                              </div>

                              <span className="font-semibold">
                                {teacher.full_name}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            {teacher.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone
                                  size={16}
                                  className="text-slate-400"
                                />

                                {teacher.phone}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="p-4">
                            {teacher.email ? (
                              <div className="flex items-center gap-2">
                                <Mail
                                  size={16}
                                  className="text-slate-400"
                                />

                                {teacher.email}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="p-4">
                            {teacher.specialization ||
                              "-"}
                          </td>

                          <td className="p-4">
                            {teacher.qualification ||
                              "-"}
                          </td>

                          <td className="p-4">
                            {teacher.is_active ? (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                                نشط
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                                غير نشط
                              </span>
                            )}
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

        {/* إضافة مدرس */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    إضافة مدرس جديد
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {selectedInstituteName}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="p-2 rounded-xl hover:bg-slate-100 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-semibold mb-2">
                    اسم المعلم *
                  </label>

                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="اسم المعلم"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    كود المعلم
                  </label>

                  <input
                    value={teacherCode}
                    onChange={(event) =>
                      setTeacherCode(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="TCH-001"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    الهاتف
                  </label>

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="01xxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    البريد الإلكتروني
                  </label>

                  <input
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="teacher@example.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    التخصص
                  </label>

                  <input
                    value={specialization}
                    onChange={(event) =>
                      setSpecialization(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="اللغة العربية"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    المؤهل
                  </label>

                  <input
                    value={qualification}
                    onChange={(event) =>
                      setQualification(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="ليسانس..."
                  />
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="px-5 py-3 rounded-xl border"
                >
                  إلغاء
                </button>

                <button
                  onClick={addTeacher}
                  disabled={saving}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <RefreshCw
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  حفظ المدرس
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

