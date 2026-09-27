"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { supabase } from "../../lib/supabase/client";

type UserRole =
  | "super_admin"
  | "director"
  | "deputy"
  | "it_admin"
  | "sheikh"
  | "institute_deputy"
  | "teacher"
  | "employee"
  | "student"
  | "parent";

type Profile = {
  role: UserRole;
  institute_id: string | null;
  directorate_id: string | null;
  full_name: string | null;
  is_active: boolean | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("من فضلك أدخل البريد الإلكتروني");
      return;
    }

    if (!password) {
      setError("من فضلك أدخل كلمة المرور");
      return;
    }

    setLoading(true);

    try {
      /*
       * تسجيل الدخول من خلال Supabase Auth
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        console.error("Login auth error:", authError);

        setError(
          authError.message === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "حدث خطأ أثناء تسجيل الدخول"
        );

        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("تعذر الحصول على بيانات المستخدم");
        setLoading(false);
        return;
      }

      /*
       * جلب ملف المستخدم والصلاحيات
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            role,
            institute_id,
            directorate_id,
            full_name,
            is_active
          `
        )
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Login profile error:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "تم تسجيل الدخول ولكن حدث خطأ أثناء قراءة صلاحيات المستخدم"
        );

        setLoading(false);
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();

        setError(
          "تم تسجيل الدخول ولكن لم يتم العثور على ملف المستخدم والصلاحيات"
        );

        setLoading(false);
        return;
      }

      /*
       * التحقق من أن الحساب نشط
       */
      if (profile.is_active === false) {
        await supabase.auth.signOut();

        setError(
          "هذا الحساب غير نشط. يرجى التواصل مع مدير الإدارة"
        );

        setLoading(false);
        return;
      }

      /*
       * تحويل البيانات إلى النوع الصحيح
       */
      const userProfile = profile as Profile;

      /*
       * ==========================================
       * توجيه المستخدم حسب الدور
       * ==========================================
       */
      switch (userProfile.role) {
        /*
         * مدير الإدارة التعليمية الأزهرية
         */
        case "super_admin":
          router.replace("/");
          return;

        /*
         * المدير القديم - للتوافق فقط
         */
        case "director":
          router.replace("/");
          return;

        /*
         * وكيل الإدارة التعليمية
         */
        case "deputy":
          router.replace("/");
          return;

        /*
         * ==========================================
         * مسؤول تكنولوجيا المعلومات للمعهد
         * ==========================================
         *
         * مسؤول IT مرتبط بمعهد محدد.
         */
        case "it_admin":
          if (!userProfile.institute_id) {
            await supabase.auth.signOut();

            setError(
              "لم يتم ربط مسؤول تكنولوجيا المعلومات بأي معهد. يرجى التواصل مع مدير الإدارة"
            );

            setLoading(false);
            return;
          }

          router.replace(
            `/institutes/${userProfile.institute_id}`
          );
          return;

        /*
         * شيخ المعهد
         */
        case "sheikh":
          if (!userProfile.institute_id) {
            await supabase.auth.signOut();

            setError(
              "لم يتم ربط حساب شيخ المعهد بأي معهد"
            );

            setLoading(false);
            return;
          }

          router.replace(
            `/institutes/${userProfile.institute_id}`
          );
          return;

        /*
         * وكيل شيخ المعهد
         */
        case "institute_deputy":
          if (!userProfile.institute_id) {
            await supabase.auth.signOut();

            setError(
              "لم يتم ربط حساب وكيل المعهد بأي معهد"
            );

            setLoading(false);
            return;
          }

          router.replace(
            `/institutes/${userProfile.institute_id}`
          );
          return;

        /*
         * الموظف
         */
        case "employee":
          if (!userProfile.institute_id) {
            await supabase.auth.signOut();

            setError(
              "لم يتم ربط حساب الموظف بأي معهد"
            );

            setLoading(false);
            return;
          }

          router.replace(
            `/institutes/${userProfile.institute_id}`
          );
          return;

        /*
         * المدرس
         */
        case "teacher":
          router.replace("/teachers");
          return;

        /*
         * ولي الأمر
         *
         * تسجيل ولي الأمر الأساسي يتم من خلال
         * /parent-login، لكن هذا المسار يبقى
         * متاحًا للحسابات الموجودة في Supabase Auth.
         */
        case "parent":
          router.replace("/parent");
          return;

        /*
         * الطالب
         */
        case "student":
          router.replace("/students");
          return;

        /*
         * أي دور غير معروف
         */
        default:
          await supabase.auth.signOut();

          setError(
            "هذا الدور لم يتم تفعيل واجهته بعد"
          );

          setLoading(false);
          return;
      }
    } catch (err) {
      console.error("Unexpected login error:", err);

      setError(
        "حدث خطأ غير متوقع أثناء تسجيل الدخول"
      );

      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50"
    >
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* ========================================
              Logo
          ========================================= */}
          <div className="mb-8 text-center">

            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-xl shadow-emerald-200">
              <ShieldCheck
                size={42}
                strokeWidth={1.8}
              />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              نظام إدارة المعاهد الأزهرية
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              الإدارة التعليمية الأزهرية
            </p>
          </div>

          {/* ========================================
              Login Card
          ========================================= */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">

            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-slate-900">
                تسجيل الدخول
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                أدخل بيانات الدخول للوصول إلى النظام
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* البريد الإلكتروني */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  البريد الإلكتروني
                </label>

                <div className="relative">

                  <Mail
                    size={19}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="example@email.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-11 pl-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"
                  />

                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  كلمة المرور
                </label>

                <div className="relative">

                  <LockKeyhole
                    size={19}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="أدخل كلمة المرور"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-11 pl-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                    }
                    className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>
              </div>

              {/* رسالة الخطأ */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium leading-6 text-red-700">
                  {error}
                </div>
              )}

              {/* زر تسجيل الدخول */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <LogIn size={19} />
                    تسجيل الدخول
                  </>
                )}
              </button>

            </form>

            {/* ========================================
                Parent Login
            ========================================= */}
            <div className="mt-6 border-t border-slate-100 pt-6">

              <button
                type="button"
                onClick={() =>
                  router.push("/parent-login")
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <UserRound size={18} />
                دخول ولي الأمر
              </button>

            </div>

          </div>

          {/* ========================================
              Footer
          ========================================= */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              نظام الإدارة والمتابعة المركزية للمعاهد الأزهرية
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
