"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  id: string;
  role: string;
  institute_id: string | null;
  is_active: boolean;
};

type Student = {
  id: string;
  student_code: string;
  full_name: string;
  institute_id: string;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
};

type Stage = {
  id: string;
  name: string;
  code: string | null;
};

type Grade = {
  id: string;
  stage_id: string;
  name: string;
  code: string | null;
  sort_order: number;
};

type ClassItem = {
  id: string;
  institute_id: string;
  name: string;
  academic_year: string | null;
  grade_level: string | null;
  section: string | null;
  grade_id: string | null;
  is_active: boolean;
};

type StudentClassInfo = {
  classItem: ClassItem | null;
  grade: Grade | null;
  stage: Stage | null;
};

export default function StudentTransfersPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    null
  );

  const [selectedStudentInfo, setSelectedStudentInfo] =
    useState<StudentClassInfo>({
      classItem: null,
      grade: null,
      stage: null,
    });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const [toInstituteId, setToInstituteId] = useState("");
  const [toStageId, setToStageId] = useState("");
  const [toGradeId, setToGradeId] = useState("");
  const [toClassId, setToClassId] = useState("");

  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("يجب تسجيل الدخول أولًا");
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, institute_id, is_active")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error("تعذر تحميل بيانات المستخدم");
      }

      if (
        !["sheikh", "deputy", "employee"].includes(profileData.role) ||
        !profileData.is_active ||
        !profileData.institute_id
      ) {
        throw new Error("ليس لديك صلاحية تنفيذ نقل الطلاب");
      }

      setProfile(profileData as Profile);

      const [institutesResult, stagesResult, gradesResult] =
        await Promise.all([
          supabase
            .from("institutes")
            .select("id, name, code")
            .order("name"),

          supabase
            .from("educational_stages")
            .select("id, name, code")
            .eq("is_active", true)
            .order("name"),

          supabase
            .from("grades")
            .select("id, stage_id, name, code, sort_order")
            .eq("is_active", true)
            .order("sort_order"),
        ]);

      if (institutesResult.error) {
        throw new Error("تعذر تحميل المعاهد");
      }

      if (stagesResult.error) {
        throw new Error("تعذر تحميل المراحل التعليمية");
      }

      if (gradesResult.error) {
        throw new Error("تعذر تحميل الصفوف");
      }

      setInstitutes((institutesResult.data || []) as Institute[]);
      setStages((stagesResult.data || []) as Stage[]);
      setGrades((gradesResult.data || []) as Grade[]);

      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function loadClasses(instituteId = "", gradeId = "") {
    let query = supabase
      .from("classes")
      .select(
        "id, institute_id, name, academic_year, grade_level, section, grade_id, is_active"
      )
      .eq("is_active", true)
      .order("name");

    if (instituteId) {
      query = query.eq("institute_id", instituteId);
    }

    if (gradeId) {
      query = query.eq("grade_id", gradeId);
    }

    const { data, error: classesError } = await query;

    if (classesError) {
      throw new Error("تعذر تحميل الفصول الدراسية");
    }

    setClasses((data || []) as ClassItem[]);
  }

  async function searchStudents() {
    const term = searchTerm.trim();

    if (!term) {
      setStudents([]);
      return;
    }

    setSearchLoading(true);
    setError("");
    setMessage("");

    try {
      if (!profile?.institute_id) {
        throw new Error("لم يتم تحديد المعهد الحالي");
      }

      const { data, error: studentsError } = await supabase
        .from("students")
        .select(
          "id, student_code, full_name, institute_id, class_id, guardian_name, guardian_phone, gender, date_of_birth"
        )
        .eq("institute_id", profile.institute_id)
        .or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`)
        .order("full_name")
        .limit(20);

      if (studentsError) {
        throw new Error("تعذر البحث عن الطلاب");
      }

      setStudents((data || []) as Student[]);

      if (!data || data.length === 0) {
        setMessage("لم يتم العثور على طالب بهذا الاسم أو الكود");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء البحث");
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectStudent(student: Student) {
    setSelectedStudent(student);
    setStudents([]);

    setSearchTerm(student.full_name);

    setError("");
    setMessage("");

    setToInstituteId("");
    setToStageId("");
    setToGradeId("");
    setToClassId("");
    setClasses([]);

    try {
      let classItem: ClassItem | null = null;
      let grade: Grade | null = null;
      let stage: Stage | null = null;

      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select(
            "id, institute_id, name, academic_year, grade_level, section, grade_id, is_active"
          )
          .eq("id", student.class_id)
          .maybeSingle();

        classItem = (classData as ClassItem | null) || null;

        if (classItem?.grade_id) {
          grade =
            grades.find((item) => item.id === classItem?.grade_id) || null;

          if (grade) {
            stage =
              stages.find((item) => item.id === grade?.stage_id) || null;
          }
        }
      }

      setSelectedStudentInfo({
        classItem,
        grade,
        stage,
      });
    } catch {
      setSelectedStudentInfo({
        classItem: null,
        grade: null,
        stage: null,
      });
    }
  }

  async function handleInstituteChange(value: string) {
    setToInstituteId(value);
    setToStageId("");
    setToGradeId("");
    setToClassId("");
    setClasses([]);
    setError("");

    if (!value) return;

    try {
      await loadClasses(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الفصول");
    }
  }

  async function handleGradeChange(value: string) {
    setToGradeId(value);
    setToClassId("");
    setError("");

    if (!toInstituteId || !value) {
      setClasses([]);
      return;
    }

    try {
      await loadClasses(toInstituteId, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الفصول");
    }
  }

  function resetTransferForm() {
    setSelectedStudent(null);

    setSelectedStudentInfo({
      classItem: null,
      grade: null,
      stage: null,
    });

    setSearchTerm("");
    setStudents([]);

    setToInstituteId("");
    setToStageId("");
    setToGradeId("");
    setToClassId("");

    setTransferDate(new Date().toISOString().slice(0, 10));
    setReason("");

    setClasses([]);
  }

  async function executeTransfer() {
    if (!selectedStudent) {
      setError("اختاري الطالب أولًا");
      return;
    }

    if (!toInstituteId || !toClassId) {
      setError("اختاري المعهد الجديد والفصل الجديد");
      return;
    }

    if (!transferDate) {
      setError("اختاري تاريخ النقل");
      return;
    }

    if (selectedStudent.institute_id === toInstituteId) {
      setError("المعهد الجديد يجب أن يكون مختلفًا عن المعهد الحالي");
      return;
    }

    const destinationClass = classes.find(
      (item) => item.id === toClassId
    );

    if (
      !destinationClass ||
      destinationClass.institute_id !== toInstituteId ||
      destinationClass.grade_id !== toGradeId ||
      !destinationClass.is_active
    ) {
      setError("الفصل المختار غير صالح");
      return;
    }

    const confirmed = window.confirm(
      `هل أنتِ متأكدة من نقل الطالب «${selectedStudent.full_name}» إلى المعهد الجديد؟`
    );

    if (!confirmed) return;

    setTransferring(true);
    setError("");
    setMessage("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "transfer_student",
        {
          p_student_id: selectedStudent.id,
          p_to_institute_id: toInstituteId,
          p_to_class_id: toClassId,
          p_transfer_date: transferDate,
          p_reason: reason.trim() || null,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error("لم يتم تنفيذ عملية النقل");
      }

      resetTransferForm();

      setMessage("تم نقل الطالب بنجاح وحفظ سجل النقل.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر تنفيذ عملية النقل"
      );
    } finally {
      setTransferring(false);
    }
  }

  const destinationGrades = useMemo(() => {
    return grades
      .filter((grade) => grade.stage_id === toStageId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [grades, toStageId]);

  const currentInstitute = selectedStudent
    ? institutes.find(
        (item) => item.id === selectedStudent.institute_id
      )
    : null;

  const destinationInstitute = toInstituteId
    ? institutes.find((item) => item.id === toInstituteId)
    : null;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-sm">
            <Loader2
              className="animate-spin text-blue-600"
              size={22}
            />
            <span className="font-semibold">
              جاري تحميل صفحة نقل الطلاب...
            </span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl p-4 md:p-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h1 className="text-xl font-bold">نقل الطلاب</h1>

            <p className="mt-2">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-l from-slate-900 to-blue-900 p-6 text-white shadow-lg md:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <ArrowLeftRight size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                نقل طالب
              </h1>

              <p className="mt-2 text-sm leading-6 text-blue-100 md:text-base">
                نقل الطالب من معهدك الحالي إلى معهد آخر مع
                الاحتفاظ ببياناته وتسجيل تاريخ عملية النقل.
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 size={22} />

            <span className="font-semibold">{message}</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Search */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              1. البحث عن الطالب
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              البحث يتم داخل معهدك الحالي فقط.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    searchStudents();
                  }
                }}
                placeholder="اكتبي اسم الطالب أو كود الطالب"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pr-12 pl-4 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={searchStudents}
              disabled={searchLoading || !searchTerm.trim()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searchLoading ? (
                <Loader2
                  size={20}
                  className="animate-spin"
                />
              ) : (
                <Search size={20} />
              )}

              بحث
            </button>
          </div>

          {students.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => selectStudent(student)}
                  className="flex w-full items-center gap-4 border-b border-slate-100 p-4 text-right transition last:border-b-0 hover:bg-blue-50"
                >
                  <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                    <UserRound size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">
                      {student.full_name}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      الكود: {student.student_code}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Student information */}
        {selectedStudent && (
          <>
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-7">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  2. بيانات الطالب الحالية
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="اسم الطالب"
                  value={selectedStudent.full_name}
                />

                <Info
                  label="كود الطالب"
                  value={selectedStudent.student_code}
                />

                <Info
                  label="المعهد الحالي"
                  value={currentInstitute?.name || "غير محدد"}
                />

                <Info
                  label="المرحلة"
                  value={
                    selectedStudentInfo.stage?.name ||
                    "غير محددة"
                  }
                />

                <Info
                  label="الصف"
                  value={
                    selectedStudentInfo.grade?.name ||
                    "غير محدد"
                  }
                />

                <Info
                  label="الفصل"
                  value={
                    selectedStudentInfo.classItem?.name ||
                    "غير محدد"
                  }
                />

                <Info
                  label="ولي الأمر"
                  value={
                    selectedStudent.guardian_name ||
                    "غير مسجل"
                  }
                />

                <Info
                  label="هاتف ولي الأمر"
                  value={
                    selectedStudent.guardian_phone ||
                    "غير مسجل"
                  }
                />
              </div>
            </section>

            {/* Destination */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-7">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  3. بيانات المعهد الجديد
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  سيتم عرض الفصول التابعة للمعهد والصف
                  المختارين فقط.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Institute */}
                <Field label="المعهد الجديد">
                  <select
                    value={toInstituteId}
                    onChange={(event) =>
                      handleInstituteChange(
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      اختاري المعهد الجديد
                    </option>

                    {institutes
                      .filter(
                        (institute) =>
                          institute.id !==
                          selectedStudent.institute_id
                      )
                      .map((institute) => (
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
                </Field>

                {/* Stage */}
                <Field label="المرحلة التعليمية">
                  <select
                    value={toStageId}
                    onChange={(event) => {
                      setToStageId(event.target.value);
                      setToGradeId("");
                      setToClassId("");
                      setClasses([]);
                      setError("");
                    }}
                    disabled={!toInstituteId}
                    className="input disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      اختاري المرحلة
                    </option>

                    {stages.map((stage) => (
                      <option
                        key={stage.id}
                        value={stage.id}
                      >
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Grade */}
                <Field label="الصف">
                  <select
                    value={toGradeId}
                    onChange={(event) =>
                      handleGradeChange(
                        event.target.value
                      )
                    }
                    disabled={!toStageId}
                    className="input disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      اختاري الصف
                    </option>

                    {destinationGrades.map((grade) => (
                      <option
                        key={grade.id}
                        value={grade.id}
                      >
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Class */}
                <Field label="الفصل الجديد">
                  <select
                    value={toClassId}
                    onChange={(event) =>
                      setToClassId(event.target.value)
                    }
                    disabled={!toGradeId}
                    className="input disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      اختاري الفصل
                    </option>

                    {classes
                      .filter(
                        (classItem) =>
                          classItem.institute_id ===
                            toInstituteId &&
                          classItem.grade_id ===
                            toGradeId
                      )
                      .map((classItem) => (
                        <option
                          key={classItem.id}
                          value={classItem.id}
                        >
                          {classItem.name}
                          {classItem.section
                            ? ` — شعبة ${classItem.section}`
                            : ""}
                          {classItem.academic_year
                            ? ` — ${classItem.academic_year}`
                            : ""}
                        </option>
                      ))}
                  </select>
                </Field>

                {/* Date */}
                <Field label="تاريخ النقل">
                  <div className="relative">
                    <CalendarDays
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      value={transferDate}
                      onChange={(event) =>
                        setTransferDate(
                          event.target.value
                        )
                      }
                      className="input pr-11"
                    />
                  </div>
                </Field>

                {/* Reason */}
                <Field label="سبب النقل (اختياري)">
                  <input
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="مثال: انتقال محل الإقامة"
                    className="input"
                  />
                </Field>
              </div>

              {destinationInstitute && (
                <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                  <span className="font-bold">
                    المعهد الجديد:
                  </span>{" "}
                  {destinationInstitute.name}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                <button
                  type="button"
                  onClick={executeTransfer}
                  disabled={
                    transferring ||
                    !toInstituteId ||
                    !toGradeId ||
                    !toClassId ||
                    !transferDate
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transferring ? (
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                  ) : (
                    <ArrowLeftRight size={20} />
                  )}

                  {transferring
                    ? "جاري تنفيذ النقل..."
                    : "تنفيذ نقل الطالب"}
                </button>

                <button
                  type="button"
                  onClick={resetTransferForm}
                  disabled={transferring}
                  className="rounded-2xl border border-slate-300 px-6 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(203 213 225);
          background: rgb(248 250 252);
          padding: 0.875rem 1rem;
          outline: none;
          transition: 150ms;
        }

        .input:focus {
          border-color: rgb(59 130 246);
          background: white;
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
        }
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-words font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}
