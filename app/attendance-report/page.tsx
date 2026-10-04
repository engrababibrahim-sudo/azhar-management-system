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
  code: string | null;
};

type ClassItem = {
  id: string;
  name: string;
  institute_id: string;
  stage: string | null;
};

type Student = {
  id: string;
  name: string;
  class_id: string | null;
  institute_id: string;
  national_id: string | null;
  phone: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
};

type InstituteSummary = {
  instituteId: string;
  instituteName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
};

type ReportRow = {
  student: Student;
  className: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
};

const ALLOWED_ROLES = [
  "sheikh",
  "director",
  "super_admin",
  "it_admin",
];

const CENTRAL_ROLES = ["director", "super_admin"];

function normalizeStatus(status: string) {
  const value = status?.toLowerCase?.() || "";

  if (
    value === "present" ||
    value === "حاضر" ||
    value === "presented"
  ) {
    return "present";
  }

  if (
    value === "absent" ||
    value === "غائب" ||
    value === "absence"
  ) {
    return "absent";
  }

  if (
    value === "late" ||
    value === "متأخر" ||
    value === "متاخر"
  ) {
    return "late";
  }

  if (
    value === "excused" ||
    value === "معذور" ||
    value === "مأذون"
  ) {
    return "excused";
  }

  return value;
}

function formatDateArabic(date: string) {
  if (!date) return "-";

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-EG").format(value);
}

export default function AttendanceReportPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [selectedInstitute, setSelectedInstitute] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const [message, setMessage] = useState("");

  /*
   * مهم:
   * لا نستخدم useSearchParams هنا حتى لا يحدث خطأ Vercel أثناء prerender.
   * نقرأ instituteId من window.location.search داخل useEffect فقط.
   */
  const [requestedInstituteId, setRequestedInstituteId] = useState<
    string | null
  >(null);

  const isCentralManager =
    profile && CENTRAL_ROLES.includes(profile.role);

  const isInstituteUser =
    profile &&
    ["sheikh", "it_admin"].includes(profile.role);

  /*
   * قراءة instituteId من الرابط بدون useSearchParams
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const instituteId = params.get("instituteId");

    setRequestedInstituteId(instituteId);
  }, []);

  /*
   * تحميل المستخدم والبيانات الأساسية
   */
  useEffect(() => {
    loadInitialData();
  }, []);

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
        setMessage("يجب تسجيل الدخول أولًا.");
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, role, institute_id, directorate_id")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        setMessage("لم يتم العثور على بيانات المستخدم.");
        return;
      }

      if (!ALLOWED_ROLES.includes(profileData.role)) {
        setMessage("ليس لديك صلاحية لعرض تقرير الحضور.");
        return;
      }

      setProfile(profileData);

      /*
       * مستخدم المعهد:
       * نعرض معهد المستخدم فقط مهما كان instituteId الموجود في الرابط.
       */
      if (
        ["sheikh", "it_admin"].includes(profileData.role)
      ) {
        if (!profileData.institute_id) {
          setMessage("لا يوجد معهد مرتبط بهذا المستخدم.");
          return;
        }

        const { data: instituteData, error: instituteError } =
          await supabase
            .from("institutes")
            .select("id, name, code")
            .eq("id", profileData.institute_id)
            .single();

        if (instituteError) {
          throw instituteError;
        }

        if (instituteData) {
          setInstitutes([instituteData]);
          setSelectedInstitute(instituteData.id);
        }

        return;
      }

      /*
       * المدير / super_admin:
       * تحميل معاهد الإدارة التابعة له.
       */
      if (CENTRAL_ROLES.includes(profileData.role)) {
        if (!profileData.directorate_id) {
          setMessage("لا توجد إدارة تعليمية مرتبطة بهذا المستخدم.");
          return;
        }

        const { data: institutesData, error: institutesError } =
          await supabase
            .from("institutes")
            .select("id, name, code")
            .eq("directorate_id", profileData.directorate_id)
            .eq("is_active", true)
            .order("name");

        if (institutesError) {
          throw institutesError;
        }

        const loadedInstitutes = institutesData || [];

        setInstitutes(loadedInstitutes);

        /*
         * إذا تم فتح الصفحة من صفحة تفاصيل معهد:
         *
         * /attendance-report?instituteId=XXXXXXXX
         *
         * نعرض هذا المعهد فقط.
         *
         * إذا لم يوجد المعهد أو الـ ID غير صحيح:
         * نرجع للوضع العام "كل المعاهد".
         */
        if (requestedInstituteId) {
          const requestedInstitute = loadedInstitutes.find(
            (institute) =>
              institute.id === requestedInstituteId
          );

          if (requestedInstitute) {
            setSelectedInstitute(requestedInstitute.id);
          } else {
            setSelectedInstitute("");
          }
        } else {
          setSelectedInstitute("");
        }
      }
    } catch (error: any) {
      console.error("Attendance report initial load error:", error);

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل بيانات تقرير الحضور."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * في حالة وصول requestedInstituteId بعد تحميل البيانات
   * نطبقه على المدير / super_admin.
   */
  useEffect(() => {
    if (!profile) return;
    if (!CENTRAL_ROLES.includes(profile.role)) return;
    if (!requestedInstituteId) return;
    if (!institutes.length) return;

    const instituteExists = institutes.some(
      (institute) => institute.id === requestedInstituteId
    );

    if (instituteExists) {
      setSelectedInstitute(requestedInstituteId);
    }
  }, [profile, requestedInstituteId, institutes]);

  /*
   * تحميل البيانات عند تغيير المعهد أو التاريخ.
   */
  useEffect(() => {
    if (!profile) return;
    if (!institutes.length) return;

    if (isInstituteUser) {
      const instituteId =
        profile.institute_id || institutes[0]?.id;

      if (instituteId) {
        loadInstituteData(instituteId);
      }

      return;
    }

    if (isCentralManager) {
      if (selectedInstitute) {
        loadInstituteData(selectedInstitute);
      } else {
        loadDirectorateData();
      }
    }
  }, [
    profile,
    institutes,
    selectedInstitute,
    startDate,
    endDate,
  ]);

  /*
   * تحميل بيانات معهد واحد
   */
  async function loadInstituteData(instituteId: string) {
    try {
      setReportLoading(true);
      setMessage("");

      const { data: classesData, error: classesError } =
        await supabase
          .from("classes")
          .select("id, name, institute_id, stage")
          .eq("institute_id", instituteId)
          .eq("is_active", true)
          .order("name");

      if (classesError) {
        throw classesError;
      }

      const { data: studentsData, error: studentsError } =
        await supabase
          .from("students")
          .select(
            "id, name, class_id, institute_id, national_id, phone"
          )
          .eq("institute_id", instituteId)
          .eq("is_active", true)
          .order("name");

      if (studentsError) {
        throw studentsError;
      }

      const studentIds = (studentsData || []).map(
        (student) => student.id
      );

      let attendanceData: AttendanceRow[] = [];

      if (studentIds.length > 0) {
        const { data, error: attendanceError } =
          await supabase
            .from("attendance")
            .select(
              "id, student_id, attendance_date, status"
            )
            .in("student_id", studentIds)
            .gte("attendance_date", startDate)
            .lte("attendance_date", endDate)
            .order("attendance_date");

        if (attendanceError) {
          throw attendanceError;
        }

        attendanceData = data || [];
      }

      setClasses(classesData || []);
      setStudents(studentsData || []);
      setAttendance(attendanceData);
    } catch (error: any) {
      console.error("Institute attendance report error:", error);

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل تقرير حضور المعهد."
      );

      setClasses([]);
      setStudents([]);
      setAttendance([]);
    } finally {
      setReportLoading(false);
    }
  }

  /*
   * تحميل بيانات كل معاهد الإدارة
   */
  async function loadDirectorateData() {
    try {
      setReportLoading(true);
      setMessage("");

      const instituteIds = institutes.map(
        (institute) => institute.id
      );

      if (!instituteIds.length) {
        setClasses([]);
        setStudents([]);
        setAttendance([]);
        return;
      }

      const { data: classesData, error: classesError } =
        await supabase
          .from("classes")
          .select("id, name, institute_id, stage")
          .in("institute_id", instituteIds)
          .eq("is_active", true)
          .order("name");

      if (classesError) {
        throw classesError;
      }

      const { data: studentsData, error: studentsError } =
        await supabase
          .from("students")
          .select(
            "id, name, class_id, institute_id, national_id, phone"
          )
          .in("institute_id", instituteIds)
          .eq("is_active", true)
          .order("name");

      if (studentsError) {
        throw studentsError;
      }

      const studentIds = (studentsData || []).map(
        (student) => student.id
      );

      let attendanceData: AttendanceRow[] = [];

      if (studentIds.length > 0) {
        const { data, error: attendanceError } =
          await supabase
            .from("attendance")
            .select(
              "id, student_id, attendance_date, status"
            )
            .in("student_id", studentIds)
            .gte("attendance_date", startDate)
            .lte("attendance_date", endDate)
            .order("attendance_date");

        if (attendanceError) {
          throw attendanceError;
        }

        attendanceData = data || [];
      }

      setClasses(classesData || []);
      setStudents(studentsData || []);
      setAttendance(attendanceData);
    } catch (error: any) {
      console.error("Directorate attendance report error:", error);

      setMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل تقرير الإدارة التعليمية."
      );

      setClasses([]);
      setStudents([]);
      setAttendance([]);
    } finally {
      setReportLoading(false);
    }
  }

  /*
   * تحديث التقرير يدويًا
   */
  async function refreshReport() {
    if (!profile) return;

    if (isInstituteUser) {
      if (profile.institute_id) {
        await loadInstituteData(profile.institute_id);
      }

      return;
    }

    if (isCentralManager) {
      if (selectedInstitute) {
        await loadInstituteData(selectedInstitute);
      } else {
        await loadDirectorateData();
      }
    }
  }

  /*
   * تغيير المعهد
   */
  function handleInstituteChange(value: string) {
    setSelectedInstitute(value);
    setSelectedClass("");
  }

  /*
   * الفصول التابعة للمعهد المختار
   */
  const filteredClasses = useMemo(() => {
    if (!selectedInstitute) {
      return classes;
    }

    return classes.filter(
      (item) => item.institute_id === selectedInstitute
    );
  }, [classes, selectedInstitute]);

  /*
   * تقرير الطلاب
   */
  const report = useMemo<ReportRow[]>(() => {
    let filteredStudents = students;

    if (selectedInstitute) {
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.institute_id === selectedInstitute
      );
    }

    if (selectedClass) {
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.class_id === selectedClass
      );
    }

    const searchValue = search.trim().toLowerCase();

    if (searchValue) {
      filteredStudents = filteredStudents.filter(
        (student) => {
          const name =
            student.name?.toLowerCase?.() || "";

          const nationalId =
            student.national_id?.toLowerCase?.() || "";

          const phone =
            student.phone?.toLowerCase?.() || "";

          return (
            name.includes(searchValue) ||
            nationalId.includes(searchValue) ||
            phone.includes(searchValue)
          );
        }
      );
    }

    return filteredStudents.map((student) => {
      const studentAttendance = attendance.filter(
        (row) => row.student_id === student.id
      );

      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;

      studentAttendance.forEach((row) => {
        const status = normalizeStatus(row.status);

        if (status === "present") present++;
        else if (status === "absent") absent++;
        else if (status === "late") late++;
        else if (status === "excused") excused++;
      });

      const total =
        present + absent + late + excused;

      const attended =
        present + late + excused;

      const percentage =
        total > 0
          ? Math.round((attended / total) * 100)
          : 0;

      const classItem = classes.find(
        (item) => item.id === student.class_id
      );

      return {
        student,
        className: classItem?.name || "غير محدد",
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
    classes,
    selectedInstitute,
    selectedClass,
    search,
  ]);

  /*
   * إجماليات التقرير
   */
  const totals = useMemo(() => {
    const present = report.reduce(
      (sum, row) => sum + row.present,
      0
    );

    const absent = report.reduce(
      (sum, row) => sum + row.absent,
      0
    );

    const late = report.reduce(
      (sum, row) => sum + row.late,
      0
    );

    const excused = report.reduce(
      (sum, row) => sum + row.excused,
      0
    );

    const total =
      present + absent + late + excused;

    const attended =
      present + late + excused;

    const percentage =
      total > 0
        ? Math.round((attended / total) * 100)
        : 0;

    return {
      present,
      absent,
      late,
      excused,
      total,
      percentage,
    };
  }, [report]);

  /*
   * ملخص المعاهد
   */
  const instituteSummary = useMemo<
    InstituteSummary[]
  >(() => {
    return institutes
      .map((institute) => {
        const instituteStudents = students.filter(
          (student) =>
            student.institute_id === institute.id
        );

        const studentIds = new Set(
          instituteStudents.map(
            (student) => student.id
          )
        );

        const instituteAttendance =
          attendance.filter((row) =>
            studentIds.has(row.student_id)
          );

        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;

        instituteAttendance.forEach((row) => {
          const status = normalizeStatus(row.status);

          if (status === "present") present++;
          else if (status === "absent") absent++;
          else if (status === "late") late++;
          else if (status === "excused") excused++;
        });

        const total =
          present + absent + late + excused;

        const attended =
          present + late + excused;

        const percentage =
          total > 0
            ? Math.round((attended / total) * 100)
            : 0;

        return {
          instituteId: institute.id,
          instituteName: institute.name,
          total: instituteStudents.length,
          present,
          absent,
          late,
          excused,
          percentage,
        };
      })
      .filter((item) => {
        if (!selectedInstitute) return true;
        return (
          item.instituteId === selectedInstitute
        );
      });
  }, [
    institutes,
    students,
    attendance,
    selectedInstitute,
  ]);

  /*
   * اسم المعهد الحالي
   */
  const currentInstituteName = useMemo(() => {
    if (!selectedInstitute) {
      return "جميع المعاهد";
    }

    return (
      institutes.find(
        (institute) =>
          institute.id === selectedInstitute
      )?.name || "المعهد"
    );
  }, [institutes, selectedInstitute]);

  /*
   * طباعة التقرير
   */
  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function handlePrintReport() {
    const rowsHtml = report
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.student.name || "-")}</td>
            <td>${escapeHtml(row.className)}</td>
            <td>${row.present}</td>
            <td>${row.absent}</td>
            <td>${row.late}</td>
            <td>${row.excused}</td>
            <td>${row.total}</td>
            <td>${row.percentage}%</td>
          </tr>
        `
      )
      .join("");

    const instituteRowsHtml = instituteSummary
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.instituteName)}</td>
            <td>${item.total}</td>
            <td>${item.present}</td>
            <td>${item.absent}</td>
            <td>${item.late}</td>
            <td>${item.excused}</td>
            <td>${item.percentage}%</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>تقرير الحضور والغياب</title>

        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Tahoma, sans-serif;
            direction: rtl;
            color: #111827;
            margin: 0;
            padding: 0;
            background: white;
          }

          .header {
            text-align: center;
            margin-bottom: 18px;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
          }

          .header h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          .header h2 {
            margin: 0 0 6px;
            font-size: 18px;
          }

          .meta {
            font-size: 13px;
            color: #374151;
          }

          .cards {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 18px;
          }

          .card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }

          .card .label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }

          .card .value {
            font-size: 19px;
            font-weight: bold;
          }

          h3 {
            margin: 18px 0 8px;
            font-size: 17px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }

          th,
          td {
            border: 1px solid #9ca3af;
            padding: 6px;
            text-align: center;
            font-size: 11px;
          }

          th {
            background: #f3f4f6;
            font-weight: bold;
          }

          .footer {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #6b7280;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>منصة الإدارة والمتابعة التعليمية</h1>
          <h2>تقرير الحضور والغياب</h2>

          <div class="meta">
            ${escapeHtml(currentInstituteName)}
            <br />
            الفترة من
            ${escapeHtml(formatDateArabic(startDate))}
            إلى
            ${escapeHtml(formatDateArabic(endDate))}
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <div class="label">إجمالي السجلات</div>
            <div class="value">${totals.total}</div>
          </div>

          <div class="card">
            <div class="label">حاضر</div>
            <div class="value">${totals.present}</div>
          </div>

          <div class="card">
            <div class="label">غائب</div>
            <div class="value">${totals.absent}</div>
          </div>

          <div class="card">
            <div class="label">متأخر</div>
            <div class="value">${totals.late}</div>
          </div>

          <div class="card">
            <div class="label">نسبة الحضور</div>
            <div class="value">${totals.percentage}%</div>
          </div>
        </div>

        <h3>ملخص المعاهد</h3>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المعهد</th>
              <th>الطلاب</th>
              <th>حاضر</th>
              <th>غائب</th>
              <th>متأخر</th>
              <th>معذور</th>
              <th>النسبة</th>
            </tr>
          </thead>

          <tbody>
            ${
              instituteRowsHtml ||
              `
                <tr>
                  <td colspan="8">لا توجد بيانات</td>
                </tr>
              `
            }
          </tbody>
        </table>

        <h3>تفاصيل الطلاب</h3>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الطالب</th>
              <th>الفصل</th>
              <th>حاضر</th>
              <th>غائب</th>
              <th>متأخر</th>
              <th>معذور</th>
              <th>الإجمالي</th>
              <th>النسبة</th>
            </tr>
          </thead>

          <tbody>
            ${
              rowsHtml ||
              `
                <tr>
                  <td colspan="9">لا توجد بيانات</td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="footer">
          <span>
            تم إنشاء التقرير بواسطة منصة الإدارة والمتابعة التعليمية
          </span>

          <span>
            تاريخ الطباعة:
            ${escapeHtml(
              new Date().toLocaleDateString("ar-EG")
            )}
          </span>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      setMessage(
        "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة."
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  /*
   * شاشة التحميل
   */
  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-4" />

          <h2 className="text-lg font-bold text-slate-800">
            جاري تحميل تقرير الحضور...
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            يرجى الانتظار قليلًا
          </p>
        </div>
      </div>
    );
  }

  /*
   * منع الوصول غير المصرح
   */
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />

          <h2 className="text-xl font-bold text-slate-800">
            غير مصرح
          </h2>

          <p className="text-slate-500 mt-2">
            ليس لديك صلاحية لعرض تقرير الحضور والغياب.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* العنوان */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    تقرير الحضور والغياب
                  </h1>

                  <p className="text-sm text-slate-500 mt-1">
                    متابعة وتحليل حضور الطلاب خلال الفترة المحددة
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={refreshReport}
                disabled={reportLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    reportLoading ? "animate-spin" : ""
                  }`}
                />

                تحديث التقرير
              </button>

              <button
                onClick={handlePrintReport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Printer className="w-4 h-4" />

                طباعة التقرير
              </button>
            </div>
          </div>
        </div>

        {/* رسالة الخطأ */}
        {message && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* الفلاتر */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="w-5 h-5 text-blue-600" />

            <h2 className="font-bold text-slate-800">
              خيارات التقرير
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

            {/* المعهد */}
            {isCentralManager && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  المعهد
                </label>

                <select
                  value={selectedInstitute}
                  onChange={(e) =>
                    handleInstituteChange(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    جميع المعاهد
                  </option>

                  {institutes.map((institute) => (
                    <option
                      key={institute.id}
                      value={institute.id}
                    >
                      {institute.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* الفصل */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                الفصل
              </label>

              <select
                value={selectedClass}
                onChange={(e) =>
                  setSelectedClass(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  جميع الفصول
                </option>

                {filteredClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* من */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                من تاريخ
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* إلى */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                إلى تاريخ
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* بحث */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                بحث
              </label>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="اسم الطالب أو الرقم..."
                  className="w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  الطلاب
                </p>

                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {formatNumber(report.length)}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  حاضر
                </p>

                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatNumber(totals.present)}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  غائب
                </p>

                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatNumber(totals.absent)}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  متأخر
                </p>

                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {formatNumber(totals.late)}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock3 className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  نسبة الحضور
                </p>

                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {totals.percentage}%
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ملخص المعاهد */}
        {isCentralManager && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />

                <div>
                  <h2 className="font-bold text-slate-800">
                    ملخص الحضور حسب المعهد
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    عرض سريع لمؤشرات الحضور والغياب لكل معهد
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">
                      المعهد
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-slate-700">
                      الطلاب
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-emerald-700">
                      حاضر
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-red-700">
                      غائب
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-amber-700">
                      متأخر
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-slate-700">
                      معذور
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-indigo-700">
                      النسبة
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {instituteSummary.map((item) => (
                    <tr
                      key={item.instituteId}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.instituteName}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {formatNumber(item.total)}
                      </td>

                      <td className="px-4 py-3 text-center text-emerald-600 font-semibold">
                        {formatNumber(item.present)}
                      </td>

                      <td className="px-4 py-3 text-center text-red-600 font-semibold">
                        {formatNumber(item.absent)}
                      </td>

                      <td className="px-4 py-3 text-center text-amber-600 font-semibold">
                        {formatNumber(item.late)}
                      </td>

                      <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                        {formatNumber(item.excused)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            item.percentage >= 90
                              ? "bg-emerald-50 text-emerald-700"
                              : item.percentage >= 75
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}

                  {instituteSummary.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        لا توجد بيانات للعرض.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تفاصيل الطلاب */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

              <div>
                <h2 className="font-bold text-slate-800">
                  تفاصيل حضور الطلاب
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {currentInstituteName}
                </p>
              </div>

              <div className="text-sm text-slate-500">
                النتائج:
                <span className="font-bold text-slate-800 mr-1">
                  {formatNumber(report.length)}
                </span>
              </div>
            </div>
          </div>

          {reportLoading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-4" />

              <p className="text-sm text-slate-500">
                جاري تحديث التقرير...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-bold text-slate-700">
                      الطالب
                    </th>

                    <th className="px-4 py-3 text-right font-bold text-slate-700">
                      الفصل
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-emerald-700">
                      حاضر
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-red-700">
                      غائب
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-amber-700">
                      متأخر
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-slate-700">
                      معذور
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-slate-700">
                      الإجمالي
                    </th>

                    <th className="px-4 py-3 text-center font-bold text-indigo-700">
                      النسبة
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {report.map((row) => (
                    <tr
                      key={row.student.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          {row.student.name}
                        </div>

                        {row.student.national_id && (
                          <div className="text-xs text-slate-400 mt-1">
                            {row.student.national_id}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {row.className}
                      </td>

                      <td className="px-4 py-3 text-center text-emerald-600 font-semibold">
                        {row.present}
                      </td>

                      <td className="px-4 py-3 text-center text-red-600 font-semibold">
                        {row.absent}
                      </td>

                      <td className="px-4 py-3 text-center text-amber-600 font-semibold">
                        {row.late}
                      </td>

                      <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                        {row.excused}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-slate-800">
                        {row.total}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            row.percentage >= 90
                              ? "bg-emerald-50 text-emerald-700"
                              : row.percentage >= 75
                              ? "bg-amber-50 text-amber-700"
                              : row.percentage > 0
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {row.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}

                  {report.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />

                          <p className="font-semibold text-slate-600">
                            لا توجد بيانات مطابقة
                          </p>

                          <p className="text-sm text-slate-400 mt-1">
                            جرّبي تغيير الفترة أو الفلاتر المستخدمة.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {report.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-4 font-bold text-slate-800"
                      >
                        الإجمالي
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-emerald-700">
                        {totals.present}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-red-700">
                        {totals.absent}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-amber-700">
                        {totals.late}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-slate-700">
                        {totals.excused}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-slate-800">
                        {totals.total}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-indigo-700">
                        {totals.percentage}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
