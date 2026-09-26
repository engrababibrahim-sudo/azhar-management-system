"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function ParentVerifyPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedEmail =
      sessionStorage.getItem("parent_login_email");

    if (!savedEmail) {
      router.replace("/parent-login");
      return;
    }

    setEmail(savedEmail);
  }, [router]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError(
        "انتهت جلسة التحقق. ارجع إلى صفحة دخول ولي الأمر."
      );

      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError("أدخل رمز التحقق المكون من 6 أرقام");
      setLoading(false);
      return;
    }

    const { data, error: verifyError } =
      await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });

    if (verifyError || !data.user) {
      console.error("OTP verification error:", verifyError);

      setError(
        "رمز التحقق غير صحيح أو انتهت صلاحيته."
      );

      setLoading(false);
      return;
    }

    // التأكد مرة أخرى من أن الحساب ولي أمر
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select(
          "id, full_name, role, is_active"
        )
        .eq("id", data.user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "parent" ||
      profile.is_active === false
    ) {
      await supabase.auth.signOut();

      setError(
        "تم تسجيل الدخول ولكن حساب ولي الأمر غير صالح."
      );

      setLoading(false);
      return;
    }

    sessionStorage.removeItem("parent_login_email");

    setSuccess("تم تسجيل الدخول بنجاح.");

    router.push("/parent");
    router.refresh();
  }

  async function resendCode() {
    if (!email) {
      router.replace("/parent-login");
      return;
    }

    setResending(true);
    setError("");
    setSuccess("");

    const { error } =
      await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

    if (error) {
      setError(
        "تعذر إعادة إرسال رمز الدخول. حاول مرة أخرى."
      );
    } else {
      setSuccess(
        "تم إرسال رمز دخول جديد إلى البريد الإلكتروني."
      );
    }

    setResending(false);
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md">

        <div className="bg-white rounded-3xl shadow-xl p-8">

          <div className="text-center mb-8">

            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-3xl font-bold">
              أز
            </div>

            <h1 className="text-2xl font-bold text-slate-800">
              رمز الدخول
            </h1>

            <p className="text-slate-500 mt-2">
              تحقق من بريد ولي الأمر
            </p>

          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-6 text-center">

            <p className="text-sm text-slate-600">
              تم إرسال رمز مكون من 6 أرقام إلى:
            </p>

            <p className="font-bold text-slate-800 mt-2 break-all">
              {email}
            </p>

          </div>

          <form
            onSubmit={handleVerify}
            className="space-y-5"
          >

            <div>

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                رمز التحقق
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="أدخل رمز التحقق"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-3 transition"
            >
              {loading
                ? "جاري التحقق..."
                : "تأكيد الدخول"}
            </button>

          </form>

          <button
            type="button"
            onClick={resendCode}
            disabled={resending}
            className="w-full mt-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-400 font-semibold py-3 transition"
          >
            {resending
              ? "جاري الإرسال..."
              : "إعادة إرسال الرمز"}
          </button>

          <div className="mt-6 text-center">

            <Link
              href="/parent-login"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              العودة إلى بيانات ولي الأمر
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
}
