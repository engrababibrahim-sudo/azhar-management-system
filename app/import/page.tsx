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

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function excelDateToString(value: unknown) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      const year = parsed.y;
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }
  }

  const text = normalizeValue(value);

  if (!text) {
    return "";
  }

  const normalized = text.replace(/\//g, "-");

  const parts = normalized.split("-");

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return normalized;
    }

    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(
        2,
        "0"
      )}`;
    }
  }

  return text;
}

function normalizeGender(value: string) {
  const text = value.trim().toLowerCase();

  if (
    text === "ذكر" ||
    text === "male" ||
    text === "m" ||
    text === "1"
  ) {
    return "ذكر";
  }

  if (
    text === "أنثى" ||
    text === "انثى" ||
    text === "female" ||
    text === "f" ||
    text === "2"
  ) {
    return "أنثى";
  }

  return value.trim();
}

function mapRow(row: Record<string, unknown>): StudentRow {
  return {
    student_code: normalizeValue(
      row["كود الطالب"] ??
        row["student_code"] ??
        row["Student Code"]
    ),

    full_name: normalizeValue(
      row["اسم الطالب"] ??
        row["full_name"] ??
        row["Full Name"]
    ),

    national_id: normalizeValue(
      row["الرقم القومي"] ??
        row["national_id"] ??
        row["National ID"]
    ),

    gender: normalizeGender(
      normalizeValue(
        row["النوع"] ??
          row["gender"] ??
          row["Gender"]
      )
    ),

    date_of_birth: excelDateToString(
      row["تاريخ الميلاد"] ??
        row["date_of_birth"] ??
        row["Date of Birth"]
    ),

    phone: normalizeValue(
      row["الهاتف"] ??
        row["phone"] ??
        row["Phone"]
    ),

    address: normalizeValue(
      row["العنوان"] ??
        row["address"] ??
        row["Address"]
    ),

    guardian_name: normalizeValue(
      row["اسم ولي الأمر"] ??
        row["guardian_name"] ??
        row["Guardian Name"]
    ),

    guardian_phone: normalizeValue(
      row["هاتف ولي الأمر"] ??
        row["guardian_phone"] ??
        row["Guardian Phone"]
    ),

    enrollment_date: excelDateToString(
      row["تاريخ الالتحاق"] ??
        row["enrollment_date"] ??
        row["Enrollment Date"]
    ),
  };
}

function validateRow(row: StudentRow, rowNumber: number) {
  const errors: string[] = [];

  if (!row.full_name) {
    errors.push("اسم الطالب مطلوب");
  }

  if (!row.student_code) {
    errors.push("كود الطالب مطلوب");
  }

  if (row.gender && row.gender !== "ذكر" && row.gender !== "أنثى") {
    errors.push("النوع يجب أن يكون ذكر أو أنثى");
  }

  if (row.national_id && !/^\d{14}$/.test(row.national_id)) {
    errors.push("الرقم القومي يجب أن يتكون من 14 رقمًا");
  }

  if (
    row.guardian_phone &&
    !/^[0-9+\-\s()]{8,20}$/.test(row.guardian_phone)
  ) {
    errors.push("هاتف ولي الأمر غير صحيح");
  }

  return {
    ...row,
    rowNumber,
    errors,
  };
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ValidationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const validRows = rows.filter((row) => row.errors.length === 0);
  const invalidRows = rows.filter((row) => row.errors.length > 0);

  function downloadTemplate() {
    const exampleRows = [
      {
        "كود الطالب": "ST001",
        "اسم الطالب": "أحمد محمد علي",
        "الرقم القومي": "30001011234567",
        "النوع": "ذكر",
        "تاريخ الميلاد": "2010-01-01",
        "الهاتف": "01000000000",
        "العنوان": "دمياط الجديدة",
        "اسم ولي الأمر": "محمد علي",
        "هاتف ولي الأمر": "01100000000",
        "تاريخ الالتحاق": "2026-09-01",
      },
      {
        "كود الطالب": "ST002",
        "اسم الطالب": "مريم أحمد حسن",
        "الرقم القومي": "30102021234568",
        "النوع": "أنثى",
        "تاريخ الميلاد": "2011-02-02",
        "الهاتف": "01200000000",
        "العنوان": "دمياط الجديدة",
        "اسم ولي الأمر": "أحمد حسن",
        "هاتف ولي الأمر": "01000000001",
        "تاريخ الالتحاق": "2026-09-01",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(exampleRows, {
      header: TEMPLATE_HEADERS,
    });

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
    ];

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

  async function handleFile(file: File) {
    setLoading(true);
    setMessage("");
    setErrorMessage("");
    setRows([]);
    setFileName(file.name);

    try {
      const allowedExtensions = [".xlsx", ".xls"];

      const lowerName = file.name.toLowerCase();

      if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
        throw new Error(
          "من فضلك اختاري ملف Excel بصيغة .xlsx أو .xls"
        );
      }

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error("ملف Excel لا يحتوي على أي ورقة بيانات");
      }

      const firstSheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) {
        throw new Error("تعذر قراءة ورقة البيانات");
      }

      const jsonRows = XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(worksheet, {
        defval: "",
        raw: true,
      });

      if (!jsonRows.length) {
        throw new Error(
          "ملف Excel لا يحتوي على بيانات"
        );
      }

      const processedRows = jsonRows.map((rawRow, index) => {
        const student = mapRow(rawRow);

        return validateRow(student, index + 2);
      });

      setRows(processedRows);

      const validCount = processedRows.filter(
        (row) => row.errors.length === 0
      ).length;

      const invalidCount = processedRows.filter(
        (row) => row.errors.length > 0
      ).length;

      setMessage(
        `تمت قراءة ${processedRows.length.toLocaleString(
          "ar-EG"
        )} صف. الصحيح: ${validCount.toLocaleString(
          "ar-EG"
        )}، ويحتاج للمراجعة: ${invalidCount.toLocaleString(
          "ar-EG"
        )}.`
      );
    } catch (error: any) {
      console.error("Excel import error:", error);

      setErrorMessage(
        error?.message ||
          "حدث خطأ أثناء قراءة ملف Excel"
      );
    } finally {
      setLoading(false);
    }
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

  function clearData() {
    setFileName("");
    setRows([]);
    setMessage("");
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-100"
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <span>الرئيسية</span>
              <span>/</span>
              <span>استيراد البيانات</span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              استيراد البيانات
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              إدخال بيانات الطلاب من ملفات Excel بطريقة منظمة
              مع مراجعة البيانات قبل الاستيراد.
            </p>
          </div>

          <div className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <FileSpreadsheet size={28} />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    استيراد بيانات الطلاب من Excel
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                    حمّلي النموذج الجاهز، املئي بيانات الطلاب،
                    ثم ارفعي الملف لمراجعة البيانات قبل إدخالها
                    إلى النظام.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
              >
                <Download size={18} />
                تحميل نموذج Excel
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileSpreadsheet size={21} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    الملف
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {fileName || "لم يتم اختيار ملف"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    صفوف صحيحة
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {validRows.length.toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertCircle size={21} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    تحتاج مراجعة
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {invalidRows.length.toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-900">
                رفع ملف Excel
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                الصيغ المسموح بها: XLSX و XLS
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                <Upload size={26} />
              </div>

              <div className="mt-4 font-bold text-slate-900">
                {loading
                  ? "جاري قراءة الملف..."
                  : "اضغطي هنا لاختيار ملف Excel"}
              </div>

              <div className="mt-2 text-sm text-slate-500">
                أو اسحبي الملف إلى هذه المنطقة
              </div>
            </button>

            {message && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{message}</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <div className="flex items-start gap-2">
                  <XCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{errorMessage}</span>
                </div>
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    معاينة البيانات
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    راجعي البيانات قبل تنفيذ الاستيراد النهائي.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearData}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <XCircle size={17} />
                  إلغاء الملف
                </button>
              </div>

              {invalidRows.length > 0 && (
                <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <h3 className="font-bold text-amber-800">
                        توجد بيانات تحتاج إلى مراجعة
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        لن يتم اعتماد الصفوف التي تحتوي على
                        أخطاء حتى يتم تصحيحها في ملف Excel
                        وإعادة رفعه.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full text-right text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-600">
                        #
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        كود الطالب
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        اسم الطالب
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        الرقم القومي
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        النوع
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        تاريخ الميلاد
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        ولي الأمر
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        هاتف ولي الأمر
                      </th>

                      <th className="px-4 py-3 font-bold text-slate-600">
                        الحالة
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={`${row.rowNumber}-${row.student_code}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-500">
                          {row.rowNumber}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {row.student_code || "—"}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-900">
                          {row.full_name || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.national_id || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.gender || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.date_of_birth || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.guardian_name || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.guardian_phone || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                              <CheckCircle2 size={14} />
                              صحيح
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                                <AlertCircle size={14} />
                                يحتاج مراجعة
                              </span>

                              <div className="mt-2 max-w-xs text-xs leading-5 text-red-600">
                                {row.errors.join(" — ")}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users size={18} />

                  <span>
                    إجمالي الصفوف:{" "}
                    <strong className="text-slate-900">
                      {rows.length.toLocaleString("ar-EG")}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-300 px-6 py-3 text-sm font-bold text-slate-600"
                  title="سيتم تفعيل الاستيراد بعد اعتماد خطوة المعاينة"
                >
                  <Upload size={18} />
                  استيراد البيانات
                </button>
              </div>
            </section>
          )}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-black text-blue-900">
              ملاحظة مهمة
            </h3>

            <p className="mt-2 text-sm leading-7 text-blue-800">
              في هذه المرحلة يتم قراءة ملف Excel ومعاينة البيانات
              والتحقق منها فقط. لن يتم تعديل أو إضافة أي بيانات
              في قاعدة البيانات قبل اعتماد خطوة الاستيراد النهائي.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
