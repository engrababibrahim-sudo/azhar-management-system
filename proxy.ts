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

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
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

  // =====================================================
  // المسارات العامة
  // =====================================================

  const isPublicPath =
    pathname === "/login" ||
    pathname === "/parent-login" ||
    pathname === "/parent" ||
    pathname.startsWith("/parent/");

  // =====================================================
  // السماح بمسارات ولي الأمر
  //
  // ولي الأمر لا يستخدم Supabase Auth،
  // وإنما يتم التحقق من هويته داخل صفحات ولي الأمر.
  // =====================================================

  if (isPublicPath) {
    return response;
  }

  // =====================================================
  // حماية باقي النظام
  // =====================================================

  if (!user) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // =====================================================
  // المستخدم مسجل الدخول
  // =====================================================

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
