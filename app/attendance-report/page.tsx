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
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type Profile = {
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
  institute_id: string;
};

type Student = {
  id: string;
  full_name: string;
  student_code: string | null;
  class_id: string | null;
  institute_id: string;
};

type AttendanceRow = {
  student_id: string;
  attendance_date: string;
  status: "present" | "absent" | "late" | "excused";
};

type ReportRow = {
  student: Student;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
};

export default function AttendanceReportPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [selectedInstitute, setSelectedInstitute] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [toDate, setToDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("يجب تسجيل الدخول أولًا");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, institute_id, directorate_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(profileError);
        setMessage("لم يتم العثور على بيانات المستخدم");
        setLoading(false);
        return;
      }

      if (
        profileData.role !== "sheikh" &&
        profileData.role !== "director"
      ) {
        setMessage("ليس لديك صلاحية لعرض تقارير الحضور");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      if (profileData.role === "sheikh") {
        if (!profileData.institute_id) {
          setMessage("لم يتم ربط الشيخ بمعهد");
          setLoading(false);
          return;
        }

        const { data: instituteData, error: instituteError } =
          await supabase
            .from("institutes")
            .select("id, name, code")
            .eq("id", profileData.institute_id)
            .single();

        if (instituteError) {
          console.error(instituteError);
          setMessage("تعذر تحميل بيانات المعهد");
          setLoading(false);
          return;
        }

        setInstitutes([instituteData]);
        setSelectedInstitute(instituteData.id);
      }

      if (profileData.role === "director") {
        if (!profileData.directorate_id) {
          setMessage("لم يتم ربط مدير الإدارة بالإدارة التعليمية");
          setLoading(false);
          return;
        }

        const { data: institutesData, error: institutesError } =
          await supabase
            .from("institutes")
            .select("id, name, code")
            .eq("directorate_id", profileData.directorate_id)
            .order("name");

        if (institutesError) {
          console.error(institutesError);
          setMessage("تعذر تحميل المعاهد");
          setLoading(false);
          return;
        }

        setInstitutes(institutesData || []);

        if (institutesData && institutesData.length > 0) {
          setSelectedInstitute(institutesData[0].id);
        }
      }
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ غير متوقع");
    }

    setLoading(false);
  }

  useEffect(() => {
    if (selectedInstitute) {
      loadInstituteData(selectedInstitute);
    }
  }, [selectedInstitute]);

  async function loadInstituteData(instituteId: string) {
    setReportLoading(true);
    setMessage("");

    try {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, name, institute_id")
        .eq("institute_id", instituteId)
        .eq("is_active", true)
        .order("name");

      if (classesError) {
        console.error(classesError);
        setMessage("حدث خطأ أثناء تحميل الفصول");
        setReportLoading(false);
        return;
      }

      setClasses(classesData || []);

      const { data: studentsData, error: studentsError } =
        await supabase
          .from("students")
          .select(
            "id, full_name, student_code, class_id, institute_id"
          )
          .eq("institute_id", instituteId)
          .eq("is_active", true)
          .order("full_name");

      if (studentsError) {
        console.error(studentsError);
        setMessage("حدث خطأ أثناء تحميل الطلاب");
        setReportLoading(false);
        return;
      }

      setStudents(studentsData || []);

      await loadAttendance(instituteId);
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ غير متوقع");
    }

    setReportLoading(false);
  }

  async function loadAttendance(instituteId: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, attendance_date, status")
      .eq("institute_id", instituteId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate);

    if (error) {
      console.error(error);
      setMessage("حدث خطأ أثناء تحميل سجلات الحضور");
      return;
    }

    setAttendance(data || []);
  }

  async function refreshReport() {
    if (!selectedInstitute) return;

    if (fromDate > toDate) {
      setMessage("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    setReportLoading(true);
    await loadAttendance(selectedInstitute);
    setReportLoading(false);
  }

  const report = useMemo<ReportRow[]>(() => {
    let filteredStudents = students;

    if (selectedClass) {
      filteredStudents = filteredStudents.filter(
        (student) => student.class_id === selectedClass
      );
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      filteredStudents = filteredStudents.filter((student) => {
        return (
          student.full_name.toLowerCase().includes(search) ||
          (student.student_code || "")
            .toLowerCase()
            .includes(search)
        );
      });
    }

    return filteredStudents.map((student) => {
      const records = attendance.filter(
        (record) => record.student_id === student.id
      );

      const present = records.filter(
        (record) => record.status === "present"
      ).length;

      const absent = records.filter(
        (record) => record.status === "absent"
      ).length;

      const late = records.filter(
        (record) => record.status === "late"
      ).length;

      const excused = records.filter(
        (record) => record.status === "excused"
      ).length;

      const total = present + absent + late + excused;

      const percentage =
        total > 0
          ? Math.round(((present + late + excused) / total) * 100)
          : 0;

      return {
        student,
        present,
        absent,
        late,
        excused,
        total,
        percentage,
      };
    });
  }, [students, attendance, selectedClass, searchTerm]);

  const totals = useMemo(() => {
    return report.reduce(
      (acc, row) => {
        acc.students += 1;
        acc.present += row.present;
        acc.absent += row.absent;
        acc.late += row.late;
        acc.excused += row.excused;
        acc.total += row.total;

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
          ((totals.present + totals.late + totals.excused) /
            totals.total) *
            100
        )
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto text-center py-20">
          <RefreshCw
            className="mx-auto animate-spin mb-4"
            size={32}
          />

          <p className="text-gray-600">
            جاري تحميل تقرير الحضور...
          </p>
        </div>
      </main>
    );
  }

  if (
    !profile ||
    (profile.role !== "sheikh" && profile.role !== "director")
  ) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 text-center">
          <ShieldCheck
            className="mx-auto text-red-500 mb-4"
            size={48}
          />

          <h1 className="text-2xl font-bold text-gray-800">
            غير مصرح
          </h1>

          <p className="text-gray-500 mt-2">
            ليس لديك صلاحية لعرض هذه الصفحة.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <div className="flex items-center gap-3">
              <BarChart3
                size={32}
                className="text-blue-600"
              />

              <h1 className="text-3xl font-bold text-gray-800">
                تقارير الحضور والغياب
              </h1>
            </div>

            <p className="text-gray-500 mt-2">
              متابعة وتحليل حضور الطلاب خلال الفترة المحددة
            </p>
          </div>

          <button
            onClick={refreshReport}
            disabled={reportLoading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-xl font-semibold"
          >
            <RefreshCw
              size={19}
              className={reportLoading ? "animate-spin" : ""}
            />

            تحديث التقرير
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 bg-white border border-blue-200 text-blue-700 rounded-xl p-4">
            {message}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Institute */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                المعهد
              </label>

              <select
                value={selectedInstitute}
                onChange={(e) => {
                  setSelectedInstitute(e.target.value);
                  setSelectedClass("");
                }}
                disabled={profile.role === "sheikh"}
                className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
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

            {/* Class */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الفصل
              </label>

              <select
                value={selectedClass}
                onChange={(e) =>
                  setSelectedClass(e.target.value)
                }
                className="w-full border border-gray-300 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">كل الفصول</option>

                {classes.map((classItem) => (
                  <option
                    key={classItem.id}
                    value={classItem.id}
                  >
                    {classItem.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                من تاريخ
              </label>

              <div className="relative">
                <CalendarDays
                  size={19}
                  className="absolute right-3 top-3 text-gray-400"
                />

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                إلى تاريخ
              </label>

              <div className="relative">
                <CalendarDays
                  size={19}
                  className="absolute right-3 top-3 text-gray-400"
                />

                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              البحث عن طالب
            </label>

            <div className="relative max-w-md">
              <Search
                size={19}
                className="absolute right-3 top-3 text-gray-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="اسم الطالب أو كود الطالب..."
                className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <Users
              className="text-blue-600 mb-3"
              size={25}
            />

            <p className="text-gray-500 text-sm">
              الطلاب
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {totals.students}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <CheckCircle2
              className="text-green-600 mb-3"
              size={25}
            />

            <p className="text-gray-500 text-sm">
              الحضور
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {totals.present}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <XCircle
              className="text-red-600 mb-3"
              size={25}
            />

            <p className="text-gray-500 text-sm">
              الغياب
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {totals.absent}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <Clock3
              className="text-yellow-600 mb-3"
              size={25}
            />

            <p className="text-gray-500 text-sm">
              التأخير
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {totals.late}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <CalendarDays
              className="text-blue-500 mb-3"
              size={25}
            />

            <p className="text-gray-500 text-sm">
              المعذور
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {totals.excused}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <BarChart3
              className="text-purple-600 mb-3"
              size={25}
            />

            <p className="text-gray-500 text-sm">
              نسبة الحضور
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {overallPercentage}%
            </p>
          </div>

        </div>

        {/* Report Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">
              تفاصيل الطلاب
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              التقرير حسب الفترة والفصل المحددين
            </p>
          </div>

          {report.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              لا توجد بيانات مطابقة للبحث
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="text-right px-5 py-4">
                      الطالب
                    </th>

                    <th className="text-right px-5 py-4">
                      الكود
                    </th>

                    <th className="text-center px-5 py-4">
                      الحضور
                    </th>

                    <th className="text-center px-5 py-4">
                      الغياب
                    </th>

                    <th className="text-center px-5 py-4">
                      التأخير
                    </th>

                    <th className="text-center px-5 py-4">
                      المعذور
                    </th>

                    <th className="text-center px-5 py-4">
                      إجمالي السجلات
                    </th>

                    <th className="text-center px-5 py-4">
                      نسبة الحضور
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {report.map((row) => (

                    <tr
                      key={row.student.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-5 py-5">
                        <div className="font-semibold text-gray-800">
                          {row.student.full_name}
                        </div>
                      </td>

                      <td className="px-5 py-5 text-gray-500">
                        {row.student.student_code || "-"}
                      </td>

                      <td className="px-5 py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-10 px-3 py-1 rounded-lg bg-green-50 text-green-700 font-semibold">
                          {row.present}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-10 px-3 py-1 rounded-lg bg-red-50 text-red-700 font-semibold">
                          {row.absent}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-10 px-3 py-1 rounded-lg bg-yellow-50 text-yellow-700 font-semibold">
                          {row.late}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-10 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold">
                          {row.excused}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-center font-semibold">
                        {row.total}
                      </td>

                      <td className="px-5 py-5 text-center">

                        <span
                          className={`inline-flex px-3 py-1 rounded-lg font-bold ${
                            row.percentage >= 90
                              ? "bg-green-50 text-green-700"
                              : row.percentage >= 75
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {row.percentage}%
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}