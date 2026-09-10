"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    // تسجيل الدخول
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("تعذر تسجيل الدخول");
      setLoading(false);
      return;
    }

    // الحصول على بيانات المستخدم وصلاحياته
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, institute_id, directorate_id, full_name")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "تم تسجيل الدخول ولكن لم يتم العثور على ملف المستخدم والصلاحيات"
      );

      setLoading(false);
      return;
    }

    // مدير الإدارة
    if (profile.role === "director") {
      router.push("/");
      router.refresh();
      return;
    }

    // شيخ المعهد
    if (profile.role === "sheikh") {
      if (!profile.institute_id) {
        await supabase.auth.signOut();

        setError("حساب شيخ المعهد غير مرتبط بمعهد");

        setLoading(false);
        return;
      }

      router.push(`/institutes/${profile.institute_id}`);
      router.refresh();
      return;
    }

    // أدوار أخرى سيتم تفعيلها لاحقًا
    await supabase.auth.signOut();

    setError("هذا الدور لم يتم تفعيل واجهته بعد");

    setLoading(false);
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md">

        <div className="bg-white rounded-3xl shadow-xl p-8">

          {/* Logo */}
          <div className="text-center mb-8">

            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-3xl font-bold">
              أز
            </div>

            <h1 className="text-2xl font-bold text-slate-800">
              نظام إدارة المعاهد الأزهرية
            </h1>

            <p className="text-slate-500 mt-2">
              الإدارة التعليمية الأزهرية
            </p>

          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                البريد الإلكتروني
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                كلمة المرور
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-3 transition"
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>

          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              نظام الإدارة والمتابعة المركزية للمعاهد الأزهرية
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}