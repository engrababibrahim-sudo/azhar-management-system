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
  Pencil,
  Printer,
} from "lucide-react";
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

type ClassItem = {
  id: string;
  name: string;
  grade_level: string | null;
  section: string | null;
  institute_id: string;
};

type Student = {
  id: string;
  institute_id: string;
  student_code: string | null;
  national_id: string | null;
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

  const [institute, setInstitute] =
    useState<Institute | null>(null);

  const [institutes, setInstitutes] =
    useState<Institute[]>([]);

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  /*
   * المعهد القادم من رابط صفحة تفاصيل المعهد
   * مثال:
   * /students?instituteId=xxxxxxxx
   */
  const [requestedInstituteId, setRequestedInstituteId] =
    useState<string | null>(null);

  const [parentLookupLoading, setParentLookupLoading] =
    useState(false);

  const [parentLookupMessage, setParentLookupMessage] =
    useState("");

  const [parentLookupType, setParentLookupType] =
    useState<"success" | "warning" | "">("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedClass, setSelectedClass] =
    useState("all");

  const [selectedInstitute, setSelectedInstitute] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [editingStudentId, setEditingStudentId] =
    useState<string | null>(null);

  const [studentCode, setStudentCode] =
    useState("");

  const [nationalId, setNationalId] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [guardianName, setGuardianName] =
    useState("");

  const [guardianPhone, setGuardianPhone] =
    useState("");

  const [classId, setClassId] =
    useState("");

  const [parentId, setParentId] =
    useState("");

  const [formInstituteId, setFormInstituteId] =
    useState("");

  // =====================================================
  // الصلاحيات
  // =====================================================

  const isCentralManager =
    profile?.role === "super_admin" ||
    profile?.role === "director" ||
    profile?.role === "deputy";

  const isInstituteUser =
    profile?.role === "sheikh" ||
    profile?.role === "it_admin";

  const canManageStudents =
    !!isCentralManager ||
    !!isInstituteUser;

  // =====================================================
  // هل الصفحة مفتوحة لمعهد محدد؟
  // =====================================================

  const isScopedToInstitute =
    !!requestedInstituteId;

  // =====================================================
  // الطباعة
  // =====================================================

  function handlePrintStudents() {
    if (filteredStudents.length === 0) {
      setError(
        "لا توجد بيانات طلاب متاحة للطباعة."
      );
      return;
    }

    setError("");

    setTimeout(() => {
      window.print();
    }, 100);
  }

  // =====================================================
  // قراءة instituteId من الرابط
  // =====================================================

  function getRequestedInstituteFromUrl() {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    return params.get("instituteId");
  }

  // =====================================================
  // اسم المعهد
  // =====================================================

  function getInstituteName(
    instituteId: string
  ) {
    return (
      institutes.find(
        (item) =>
          item.id === instituteId
      )?.name || "غير محدد"
    );
  }

  // =====================================================
  // تحميل الفصول والطلاب
  // =====================================================

  async function loadClassesAndStudents(
    instituteIds: string[]
  ) {
    setError("");

    if (instituteIds.length === 0) {
      setClasses([]);
      setStudents([]);
      return;
    }

    // ---------------------------------------------
    // الفصول
    // ---------------------------------------------

    const {
      data: classesData,
      error: classesError,
    } = await supabase
      .from("classes")
      .select(
        "id, name, grade_level, section, institute_id"
      )
      .in(
        "institute_id",
        instituteIds
      )
      .eq(
        "is_active",
        true
      )
      .order("name");

    if (classesError) {
      throw new Error(
        "حدث خطأ أثناء تحميل الفصول: " +
          classesError.message
      );
    }

    setClasses(
      (classesData || []) as ClassItem[]
    );

    // ---------------------------------------------
    // الطلاب
    // ---------------------------------------------

    const {
      data: studentsData,
      error: studentsError,
    } = await supabase
      .from("students")
      .select(`
        id,
        institute_id,
        student_code,
        national_id,
        full_name,
        gender,
        phone,
        guardian_name,
        guardian_phone,
        class_id,
        parent_id,
        is_active
      `)
      .in(
        "institute_id",
        instituteIds
      )
      .order("full_name");

    if (studentsError) {
      throw new Error(
        "حدث خطأ أثناء تحميل الطلاب: " +
          studentsError.message
      );
    }

    setStudents(
      (studentsData || []) as Student[]
    );
  }

  // =====================================================
  // تحميل بيانات المستخدم والمعهد
  // =====================================================

  async function loadUserAndInstitute() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const requestedId =
        getRequestedInstituteFromUrl();

      setRequestedInstituteId(
        requestedId
      );

      // ---------------------------------------------
      // المستخدم الحالي
      // ---------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          authError.message
        );
      }

      if (!user) {
        throw new Error(
          "لم يتم العثور على المستخدم المسجل الدخول."
        );
      }

      // ---------------------------------------------
      // Profile
      // ---------------------------------------------

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, institute_id, directorate_id"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

      if (profileError) {
        throw new Error(
          "تعذر تحميل بيانات المستخدم: " +
            profileError.message
        );
      }

      if (!profileData) {
        throw new Error(
          "لم يتم العثور على ملف المستخدم."
        );
      }

      setProfile(profileData);

      // =================================================
      // شيخ المعهد / مسؤول IT
      // =================================================

      if (
        profileData.role === "sheikh" ||
        profileData.role === "it_admin"
      ) {
        if (!profileData.institute_id) {
          throw new Error(
            profileData.role === "it_admin"
              ? "حساب مسؤول تكنولوجيا المعلومات غير مرتبط بمعهد."
              : "حساب الشيخ غير مرتبط بمعهد."
          );
        }

        const {
          data: instituteData,
          error: instituteError,
        } = await supabase
          .from("institutes")
          .select(
            "id, name, code"
          )
          .eq(
            "id",
            profileData.institute_id
          )
          .maybeSingle();

        if (instituteError) {
          throw new Error(
            "تعذر تحميل بيانات المعهد: " +
              instituteError.message
          );
        }

        if (!instituteData) {
          throw new Error(
            "لم يتم العثور على المعهد المرتبط بالحساب."
          );
        }

        setInstitute(
          instituteData
        );

        setInstitutes([
          instituteData,
        ]);

        setSelectedInstitute(
          instituteData.id
        );

        setFormInstituteId(
          instituteData.id
        );

        await loadClassesAndStudents([
          instituteData.id,
        ]);

        return;
      }

      // =================================================
      // المدير / النائب / Super Admin
      // =================================================

      if (
        profileData.role === "super_admin" ||
        profileData.role === "director" ||
        profileData.role === "deputy"
      ) {
        if (!profileData.directorate_id) {
          throw new Error(
            "الحساب غير مرتبط بإدارة تعليمية."
          );
        }

        // ---------------------------------------------
        // تحميل المعاهد المسموح بها
        // ---------------------------------------------

        const {
          data: institutesData,
          error: institutesError,
        } = await supabase
          .from("institutes")
          .select(
            "id, name, code"
          )
          .eq(
            "directorate_id",
            profileData.directorate_id
          )
          .order("name");

        if (institutesError) {
          throw new Error(
            "تعذر تحميل المعاهد: " +
              institutesError.message
          );
        }

        const loadedInstitutes =
          institutesData || [];

        setInstitutes(
          loadedInstitutes
        );

        // =================================================
        // IMPORTANT:
        // إذا جاء instituteId من صفحة تفاصيل المعهد
        // نعرض هذا المعهد فقط
        // =================================================

        if (requestedId) {
          const selectedInstituteData =
            loadedInstitutes.find(
              (item) =>
                item.id ===
                requestedId
            );

          // حماية:
          // لا يمكن فتح معهد خارج إدارة المستخدم
          if (!selectedInstituteData) {
            throw new Error(
              "المعهد المطلوب غير موجود ضمن الإدارة التعليمية الحالية."
            );
          }

          setInstitute(
            selectedInstituteData
          );

          setSelectedInstitute(
            selectedInstituteData.id
          );

          setFormInstituteId(
            selectedInstituteData.id
          );

          // ---------------------------------------------
          // تحميل طلاب المعهد المحدد فقط
          // ---------------------------------------------

          await loadClassesAndStudents([
            selectedInstituteData.id,
          ]);

          return;
        }

        // =================================================
        // لا يوجد instituteId
        // السلوك الطبيعي:
        // المدير يرى كل معاهد الإدارة
        // =================================================

        setInstitute(null);

        setSelectedInstitute(
          "all"
        );

        if (
          loadedInstitutes.length > 0
        ) {
          setFormInstituteId(
            loadedInstitutes[0].id
          );
        }

        await loadClassesAndStudents(
          loadedInstitutes.map(
            (item) => item.id
          )
        );

        return;
      }

      throw new Error(
        "هذا الحساب ليس لديه صلاحية الدخول إلى صفحة الطلاب."
      );
    } catch (err: any) {
      console.error(
        "LOAD STUDENTS ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء تحميل البيانات."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // التشغيل الأول
  // =====================================================

  useEffect(() => {
    loadUserAndInstitute();
  }, []);

  // =====================================================
  // فلترة الطلاب
  // =====================================================

  const filteredStudents =
    useMemo(() => {
      return students.filter(
        (student) => {
          const search =
            searchTerm
              .trim()
              .toLowerCase();

          const matchesSearch =
            !search ||
            student.full_name
              .toLowerCase()
              .includes(search) ||
            (
              student.student_code ||
              ""
            )
              .toLowerCase()
              .includes(search) ||
            (
              student.national_id ||
              ""
            ).includes(search) ||
            (
              student.phone ||
              ""
            ).includes(search) ||
            (
              student.guardian_name ||
              ""
            )
              .toLowerCase()
              .includes(search);

          const matchesClass =
            selectedClass ===
              "all" ||
            student.class_id ===
              selectedClass;

          const matchesInstitute =
            selectedInstitute ===
              "all" ||
            student.institute_id ===
              selectedInstitute;

          return (
            matchesSearch &&
            matchesClass &&
            matchesInstitute
          );
        }
      );
    }, [
      students,
      searchTerm,
      selectedClass,
      selectedInstitute,
    ]);

  // =====================================================
  // اسم الفصل
  // =====================================================

  function getClassName(
    classId: string | null
  ) {
    if (!classId) {
      return "غير محدد";
    }

    return (
      classes.find(
        (item) =>
          item.id === classId
      )?.name ||
      "غير محدد"
    );
  }

  // =====================================================
  // البحث عن ولي الأمر
  // =====================================================

  async function lookupParentByPhone(
    value: string
  ) {
    const normalizedPhone =
      value.trim();

    setParentLookupMessage("");
    setParentLookupType("");
    setParentId("");

    if (!normalizedPhone) {
      return;
    }

    if (
      normalizedPhone.length < 8
    ) {
      setParentLookupMessage(
        "أدخل رقم هاتف ولي الأمر بشكل كامل للبحث عن الحساب."
      );

      setParentLookupType(
        "warning"
      );

      return;
    }

    setParentLookupLoading(
      true
    );

    try {
      const {
        data,
        error: parentError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, email"
        )
        .eq(
          "role",
          "parent"
        )
        .eq(
          "phone",
          normalizedPhone
        )
        .maybeSingle();

      if (parentError) {
        throw new Error(
          "تعذر البحث عن حساب ولي الأمر: " +
            parentError.message
        );
      }

      if (!data) {
        setParentLookupMessage(
          "لم يتم العثور على حساب ولي أمر بهذا الرقم. يمكنك متابعة إضافة الطالب بدون ربط ولي أمر."
        );

        setParentLookupType(
          "warning"
        );

        return;
      }

      setParentId(
        data.id
      );

      setGuardianName(
        data.full_name ||
          ""
      );

      setGuardianPhone(
        data.phone ||
          normalizedPhone
      );

      setParentLookupMessage(
        `تم العثور على حساب ولي الأمر "${
          data.full_name ||
          "ولي الأمر"
        }" وربط الطالب به تلقائيًا.`
      );

      setParentLookupType(
        "success"
      );
    } catch (err: any) {
      setParentLookupMessage(
        err.message ||
          "حدث خطأ أثناء البحث عن حساب ولي الأمر."
      );

      setParentLookupType(
        "warning"
      );
    } finally {
      setParentLookupLoading(
        false
      );
    }
  }

  // =====================================================
  // تعديل طالب
  // =====================================================

  function openEditStudent(
    student: Student
  ) {
    setError("");
    setSuccess("");

    setEditingStudentId(
      student.id
    );

    setStudentCode(
      student.student_code ||
        ""
    );

    setNationalId(
      student.national_id ||
        ""
    );

    setStudentName(
      student.full_name ||
        ""
    );

    setGender(
      student.gender ||
        ""
    );

    setPhone(
      student.phone ||
        ""
    );

    setGuardianName(
      student.guardian_name ||
        ""
    );

    setGuardianPhone(
      student.guardian_phone ||
        ""
    );

    setClassId(
      student.class_id ||
        ""
    );

    setParentId(
      student.parent_id ||
        ""
    );

    setFormInstituteId(
      student.institute_id
    );

    setParentLookupLoading(
      false
    );

    setParentLookupMessage(
      student.parent_id
        ? "هذا الطالب مرتبط بالفعل بحساب ولي الأمر."
        : ""
    );

    setParentLookupType(
      student.parent_id
        ? "success"
        : ""
    );

    setShowForm(true);
  }

  // =====================================================
  // تنظيف النموذج
  // =====================================================

  function resetForm() {
    setStudentCode("");
    setNationalId("");
    setStudentName("");
    setGender("");
    setPhone("");
    setGuardianName("");
    setGuardianPhone("");
    setClassId("");
    setParentId("");

    // ---------------------------------------------
    // إذا كانت الصفحة مفتوحة لمعهد محدد
    // نثبت المعهد على هذا المعهد
    // ---------------------------------------------

    if (
      requestedInstituteId &&
      institutes.some(
        (item) =>
          item.id ===
          requestedInstituteId
      )
    ) {
      setFormInstituteId(
        requestedInstituteId
      );
    }

    // ---------------------------------------------
    // مدير اختار معهدًا
    // ---------------------------------------------

    else if (
      isCentralManager &&
      selectedInstitute !== "all"
    ) {
      setFormInstituteId(
        selectedInstitute
      );
    }

    // ---------------------------------------------
    // مدير بدون معهد محدد
    // ---------------------------------------------

    else if (
      isCentralManager &&
      institutes.length > 0
    ) {
      setFormInstituteId(
        institutes[0].id
      );
    }

    // ---------------------------------------------
    // مستخدم المعهد
    // ---------------------------------------------

    else if (
      profile?.institute_id
    ) {
      setFormInstituteId(
        profile.institute_id
      );
    }

    // ---------------------------------------------
    // المعهد الحالي
    // ---------------------------------------------

    else if (institute) {
      setFormInstituteId(
        institute.id
      );
    }

    else {
      setFormInstituteId("");
    }

    setParentLookupLoading(
      false
    );

    setParentLookupMessage(
      ""
    );

    setParentLookupType(
      ""
    );

    setEditingStudentId(
      null
    );
  }

  // =====================================================
  // التحقق من الرقم القومي
  // =====================================================

  async function validateNationalId(
    value: string
  ) {
    const normalizedNationalId =
      value.trim();

    if (
      !/^\d{14}$/.test(
        normalizedNationalId
      )
    ) {
      return "الرقم القومي للطالب يجب أن يتكون من 14 رقمًا بالضبط.";
    }

    let query =
      supabase
        .from("students")
        .select("id")
        .eq(
          "national_id",
          normalizedNationalId
        );

    if (editingStudentId) {
      query = query.neq(
        "id",
        editingStudentId
      );
    }

    const {
      data,
      error: nationalIdError,
    } =
      await query.maybeSingle();

    if (nationalIdError) {
      return (
        "تعذر التحقق من الرقم القومي: " +
        nationalIdError.message
      );
    }

    if (data) {
      return "هذا الرقم القومي مسجل بالفعل لطالب آخر.";
    }

    return null;
  }

  // =====================================================
  // إضافة / تعديل طالب
  // =====================================================

  async function handleAddStudent(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!canManageStudents) {
      setError(
        "ليس لديك صلاحية إضافة أو تعديل الطلاب."
      );

      return;
    }

    if (
      isCentralManager &&
      !formInstituteId
    ) {
      setError(
        "من فضلك اختر المعهد أولًا."
      );

      return;
    }

    const targetInstituteId =
      isCentralManager
        ? formInstituteId
        : profile?.institute_id;

    if (!targetInstituteId) {
      setError(
        "لم يتم تحديد المعهد المرتبط بالحساب."
      );

      return;
    }

    /*
     * حماية إضافية:
     * إذا كانت الصفحة مفتوحة من تفاصيل معهد،
     * لا نسمح بتغيير المعهد المستهدف.
     */
    if (
      isCentralManager &&
      requestedInstituteId &&
      targetInstituteId !==
        requestedInstituteId
    ) {
      setError(
        "لا يمكن إضافة الطالب إلى معهد مختلف أثناء فتح صفحة المعهد المحدد."
      );

      return;
    }

    if (!studentName.trim()) {
      setError(
        "من فضلك أدخل اسم الطالب."
      );

      return;
    }

    const normalizedNationalId =
      nationalId.trim();

    if (
      !/^\d{14}$/.test(
        normalizedNationalId
      )
    ) {
      setError(
        "الرقم القومي للطالب يجب أن يتكون من 14 رقمًا بالضبط."
      );

      return;
    }

    setSaving(true);

    try {
      const nationalIdError =
        await validateNationalId(
          normalizedNationalId
        );

      if (nationalIdError) {
        throw new Error(
          nationalIdError
        );
      }

      // ---------------------------------------------
      // ولي الأمر
      // ---------------------------------------------

      let resolvedParentId =
        parentId;

      if (
        guardianPhone.trim() &&
        !resolvedParentId
      ) {
        const normalizedPhone =
          guardianPhone.trim();

        const {
          data: parentData,
          error: parentError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, phone, email"
            )
            .eq(
              "role",
              "parent"
            )
            .eq(
              "phone",
              normalizedPhone
            )
            .maybeSingle();

        if (parentError) {
          throw new Error(
            "تعذر التحقق من حساب ولي الأمر: " +
              parentError.message
          );
        }

        if (parentData) {
          resolvedParentId =
            parentData.id;

          setParentId(
            parentData.id
          );

          setGuardianName(
            parentData.full_name ||
              ""
          );
        }
      }

      // ---------------------------------------------
      // بيانات الطالب
      // ---------------------------------------------

      const studentPayload = {
        institute_id:
          targetInstituteId,

        class_id:
          classId || null,

        student_code:
          studentCode.trim() ||
          null,

        national_id:
          normalizedNationalId,

        full_name:
          studentName.trim(),

        gender:
          gender || null,

        phone:
          phone.trim() ||
          null,

        guardian_name:
          guardianName.trim() ||
          null,

        guardian_phone:
          guardianPhone.trim() ||
          null,

        parent_id:
          resolvedParentId ||
          null,
      };

      // =================================================
      // تعديل
      // =================================================

      if (editingStudentId) {
        const {
          data,
          error: updateError,
        } =
          await supabase
            .from("students")
            .update(
              studentPayload
            )
            .eq(
              "id",
              editingStudentId
            )
            .select()
            .maybeSingle();

        if (updateError) {
          throw new Error(
            "تعذر تحديث بيانات الطالب: " +
              updateError.message
          );
        }

        if (data) {
          setStudents(
            (prev) =>
              prev.map(
                (student) =>
                  student.id ===
                  editingStudentId
                    ? (data as Student)
                    : student
              )
          );
        }

        setSuccess(
          "تم تحديث بيانات الطالب بنجاح."
        );
      }

      // =================================================
      // إضافة
      // =================================================

      else {
        const {
          data,
          error: insertError,
        } =
          await supabase
            .from("students")
            .insert({
              ...studentPayload,
              is_active: true,
            })
            .select()
            .maybeSingle();

        if (insertError) {
          throw new Error(
            "تعذر حفظ الطالب: " +
              insertError.message
          );
        }

        if (data) {
          setStudents(
            (prev) => [
              ...prev,
              data as Student,
            ]
          );
        }

        setSuccess(
          resolvedParentId
            ? "تم حفظ الطالب وربطه بحساب ولي الأمر تلقائيًا بنجاح."
            : "تم حفظ الطالب بنجاح بدون ربط ولي أمر."
        );
      }

      resetForm();
      setShowForm(false);
    } catch (err: any) {
      console.error(
        "STUDENT SAVE ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء حفظ الطالب."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // إعادة تحميل
  // =====================================================

  async function handleRefresh() {
    if (!profile) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // =================================================
      // مدير / نائب / Super Admin
      // =================================================

      if (
        isCentralManager &&
        profile.directorate_id
      ) {
        const {
          data: institutesData,
          error: institutesError,
        } =
          await supabase
            .from("institutes")
            .select(
              "id, name, code"
            )
            .eq(
              "directorate_id",
              profile.directorate_id
            )
            .order("name");

        if (institutesError) {
          throw new Error(
            "تعذر تحميل المعاهد: " +
              institutesError.message
          );
        }

        const loadedInstitutes =
          institutesData || [];

        setInstitutes(
          loadedInstitutes
        );

        const urlInstituteId =
          getRequestedInstituteFromUrl();

        // =================================================
        // إعادة تحميل معهد محدد
        // =================================================

        if (urlInstituteId) {
          const selected =
            loadedInstitutes.find(
              (item) =>
                item.id ===
                urlInstituteId
            );

          if (!selected) {
            throw new Error(
              "المعهد المحدد غير موجود ضمن الإدارة."
            );
          }

          setRequestedInstituteId(
            urlInstituteId
          );

          setInstitute(
            selected
          );

          setSelectedInstitute(
            selected.id
          );

          setFormInstituteId(
            selected.id
          );

          await loadClassesAndStudents([
            selected.id,
          ]);
        }

        // =================================================
        // تحميل كل المعاهد
        // =================================================

        else {
          setRequestedInstituteId(
            null
          );

          setInstitute(null);

          setSelectedInstitute(
            "all"
          );

          await loadClassesAndStudents(
            loadedInstitutes.map(
              (item) =>
                item.id
            )
          );
        }
      }

      // =================================================
      // مستخدم المعهد
      // =================================================

      else if (
        profile.institute_id
      ) {
        const {
          data: instituteData,
          error: instituteError,
        } =
          await supabase
            .from("institutes")
            .select(
              "id, name, code"
            )
            .eq(
              "id",
              profile.institute_id
            )
            .maybeSingle();

        if (instituteError) {
          throw new Error(
            "تعذر تحميل بيانات المعهد: " +
              instituteError.message
          );
        }

        if (instituteData) {
          setInstitute(
            instituteData
          );

          setInstitutes([
            instituteData,
          ]);

          setSelectedInstitute(
            instituteData.id
          );

          setFormInstituteId(
            instituteData.id
          );
        }

        await loadClassesAndStudents([
          profile.institute_id,
        ]);
      }

      setSuccess(
        "تم تحديث البيانات."
      );
    } catch (err: any) {
      setError(
        err.message ||
          "حدث خطأ أثناء تحديث البيانات."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // شاشة التحميل
  // =====================================================

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

  // =====================================================
  // الواجهة
  // =====================================================

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto">

        {/* =================================================
            PRINT HEADER
        ================================================= */}

        <div className="hidden print:block mb-6 text-center border-b-2 border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">
            نظام إدارة المعاهد الأزهرية
          </h1>

          <h2 className="text-xl font-bold mt-2">
            قائمة الطلاب
          </h2>

          <p className="text-sm mt-2">
            {isCentralManager
              ? institute?.name ||
                "جميع معاهد الإدارة التعليمية"
              : institute?.name ||
                "المعهد"}
          </p>

          <p className="text-sm mt-1">
            عدد الطلاب:{" "}
            {filteredStudents.length}
          </p>

          <p className="text-xs text-slate-500 mt-2">
            تاريخ الطباعة:{" "}
            {new Date().toLocaleDateString(
              "ar-EG"
            )}
          </p>
        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 print:hidden">
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
                    {isCentralManager
                      ? institute?.name ||
                        "جميع معاهد الإدارة التعليمية"
                      : institute?.name ||
                        "المعهد"}
                  </p>

                  {requestedInstituteId &&
                    isCentralManager && (
                      <p className="text-xs text-blue-600 mt-1">
                        يتم عرض طلاب المعهد المحدد فقط
                      </p>
                    )}

                </div>
              </div>
            </div>

            <div className="flex gap-2">

              {/* تحديث */}

              <button
                type="button"
                onClick={
                  handleRefresh
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>

              {/* طباعة */}

              <button
                type="button"
                onClick={
                  handlePrintStudents
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 transition"
                title="طباعة قائمة الطلاب"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>

              {/* إضافة */}

              {canManageStudents && (
                <button
                  type="button"
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
              )}

            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 print:hidden">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5 print:hidden">
            {success}
          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">

          {/* إجمالي الطلاب */}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  إجمالي الطلاب
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {
                    filteredStudents.length
                  }
                </p>
              </div>

              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="w-7 h-7 text-blue-600" />
              </div>

            </div>
          </div>

          {/* الفصول */}

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

          {/* الطلاب النشطون */}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  الطلاب النشطون
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {
                    filteredStudents.filter(
                      (s) =>
                        s.is_active
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

        {/* =================================================
            SEARCH / FILTERS
        ================================================= */}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm print:hidden">

          <div
            className={`grid grid-cols-1 ${
              isCentralManager
                ? "md:grid-cols-3"
                : "md:grid-cols-2"
            } gap-4`}
          >

            {/* البحث */}

            <div className="relative">

              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="ابحث باسم الطالب أو الكود أو الرقم القومي أو ولي الأمر..."
                className="w-full border border-slate-200 rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* المعهد */}

            {isCentralManager && (
              <select
                value={
                  selectedInstitute
                }
                disabled={
                  !!requestedInstituteId
                }
                onChange={(e) => {
                  setSelectedInstitute(
                    e.target.value
                  );

                  setSelectedClass(
                    "all"
                  );
                }}
                className="w-full border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
              >

                <option value="all">
                  جميع المعاهد
                </option>

                {institutes.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  )
                )}

              </select>
            )}

            {/* الفصل */}

            <select
              value={
                selectedClass
              }
              onChange={(e) =>
                setSelectedClass(
                  e.target.value
                )
              }
              className="w-full border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >

              <option value="all">
                جميع الفصول
              </option>

              {classes
                .filter(
                  (item) =>
                    selectedInstitute ===
                      "all" ||
                    item.institute_id ===
                      selectedInstitute
                )
                .map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  )
                )}

            </select>

          </div>
        </div>

        {/* =================================================
            STUDENTS TABLE
        ================================================= */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="p-5 border-b border-slate-200">

            <h2 className="font-bold text-lg text-slate-800">
              قائمة الطلاب
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              عدد النتائج:{" "}
              {
                filteredStudents.length
              }
            </p>

          </div>

          {filteredStudents.length ===
          0 ? (

            <div className="text-center py-16">

              <Users className="w-14 h-14 mx-auto text-slate-300" />

              <h3 className="text-lg font-semibold text-slate-600 mt-4">
                لا يوجد طلاب
              </h3>

              <p className="text-slate-400 mt-2">
                ابدأ بإضافة أول طالب إلى المعهد.
              </p>

              {canManageStudents && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(
                      true
                    );
                  }}
                  className="mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 print:hidden"
                >
                  إضافة طالب
                </button>
              )}

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-right border-collapse">

                <thead className="bg-slate-50">

                  <tr>

                    {isCentralManager && (
                      <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                        المعهد
                      </th>
                    )}

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      الكود
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      الرقم القومي
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      اسم الطالب
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      الجنس
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      الفصل
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      ولي الأمر
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b print:hidden">
                      الحساب
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      الهاتف
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b">
                      الحالة
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap border-b print:hidden">
                      الإجراءات
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredStudents.map(
                    (student) => (
                      <tr
                        key={
                          student.id
                        }
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >

                        {/* المعهد */}

                        {isCentralManager && (
                          <td className="px-5 py-4 text-sm text-slate-600">

                            <div className="font-medium text-slate-700">
                              {
                                getInstituteName(
                                  student.institute_id
                                )
                              }
                            </div>

                            <div className="text-xs text-slate-400 mt-1">
                              {
                                institutes.find(
                                  (item) =>
                                    item.id ===
                                    student.institute_id
                                )?.code
                              }
                            </div>

                          </td>
                        )}

                        {/* الكود */}

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            student.student_code ||
                            "-"
                          }
                        </td>

                        {/* الرقم القومي */}

                        <td className="px-5 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">
                          {
                            student.national_id ||
                            "غير مسجل"
                          }
                        </td>

                        {/* الاسم */}

                        <td className="px-5 py-4">

                          <div className="font-semibold text-slate-800 whitespace-nowrap">
                            {
                              student.full_name
                            }
                          </div>

                        </td>

                        {/* الجنس */}

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            student.gender ||
                            "-"
                          }
                        </td>

                        {/* الفصل */}

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            getClassName(
                              student.class_id
                            )
                          }
                        </td>

                        {/* ولي الأمر */}

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            student.guardian_name ||
                            "-"
                          }
                        </td>

                        {/* الحساب */}

                        <td className="px-5 py-4 whitespace-nowrap print:hidden">

                          {student.parent_id ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">

                              <UserRound className="w-3.5 h-3.5" />

                              مرتبط تلقائيًا

                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              غير مرتبط
                            </span>
                          )}

                        </td>

                        {/* الهاتف */}

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            student.guardian_phone ||
                            student.phone ||
                            "-"
                          }
                        </td>

                        {/* الحالة */}

                        <td className="px-5 py-4 whitespace-nowrap">

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

                        {/* الإجراءات */}

                        <td className="px-5 py-4 whitespace-nowrap print:hidden">

                          {canManageStudents && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditStudent(
                                  student
                                )
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                            >

                              <Pencil className="w-4 h-4" />

                              تعديل

                            </button>
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

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}

            <div className="flex items-center justify-between p-5 border-b border-slate-200">

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  {editingStudentId
                    ? "تعديل بيانات الطالب"
                    : "إضافة طالب جديد"}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {
                    getInstituteName(
                      formInstituteId
                    )
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(
                    false
                  );
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* Form */}

            <form
              onSubmit={
                handleAddStudent
              }
              className="p-5 space-y-5"
            >

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* المعهد */}

                {isCentralManager && (
                  <div className="md:col-span-2">

                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      المعهد *
                    </label>

                    <select
                      value={
                        formInstituteId
                      }
                      onChange={(e) => {
                        setFormInstituteId(
                          e.target.value
                        );

                        setClassId(
                          ""
                        );
                      }}
                      disabled={
                        !!editingStudentId ||
                        !!requestedInstituteId
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >

                      <option value="">
                        اختر المعهد
                      </option>

                      {institutes.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>
                )}

                {/* الاسم */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    اسم الطالب *
                  </label>

                  <input
                    value={
                      studentName
                    }
                    onChange={(e) =>
                      setStudentName(
                        e.target.value
                      )
                    }
                    placeholder="أدخل اسم الطالب بالكامل"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />

                </div>

                {/* الرقم القومي */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الرقم القومي للطالب *
                  </label>

                  <input
                    value={
                      nationalId
                    }
                    onChange={(e) => {
                      const value =
                        e.target.value.replace(
                          /\D/g,
                          ""
                        );

                      setNationalId(
                        value.slice(
                          0,
                          14
                        )
                      );
                    }}
                    placeholder="14 رقمًا"
                    maxLength={
                      14
                    }
                    inputMode="numeric"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <p className="text-xs text-slate-400 mt-1">
                    يجب أن يتكون الرقم القومي من 14 رقمًا.
                  </p>

                </div>

                {/* الكود */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    كود الطالب
                  </label>

                  <input
                    value={
                      studentCode
                    }
                    onChange={(e) =>
                      setStudentCode(
                        e.target.value
                      )
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
                    value={
                      gender
                    }
                    onChange={(e) =>
                      setGender(
                        e.target.value
                      )
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

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الفصل
                  </label>

                  <select
                    value={
                      classId
                    }
                    onChange={(e) =>
                      setClassId(
                        e.target.value
                      )
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="">
                      اختر الفصل
                    </option>

                    {classes
                      .filter(
                        (item) =>
                          item.institute_id ===
                          formInstituteId
                      )
                      .map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        )
                      )}

                  </select>

                  {classes.filter(
                    (item) =>
                      item.institute_id ===
                      formInstituteId
                  ).length ===
                    0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      لا توجد فصول معرفة لهذا المعهد حاليًا.
                    </p>
                  )}

                </div>

                {/* ولي الأمر */}

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ربط ولي الأمر تلقائيًا
                  </label>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                    <p className="text-sm text-slate-600 leading-6">
                      أدخل رقم هاتف ولي الأمر. سيبحث النظام تلقائيًا عن حساب ولي الأمر بهذا الرقم، وإذا وُجد سيتم ربط الطالب به مباشرة.
                    </p>

                    <div className="mt-3 flex flex-col md:flex-row gap-3">

                      <input
                        value={
                          guardianPhone
                        }
                        onChange={(e) => {
                          setGuardianPhone(
                            e.target.value
                          );

                          setParentId(
                            ""
                          );

                          setParentLookupMessage(
                            ""
                          );

                          setParentLookupType(
                            ""
                          );
                        }}
                        onBlur={() =>
                          lookupParentByPhone(
                            guardianPhone
                          )
                        }
                        placeholder="رقم هاتف ولي الأمر"
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        inputMode="tel"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          lookupParentByPhone(
                            guardianPhone
                          )
                        }
                        disabled={
                          parentLookupLoading ||
                          !guardianPhone.trim()
                        }
                        className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold"
                      >
                        {parentLookupLoading
                          ? "جاري البحث..."
                          : "بحث تلقائي"}
                      </button>

                    </div>

                    {parentLookupMessage && (
                      <p
                        className={`mt-3 text-sm font-medium ${
                          parentLookupType ===
                          "success"
                            ? "text-green-700"
                            : "text-amber-700"
                        }`}
                      >
                        {
                          parentLookupMessage
                        }
                      </p>
                    )}

                  </div>

                </div>

                {/* هاتف الطالب */}

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    هاتف الطالب
                  </label>

                  <input
                    value={
                      phone
                    }
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
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
                    value={
                      guardianName
                    }
                    onChange={(e) =>
                      setGuardianName(
                        e.target.value
                      )
                    }
                    placeholder="اسم ولي الأمر"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* أزرار */}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(
                      false
                    );
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50"
                  disabled={
                    saving
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl"
                >

                  {saving && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {saving
                    ? "جاري الحفظ..."
                    : editingStudentId
                    ? "حفظ التعديلات"
                    : "حفظ الطالب"}

                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =================================================
          PRINT STYLES
      ================================================= */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
            color: black !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          th,
          td {
            border: 1px solid #d1d5db !important;
            padding: 7px !important;
            font-size: 11px !important;
          }

          thead {
            display: table-header-group;
          }

          tr {
            page-break-inside: avoid;
          }

          .bg-white {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
