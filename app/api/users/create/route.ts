import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role =
  | "super_admin"
  | "director"
  | "deputy"
  | "it_admin"
  | "sheikh"
  | "institute_deputy"
  | "teacher"
  | "employee"
  | "parent"
  | "student";

const INSTITUTE_ROLES = [
  "it_admin",
  "sheikh",
  "institute_deputy",
  "teacher",
  "employee",
] as const;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "إعدادات Supabase الخاصة بالسيرفر غير مكتملة"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "إعدادات Supabase للمصادقة غير مكتملة"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isInstituteRole(role: string) {
  return INSTITUTE_ROLES.includes(
    role as (typeof INSTITUTE_ROLES)[number]
  );
}

function validRole(role: string): role is Role {
  return [
    "super_admin",
    "director",
    "deputy",
    "it_admin",
    "sheikh",
    "institute_deputy",
    "teacher",
    "employee",
    "parent",
    "student",
  ].includes(role);
}

/* =========================================================
   التحقق من المستخدم الحالي
   ========================================================= */

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

  const token = match[1];

  const authClient = getAuthClient();

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    return {
      error: "جلسة الدخول غير صالحة",
      user: null,
      profile: null,
    };
  }

  const admin = getAdminClient();

  const { data: profile, error: profileError } =
    await admin
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        role,
        directorate_id,
        institute_id,
        is_active
        `
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

  const allowedCaller =
    profile.role === "super_admin" ||
    profile.role === "director" ||
    profile.role === "it_admin";

  if (!allowedCaller) {
    return {
      error:
        "ليس لديك صلاحية إدارة حسابات المستخدمين",
      user,
      profile: null,
    };
  }

  /*
   * مدير الإدارة يجب أن يكون مرتبطًا بإدارة.
   *
   * مسؤول IT يجب أن يكون مرتبطًا بمعهد.
   */
  if (
    profile.role === "it_admin" &&
    !profile.institute_id
  ) {
    return {
      error:
        "مسؤول تكنولوجيا المعلومات يجب أن يكون مرتبطًا بمعهد",
      user,
      profile: null,
    };
  }

  if (
    profile.role !== "it_admin" &&
    !profile.directorate_id
  ) {
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

/* =========================================================
   التحقق من المعهد
   ========================================================= */

async function validateInstitute(
  admin: ReturnType<typeof getAdminClient>,
  instituteId: string | null,
  directorateId: string | null,
  callerInstituteId: string | null,
  callerRole: string
) {
  if (!instituteId) {
    return {
      valid: false,
      error: "يجب اختيار المعهد",
    };
  }

  const { data: institute, error } =
    await admin
      .from("institutes")
      .select(
        "id, name, directorate_id"
      )
      .eq("id", instituteId)
      .maybeSingle();

  if (error || !institute) {
    return {
      valid: false,
      error: "المعهد المحدد غير موجود",
    };
  }

  if (callerRole === "it_admin") {
    if (
      institute.id !== callerInstituteId
    ) {
      return {
        valid: false,
        error:
          "مسؤول IT يستطيع إدارة معهده فقط",
      };
    }
  }

  if (
    directorateId &&
    institute.directorate_id !==
      directorateId
  ) {
    return {
      valid: false,
      error:
        "المعهد لا يتبع الإدارة التعليمية الحالية",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/* =========================================================
   التحقق من نطاق المستخدم المستهدف
   ========================================================= */

async function validateTarget(
  admin: ReturnType<typeof getAdminClient>,
  caller: any,
  targetRole: Role,
  instituteId: string | null
) {
  /*
   * مسؤول IT يستطيع فقط التعامل مع أدوار المعهد.
   */
  if (caller.role === "it_admin") {
    if (!isInstituteRole(targetRole)) {
      return {
        valid: false,
        error:
          "مسؤول IT يستطيع إدارة مستخدمي معهده فقط",
      };
    }

    const instituteCheck =
      await validateInstitute(
        admin,
        instituteId,
        caller.directorate_id,
        caller.institute_id,
        caller.role
      );

    return instituteCheck;
  }

  /*
   * مدير الإدارة لديه كل الصلاحيات.
   *
   * الدور القديم director لا ننشئه من جديد.
   */
  if (
    targetRole === "director"
  ) {
    return {
      valid: false,
      error:
        "دور مدير الإدارة القديم غير متاح للحسابات الجديدة",
    };
  }

  /*
   * it_admin يجب أن يكون تابعًا لمعهد.
   */
  if (
    targetRole === "it_admin"
  ) {
    if (caller.role !== "super_admin") {
      return {
        valid: false,
        error:
          "فقط مدير الإدارة يستطيع إنشاء أو تعديل مسؤول IT",
      };
    }

    return validateInstitute(
      admin,
      instituteId,
      caller.directorate_id,
      null,
      caller.role
    );
  }

  /*
   * الأدوار التي تخص المعهد.
   */
  if (isInstituteRole(targetRole)) {
    return validateInstitute(
      admin,
      instituteId,
      caller.directorate_id,
      null,
      caller.role
    );
  }

  /*
   * الأدوار المركزية.
   */
  if (
    targetRole === "super_admin" ||
    targetRole === "deputy"
  ) {
    return {
      valid: true,
      error: null,
    };
  }

  return {
    valid: false,
    error: "الدور المحدد غير مدعوم",
  };
}

/* =========================================================
   GET
   تحميل المستخدمين
   ========================================================= */

export async function GET(
  request: Request
) {
  try {
    const caller =
      await getCaller(request);

    if (
      caller.error ||
      !caller.profile
    ) {
      return NextResponse.json(
        {
          error:
            caller.error ||
            "غير مصرح",
        },
        { status: 403 }
      );
    }

    const admin =
      getAdminClient();

    const profile =
      caller.profile;

    let institutesQuery =
      admin
        .from("institutes")
        .select(
          "id, name, code, directorate_id"
        )
        .order("name");

    /*
     * مدير الإدارة يرى كل معاهد إدارته.
     *
     * IT Admin يرى معهده فقط.
     */
    if (
      profile.role === "it_admin"
    ) {
      institutesQuery =
        institutesQuery.eq(
          "id",
          profile.institute_id
        );
    } else {
      institutesQuery =
        institutesQuery.eq(
          "directorate_id",
          profile.directorate_id
        );
    }

    const {
      data: institutes,
      error: institutesError,
    } =
      await institutesQuery;

    if (institutesError) {
      return NextResponse.json(
        {
          error:
            "تعذر تحميل المعاهد",
        },
        { status: 500 }
      );
    }

    const instituteIds =
      (institutes || []).map(
        (item) => item.id
      );

    /*
     * المستخدمون الأساسيون.
     */
    let profilesQuery =
      admin
        .from("profiles")
        .select(
          `
          id,
          full_name,
          phone,
          email,
          role,
          directorate_id,
          institute_id,
          is_active,
          created_at,
          updated_at
          `
        )
        .order("full_name");

    if (
      profile.role === "it_admin"
    ) {
      profilesQuery =
        profilesQuery.eq(
          "institute_id",
          profile.institute_id
        );
    } else {
      profilesQuery =
        profilesQuery.eq(
          "directorate_id",
          profile.directorate_id
        );
    }

    const {
      data: directUsers,
      error: usersError,
    } =
      await profilesQuery;

    if (usersError) {
      return NextResponse.json(
        {
          error:
            "تعذر تحميل المستخدمين",
        },
        { status: 500 }
      );
    }

    /*
     * الطلاب وأولياء الأمور.
     */
    let relatedUsers: any[] = [];

    if (instituteIds.length > 0) {
      const {
        data: students,
      } = await admin
        .from("students")
        .select(
          "id, parent_id, institute_id"
        )
        .in(
          "institute_id",
          instituteIds
        );

      const studentIds =
        (students || []).map(
          (s) => s.id
        );

      const parentIds =
        Array.from(
          new Set(
            (students || [])
              .map(
                (s) => s.parent_id
              )
              .filter(Boolean)
          )
        );

      if (studentIds.length > 0) {
        const {
          data: studentProfiles,
        } = await admin
          .from("profiles")
          .select(
            `
            id,
            full_name,
            phone,
            email,
            role,
            directorate_id,
            institute_id,
            is_active,
            created_at,
            updated_at
            `
          )
          .in(
            "id",
            studentIds
          );

        relatedUsers.push(
          ...(studentProfiles || [])
        );
      }

      if (parentIds.length > 0) {
        const {
          data: parentProfiles,
        } = await admin
          .from("profiles")
          .select(
            `
            id,
            full_name,
            phone,
            email,
            role,
            directorate_id,
            institute_id,
            is_active,
            created_at,
            updated_at
            `
          )
          .in(
            "id",
            parentIds
          );

        relatedUsers.push(
          ...(parentProfiles || [])
        );
      }
    }

    const map =
      new Map<string, any>();

    [
      ...(directUsers || []),
      ...relatedUsers,
    ].forEach((user) => {
      map.set(user.id, user);
    });

    const users =
      Array.from(
        map.values()
      ).sort((a, b) =>
        String(a.full_name || "").localeCompare(
          String(b.full_name || ""),
          "ar"
        )
      );

    return NextResponse.json({
      success: true,
      users,
      institutes:
        institutes || [],
      current_user: {
        id: profile.id,
        role: profile.role,
        institute_id:
          profile.institute_id,
        directorate_id:
          profile.directorate_id,
      },
    });
  } catch (error) {
    console.error(
      "GET USERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   إنشاء مستخدم
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    const caller =
      await getCaller(request);

    if (
      caller.error ||
      !caller.profile
    ) {
      return NextResponse.json(
        {
          error:
            caller.error ||
            "غير مصرح",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

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
      typeof body.institute_id ===
        "string" &&
      body.institute_id.trim()
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
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "البريد الإلكتروني مطلوب",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور مطلوبة",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    if (!validRole(role)) {
      return NextResponse.json(
        {
          error:
            "الدور المحدد غير صالح",
        },
        { status: 400 }
      );
    }

    const admin =
      getAdminClient();

    const scope =
      await validateTarget(
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
        { status: 403 }
      );
    }

    const {
      data: existing,
    } = await admin
      .from("profiles")
      .select("id")
      .ilike(
        "email",
        email
      )
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "يوجد مستخدم مسجل بالفعل بهذا البريد الإلكتروني",
        },
        { status: 409 }
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
          full_name:
            fullName,
          role,
        },
      });

    if (
      authError ||
      !authResult.user
    ) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "تعذر إنشاء حساب الدخول",
        },
        { status: 400 }
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
            "تعذر إنشاء ملف المستخدم: " +
            profileError.message,
        },
        { status: 500 }
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
      { status: 201 }
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
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH
   تعديل المستخدم
   ========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    const caller =
      await getCaller(request);

    if (
      caller.error ||
      !caller.profile
    ) {
      return NextResponse.json(
        {
          error:
            caller.error ||
            "غير مصرح",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

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
        { status: 400 }
      );
    }

    const admin =
      getAdminClient();

    const {
      data: target,
    } = await admin
      .from("profiles")
      .select(
        `
        id,
        full_name,
        phone,
        email,
        role,
        directorate_id,
        institute_id,
        is_active
        `
      )
      .eq("id", userId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json(
        {
          error:
            "المستخدم المطلوب غير موجود",
        },
        { status: 404 }
      );
    }

    /*
     * لا يستطيع IT Admin تعديل مستخدم خارج معهده.
     */
    if (
      caller.profile.role ===
      "it_admin"
    ) {
      if (
        target.institute_id !==
        caller.profile.institute_id
      ) {
        return NextResponse.json(
          {
            error:
              "لا يمكنك تعديل مستخدم خارج معهدك",
          },
          { status: 403 }
        );
      }
    } else {
      /*
       * مدير الإدارة يستطيع تعديل مستخدمي إدارته.
       */
      if (
        target.directorate_id !==
        caller.profile.directorate_id
      ) {
        return NextResponse.json(
          {
            error:
              "لا يمكنك تعديل مستخدم تابع لإدارة أخرى",
          },
          { status: 403 }
        );
      }
    }

    const fullName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : target.full_name;

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : target.phone;

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : target.email;

    const role =
      typeof body.role === "string"
        ? body.role.trim()
        : target.role;

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const instituteId =
      typeof body.institute_id ===
        "string" &&
      body.institute_id.trim()
        ? body.institute_id.trim()
        : null;

    const isActive =
      body.is_active !== false;

    if (!validRole(role)) {
      return NextResponse.json(
        {
          error:
            "الدور المحدد غير صالح",
        },
        { status: 400 }
      );
    }

    /*
     * منع IT Admin من رفع صلاحياته.
     */
    if (
      caller.profile.role ===
      "it_admin"
    ) {
      if (
        !isInstituteRole(role)
      ) {
        return NextResponse.json(
          {
            error:
              "مسؤول IT يستطيع إدارة أدوار المعهد فقط",
          },
          { status: 403 }
        );
      }
    }

    /*
     * فقط super_admin يستطيع تعديل it_admin.
     */
    if (
      role === "it_admin" &&
      caller.profile.role !==
        "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "فقط مدير الإدارة يستطيع إدارة مسؤولي IT",
        },
        { status: 403 }
      );
    }

    /*
     * منع إنشاء/تحويل إلى الدور القديم.
     */
    if (
      role === "director"
    ) {
      return NextResponse.json(
        {
          error:
            "دور مدير الإدارة القديم غير متاح",
        },
        { status: 400 }
      );
    }

    /*
     * منع تعطيل الحساب الحالي.
     */
    if (
      userId ===
        caller.profile.id &&
      !isActive
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تعطيل حسابك الحالي",
        },
        { status: 400 }
      );
    }

    /*
     * مدير الإدارة فقط يستطيع تعديل super_admin.
     */
    if (
      target.role ===
        "super_admin" &&
      caller.profile.role !==
        "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعديل حساب مدير الإدارة",
        },
        { status: 403 }
      );
    }

    /*
     * IT Admin لا يستطيع تعديل حساب super_admin.
     */
    if (
      caller.profile.role ===
        "it_admin" &&
      target.role ===
        "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تعديل حساب مدير الإدارة",
        },
        { status: 403 }
      );
    }

    if (
      password &&
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    const scope =
      await validateTarget(
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
        { status: 403 }
      );
    }

    const oldProfile = {
      full_name:
        target.full_name,
      phone:
        target.phone,
      email:
        target.email,
      role:
        target.role,
      directorate_id:
        target.directorate_id,
      institute_id:
        target.institute_id,
      is_active:
        target.is_active,
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
      error: profileError,
    } = await admin
      .from("profiles")
      .update(newProfile)
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "تعذر تحديث ملف المستخدم: " +
            profileError.message,
        },
        { status: 500 }
      );
    }

    const emailChanged =
      email !== target.email;

    const authUpdate: any = {
      user_metadata: {
        full_name: fullName,
        role,
      },
    };

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
      target.full_name !==
        fullName ||
      target.role !== role;

    if (shouldUpdateAuth) {
      const {
        error: authError,
      } =
        await admin.auth.admin.updateUserById(
          userId,
          authUpdate
        );

      if (authError) {
        await admin
          .from("profiles")
          .update(oldProfile)
          .eq("id", userId);

        return NextResponse.json(
          {
            error:
              "تعذر تحديث حساب تسجيل الدخول: " +
              authError.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "تم تحديث حساب المستخدم بنجاح",
    });
  } catch (error) {
    console.error(
      "PATCH USER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع",
      },
      { status: 500 }
    );
  }
}
