"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Search,
  UserX,
  Save,
  RefreshCw,
  Building2,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type Role = "super_admin" | "sheikh" | "it_admin";

type Profile = {
  role: Role;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
};

type Student = {
  id: string;
  full_name: string;
  student_code: string | null;
  class_id: string | null;
  institute_id: string;
};

type ClassItem = {
  id: string;
  name: string;
  institute_id: string;
};

type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused";

type AttendanceRecord = {
  student_id: string;
  status: AttendanceStatus;
  notes: string;
};

export default function AttendancePage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [institutes, setInstitutes] =
    useState<Institute[]>([]);

  const [selectedInstitute, setSelectedInstitute] =
    useState("");

  /*
   * المعهد القادم من بطاقة المعهد
   */
  const [requestedInstituteId, setRequestedInstituteId] =
    useState<string | null | undefined>(undefined);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [attendance, setAttendance] =
    useState<Record<string, AttendanceRecord>>({});

  const [selectedClass, setSelectedClass] =
    useState("");

  const [selectedDate, setSelectedDate] =
    useState(
      new Date().toISOString().split("T")[0]
    );

  const [searchTerm, setSearchTerm] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loadingAttendance, setLoadingAttendance] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const canEdit =
    profile?.role === "it_admin";

  const isSuperAdmin =
    profile?.role === "super_admin";

  const isReadOnly =
    profile?.role === "super_admin" ||
    profile?.role === "sheikh";

  /*
   * =========================================================
   * قراءة instituteId من الرابط أولًا
   * =========================================================
   *
   * مهم:
   * لا نستدعي loadInitialData قبل قراءة الرابط.
   * هذا هو الإصلاح الأساسي للمشكلة.
   */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const instituteId =
      params.get("instituteId");

    setRequestedInstituteId(
      instituteId
    );
  }, []);

  /*
   * =========================================================
   * تحميل البيانات بعد معرفة المعهد القادم من الرابط
   * =========================================================
   */

  useEffect(() => {
    if (
      requestedInstituteId !== undefined
    ) {
      loadInitialData(
        requestedInstituteId
      );
    }
  }, [requestedInstituteId]);

  /*
   * =========================================================
   * عند تغيير المعهد
   * =========================================================
   */

  useEffect(() => {
    if (!selectedInstitute) {
      setStudents([]);
      setClasses([]);
      setAttendance({});
      return;
    }

    loadInstituteData();
  }, [selectedInstitute]);

  /*
   * =========================================================
   * عند تغيير المعهد أو التاريخ
   * =========================================================
   */

  useEffect(() => {
    if (
      selectedInstitute &&
      selectedDate
    ) {
      loadAttendance();
    }
  }, [
    selectedInstitute,
    selectedDate,
  ]);

  /*
   * =========================================================
   * تحميل بيانات المستخدم
   * =========================================================
   */

  async function loadInitialData(
    instituteIdFromUrl:
      string | null
  ) {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        setMessage(
          "يجب تسجيل الدخول أولًا"
        );

        setLoading(false);
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "role, institute_id, directorate_id"
          )
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        !profileData
      ) {
        console.error(profileError);

        setMessage(
          "لم يتم العثور على بيانات المستخدم"
        );

        setLoading(false);
        return;
      }

      const allowedRoles: Role[] = [
        "super_admin",
        "sheikh",
        "it_admin",
      ];

      if (
        !allowedRoles.includes(
          profileData.role as Role
        )
      ) {
        setMessage(
          "ليس لديك صلاحية للوصول إلى صفحة الحضور والغياب"
        );

        setLoading(false);
        return;
      }

      const currentProfile: Profile = {
        role:
          profileData.role as Role,

        institute_id:
          profileData.institute_id,

        directorate_id:
          profileData.directorate_id,
      };

      setProfile(currentProfile);

      /*
       * =====================================================
       * مدير الإدارة
       * =====================================================
       */

      if (
        currentProfile.role ===
        "super_admin"
      ) {
        if (
          !currentProfile.directorate_id
        ) {
          setMessage(
            "لم يتم ربط مدير الإدارة بإدارة تعليمية"
          );

          setLoading(false);
          return;
        }

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
              currentProfile.directorate_id
            )
            .order("name");

        if (institutesError) {
          console.error(
            institutesError
          );

          setMessage(
            "حدث خطأ أثناء تحميل المعاهد"
          );

          setLoading(false);
          return;
        }

        const loadedInstitutes =
          institutesData || [];

        setInstitutes(
          loadedInstitutes
        );

        /*
         * ===================================================
         * إذا تم فتح الصفحة من بطاقة معهد
         * ===================================================
         */

        if (
          instituteIdFromUrl
        ) {
          const requestedInstitute =
            loadedInstitutes.find(
              (institute) =>
                institute.id ===
                instituteIdFromUrl
            );

          if (requestedInstitute) {
            /*
             * تثبيت المعهد القادم من البطاقة
             */
            setSelectedInstitute(
              requestedInstitute.id
            );

            setMessage(
              "تم فتح الحضور والغياب للمعهد المحدد."
            );
          } else {
            /*
             * المعهد غير موجود ضمن إدارة المدير
             */
            setSelectedInstitute("");

            setMessage(
              "المعهد المطلوب غير تابع للإدارة الحالية"
            );
          }
        } else {
          /*
           * الدخول المباشر لصفحة الحضور
           */
          setSelectedInstitute("");
        }

        setLoading(false);
        return;
      }

      /*
       * =====================================================
       * شيخ المعهد + مسؤول IT
       * =====================================================
       */

      if (
        !currentProfile.institute_id
      ) {
        setMessage(
          "لم يتم ربط المستخدم بمعهد"
        );

        setLoading(false);
        return;
      }

      /*
       * حسابات المعهد لا يمكنها تغيير المعهد
       * من خلال الرابط.
       *
       * دائمًا نستخدم المعهد الموجود في profile.
       */

      setSelectedInstitute(
        currentProfile.institute_id
      );

      /*
       * تحميل اسم المعهد
       */

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
            currentProfile.institute_id
          )
          .maybeSingle();

      if (
        !instituteError &&
        instituteData
      ) {
        setInstitutes([
          instituteData,
        ]);
      }

      setLoading(false);
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ غير متوقع"
      );

      setLoading(false);
    }
  }

  /*
   * =========================================================
   * تحميل الفصول والطلاب
   * =========================================================
   */

  async function loadInstituteData() {
    if (!selectedInstitute) {
      return;
    }

    setLoadingStudents(true);
    setMessage("");

    try {
      /*
       * الفصول
       */

      const {
        data: classesData,
        error: classesError,
      } =
        await supabase
          .from("classes")
          .select(
            "id, name, institute_id"
          )
          .eq(
            "institute_id",
            selectedInstitute
          )
          .eq(
            "is_active",
            true
          )
          .order("name");

      if (classesError) {
        console.error(
          classesError
        );

        setMessage(
          "حدث خطأ أثناء تحميل الفصول"
        );

        setClasses([]);
      } else {
        setClasses(
          classesData || []
        );
      }

      /*
       * الطلاب
       */

      const {
        data: studentsData,
        error: studentsError,
      } =
        await supabase
          .from("students")
          .select(
            "id, full_name, student_code, class_id, institute_id"
          )
          .eq(
            "institute_id",
            selectedInstitute
          )
          .eq(
            "is_active",
            true
          )
          .order("full_name");

      if (studentsError) {
        console.error(
          studentsError
        );

        setStudents([]);

        setMessage(
          "تعذر تحميل الطلاب. يرجى التأكد من صلاحيات الوصول إلى بيانات الطلاب."
        );

        setLoadingStudents(false);
        return;
      }

      setStudents(
        studentsData || []
      );

      /*
       * تصفير الفصل عند تغيير المعهد
       */

      setSelectedClass("");
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ غير متوقع أثناء تحميل البيانات"
      );
    }

    setLoadingStudents(false);
  }

  /*
   * =========================================================
   * تحميل الحضور
   * =========================================================
   */

  async function loadAttendance() {
    if (
      !selectedInstitute ||
      !selectedDate
    ) {
      return;
    }

    setLoadingAttendance(true);

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from("attendance")
          .select(
            "student_id, status, notes"
          )
          .eq(
            "institute_id",
            selectedInstitute
          )
          .eq(
            "attendance_date",
            selectedDate
          );

      if (error) {
        console.error(error);

        setAttendance({});

        setMessage(
          "تعذر تحميل سجلات الحضور لهذا التاريخ"
        );

        setLoadingAttendance(false);
        return;
      }

      const records: Record<
        string,
        AttendanceRecord
      > = {};

      (data || []).forEach(
        (item) => {
          records[
            item.student_id
          ] = {
            student_id:
              item.student_id,

            status:
              item.status as AttendanceStatus,

            notes:
              item.notes || "",
          };
        }
      );

      setAttendance(records);
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء تحميل الحضور"
      );
    }

    setLoadingAttendance(false);
  }

  /*
   * =========================================================
   * تغيير حالة الطالب
   * مسؤول IT فقط
   * =========================================================
   */

  function setStudentStatus(
    studentId: string,
    status: AttendanceStatus
  ) {
    if (!canEdit) {
      return;
    }

    setAttendance(
      (current) => {
        const existing =
          current[studentId];

        return {
          ...current,

          [studentId]: {
            student_id:
              studentId,

            status,

            notes:
              existing?.notes ||
              "",
          },
        };
      }
    );

    setMessage("");
  }

  /*
   * =========================================================
   * الحالة الحالية للطالب
   * =========================================================
   */

  function getStudentStatus(
    studentId: string
  ): AttendanceStatus {
    return (
      attendance[studentId]
        ?.status || "present"
    );
  }

  /*
   * =========================================================
   * حفظ الحضور
   * مسؤول IT فقط
   * =========================================================
   */

  async function saveAttendance() {
    if (!canEdit) {
      setMessage(
        "ليس لديك صلاحية تعديل الحضور والغياب"
      );

      return;
    }

    if (!selectedInstitute) {
      setMessage(
        "يرجى اختيار المعهد"
      );

      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const rows =
        filteredStudents.map(
          (student) => ({
            institute_id:
              selectedInstitute,

            student_id:
              student.id,

            class_id:
              student.class_id,

            attendance_date:
              selectedDate,

            status:
              getStudentStatus(
                student.id
              ),

            notes:
              attendance[
                student.id
              ]?.notes || null,
          })
        );

      if (rows.length === 0) {
        setMessage(
          "لا يوجد طلاب للحفظ"
        );

        setSaving(false);
        return;
      }

      const {
        error,
      } =
        await supabase
          .from("attendance")
          .upsert(rows, {
            onConflict:
              "student_id,attendance_date",
          });

      if (error) {
        console.error(error);

        setMessage(
          "حدث خطأ أثناء حفظ الحضور. يرجى التأكد من صلاحيات مسؤول IT."
        );

        setSaving(false);
        return;
      }

      setMessage(
        "تم حفظ الحضور والغياب بنجاح ✅"
      );

      await loadAttendance();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ غير متوقع"
      );
    }

    setSaving(false);
  }

  /*
   * =========================================================
   * الطلاب بعد الفلترة
   * =========================================================
   */

  const filteredStudents =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const matchesClass =
            !selectedClass ||
            student.class_id ===
              selectedClass;

          const matchesSearch =
            !normalizedSearch ||
            student.full_name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (
              student.student_code ||
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          return (
            matchesClass &&
            matchesSearch
          );
        }
      );
    }, [
      students,
      selectedClass,
      searchTerm,
    ]);

  /*
   * =========================================================
   * الإحصائيات
   * =========================================================
   */

  const presentCount =
    filteredStudents.filter(
      (student) =>
        getStudentStatus(
          student.id
        ) === "present"
    ).length;

  const absentCount =
    filteredStudents.filter(
      (student) =>
        getStudentStatus(
          student.id
        ) === "absent"
    ).length;

  const lateCount =
    filteredStudents.filter(
      (student) =>
        getStudentStatus(
          student.id
        ) === "late"
    ).length;

  const excusedCount =
    filteredStudents.filter(
      (student) =>
        getStudentStatus(
          student.id
        ) === "excused"
    ).length;

  /*
   * =========================================================
   * المعهد الحالي
   * =========================================================
   */

  const currentInstitute =
    institutes.find(
      (institute) =>
        institute.id ===
        selectedInstitute
    );

  /*
   * =========================================================
   * شاشة التحميل
   * =========================================================
   */

  if (loading) {
    return (
      <main
        className="min-h-screen bg-gray-50 p-8"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto text-center py-20">

          <RefreshCw
            className="mx-auto animate-spin mb-4"
            size={32}
          />

          <p className="text-gray-600">
            جاري تحميل بيانات الحضور...
          </p>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * الصفحة
   * =========================================================
   */

  return (
    <main
      className="min-h-screen bg-gray-50 p-6 md:p-8"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto">

        {/* Header */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <div className="flex items-center gap-3 mb-2">

              <h1 className="text-3xl font-bold text-gray-800">
                الحضور والغياب
              </h1>

              {isReadOnly && (
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  <Eye size={16} />
                  اطلاع فقط
                </span>
              )}

              {canEdit && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  <ShieldCheck size={16} />
                  إدخال وتعديل
                </span>
              )}

            </div>

            <p className="text-gray-500 mt-2">
              متابعة حضور وغياب طلاب المعهد
            </p>

            {currentInstitute && (
              <div className="flex items-center gap-2 mt-3 text-blue-700 font-semibold">

                <Building2 size={18} />

                <span>
                  {currentInstitute.name}
                </span>

                {currentInstitute.code && (
                  <span className="text-gray-400">
                    (
                    {
                      currentInstitute.code
                    }
                    )
                  </span>
                )}

              </div>
            )}

          </div>

          {/* زر الحفظ لمسؤول IT فقط */}

          {canEdit && (
            <button
              type="button"
              onClick={
                saveAttendance
              }
              disabled={
                saving ||
                !selectedInstitute ||
                filteredStudents.length ===
                  0
              }
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Save size={20} />

              {saving
                ? "جاري الحفظ..."
                : "حفظ الحضور"}
            </button>
          )}

        </div>

        {/* Message */}

        {message && (
          <div className="mb-6 bg-white border border-blue-200 text-blue-700 rounded-xl p-4">
            {message}
          </div>
        )}

        {/* ================================================= */}
        {/* اختيار المعهد لمدير الإدارة */}
        {/* ================================================= */}

        {isSuperAdmin && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              المعهد
            </label>

            <div className="relative">

              <Building2
                size={20}
                className="absolute right-3 top-3 text-gray-400"
              />

              <select
                value={
                  selectedInstitute
                }
                onChange={(e) =>
                  setSelectedInstitute(
                    e.target.value
                  )
                }
                disabled={
                  !!requestedInstituteId
                }
                className={`w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500 ${
                  requestedInstituteId
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-white"
                }`}
              >

                <option value="">
                  اختر المعهد
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

                      {institute.code
                        ? ` - ${institute.code}`
                        : ""}
                    </option>
                  )
                )}

              </select>

            </div>

            <p className="text-sm text-gray-500 mt-2">

              {requestedInstituteId
                ? "تم فتح الحضور من بطاقة المعهد المحدد، لذلك تم تثبيت هذا المعهد."
                : "مدير الإدارة لديه صلاحية الاطلاع فقط على حضور طلاب جميع المعاهد التابعة للإدارة."}

            </p>

          </div>
        )}

        {/* ================================================= */}
        {/* Filters */}
        {/* ================================================= */}

        {selectedInstitute && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Date */}

              <div>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التاريخ
                </label>

                <div className="relative">

                  <CalendarDays
                    size={20}
                    className="absolute right-3 top-3 text-gray-400"
                  />

                  <input
                    type="date"
                    value={
                      selectedDate
                    }
                    onChange={(e) =>
                      setSelectedDate(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* Class */}

              <div>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الفصل
                </label>

                <select
                  value={
                    selectedClass
                  }
                  onChange={(e) =>
                    setSelectedClass(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="">
                    كل الفصول
                  </option>

                  {classes.map(
                    (classItem) => (
                      <option
                        key={
                          classItem.id
                        }
                        value={
                          classItem.id
                        }
                      >
                        {
                          classItem.name
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* Search */}

              <div>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  بحث عن طالب
                </label>

                <div className="relative">

                  <Search
                    size={20}
                    className="absolute right-3 top-3 text-gray-400"
                  />

                  <input
                    type="text"
                    placeholder="اسم الطالب أو الكود..."
                    value={
                      searchTerm
                    }
                    onChange={(e) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================================================= */}
        {/* No institute selected */}
        {/* ================================================= */}

        {isSuperAdmin &&
          !selectedInstitute && (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">

              <Building2
                size={48}
                className="mx-auto mb-4 text-gray-300"
              />

              <h2 className="text-xl font-bold text-gray-700 mb-2">
                اختر المعهد
              </h2>

              <p className="text-gray-500">
                اختر المعهد لعرض بيانات الحضور
                والغياب الخاصة بطلابه.
              </p>

            </div>
          )}

        {/* ================================================= */}
        {/* Institute data */}
        {/* ================================================= */}

        {selectedInstitute && (
          <>

            {/* Statistics */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

              <div className="bg-white rounded-2xl shadow-sm p-5 border-r-4 border-green-500">

                <div className="flex items-center gap-3">

                  <Check className="text-green-600" />

                  <div>

                    <p className="text-gray-500 text-sm">
                      حاضر
                    </p>

                    <p className="text-2xl font-bold">
                      {
                        presentCount
                      }
                    </p>

                  </div>

                </div>

              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5 border-r-4 border-red-500">

                <div className="flex items-center gap-3">

                  <UserX className="text-red-600" />

                  <div>

                    <p className="text-gray-500 text-sm">
                      غائب
                    </p>

                    <p className="text-2xl font-bold">
                      {
                        absentCount
                      }
                    </p>

                  </div>

                </div>

              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5 border-r-4 border-yellow-500">

                <div className="flex items-center gap-3">

                  <Clock className="text-yellow-600" />

                  <div>

                    <p className="text-gray-500 text-sm">
                      متأخر
                    </p>

                    <p className="text-2xl font-bold">
                      {
                        lateCount
                      }
                    </p>

                  </div>

                </div>

              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5 border-r-4 border-blue-500">

                <div className="flex items-center gap-3">

                  <CalendarDays className="text-blue-600" />

                  <div>

                    <p className="text-gray-500 text-sm">
                      معذور
                    </p>

                    <p className="text-2xl font-bold">
                      {
                        excusedCount
                      }
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* Students */}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

              <div className="p-6 border-b">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                  <div>

                    <h2 className="text-xl font-bold text-gray-800">
                      قائمة الطلاب
                    </h2>

                    <p className="text-gray-500 text-sm mt-1">
                      عدد الطلاب:{" "}
                      {
                        filteredStudents.length
                      }
                    </p>

                  </div>

                  {loadingStudents && (
                    <div className="flex items-center gap-2 text-gray-500">

                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />

                      جاري تحميل الطلاب...

                    </div>
                  )}

                  {loadingAttendance && (
                    <div className="flex items-center gap-2 text-gray-500">

                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />

                      جاري تحميل الحضور...

                    </div>
                  )}

                </div>

              </div>

              {filteredStudents.length ===
              0 ? (
                <div className="text-center py-16 text-gray-500">

                  {loadingStudents ? (
                    <p>
                      جاري تحميل الطلاب...
                    </p>
                  ) : students.length ===
                    0 ? (
                    <>
                      <p className="font-semibold">
                        لا يوجد طلاب مسجلون في هذا المعهد
                      </p>

                      <p className="text-sm mt-2">
                        أو أن حسابك لا يملك صلاحية
                        الوصول إلى بيانات الطلاب.
                      </p>
                    </>
                  ) : (
                    <p>
                      لا يوجد طلاب مطابقون للبحث
                    </p>
                  )}

                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="text-right px-6 py-4">
                          الطالب
                        </th>

                        <th className="text-right px-6 py-4">
                          الكود
                        </th>

                        <th className="text-center px-6 py-4">
                          الحالة
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {filteredStudents.map(
                        (student) => {

                          const status =
                            getStudentStatus(
                              student.id
                            );

                          return (
                            <tr
                              key={
                                student.id
                              }
                              className="hover:bg-gray-50"
                            >

                              <td className="px-6 py-5">

                                <div className="font-semibold text-gray-800">
                                  {
                                    student.full_name
                                  }
                                </div>

                              </td>

                              <td className="px-6 py-5 text-gray-500">
                                {
                                  student.student_code ||
                                  "-"
                                }
                              </td>

                              <td className="px-6 py-5">

                                <div className="flex flex-wrap justify-center gap-2">

                                  {/* حاضر */}

                                  <button
                                    type="button"
                                    disabled={
                                      !canEdit
                                    }
                                    onClick={() =>
                                      setStudentStatus(
                                        student.id,
                                        "present"
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg font-medium transition ${
                                      status ===
                                      "present"
                                        ? "bg-green-600 text-white shadow-sm"
                                        : "bg-green-50 text-green-700"
                                    } ${
                                      canEdit
                                        ? "hover:bg-green-100"
                                        : "cursor-default opacity-90"
                                    }`}
                                  >
                                    حاضر
                                  </button>

                                  {/* غائب */}

                                  <button
                                    type="button"
                                    disabled={
                                      !canEdit
                                    }
                                    onClick={() =>
                                      setStudentStatus(
                                        student.id,
                                        "absent"
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg font-medium transition ${
                                      status ===
                                      "absent"
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "bg-red-50 text-red-700"
                                    } ${
                                      canEdit
                                        ? "hover:bg-red-100"
                                        : "cursor-default opacity-90"
                                    }`}
                                  >
                                    غائب
                                  </button>

                                  {/* متأخر */}

                                  <button
                                    type="button"
                                    disabled={
                                      !canEdit
                                    }
                                    onClick={() =>
                                      setStudentStatus(
                                        student.id,
                                        "late"
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg font-medium transition ${
                                      status ===
                                      "late"
                                        ? "bg-yellow-500 text-white shadow-sm"
                                        : "bg-yellow-50 text-yellow-700"
                                    } ${
                                      canEdit
                                        ? "hover:bg-yellow-100"
                                        : "cursor-default opacity-90"
                                    }`}
                                  >
                                    متأخر
                                  </button>

                                  {/* معذور */}

                                  <button
                                    type="button"
                                    disabled={
                                      !canEdit
                                    }
                                    onClick={() =>
                                      setStudentStatus(
                                        student.id,
                                        "excused"
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg font-medium transition ${
                                      status ===
                                      "excused"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-blue-50 text-blue-700"
                                    } ${
                                      canEdit
                                        ? "hover:bg-blue-100"
                                        : "cursor-default opacity-90"
                                    }`}
                                  >
                                    معذور
                                  </button>

                                </div>

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

          </>
        )}

      </div>
    </main>
  );
}
