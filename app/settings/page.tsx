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
  Settings as SettingsIcon,
  MapPin,
  Phone,
  Mail,
  UserCog,
} from "lucide-react";

import AppShell from "../components/AppShell";
import { supabase } from "../../lib/supabase/client";

type Profile = {
  role: string;
  full_name: string | null;
  directorate_id: string | null;
};

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

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [directorate, setDirectorate] = useState<Directorate | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    governorate: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    is_active: true,
  });

  const canEdit =
    profile?.role === "director" ||
    profile?.role === "super_admin";

  // =========================
  // تحميل البيانات
  // =========================
  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("لم يتم العثور على المستخدم الحالي.");
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, full_name, directorate_id")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      if (!profileData.directorate_id) {
        setDirectorate(null);
        return;
      }

      const { data: directorateData, error: directorateError } =
        await supabase
          .from("educational_directorates")
          .select(
            "id, name, code, governorate, city, address, phone, email, is_active"
          )
          .eq("id", profileData.directorate_id)
          .single();

      if (directorateError) {
        throw directorateError;
      }

      setDirectorate(directorateData);

      setForm({
        name: directorateData.name || "",
        code: directorateData.code || "",
        governorate: directorateData.governorate || "",
        city: directorateData.city || "",
        address: directorateData.address || "",
        phone: directorateData.phone || "",
        email: directorateData.email || "",
        is_active: directorateData.is_active ?? true,
      });
    } catch (err: any) {
      console.error("Settings load error:", err);

      setError(
        err?.message ||
          "حدث خطأ أثناء تحميل إعدادات الإدارة التعليمية."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  // =========================
  // تغيير الحقول
  // =========================
  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // =========================
  // حفظ البيانات
  // =========================
  async function handleSave() {
    if (!directorate) {
      setError("لا توجد إدارة تعليمية مرتبطة بهذا الحساب.");
      return;
    }

    if (!canEdit) {
      setError(
        "ليس لديك صلاحية تعديل إعدادات الإدارة التعليمية."
      );
      return;
    }

    if (!form.name.trim()) {
      setError("اسم الإدارة التعليمية مطلوب.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { data, error: updateError } = await supabase
        .from("educational_directorates")
        .update({
          name: form.name.trim(),
          code: form.code.trim() || null,
          governorate: form.governorate.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", directorate.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setDirectorate(data);

      setForm({
        name: data.name || "",
        code: data.code || "",
        governorate: data.governorate || "",
        city: data.city || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        is_active: data.is_active ?? true,
      });

      setMessage("تم حفظ إعدادات الإدارة التعليمية بنجاح ✅");
    } catch (err: any) {
      console.error("Settings save error:", err);

      setError(
        err?.message ||
          "حدث خطأ أثناء حفظ إعدادات الإدارة التعليمية."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // إعادة تحميل
  // =========================
  async function handleRefresh() {
    await loadSettings();
  }

  // =========================
  // Loading
  // =========================
  if (loading) {
    return (
      <AppShell>
        <div
          dir="rtl"
          className="min-h-[70vh] flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />

            <p className="text-gray-600">
              جاري تحميل إعدادات النظام...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="min-h-screen bg-gray-50 p-4 md:p-6"
      >
        <div className="max-w-7xl mx-auto space-y-6">

          {/* =========================
              Header
          ========================= */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <SettingsIcon className="w-7 h-7 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    إعدادات النظام
                  </h1>

                  <p className="text-gray-500 mt-1">
                    إدارة بيانات الإدارة التعليمية وإعدادات المنصة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />

                تحديث
              </button>
            </div>
          </div>

          {/* =========================
              Messages
          ========================= */}
          {message && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 shrink-0" />

              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

              <div>
                <div className="font-semibold">
                  حدث خطأ
                </div>

                <div className="text-sm mt-1">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* =========================
              User information
          ========================= */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-purple-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  الحساب الحالي
                </h2>

                <p className="text-sm text-gray-500">
                  معلومات الحساب والصلاحيات
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">
                  الاسم
                </div>

                <div className="font-semibold text-gray-900">
                  {profile?.full_name || "غير محدد"}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">
                  نوع الحساب
                </div>

                <div className="font-semibold text-gray-900">
                  {profile?.role === "director"
                    ? "مدير الإدارة التعليمية"
                    : profile?.role === "super_admin"
                    ? "مدير النظام"
                    : profile?.role || "غير محدد"}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">
                  صلاحية التعديل
                </div>

                <div
                  className={`font-semibold ${
                    canEdit
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {canEdit
                    ? "مسموح بالتعديل"
                    : "عرض فقط"}
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              Directorate settings
          ========================= */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    بيانات الإدارة التعليمية
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    البيانات الأساسية للإدارة التعليمية الأزهرية
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">

              {!directorate ? (
                <div className="text-center py-10 text-gray-500">
                  لا توجد إدارة تعليمية مرتبطة بهذا الحساب.
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        اسم الإدارة التعليمية *
                      </label>

                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          updateField("name", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="مثال: إدارة دمياط الجديدة التعليمية الأزهرية"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        كود الإدارة
                      </label>

                      <input
                        type="text"
                        value={form.code}
                        onChange={(e) =>
                          updateField("code", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="AZ-DAM-NEW"
                      />
                    </div>

                  </div>

                  {/* Row 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="دمياط"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        المدينة
                      </label>

                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) =>
                          updateField("city", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="دمياط الجديدة"
                      />
                    </div>

                  </div>

                  {/* Address */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      العنوان
                    </label>

                    <textarea
                      value={form.address}
                      onChange={(e) =>
                        updateField("address", e.target.value)
                      }
                      disabled={!canEdit}
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
                      placeholder="العنوان التفصيلي للإدارة التعليمية"
                    />
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        رقم الهاتف
                      </label>

                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) =>
                          updateField("phone", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="01000000000"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        البريد الإلكتروني
                      </label>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          updateField("email", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="example@azhar.eg"
                      />
                    </div>

                  </div>

                  {/* Status */}
                  <div className="border-t border-gray-200 pt-5">

                    <label className="flex items-center gap-3 cursor-pointer">

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
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      <div>
                        <div className="font-semibold text-gray-800">
                          الإدارة التعليمية نشطة
                        </div>

                        <div className="text-sm text-gray-500">
                          عند إلغاء التفعيل يتم اعتبار الإدارة غير نشطة
                        </div>
                      </div>

                    </label>
                  </div>

                  {/* Save */}
                  {canEdit && (
                    <div className="flex justify-end pt-2">

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >

                        {saving ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            حفظ الإعدادات
                          </>
                        )}

                      </button>

                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

          {/* =========================
              Permissions
          ========================= */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

            <div className="flex items-center gap-3 mb-5">

              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  الصلاحيات وإدارة المستخدمين
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  إدارة أدوار المستخدمين وصلاحيات الوصول للنظام
                </p>
              </div>

            </div>

            <div className="bg-gray-50 rounded-xl p-5">

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900">
                    مدير الإدارة
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    صلاحيات إدارية كاملة
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900">
                    شيخ المعهد
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    إدارة المعهد التابع له
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900">
                    المدرس
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    الخدمات التعليمية المسموح بها
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900">
                    ولي الأمر
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    متابعة الأبناء والخدمات المتاحة
                  </div>
                </div>

              </div>

              <div className="mt-4 text-sm text-gray-500">
                سيتم تطوير شاشة مستقلة لإدارة المستخدمين والصلاحيات بالتفصيل في المرحلة التالية.
              </div>

            </div>

          </div>

          {/* =========================
              Notifications
          ========================= */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

            <div className="flex items-center gap-3 mb-5">

              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  الإشعارات
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  إعدادات الإشعارات والتنبيهات
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="border border-gray-200 rounded-xl p-4">
                <div className="font-semibold text-gray-800">
                  الإعلانات
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  استقبال ومتابعة إعلانات الإدارة
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <div className="font-semibold text-gray-800">
                  الطلبات
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  تنبيهات طلبات المعاهد
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <div className="font-semibold text-gray-800">
                  الشكاوى
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  تنبيهات الشكاوى والبلاغات
                </div>
              </div>

            </div>

          </div>

          {/* =========================
              Database
          ========================= */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

            <div className="flex items-center gap-3 mb-5">

              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  حالة النظام وقاعدة البيانات
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  معلومات تشغيل النظام
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />

                  <span className="font-semibold text-green-800">
                    قاعدة البيانات
                  </span>
                </div>

                <div className="text-sm text-green-700 mt-2">
                  متصلة وتعمل
                </div>

              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />

                  <span className="font-semibold text-green-800">
                    نظام الدخول
                  </span>
                </div>

                <div className="text-sm text-green-700 mt-2">
                  يعمل
                </div>

              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />

                  <span className="font-semibold text-green-800">
                    حماية الصفحات
                  </span>
                </div>

                <div className="text-sm text-green-700 mt-2">
                  مفعلة
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}
