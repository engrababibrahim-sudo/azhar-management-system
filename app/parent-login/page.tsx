"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function ParentLoginPage() {
  const router = useRouter();

  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleParentLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const cleanNationalId = nationalId.replace(/\D/g, "").trim();
    const cleanEmail = email.trim().toLowerCase();

    // التحقق من الرقم القومي
    if (!/^\d{14}$/.test(cleanNationalId)) {
      setError("من فضلك أدخل الرقم القومي المكون من 14 رقمًا");
      setLoading(false);
      return;
    }

    // التحقق من البريد
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("من فضلك أدخل بريدًا إلكترونيًا صحيحًا لولي الأمر");
      setLoading(false);
      return;
    }

    try {
      // =====================================================
      // التحقق من ولي الأمر
      // =====================================================
      const { data, error: verifyError } = await supabase.rpc(
        "verify_parent_identity",
        {
          p_national_id: cleanNationalId,
          p_email: cleanEmail,
        }
      );

      if (verifyError) {
        console.error("verify_parent_identity error:", verifyError);

        setError(
          "تعذر التحقق من البيانات حاليًا. تأكد من الاتصال بالنظام وحاول مرة أخرى."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // البيانات غير صحيحة
      // =====================================================
      if (data !== true) {
        setError(
          "الرقم القومي أو البريد الإلكتروني غير مرتبط بولي أمر مسجل بالنظام."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // حفظ بيانات جلسة ولي الأمر
      // =====================================================
      sessionStorage.setItem("parent_national_id", cleanNationalId);
      sessionStorage.setItem("parent_email", cleanEmail);
      sessionStorage.setItem("parent_login", "true");

      // =====================================================
      // الانتقال إلى لوحة ولي الأمر
      // =====================================================
      router.replace("/parent");
      router.refresh();
    } catch (err) {
      console.error("Parent login unexpected error:", err);

      setError("حدث خطأ غير متوقع أثناء تسجيل الدخول.");

      setLoading(false);
    }
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
              دخول ولي الأمر
            </h1>

            <p className="text-slate-500 mt-2">
              نظام إدارة المعاهد الأزهرية
            </p>
          </div>

          {/* Information */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 mb-6">
            <p className="text-sm text-emerald-800 leading-7">
              أدخل الرقم القومي لأحد أبنائك المسجلين بالنظام
              والبريد الإلكتروني لولي الأمر للدخول مباشرة
              إلى لوحة ولي الأمر.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleParentLogin}
            className="space-y-5"
          >

            {/* National ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                الرقم القومي للطالب
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                value={nationalId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setNationalId(value);
                  setError("");
                }}
                placeholder="أدخل الرقم القومي المكون من 14 رقمًا"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Parent Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                البريد الإلكتروني لولي الأمر
              </label>

              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="أدخل البريد الإلكتروني"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-center leading-6">
                {error}
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-3 transition"
            >
              {loading ? "جاري التحقق..." : "دخول ولي الأمر"}
            </button>
          </form>

          {/* Back */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              العودة إلى تسجيل الدخول الرئيسي
            </Link>
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
