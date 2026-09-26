"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Bell,
  Database,
} from "lucide-react";

import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Role =
  | "super_admin"
  | "director"
  | "deputy"
  | "sheikh"
  | "teacher"
  | "employee"
  | "student"
  | "parent";

type Directorate = {
  id: string;
  name: string;
  code: string | null;
  governorate: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
};

type FormData = {
  name: string;
  code: string;
  governorate: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
};

const roleLabels: Record<Role, string> = {
  super_admin: "مدير النظام",
  director: "مدير الإدارة",
  deputy: "وكيل الإدارة",
  sheikh: "شيخ المعهد",
  teacher: "مدرس",
  employee: "موظف",
  student: "طالب",
  parent: "ولي أمر",
};

export default function SettingsPage() {
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [profileName, setProfileName] = useState("المستخدم");

  const [directorate, setDirectorate] =
    useState<Directorate | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    code: "",
    governorate: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    is_active: true,
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canEdit =
    role === "director" || role === "super_admin";

  async function loadProfileAndSettings() {
    setProfileLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setErrorMessage("يجب تسجيل الدخول أولًا.");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, full_name, directorate_id")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        setErrorMessage("لم يتم العثور على بيانات المستخدم.");
        return;
      }

      const currentRole = profile.role as Role;

      setRole(currentRole);
      setProfileName(profile.full_name || "المستخدم");

      if (!profile.directorate_id) {
        setErrorMessage(
          "هذا المستخدم غير مرتبط بإدارة تعليمية."
        );
        return;
      }

      const { data, error } = await supabase
        .from("educational_directorates")
        .select(
          "id, name, code, governorate, city, address, phone, email, is_active"
        )
        .eq("id", profile.directorate_id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setErrorMessage(
          "لم يتم العثور على بيانات الإدارة التعليمية."
        );
        return;
      }

      const currentDirectorate = data as Directorate;

      setDirectorate(currentDirectorate);

      setForm({
        name: currentDirectorate.name || "",
        code: currentDirectorate.code || "",
        governorate:
          currentDirectorate.governorate || "",
        city: currentDirectorate.city || "",
        address: currentDirectorate.address || "",
        phone: currentDirectorate.phone || "",
        email: currentDirectorate.email || "",
        is_active:
          currentDirectorate.is_active ?? true,
      });
    } catch (error: any) {
      console.error(
        "Settings loading error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل إعدادات الإدارة."
      );
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    loadProfileAndSettings();
  }, []);

  function updateField(
    field: keyof FormData,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!directorate) {
      setErrorMessage(
        "لا توجد إدارة تعليمية للحفظ."
      );
      return;
    }

    if (!canEdit) {
      setErrorMessage(
        "ليس لديك صلاحية تعديل بيانات الإدارة التعليمية."
      );
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage(
        "اسم الإدارة التعليمية مطلوب."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("educational_directorates")
        .update({
          name: form.name.trim(),
          code: form.code.trim() || null,
          governorate:
            form.governorate.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", directorate.id);

      if (error) {
        throw error;
      }

      setDirectorate((previous) =>
        previous
          ? {
              ...previous,
              name: form.name.trim(),
              code: form.code.trim() || null,
              governorate:
                form.governorate.trim() || null,
              city: form.city.trim() || null,
              address:
                form.address.trim() || null,
              phone:
                form.phone.trim() || null,
              email:
                form.email.trim() || null,
              is_active: form.is_active,
            }
          : previous
      );

      setMessage(
        "تم حفظ بيانات الإدارة التعليمية بنجاح ✅"
      );
    } catch (error: any) {
      console.error(
        "Settings save error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "حدث خطأ أثناء حفظ بيانات الإدارة التعليمية."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setLoadingData(true);

    try {
      await loadProfileAndSettings();
    } finally {
      setLoadingData(false);
    }
  }

  return (
    <AppShell>
      <div
        className="min-h-screen bg-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <Building2 size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    الإعدادات
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    إدارة بيانات الإدارة التعليمية
                    وإعدادات المنصة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loadingData}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={18}
                  className={
                    loadingData
                      ? "animate-spin"
                      : ""
                  }
                />

                تحديث البيانات
              </button>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Current User */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  المستخدم الحالي
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  بيانات الحساب والصلاحية المستخدمة
                  في المنصة
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                {role
                  ? roleLabels[role]
                  : profileLoading
                    ? "جاري التحميل..."
                    : "غير معروف"}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-500">
                اسم المستخدم
              </div>

              <div className="mt-1 text-sm font-bold text-slate-900">
                {profileName}
              </div>
            </div>
          </div>

          {/* Success */}
          {message && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={20} />

              <span>{message}</span>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading */}
          {profileLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-slate-500"
              />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                جاري تحميل إعدادات الإدارة...
              </p>
            </div>
          ) : (
            <>
              {/* Directorate */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Building2 size={22} />
                    </div>

                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        بيانات الإدارة التعليمية
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        البيانات الأساسية للإدارة
                        المرتبطة بحسابك
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    {/* Name */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        اسم الإدارة التعليمية
                      </label>

                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          updateField(
                            "name",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="إدارة دمياط الجديدة التعليمية الأزهرية"
                      />
                    </div>

                    {/* Code */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        كود الإدارة
                      </label>

                      <input
                        type="text"
                        value={form.code}
                        onChange={(e) =>
                          updateField(
                            "code",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="AZ-DAM-NEW"
                      />
                    </div>

                    {/* Governorate */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        المحافظة
                      </label>

                      <input
                        type="text"
                        value={form.governorate}
                        onChange={(e) =>
                          updateField(
                            "governorate",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="دمياط"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        المدينة
                      </label>

                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) =>
                          updateField(
                            "city",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="دمياط الجديدة"
                      />
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        العنوان
                      </label>

                      <textarea
                        value={form.address}
                        onChange={(e) =>
                          updateField(
                            "address",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="عنوان الإدارة التعليمية"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        رقم الهاتف
                      </label>

                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          updateField(
                            "phone",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="0500000000"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        البريد الإلكتروني
                      </label>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          updateField(
                            "email",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>

                  {/* Active */}
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) =>
                          updateField(
                            "is_active",
                            e.target.checked
                          )
                        }
                        disabled={!canEdit}
                        className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:cursor-not-allowed"
                      />

                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          الإدارة التعليمية نشطة
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          حالة الإدارة التعليمية داخل
                          النظام.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Save */}
                  {canEdit ? (
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? (
                          <>
                            <RefreshCw
                              size={18}
                              className="animate-spin"
                            />

                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Save size={18} />

                            حفظ التعديلات
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                      <ShieldCheck size={20} />

                      <span>
                        حسابك لديه صلاحية عرض الإعدادات
                        فقط. التعديل متاح لمدير الإدارة
                        ومدير النظام.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Future Settings */}
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {/* Permissions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <ShieldCheck size={22} />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900">
                        الصلاحيات وإدارة المستخدمين
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        إدارة المستخدمين والأدوار
                        والصلاحيات.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                    سيتم تطوير هذه الوحدة في المرحلة
                    التالية.
                  </div>
                </div>

                {/* Notifications */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Bell size={22} />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900">
                        الإشعارات
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        إعدادات التنبيهات والإشعارات داخل
                        المنصة.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                    سيتم تطوير هذه الوحدة في المرحلة
                    التالية.
                  </div>
                </div>

                {/* System */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Database size={22} />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900">
                        إعدادات النظام والبيانات
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        إعدادات الاستيراد والتقارير وسجل
                        العمليات وإدارة النظام.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                    سيتم تطوير هذه الوحدة ضمن مراحل
                    النظام القادمة.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
