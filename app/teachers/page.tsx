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
  Printer,
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
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /*
   * ============================================
   * معرفة المعهد القادم من الرابط
   * ============================================
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

  /*
   * ============================================
   * تحميل بيانات المستخدم والمعاهد
   * ============================================
   */
  useEffect(() => {
    loadProfile();
  }, []);

  /*
   * ============================================
   * تحميل المدرسين
   *
   * مهم:
   * لا يتم تحميل المدرسين إذا كان هناك
   * instituteId في الرابط ولم يتم تثبيته
   * بعد.
   * ============================================
   */
  useEffect(() => {
    if (!profile || requestedInstituteId === undefined) {
      return;
    }

    /*
     * إذا فتحنا الصفحة من ملف معهد محدد
     * يجب تثبيت المعهد أولًا.
     */
    if (
      requestedInstituteId &&
      !selectedInstitute
    ) {
      return;
    }

    loadTeachers();
  }, [
    profile,
    selectedInstitute,
    requestedInstituteId,
  ]);

  /*
   * ============================================
   * تحميل Profile
   * ============================================
   */
  async function loadProfile() {
    setLoading(true);
    setMessage("");

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

      /*
       * نقرأ instituteId من الرابط هنا مباشرة.
       *
       * مثال:
       * /teachers?instituteId=xxxxxxxx
       */
      const urlInstituteId =
        typeof window !== "undefined"
          ? new URLSearchParams(
              window.location.search
            ).get("instituteId")
          : null;

      setRequestedInstituteId(
        urlInstituteId
      );

      /*
       * تحميل Profile
       */
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, institute_id, directorate_id"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

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

        if (instituteError) {
          throw instituteError;
        }

        setInstitutes([institute]);

        /*
         * حساب المعهد يستخدم معهده فقط.
         */
        setSelectedInstitute(
          data.institute_id
        );

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
        (
          data.role === "super_admin" ||
          data.role === "director" ||
          data.role === "deputy"
        ) &&
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

      if (institutesError) {
        throw institutesError;
      }

      const availableInstitutes =
        instituteData || [];

      /*
       * ============================================
       * إذا جاء instituteId من ملف المعهد
       * ============================================
       */
      if (urlInstituteId) {
        const requestedInstitute =
          availableInstitutes.find(
            (institute) =>
              institute.id ===
              urlInstituteId
          );

        /*
         * المعهد غير موجود أو ليس تابعًا
         * للإدارة الحالية.
         */
        if (!requestedInstitute) {
          setInstitutes(
            availableInstitutes
          );

          setSelectedInstitute("");

          setMessage(
            "هذا المعهد غير تابع للإدارة التعليمية الحالية."
          );

          return;
        }

        /*
         * المعهد صحيح.
         *
         * هنا النقطة الأساسية:
         * نثبت المعهد القادم من الرابط
         * قبل تحميل المدرسين.
         */
        setInstitutes(
          availableInstitutes
        );

        setSelectedInstitute(
          requestedInstitute.id
        );

        return;
      }

      /*
       * ============================================
       * لا يوجد instituteId في الرابط
       *
       * يسمح للمدير باختيار المعهد
       * أو عرض جميع المعاهد.
       * ============================================
       */
      setInstitutes(
        availableInstitutes
      );

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
   * تحميل المدرسين
   * ============================================
   */
  async function loadTeachers() {
    if (!profile) {
      return;
    }

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
       * ============================================
       * حسابات المعهد
       * ============================================
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
       * ============================================
       * الحسابات المركزية
       * ============================================
       */
      else if (
        profile.role === "super_admin" ||
        profile.role === "director" ||
        profile.role === "deputy"
      ) {
        /*
         * ============================================
         * الحالة الأولى:
         * الصفحة مفتوحة من ملف معهد محدد
         *
         * هنا لا نسمح أبدًا بعرض مدرسين
         * من معهد آخر.
         * ============================================
         */
        if (requestedInstituteId) {
          if (!selectedInstitute) {
            setTeachers([]);
            return;
          }

          query = query.eq(
            "institute_id",
            selectedInstitute
          );
        }

        /*
         * ============================================
         * الحالة الثانية:
         * المدير اختار معهدًا من القائمة.
         * ============================================
         */
        else if (selectedInstitute) {
          query = query.eq(
            "institute_id",
            selectedInstitute
          );
        }

        /*
         * ============================================
         * الحالة الثالثة:
         * لا يوجد معهد محدد.
         *
         * نعرض جميع المدرسين في معاهد
         * الإدارة الحالية فقط.
         * ============================================
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

          if (
            instituteIds.length === 0
          ) {
            setTeachers([]);
            return;
          }

          query = query.in(
            "institute_id",
            instituteIds
          );
        }
      }

      /*
       * ============================================
       * تنفيذ الاستعلام
       * ============================================
       */
      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

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

  /*
   * ============================================
   * حماية HTML للطباعة
   * ============================================
   */
  function escapeHtml(
    value: string | null | undefined
  ) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  /*
   * ============================================
   * طباعة المدرسين
   * ============================================
   */
  function handlePrintTeachers() {
    if (
      filteredTeachers.length === 0
    ) {
      setMessage(
        "لا توجد بيانات مدرسين للطباعة."
      );
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      setMessage(
        "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة من المتصفح."
      );
      return;
    }

    const instituteTitle =
      selectedInstituteName ||
      "جميع معاهد الإدارة التعليمية الأزهرية";

    const printedAt =
      new Date().toLocaleString(
        "ar-EG",
        {
          dateStyle: "full",
          timeStyle: "short",
        }
      );

    const rows =
      filteredTeachers
        .map(
          (
            teacher,
            index
          ) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(
          teacher.teacher_code || "-"
        )}</td>
        <td class="name">${escapeHtml(
          teacher.full_name
        )}</td>
        <td>${escapeHtml(
          teacher.phone || "-"
        )}</td>
        <td>${escapeHtml(
          teacher.email || "-"
        )}</td>
        <td>${escapeHtml(
          teacher.specialization || "-"
        )}</td>
        <td>${escapeHtml(
          teacher.qualification || "-"
        )}</td>
        <td>
          <span class="${
            teacher.is_active
              ? "active"
              : "inactive"
          }">
            ${
              teacher.is_active
                ? "نشط"
                : "غير نشط"
            }
          </span>
        </td>
      </tr>
    `
        )
        .join("");

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>
كشف المدرسين - ${escapeHtml(
      instituteTitle
    )}
</title>

<style>
@page {
  size: A4 landscape;
  margin: 12mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Arial,
    Tahoma,
    sans-serif;
  color: #172033;
  direction: rtl;
}

.header {
  text-align: center;
  border-bottom: 2px solid #172033;
  padding-bottom: 14px;
  margin-bottom: 18px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 6px;
}

.meta {
  font-size: 12px;
  color: #526071;
  display: flex;
  justify-content: center;
  gap: 28px;
  flex-wrap: wrap;
}

.summary {
  display: flex;
  justify-content: space-between;
  margin: 0 0 14px;
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

th {
  background: #eef2f7;
  font-weight: 700;
  padding: 8px 6px;
  border: 1px solid #b9c2cf;
  text-align: center;
}

td {
  padding: 7px 6px;
  border: 1px solid #cbd3dd;
  text-align: center;
  vertical-align: middle;
}

tr:nth-child(even) td {
  background: #f8fafc;
}

td.name {
  font-weight: 700;
  text-align: right;
}

.active,
.inactive {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 700;
}

.active {
  color: #166534;
  background: #dcfce7;
}

.inactive {
  color: #991b1b;
  background: #fee2e2;
}

.footer {
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid #d1d5db;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
  }
}
</style>
</head>

<body>

<div class="header">

<h1 class="title">
نظام إدارة المعاهد الأزهرية
</h1>

<p class="subtitle">
كشف المدرسين
</p>

<p class="subtitle">
${escapeHtml(
  instituteTitle
)}
</p>

<div class="meta">

<span>
تاريخ الطباعة:
${escapeHtml(
  printedAt
)}
</span>

<span>
عدد النتائج:
${filteredTeachers.length}
</span>

${
  searchTerm.trim()
    ? `
<span>
بحث:
${escapeHtml(
  searchTerm.trim()
)}
</span>
`
    : ""
}

</div>

</div>

<div class="summary">

<span>
إجمالي المدرسين المعروضين:
<strong>
${filteredTeachers.length}
</strong>
</span>

<span>
النشطون:
<strong>
${
  filteredTeachers.filter(
    (teacher) =>
      teacher.is_active
  ).length
}
</strong>
</span>

<span>
غير النشطين:
<strong>
${
  filteredTeachers.filter(
    (teacher) =>
      !teacher.is_active
  ).length
}
</strong>
</span>

</div>

<table>

<thead>

<tr>
<th>م</th>
<th>كود المعلم</th>
<th>اسم المعلم</th>
<th>الهاتف</th>
<th>البريد الإلكتروني</th>
<th>التخصص</th>
<th>المؤهل</th>
<th>الحالة</th>
</tr>

</thead>

<tbody>
${rows}
</tbody>

</table>

<div class="footer">

<span>
منصة الإدارة والمتابعة التعليمية الأزهرية
</span>

<span>
كشف صادر من نظام إدارة المعاهد الأزهرية
</span>

</div>

</body>
</html>
`);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  /*
   * ============================================
   * إعادة ضبط نموذج المدرس
   * ============================================
   */
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
   * إضافة مدرس
   * ============================================
   */
  function openAddTeacherModal() {
    /*
     * حسابات المعهد
     */
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
     * الحسابات المركزية:
     * إذا كان المعهد قادمًا من الرابط
     * يظل هذا المعهد مقفولًا.
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
   * تعديل مدرس
   * ============================================
   */
  function openEditTeacherModal(
    teacher: Teacher
  ) {
    /*
     * IT Admin
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
     * حسابات المعهد
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
     * الحسابات المركزية
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

    setEditingTeacher(
      teacher
    );

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
   * إضافة المدرس إلى قاعدة البيانات
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
     * حسابات المعهد
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
     * الحسابات المركزية
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

    /*
     * حماية إضافية:
     * إذا جاء المعهد من الرابط، لا نسمح
     * بإضافة المدرس إلى معهد آخر.
     */
    if (
      requestedInstituteId &&
      targetInstituteId !==
        requestedInstituteId
    ) {
      alert(
        "لا يمكن إضافة المدرس إلا إلى المعهد المحدد."
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
      const {
        error,
      } = await supabase
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

      if (error) {
        throw error;
      }

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
     * IT Admin
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

    /*
     * حسابات المعهد
     */
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

    /*
     * الحسابات المركزية
     */
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

    /*
     * إذا كان المعهد قادمًا من الرابط
     * يجب أن يظل المدرس تابعًا له.
     */
    if (
      requestedInstituteId &&
      editingTeacher.institute_id !==
        requestedInstituteId
    ) {
      alert(
        "المدرس لا يتبع المعهد المحدد."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        error,
      } = await supabase
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

      if (error) {
        throw error;
      }

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
          : "حدث خطأ أثناء تعديل بيانات المدرس."
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

  /*
   * ============================================
   * البحث
   * ============================================
   */
  const filteredTeachers =
    teachers.filter(
      (teacher) => {
        const search =
          searchTerm
            .trim()
            .toLowerCase();

        if (!search) {
          return true;
        }

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

  /*
   * ============================================
   * اسم المعهد الحالي
   * ============================================
   */
  const selectedInstituteName =
    institutes.find(
      (institute) =>
        institute.id ===
        selectedInstitute
    )?.name || "";

  /*
   * ============================================
   * الصلاحيات
   * ============================================
   */
  const canAddTeacher =
    profile?.role === "super_admin" ||
    profile?.role === "director" ||
    profile?.role === "deputy" ||
    profile?.role === "sheikh" ||
    profile?.role === "institute_deputy" ||
    profile?.role === "employee" ||
    profile?.role === "it_admin";

  const canEditTeacher =
    profile?.role === "super_admin" ||
    profile?.role === "director" ||
    profile?.role === "deputy" ||
    profile?.role === "sheikh" ||
    profile?.role === "institute_deputy" ||
    profile?.role === "employee" ||
    profile?.role === "it_admin";

  /*
   * ============================================
   * حساب المعهد
   * ============================================
   */
  const isInstituteAccount =
    profile?.role === "it_admin" ||
    profile?.role === "sheikh" ||
    profile?.role === "institute_deputy" ||
    profile?.role === "employee";

  /*
   * ============================================
   * المعهد مقفول إذا جاء من ملف المعهد
   * ============================================
   */
  const isInstituteLocked =
    !!requestedInstituteId &&
    (
      profile?.role === "super_admin" ||
      profile?.role === "director" ||
      profile?.role === "deputy"
    );

  /*
   * ============================================
   * شاشة التحميل
   * ============================================
   */
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
                disabled={
                  loadingTeachers
                }
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

              <button
                type="button"
                onClick={
                  handlePrintTeachers
                }
                disabled={
                  filteredTeachers.length ===
                  0
                }
                className="bg-white border border-slate-200 px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >

                <Printer size={18} />

                طباعة

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

          {/* الرسالة */}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 mb-6">
              {message}
            </div>
          )}

          {/* اختيار المعهد */}
          {profile &&
            !isInstituteAccount &&
            (
              profile.role ===
                "director" ||
              profile.role ===
                "super_admin" ||
              profile.role ===
                "deputy"
            ) && (

              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">

                <label className="block font-bold mb-3">
                  المعهد
                </label>

                <select
                  value={
                    selectedInstitute
                  }
                  onChange={(
                    event
                  ) =>
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
                        }{" "}
                        -{" "}
                        {
                          institute.code
                        }
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

          {/* المعهد الحالي */}
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
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
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
                البيانات المعروضة يتم تحميلها مباشرة من جدول المدرسين في قاعدة البيانات.
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
                      (
                        teacher
                      ) => (

                        <tr
                          key={
                            teacher.id
                          }
                          className="border-b last:border-b-0 hover:bg-slate-50"
                        >

                          <td className="p-4 font-medium">
                            {
                              teacher.teacher_code ||
                              "-"
                            }
                          </td>

                          <td className="p-4">

                            <div className="flex items-center gap-3">

                              <div className="bg-green-100 text-green-700 p-2 rounded-xl">

                                <GraduationCap
                                  size={18}
                                />

                              </div>

                              <span className="font-semibold">
                                {
                                  teacher.full_name
                                }
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

                                {
                                  teacher.phone
                                }

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

                                {
                                  teacher.email
                                }

                              </div>

                            ) : (
                              "-"
                            )}

                          </td>

                          <td className="p-4">
                            {
                              teacher.specialization ||
                              "-"
                            }
                          </td>

                          <td className="p-4">
                            {
                              teacher.qualification ||
                              "-"
                            }
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
            نافذة الإضافة والتعديل
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

                    {
                      selectedInstituteName ||
                      "المعهد الحالي"
                    }

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

                {/* الاسم */}
                <div>

                  <label className="block font-semibold mb-2">
                    اسم المعلم *
                  </label>

                  <input
                    value={
                      fullName
                    }
                    onChange={(
                      event
                    ) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="اسم المعلم"
                  />

                </div>

                {/* الكود */}
                <div>

                  <label className="block font-semibold mb-2">
                    كود المعلم
                  </label>

                  <input
                    value={
                      teacherCode
                    }
                    onChange={(
                      event
                    ) =>
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
                    value={
                      phone
                    }
                    onChange={(
                      event
                    ) =>
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
                    value={
                      email
                    }
                    onChange={(
                      event
                    ) =>
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
                    value={
                      specialization
                    }
                    onChange={(
                      event
                    ) =>
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
                    value={
                      qualification
                    }
                    onChange={(
                      event
                    ) =>
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
                        checked={
                          isActive
                        }
                        onChange={(
                          event
                        ) =>
                          setIsActive(
                            event.target
                              .checked
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
                  disabled={
                    saving
                  }
                >
                  إلغاء
                </button>

                <button
                  onClick={
                    handleSaveTeacher
                  }
                  disabled={
                    saving
                  }
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2"
                >

                  {saving && (
                    <RefreshCw
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {
                    editingTeacher
                      ? "حفظ التعديلات"
                      : "حفظ المدرس"
                  }

                </button>

              </div>

            </div>

          </div>

        )}

      </main>
    </AppShell>
  );
}
