"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  Search,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase/client";

type Institute = {
  id: string;
  name: string;
  code: string;
  institute_type: string | null;
  educational_stage: string | null;
  director_name: string | null;
  student_count: number | null;
  teacher_count: number | null;
  is_active: boolean | null;
};

export default function Home() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadInstitutes() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("institutes")
      .select(`
        id,
        name,
        code,
        institute_type,
        educational_stage,
        director_name,
        student_count,
        teacher_count,
        is_active
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
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

  const filteredInstitutes = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return institutes;

    return institutes.filter((institute) =>
      [
        institute.name,
        institute.code,
        institute.director_name,
        institute.institute_type,
        institute.educational_stage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [institutes, search]);

  const totalStudents = institutes.reduce(
    (sum, institute) => sum + (institute.student_count || 0),
    0
  );

  const totalTeachers = institutes.reduce(
    (sum, institute) => sum + (institute.teacher_count || 0),
    0
  );

  const activeInstitutes = institutes.filter(
    (institute) => institute.is_active !== false
  ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 text-slate-800"
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">

          <div>
            <h1 className="text-2xl font-bold">
              الإدارة التعليمية الأزهرية
            </h1>

            <p className="text-slate-500 mt-1">
              نظام الإدارة والمتابعة المركزية للمعاهد الأزهرية
            </p>
          </div>

          <button
            onClick={loadInstitutes}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={18} />
            تحديث
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold">
            لوحة الإدارة التعليمية
          </h2>

          <p className="text-slate-500 mt-2">
            متابعة شاملة لأداء المعاهد التابعة للإدارة
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

          <StatCard
            title="إجمالي المعاهد"
            value={institutes.length}
            icon={<Building2 size={25} />}
          />

          <StatCard
            title="إجمالي الطلاب"
            value={totalStudents.toLocaleString("ar-EG")}
            icon={<GraduationCap size={25} />}
          />

          <StatCard
            title="إجمالي المدرسين"
            value={totalTeachers.toLocaleString("ar-EG")}
            icon={<Users size={25} />}
          />

        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-600" />

              <div>
                <h3 className="font-bold">
                  حالة النظام
                </h3>

                <p className="text-sm text-slate-500">
                  تم الاتصال بقاعدة البيانات بنجاح
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
              {activeInstitutes} معهد نشط
            </span>

          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-5 text-red-700">

            <div className="flex items-center gap-3">
              <AlertCircle />

              <div>
                <p className="font-bold">
                  حدث خطأ أثناء تحميل المعاهد
                </p>

                <p className="text-sm mt-1">
                  {error}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Institutes */}
        <section className="bg-white rounded-2xl border border-slate-200">

          <div className="p-6 border-b border-slate-200">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold">
                  المعاهد التابعة للإدارة
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  بيانات المعاهد المسجلة في قاعدة البيانات
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-80">

                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن معهد..."
                  className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-300 outline-none focus:border-emerald-600"
                />

              </div>

            </div>

          </div>

          {/* Loading */}
          {loading && (
            <div className="p-12 text-center">

              <Loader2
                className="animate-spin mx-auto text-emerald-600"
                size={35}
              />

              <p className="mt-4 text-slate-500">
                جاري تحميل بيانات المعاهد...
              </p>

            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredInstitutes.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              لا توجد معاهد مطابقة للبحث
            </div>
          )}

          {/* Table */}
          {!loading && filteredInstitutes.length > 0 && (
            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right p-4 font-bold">
                      المعهد
                    </th>

                    <th className="text-right p-4 font-bold">
                      الكود
                    </th>

                    <th className="text-right p-4 font-bold">
                      شيخ المعهد
                    </th>

                    <th className="text-right p-4 font-bold">
                      الطلاب
                    </th>

                    <th className="text-right p-4 font-bold">
                      المدرسون
                    </th>

                    <th className="text-right p-4 font-bold">
                      الحالة
                    </th>

                    <th className="text-right p-4 font-bold">
                      التفاصيل
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredInstitutes.map((institute) => (

                    <tr
                      key={institute.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="p-4">
                        <div className="font-semibold">
                          {institute.name}
                        </div>

                        <div className="text-xs text-slate-400 mt-1">
                          {institute.educational_stage ||
                            institute.institute_type ||
                            "—"}
                        </div>
                      </td>

                      <td className="p-4 text-slate-500">
                        {institute.code}
                      </td>

                      <td className="p-4">
                        {institute.director_name || "غير محدد"}
                      </td>

                      <td className="p-4 font-semibold">
                        {(institute.student_count || 0).toLocaleString(
                          "ar-EG"
                        )}
                      </td>

                      <td className="p-4 font-semibold">
                        {(institute.teacher_count || 0).toLocaleString(
                          "ar-EG"
                        )}
                      </td>

                      <td className="p-4">

                        {institute.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={15} />
                            نشط
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700">
                            غير نشط
                          </span>
                        )}

                      </td>

                      <td className="p-4">

                        <Link
                          href={`/institutes/${institute.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                          فتح المعهد
                          <ArrowLeft size={16} />
                        </Link>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-3xl font-bold mt-2">
            {value}
          </p>
        </div>

        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          {icon}
        </div>

      </div>

    </div>
  );
}