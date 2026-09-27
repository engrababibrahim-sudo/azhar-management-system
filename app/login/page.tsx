"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type UserRole =
  | "super_admin"
  | "director"
  | "deputy"
  | "sheikh"
  | "institute_deputy"
  | "teacher"
  | "employee"
  | "parent";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [parentLoading, setParentLoading] =
    useState(false);

  const [error, setError] = useState("");

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      /*
       * ============================================
       * 1. تسجيل الدخول من Supabase Auth
       * ============================================
       */

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        setError(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        );

        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("تعذر تسجيل الدخول");

        setLoading(false);
        return;
      }

      /*
       * ============================================
       * 2. جلب ملف المستخدم وصلاحياته
       * ============================================
       */

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
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

      if (profileError || !profile) {
        await supabase.auth.signOut();

        setError(
          "تم تسجيل الدخول ولكن لم يتم العثور على ملف المستخدم والصلاحيات"
        );

        setLoading(false);
        return;
      }

      /*
       * ============================================
       * 3. التحقق من حالة الحساب
       * ============================================
       */

      if (profile.is_active === false) {
        await supabase.auth.signOut();

        setError(
          "هذا الحساب غير مفعل حاليًا. يرجى التواصل مع الإدارة."
        );

        setLoading(false);
        return;
      }

      const role =
        profile.role as UserRole;

      /*
       * ============================================
       * 4. مدير الإدارة التعليمية
       * ============================================
       */

      if (role === "super_admin") {
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

      /*
       * ============================================
       * 5. المدير القديم - للتوافق فقط
       * ============================================
       */

      if (role === "director") {
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

      /*
       * ============================================
       * 6. وكيل الإدارة التعليمية
       * ============================================
       */

      if (role === "deputy") {
        if (!profile.directorate_id) {
          await supabase.auth.signOut();

          setError(
            "حساب وكيل الإدارة غير مرتبط بإدارة تعليمية"
          );

          setLoading(false);
          return;
        }

        router.push("/");
        router.refresh();

        return;
      }

      /*
       * ============================================
       * 7. شيخ المعهد
       * ============================================
       */

      if (role === "sheikh") {
        if (!profile.institute_id) {
          await supabase.auth.signOut();

          setError(
            "حساب شيخ المعهد غير مرتبط بمعهد"
          );

          setLoading(false);
          return;
        }

        router.push(
          `/institutes/${profile.institute_id}`
        );

        router.refresh();

        return;
      }

      /*
       * ============================================
       * 8. وكيل شيخ المعهد
       * ============================================
       */

      if (role === "institute_deputy") {
        if (!profile.institute_id) {
          await supabase.auth.signOut();

          setError(
            "حساب وكيل شيخ المعهد غير مرتبط بمعهد"
          );

          setLoading(false);
          return;
        }

        router.push(
          `/institutes/${profile.institute_id}`
        );

        router.refresh();

        return;
      }

      /*
       * ============================================
       * 9. الموظف
       * ============================================
       */

      if (role === "employee") {
        if (!profile.institute_id) {
          await supabase.auth.signOut();

          setError(
            "حساب الموظف غير مرتبط بمعهد"
          );

          setLoading(false);
          return;
        }

        router.push(
          `/institutes/${profile.institute_id}`
        );

        router.refresh();

        return;
      }

      /*
       * ============================================
       * 10. المدرس
       * ============================================
       */

      if (role === "teacher") {
        if (!profile.institute_id) {
          await supabase.auth.signOut();

          setError(
            "حساب المدرس غير مرتبط بمعهد"
          );

          setLoading(false);
          return;
        }

        router.push("/teachers");
        router.refresh();

        return;
      }

      /*
       * ============================================
       * 11. ولي الأمر
       * ============================================
       */

      if (role === "parent") {
        router.push("/parent");
        router.refresh();

        return;
      }

      /*
       * ============================================
       * 12. أي دور غير مفعل
       * ============================================
       */

      await supabase.auth.signOut();

      setError(
        "هذا الدور لم يتم تفعيل واجهته بعد"
      );

      setLoading(false);
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      await supabase.auth.signOut();

      setError(
        "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى."
      );

      setLoading(false);
    }
  }

  /*
   * ============================================
   * دخول ولي الأمر
   * ============================================
   */

  function handleParentLogin() {
    if (parentLoading) return;

    setParentLoading(true);
    setError("");

    window.location.href =
      "/parent-login";
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">

          {/* الشعار والعنوان */}

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

          {/* نموذج تسجيل الدخول */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* البريد الإلكتروني */}

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

            {/* كلمة المرور */}

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

            {/* رسالة الخطأ */}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-center">
                {error}
              </div>
            )}

            {/* زر تسجيل الدخول */}

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

          {/* دخول ولي الأمر */}

          <div className="mt-4">

            <button
              type="button"
              onClick={
                handleParentLogin
              }
              disabled={
                parentLoading
              }
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold py-3 text-center hover:bg-emerald-100 disabled:opacity-60 transition cursor-pointer"
            >
              {parentLoading
                ? "جاري فتح صفحة ولي الأمر..."
                : "دخول ولي الأمر"}
            </button>

          </div>

          {/* التذييل */}

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
