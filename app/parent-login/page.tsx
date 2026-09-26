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
  const [success, setSuccess] = useState("");

  async function handleParentLogin(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const cleanNationalId = nationalId.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^\d{14}$/.test(cleanNationalId)) {
      setError("من فضلك أدخل الرقم القومي المكون من 14 رقمًا");
      setLoading(false);
      return;
    }

    if (!cleanEmail) {
      setError("من فضلك أدخل البريد الإلكتروني لولي الأمر");
      setLoading(false);
      return;
    }

    try {
      // التحقق من أن الرقم القومي للطالب مرتبط بالفعل
      // بحساب ولي الأمر صاحب البريد الإلكتروني
      const { data: verified, error: verifyError } =
        await supabase.rpc("verify_parent_identity", {
          p_national_id: cleanNationalId,
          p_email: cleanEmail,
        });

      if (verifyError) {
        console.error("Parent verification error:", verifyError);

        setError(
          "حدث خطأ أثناء التحقق من البيانات. حاول مرة أخرى."
        );

        setLoading(false);
        return;
      }

      if (!verified) {
        setError(
          "الرقم القومي أو البريد الإلكتروني غير مرتبط بحساب ولي أمر."
        );

        setLoading(false);
        return;
      }

      // إرسال رمز دخول OTP إلى بريد ولي الأمر
      const { error: otpError } =
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: false,
          },
        });

      if (otpError) {
        console.error("OTP error:", otpError);

        setError(
          "تعذر إرسال رمز الدخول. تأكد من البريد الإلكتروني وحاول مرة أخرى."
        );

        setLoading(false);
        return;
      }

      // حفظ البريد مؤقتًا للصفحة التالية
      sessionStorage.setItem(
        "parent_login_email",
        cleanEmail
      );

      setSuccess(
        "تم التحقق من البيانات وإرسال رمز الدخول إلى بريد ولي الأمر."
      );

      setTimeout(() => {
        router.push("/parent-login/verify");
      }, 1000);
    } catch (error) {
      console.error(error);

      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
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

          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 mb-6">

            <p className="text-sm text-emerald-800 leading-7">
              أدخل الرقم القومي لأحد أبنائك المسجلين بالمعهد،
              بالإضافة إلى البريد الإلكتروني المسجل لولي الأمر.
            </p>

          </div>

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
                maxLength={14}
                value={nationalId}
                onChange={(e) =>
                  setNationalId(
                    e.target.value.replace(/\D/g, "")
                  )
                }
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
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="أدخل البريد الإلكتروني"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-center leading-6">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm text-center leading-6">
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
                : "التحقق والدخول"}
            </button>

          </form>

          <div className="mt-6 text-center">

            <Link
              href="/login"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              العودة إلى تسجيل الدخول الرئيسي
            </Link>

          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">

            <p className="text-xs text-slate-400">
              دخول آمن لأولياء الأمور
            </p>

          </div>

        </div>

      </div>
    </main>
  );
}
