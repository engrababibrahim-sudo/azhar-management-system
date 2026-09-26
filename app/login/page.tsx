"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "role, institute_id, directorate_id, full_name, is_active"
      )
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "تم تسجيل الدخول ولكن لم يتم العثور على ملف المستخدم والصلاحيات"
      );

      setLoading(false);
      return;
    }

    // الحساب غير مفعل
    if (profile.is_active === false) {
      await supabase.auth.signOut();

      setError(
        "هذا الحساب غير مفعل حاليًا. يرجى التواصل مع الإدارة."
      );

      setLoading(false);
      return;
    }

    // =====================================================
    // مدير الإدارة التعليمية الأزهرية
    // الدور الرسمي: super_admin
    // =====================================================
    if (profile.role === "super_admin") {
      if (!profile.directorate_id) {
        await supabase.auth.signOut();

        setError(
          "حساب مدير الإدارة غير مرتبط بإدارة تعليمية"
        );

        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
      return;
    }

    // =====================================================
    // التوافق مع الحسابات القديمة
    // =====================================================
    if (profile.role === "director") {
      if (!profile.directorate_id) {
        await supabase.auth.signOut();

        setError(
          "حساب مدير الإدارة غير مرتبط بإدارة تعليمية"
        );

        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
      return;
    }

    // =====================================================
    // شيخ المعهد
    // =====================================================
    if (profile.role === "sheikh") {
      if (!profile.institute_id) {
        await supabase.auth.signOut();

        setError("حساب شيخ المعهد غير مرتبط بمعهد");

        setLoading(false);
        return;
      }

      router.push(
        `/institutes/${profile.institute_id}`
      );

      router.refresh();
      return;
    }

    // =====================================================
    // ولي الأمر
    // =====================================================
    if (profile.role === "parent") {
      router.push("/parent");
      router.refresh();
      return;
    }

    // =====================================================
    // الأدوار الأخرى
    // =====================================================
    await supabase.auth.signOut();

    setError("هذا الدور لم يتم تفعيل واجهته بعد");

    setLoading(false);
  }

  // =====================================================
  // فتح صفحة دخول ولي الأمر
  // =====================================================
  function handleParentLogin() {
    if (parentLoading) return;

    setParentLoading(true);
    setError("");

    // استخدام انتقال المتصفح المباشر
    // حتى لا يتأثر الانتقال بمشكلة في Next Router
    window.location.href = "/parent-login";
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
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                البريد الإلكتروني
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="أدخل البريد الإلكتروني"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                كلمة المرور
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="أدخل كلمة المرور"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-center">
                {error}
              </div>
            )}

            {/* Main Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-3 transition"
            >
              {loading
                ? "جاري تسجيل الدخول..."
                : "تسجيل الدخول"}
            </button>
          </form>

          {/* =================================================
              Parent Login
          ================================================= */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleParentLogin}
              disabled={parentLoading}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold py-3 text-center hover:bg-emerald-100 disabled:opacity-60 transition cursor-pointer"
            >
              {parentLoading
                ? "جاري فتح صفحة ولي الأمر..."
                : "دخول ولي الأمر"}
            </button>
          </div>

          {/* Footer */}
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
