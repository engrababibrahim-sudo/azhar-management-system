"use client";

import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        alert("حدث خطأ أثناء تسجيل الخروج");
        setLoading(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Unexpected logout error:", error);
      alert("حدث خطأ غير متوقع أثناء تسجيل الخروج");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <LogOut size={20} />
      )}

      <span className="text-sm font-semibold">
        {loading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
      </span>
    </button>
  );
}
