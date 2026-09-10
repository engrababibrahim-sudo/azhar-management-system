"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  UserRound,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code: string | null;
  institute_type: string | null;
  educational_stage: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean;
};

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadInstitutes() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("institutes")
      .select(
        `
        id,
        name,
        code,
        institute_type,
        educational_stage,
        director_name,
        student_count,
        teacher_count,
        is_active
        `
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setError(error.message);
      setInstitutes([]);
    } else {
      setInstitutes(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInstitutes();
  }, []);

  const filteredInstitutes = institutes.filter((institute) => {
    const search = searchTerm.toLowerCase();

    return (
      institute.name?.toLowerCase().includes(search) ||
      institute.code?.toLowerCase().includes(search) ||
      institute.director_name?.toLowerCase().includes(search)
    );
  });

  const totalStudents = institutes.reduce(
    (total, institute) => total + (institute.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (total, institute) => total + (institute.teacher_count || 0),
    0
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-800"
    >
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              إدارة المعاهد الأزهرية
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              الإدارة التعليمية الأزهرية
            </p>
          </div>

          <button
            onClick={loadInstitutes}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={17} />
            تحديث البيانات
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Summary */}
        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي المعاهد
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {institutes.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <Building2 size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي الطلاب
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalStudents.toLocaleString("ar-EG")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <GraduationCap size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي المدرسين
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalTeachers.toLocaleString("ar-EG")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <Users size={25} />
              </div>
            </div>
          </div>

        </div>

        {/* Search */}
        <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">

          <div className="relative">
            <Search
              size={20}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المعهد أو الكود أو شيخ المعهد..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-12 pl-4 outline-none focus:border-slate-400"
            />
          </div>

        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border bg-white p-12 text-center">
            <RefreshCw
              size={30}
              className="mx-auto animate-spin text-slate-400"
            />

            <p className="mt-4 text-slate-500">
              جاري تحميل بيانات المعاهد...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} />

              <div>
                <h2 className="font-bold">
                  حدث خطأ أثناء تحميل المعاهد
                </h2>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredInstitutes.length === 0 && (
            <div className="mt-8 rounded-2xl border bg-white p-12 text-center">
              <Building2
                size={45}
                className="mx-auto text-slate-300"
              />

              <h2 className="mt-4 text-lg font-bold">
                لا توجد معاهد
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                لم يتم العثور على معاهد مطابقة للبحث.
              </p>
            </div>
          )}

        {/* Institutes */}
        {!loading &&
          !error &&
          filteredInstitutes.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredInstitutes.map((institute) => (
                <div
                  key={institute.id}
                  className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  {/* Institute title */}
                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div className="rounded-xl bg-slate-100 p-3">
                        <Building2 size={22} />
                      </div>

                      <div>
                        <h2 className="font-bold">
                          {institute.name}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          الكود: {institute.code || "غير محدد"}
                        </p>
                      </div>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        institute.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {institute.is_active
                        ? "نشط"
                        : "غير نشط"}
                    </span>

                  </div>

                  {/* Institute info */}
                  <div className="mt-6 space-y-3">

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-500">
                        النوع
                      </span>

                      <span className="text-sm font-medium">
                        {institute.institute_type || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-500">
                        المرحلة
                      </span>

                      <span className="text-sm font-medium">
                        {institute.educational_stage || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-500">
                        شيخ المعهد
                      </span>

                      <span className="flex items-center gap-2 text-sm font-medium">
                        <UserRound size={16} />
                        {institute.director_name || "-"}
                      </span>
                    </div>

                  </div>

                  {/* Statistics */}
                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div className="rounded-xl border p-4 text-center">
                      <GraduationCap
                        size={20}
                        className="mx-auto"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        الطلاب
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {(institute.student_count || 0).toLocaleString(
                          "ar-EG"
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 text-center">
                      <Users
                        size={20}
                        className="mx-auto"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        المدرسون
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {(institute.teacher_count || 0).toLocaleString(
                          "ar-EG"
                        )}
                      </p>
                    </div>

                  </div>

                  {/* Open institute */}
                  <Link
                    href={`/institutes/${institute.id}`}
                    className="mt-5 block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    فتح لوحة المعهد
                  </Link>

                </div>
              ))}

            </div>
          )}

      </div>
    </main>
  );
}