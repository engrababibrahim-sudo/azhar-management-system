"use client";

import { LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      alert("حدث خطأ أثناء تسجيل الخروج");
      setLoading(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition disabled:opacity-50"
    >
      <LogOut size={20} />

      <span>
        {loading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
      </span>
    </button>
  );
}