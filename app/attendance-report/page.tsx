"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Search,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldCheck,
  Building2,
  TrendingUp,
  Printer,
} from "lucide-react";

import { supabase } from "../../lib/supabase/client";

type Profile = {
  id: string;
  role: string;
  institute_id: string | null;
  directorate_id: string | null;
};

type Institute = {
  id: string;
  name: string;
  code?: string | null;
  directorate_id?: string | null;
};

type ClassItem = {
  id: string;
  name: string;
  institute_id: string;
};

type Student = {
  id: string;
  full_name: string;
  class_id: string | null;
  institute_id: string;
  national_id: string | null;
  phone: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  institute_id: string;
  class_id: string | null;
  attendance_date: string;
  status: string;
};

type ReportRow = {
  student: Student;
  className: string;
  instituteName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
};

type InstituteSummary = {
  instituteId: string;
  instituteName: string;
  students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
};

const CENTRAL_ROLES = ["director", "super_admin"];

const ALLOWED_ROLES = [
  "sheikh",
  "director",
  "super_admin",
  "it_admin",
];

export default function AttendanceReportPage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [institutes, setInstitutes] =
    useState<Institute[]>([]);

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [attendance, setAttendance] =
    useState<AttendanceRow[]>([]);

  const [selectedInstitute, setSelectedInstitute] =
    useState("");

  const [selectedClass, setSelectedClass] =
    useState("");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [reportLoading, setReportLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const isCentralManager =
    !!profile &&
    CENTRAL_ROLES.includes(profile.role);

  const isInstituteUser =
    !!profile &&
    ["sheikh", "it_admin"].includes(
      profile.role
    );

  // =========================================================
  // قراءة instituteId من الرابط
  // بدون useSearchParams
  // =========================================================
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const instituteId =
      params.get("instituteId");

    if (instituteId) {
      setSelectedInstitute(instituteId);
    }
  }, []);

  // =========================================================
  // تحميل البيانات الأولية
  // =========================================================
  useEffect(() => {
    loadInitialData();
  }, []);

  // =========================================================
  // إعادة تحميل التقرير عند تغيير الفلاتر
  // =========================================================
  useEffect(() => {
    if (!profile) return;

    if (
      isInstituteUser &&
      profile.institute_id
    ) {
      loadInstituteData(
        profile.institute_id
      );

      return;
    }

    if (isCentralManager) {
      if (selectedInstitute) {
        loadInstituteData(
          selectedInstitute
        );
      } else {
        loadDirectorateData();
      }
    }
  }, [
    profile,
    selectedInstitute,
    fromDate,
    toDate,
  ]);

  // =========================================================
  // تحميل المستخدم
  // =========================================================
  async function loadInitialData() {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setMessage(
          "يجب تسجيل الدخول أولًا."
        );

        setLoading(false);

        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, role, institute_id, directorate_id"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        setMessage(
          "لم يتم العثور على بيانات المستخدم."
        );

        setLoading(false);

        return;
      }

      if (
        !ALLOWED_ROLES.includes(
          profileData.role
        )
      ) {
        setMessage(
          "ليس لديك صلاحية لعرض تقرير الحضور."
        );

        setLoading(false);

        return;
      }

      const currentProfile =
        profileData as Profile;

      setProfile(currentProfile);

      // -------------------------------------------------------
      // مستخدم المعهد
      // -------------------------------------------------------
      if (
        ["sheikh", "it_admin"].includes(
          currentProfile.role
        ) &&
        currentProfile.institute_id
      ) {
        const {
          data: instituteData,
          error: instituteError,
        } = await supabase
          .from("institutes")
          .select(
            "id, name, code, directorate_id"
          )
          .eq(
            "id",
            currentProfile.institute_id
          )
          .maybeSingle();

        if (instituteError) {
          throw instituteError;
        }

        setInstitutes(
          instituteData
            ? [instituteData]
            : []
        );

        setSelectedInstitute(
          currentProfile.institute_id
        );
      }

      // -------------------------------------------------------
      // المدير / Super Admin
      // -------------------------------------------------------
      if (
        ["director", "super_admin"].includes(
          currentProfile.role
        )
      ) {
        let query = supabase
          .from("institutes")
          .select(
            "id, name, code, directorate_id"
          )
          .eq("is_active", true)
          .order("name");

        if (currentProfile.directorate_id) {
          query = query.eq(
            "directorate_id",
            currentProfile.directorate_id
          );
        }

        const {
          data: instituteData,
          error: instituteError,
        } = await query;

        if (instituteError) {
          throw instituteError;
        }

        setInstitutes(
          instituteData || []
        );

        const params =
          new URLSearchParams(
            window.location.search
          );

        const instituteIdFromUrl =
          params.get("instituteId");

        if (
          instituteIdFromUrl &&
          (instituteData || []).some(
            (item) =>
              item.id ===
              instituteIdFromUrl
          )
        ) {
          setSelectedInstitute(
            instituteIdFromUrl
          );
        }
      }
    } catch (error: any) {
      console.error(
        "loadInitialData error:",
        error
      );

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل بيانات التقرير."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // تحميل بيانات معهد
  // =========================================================
  async function loadInstituteData(
    instituteId: string
  ) {
    try {
      setReportLoading(true);
      setMessage("");

      // -------------------------------------------------------
      // الفصول
      // -------------------------------------------------------
      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(
          "id, name, institute_id"
        )
        .eq(
          "institute_id",
          instituteId
        )
        .eq("is_active", true)
        .order("name");

      if (classError) {
        throw classError;
      }

      setClasses(
        classData || []
      );

      // -------------------------------------------------------
      // الطلاب
      // IMPORTANT:
      // full_name وليس name
      // -------------------------------------------------------
      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, full_name, class_id, institute_id, national_id, phone"
        )
        .eq(
          "institute_id",
          instituteId
        )
        .eq("is_active", true)
        .order("full_name");

      if (studentError) {
        throw studentError;
      }

      setStudents(
        studentData || []
      );

      await loadAttendance(
        [instituteId],
        studentData || []
      );
    } catch (error: any) {
      console.error(
        "loadInstituteData error:",
        error
      );

      setStudents([]);
      setClasses([]);
      setAttendance([]);

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل بيانات المعهد."
      );
    } finally {
      setReportLoading(false);
    }
  }

  // =========================================================
  // تحميل جميع المعاهد
  // =========================================================
  async function loadDirectorateData() {
    try {
      setReportLoading(true);
      setMessage("");

      if (!profile?.directorate_id) {
        setClasses([]);
        setStudents([]);
        setAttendance([]);

        setReportLoading(false);

        return;
      }

      const instituteIds =
        institutes.map(
          (item) => item.id
        );

      if (instituteIds.length === 0) {
        setClasses([]);
        setStudents([]);
        setAttendance([]);

        setReportLoading(false);

        return;
      }

      // -------------------------------------------------------
      // الفصول
      // -------------------------------------------------------
      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(
          "id, name, institute_id"
        )
        .in(
          "institute_id",
          instituteIds
        )
        .eq("is_active", true)
        .order("name");

      if (classError) {
        throw classError;
      }

      setClasses(
        classData || []
      );

      // -------------------------------------------------------
      // الطلاب
      // -------------------------------------------------------
      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, full_name, class_id, institute_id, national_id, phone"
        )
        .in(
          "institute_id",
          instituteIds
        )
        .eq("is_active", true)
        .order("full_name");

      if (studentError) {
        throw studentError;
      }

      setStudents(
        studentData || []
      );

      await loadAttendance(
        instituteIds,
        studentData || []
      );
    } catch (error: any) {
      console.error(
        "loadDirectorateData error:",
        error
      );

      setStudents([]);
      setClasses([]);
      setAttendance([]);

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل بيانات الإدارة التعليمية."
      );
    } finally {
      setReportLoading(false);
    }
  }

  // =========================================================
  // تحميل الحضور
  // =========================================================
  async function loadAttendance(
    instituteIds: string[],
    currentStudents: Student[]
  ) {
    try {
      if (
        instituteIds.length === 0 ||
        currentStudents.length === 0
      ) {
        setAttendance([]);
        return;
      }

      const studentIds =
        currentStudents.map(
          (student) => student.id
        );

      let query = supabase
        .from("attendance")
        .select(
          "id, student_id, institute_id, class_id, attendance_date, status"
        )
        .in(
          "institute_id",
          instituteIds
        )
        .in(
          "student_id",
          studentIds
        )
        .order(
          "attendance_date",
          {
            ascending: false,
          }
        );

      if (fromDate) {
        query = query.gte(
          "attendance_date",
          fromDate
        );
      }

      if (toDate) {
        query = query.lte(
          "attendance_date",
          toDate
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setAttendance(
        data || []
      );
    } catch (error: any) {
      console.error(
        "loadAttendance error:",
        error
      );

      setAttendance([]);

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل سجلات الحضور."
      );
    }
  }

  // =========================================================
  // تحديث التقرير
  // =========================================================
  async function refreshReport() {
    if (!profile) return;

    if (
      isInstituteUser &&
      profile.institute_id
    ) {
      await loadInstituteData(
        profile.institute_id
      );

      return;
    }

    if (isCentralManager) {
      if (selectedInstitute) {
        await loadInstituteData(
          selectedInstitute
        );
      } else {
        await loadDirectorateData();
      }
    }
  }

  // =========================================================
  // قائمة الفصول بدون تكرار الاسم
  // =========================================================
  const filteredClasses =
    useMemo(() => {
      const source = selectedInstitute
        ? classes.filter(
            (item) =>
              item.institute_id ===
              selectedInstitute
          )
        : classes;

      const unique =
        new Map<string, ClassItem>();

      source.forEach((item) => {
        const key =
          `${item.institute_id}-${item.name.trim()}`;

        if (!unique.has(key)) {
          unique.set(key, item);
        }
      });

      return Array.from(
        unique.values()
      );
    }, [
      classes,
      selectedInstitute,
    ]);

  // =========================================================
  // Map الفصول
  // =========================================================
  const classMap =
    useMemo(() => {
      const map =
        new Map<string, string>();

      classes.forEach((item) => {
        map.set(
          item.id,
          item.name
        );
      });

      return map;
    }, [classes]);

  // =========================================================
  // Map المعاهد
  // =========================================================
  const instituteMap =
    useMemo(() => {
      const map =
        new Map<string, string>();

      institutes.forEach((item) => {
        map.set(
          item.id,
          item.name
        );
      });

      return map;
    }, [institutes]);

  // =========================================================
  // التقرير
  // =========================================================
  const report =
    useMemo<ReportRow[]>(() => {
      const attendanceByStudent =
        new Map<
          string,
          AttendanceRow[]
        >();

      attendance.forEach(
        (row) => {
          const existing =
            attendanceByStudent.get(
              row.student_id
            ) || [];

          existing.push(row);

          attendanceByStudent.set(
            row.student_id,
            existing
          );
        }
      );

      return students
        .filter((student) => {
          if (
            selectedInstitute &&
            student.institute_id !==
              selectedInstitute
          ) {
            return false;
          }

          if (
            selectedClass &&
            student.class_id !==
              selectedClass
          ) {
            return false;
          }

          if (search.trim()) {
            const value =
              search
                .trim()
                .toLowerCase();

            const fullName =
              student.full_name
                ?.toLowerCase() ||
              "";

            const nationalId =
              student.national_id
                ?.toLowerCase() ||
              "";

            const phone =
              student.phone
                ?.toLowerCase() ||
              "";

            if (
              !fullName.includes(
                value
              ) &&
              !nationalId.includes(
                value
              ) &&
              !phone.includes(
                value
              )
            ) {
              return false;
            }
          }

          return true;
        })
        .map((student) => {
          const records =
            attendanceByStudent.get(
              student.id
            ) || [];

          let present = 0;
          let absent = 0;
          let late = 0;
          let excused = 0;

          records.forEach(
            (record) => {
              const status =
                record.status
                  ?.toLowerCase()
                  .trim();

              if (
                status ===
                  "present" ||
                status ===
                  "حاضر"
              ) {
                present++;
              } else if (
                status ===
                  "absent" ||
                status ===
                  "غائب"
              ) {
                absent++;
              } else if (
                status ===
                  "late" ||
                status ===
                  "متأخر"
              ) {
                late++;
              } else if (
                status ===
                  "excused" ||
                status ===
                  "معذور"
              ) {
                excused++;
              }
            }
          );

          const total =
            present +
            absent +
            late +
            excused;

          const attended =
            present +
            late +
            excused;

          const percentage =
            total > 0
              ? Math.round(
                  (attended /
                    total) *
                    100
                )
              : 0;

          return {
            student,

            className:
              student.class_id
                ? classMap.get(
                    student.class_id
                  ) ||
                  "بدون فصل"
                : "بدون فصل",

            instituteName:
              instituteMap.get(
                student.institute_id
              ) ||
              "غير محدد",

            present,
            absent,
            late,
            excused,
            total,
            percentage,
          };
        });
    }, [
      students,
      attendance,
      selectedInstitute,
      selectedClass,
      search,
      classMap,
      instituteMap,
    ]);

  // =========================================================
  // الإجماليات
  // =========================================================
  const totals =
    useMemo(() => {
      return report.reduce(
        (acc, row) => {
          acc.students++;

          acc.present +=
            row.present;

          acc.absent +=
            row.absent;

          acc.late +=
            row.late;

          acc.excused +=
            row.excused;

          acc.total +=
            row.total;

          return acc;
        },
        {
          students: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        }
      );
    }, [report]);

  const overallPercentage =
    totals.total > 0
      ? Math.round(
          ((totals.present +
            totals.late +
            totals.excused) /
            totals.total) *
            100
        )
      : 0;

  // =========================================================
  // ملخص المعاهد
  // =========================================================
  const instituteSummary =
    useMemo<InstituteSummary[]>(
      () => {
        const grouped =
          new Map<
            string,
            InstituteSummary
          >();

        report.forEach(
          (row) => {
            const instituteId =
              row.student
                .institute_id;

            const existing =
              grouped.get(
                instituteId
              );

            if (existing) {
              // FIX:
              // زيادة عدد الطلاب لكل طالب
              existing.students += 1;

              existing.present +=
                row.present;

              existing.absent +=
                row.absent;

              existing.late +=
                row.late;

              existing.excused +=
                row.excused;

              existing.total +=
                row.total;

              return;
            }

            grouped.set(
              instituteId,
              {
                instituteId,
                instituteName:
                  row.instituteName,

                students: 1,

                present:
                  row.present,

                absent:
                  row.absent,

                late:
                  row.late,

                excused:
                  row.excused,

                total:
                  row.total,

                percentage: 0,
              }
            );
          }
        );

        return Array.from(
          grouped.values()
        ).map((item) => ({
          ...item,

          percentage:
            item.total > 0
              ? Math.round(
                  ((item.present +
                    item.late +
                    item.excused) /
                    item.total) *
                    100
                )
              : 0,
        }));
      },
      [report]
    );

  // =========================================================
  // HTML Escape
  // =========================================================
  function escapeHtml(
    value: unknown
  ) {
    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
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

  // =========================================================
  // التاريخ
  // =========================================================
  function formatDateForPrint(
    value: string
  ) {
    if (!value) return "—";

    const date = new Date(
      `${value}T00:00:00`
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "ar-EG",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  }

  // =========================================================
  // الطباعة
  // =========================================================
  function handlePrintReport() {
    const instituteName =
      selectedInstitute
        ? institutes.find(
            (item) =>
              item.id ===
              selectedInstitute
          )?.name ||
          "المعهد"
        : "جميع المعاهد";

    const className =
      selectedClass
        ? classes.find(
            (item) =>
              item.id ===
              selectedClass
          )?.name ||
          "الفصل"
        : "جميع الفصول";

    const rowsHtml =
      report
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>

              <td>
                ${escapeHtml(
                  row.student
                    .full_name
                )}
              </td>

              <td>
                ${escapeHtml(
                  row.instituteName
                )}
              </td>

              <td>
                ${escapeHtml(
                  row.className
                )}
              </td>

              <td>
                ${row.present}
              </td>

              <td>
                ${row.absent}
              </td>

              <td>
                ${row.late}
              </td>

              <td>
                ${row.excused}
              </td>

              <td>
                ${row.total}
              </td>

              <td>
                ${row.percentage}%
              </td>
            </tr>
          `
        )
        .join("");

    const summaryHtml =
      instituteSummary
        .map(
          (item) => `
            <tr>
              <td>
                ${escapeHtml(
                  item.instituteName
                )}
              </td>

              <td>
                ${item.students}
              </td>

              <td>
                ${item.present}
              </td>

              <td>
                ${item.absent}
              </td>

              <td>
                ${item.late}
              </td>

              <td>
                ${item.excused}
              </td>

              <td>
                ${item.percentage}%
              </td>
            </tr>
          `
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1400,height=900"
      );

    if (!printWindow) {
      setMessage(
        "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة."
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html
        lang="ar"
        dir="rtl"
      >

      <head>

        <meta charset="UTF-8" />

        <title>
          تقرير الحضور والغياب
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
            font-family:
              "Segoe UI",
              Tahoma,
              Arial,
              sans-serif;

            direction: rtl;

            color: #111827;

            margin: 0;

            background: #fff;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
          }

          .header h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          .header p {
            margin: 4px 0;
            color: #4b5563;
            font-size: 13px;
          }

          .filters {
            display: grid;

            grid-template-columns:
              repeat(4, 1fr);

            gap: 8px;

            margin-bottom: 16px;
          }

          .filter {
            border:
              1px solid #d1d5db;

            border-radius: 8px;

            padding: 8px;

            background: #f9fafb;
          }

          .filter strong {
            display: block;

            font-size: 11px;

            color: #6b7280;

            margin-bottom: 3px;
          }

          .stats {
            display: grid;

            grid-template-columns:
              repeat(5, 1fr);

            gap: 8px;

            margin-bottom: 20px;
          }

          .stat {
            border:
              1px solid #d1d5db;

            border-radius: 8px;

            padding: 10px;

            text-align: center;
          }

          .stat strong {
            display: block;

            font-size: 18px;

            margin-top: 4px;
          }

          h2 {
            font-size: 17px;

            margin:
              20px 0
              10px;
          }

          table {
            width: 100%;

            border-collapse:
              collapse;

            margin-bottom: 20px;
          }

          th,
          td {
            border:
              1px solid #d1d5db;

            padding:
              7px 6px;

            text-align: center;

            font-size: 11px;
          }

          th {
            background:
              #f3f4f6;

            font-weight: 700;
          }

          tbody tr:nth-child(even) {
            background:
              #fafafa;
          }

          .footer {
            margin-top: 20px;

            display: flex;

            justify-content:
              space-between;

            font-size: 11px;

            color: #6b7280;
          }

          .empty {
            text-align: center;

            padding: 30px;

            border:
              1px solid #d1d5db;
          }

        </style>

      </head>

      <body>

        <div class="header">

          <h1>
            تقرير الحضور والغياب
          </h1>

          <p>
            منصة الإدارة والمتابعة التعليمية الأزهرية
          </p>

          <p>
            تقرير متابعة وتحليل حضور الطلاب
          </p>

        </div>

        <div class="filters">

          <div class="filter">

            <strong>
              المعهد
            </strong>

            ${escapeHtml(
              instituteName
            )}

          </div>

          <div class="filter">

            <strong>
              الفصل
            </strong>

            ${escapeHtml(
              className
            )}

          </div>

          <div class="filter">

            <strong>
              من تاريخ
            </strong>

            ${escapeHtml(
              fromDate
                ? formatDateForPrint(
                    fromDate
                  )
                : "كل التواريخ"
            )}

          </div>

          <div class="filter">

            <strong>
              إلى تاريخ
            </strong>

            ${escapeHtml(
              toDate
                ? formatDateForPrint(
                    toDate
                  )
                : "كل التواريخ"
            )}

          </div>

        </div>

        <div class="stats">

          <div class="stat">
            الطلاب

            <strong>
              ${totals.students}
            </strong>
          </div>

          <div class="stat">
            حاضر

            <strong>
              ${totals.present}
            </strong>
          </div>

          <div class="stat">
            غائب

            <strong>
              ${totals.absent}
            </strong>
          </div>

          <div class="stat">
            متأخر

            <strong>
              ${totals.late}
            </strong>
          </div>

          <div class="stat">
            نسبة الحضور

            <strong>
              ${overallPercentage}%
            </strong>
          </div>

        </div>

        ${
          instituteSummary.length > 0
            ? `
              <h2>
                ملخص الحضور حسب المعهد
              </h2>

              <table>

                <thead>

                  <tr>

                    <th>
                      المعهد
                    </th>

                    <th>
                      الطلاب
                    </th>

                    <th>
                      حاضر
                    </th>

                    <th>
                      غائب
                    </th>

                    <th>
                      متأخر
                    </th>

                    <th>
                      معذور
                    </th>

                    <th>
                      نسبة الحضور
                    </th>

                  </tr>

                </thead>

                <tbody>

                  ${summaryHtml}

                </tbody>

              </table>
            `
            : ""
        }

        <h2>
          تفاصيل حضور الطلاب
        </h2>

        ${
          report.length > 0
            ? `
              <table>

                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      اسم الطالب
                    </th>

                    <th>
                      المعهد
                    </th>

                    <th>
                      الفصل
                    </th>

                    <th>
                      حاضر
                    </th>

                    <th>
                      غائب
                    </th>

                    <th>
                      متأخر
                    </th>

                    <th>
                      معذور
                    </th>

                    <th>
                      الإجمالي
                    </th>

                    <th>
                      نسبة الحضور
                    </th>

                  </tr>

                </thead>

                <tbody>

                  ${rowsHtml}

                </tbody>

              </table>
            `
            : `
              <div class="empty">
                لا توجد بيانات مطابقة للفلاتر المحددة.
              </div>
            `
        }

        <div class="footer">

          <span>
            تاريخ الطباعة:
            ${new Date().toLocaleString(
              "ar-EG"
            )}
          </span>

          <span>
            نظام إدارة المعاهد الأزهرية
          </span>

        </div>

        <script>

          window.onload =
            function () {
              window.print();
            };

        </script>

      </body>

      </html>
    `);

    printWindow.document.close();
  }

  // =========================================================
  // Loading
  // =========================================================
  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-6"
      >
        <div className="mx-auto max-w-7xl">

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />

            <p className="text-slate-600">
              جاري تحميل تقرير الحضور والغياب...
            </p>

          </div>

        </div>
      </main>
    );
  }

  // =========================================================
  // UI
  // =========================================================
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="mb-2 flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">

                  <BarChart3 className="h-6 w-6" />

                </div>

                <div>

                  <h1 className="text-2xl font-bold text-slate-900">
                    تقرير الحضور والغياب
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    متابعة وتحليل حضور الطلاب خلال الفترة المحددة
                  </p>

                </div>

              </div>

            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={refreshReport}
                disabled={reportLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <RefreshCw
                  className={`h-4 w-4 ${
                    reportLoading
                      ? "animate-spin"
                      : ""
                  }`}
                />

                تحديث التقرير

              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >

                <Printer className="h-4 w-4" />

                طباعة التقرير

              </button>

            </div>

          </div>

        </section>

        {/* Message */}
        {message && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        )}

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">

              <CalendarDays className="h-5 w-5" />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                خيارات التقرير
              </h2>

              <p className="text-xs text-slate-500">
                حدد المعهد والفصل والفترة الزمنية
              </p>

            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            {/* Institute */}
            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                المعهد
              </label>

              <select
                value={selectedInstitute}
                onChange={(event) => {
                  setSelectedInstitute(
                    event.target.value
                  );

                  setSelectedClass("");
                }}
                disabled={isInstituteUser}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >

                {isCentralManager && (
                  <option value="">
                    جميع المعاهد
                  </option>
                )}

                {institutes.map(
                  (institute) => (
                    <option
                      key={institute.id}
                      value={institute.id}
                    >
                      {institute.name}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* Class */}
            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                الفصل
              </label>

              <select
                value={selectedClass}
                onChange={(event) =>
                  setSelectedClass(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="">
                  جميع الفصول
                </option>

                {filteredClasses.map(
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

            {/* From */}
            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                من تاريخ
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* To */}
            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                إلى تاريخ
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* Search */}
            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                بحث
              </label>

              <div className="relative">

                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="اسم الطالب أو الرقم القومي..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

          </div>

        </section>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  الطلاب
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {totals.students}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">

                <Users className="h-5 w-5" />

              </div>

            </div>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  حاضر
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {totals.present}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">

                <CheckCircle2 className="h-5 w-5" />

              </div>

            </div>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  غائب
                </p>

                <p className="mt-2 text-2xl font-bold text-red-600">
                  {totals.absent}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">

                <XCircle className="h-5 w-5" />

              </div>

            </div>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  متأخر
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {totals.late}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">

                <Clock3 className="h-5 w-5" />

              </div>

            </div>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  نسبة الحضور
                </p>

                <p className="mt-2 text-2xl font-bold text-indigo-600">
                  {overallPercentage}%
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

                <TrendingUp className="h-5 w-5" />

              </div>

            </div>

          </div>

        </section>

        {/* Institute Summary */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

              <Building2 className="h-5 w-5" />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                ملخص الحضور حسب المعهد
              </h2>

              <p className="text-xs text-slate-500">
                مقارنة مؤشرات الحضور بين المعاهد
              </p>

            </div>

          </div>

          {instituteSummary.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px] border-collapse">

                <thead>

                  <tr className="border-b border-slate-200 text-right">

                    <th className="px-4 py-3 text-sm font-bold text-slate-700">
                      المعهد
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                      الطلاب
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-bold text-emerald-700">
                      حاضر
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-bold text-red-700">
                      غائب
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-bold text-amber-700">
                      متأخر
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                      معذور
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-bold text-blue-700">
                      نسبة الحضور
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {instituteSummary.map(
                    (item) => (
                      <tr
                        key={
                          item.instituteId
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >

                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {item.instituteName}
                        </td>

                        <td className="px-4 py-4 text-center font-semibold text-slate-700">
                          {item.students}
                        </td>

                        <td className="px-4 py-4 text-center font-semibold text-emerald-600">
                          {item.present}
                        </td>

                        <td className="px-4 py-4 text-center font-semibold text-red-600">
                          {item.absent}
                        </td>

                        <td className="px-4 py-4 text-center font-semibold text-amber-600">
                          {item.late}
                        </td>

                        <td className="px-4 py-4 text-center text-slate-700">
                          {item.excused}
                        </td>

                        <td className="px-4 py-4 text-center">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              item.percentage >=
                              90
                                ? "bg-emerald-50 text-emerald-700"
                                : item.percentage >=
                                  75
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.percentage}%
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              لا توجد بيانات حضور لعرضها.
            </div>
          )}

        </section>

        {/* Student Details */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">

          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <ShieldCheck className="h-5 w-5" />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  تفاصيل حضور الطلاب
                </h2>

                <p className="text-xs text-slate-500">
                  عدد النتائج:{" "}
                  {report.length}
                </p>

              </div>

            </div>

            {reportLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">

                <RefreshCw className="h-4 w-4 animate-spin" />

                جاري تحديث البيانات...

              </div>
            )}

          </div>

          {report.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] border-collapse">

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50 text-right">

                    <th className="px-3 py-3 text-xs font-bold text-slate-700">
                      #
                    </th>

                    <th className="px-3 py-3 text-xs font-bold text-slate-700">
                      اسم الطالب
                    </th>

                    <th className="px-3 py-3 text-xs font-bold text-slate-700">
                      المعهد
                    </th>

                    <th className="px-3 py-3 text-xs font-bold text-slate-700">
                      الفصل
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-bold text-emerald-700">
                      حاضر
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-bold text-red-700">
                      غائب
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-bold text-amber-700">
                      متأخر
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-700">
                      معذور
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-700">
                      الإجمالي
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-bold text-blue-700">
                      نسبة الحضور
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {report.map(
                    (row, index) => (
                      <tr
                        key={
                          row.student.id
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >

                        {/* # */}
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {index + 1}
                        </td>

                        {/* اسم الطالب */}
                        <td className="px-3 py-3">

                          <div className="font-semibold text-slate-900">
                            {
                              row.student
                                .full_name
                            }
                          </div>

                        </td>

                        {/* المعهد */}
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {
                            row.instituteName
                          }
                        </td>

                        {/* الفصل */}
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {
                            row.className
                          }
                        </td>

                        {/* حاضر */}
                        <td className="px-3 py-3 text-center font-semibold text-emerald-600">
                          {row.present}
                        </td>

                        {/* غائب */}
                        <td className="px-3 py-3 text-center font-semibold text-red-600">
                          {row.absent}
                        </td>

                        {/* متأخر */}
                        <td className="px-3 py-3 text-center font-semibold text-amber-600">
                          {row.late}
                        </td>

                        {/* معذور */}
                        <td className="px-3 py-3 text-center text-slate-600">
                          {row.excused}
                        </td>

                        {/* الإجمالي */}
                        <td className="px-3 py-3 text-center font-semibold text-slate-800">
                          {row.total}
                        </td>

                        {/* النسبة */}
                        <td className="px-3 py-3 text-center">

                          <span
                            className={`inline-flex min-w-[60px] justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                              row.percentage >=
                              90
                                ? "bg-emerald-50 text-emerald-700"
                                : row.percentage >=
                                  75
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {
                              row.percentage
                            }
                            %
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">

              <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />

              <p className="font-semibold text-slate-600">
                لا توجد بيانات مطابقة
              </p>

              <p className="mt-1 text-xs text-slate-400">
                جرّبي تغيير المعهد أو الفصل أو الفترة الزمنية أو كلمة البحث.
              </p>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}
