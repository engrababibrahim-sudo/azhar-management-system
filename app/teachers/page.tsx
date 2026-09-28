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
  Pencil,
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
  const [requestedInstituteId, setRequestedInstituteId] =
    useState<string | null | undefined>(undefined);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] =
    useState<Teacher | null>(null);

  const [fullName, setFullName] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] =
    useState("");
  const [qualification, setQualification] =
    useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /*
   * ============================================
   * قراءة المعهد المطلوب من الرابط
   * ============================================
   *
   * مثال:
   * /teachers?instituteId=xxxxxxxx
   *
   * لا نستخدم useSearchParams حتى لا يحدث
   * خطأ Next.js أثناء build / prerender.
   */
  function getRequestedInstituteFromUrl() {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    return params.get("instituteId");
  }

  useEffect(() => {
    const requestedId =
      getRequestedInstituteFromUrl();

    setRequestedInstituteId(requestedId);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  /*
   * بعد تحميل الـ profile:
   *
   * إذا كان هناك instituteId في الرابط،
   * يتم التحقق منه وتحميل المعهد المحدد فقط.
   */
  useEffect(() => {
    if (
      profile &&
      requestedInstituteId !== undefined
    ) {
      loadRequestedInstitute();
    }
  }, [profile, requestedInstituteId]);

  /*
   * تحميل المدرسين بعد تحديد المعهد.
   */
  useEffect(() => {
    if (
      profile &&
      requestedInstituteId !== undefined
    ) {
      loadTeachers();
    }
  }, [profile, selectedInstitute, requestedInstituteId]);

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
       * ============================================
       * حسابات المعهد
       * ============================================
       */
      if (
        data.role === "sheikh" ||
        data.role === "institute_deputy" ||
        data.role === "employee" ||
        data.role === "teacher" ||
        data.role === "it_admin"
      ) {
        if (!data.institute_id) {
          throw new Error(
            "هذا الحساب غير مرتبط بمعهد."
          );
        }

        const {
          data: institute,
          error: instituteError,
        } = await supabase
          .from("institutes")
          .select("id, name, code")
          .eq("id", data.institute_id)
          .single();

        if (instituteError) throw instituteError;

        setInstitutes([institute]);
        setSelectedInstitute(institute.id);

        return;
      }

      /*
       * ============================================
       * الحسابات المركزية
       * ============================================
       */
      let query = supabase
        .from("institutes")
        .select("id, name, code")
        .order("name");

      if (
        (data.role === "super_admin" ||
          data.role === "director" ||
          data.role === "deputy") &&
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

      /*
       * الحسابات المركزية تبدأ بعرض كل المعاهد
       * إذا لم يوجد instituteId في الرابط.
       */
      setSelectedInstitute("");
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

  /*
   * ============================================
   * تحميل المعهد المطلوب من الرابط
   * ============================================
   */
  async function loadRequestedInstitute() {
    if (!profile) return;

    /*
     * إذا لم يوجد معهد مطلوب في الرابط،
     * لا نفعل شيئًا.
     */
    if (!requestedInstituteId) {
      return;
    }

    /*
     * ============================================
     * حسابات المعهد
     * ============================================
     *
     * ممنوع تغيير المعهد عن طريق URL.
     */
    if (
      profile.role === "sheikh" ||
      profile.role === "institute_deputy" ||
      profile.role === "employee" ||
      profile.role === "teacher" ||
      profile.role === "it_admin"
    ) {
      if (
        !profile.institute_id ||
        requestedInstituteId !==
          profile.institute_id
      ) {
        setSelectedInstitute(
          profile.institute_id || ""
        );

        setMessage(
          "لا يمكنك الوصول إلى بيانات هذا المعهد."
        );

        return;
      }

      setSelectedInstitute(
        profile.institute_id
      );

      return;
    }

    /*
     * ============================================
     * الحسابات المركزية
     * ============================================
     */
    if (
      profile.role === "super_admin" ||
      profile.role === "director" ||
      profile.role === "deputy"
    ) {
      if (!profile.directorate_id) {
        setMessage(
          "الحساب غير مرتبط بإدارة تعليمية."
        );
        return;
      }

      /*
       * نتأكد أن المعهد تابع للإدارة
       * قبل السماح بعرض بياناته.
       */
      const { data: institute, error } =
        await supabase
          .from("institutes")
          .select(
            "id, name, code, directorate_id"
          )
          .eq("id", requestedInstituteId)
          .eq(
            "directorate_id",
            profile.directorate_id
          )
          .maybeSingle();

      if (error) {
        console.error(error);

        setMessage(
          "حدث خطأ أثناء التحقق من المعهد."
        );

        return;
      }

      if (!institute) {
        setMessage(
          "هذا المعهد غير تابع للإدارة التعليمية الحالية."
        );

        setSelectedInstitute("");
        return;
      }

      /*
       * المعهد صحيح وتابع للإدارة.
       */
      setSelectedInstitute(institute.id);

      /*
       * نتأكد أن المعهد موجود في القائمة.
       */
      setInstitutes((current) => {
        const exists = current.some(
          (item) => item.id === institute.id
        );

        if (exists) {
          return current;
        }

        return [
          ...current,
          {
            id: institute.id,
            name: institute.name,
            code: institute.code,
          },
        ];
      });
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
       * ==========================================
       * حسابات المعهد
       * ==========================================
       */
      if (
        profile.role === "sheikh" ||
        profile.role === "institute_deputy" ||
        profile.role === "employee" ||
        profile.role === "teacher" ||
        profile.role === "it_admin"
      ) {
        if (!profile.institute_id) {
          setTeachers([]);
          return;
        }

        query = query.eq(
          "institute_id",
          profile.institute_id
        );
      }

      /*
       * ==========================================
       * الحسابات المركزية
       * ==========================================
       */
      else if (
        profile.role === "super_admin" ||
        profile.role === "director" ||
        profile.role === "deputy"
      ) {
        /*
         * إذا تم فتح الصفحة من بطاقة معهد:
         *
         * /teachers?instituteId=xxxx
         *
         * نعرض مدرسين هذا المعهد فقط.
         */
        if (
          requestedInstituteId &&
          selectedInstitute
        ) {
          query = query.eq(
            "institute_id",
            selectedInstitute
          );
        }

        /*
         * إذا اختار المدير المعهد من القائمة.
         */
        else if (selectedInstitute) {
          query = query.eq(
            "institute_id",
            selectedInstitute
          );
        }

        /*
         * إذا لم يتم اختيار معهد:
         * عرض كل مدرسين معاهد الإدارة.
         */
        else {
          if (!profile.directorate_id) {
            setTeachers([]);
            return;
          }

          const {
            data: directorateInstitutes,
            error: directorateError,
          } = await supabase
            .from("institutes")
            .select("id")
            .eq(
              "directorate_id",
              profile.directorate_id
            );

          if (directorateError) {
            throw directorateError;
          }

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
      }

      const { data, error } =
        await query;

      if (error) throw error;

      setTeachers(data || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحميل بيانات المدرسين."
      );

      setTeachers([]);
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
    setIsActive(true);
    setEditingTeacher(null);
  }

  /*
   * ============================================
   * فتح نافذة إضافة مدرس
   * ============================================
   */
  function openAddTeacherModal() {
    if (
      profile?.role === "it_admin" ||
      profile?.role === "sheikh" ||
      profile?.role === "institute_deputy" ||
      profile?.role === "employee"
    ) {
      if (!profile.institute_id) {
        setMessage(
          "هذا الحساب غير مرتبط بمعهد."
        );
        return;
      }

      setSelectedInstitute(
        profile.institute_id
      );
    }

    /*
     * إذا فتح المدير الصفحة من بطاقة معهد،
     * يظل المعهد المحدد كما هو.
     */
    if (
      requestedInstituteId &&
      profile &&
      (
        profile.role === "super_admin" ||
        profile.role === "director" ||
        profile.role === "deputy"
      )
    ) {
      setSelectedInstitute(
        requestedInstituteId
      );
    }

    resetForm();
    setMessage("");
    setShowAddModal(true);
  }

  /*
   * ============================================
   * فتح نافذة تعديل مدرس
   * ============================================
   */
  function openEditTeacherModal(
    teacher: Teacher
  ) {
    /*
     * مسؤول IT لا يستطيع تعديل مدرس
     * من معهد آخر.
     */
    if (
      profile?.role === "it_admin" &&
      teacher.institute_id !==
        profile.institute_id
    ) {
      setMessage(
        "ليس لديك صلاحية تعديل هذا المدرس."
      );
      return;
    }

    /*
     * حسابات المعهد لا تعدل إلا داخل معهدها.
     */
    if (
      (
        profile?.role === "sheikh" ||
        profile?.role === "institute_deputy" ||
        profile?.role === "employee"
      ) &&
      teacher.institute_id !==
        profile.institute_id
    ) {
      setMessage(
        "ليس لديك صلاحية تعديل هذا المدرس."
      );
      return;
    }

    /*
     * الحسابات المركزية:
     * إذا كان هناك معهد محدد في الرابط،
     * يجب أن يكون المدرس تابعًا له.
     */
    if (
      (
        profile?.role === "super_admin" ||
        profile?.role === "director" ||
        profile?.role === "deputy"
      ) &&
      selectedInstitute &&
      teacher.institute_id !==
        selectedInstitute
    ) {
      setMessage(
        "المدرس لا يتبع المعهد المحدد."
      );
      return;
    }

    setEditingTeacher(teacher);

    setFullName(
      teacher.full_name || ""
    );

    setTeacherCode(
      teacher.teacher_code || ""
    );

    setPhone(
      teacher.phone || ""
    );

    setEmail(
      teacher.email || ""
    );

    setSpecialization(
      teacher.specialization || ""
    );

    setQualification(
      teacher.qualification || ""
    );

    setIsActive(
      teacher.is_active
    );

    setMessage("");
    setShowAddModal(true);
  }

  /*
   * ============================================
   * إضافة مدرس جديد
   * ============================================
   */
  async function addTeacher() {
    if (!profile) {
      alert(
        "بيانات المستخدم غير متاحة."
      );
      return;
    }

    let targetInstituteId = "";

    /*
     * حسابات المعهد:
     * تستخدم معهد الحساب فقط.
     */
    if (
      profile.role === "it_admin" ||
      profile.role === "sheikh" ||
      profile.role === "institute_deputy" ||
      profile.role === "employee"
    ) {
      if (!profile.institute_id) {
        alert(
          "الحساب غير مرتبط بمعهد."
        );
        return;
      }

      targetInstituteId =
        profile.institute_id;
    }

    /*
     * الحسابات المركزية:
     * تستخدم المعهد المختار.
     */
    else if (
      profile.role === "super_admin" ||
      profile.role === "director" ||
      profile.role === "deputy"
    ) {
      if (!selectedInstitute) {
        alert(
          "من فضلك اختاري المعهد أولًا."
        );
        return;
      }

      targetInstituteId =
        selectedInstitute;
    } else {
      alert(
        "ليس لديك صلاحية إضافة مدرس."
      );
      return;
    }

    if (!fullName.trim()) {
      alert(
        "اسم المعلم مطلوب."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } =
        await supabase
          .from("teachers")
          .insert({
            institute_id:
              targetInstituteId,

            full_name:
              fullName.trim(),

            teacher_code:
              teacherCode.trim() ||
              null,

            phone:
              phone.trim() ||
              null,

            email:
              email.trim() ||
              null,

            specialization:
              specialization.trim() ||
              null,

            qualification:
              qualification.trim() ||
              null,

            is_active: true,
          });

      if (error) throw error;

      setShowAddModal(false);
      resetForm();

      await loadTeachers();

      setMessage(
        "تم إضافة المدرس بنجاح ✅"
      );
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

  /*
   * ============================================
   * تعديل المدرس
   * ============================================
   */
  async function updateTeacher() {
    if (!profile) {
      alert(
        "بيانات المستخدم غير متاحة."
      );
      return;
    }

    if (!editingTeacher) {
      alert(
        "لم يتم تحديد المدرس المراد تعديله."
      );
      return;
    }

    if (!fullName.trim()) {
      alert(
        "اسم المعلم مطلوب."
      );
      return;
    }

    /*
     * حماية إضافية من الواجهة.
     */
    if (
      profile.role === "it_admin" &&
      editingTeacher.institute_id !==
        profile.institute_id
    ) {
      alert(
        "ليس لديك صلاحية تعديل هذا المدرس."
      );
      return;
    }

    if (
      (
        profile.role === "sheikh" ||
        profile.role === "institute_deputy" ||
        profile.role === "employee"
      ) &&
      editingTeacher.institute_id !==
        profile.institute_id
    ) {
      alert(
        "ليس لديك صلاحية تعديل هذا المدرس."
      );
      return;
    }

    if (
      (
        profile.role === "super_admin" ||
        profile.role === "director" ||
        profile.role === "deputy"
      ) &&
      selectedInstitute &&
      editingTeacher.institute_id !==
        selectedInstitute
    ) {
      alert(
        "المدرس لا يتبع المعهد المحدد."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      /*
       * لا نسمح من هذه الشاشة بتغيير
       * institute_id.
       */
      const { error } =
        await supabase
          .from("teachers")
          .update({
            full_name:
              fullName.trim(),

            teacher_code:
              teacherCode.trim() ||
              null,

            phone:
              phone.trim() ||
              null,

            email:
              email.trim() ||
              null,

            specialization:
              specialization.trim() ||
              null,

            qualification:
              qualification.trim() ||
              null,

            is_active:
              isActive,
          })
          .eq(
            "id",
            editingTeacher.id
          )
          .eq(
            "institute_id",
            editingTeacher.institute_id
          );

      if (error) throw error;

      setShowAddModal(false);
      resetForm();

      await loadTeachers();

      setMessage(
        "تم تعديل بيانات المدرس بنجاح ✅"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تعديل المدرس."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================
   * حفظ المدرس
   * ============================================
   */
  function handleSaveTeacher() {
    if (editingTeacher) {
      updateTeacher();
    } else {
      addTeacher();
    }
  }

  const filteredTeachers =
    teachers.filter((teacher) => {
      const search =
        searchTerm
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
    });

  const selectedInstituteName =
    institutes.find(
      (institute) =>
        institute.id ===
        selectedInstitute
    )?.name || "";

  /*
   * هل الحساب يستطيع إضافة مدرس؟
   */
  const canAddTeacher =
    profile?.role === "super_admin" ||
    profile?.role === "director" ||
    profile?.role === "deputy" ||
    profile?.role === "sheikh" ||
    profile?.role === "institute_deputy" ||
    profile?.role === "employee" ||
    profile?.role === "it_admin";

  /*
   * هل الحساب يستطيع تعديل المدرسين؟
   */
  const canEditTeacher =
    profile?.role === "super_admin" ||
    profile?.role === "director" ||
    profile?.role === "deputy" ||
    profile?.role === "sheikh" ||
    profile?.role === "institute_deputy" ||
    profile?.role === "employee" ||
    profile?.role === "it_admin";

  /*
   * حسابات المعاهد
   */
  const isInstituteAccount =
    profile?.role === "it_admin" ||
    profile?.role === "sheikh" ||
    profile?.role === "institute_deputy" ||
    profile?.role === "employee";

  /*
   * هل المعهد جاء من بطاقة المعهد؟
   */
  const isInstituteLocked =
    !!requestedInstituteId &&
    (
      profile?.role === "super_admin" ||
      profile?.role === "director" ||
      profile?.role === "deputy"
    );

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
                  <GraduationCap
                    size={30}
                  />
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

            <div className="flex gap-3 flex-wrap">
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

              {canAddTeacher && (
                <button
                  onClick={
                    openAddTeacherModal
                  }
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

          {/* اختيار المعهد للحسابات المركزية */}
          {profile &&
            !isInstituteAccount &&
            (
              profile.role ===
                "director" ||
              profile.role ===
                "super_admin" ||
              profile.role === "deputy"
            ) && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">

                <label className="block font-bold mb-3">
                  المعهد
                </label>

                <select
                  value={
                    selectedInstitute
                  }
                  onChange={(event) =>
                    setSelectedInstitute(
                      event.target.value
                    )
                  }
                  disabled={
                    isInstituteLocked
                  }
                  className={`w-full border border-slate-200 rounded-xl px-4 py-3 bg-white ${
                    isInstituteLocked
                      ? "bg-slate-100 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {!isInstituteLocked && (
                    <option value="">
                      جميع المعاهد
                    </option>
                  )}

                  {institutes.map(
                    (institute) => (
                      <option
                        key={institute.id}
                        value={
                          institute.id
                        }
                      >
                        {institute.name} -{" "}
                        {institute.code}
                      </option>
                    )
                  )}
                </select>

                {isInstituteLocked ? (
                  <p className="text-sm text-blue-600 mt-2">
                    يتم عرض المدرسين للمعهد المحدد فقط.
                  </p>
                ) : (
                  !selectedInstitute && (
                    <p className="text-sm text-slate-500 mt-2">
                      يتم عرض المدرسين من جميع معاهد الإدارة التعليمية.
                    </p>
                  )
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
                    {
                      filteredTeachers.length
                    }
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
                  setSearchTerm(
                    event.target.value
                  )
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
                  عند إضافة أو استيراد مدرسين سيظهرون هنا تلقائيًا.
                </p>

                {canAddTeacher && (
                  <button
                    onClick={
                      openAddTeacherModal
                    }
                    className="mt-5 bg-slate-900 text-white px-5 py-3 rounded-xl inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    إضافة مدرس
                  </button>
                )}

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

                      {canEditTeacher && (
                        <th className="p-4">
                          الإجراءات
                        </th>
                      )}

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

                          {canEditTeacher && (
                            <td className="p-4">

                              <button
                                onClick={() =>
                                  openEditTeacherModal(
                                    teacher
                                  )
                                }
                                className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100 transition"
                              >
                                <Pencil
                                  size={16}
                                />

                                تعديل
                              </button>

                            </td>
                          )}

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </div>

        {/* ============================================
            نافذة إضافة / تعديل مدرس
            ============================================ */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              <div className="p-6 border-b flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-bold">
                    {editingTeacher
                      ? "تعديل بيانات المدرس"
                      : "إضافة مدرس جديد"}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {selectedInstituteName ||
                      "المعهد الحالي"}
                  </p>

                </div>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 rounded-xl hover:bg-slate-100 text-xl"
                >
                  ×
                </button>

              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* اسم المدرس */}
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

                {/* كود المدرس */}
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

                {/* الهاتف */}
                <div>
                  <label className="block font-semibold mb-2">
                    الهاتف
                  </label>

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="01xxxxxxxxx"
                  />
                </div>

                {/* البريد */}
                <div>
                  <label className="block font-semibold mb-2">
                    البريد الإلكتروني
                  </label>

                  <input
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="teacher@example.com"
                  />
                </div>

                {/* التخصص */}
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

                {/* المؤهل */}
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

                {/* الحالة */}
                {editingTeacher && (
                  <div className="md:col-span-2">

                    <label className="block font-semibold mb-2">
                      حالة المدرس
                    </label>

                    <label className="flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50">

                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(event) =>
                          setIsActive(
                            event.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />

                      <span>
                        المدرس نشط
                      </span>

                    </label>

                  </div>
                )}

              </div>

              <div className="p-6 border-t flex justify-end gap-3">

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-5 py-3 rounded-xl border"
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  onClick={
                    handleSaveTeacher
                  }
                  disabled={saving}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2"
                >

                  {saving && (
                    <RefreshCw
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {editingTeacher
                    ? "حفظ التعديلات"
                    : "حفظ المدرس"}

                </button>

              </div>

            </div>

          </div>
        )}
      </main>
    </AppShell>
  );
}
