import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(name, value, options);
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  console.log(
    "PROXY WORKING:",
    pathname,
    "USER:",
    user?.id
  );

  /*
   * ============================================================
   * المسارات العامة
   * ============================================================
   *
   * هذه الصفحات لا تعتمد على Supabase Auth:
   *
   * 1. login
   * 2. parent-login
   * 3. parent dashboard
   * 4. صفحات ولي الأمر الداخلية
   * 5. شكاوى أولياء الأمور
   *
   * ولي الأمر الحالي يعتمد على sessionStorage + RPC
   * وليس على Supabase Auth.
   */

  const isPublicPath =
    pathname === "/login" ||
    pathname === "/parent-login" ||
    pathname === "/parent" ||
    pathname.startsWith("/parent/") ||
    pathname === "/parent-complaints";

  if (isPublicPath) {
    return response;
  }

  /*
   * ============================================================
   * باقي النظام
   * ============================================================
   *
   * كل مستخدم آخر يجب أن يكون مسجل دخول
   * عن طريق Supabase Auth.
   */

  if (!user) {
    const loginUrl = new URL(
      "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
