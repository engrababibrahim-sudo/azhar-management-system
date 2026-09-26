"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Search,
  UserX,
  Save,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  student_code: string | null;
  class_id: string | null;
};

type ClassItem = {
  id: string;
  name: string;
};

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceRecord = {
  student_id: string;
  status: AttendanceStatus;
  notes: string;
};

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceRecord>
  >({});

  const [instituteId, setInstituteId] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (instituteId && selectedDate) {
      loadAttendance();
    }
  }, [instituteId, selectedDate]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("يجب تسجيل الدخول أولًا");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, institute_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(profileError);
        setMessage("لم يتم العثور على بيانات المستخدم");
        setLoading(false);
        return;
      }

      if (profile.role !== "sheikh") {
        setMessage("هذه الصفحة متاحة لشيخ المعهد فقط");
        setLoading(false);
        return;
      }

      if (!profile.institute_id) {
        setMessage("لم يتم ربط المستخدم بمعهد");
        setLoading(false);
        return;
      }

      setInstituteId(profile.institute_id);

      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, name")
        .eq("institute_id", profile.institute_id)
        .eq("is_active", true)
        .order("name");

      if (classesError) {
        console.error(classesError);
        setMessage("حدث خطأ أثناء تحميل الفصول");
        setLoading(false);
        return;
      }

      setClasses(classesData || []);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, student_code, class_id")
        .eq("institute_id", profile.institute_id)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) {
        console.error(studentsError);
        setMessage("حدث خطأ أثناء تحميل الطلاب");
        setLoading(false);
        return;
      }

      setStudents(studentsData || []);
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ غير متوقع");
    }

    setLoading(false);
  }

  async function loadAttendance() {
    if (!instituteId) return;

    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, status, notes")
      .eq("institute_id", instituteId)
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error(error);
      return;
    }

    const records: Record<string, AttendanceRecord> = {};

    (data || []).forEach((item) => {
      records[item.student_id] = {
        student_id: item.student_id,
        status: item.status as AttendanceStatus,
        notes: item.notes || "",
      };
    });

    setAttendance(records);
  }

  function setStudentStatus(
    studentId: string,
    status: AttendanceStatus
  ) {
    setAttendance((current) => {
      const existing = current[studentId];

      return {
        ...current,
        [studentId]: {
          student_id: studentId,
          status,
          notes: existing?.notes || "",
        },
      };
    });

    setMessage("");
  }

  function getStudentStatus(studentId: string): AttendanceStatus {
    return attendance[studentId]?.status || "present";
  }

  async function saveAttendance() {
    if (!instituteId) return;

    setSaving(true);
    setMessage("");

    try {
      const rows = filteredStudents.map((student) => ({
        institute_id: instituteId,
        student_id: student.id,
        class_id: student.class_id,
        attendance_date: selectedDate,
        status: getStudentStatus(student.id),
        notes: attendance[student.id]?.notes || null,
      }));

      if (rows.length === 0) {
        setMessage("لا يوجد طلاب للحفظ");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, {
          onConflict: "student_id,attendance_date",
        });

      if (error) {
        console.error(error);
        setMessage("حدث خطأ أثناء حفظ الحضور");
        setSaving(false);
        return;
      }

      setMessage("تم حفظ الحضور والغياب بنجاح ✅");

      // إعادة تحميل السجلات بعد الحفظ
      await loadAttendance();
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ غير متوقع");
    }

    setSaving(false);
  }

  const filteredStudents = students.filter((student) => {
    const matchesClass =
      !selectedClass || student.class_id === selectedClass;

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !normalizedSearch ||
      student.full_name.toLowerCase().includes(normalizedSearch) ||
      (student.student_code || "")
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesClass && matchesSearch;
  });

  const presentCount = filteredStudents.filter(
    (student) => getStudentStatus(student.id) === "present"
  ).length;

  const absentCount = filteredStudents.filter(
    (student) => getStudentStatus(student.id) === "absent"
  ).length;

  const lateCount = filteredStudents.filter(
    (student) => getStudentStatus(student.id) === "late"
  ).length;

  const excusedCount = filteredStudents.filter(
    (student) => getStudentStatus(student.id) === "excused"
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
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

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              الحضور والغياب
            </h1>

            <p className="text-gray-500 mt-2">
              تسجيل ومتابعة حضور طلاب المعهد
            </p>
          </div>

          <button
            type="button"
            onClick={saveAttendance}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold"
          >
            <Save size={20} />

            {saving ? "جاري الحفظ..." : "حفظ الحضور"}
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
                  value={selectedDate}
                  onChange={(e) =>
                    setSelectedDate(e.target.value)
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
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-xl py-3 pr-10 pl-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

          </div>
        </div>

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
                  {presentCount}
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
                  {absentCount}
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
                  {lateCount}
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
                  {excusedCount}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Students */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">
              قائمة الطلاب
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              عدد الطلاب: {filteredStudents.length}
            </p>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              لا يوجد طلاب مطابقون للبحث
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

                  {filteredStudents.map((student) => {
                    const status = getStudentStatus(student.id);

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-6 py-5">
                          <div className="font-semibold text-gray-800">
                            {student.full_name}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-gray-500">
                          {student.student_code || "-"}
                        </td>

                        <td className="px-6 py-5">

                          <div className="flex flex-wrap justify-center gap-2">

                            {/* حاضر */}
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatus(
                                  student.id,
                                  "present"
                                )
                              }
                              className={`px-4 py-2 rounded-lg font-medium transition ${
                                status === "present"
                                  ? "bg-green-600 text-white shadow-sm"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              حاضر
                            </button>

                            {/* غائب */}
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatus(
                                  student.id,
                                  "absent"
                                )
                              }
                              className={`px-4 py-2 rounded-lg font-medium transition ${
                                status === "absent"
                                  ? "bg-red-600 text-white shadow-sm"
                                  : "bg-red-50 text-red-700 hover:bg-red-100"
                              }`}
                            >
                              غائب
                            </button>

                            {/* متأخر */}
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatus(
                                  student.id,
                                  "late"
                                )
                              }
                              className={`px-4 py-2 rounded-lg font-medium transition ${
                                status === "late"
                                  ? "bg-yellow-500 text-white shadow-sm"
                                  : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                              }`}
                            >
                              متأخر
                            </button>

                            {/* معذور */}
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatus(
                                  student.id,
                                  "excused"
                                )
                              }
                              className={`px-4 py-2 rounded-lg font-medium transition ${
                                status === "excused"
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                            >
                              معذور
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}
