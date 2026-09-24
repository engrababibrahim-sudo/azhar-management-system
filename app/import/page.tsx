"use client";

import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
  GraduationCap,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type ImportType = "students" | "teachers";

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

type TeacherRow = {
  teacher_code: string;
  full_name: string;
  phone: string;
  email: string;
  specialization: string;
  qualification: string;
  is_active: boolean;
};

type ValidationStudentRow = StudentRow & {
  rowNumber: number;
  errors: string[];
};

type ValidationTeacherRow = TeacherRow & {
  rowNumber: number;
  errors: string[];
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
};

type ImportResult = {
  inserted: number;
  skipped: number;
  failed: number;
};

const STUDENT_TEMPLATE_HEADERS = [
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

const STUDENT_EXAMPLE_ROWS = [
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

const TEACHER_TEMPLATE_HEADERS = [
  "كود المعلم",
  "اسم المعلم",
  "الهاتف",
  "البريد الإلكتروني",
  "التخصص",
  "المؤهل",
  "الحالة",
];

const TEACHER_EXAMPLE_ROWS = [
  {
    "كود المعلم": "TCH-001",
    "اسم المعلم": "محمد أحمد علي",
    الهاتف: "01011112222",
    "البريد الإلكتروني": "teacher1@example.com",
    التخصص: "اللغة العربية",
    المؤهل: "ليسانس لغة عربية",
    الحالة: "نشط",
  },
  {
    "كود المعلم": "TCH-002",
    "اسم المعلم": "سارة محمود حسن",
    الهاتف: "01122223333",
    "البريد الإلكتروني": "teacher2@example.com",
    التخصص: "الرياضيات",
    المؤهل: "ليسانس رياضيات",
    الحالة: "نشط",
  },
  {
    "كود المعلم": "TCH-003",
    "اسم المعلم": "أحمد خالد إبراهيم",
    الهاتف: "01233334444",
    "البريد الإلكتروني": "teacher3@example.com",
    التخصص: "العلوم",
    المؤهل: "ماجستير علوم",
    الحالة: "نشط",
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

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);

    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
    }
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

  return text;
}

function normalizeGender(value: unknown): string {
  const text = normalizeValue(value).toLowerCase();

  if (text === "ذكر" || text === "male" || text === "m") {
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

function normalizeActive(value: unknown): boolean {
  const text = normalizeValue(value).toLowerCase();

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

function mapStudentRow(row: Record<string, unknown>): StudentRow {
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

    address: getField(row, ["العنوان", "address"]),

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

function mapTeacherRow(row: Record<string, unknown>): TeacherRow {
  return {
    teacher_code: getField(row, [
      "كود المعلم",
      "كود المدرس",
      "teacher_code",
      "teacher code",
      "code",
    ]),

    full_name: getField(row, [
      "اسم المعلم",
      "اسم المدرس",
      "اسم المعلم بالكامل",
      "الاسم",
      "full_name",
      "teacher_name",
      "name",
    ]),

    phone: getField(row, [
      "الهاتف",
      "رقم الهاتف",
      "تليفون",
      "phone",
      "mobile",
    ]),

    email: getField(row, [
      "البريد الإلكتروني",
      "البريد الالكتروني",
      "الإيميل",
      "الايميل",
      "email",
    ]),

    specialization: getField(row, [
      "التخصص",
      "التخصص الدراسي",
      "specialization",
      "subject",
    ]),

    qualification: getField(row, [
      "المؤهل",
      "المؤهل الدراسي",
      "qualification",
      "degree",
    ]),

    is_active: normalizeActive(
      getField(row, [
        "الحالة",
        "حالة المعلم",
        "status",
        "is_active",
      ])
    ),
  };
}

function validateStudentRow(
  row: StudentRow,
  rowNumber: number
): ValidationStudentRow {
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
    errors.push("هاتف ولي الأمر غير صحيح");
  }

  return {
    ...row,
    rowNumber,
    errors,
  };
}

function validateTeacherRow(
  row: TeacherRow,
  rowNumber: number
): ValidationTeacherRow {
  const errors: string[] = [];

  if (!row.teacher_code) {
    errors.push("كود المعلم مطلوب");
  }

  if (!row.full_name) {
    errors.push("اسم المعلم مطلوب");
  }

  if (
    row.phone &&
    !/^[0-9+\-\s()]{8,20}$/.test(row.phone)
  ) {
    errors.push("رقم هاتف المعلم غير صحيح");
  }

  if (
    row.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
  ) {
    errors.push("البريد الإلكتروني غير صحيح");
  }

  return {
    ...row,
    rowNumber,
    errors,
  };
}

function StatCard({
  label,
  value,
  icon,
  color = "emerald",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "emerald" | "red" | "blue" | "slate";
}) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${styles[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importType, setImportType] =
    useState<ImportType>("students");

  const [studentRows, setStudentRows] = useState<
    ValidationStudentRow[]
  >([]);

  const [teacherRows, setTeacherRows] = useState<
    ValidationTeacherRow[]
  >([]);

  const [institutes, setInstitutes] = useState<Institute[]>([]);

  const [selectedInstitute, setSelectedInstitute] =
    useState("");

  const [fileName, setFileName] = useState("");

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [isLoadingInstitutes, setIsLoadingInstitutes] =
    useState(true);

  const [isReading, setIsReading] = useState(false);

  const [isImporting, setIsImporting] = useState(false);

  const [importResult, setImportResult] =
    useState<ImportResult | null>(null);

  const rows =
    importType === "students"
      ? studentRows
      : teacherRows;

  const validRows = rows.filter(
    (row) => row.errors.length === 0
  );

  const invalidRows = rows.filter(
    (row) => row.errors.length > 0
  );

  useEffect(() => {
    loadInstitutes();
  }, []);

  async function loadInstitutes() {
    setIsLoadingInstitutes(true);

    const { data, error } = await supabase
      .from("institutes")
      .select("id,name,code")
      .order("name");

    if (error) {
      setError(
        `تعذر تحميل قائمة المعاهد: ${error.message}`
      );
    } else {
      setInstitutes((data ?? []) as Institute[]);
    }

    setIsLoadingInstitutes(false);
  }

  function changeImportType(type: ImportType) {
    setImportType(type);

    setError("");
    setMessage("");
    setImportResult(null);
    setFileName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (type === "students") {
      setTeacherRows([]);
    } else {
      setStudentRows([]);
    }
  }

  function downloadTemplate() {
    if (importType === "students") {
      const worksheet = XLSX.utils.json_to_sheet(
        STUDENT_EXAMPLE_ROWS,
        {
          header: STUDENT_TEMPLATE_HEADERS,
        }
      );

      worksheet["!cols"] =
        STUDENT_TEMPLATE_HEADERS.map((header) => ({
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

      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      TEACHER_EXAMPLE_ROWS,
      {
        header: TEACHER_TEMPLATE_HEADERS,
      }
    );

    worksheet["!cols"] =
      TEACHER_TEMPLATE_HEADERS.map((header) => ({
        wch: Math.max(header.length + 5, 20),
      }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "بيانات المدرسين"
    );

    XLSX.writeFile(
      workbook,
      "نموذج_استيراد_بيانات_المدرسين.xlsx"
    );
  }

  async function checkStudentDuplicates(
    importedRows: ValidationStudentRow[],
    instituteId: string
  ) {
    if (!instituteId || !importedRows.length) {
      return importedRows;
    }

    const codes = [
      ...new Set(
        importedRows
          .map((row) => row.student_code)
          .filter(Boolean)
      ),
    ];

    const nationalIds = [
      ...new Set(
        importedRows
          .map((row) => row.national_id)
          .filter(Boolean)
      ),
    ];

    const codeQuery =
      codes.length > 0
        ? supabase
            .from("students")
            .select("student_code")
            .eq("institute_id", instituteId)
            .in("student_code", codes)
        : Promise.resolve({
            data: [],
            error: null,
          });

    const nationalQuery =
      nationalIds.length > 0
        ? supabase
            .from("students")
            .select("national_id")
            .eq("institute_id", instituteId)
            .in("national_id", nationalIds)
        : Promise.resolve({
            data: [],
            error: null,
          });

    const [
      codeResult,
      nationalResult,
    ] = await Promise.all([
      codeQuery,
      nationalQuery,
    ]);

    if (codeResult.error) {
      throw new Error(
        `تعذر فحص أكواد الطلاب: ${codeResult.error.message}`
      );
    }

    if (nationalResult.error) {
      throw new Error(
        `تعذر فحص الأرقام القومية: ${nationalResult.error.message}`
      );
    }

    const existingCodes = new Set(
      (codeResult.data ?? []).map((item) =>
        String(item.student_code)
      )
    );

    const existingNationalIds = new Set(
      (nationalResult.data ?? []).map((item) =>
        String(item.national_id)
      )
    );

    const codesInsideFile = new Set<string>();

    return importedRows.map((row) => {
      const errors = row.errors.filter(
        (error) =>
          error !==
          "الطالب موجود بالفعل أو مكرر داخل الملف"
      );

      let duplicate = false;

      if (existingCodes.has(row.student_code)) {
        duplicate = true;
      }

      if (
        row.national_id &&
        existingNationalIds.has(row.national_id)
      ) {
        duplicate = true;
      }

      if (
        row.student_code &&
        codesInsideFile.has(row.student_code)
      ) {
        duplicate = true;
      }

      if (row.student_code) {
        codesInsideFile.add(row.student_code);
      }

      if (duplicate) {
        errors.push(
          "الطالب موجود بالفعل أو مكرر داخل الملف"
        );
      }

      return {
        ...row,
        errors,
      };
    });
  }

  async function checkTeacherDuplicates(
    importedRows: ValidationTeacherRow[],
    instituteId: string
  ) {
    if (!instituteId || !importedRows.length) {
      return importedRows;
    }

    const codes = [
      ...new Set(
        importedRows
          .map((row) => row.teacher_code)
          .filter(Boolean)
      ),
    ];

    const codeQuery =
      codes.length > 0
        ? supabase
            .from("teachers")
            .select("teacher_code")
            .eq("institute_id", instituteId)
            .in("teacher_code", codes)
        : Promise.resolve({
            data: [],
            error: null,
          });

    const { data, error } = await codeQuery;

    if (error) {
      throw new Error(
        `تعذر فحص أكواد المدرسين: ${error.message}`
      );
    }

    const existingCodes = new Set(
      (data ?? []).map((item) =>
        String(item.teacher_code)
      )
    );

    const codesInsideFile = new Set<string>();

    return importedRows.map((row) => {
      const errors = row.errors.filter(
        (item) =>
          item !==
          "المعلم موجود بالفعل أو مكرر داخل الملف"
      );

      let duplicate = false;

      if (
        row.teacher_code &&
        existingCodes.has(row.teacher_code)
      ) {
        duplicate = true;
      }

      if (
        row.teacher_code &&
        codesInsideFile.has(row.teacher_code)
      ) {
        duplicate = true;
      }

      if (row.teacher_code) {
        codesInsideFile.add(row.teacher_code);
      }

      if (duplicate) {
        errors.push(
          "المعلم موجود بالفعل أو مكرر داخل الملف"
        );
      }

      return {
        ...row,
        errors,
      };
    });
  }

  async function handleFile(file: File) {
    setError("");
    setMessage("");
    setImportResult(null);
    setFileName(file.name);

    if (!selectedInstitute) {
      setError(
        `اختاري المعهد أولًا قبل رفع ملف ${
          importType === "students"
            ? "الطلاب"
            : "المدرسين"
        }.`
      );

      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      extension !== "xlsx" &&
      extension !== "xls"
    ) {
      setError(
        "يرجى اختيار ملف Excel بصيغة XLSX أو XLS."
      );

      return;
    }

    setIsReading(true);

    try {
      const data = await file.arrayBuffer();

      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error(
          "ملف Excel لا يحتوي على أوراق عمل."
        );
      }

      const firstSheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[firstSheetName];

      const jsonRows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: "",
          raw: true,
        });

      if (!jsonRows.length) {
        throw new Error(
          "ورقة Excel لا تحتوي على بيانات."
        );
      }

      if (importType === "students") {
        let validatedRows =
          jsonRows.map((rawRow, index) => {
            const mapped =
              mapStudentRow(rawRow);

            return validateStudentRow(
              mapped,
              index + 2
            );
          });

        validatedRows =
          await checkStudentDuplicates(
            validatedRows,
            selectedInstitute
          );

        setStudentRows(validatedRows);
        setTeacherRows([]);

        return;
      }

      let validatedRows =
        jsonRows.map((rawRow, index) => {
          const mapped =
            mapTeacherRow(rawRow);

          return validateTeacherRow(
            mapped,
            index + 2
          );
        });

      validatedRows =
        await checkTeacherDuplicates(
          validatedRows,
          selectedInstitute
        );

      setTeacherRows(validatedRows);
      setStudentRows([]);
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
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    handleFile(file);
  }

  async function handleInstituteChange(
    instituteId: string
  ) {
    setSelectedInstitute(instituteId);

    setError("");
    setMessage("");
    setImportResult(null);

    if (!instituteId || rows.length === 0) {
      return;
    }

    try {
      if (importType === "students") {
        const checked =
          await checkStudentDuplicates(
            studentRows,
            instituteId
          );

        setStudentRows(checked);
      } else {
        const checked =
          await checkTeacherDuplicates(
            teacherRows,
            instituteId
          );

        setTeacherRows(checked);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر فحص التكرار."
      );
    }
  }

  async function importStudents() {
    setError("");
    setMessage("");
    setImportResult(null);

    if (!selectedInstitute) {
      setError("اختاري المعهد أولًا.");
      return;
    }

    if (!studentRows.length) {
      setError("ارفعي ملف Excel للطلاب أولًا.");
      return;
    }

    const validStudentRows =
      studentRows.filter(
        (row) => row.errors.length === 0
      );

    if (!validStudentRows.length) {
      setError(
        "لا توجد صفوف صالحة للاستيراد. راجعي البيانات بالأحمر."
      );
      return;
    }

    setIsImporting(true);

    try {
      const payload =
        validStudentRows.map((row) => ({
          student_code: row.student_code,
          full_name: row.full_name,
          national_id:
            row.national_id || null,
          gender: row.gender || null,
          date_of_birth:
            row.date_of_birth || null,
          phone: row.phone || null,
          address: row.address || null,
          guardian_name:
            row.guardian_name || null,
          guardian_phone:
            row.guardian_phone || null,
          enrollment_date:
            row.enrollment_date || null,
          institute_id: selectedInstitute,
          is_active: true,
        }));

      const {
        error: insertError,
      } = await supabase
        .from("students")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      const skipped =
        studentRows.length -
        validStudentRows.length;

      setImportResult({
        inserted: payload.length,
        skipped,
        failed: 0,
      });

      setMessage(
        `تم استيراد ${payload.length} طالب بنجاح إلى المعهد المحدد.`
      );

      setStudentRows([]);
      setFileName("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء استيراد الطلاب."
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function importTeachers() {
    setError("");
    setMessage("");
    setImportResult(null);

    if (!selectedInstitute) {
      setError("اختاري المعهد أولًا.");
      return;
    }

    if (!teacherRows.length) {
      setError("ارفعي ملف Excel للمدرسين أولًا.");
      return;
    }

    const validTeacherRows =
      teacherRows.filter(
        (row) => row.errors.length === 0
      );

    if (!validTeacherRows.length) {
      setError(
        "لا توجد صفوف صالحة للاستيراد. راجعي البيانات بالأحمر."
      );
      return;
    }

    setIsImporting(true);

    try {
      const payload =
        validTeacherRows.map((row) => ({
          institute_id: selectedInstitute,
          full_name: row.full_name.trim(),
          teacher_code:
            row.teacher_code.trim() || null,
          phone: row.phone.trim() || null,
          email: row.email.trim() || null,
          specialization:
            row.specialization.trim() || null,
          qualification:
            row.qualification.trim() || null,
          is_active: row.is_active,
        }));

      const {
        error: insertError,
      } = await supabase
        .from("teachers")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      const skipped =
        teacherRows.length -
        validTeacherRows.length;

      setImportResult({
        inserted: payload.length,
        skipped,
        failed: 0,
      });

      setMessage(
        `تم استيراد ${payload.length} مدرس بنجاح إلى المعهد المحدد.`
      );

      setTeacherRows([]);
      setFileName("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء استيراد المدرسين."
      );
    } finally {
      setIsImporting(false);
    }
  }

  function importData() {
    if (importType === "students") {
      importStudents();
    } else {
      importTeachers();
    }
  }

  function resetImport() {
    if (importType === "students") {
      setStudentRows([]);
    } else {
      setTeacherRows([]);
    }

    setFileName("");
    setError("");
    setMessage("");
    setImportResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isStudentMode =
    importType === "students";

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

              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/15 p-3">
                  <FileSpreadsheet size={30} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold">
                    استيراد بيانات{" "}
                    {isStudentMode
                      ? "الطلاب"
                      : "المدرسين"}
                  </h1>

                  <p className="mt-1 text-sm text-emerald-50">
                    استيراد{" "}
                    {isStudentMode
                      ? "الطلاب"
                      : "المدرسين"}{" "}
                    من Excel إلى المعهد بطريقة آمنة
                  </p>
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

          {/* Import Type */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              نوع البيانات المراد استيرادها
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  changeImportType("students")
                }
                disabled={isImporting}
                className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-right transition ${
                  isStudentMode
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <div
                  className={`rounded-xl p-3 ${
                    isStudentMode
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Users size={28} />
                </div>

                <div>
                  <div className="font-bold text-slate-800">
                    استيراد الطلاب
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    رفع بيانات الطلاب من Excel
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  changeImportType("teachers")
                }
                disabled={isImporting}
                className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-right transition ${
                  !isStudentMode
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <div
                  className={`rounded-xl p-3 ${
                    !isStudentMode
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <GraduationCap size={28} />
                </div>

                <div>
                  <div className="font-bold text-slate-800">
                    استيراد المدرسين
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    رفع بيانات المدرسين من Excel
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* Institute */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-3 flex items-center gap-2">
              <Users
                size={20}
                className="text-emerald-600"
              />

              <label className="font-bold text-slate-800">
                المعهد الذي سيتم استيراد{" "}
                {isStudentMode
                  ? "الطلاب"
                  : "المدرسين"}{" "}
                إليه
              </label>
            </div>

            <select
              value={selectedInstitute}
              onChange={(event) =>
                handleInstituteChange(
                  event.target.value
                )
              }
              disabled={
                isLoadingInstitutes ||
                isImporting
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 md:max-w-2xl"
            >
              <option value="">
                {isLoadingInstitutes
                  ? "جاري تحميل المعاهد..."
                  : "اختيار المعهد..."}
              </option>

              {institutes.map((institute) => (
                <option
                  key={institute.id}
                  value={institute.id}
                >
                  {institute.name}
                  {institute.code
                    ? ` — ${institute.code}`
                    : ""}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              يجب اختيار المعهد قبل رفع الملف حتى يتم ربط{" "}
              {isStudentMode
                ? "الطلاب"
                : "المدرسين"}{" "}
              بالمعهد الصحيح.
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-bold text-slate-800">
              طريقة الاستخدام
            </h2>

            <div className="grid gap-4 md:grid-cols-4">

              <div className="rounded-2xl bg-slate-50 p-4">
                <Step
                  number="1"
                  title="اختيار النوع"
                  text={`اختاري ${
                    isStudentMode
                      ? "الطلاب"
                      : "المدرسين"
                  }.`}
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <Step
                  number="2"
                  title="اختيار المعهد"
                  text={`حددي المعهد الذي ينتمي إليه ${
                    isStudentMode
                      ? "الطلاب"
                      : "المدرسون"
                  }.`}
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <Step
                  number="3"
                  title="رفع الملف"
                  text="ارفعي ملف Excel وسيتم فحص البيانات."
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <Step
                  number="4"
                  title="الاستيراد"
                  text="راجعي البيانات ثم اضغطي استيراد."
                />
              </div>

            </div>
          </div>

          {/* Upload */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-12 text-center">

              <div className="mb-4 rounded-2xl bg-emerald-100 p-4 text-emerald-700">
                {isStudentMode ? (
                  <Users size={34} />
                ) : (
                  <GraduationCap size={34} />
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-800">
                رفع ملف Excel{" "}
                {isStudentMode
                  ? "الطلاب"
                  : "المدرسين"}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                اختاري ملف XLSX أو XLS. سيتم فحص
                البيانات وكشف التكرار قبل حفظها.
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
                disabled={
                  isReading ||
                  isImporting ||
                  !selectedInstitute
                }
                className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={19} />

                {isReading
                  ? "جاري قراءة الملف..."
                  : "اختيار ملف Excel"}
              </button>

              {!selectedInstitute && (
                <p className="mt-3 text-sm font-semibold text-amber-600">
                  اختاري المعهد أولًا.
                </p>
              )}

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
                  تعذر تنفيذ العملية
                </div>

                <div className="mt-1 text-sm leading-6">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">

              <CheckCircle2
                size={22}
                className="mt-0.5 shrink-0"
              />

              <div>
                <div className="font-bold">
                  تم الاستيراد بنجاح
                </div>

                <div className="mt-1 text-sm">
                  {message}
                </div>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="grid gap-4 sm:grid-cols-3">

              <StatCard
                label="تم استيرادهم"
                value={importResult.inserted}
                icon={<CheckCircle2 size={24} />}
                color="emerald"
              />

              <StatCard
                label="تم تخطيهم"
                value={importResult.skipped}
                icon={<AlertCircle size={24} />}
                color="blue"
              />

              <StatCard
                label="أخطاء"
                value={importResult.failed}
                icon={<XCircle size={24} />}
                color="red"
              />

            </div>
          )}

          {/* Statistics + Preview */}
          {rows.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <StatCard
                  label="إجمالي الصفوف"
                  value={rows.length}
                  icon={
                    isStudentMode ? (
                      <Users size={24} />
                    ) : (
                      <GraduationCap size={24} />
                    )
                  }
                  color="slate"
                />

                <StatCard
                  label="جاهزة للاستيراد"
                  value={validRows.length}
                  icon={
                    <CheckCircle2 size={24} />
                  }
                  color="emerald"
                />

                <StatCard
                  label="تحتاج مراجعة"
                  value={invalidRows.length}
                  icon={<XCircle size={24} />}
                  color="red"
                />

                <StatCard
                  label="نسبة الصحة"
                  value={`${
                    rows.length
                      ? Math.round(
                          (validRows.length /
                            rows.length) *
                            100
                        )
                      : 0
                  }%`}
                  icon={
                    <CheckCircle2 size={24} />
                  }
                  color="blue"
                />

              </div>

              {/* Preview */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">

                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      معاينة بيانات{" "}
                      {isStudentMode
                        ? "الطلاب"
                        : "المدرسين"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      لن يتم حفظ أي{" "}
                      {isStudentMode
                        ? "طالب"
                        : "مدرس"}{" "}
                      إلا بعد الضغط على زر استيراد البيانات.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={resetImport}
                      disabled={isImporting}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      مسح الملف
                    </button>

                    <button
                      type="button"
                      onClick={importData}
                      disabled={
                        isImporting ||
                        !selectedInstitute ||
                        !validRows.length
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          جاري الاستيراد...
                        </>
                      ) : (
                        <>
                          <Database size={18} />
                          استيراد البيانات
                        </>
                      )}
                    </button>

                  </div>
                </div>

                <div className="overflow-x-auto">

                  {isStudentMode ? (
                    <table className="min-w-[1400px] w-full text-sm">

                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">

                          {[
                            "الصف",
                            "كود الطالب",
                            "اسم الطالب",
                            "الرقم القومي",
                            "النوع",
                            "تاريخ الميلاد",
                            "الهاتف",
                            "العنوان",
                            "ولي الأمر",
                            "هاتف ولي الأمر",
                            "الحالة",
                          ].map((header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-right font-bold text-slate-700"
                            >
                              {header}
                            </th>
                          ))}

                        </tr>
                      </thead>

                      <tbody>
                        {studentRows.map((row) => {
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
                                {row.address || "—"}
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
                                    جاهز للاستيراد
                                  </div>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>

                    </table>
                  ) : (
                    <table className="min-w-[1100px] w-full text-sm">

                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">

                          {[
                            "الصف",
                            "كود المعلم",
                            "اسم المعلم",
                            "الهاتف",
                            "البريد الإلكتروني",
                            "التخصص",
                            "المؤهل",
                            "الحالة",
                          ].map((header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-right font-bold text-slate-700"
                            >
                              {header}
                            </th>
                          ))}

                        </tr>
                      </thead>

                      <tbody>
                        {teacherRows.map((row) => {
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

                              <td className="px-4 py-3 font-semibold text-blue-700">
                                {row.teacher_code || "—"}
                              </td>

                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {row.full_name || "—"}
                              </td>

                              <td className="px-4 py-3">
                                {row.phone || "—"}
                              </td>

                              <td className="px-4 py-3">
                                {row.email || "—"}
                              </td>

                              <td className="px-4 py-3">
                                {row.specialization || "—"}
                              </td>

                              <td className="px-4 py-3">
                                {row.qualification || "—"}
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
                                    {row.is_active
                                      ? "نشط - جاهز للاستيراد"
                                      : "غير نشط - جاهز للاستيراد"}
                                  </div>
                                )}

                              </td>

                            </tr>
                          );
                        })}
                      </tbody>

                    </table>
                  )}

                </div>
              </div>

              {/* Notice */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

                <div className="flex items-start gap-3">

                  <CheckCircle2
                    size={22}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <h3 className="font-bold text-emerald-800">
                      الاستيراد الفعلي مفعل
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-emerald-700">
                      بعد اختيار المعهد ورفع الملف، سيتم
                      فحص البيانات والتأكد من عدم التكرار.
                      الصفوف الصحيحة فقط سيتم إدخالها إلى
                      قاعدة البيانات.
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

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <>
      <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          {number}
        </span>

        {title}
      </div>

      <p className="text-sm leading-6 text-slate-600">
        {text}
      </p>
    </>
  );
}
