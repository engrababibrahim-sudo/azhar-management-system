import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type StaffRole =
  | "super_admin"
  | "director"
  | "deputy"
  | "sheikh"
  | "institute_deputy"
  | "it_admin"
  | "teacher"
  | "employee";

type AllowedRole =
  | StaffRole
  | "parent"
  | "student";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: AllowedRole;
  directorate_id: string | null;
  institute_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  directorate_id: string | null;
};

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const ALLOWED_ROLES: AllowedRole[] = [
  "super_admin",
  "director",
  "deputy",
  "sheikh",
  "institute_deputy",
  "it_admin",
  "teacher",
  "employee",
  "parent",
  "student",
];

const CENTRAL_ROLES: AllowedRole[] = [
  "super_admin",
  "director",
  "deputy",
];

const INSTITUTE_ROLES: AllowedRole[] = [
  "sheikh",
  "institute_deputy",
  "it_admin",
  "teacher",
  "employee",
];

/*
|--------------------------------------------------------------------------
| Supabase Admin Client
|--------------------------------------------------------------------------
*/

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

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

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
|--------------------------------------------------------------------------
| Supabase Auth Client
|--------------------------------------------------------------------------
*/

function getSupabaseAuthClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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

  return createClient(
    url,
    publishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
|--------------------------------------------------------------------------
| Get authenticated caller
|--------------------------------------------------------------------------
*/

async function getCaller(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return {
      error:
        "غير مصرح بالطلب",
      caller: null,
    };
  }

  const token =
    authorization.substring(7);

  if (!token) {
    return {
      error:
        "غير مصرح بالطلب",
      caller: null,
    };
  }

  try {
    const authClient =
      getSupabaseAuthClient();

    const {
      data,
      error,
    } =
      await authClient.auth.getUser(
        token
      );

    if (
      error ||
      !data.user
    ) {
      return {
        error:
          "جلسة الدخول غير صالحة",
        caller: null,
      };
    }

    const admin =
      getSupabaseAdmin();

    const {
      data: profile,
      error:
        profileError,
    } =
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
        .eq(
          "id",
          data.user.id
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "Caller profile error:",
        profileError
      );

      return {
        error:
          "لم يتم العثور على بيانات المستخدم الحالي",
        caller: null,
      };
    }

    if (
      profile.is_active === false
    ) {
      return {
        error:
          "الحساب الحالي غير نشط",
        caller: null,
      };
    }

    const callerRole =
      profile.role as AllowedRole;

    /*
     * المستخدمون المسموح لهم بإدارة المستخدمين:
     *
     * super_admin
     * director - توافق قديم
     * it_admin - داخل معهد واحد
     */

    if (
      callerRole !==
        "super_admin" &&
      callerRole !==
        "director" &&
      callerRole !==
        "it_admin"
    ) {
      return {
        error:
          "ليس لديك صلاحية إدارة المستخدمين",
        caller: null,
      };
    }

    /*
     * IT Admin يجب أن يكون مرتبطًا بمعهد.
     */

    if (
      callerRole ===
        "it_admin" &&
      !profile.institute_id
    ) {
      return {
        error:
          "مسؤول IT غير مرتبط بمعهد",
        caller: null,
      };
    }

    /*
     * super_admin / director
     * يجب أن يكونا مرتبطين بإدارة.
     */

    if (
      callerRole !==
        "it_admin" &&
      !profile.directorate_id
    ) {
      return {
        error:
          "الحساب الحالي غير مرتبط بإدارة تعليمية",
        caller: null,
      };
    }

    return {
      error: null,
      caller: {
        id: profile.id,
        full_name:
          profile.full_name,
        email: profile.email,
        role: callerRole,
        directorate_id:
          profile.directorate_id,
        institute_id:
          profile.institute_id,
        is_active:
          profile.is_active,
      },
    };
  } catch (error) {
    console.error(
      "getCaller error:",
      error
    );

    return {
      error:
        "حدث خطأ أثناء التحقق من صلاحيات المستخدم",
      caller: null,
    };
  }
}

/*
|--------------------------------------------------------------------------
| Validate target scope
|--------------------------------------------------------------------------
*/

async function validateTargetScope({
  caller,
  role,
  instituteId,
  directorateId,
  targetUserId,
}: {
  caller: {
    id: string;
    role: AllowedRole;
    directorate_id:
      | string
      | null;
    institute_id:
      | string
      | null;
  };
  role: AllowedRole;
  instituteId:
    | string
    | null
    | undefined;
  directorateId?:
    | string
    | null;
  targetUserId?: string;
}) {
  const admin =
    getSupabaseAdmin();

  /*
  |--------------------------------------------------------------------------
  | IT Admin
  |--------------------------------------------------------------------------
  |
  | IT Admin:
  | - يدير مستخدمي معهد واحد فقط
  | - لا ينشئ مدير إدارة
  | - لا ينشئ وكيل إدارة
  | - لا ينشئ IT Admin آخر
  | - لا يدير معهدًا آخر
  |
  */

  if (
    caller.role ===
    "it_admin"
  ) {
    if (
      !caller.institute_id
    ) {
      return {
        valid: false,
        error:
          "مسؤول IT غير مرتبط بمعهد",
      };
    }

    if (
      !INSTITUTE_ROLES.includes(
        role
      )
    ) {
      return {
        valid: false,
        error:
          "مسؤول IT يستطيع إدارة مستخدمي المعهد فقط",
      };
    }

    if (
      role ===
      "it_admin"
    ) {
      /*
       * لا يستطيع IT Admin إنشاء أو تعديل IT Admin آخر.
       */
      if (
        targetUserId !==
        caller.id
      ) {
        return {
          valid: false,
          error:
            "لا يمكن لمسؤول IT إدارة مسؤول IT آخر",
        };
      }
    }

    if (
      !instituteId
    ) {
      return {
        valid: false,
        error:
          "يجب تحديد المعهد",
      };
    }

    if (
      instituteId !==
      caller.institute_id
    ) {
      return {
        valid: false,
        error:
          "لا يمكنك إدارة مستخدم تابع لمعهد آخر",
      };
    }

    return {
      valid: true,
      error: null,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | مدير الإدارة
  |--------------------------------------------------------------------------
  */

  if (
    caller.role ===
      "super_admin" ||
    caller.role ===
      "director"
  ) {
    if (
      !caller.directorate_id
    ) {
      return {
        valid: false,
        error:
          "الحساب الحالي غير مرتبط بإدارة تعليمية",
      };
    }

    /*
     * لا نسمح بإنشاء دور director جديد.
     * هذا الدور قديم للتوافق فقط.
     */
    if (
      role ===
      "director"
    ) {
      return {
        valid: false,
        error:
          "دور مدير الإدارة القديم غير متاح لإنشاء حسابات جديدة",
      };
    }

    /*
     * super_admin يستطيع إدارة كل الأدوار المسموح بها.
     */

    if (
      role ===
      "super_admin"
    ) {
      /*
       * فقط super_admin يستطيع إنشاء مدير إدارة آخر.
       */
      if (
        caller.role !==
        "super_admin"
      ) {
        return {
          valid: false,
          error:
            "ليس لديك صلاحية إنشاء مدير إدارة",
        };
      }

      /*
       * super_admin مركزي ولا يحتاج معهدًا.
       */
      if (
        instituteId
      ) {
        return {
          valid: false,
          error:
            "مدير الإدارة لا يجب ربطه بمعهد",
        };
      }

      return {
        valid: true,
        error: null,
      };
    }

    /*
     * الأدوار المركزية الأخرى
     */

    if (
      role ===
      "deputy"
    ) {
      if (
        instituteId
      ) {
        return {
          valid: false,
          error:
            "وكيل الإدارة التعليمية لا يجب ربطه بمعهد",
        };
      }

      return {
        valid: true,
        error: null,
      };
    }

    /*
     * أدوار المعاهد
     */

    if (
      INSTITUTE_ROLES.includes(
        role
      )
    ) {
      if (
        !instituteId
      ) {
        return {
          valid: false,
          error:
            "يجب تحديد المعهد لهذا الدور",
        };
      }

      const {
        data: institute,
        error:
          instituteError,
      } =
        await admin
          .from(
            "institutes"
          )
          .select(
            "id, directorate_id"
          )
          .eq(
            "id",
            instituteId
          )
          .maybeSingle();

      if (
        instituteError ||
        !institute
      ) {
        return {
          valid: false,
          error:
            "المعهد المحدد غير موجود",
        };
      }

      if (
        institute.directorate_id !==
        caller.directorate_id
      ) {
        return {
          valid: false,
          error:
            "لا يمكنك إدارة معهد تابع لإدارة تعليمية أخرى",
        };
      }

      return {
        valid: true,
        error: null,
      };
    }

    /*
     * parent / student
     * يسمح لمدير الإدارة بإدارتهم
     * بشرط وجود المعهد عند استخدامه.
     */

    if (
      role ===
        "parent" ||
      role ===
        "student"
    ) {
      if (
        instituteId
      ) {
        const {
          data: institute,
          error:
            instituteError,
        } =
          await admin
            .from(
              "institutes"
            )
            .select(
              "id, directorate_id"
            )
            .eq(
              "id",
              instituteId
            )
            .maybeSingle();

        if (
          instituteError ||
          !institute
        ) {
          return {
            valid: false,
            error:
              "المعهد المحدد غير موجود",
          };
        }

        if (
          institute.directorate_id !==
          caller.directorate_id
        ) {
          return {
            valid: false,
            error:
              "المعهد لا يتبع إدارتك التعليمية",
          };
        }
      }

      return {
        valid: true,
        error: null,
      };
    }
  }

  return {
    valid: false,
    error:
      "غير مصرح بهذه العملية",
  };
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| تحميل المستخدمين للصفحة.
|
| super_admin / director:
|   كل مستخدمي الإدارة + المستخدمون المرتبطون بالطلاب.
|
| it_admin:
|   مستخدمو معهده فقط.
|
*/

export async function GET(
  request: NextRequest
) {
  try {
    const {
      error: callerError,
      caller,
    } =
      await getCaller(
        request
      );

    if (
      callerError ||
      !caller
    ) {
      return NextResponse.json(
        {
          error:
            callerError ||
            "غير مصرح بالطلب",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      getSupabaseAdmin();

    let institutes: Institute[] =
      [];

    /*
     * تحميل المعاهد
     */

    if (
      caller.role ===
      "it_admin"
    ) {
      if (
        !caller.institute_id
      ) {
        return NextResponse.json(
          {
            error:
              "مسؤول IT غير مرتبط بمعهد",
          },
          {
            status: 403,
          }
        );
      }

      const {
        data,
        error,
      } =
        await admin
          .from(
            "institutes"
          )
          .select(
            `
            id,
            name,
            code,
            directorate_id
            `
          )
          .eq(
            "id",
            caller.institute_id
          )
          .order(
            "name"
          );

      if (error) {
        console.error(
          "Institutes error:",
          error
        );

        return NextResponse.json(
          {
            error:
              "حدث خطأ أثناء تحميل المعهد",
          },
          {
            status: 500,
          }
        );
      }

      institutes =
        (data ||
          []) as Institute[];
    } else {
      const {
        data,
        error,
      } =
        await admin
          .from(
            "institutes"
          )
          .select(
            `
            id,
            name,
            code,
            directorate_id
            `
          )
          .eq(
            "directorate_id",
            caller.directorate_id
          )
          .order(
            "name"
          );

      if (error) {
        console.error(
          "Institutes error:",
          error
        );

        return NextResponse.json(
          {
            error:
              "حدث خطأ أثناء تحميل المعاهد",
          },
          {
            status: 500,
          }
        );
      }

      institutes =
        (data ||
          []) as Institute[];
    }

    const instituteIds =
      institutes.map(
        (item) =>
          item.id
      );

    /*
     * تحميل profiles الأساسية
     */

    let profilesQuery =
      admin
        .from(
          "profiles"
        )
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
        );

    if (
      caller.role ===
      "it_admin"
    ) {
      profilesQuery =
        profilesQuery.eq(
          "institute_id",
          caller.institute_id
        );
    } else {
      profilesQuery =
        profilesQuery.eq(
          "directorate_id",
          caller.directorate_id
        );
    }

    const {
      data: directUsers,
      error:
        directUsersError,
    } =
      await profilesQuery.order(
        "full_name"
      );

    if (directUsersError) {
      console.error(
        "Profiles error:",
        directUsersError
      );

      return NextResponse.json(
        {
          error:
            "حدث خطأ أثناء تحميل المستخدمين",
        },
        {
          status: 500,
        }
      );
    }

    const allUsersMap =
      new Map<
        string,
        Profile
      >();

    (
      (directUsers ||
        []) as Profile[]
    ).forEach(
      (profile) => {
        allUsersMap.set(
          profile.id,
          profile
        );
      }
    );

    /*
     * بالنسبة لمدير الإدارة:
     *
     * parent / student profiles
     * قد لا تحتوي على directorate_id.
     *
     * لذلك نبحث عن الطلاب التابعين لمعاهد الإدارة
     * ثم نضيف الطلاب وأولياء الأمور المرتبطين بهم.
     */

    if (
      caller.role !==
        "it_admin" &&
      instituteIds.length >
        0
    ) {
      const {
        data: students,
        error:
          studentsError,
      } =
        await admin
          .from(
            "students"
          )
          .select(
            `
            id,
            parent_id,
            institute_id
            `
          )
          .in(
            "institute_id",
            instituteIds
          );

      if (
        studentsError
      ) {
        console.error(
          "Students lookup error:",
          studentsError
        );
      } else {
        const studentIds =
          (
            students ||
            []
          ).map(
            (
              student
            ) =>
              student.id
          );

        const parentIds =
          Array.from(
            new Set(
              (
                students ||
                []
              )
                .map(
                  (
                    student
                  ) =>
                    student.parent_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
            )
          );

        /*
         * Profiles الطلاب
         */

        if (
          studentIds.length >
          0
        ) {
          const {
            data:
              studentProfiles,
            error:
              studentProfilesError,
          } =
            await admin
              .from(
                "profiles"
              )
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

          if (
            studentProfilesError
          ) {
            console.error(
              "Student profiles error:",
              studentProfilesError
            );
          } else {
            (
              (studentProfiles ||
                []) as Profile[]
            ).forEach(
              (
                profile
              ) => {
                allUsersMap.set(
                  profile.id,
                  profile
                );
              }
            );
          }
        }

        /*
         * Profiles أولياء الأمور
         */

        if (
          parentIds.length >
          0
        ) {
          const {
            data:
              parentProfiles,
            error:
              parentProfilesError,
          } =
            await admin
              .from(
                "profiles"
              )
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

          if (
            parentProfilesError
          ) {
            console.error(
              "Parent profiles error:",
              parentProfilesError
            );
          } else {
            (
              (parentProfiles ||
                []) as Profile[]
            ).forEach(
              (
                profile
              ) => {
                allUsersMap.set(
                  profile.id,
                  profile
                );
              }
            );
          }
        }
      }
    }

    const users =
      Array.from(
        allUsersMap.values()
      ).sort(
        (
          a,
          b
        ) =>
          a.full_name.localeCompare(
            b.full_name,
            "ar"
          )
      );

    return NextResponse.json(
      {
        users,
        institutes,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/users/create error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء تحميل المستخدمين",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST - Create User
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    const {
      error: callerError,
      caller,
    } =
      await getCaller(
        request
      );

    if (
      callerError ||
      !caller
    ) {
      return NextResponse.json(
        {
          error:
            callerError ||
            "غير مصرح بالطلب",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const fullName =
      typeof body.full_name ===
      "string"
        ? body.full_name.trim()
        : "";

    const phone =
      typeof body.phone ===
      "string"
        ? body.phone.trim()
        : "";

    const email =
      typeof body.email ===
      "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    const role =
      body.role as AllowedRole;

    const instituteId =
      body.institute_id ||
      null;

    const isActive =
      body.is_active !==
      false;

    /*
     * Basic validation
     */

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

    if (
      password.length <
      8
    ) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور يجب ألا تقل عن 8 أحرف",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_ROLES.includes(
        role
      )
    ) {
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
     * تحقق الصلاحيات والنطاق
     */

    const scope =
      await validateTargetScope(
        {
          caller,
          role,
          instituteId,
          directorateId:
            caller.directorate_id,
        }
      );

    if (!scope.valid) {
      return NextResponse.json(
        {
          error:
            scope.error ||
            "غير مصرح بهذه العملية",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * parent / student
     *
     * لا ننشئ حسابات Auth لهم من هذه الصفحة
     * إذا كان المشروع يعتمد على الحسابات الخاصة
     * الموجودة بالفعل.
     *
     * ولكن بما أن مدير الإدارة لديه الصلاحية،
     * نسمح بإنشاء profile بعد إنشاء Auth.
     */

    const admin =
      getSupabaseAdmin();

    /*
     * تأكد أن البريد غير مستخدم في Auth
     *
     * نستخدم createUser مباشرة.
     * Supabase سيرفض البريد المكرر.
     */

    const {
      data:
        authData,
      error:
        authError,
    } =
      await admin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm:
            true,
        }
      );

    if (
      authError ||
      !authData.user
    ) {
      console.error(
        "Auth create error:",
        authError
      );

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

    const authUserId =
      authData.user.id;

    /*
     * المدير المركزي
     *
     * directorate_id = caller directorate
     *
     * المعهد = null
     */

    let finalDirectorateId:
      | string
      | null =
      caller.directorate_id;

    let finalInstituteId:
      | string
      | null =
      instituteId;

    if (
      CENTRAL_ROLES.includes(
        role
      )
    ) {
      finalInstituteId =
        null;
    }

    /*
     * IT Admin وباقي أدوار المعاهد
     */

    if (
      INSTITUTE_ROLES.includes(
        role
      )
    ) {
      finalDirectorateId =
        caller.directorate_id;

      finalInstituteId =
        instituteId;
    }

    /*
     * parent / student
     */

    if (
      role ===
        "parent" ||
      role ===
        "student"
    ) {
      finalDirectorateId =
        caller.directorate_id;

      finalInstituteId =
        instituteId;
    }

    /*
     * إنشاء profile
     */

    const {
      data: profile,
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .insert({
          id: authUserId,

          full_name:
            fullName,

          phone:
            phone ||
            null,

          email,

          role,

          directorate_id:
            finalDirectorateId,

          institute_id:
            finalInstituteId,

          is_active:
            isActive,
        })
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
        .single();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "Profile create error:",
        profileError
      );

      /*
       * Rollback Auth user
       */

      await admin.auth.admin.deleteUser(
        authUserId
      );

      return NextResponse.json(
        {
          error:
            profileError?.message ||
            "تعذر إنشاء ملف المستخدم",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: profile,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/users/create error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء إنشاء المستخدم",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH - Update User
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: NextRequest
) {
  try {
    const {
      error: callerError,
      caller,
    } =
      await getCaller(
        request
      );

    if (
      callerError ||
      !caller
    ) {
      return NextResponse.json(
        {
          error:
            callerError ||
            "غير مصرح بالطلب",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const userId =
      typeof body.id ===
      "string"
        ? body.id
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

    const fullName =
      typeof body.full_name ===
      "string"
        ? body.full_name.trim()
        : "";

    const phone =
      typeof body.phone ===
      "string"
        ? body.phone.trim()
        : "";

    const email =
      typeof body.email ===
      "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const role =
      body.role as AllowedRole;

    const instituteId =
      body.institute_id ||
      null;

    const isActive =
      body.is_active !==
      false;

    const newPassword =
      typeof body.password ===
      "string"
        ? body.password
        : "";

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

    if (
      !ALLOWED_ROLES.includes(
        role
      )
    ) {
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
     * الحصول على المستخدم المستهدف
     */

    const admin =
      getSupabaseAdmin();

    const {
      data:
        targetUser,
      error:
        targetError,
    } =
      await admin
        .from(
          "profiles"
        )
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
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (
      targetError ||
      !targetUser
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

    /*
     * لا يمكن تعطيل الحساب الحالي
     */

    if (
      userId ===
        caller.id &&
      !isActive
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعطيل حساب المستخدم الحالي",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * لا يسمح لـ IT Admin بتعديل نفسه
     * إلى دور آخر أو نقل نفسه.
     */

    if (
      caller.role ===
      "it_admin"
    ) {
      if (
        userId !==
        caller.id
      ) {
        /*
         * لا يمكنه تعديل أي مستخدم
         * خارج معهدـه.
         */
        if (
          targetUser.institute_id !==
          caller.institute_id
        ) {
          return NextResponse.json(
            {
              error:
                "لا يمكنك إدارة مستخدم تابع لمعهد آخر",
            },
            {
              status: 403,
            }
          );
        }
      }

      /*
       * IT Admin لا يستطيع إنشاء/تعديل
       * دور IT Admin آخر.
       */
      if (
        targetUser.role ===
          "it_admin" &&
        userId !==
          caller.id
      ) {
        return NextResponse.json(
          {
            error:
              "لا يمكن لمسؤول IT تعديل مسؤول IT آخر",
          },
          {
            status: 403,
          }
        );
      }
    }

    /*
     * المدير لا يعدل مستخدمًا خارج إدارته
     */

    if (
      caller.role ===
        "super_admin" ||
      caller.role ===
        "director"
    ) {
      /*
       * super_admin / director
       * يستطيعان إدارة المستخدمين المرتبطين
       * بإدارتهم فقط.
       */

      const targetBelongsToDirectorate =
        targetUser.directorate_id ===
        caller.directorate_id;

      /*
       * parent/student قد لا يحتويان directorate_id.
       * في هذه الحالة نتحقق من institute.
       */

      let allowedByInstitute =
        false;

      if (
        targetUser.institute_id
      ) {
        const {
          data:
            targetInstitute,
        } =
          await admin
            .from(
              "institutes"
            )
            .select(
              "id, directorate_id"
            )
            .eq(
              "id",
              targetUser.institute_id
            )
            .maybeSingle();

        allowedByInstitute =
          Boolean(
            targetInstitute &&
              targetInstitute.directorate_id ===
                caller.directorate_id
          );
      }

      if (
        !targetBelongsToDirectorate &&
        !allowedByInstitute &&
        userId !==
          caller.id
      ) {
        return NextResponse.json(
          {
            error:
              "لا يمكنك إدارة مستخدم تابع لإدارة تعليمية أخرى",
          },
          {
            status: 403,
          }
        );
      }
    }

    /*
     * تحقق النطاق الجديد
     */

    const scope =
      await validateTargetScope(
        {
          caller,
          role,
          instituteId,
          directorateId:
            caller.directorate_id,
          targetUserId:
            userId,
        }
      );

    if (!scope.valid) {
      return NextResponse.json(
        {
          error:
            scope.error ||
            "غير مصرح بهذه العملية",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * منع المدير القديم من تحويل نفسه
     * أو أي حساب إلى director.
     */

    if (
      role ===
      "director"
    ) {
      return NextResponse.json(
        {
          error:
            "دور مدير الإدارة القديم غير متاح كدور جديد",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * منع IT Admin من تغيير نفسه
     * إلى دور مركزي.
     */

    if (
      caller.role ===
        "it_admin" &&
      userId ===
        caller.id &&
      role !==
        "it_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن لمسؤول IT تغيير دوره إلى دور إداري مركزي",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * بناء البيانات الجديدة
     */

    let finalDirectorateId:
      | string
      | null =
      caller.directorate_id;

    let finalInstituteId:
      | string
      | null =
      instituteId;

    if (
      CENTRAL_ROLES.includes(
        role
      )
    ) {
      finalInstituteId =
        null;
    }

    if (
      INSTITUTE_ROLES.includes(
        role
      )
    ) {
      finalDirectorateId =
        caller.directorate_id;

      finalInstituteId =
        instituteId;
    }

    if (
      role ===
        "parent" ||
      role ===
        "student"
    ) {
      finalDirectorateId =
        caller.directorate_id;

      finalInstituteId =
        instituteId;
    }

    /*
     * نحتفظ بـ directorate_id الحالي
     * عند تعديل حساب مركزي موجود.
     */

    if (
      role ===
        "super_admin" ||
      role ===
        "deputy"
    ) {
      finalDirectorateId =
        caller.directorate_id;
    }

    /*
     * تحديث Auth
     *
     * البريد في صفحة التعديل disabled،
     * لكن الـAPI يتعامل معه بأمان أيضًا.
     */

    const authUpdate: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
    } = {};

    if (
      email &&
      email !==
        (targetUser.email ||
          "")
          .trim()
          .toLowerCase()
    ) {
      authUpdate.email =
        email;

      authUpdate.email_confirm =
        true;
    }

    if (
      newPassword
    ) {
      if (
        newPassword.length <
        8
      ) {
        return NextResponse.json(
          {
            error:
              "كلمة المرور يجب ألا تقل عن 8 أحرف",
          },
          {
            status: 400,
          }
        );
      }

      authUpdate.password =
        newPassword;
    }

    if (
      Object.keys(
        authUpdate
      ).length >
      0
    ) {
      const {
        error:
          authUpdateError,
      } =
        await admin.auth.admin.updateUserById(
          userId,
          authUpdate
        );

      if (
        authUpdateError
      ) {
        console.error(
          "Auth update error:",
          authUpdateError
        );

        return NextResponse.json(
          {
            error:
              authUpdateError.message ||
              "تعذر تحديث حساب الدخول",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * تحديث profile
     */

    const {
      data:
        updatedProfile,
      error:
        updateError,
    } =
      await admin
        .from(
          "profiles"
        )
        .update({
          full_name:
            fullName,

          phone:
            phone ||
            null,

          email:
            email ||
            null,

          role,

          directorate_id:
            finalDirectorateId,

          institute_id:
            finalInstituteId,

          is_active:
            isActive,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          userId
        )
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
        .single();

    if (
      updateError ||
      !updatedProfile
    ) {
      console.error(
        "Profile update error:",
        updateError
      );

      /*
       * في حالة فشل profile لا نحاول حذف
       * المستخدم من Auth لأن Auth كان موجودًا
       * قبل عملية التعديل.
       */

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "تعذر تحديث بيانات المستخدم",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user:
          updatedProfile,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PATCH /api/users/create error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء تحديث المستخدم",
      },
      {
        status: 500,
      }
    );
  }
}
