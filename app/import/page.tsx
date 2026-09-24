"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import AppShell from "../components/AppShell";

type StudentRow = {
  student_code: string;
  full_name: string;
  national_id: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  enrollment_date: string;
};

type ValidationRow = StudentRow & {
  rowNumber: number;
  errors: string[];
};

const TEMPLATE_HEADERS = [
  "كود الطالب",
  "اسم الطالب",
  "الرقم القومي",
  "النوع",
  "تاريخ الميلاد",
  "الهاتف",
  "العنوان",
  "اسم ولي الأمر",
  "هاتف ولي الأمر",
  "تاريخ الالتحاق",
];

const EXAMPLE_ROWS = [
  {
    "كود الطالب": "ST001",
    "اسم الطالب": "أحمد محمد علي",
    "الرقم القومي": "30101011234567",
    "النوع": "ذكر",
    "تاريخ الميلاد": "2010-01-01",
    الهاتف: "01000000000",
    العنوان: "دمياط الجديدة",
    "اسم ولي الأمر": "محمد علي",
    "هاتف ولي الأمر": "01011111111",
    "تاريخ الالتحاق": "2026-09-01",
  },
  {
    "كود الطالب": "ST002",
    "اسم الطالب": "مريم أحمد حسن",
    "الرقم القومي": "30102021234567",
    "النوع": "أنثى",
    "تاريخ الميلاد": "2010-02-02",
    الهاتف: "01100000000",
    العنوان: "دمياط",
    "اسم ولي الأمر": "أحمد حسن",
    "هاتف ولي الأمر": "01111111111",
    "تاريخ الالتحاق": "2026-09-01",
  },
];

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function excelDateToString(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);

    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
    }
  }

  return text;
}

function normalizeGender(value: unknown): string {
  const text = normalizeValue(value).toLowerCase();

  if (
    text === "ذكر" ||
    text === "male" ||
    text === "m" ||
    text === "ذكر "
  ) {
    return "ذكر";
  }

  if (
    text === "أنثى" ||
    text === "انثى" ||
    text === "female" ||
    text === "f"
  ) {
    return "أنثى";
  }

  return normalizeValue(value);
}

function getField(
  row: Record<string, unknown>,
  aliases: string[]
): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null) {
      return normalizeValue(row[alias]);
    }
  }

  return "";
}

function mapRow(row: Record<string, unknown>): StudentRow {
  return {
    student_code: getField(row, [
      "كود الطالب",
      "كود",
      "student_code",
      "student code",
      "code",
    ]),

    full_name: getField(row, [
      "اسم الطالب",
      "اسم الطالب بالكامل",
      "الاسم",
      "full_name",
      "student_name",
      "name",
    ]),

    national_id: getField(row, [
      "الرقم القومي",
      "الرقم القومى",
      "رقم قومي",
      "national_id",
      "national id",
    ]),

    gender: normalizeGender(
      getField(row, ["النوع", "الجنس", "gender", "sex"])
    ),

    date_of_birth: excelDateToString(
      getField(row, [
        "تاريخ الميلاد",
        "تاريخ الميلاد ",
        "date_of_birth",
        "birth_date",
        "date of birth",
      ])
    ),

    phone: getField(row, [
      "الهاتف",
      "رقم الهاتف",
      "تليفون",
      "phone",
      "mobile",
    ]),

    address: getField(row, [
      "العنوان",
      "address",
    ]),

    guardian_name: getField(row, [
      "اسم ولي الأمر",
      "اسم ولى الأمر",
      "ولي الأمر",
      "guardian_name",
      "guardian name",
    ]),

    guardian_phone: getField(row, [
      "هاتف ولي الأمر",
      "هاتف ولى الأمر",
      "رقم ولي الأمر",
      "guardian_phone",
      "guardian phone",
    ]),

    enrollment_date: excelDateToString(
      getField(row, [
        "تاريخ الالتحاق",
        "تاريخ التسجيل",
        "enrollment_date",
        "enrollment date",
      ])
    ),
  };
}

function validateRow(
  row: StudentRow,
  rowNumber: number
): ValidationRow {
  const errors: string[] = [];

  if (!row.student_code) {
    errors.push("كود الطالب مطلوب");
  }

  if (!row.full_name) {
    errors.push("اسم الطالب مطلوب");
  }

  if (row.national_id && !/^\d{14}$/.test(row.national_id)) {
    errors.push("الرقم القومي يجب أن يتكون من 14 رقمًا");
  }

  if (
    row.gender &&
    row.gender !== "ذكر" &&
    row.gender !== "أنثى"
  ) {
    errors.push("النوع يجب أن يكون ذكر أو أنثى");
  }

  if (
    row.guardian_phone &&
    !/^[0-9+\-\s()]{8,20}$/.test(row.guardian_phone)
  ) {
    errors.push("رقم هاتف ولي الأمر غير صحيح");
  }

  return {
    ...row,
    rowNumber,
    errors,
  };
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<ValidationRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);

  const validRows = rows.filter((row) => row.errors.length === 0);
  const invalidRows = rows.filter((row) => row.errors.length > 0);

  function downloadTemplate() {
    const worksheet = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, {
      header: TEMPLATE_HEADERS,
    });

    worksheet["!cols"] = TEMPLATE_HEADERS.map((header) => ({
      wch: Math.max(header.length + 5, 18),
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "بيانات الطلاب"
    );

    XLSX.writeFile(
      workbook,
      "نموذج_استيراد_بيانات_الطلاب.xlsx"
    );
  }

  function handleFile(file: File) {
    setError("");
    setRows([]);
    setFileName(file.name);

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls") {
      setError("يرجى اختيار ملف Excel بصيغة XLSX أو XLS.");
      return;
    }

    setIsReading(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;

        if (!data) {
          throw new Error("تعذر قراءة الملف.");
        }

        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
        });

        if (!workbook.SheetNames.length) {
          throw new Error("ملف Excel لا يحتوي على أوراق عمل.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows =
          XLSX.utils.sheet_to_json<Record<string, unknown>>(
            worksheet,
            {
              defval: "",
              raw: true,
            }
          );

        if (!jsonRows.length) {
          throw new Error(
            "ورقة Excel لا تحتوي على بيانات."
          );
        }

        const validatedRows = jsonRows.map(
          (rawRow, index) => {
            const mapped = mapRow(rawRow);

            return validateRow(
              mapped,
              index + 2
            );
          }
        );

        setRows(validatedRows);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء قراءة ملف Excel."
        );
      } finally {
        setIsReading(false);
      }
    };

    reader.onerror = () => {
      setIsReading(false);
      setError("تعذر قراءة الملف.");
    };

    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    handleFile(file);
  }

  function resetImport() {
    setRows([]);
    setFileName("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <div className="rounded-3xl bg-gradient-to-l from-emerald-700 to-teal-600 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <FileSpreadsheet size={30} />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold">
                      استيراد بيانات الطلاب
                    </h1>

                    <p className="mt-1 text-sm text-emerald-50">
                      استيراد بيانات الطلاب من ملفات Excel
                      بطريقة منظمة وآمنة
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                <Download size={19} />
                تحميل نموذج Excel
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              طريقة الاستخدام
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    1
                  </span>
                  تحميل النموذج
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  حمّلي نموذج Excel الجاهز واستخدمي الأعمدة
                  الموجودة فيه.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    2
                  </span>
                  إدخال البيانات
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  أدخلي بيانات الطلاب واحفظي الملف بصيغة XLSX
                  أو XLS.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    3
                  </span>
                  المراجعة
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  ارفعي الملف وسيتم فحص البيانات قبل إدخالها
                  إلى النظام.
                </p>
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-12 text-center">

              <div className="mb-4 rounded-2xl bg-emerald-100 p-4 text-emerald-700">
                <Upload size={34} />
              </div>

              <h2 className="text-xl font-bold text-slate-800">
                رفع ملف Excel
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                اختاري ملف الطلاب من جهازك. سيتم عرض البيانات
                ومراجعتها فقط في هذه المرحلة، ولن يتم تعديل قاعدة
                البيانات.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={isReading}
                className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={19} />

                {isReading
                  ? "جاري قراءة الملف..."
                  : "اختيار ملف Excel"}
              </button>

              {fileName && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
                  <FileSpreadsheet
                    size={18}
                    className="text-emerald-600"
                  />
                  {fileName}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle
                size={22}
                className="mt-0.5 shrink-0"
              />

              <div>
                <div className="font-bold">
                  تعذر معالجة الملف
                </div>

                <div className="mt-1 text-sm">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          {rows.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        إجمالي الصفوف
                      </p>

                      <p className="mt-2 text-3xl font-bold text-slate-800">
                        {rows.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                      <Users size={24} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        بيانات صحيحة
                      </p>

                      <p className="mt-2 text-3xl font-bold text-emerald-600">
                        {validRows.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        بيانات بها أخطاء
                      </p>

                      <p className="mt-2 text-3xl font-bold text-red-600">
                        {invalidRows.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-100 p-3 text-red-600">
                      <XCircle size={24} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        نسبة الصحة
                      </p>

                      <p className="mt-2 text-3xl font-bold text-blue-600">
                        {rows.length
                          ? Math.round(
                              (validRows.length /
                                rows.length) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      معاينة البيانات
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      الصفوف باللون الأحمر تحتاج إلى مراجعة
                      قبل الاستيراد.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetImport}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    مسح الملف
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1250px] w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          الصف
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          كود الطالب
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          اسم الطالب
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          الرقم القومي
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          النوع
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          تاريخ الميلاد
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          الهاتف
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          ولي الأمر
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          هاتف ولي الأمر
                        </th>

                        <th className="px-4 py-3 text-right font-bold text-slate-700">
                          الحالة
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row) => {
                        const hasError =
                          row.errors.length > 0;

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`border-b border-slate-100 ${
                              hasError
                                ? "bg-red-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-slate-600">
                              {row.rowNumber}
                            </td>

                            <td className="px-4 py-3">
                              {row.student_code || "—"}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {row.full_name || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {row.national_id || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {row.gender || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {row.date_of_birth || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {row.phone || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {row.guardian_name || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {row.guardian_phone || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {hasError ? (
                                <div className="max-w-xs">
                                  <div className="flex items-center gap-1 font-semibold text-red-700">
                                    <XCircle size={16} />
                                    يحتاج مراجعة
                                  </div>

                                  <div className="mt-1 text-xs leading-5 text-red-600">
                                    {row.errors.join(" • ")}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 font-semibold text-emerald-700">
                                  <CheckCircle2 size={16} />
                                  صحيح
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Current stage notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={22}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <h3 className="font-bold text-amber-800">
                      مرحلة المراجعة فقط
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      البيانات التي تظهر هنا لم يتم حفظها في
                      قاعدة البيانات بعد. بعد التأكد من أن قراءة
                      Excel والتحقق من البيانات يعملان بشكل صحيح،
                      سنضيف خطوة الاستيراد الفعلي وربط الطلاب
                      بالمعهد.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
