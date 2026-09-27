import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type CreateUserBody = {
  full_name: string;
  phone?: string;
  email: string;
  password: string;
  role:
    | "super_admin"
    | "deputy"
    | "sheikh"
    | "institute_deputy"
    | "teacher"
    | "employee";
  institute_id?: string | null;
  is_active?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    /*
     * ============================================================
     * التحقق من المستخدم الحالي
     * ============================================================
     */

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
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

    const {
      data: { user: currentAuthUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentAuthUser) {
      return NextResponse.json(
        {
          error:
            "يجب تسجيل الدخول أولًا",
        },
        { status: 401 }
      );
    }

    /*
     * ============================================================
     * بيانات المستخدم الحالي
     * ============================================================
     */

    const {
      data: currentProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, role, directorate_id, institute_id, is_active"
      )
      .eq("id", currentAuthUser.id)
      .maybeSingle();

    if (
      profileError ||
      !currentProfile
    ) {
      return NextResponse.json(
        {
          error:
            "تعذر التحقق من صلاحيات المستخدم الحالي",
        },
        { status: 403 }
      );
    }

    if (currentProfile.is_active === false) {
      return NextResponse.json(
        {
          error:
            "الحساب الحالي غير مفعل",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================================
     * من يسمح له بإنشاء المستخدمين؟
     * ============================================================
     *
     * مدير الإدارة فقط حاليًا.
     *
     * super_admin
     * director القديم للتوافق
     */

    if (
      currentProfile.role !==
        "super_admin" &&
      currentProfile.role !== "director"
    ) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية إنشاء مستخدمين",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================================
     * قراءة البيانات
     * ============================================================
     */

    const body =
      (await request.json()) as CreateUserBody;

    const fullName =
      body.full_name?.trim();

    const email =
      body.email?.trim().toLowerCase();

    const password =
      body.password;

    const phone =
      body.phone?.trim() || null;

    const role =
      body.role;

    const instituteId =
      body.institute_id || null;

    const isActive =
      body.is_active !== false;

    /*
     * ============================================================
     * التحقق الأساسي
     * ============================================================
     */

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "يرجى إدخال الاسم الكامل",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "يرجى إدخال البريد الإلكتروني",
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور يجب ألا تقل عن 6 أحرف",
        },
        { status: 400 }
      );
    }

    const allowedRoles = [
      "super_admin",
      "deputy",
      "sheikh",
      "institute_deputy",
      "teacher",
      "employee",
    ];

    if (
      !allowedRoles.includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "الدور المحدد غير مسموح بإنشائه من هذه الصفحة",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * التحقق من الإدارة
     * ============================================================
     */

    if (!currentProfile.directorate_id) {
      return NextResponse.json(
        {
          error:
            "حساب مدير الإدارة غير مرتبط بإدارة تعليمية",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * التحقق من المعهد
     * ============================================================
     *
     * الأدوار التالية يجب أن تكون مرتبطة بمعهد:
     *
     * sheikh
     * institute_deputy
     * teacher
     * employee
     */

    const instituteRoles = [
      "sheikh",
      "institute_deputy",
      "teacher",
      "employee",
    ];

    if (
      instituteRoles.includes(role) &&
      !instituteId
    ) {
      return NextResponse.json(
        {
          error:
            "يجب اختيار المعهد لهذا الدور",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * التحقق من المعهد والإدارة
     * ============================================================
     */

    if (instituteId) {
      const {
        data: institute,
        error: instituteError,
      } = await supabase
        .from("institutes")
        .select(
          "id, name, directorate_id"
        )
        .eq("id", instituteId)
        .maybeSingle();

      if (
        instituteError ||
        !institute
      ) {
        return NextResponse.json(
          {
            error:
              "المعهد المحدد غير موجود",
          },
          { status: 400 }
        );
      }

      if (
        institute.directorate_id !==
        currentProfile.directorate_id
      ) {
        return NextResponse.json(
          {
            error:
              "لا يمكن إنشاء مستخدم لمعهد تابع لإدارة أخرى",
          },
          { status: 403 }
        );
      }
    }

    /*
     * ============================================================
     * منع إنشاء مدير قديم
     * ============================================================
     */

    if (role === "director") {
      return NextResponse.json(
        {
          error:
            "استخدم دور مدير الإدارة التعليمية (super_admin)",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * Service Role Client
     * ============================================================
     *
     * هذا المفتاح لا يظهر أبدًا في المتصفح.
     */

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY is missing"
      );

      return NextResponse.json(
        {
          error:
            "لم يتم إعداد مفتاح خدمة Supabase على الخادم",
        },
        { status: 500 }
      );
    }

    const adminSupabase =
      createClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

    /*
     * ============================================================
     * إنشاء حساب Authentication
     * ============================================================
     */

    const {
      data: authData,
      error: createAuthError,
    } =
      await adminSupabase.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role,
          },
        }
      );

    if (
      createAuthError ||
      !authData.user
    ) {
      console.error(
        "create auth user error:",
        createAuthError
      );

      return NextResponse.json(
        {
          error:
            createAuthError?.message ||
            "تعذر إنشاء حساب الدخول",
        },
        { status: 400 }
      );
    }

    const newUserId =
      authData.user.id;

    /*
     * ============================================================
     * إنشاء Profile
     * ============================================================
     */

    const { error: insertProfileError } =
      await adminSupabase
        .from("profiles")
        .insert({
          id: newUserId,
          full_name: fullName,
          phone,
          email,
          role,
          directorate_id:
            currentProfile.directorate_id,
          institute_id:
            instituteId,
          is_active: isActive,
          created_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        });

    /*
     * ============================================================
     * Rollback
     * ============================================================
     *
     * لو فشل إنشاء Profile نحذف حساب Auth
     * حتى لا يصبح لدينا حساب بدون Profile.
     */

    if (insertProfileError) {
      console.error(
        "insert profile error:",
        insertProfileError
      );

      await adminSupabase.auth.admin.deleteUser(
        newUserId
      );

      return NextResponse.json(
        {
          error:
            "تم إنشاء حساب الدخول ولكن تعذر إنشاء ملف المستخدم، وتم التراجع عن العملية",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================================
     * النجاح
     * ============================================================
     */

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUserId,
          full_name: fullName,
          email,
          role,
          institute_id:
            instituteId,
          directorate_id:
            currentProfile.directorate_id,
          is_active: isActive,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create user API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء إنشاء المستخدم",
      },
      { status: 500 }
    );
  }
}
