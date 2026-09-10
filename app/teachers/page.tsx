"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Users,
  Phone,
  BookOpen,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type Teacher = {
  id: string;
  full_name: string;
  teacher_code: string | null;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  qualification: string | null;
  is_active: boolean;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
  institute_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string;
};

export default function TeachersPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      if (profileData.role !== "sheikh") {
        alert("هذه الصفحة متاحة حاليًا لشيخ المعهد فقط.");
        return;
      }

      if (!profileData.institute_id) {
        throw new Error("حساب المستخدم غير مرتبط بمعهد.");
      }

      const { data: instituteData, error: instituteError } = await supabase
        .from("institutes")
        .select("id, name, code")
        .eq("id", profileData.institute_id)
        .single();

      if (instituteError) {
        throw instituteError;
      }

      setInstitute(instituteData);

      await loadTeachers(profileData.institute_id);
    } catch (error) {
      console.error("LOAD ERROR:", error);
      alert("حدث خطأ أثناء تحميل بيانات المعلمين.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTeachers(instituteId: string) {
    const { data, error } = await supabase
      .from("teachers")
      .select(
        "id, full_name, teacher_code, phone, email, specialization, qualification, is_active"
      )
      .eq("institute_id", instituteId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("TEACHERS ERROR:", error);
      throw error;
    }

    setTeachers(data || []);
  }

  async function addTeacher() {
    if (!fullName.trim()) {
      alert("من فضلك أدخلي اسم المعلم.");
      return;
    }

    if (!profile?.institute_id) {
      alert("لم يتم تحديد المعهد.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("teachers").insert({
        institute_id: profile.institute_id,
        full_name: fullName.trim(),
        teacher_code: teacherCode.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        specialization: specialization.trim() || null,
        qualification: qualification.trim() || null,
        is_active: true,
      });

      if (error) {
        console.error("INSERT TEACHER ERROR:", error);
        throw error;
      }

      alert("تم إضافة المعلم بنجاح.");

      setFullName("");
      setTeacherCode("");
      setPhone("");
      setEmail("");
      setSpecialization("");
      setQualification("");

      setShowForm(false);

      await loadTeachers(profile.institute_id);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء إضافة المعلم.");
    } finally {
      setSaving(false);
    }
  }

  const filteredTeachers = teachers.filter((teacher) => {
    const text = searchTerm.toLowerCase();

    return (
      teacher.full_name.toLowerCase().includes(text) ||
      (teacher.teacher_code || "").toLowerCase().includes(text) ||
      (teacher.phone || "").toLowerCase().includes(text) ||
      (teacher.specialization || "").toLowerCase().includes(text)
    );
  });

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <RefreshCw className="mx-auto mb-4 animate-spin" size={32} />
          <p className="text-slate-600">جاري تحميل بيانات المعلمين...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 text-slate-900"
    >
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة المعلمين</h1>

            <p className="text-sm text-slate-500 mt-1">
              {institute?.name || "المعهد"}
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-800"
          >
            <Plus size={20} />
            إضافة معلم
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">إجمالي المعلمين</p>

                <p className="text-3xl font-bold mt-2">
                  {teachers.length}
                </p>
              </div>

              <div className="bg-slate-100 p-3 rounded-xl">
                <Users size={28} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">المعلمون النشطون</p>

                <p className="text-3xl font-bold mt-2">
                  {teachers.filter((t) => t.is_active).length}
                </p>
              </div>

              <div className="bg-slate-100 p-3 rounded-xl">
                <BookOpen size={28} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">كود المعهد</p>

                <p className="text-2xl font-bold mt-2">
                  {institute?.code || "-"}
                </p>
              </div>

              <div className="bg-slate-100 p-3 rounded-xl">
                <Users size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <div className="relative">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المعلم أو الكود أو التخصص أو الهاتف..."
              className="w-full border rounded-xl py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">قائمة المعلمين</h2>

              <p className="text-sm text-slate-500 mt-1">
                المعلمون التابعون للمعهد الحالي
              </p>
            </div>

            <button
              onClick={loadData}
              className="border px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50"
            >
              <RefreshCw size={18} />
              تحديث
            </button>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users
                size={45}
                className="mx-auto mb-4 text-slate-300"
              />

              <p className="font-semibold">
                لا توجد بيانات معلمين مطابقة للبحث.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4">المعلم</th>
                    <th className="p-4">الكود</th>
                    <th className="p-4">التخصص</th>
                    <th className="p-4">المؤهل</th>
                    <th className="p-4">الهاتف</th>
                    <th className="p-4">الحالة</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="font-semibold">
                          {teacher.full_name}
                        </div>

                        {teacher.email && (
                          <div className="text-xs text-slate-400 mt-1">
                            {teacher.email}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {teacher.teacher_code || "-"}
                      </td>

                      <td className="p-4">
                        {teacher.specialization || "-"}
                      </td>

                      <td className="p-4">
                        {teacher.qualification || "-"}
                      </td>

                      <td className="p-4">
                        {teacher.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone size={16} />
                            {teacher.phone}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="p-4">
                        {teacher.is_active ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            غير نشط
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">إضافة معلم جديد</h2>

                <p className="text-sm text-slate-500 mt-1">
                  إضافة المعلم إلى المعهد الحالي
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  اسم المعلم *
                </label>

                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  كود المعلم
                </label>

                <input
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  placeholder="مثال: T-1002"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  رقم الهاتف
                </label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  البريد الإلكتروني
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  التخصص
                </label>

                <input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="مثال: اللغة العربية"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  المؤهل
                </label>

                <input
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="مثال: ليسانس لغة عربية"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-3 rounded-xl border hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                onClick={addTeacher}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ المعلم"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}