import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type StaffRole =
  | "super_admin"
  | "deputy"
  | "sheikh"
  | "institute_deputy"
  | "teacher"
  | "employee";

type LegacyRole = "director";

type AllowedRole = StaffRole | LegacyRole;

const STAFF_ROLES: StaffRole[] = [
  "super_admin",
  "deputy",
  "sheikh",
  "institute_deputy",
  "teacher",
  "employee",
];

const ALLOWED_ROLES: AllowedRole[] = [
  ...STAFF_ROLES,
  "director",
];

const CENTRAL_ROLES: AllowedRole[] = [
  "super_admin",
  "director",
  "deputy",
];

const INSTITUTE_ROLES: AllowedRole[] = [
  "sheikh",
  "institute_deputy",
  "teacher",
  "employee",
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured"
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured"
    );
  }

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured"
    );
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAllowedRole(
  role: string
): role is AllowedRole {
  return ALLOWED_ROLES.includes(
    role as AllowedRole
  );
}

function isCentralRole(
  role: AllowedRole
) {
  return CENTRAL_ROLES.includes(role);
}

function isInstituteRole(
  role: AllowedRole
) {
  return INSTITUTE_ROLES.includes(role);
}

async function getCaller(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return {
      error: "غير مصرح بالطلب",
      user: null,
      profile: null,
    };
  }

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      error: "رمز الدخول غير صالح",
      user: null,
      profile: null,
    };
  }

  const accessToken = match[1];

  const authClient =
    getSupabaseAuthClient();

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(
    accessToken
  );

  if (userError || !user) {
    return {
      error: "جلسة الدخول غير صالحة",
      user: null,
      profile: null,
    };
  }

  const admin = getSupabaseAdmin();

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "id, full_name, role, directorate_id, institute_id, is_active, email"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      error:
        "لم يتم العثور على ملف صلاحيات المستخدم",
      user,
      profile: null,
    };
  }

  if (profile.is_active === false) {
    return {
      error: "الحساب غير مفعل",
      user,
      profile: null,
    };
  }

  if (
    profile.role !== "super_admin" &&
    profile.role !== "director"
  ) {
    return {
      error:
        "ليس لديك صلاحية إدارة حسابات المستخدمين",
      user,
      profile: null,
    };
  }

  if (!profile.directorate_id) {
    return {
      error:
        "حساب الإدارة غير مرتبط بإدارة تعليمية",
      user,
      profile: null,
    };
  }

  return {
    error: null,
    user,
    profile,
  };
}

async function validateTargetScope(
  admin: ReturnType<typeof getSupabaseAdmin>,
  callerProfile: {
    role: string;
    directorate_id: string | null;
  },
  targetRole: AllowedRole,
  instituteId: string | null
) {
  if (!callerProfile.directorate_id) {
    return {
      valid: false,
      error:
        "حساب الإدارة غير مرتبط بإدارة تعليمية",
    };
  }

  if (
    targetRole === "super_admin" &&
    callerProfile.role !== "super_admin"
  ) {
    return {
      valid: false,
      error:
        "فقط مدير الإدارة يمكنه إنشاء أو تعديل حساب مدير الإدارة",
    };
  }

  if (isCentralRole(targetRole)) {
    return {
      valid: true,
      error: null,
    };
  }

  if (isInstituteRole(targetRole)) {
    if (!instituteId) {
      return {
        valid: false,
        error:
          "يجب اختيار المعهد لهذا الدور",
      };
    }

    const {
      data: institute,
      error: instituteError,
    } = await admin
      .from("institutes")
      .select(
        "id, name, directorate_id"
      )
      .eq("id", instituteId)
      .maybeSingle();

    if (instituteError || !institute) {
      return {
        valid: false,
        error:
          "المعهد المحدد غير موجود",
      };
    }

    if (
      institute.directorate_id !==
      callerProfile.directorate_id
    ) {
      return {
        valid: false,
        error:
          "لا يمكن إنشاء حساب لمعهد تابع لإدارة أخرى",
      };
    }

    return {
      valid: true,
      error: null,
    };
  }

  return {
    valid: false,
    error:
      "الدور المحدد غير مدعوم",
  };
}

/* =========================================================
   POST
   إنشاء حساب دخول جديد
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    const caller =
      await getCaller(request);

    if (caller.error || !caller.profile) {
      return NextResponse.json(
        {
          error:
            caller.error ||
            "غير مصرح",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const role =
      typeof body.role === "string"
        ? body.role.trim()
        : "";

    const instituteId =
      typeof body.institute_id === "string" &&
      body.institute_id.trim() !== ""
        ? body.institute_id.trim()
        : null;

    const isActive =
      body.is_active !== false;

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "اسم المستخدم مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "البريد الإلكتروني مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور مطلوبة",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        },
        {
          status: 400,
        }
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        {
          error:
            "الدور المحدد غير صالح",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * لا نسمح بإنشاء دور director جديد.
     * هذا الدور موجود فقط للتوافق مع الحسابات القديمة.
     */
    if (role === "director") {
      return NextResponse.json(
        {
          error:
            "دور مدير الإدارة القديم غير متاح لإنشاء حسابات جديدة. استخدم مدير الإدارة التعليمية.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      getSupabaseAdmin();

    const scope =
      await validateTargetScope(
        admin,
        caller.profile,
        role,
        instituteId
      );

    if (!scope.valid) {
      return NextResponse.json(
        {
          error:
            scope.error ||
            "النطاق الإداري غير صالح",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: existingProfile,
      error:
        existingProfileError,
    } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();

    if (
      existingProfileError &&
      existingProfileError.code !==
        "PGRST116"
    ) {
      return NextResponse.json(
        {
          error:
            existingProfileError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error:
            "يوجد مستخدم مسجل بالفعل بهذا البريد الإلكتروني",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: authResult,
      error: authError,
    } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
      });

    if (authError || !authResult.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "تعذر إنشاء حساب الدخول",
        },
        {
          status: 400,
        }
      );
    }

    const authUser =
      authResult.user;

    const profileData = {
      id: authUser.id,
      full_name: fullName,
      phone: phone || null,
      email,
      role,
      directorate_id:
        caller.profile.directorate_id,
      institute_id:
        isInstituteRole(role)
          ? instituteId
          : null,
      is_active: isActive,
    };

    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .insert(profileData);

    if (profileError) {
      await admin.auth.admin.deleteUser(
        authUser.id
      );

      return NextResponse.json(
        {
          error:
            "تم إنشاء حساب الدخول لكن تعذر إنشاء ملف المستخدم: " +
            profileError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "تم إنشاء حساب المستخدم بنجاح",
        user: {
          id: authUser.id,
          full_name: fullName,
          email,
          role,
          institute_id:
            profileData.institute_id,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE USER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   تعديل حساب مستخدم موجود
   ========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    const caller =
      await getCaller(request);

    if (caller.error || !caller.profile) {
      return NextResponse.json(
        {
          error:
            caller.error ||
            "غير مصرح",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const userId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "معرف المستخدم مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      getSupabaseAdmin();

    const {
      data: targetProfile,
      error:
        targetProfileError,
    } = await admin
      .from("profiles")
      .select(
        "id, full_name, phone, email, role, directorate_id, institute_id, is_active"
      )
      .eq("id", userId)
      .maybeSingle();

    if (
      targetProfileError ||
      !targetProfile
    ) {
      return NextResponse.json(
        {
          error:
            "المستخدم المطلوب غير موجود",
        },
        {
          status: 404,
        }
      );
    }

    if (
      targetProfile.directorate_id !==
      caller.profile.directorate_id
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تعديل مستخدم تابع لإدارة أخرى",
        },
        {
          status: 403,
        }
      );
    }

    const fullName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : targetProfile.full_name;

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : targetProfile.phone;

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : targetProfile.email;

    const role =
      typeof body.role === "string"
        ? body.role.trim()
        : targetProfile.role;

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const instituteId =
      typeof body.institute_id === "string" &&
      body.institute_id.trim() !== ""
        ? body.institute_id.trim()
        : null;

    const isActive =
      body.is_active !== false;

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "اسم المستخدم مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "البريد الإلكتروني مطلوب لحسابات الدخول",
        },
        {
          status: 400,
        }
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        {
          error:
            "الدور المحدد غير صالح",
        },
        {
          status: 400,
        }
      );
    }

    if (
      role === "director" &&
      targetProfile.role !== "director"
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعيين دور مدير الإدارة القديم لحساب جديد",
        },
        {
          status: 400,
        }
      );
    }

    if (
      role === "super_admin" &&
      caller.profile.role !==
        "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "فقط مدير الإدارة يمكنه تعديل حساب مدير الإدارة",
        },
        {
          status: 403,
        }
      );
    }

    if (
      userId === caller.profile.id &&
      !isActive
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تعطيل حسابك الحالي",
        },
        {
          status: 400,
        }
      );
    }

    if (
      userId === caller.profile.id &&
      role !== caller.profile.role
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تغيير دور حسابك الحالي",
        },
        {
          status: 400,
        }
      );
    }

    if (
      userId === caller.profile.id &&
      instituteId !==
        caller.profile.institute_id
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تغيير نطاق حسابك الحالي",
        },
        {
          status: 400,
        }
      );
    }

    const scope =
      await validateTargetScope(
        admin,
        caller.profile,
        role,
        instituteId
      );

    if (!scope.valid) {
      return NextResponse.json(
        {
          error:
            scope.error ||
            "النطاق الإداري غير صالح",
        },
        {
          status: 403,
        }
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * نحدث profile أولًا.
     * إذا فشل تحديث Auth سنعيد profile إلى حالته السابقة.
     */

    const oldProfile = {
      full_name:
        targetProfile.full_name,
      phone:
        targetProfile.phone,
      email:
        targetProfile.email,
      role:
        targetProfile.role,
      directorate_id:
        targetProfile.directorate_id,
      institute_id:
        targetProfile.institute_id,
      is_active:
        targetProfile.is_active,
    };

    const newProfile = {
      full_name: fullName,
      phone: phone || null,
      email,
      role,
      directorate_id:
        caller.profile.directorate_id,
      institute_id:
        isInstituteRole(role)
          ? instituteId
          : null,
      is_active: isActive,
    };

    const {
      error: profileUpdateError,
    } = await admin
      .from("profiles")
      .update(newProfile)
      .eq("id", userId);

    if (profileUpdateError) {
      return NextResponse.json(
        {
          error:
            "تعذر تحديث ملف المستخدم: " +
            profileUpdateError.message,
        },
        {
          status: 500,
        }
      );
    }

    const authUpdate: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
      user_metadata?: {
        full_name: string;
        role: string;
      };
    } = {
      user_metadata: {
        full_name: fullName,
        role,
      },
    };

    const emailChanged =
      email !== targetProfile.email;

    if (emailChanged) {
      authUpdate.email = email;
      authUpdate.email_confirm = true;
    }

    if (password) {
      authUpdate.password =
        password;
    }

    const shouldUpdateAuth =
      emailChanged ||
      Boolean(password) ||
      Boolean(
        targetProfile.full_name !==
          fullName
      ) ||
      targetProfile.role !== role;

    if (shouldUpdateAuth) {
      const {
        error: authUpdateError,
      } =
        await admin.auth.admin.updateUserById(
          userId,
          authUpdate
        );

      if (authUpdateError) {
        await admin
          .from("profiles")
          .update(oldProfile)
          .eq("id", userId);

        return NextResponse.json(
          {
            error:
              "تعذر تحديث حساب تسجيل الدخول: " +
              authUpdateError.message,
          },
          {
            status: 400,
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "تم تحديث حساب المستخدم بنجاح",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE USER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع",
      },
      {
        status: 500,
      }
    );
  }
}
