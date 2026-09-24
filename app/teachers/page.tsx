"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  GraduationCap,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type ImportType = "students" | "teachers";

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

type TeacherRow = {
  teacher_code: string;
  full_name: string;
  phone: string;
  email: string;
  specialization: string;
  qualification: string;
  is_active: boolean;
};

type ValidationRow = {
  rowNumber: number;
  errors: string[];
};

export default function ImportPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState("");

  const [importType, setImportType] =
    useState<ImportType>("students");

  const [fileName, setFileName] = useState("");
  const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);
  const [validationErrors, setValidationErrors] =
    useState<ValidationRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

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

        const { data: instituteData, error: institutesError } =
          await query;

        if (institutesError) throw institutesError;

        setInstitutes(instituteData || []);

        if (instituteData?.length === 1) {
          setSelectedInstitute(instituteData[0].id);
        }
      }
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ أثناء تحميل بيانات المستخدم.");
    } finally {
      setLoading(false);
    }
  }

  function resetImport() {
    setFileName("");
    setTeacherRows([]);
    setValidationErrors([]);
    setImportedCount(0);
    setSkippedCount(0);
    setMessage("");
  }

  function getField(
    row: Record<string, unknown>,
    names: string[]
  ) {
    for (const name of names) {
      if (
        row[name] !== undefined &&
        row[name] !== null &&
        String(row[name]).trim() !== ""
      ) {
        return String(row[name]).trim();
      }
    }

    return "";
  }

  function normalizeBoolean(value: string) {
    const text = value.trim().toLowerCase();

    if (
      text === "غير نشط" ||
      text === "غيرنشط" ||
      text === "inactive" ||
      text === "false" ||
      text === "0"
    ) {
      return false;
    }

    return true;
  }

  function mapTeacherRow(
    row: Record<string, unknown>
  ): TeacherRow {
    return {
      teacher_code: getField(row, [
        "كود المعلم",
        "كود المدرس",
        "teacher_code",
        "Teacher Code",
      ]),

      full_name: getField(row, [
        "اسم المعلم",
        "اسم المدرس",
        "full_name",
        "Full Name",
      ]),

      phone: getField(row, [
        "الهاتف",
        "رقم الهاتف",
        "هاتف",
        "phone",
        "Phone",
      ]),

      email: getField(row, [
        "البريد الإلكتروني",
        "البريد الالكتروني",
        "الإيميل",
        "email",
        "Email",
      ]),

      specialization: getField(row, [
        "التخصص",
        "تخصص",
        "specialization",
        "Specialization",
      ]),

      qualification: getField(row, [
        "المؤهل",
        "المؤهل الدراسي",
        "qualification",
        "Qualification",
      ]),

      is_active: normalizeBoolean(
        getField(row, [
          "الحالة",
          "حالة المعلم",
          "is_active",
          "Status",
        ]) || "نشط"
      ),
    };
  }

  function validateTeacherRow(
    row: TeacherRow,
    rowNumber: number
  ) {
    const errors: string[] = [];

    if (!row.full_name.trim()) {
      errors.push("اسم المعلم مطلوب");
    }

    if (row.email && !row.email.includes("@")) {
      errors.push("البريد الإلكتروني غير صحيح");
    }

    return {
      rowNumber,
      errors,
    };
  }

  async function handleTeacherFile(
    file: File
  ) {
    setProcessing(true);
    setMessage("");
    setTeacherRows([]);
    setValidationErrors([]);
    setImportedCount(0);
    setSkippedCount(0);

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("ملف Excel لا يحتوي على ورقة بيانات.");
      }

      const worksheet = workbook.Sheets[sheetName];

      const rawRows = XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(worksheet, {
        defval: "",
      });

      if (rawRows.length === 0) {
        throw new Error("ملف Excel فارغ.");
      }

      const mappedRows = rawRows.map(mapTeacherRow);

      const errors: ValidationRow[] = [];

      mappedRows.forEach((row, index) => {
        const validation = validateTeacherRow(
          row,
          index + 2
        );

        if (validation.errors.length > 0) {
          errors.push(validation);
        }
      });

      const seenCodes = new Set<string>();

      mappedRows.forEach((row, index) => {
        if (!row.teacher_code) return;

        const code = row.teacher_code.toLowerCase();

        if (seenCodes.has(code)) {
          const existing = errors.find(
            (x) => x.rowNumber === index + 2
          );

          if (existing) {
            existing.errors.push(
              "كود المعلم مكرر داخل الملف"
            );
          } else {
            errors.push({
              rowNumber: index + 2,
              errors: ["كود المعلم مكرر داخل الملف"],
            });
          }
        }

        seenCodes.add(code);
      });

      setTeacherRows(mappedRows);
      setValidationErrors(errors);
      setFileName(file.name);

      if (errors.length > 0) {
        setMessage(
          `تم تحميل الملف، ولكن يوجد ${errors.length} صف يحتاج إلى مراجعة.`
        );
      } else {
        setMessage(
          `تمت قراءة ${mappedRows.length} مدرس بنجاح، والبيانات جاهزة للاستيراد.`
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء قراءة ملف Excel."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls") {
      alert("من فضلك اختاري ملف Excel بصيغة XLSX أو XLS.");
      return;
    }

    if (importType === "teachers") {
      await handleTeacherFile(file);
    } else {
      alert(
        "استيراد الطلاب الحالي يعمل كما هو. اختاري المدرسين لتجربة استيراد المدرسين."
      );
    }

    event.target.value = "";
  }

  function downloadTeacherTemplate() {
    const rows = [
      {
        "كود المعلم": "TCH-001",
        "اسم المعلم": "محمد أحمد علي",
        "الهاتف": "01011112222",
        "البريد الإلكتروني": "teacher1@example.com",
        "التخصص": "اللغة العربية",
        "المؤهل": "ليسانس لغة عربية",
        "الحالة": "نشط",
      },
      {
        "كود المعلم": "TCH-002",
        "اسم المعلم": "سارة محمود حسن",
        "الهاتف": "01122223333",
        "البريد الإلكتروني": "teacher2@example.com",
        "التخصص": "الرياضيات",
        "المؤهل": "ليسانس رياضيات",
        "الحالة": "نشط",
      },
      {
        "كود المعلم": "TCH-003",
        "اسم المعلم": "أحمد خالد إبراهيم",
        "الهاتف": "01233334444",
        "البريد الإلكتروني": "teacher3@example.com",
        "التخصص": "العلوم",
        "المؤهل": "ماجستير علوم",
        "الحالة": "نشط",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "بيانات المدرسين"
    );

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 30 },
      { wch: 25 },
      { wch: 28 },
      { wch: 14 },
    ];

    XLSX.writeFile(
      workbook,
      "نموذج_استيراد_المدرسين.xlsx"
    );
  }

  async function importTeachers() {
    if (!selectedInstitute) {
      alert("من فضلك اختاري المعهد أولًا.");
      return;
    }

    if (teacherRows.length === 0) {
      alert("لا توجد بيانات مدرسين للاستيراد.");
      return;
    }

    const invalidRows = validationErrors.length;

    if (invalidRows > 0) {
      alert(
        "يوجد أخطاء في الملف. يرجى تصحيحها قبل الاستيراد."
      );
      return;
    }

    setImporting(true);
    setImportedCount(0);
    setSkippedCount(0);
    setMessage("");

    try {
      const codes = teacherRows
        .map((row) => row.teacher_code)
        .filter(Boolean);

      let existingTeachers: {
        teacher_code: string | null;
      }[] = [];

      if (codes.length > 0) {
        const { data, error } = await supabase
          .from("teachers")
          .select("teacher_code")
          .eq("institute_id", selectedInstitute)
          .in("teacher_code", codes);

        if (error) throw error;

        existingTeachers = data || [];
      }

      const existingCodes = new Set(
        existingTeachers
          .map((teacher) =>
            teacher.teacher_code?.toLowerCase()
          )
          .filter(Boolean)
      );

      const rowsToInsert = teacherRows.filter(
        (row) =>
          !row.teacher_code ||
          !existingCodes.has(
            row.teacher_code.toLowerCase()
          )
      );

      const skipped =
        teacherRows.length - rowsToInsert.length;

      if (rowsToInsert.length === 0) {
        setSkippedCount(skipped);
        setMessage(
          "كل المدرسين الموجودين في الملف موجودون بالفعل في هذا المعهد."
        );
        return;
      }

      const payload = rowsToInsert.map((teacher) => ({
        institute_id: selectedInstitute,
        full_name: teacher.full_name.trim(),
        teacher_code:
          teacher.teacher_code.trim() || null,
        phone: teacher.phone.trim() || null,
        email: teacher.email.trim() || null,
        specialization:
          teacher.specialization.trim() || null,
        qualification:
          teacher.qualification.trim() || null,
        is_active: teacher.is_active,
      }));

      const { error } = await supabase
        .from("teachers")
        .insert(payload);

      if (error) {
        console.error(
          "TEACHERS IMPORT ERROR:",
          error
        );

        throw error;
      }

      setImportedCount(rowsToInsert.length);
      setSkippedCount(skipped);

      setMessage(
        `تم استيراد ${rowsToInsert.length} مدرس بنجاح.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء استيراد المدرسين. راجعي صلاحيات قاعدة البيانات أو بيانات الملف."
      );
    } finally {
      setImporting(false);
    }
  }

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
            جاري تحميل شاشة الاستيراد...
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              استيراد البيانات
            </h1>

            <p className="text-slate-500 mt-2">
              استيراد بيانات الطلاب أو المدرسين من ملفات Excel
            </p>
          </div>

          {/* اختيار نوع البيانات */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-5">
              اختر نوع البيانات
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setImportType("students");
                  resetImport();
                }}
                className={`rounded-2xl border-2 p-6 text-right transition ${
                  importType === "students"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <GraduationCap
                      size={30}
                      className="text-blue-700"
                    />
                  </div>

                  <div>
                    <div className="font-bold text-lg">
                      استيراد الطلاب
                    </div>

                    <div className="text-sm text-slate-500 mt-1">
                      استيراد بيانات الطلاب من Excel
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setImportType("teachers");
                  resetImport();
                }}
                className={`rounded-2xl border-2 p-6 text-right transition ${
                  importType === "teachers"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Users
                      size={30}
                      className="text-green-700"
                    />
                  </div>

                  <div>
                    <div className="font-bold text-lg">
                      استيراد المدرسين
                    </div>

                    <div className="text-sm text-slate-500 mt-1">
                      استيراد بيانات المدرسين من Excel
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* قسم المدرسين */}
          {importType === "teachers" && (
            <>
              {/* اختيار المعهد */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <label className="block font-bold mb-3">
                  المعهد الذي سيتم إضافة المدرسين إليه
                </label>

                <select
                  value={selectedInstitute}
                  onChange={(e) =>
                    setSelectedInstitute(e.target.value)
                  }
                  disabled={institutes.length <= 1}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="">
                    اختر المعهد
                  </option>

                  {institutes.map((institute) => (
                    <option
                      key={institute.id}
                      value={institute.id}
                    >
                      {institute.name} - {institute.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* نموذج Excel */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">
                      نموذج Excel للمدرسين
                    </h2>

                    <p className="text-sm text-slate-500 mt-2">
                      استخدمي النموذج الجاهز لضمان توافق الأعمدة.
                    </p>
                  </div>

                  <button
                    onClick={downloadTeacherTemplate}
                    className="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800"
                  >
                    <Download size={19} />
                    تحميل نموذج المدرسين
                  </button>
                </div>

                <div className="mt-5 bg-slate-50 rounded-xl p-4 text-sm">
                  <strong>الأعمدة المطلوبة:</strong>

                  <div className="mt-2 text-slate-600">
                    كود المعلم، اسم المعلم، الهاتف، البريد
                    الإلكتروني، التخصص، المؤهل، الحالة
                  </div>
                </div>
              </div>

              {/* رفع الملف */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <h2 className="text-lg font-bold mb-4">
                  رفع ملف المدرسين
                </h2>

                <label className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50">
                  <FileSpreadsheet
                    size={48}
                    className="text-green-600 mb-4"
                  />

                  <span className="font-semibold">
                    اضغطي لاختيار ملف Excel
                  </span>

                  <span className="text-sm text-slate-500 mt-2">
                    XLSX أو XLS
                  </span>

                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>

                {fileName && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        className="text-green-600"
                        size={22}
                      />

                      <span>{fileName}</span>
                    </div>

                    <button
                      onClick={resetImport}
                      className="p-2 hover:bg-green-100 rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                {processing && (
                  <div className="mt-5 flex items-center justify-center gap-3 text-slate-600">
                    <RefreshCw
                      size={20}
                      className="animate-spin"
                    />

                    جاري قراءة ملف Excel...
                  </div>
                )}
              </div>

              {/* الرسالة */}
              {message && (
                <div
                  className={`rounded-2xl p-5 mb-6 border ${
                    message.includes("نجاح") ||
                    message.includes("جاهزة")
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* الإحصائيات */}
              {teacherRows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  <div className="bg-white rounded-2xl border p-6">
                    <p className="text-sm text-slate-500">
                      إجمالي الصفوف
                    </p>

                    <p className="text-3xl font-bold mt-2">
                      {teacherRows.length}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border p-6">
                    <p className="text-sm text-slate-500">
                      صفوف سليمة
                    </p>

                    <p className="text-3xl font-bold mt-2 text-green-600">
                      {teacherRows.length -
                        validationErrors.length}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border p-6">
                    <p className="text-sm text-slate-500">
                      صفوف بها أخطاء
                    </p>

                    <p className="text-3xl font-bold mt-2 text-red-600">
                      {validationErrors.length}
                    </p>
                  </div>
                </div>
              )}

              {/* الأخطاء */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle
                      className="text-red-600"
                      size={24}
                    />

                    <h2 className="font-bold text-red-800">
                      أخطاء تحتاج إلى مراجعة
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {validationErrors.map(
                      (error, index) => (
                        <div
                          key={index}
                          className="text-sm text-red-700"
                        >
                          الصف {error.rowNumber}:{" "}
                          {error.errors.join(" - ")}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Preview */}
              {teacherRows.length > 0 && (
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-bold">
                      معاينة المدرسين قبل الاستيراد
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      راجعي البيانات قبل الضغط على زر الاستيراد.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="p-4">الكود</th>
                          <th className="p-4">اسم المعلم</th>
                          <th className="p-4">الهاتف</th>
                          <th className="p-4">
                            البريد الإلكتروني
                          </th>
                          <th className="p-4">التخصص</th>
                          <th className="p-4">المؤهل</th>
                          <th className="p-4">الحالة</th>
                        </tr>
                      </thead>

                      <tbody>
                        {teacherRows.map(
                          (teacher, index) => (
                            <tr
                              key={index}
                              className="border-b last:border-b-0"
                            >
                              <td className="p-4">
                                {teacher.teacher_code || "-"}
                              </td>

                              <td className="p-4 font-semibold">
                                {teacher.full_name}
                              </td>

                              <td className="p-4">
                                {teacher.phone || "-"}
                              </td>

                              <td className="p-4">
                                {teacher.email || "-"}
                              </td>

                              <td className="p-4">
                                {teacher.specialization || "-"}
                              </td>

                              <td className="p-4">
                                {teacher.qualification || "-"}
                              </td>

                              <td className="p-4">
                                {teacher.is_active ? (
                                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                                    نشط
                                  </span>
                                ) : (
                                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs">
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
                </div>
              )}

              {/* زر الاستيراد */}
              {teacherRows.length > 0 && (
                <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">
                      جاهز لاستيراد المدرسين
                    </p>

                    <p className="text-sm text-slate-500 mt-1">
                      سيتم إضافة المدرسين إلى المعهد المحدد فقط.
                    </p>
                  </div>

                  <button
                    onClick={importTeachers}
                    disabled={
                      importing ||
                      validationErrors.length > 0 ||
                      !selectedInstitute
                    }
                    className="bg-green-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <RefreshCw
                          size={19}
                          className="animate-spin"
                        />
                        جاري الاستيراد...
                      </>
                    ) : (
                      <>
                        <Upload size={19} />
                        استيراد المدرسين
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* نتيجة الاستيراد */}
              {(importedCount > 0 || skippedCount > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                    <p className="text-sm text-green-700">
                      تم استيرادهم بنجاح
                    </p>

                    <p className="text-3xl font-bold text-green-700 mt-2">
                      {importedCount}
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <p className="text-sm text-amber-700">
                      تم تخطيهم لأنهم موجودون بالفعل
                    </p>

                    <p className="text-3xl font-bold text-amber-700 mt-2">
                      {skippedCount}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* الطلاب */}
          {importType === "students" && (
            <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
              <GraduationCap
                size={55}
                className="mx-auto mb-4 text-blue-600"
              />

              <h2 className="text-xl font-bold">
                استيراد الطلاب
              </h2>

              <p className="text-slate-500 mt-2">
                جزء استيراد الطلاب الموجود حاليًا يظل كما هو.
                اختاري "استيراد الطلاب" للعودة إلى نموذج الطلاب.
              </p>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
