"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MessageCircleWarning,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

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

type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  institute_id: string | null;
  directorate_id: string | null;
  is_active: boolean;
};

type Student = {
  id: string;
  full_name: string;
  student_code: string | null;
  institute_id: string;
  parent_id: string | null;
  is_active: boolean;
};

type Institute = {
  id: string;
  name: string;
  code: string | null;
  directorate_id: string;
};

type Complaint = {
  id: string;
  parent_id: string;
  student_id: string;
  institute_id: string;
  directorate_id: string;
  title: string;
  complaint_type: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  status:
    | "new"
    | "under_review"
    | "in_progress"
    | "resolved"
    | "escalated"
    | "admin_review"
    | "admin_resolved";
  institute_response: string | null;
  institute_responded_at: string | null;
  escalated_at: string | null;
  escalated_by: string | null;
  escalation_reason: string | null;
  admin_response: string | null;
  admin_responded_at: string | null;
  parent_follow_up_requested: boolean;
  parent_follow_up_at: string | null;
  created_at: string;
  updated_at: string;

  student?: Student;
  institute?: Institute;
};

const statusLabels: Record<Complaint["status"], string> = {
  new: "جديدة",
  under_review: "قيد المراجعة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  escalated: "مصعدة للمدير",
  admin_review: "قيد مراجعة المدير",
  admin_resolved: "تم الحل إداريًا",
};

const statusClasses: Record<Complaint["status"], string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-purple-50 text-purple-700 border-purple-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  escalated: "bg-red-50 text-red-700 border-red-200",
  admin_review: "bg-orange-50 text-orange-700 border-orange-200",
  admin_resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const priorityLabels: Record<Complaint["priority"], string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

const complaintTypes = [
  "عام",
  "تعليمي",
  "إداري",
  "سلوك",
  "حضور وغياب",
  "رسوم ومصروفات",
  "مرافق",
  "تكنولوجيا",
  "أخرى",
];

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ParentComplaintsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);

  const [showInstituteModal, setShowInstituteModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("عام");
  const [newPriority, setNewPriority] =
    useState<Complaint["priority"]>("normal");
  const [newDescription, setNewDescription] = useState("");

  const [instituteStatus, setInstituteStatus] =
    useState<"new" | "under_review" | "in_progress" | "resolved">("new");
  const [instituteResponse, setInstituteResponse] = useState("");
  const [escalationReason, setEscalationReason] = useState("");

  const [adminStatus, setAdminStatus] =
    useState<"admin_review" | "admin_resolved">("admin_review");
  const [adminResponse, setAdminResponse] = useState("");

  const [message, setMessage] = useState("");

  const isParent = profile?.role === "parent";
  const isInstituteUser = ["sheikh", "deputy", "employee"].includes(
    profile?.role || ""
  );
  const isDirector =
    profile?.role === "director" || profile?.role === "super_admin";

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        setMessage("لم يتم العثور على المستخدم الحالي.");
        return;
      }

      const userId = authData.user.id;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, institute_id, directorate_id, is_active"
        )
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(profileError);
        setMessage("تعذر تحميل بيانات المستخدم.");
        return;
      }

      setProfile(profileData as Profile);

      let studentRows: Student[] = [];
      let instituteRows: Institute[] = [];

      if (profileData.role === "parent") {
        const { data: parentStudents, error: studentsError } = await supabase
          .from("students")
          .select(
            "id, full_name, student_code, institute_id, parent_id, is_active"
          )
          .eq("parent_id", userId)
          .eq("is_active", true)
          .order("full_name");

        if (studentsError) {
          console.error(studentsError);
        } else {
          studentRows = (parentStudents || []) as Student[];
        }

        const instituteIds = [
          ...new Set(studentRows.map((student) => student.institute_id)),
        ];

        if (instituteIds.length > 0) {
          const { data: instituteData } = await supabase
            .from("institutes")
            .select("id, name, code, directorate_id")
            .in("id", instituteIds);

          instituteRows = (instituteData || []) as Institute[];
        }
      } else if (profileData.role === "sheikh" && profileData.institute_id) {
        const { data: instituteData } = await supabase
          .from("institutes")
          .select("id, name, code, directorate_id")
          .eq("id", profileData.institute_id)
          .single();

        if (instituteData) {
          instituteRows = [instituteData as Institute];
        }
      } else if (
        (profileData.role === "director" ||
          profileData.role === "super_admin") &&
        profileData.directorate_id
      ) {
        const { data: instituteData } = await supabase
          .from("institutes")
          .select("id, name, code, directorate_id")
          .eq("directorate_id", profileData.directorate_id)
          .order("name");

        instituteRows = (instituteData || []) as Institute[];
      }

      setStudents(studentRows);
      setInstitutes(instituteRows);

      let query = supabase
        .from("parent_complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (profileData.role === "parent") {
        query = query.eq("parent_id", userId);
      } else if (profileData.role === "sheikh" && profileData.institute_id) {
        query = query.eq("institute_id", profileData.institute_id);
      } else if (
        profileData.role === "director" &&
        profileData.directorate_id
      ) {
        query = query.eq("directorate_id", profileData.directorate_id);
      } else if (profileData.role === "super_admin") {
        // Super admin sees all complaints.
      } else {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }

      const { data: complaintData, error: complaintsError } = await query;

      if (complaintsError) {
        console.error(complaintsError);
        setMessage("تعذر تحميل شكاوى أولياء الأمور.");
        return;
      }

      const rows = (complaintData || []) as Complaint[];

      const studentIds = [...new Set(rows.map((row) => row.student_id))];
      const instituteIds = [...new Set(rows.map((row) => row.institute_id))];

      let complaintStudents: Student[] = [];
      let complaintInstitutes: Institute[] = [];

      if (studentIds.length > 0) {
        const { data } = await supabase
          .from("students")
          .select(
            "id, full_name, student_code, institute_id, parent_id, is_active"
          )
          .in("id", studentIds);

        complaintStudents = (data || []) as Student[];
      }

      if (instituteIds.length > 0) {
        const { data } = await supabase
          .from("institutes")
          .select("id, name, code, directorate_id")
          .in("id", instituteIds);

        complaintInstitutes = (data || []) as Institute[];
      }

      const enriched = rows.map((row) => ({
        ...row,
        student: complaintStudents.find(
          (student) => student.id === row.student_id
        ),
        institute: complaintInstitutes.find(
          (institute) => institute.id === row.institute_id
        ),
      }));

      setComplaints(enriched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        complaint.title.toLowerCase().includes(search) ||
        complaint.description.toLowerCase().includes(search) ||
        (complaint.student?.full_name || "").toLowerCase().includes(search) ||
        (complaint.institute?.name || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || complaint.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [complaints, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      new: complaints.filter((c) => c.status === "new").length,
      processing: complaints.filter((c) =>
        ["under_review", "in_progress", "admin_review"].includes(c.status)
      ).length,
      escalated: complaints.filter((c) => c.status === "escalated").length,
      resolved: complaints.filter((c) =>
        ["resolved", "admin_resolved"].includes(c.status)
      ).length,
    };
  }, [complaints]);

  function resetCreateForm() {
    setSelectedStudentId("");
    setNewTitle("");
    setNewType("عام");
    setNewPriority("normal");
    setNewDescription("");
  }

  async function createComplaint() {
    if (!profile || !isParent) return;

    if (!selectedStudentId) {
      setMessage("من فضلك اختاري الطالب.");
      return;
    }

    if (!newTitle.trim()) {
      setMessage("من فضلك اكتبي عنوان الشكوى.");
      return;
    }

    if (!newDescription.trim()) {
      setMessage("من فضلك اكتبي تفاصيل الشكوى.");
      return;
    }

    const student = students.find((item) => item.id === selectedStudentId);

    if (!student) {
      setMessage("لم يتم العثور على بيانات الطالب.");
      return;
    }

    const institute = institutes.find(
      (item) => item.id === student.institute_id
    );

    if (!institute) {
      setMessage("لم يتم العثور على المعهد المرتبط بالطالب.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const { data, error } = await supabase
        .from("parent_complaints")
        .insert({
          parent_id: profile.id,
          student_id: student.id,
          institute_id: institute.id,
          directorate_id: institute.directorate_id,
          title: newTitle.trim(),
          complaint_type: newType,
          description: newDescription.trim(),
          priority: newPriority,
          status: "new",
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        setMessage(`تعذر إرسال الشكوى: ${error.message}`);
        return;
      }

      await supabase.from("parent_complaint_updates").insert({
        complaint_id: data.id,
        actor_id: profile.id,
        actor_role: profile.role,
        action: "created",
        note: "تم تقديم الشكوى بواسطة ولي الأمر.",
      });

      setShowCreateModal(false);
      resetCreateForm();
      setMessage("تم إرسال الشكوى بنجاح، وأصبحت ظاهرة للمعهد والإدارة.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function openInstituteModal(complaint: Complaint) {
    setSelectedComplaint(complaint);
    setInstituteResponse(complaint.institute_response || "");
    setInstituteStatus(
      complaint.status === "new" ||
        complaint.status === "under_review" ||
        complaint.status === "in_progress" ||
        complaint.status === "resolved"
        ? complaint.status
        : "new"
    );
    setEscalationReason(complaint.escalation_reason || "");
    setShowInstituteModal(true);
  }

  async function updateInstituteComplaint() {
    if (!profile || !selectedComplaint) return;

    if (!instituteResponse.trim()) {
      setMessage("من فضلك اكتبي رد المعهد.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const updateData: Record<string, unknown> = {
        status: instituteStatus,
        institute_response: instituteResponse.trim(),
        institute_responded_at: new Date().toISOString(),
        institute_responded_by: profile.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("parent_complaints")
        .update(updateData)
        .eq("id", selectedComplaint.id);

      if (error) {
        console.error(error);
        setMessage(`تعذر تحديث الشكوى: ${error.message}`);
        return;
      }

      await supabase.from("parent_complaint_updates").insert({
        complaint_id: selectedComplaint.id,
        actor_id: profile.id,
        actor_role: profile.role,
        action:
          instituteStatus === "resolved"
            ? "resolved_by_institute"
            : "institute_response",
        note: instituteResponse.trim(),
      });

      setShowInstituteModal(false);
      setSelectedComplaint(null);
      setMessage("تم تحديث الشكوى بنجاح.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function escalateComplaint() {
    if (!profile || !selectedComplaint) return;

    if (!escalationReason.trim()) {
      setMessage("من فضلك اكتبي سبب التصعيد إلى مدير الإدارة.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const { error } = await supabase
        .from("parent_complaints")
        .update({
          status: "escalated",
          escalated_at: new Date().toISOString(),
          escalated_by: profile.id,
          escalation_reason: escalationReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedComplaint.id);

      if (error) {
        console.error(error);
        setMessage(`تعذر تصعيد الشكوى: ${error.message}`);
        return;
      }

      await supabase.from("parent_complaint_updates").insert({
        complaint_id: selectedComplaint.id,
        actor_id: profile.id,
        actor_role: profile.role,
        action: "escalated_to_director",
        note: escalationReason.trim(),
      });

      setShowInstituteModal(false);
      setSelectedComplaint(null);
      setEscalationReason("");
      setMessage("تم تصعيد الشكوى إلى مدير الإدارة.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function openAdminModal(complaint: Complaint) {
    setSelectedComplaint(complaint);
    setAdminResponse(complaint.admin_response || "");
    setAdminStatus(
      complaint.status === "admin_resolved"
        ? "admin_resolved"
        : "admin_review"
    );
    setShowAdminModal(true);
  }

  async function updateAdminComplaint() {
    if (!profile || !selectedComplaint || !isDirector) return;

    if (!adminResponse.trim()) {
      setMessage("من فضلك اكتبي رد مدير الإدارة.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const { error } = await supabase
        .from("parent_complaints")
        .update({
          status: adminStatus,
          admin_response: adminResponse.trim(),
          admin_responded_at: new Date().toISOString(),
          admin_responded_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedComplaint.id);

      if (error) {
        console.error(error);
        setMessage(`تعذر حفظ إجراء مدير الإدارة: ${error.message}`);
        return;
      }

      await supabase.from("parent_complaint_updates").insert({
        complaint_id: selectedComplaint.id,
        actor_id: profile.id,
        actor_role: profile.role,
        action:
          adminStatus === "admin_resolved"
            ? "admin_resolved"
            : "admin_review",
        note: adminResponse.trim(),
      });

      setShowAdminModal(false);
      setSelectedComplaint(null);
      setMessage("تم حفظ إجراء مدير الإدارة.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function requestFollowUp(complaint: Complaint) {
    if (!profile || !isParent) return;

    try {
      setSaving(true);
      setMessage("");

      const { error } = await supabase
        .from("parent_complaints")
        .update({
          parent_follow_up_requested: true,
          parent_follow_up_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", complaint.id)
        .eq("parent_id", profile.id);

      if (error) {
        console.error(error);
        setMessage(`تعذر تسجيل طلب المتابعة: ${error.message}`);
        return;
      }

      await supabase.from("parent_complaint_updates").insert({
        complaint_id: complaint.id,
        actor_id: profile.id,
        actor_role: profile.role,
        action: "parent_follow_up",
        note: "طلب ولي الأمر متابعة الشكوى.",
      });

      setMessage("تم تسجيل طلب المتابعة.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function getStatusDescription(status: Complaint["status"]) {
    switch (status) {
      case "new":
        return "تم استلام الشكوى ولم تبدأ المعالجة بعد.";
      case "under_review":
        return "المعهد يراجع تفاصيل الشكوى.";
      case "in_progress":
        return "المعهد يعمل حاليًا على معالجة الشكوى.";
      case "resolved":
        return "تم حل الشكوى بواسطة المعهد.";
      case "escalated":
        return "تم تصعيد الشكوى إلى مدير الإدارة للتدخل الرسمي.";
      case "admin_review":
        return "مدير الإدارة يراجع الشكوى ويتخذ الإجراء المناسب.";
      case "admin_resolved":
        return "تم إغلاق الشكوى بإجراء من مدير الإدارة.";
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-l from-indigo-700 via-indigo-600 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-2xl bg-white/15 p-3">
                  <MessageCircleWarning size={30} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold">
                    شكاوى أولياء الأمور
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    متابعة الشكوى من ولي الأمر حتى المعهد ثم مدير الإدارة عند
                    الحاجة
                  </p>
                </div>
              </div>

              {profile && (
                <p className="text-sm text-blue-100">
                  المستخدم الحالي:{" "}
                  <span className="font-semibold text-white">
                    {profile.full_name || "مستخدم النظام"}
                  </span>
                </p>
              )}
            </div>

            {isParent && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-indigo-700 shadow transition hover:bg-blue-50"
              >
                <Plus size={19} />
                تقديم شكوى جديدة
              </button>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="إجمالي الشكاوى"
            value={stats.total}
            icon={<FileText size={22} />}
          />

          <StatCard
            title="جديدة"
            value={stats.new}
            icon={<AlertCircle size={22} />}
          />

          <StatCard
            title="قيد المعالجة"
            value={stats.processing}
            icon={<Clock3 size={22} />}
          />

          <StatCard
            title="مصعدة للمدير"
            value={stats.escalated}
            icon={<ArrowUpCircle size={22} />}
          />

          <StatCard
            title="تم الحل"
            value={stats.resolved}
            icon={<CheckCircle2 size={22} />}
          />
        </div>

        {/* Filters */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بعنوان الشكوى أو الطالب أو المعهد..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-400"
            >
              <option value="all">كل الحالات</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <button
              onClick={loadData}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={18} />
              تحديث
            </button>
          </div>
        </div>

        {/* Workflow */}
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-indigo-900">
            <ShieldCheck size={21} />
            مسار التعامل مع الشكوى
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <WorkflowStep
              number="1"
              title="ولي الأمر"
              text="يقدم الشكوى ويربطها بالطالب."
            />

            <WorkflowStep
              number="2"
              title="المعهد"
              text="يراجع الشكوى ويحاول حلها."
            />

            <WorkflowStep
              number="3"
              title="التصعيد"
              text="إذا تعذر الحل يتم تصعيدها للمدير."
            />

            <WorkflowStep
              number="4"
              title="مدير الإدارة"
              text="يتدخل رسميًا بعد التصعيد."
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              قائمة الشكاوى
            </h2>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-slate-500">
              جارٍ تحميل الشكاوى...
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <MessageCircleWarning
                size={44}
                className="mb-3 text-slate-300"
              />
              <p className="font-semibold text-slate-700">
                لا توجد شكاوى لعرضها
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {isParent
                  ? "يمكنك تقديم شكوى جديدة من الزر أعلى الصفحة."
                  : "ستظهر هنا شكاوى أولياء الأمور المرتبطة بالمعاهد التابعة لك."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-right">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-5 py-4">الشكوى</th>
                    <th className="px-5 py-4">الطالب</th>
                    <th className="px-5 py-4">المعهد</th>
                    <th className="px-5 py-4">الأولوية</th>
                    <th className="px-5 py-4">الحالة</th>
                    <th className="px-5 py-4">التاريخ</th>
                    <th className="px-5 py-4">إجراء</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-slate-900">
                            {complaint.title}
                          </p>

                          <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                            {complaint.description}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <UserRound size={17} className="text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-800">
                              {complaint.student?.full_name || "—"}
                            </p>

                            {complaint.student?.student_code && (
                              <p className="text-xs text-slate-500">
                                {complaint.student.student_code}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {complaint.institute?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {priorityLabels[complaint.priority]}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[complaint.status]}`}
                        >
                          {statusLabels[complaint.status]}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(complaint.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedComplaint(complaint)}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={15} />
                            التفاصيل
                          </button>

                          {isInstituteUser &&
                            !["resolved", "escalated", "admin_review", "admin_resolved"].includes(
                              complaint.status
                            ) && (
                              <button
                                onClick={() =>
                                  openInstituteModal(complaint)
                                }
                                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                              >
                                متابعة المعهد
                              </button>
                            )}

                          {isDirector &&
                            ["escalated", "admin_review"].includes(
                              complaint.status
                            ) && (
                              <button
                                onClick={() => openAdminModal(complaint)}
                                className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                              >
                                <ShieldCheck size={15} />
                                تدخل المدير
                              </button>
                            )}

                          {isParent &&
                            !["admin_resolved"].includes(
                              complaint.status
                            ) && (
                              <button
                                onClick={() =>
                                  requestFollowUp(complaint)
                                }
                                disabled={
                                  complaint.parent_follow_up_requested ||
                                  saving
                                }
                                className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Send size={14} />
                                {complaint.parent_follow_up_requested
                                  ? "تم طلب المتابعة"
                                  : "طلب متابعة"}
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedComplaint &&
        !showInstituteModal &&
        !showAdminModal && (
          <Modal
            title="تفاصيل الشكوى"
            onClose={() => setSelectedComplaint(null)}
          >
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedComplaint.title}
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[selectedComplaint.status]}`}
                  >
                    {statusLabels[selectedComplaint.status]}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    الأولوية:{" "}
                    {priorityLabels[selectedComplaint.priority]}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    النوع: {selectedComplaint.complaint_type}
                  </span>
                </div>
              </div>

              <InfoBox
                label="الطالب"
                value={selectedComplaint.student?.full_name || "—"}
              />

              <InfoBox
                label="المعهد"
                value={selectedComplaint.institute?.name || "—"}
              />

              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">
                  تفاصيل الشكوى
                </p>

                <div className="rounded-2xl bg-slate-50 p-4 leading-7 text-slate-700">
                  {selectedComplaint.description}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-1 text-sm font-bold text-blue-900">
                  حالة الشكوى
                </p>
                <p className="text-sm leading-6 text-blue-800">
                  {getStatusDescription(selectedComplaint.status)}
                </p>
              </div>

              {selectedComplaint.institute_response && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="mb-2 font-bold text-indigo-900">
                    رد المعهد
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-indigo-800">
                    {selectedComplaint.institute_response}
                  </p>
                  <p className="mt-2 text-xs text-indigo-500">
                    {formatDate(selectedComplaint.institute_responded_at)}
                  </p>
                </div>
              )}

              {selectedComplaint.escalation_reason && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="mb-2 font-bold text-red-900">
                    سبب التصعيد
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-red-800">
                    {selectedComplaint.escalation_reason}
                  </p>
                  <p className="mt-2 text-xs text-red-500">
                    {formatDate(selectedComplaint.escalated_at)}
                  </p>
                </div>
              )}

              {selectedComplaint.admin_response && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="mb-2 font-bold text-emerald-900">
                    إجراء مدير الإدارة
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-emerald-800">
                    {selectedComplaint.admin_response}
                  </p>
                  <p className="mt-2 text-xs text-emerald-600">
                    {formatDate(selectedComplaint.admin_responded_at)}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          title="تقديم شكوى جديدة"
          onClose={() => {
            setShowCreateModal(false);
            resetCreateForm();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                الطالب
              </label>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              >
                <option value="">اختاري الطالب</option>

                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                    {student.student_code
                      ? ` — ${student.student_code}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                عنوان الشكوى
              </label>

              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: مشكلة في متابعة الحضور"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  نوع الشكوى
                </label>

                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
                >
                  {complaintTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  الأولوية
                </label>

                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(
                      e.target.value as Complaint["priority"]
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
                >
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                تفاصيل الشكوى
              </label>

              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={6}
                placeholder="اكتبي تفاصيل المشكلة بوضوح..."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              سيتم إرسال الشكوى مباشرة إلى المعهد، وستكون مرئية أيضًا لمدير
              الإدارة للمتابعة. تدخل المدير الرسمي يبدأ فقط عند تصعيد الشكوى
              من المعهد.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-700"
              >
                إلغاء
              </button>

              <button
                onClick={createComplaint}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"
              >
                <Send size={17} />
                {saving ? "جارٍ الإرسال..." : "إرسال الشكوى"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Institute Modal */}
      {showInstituteModal && selectedComplaint && (
        <Modal
          title="متابعة الشكوى من المعهد"
          onClose={() => {
            setShowInstituteModal(false);
            setSelectedComplaint(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-900">
                {selectedComplaint.title}
              </p>

              <p className="mt-2 text-sm text-slate-600">
                الطالب:{" "}
                <span className="font-semibold">
                  {selectedComplaint.student?.full_name || "—"}
                </span>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                حالة المعالجة
              </label>

              <select
                value={instituteStatus}
                onChange={(e) =>
                  setInstituteStatus(
                    e.target.value as
                      | "new"
                      | "under_review"
                      | "in_progress"
                      | "resolved"
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              >
                <option value="new">جديدة</option>
                <option value="under_review">قيد المراجعة</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="resolved">تم الحل</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                رد المعهد
              </label>

              <textarea
                value={instituteResponse}
                onChange={(e) => setInstituteResponse(e.target.value)}
                rows={5}
                placeholder="اكتبي ما تم اتخاذه من إجراءات..."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="mb-2 font-bold text-red-900">
                تصعيد إلى مدير الإدارة
              </p>

              <p className="mb-3 text-sm leading-6 text-red-700">
                استخدمي التصعيد فقط إذا تعذر على المعهد حل المشكلة.
              </p>

              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={3}
                placeholder="سبب التصعيد..."
                className="w-full resize-none rounded-2xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-400"
              />

              <button
                onClick={escalateComplaint}
                disabled={saving}
                className="mt-3 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <ArrowUpCircle size={17} />
                تصعيد إلى مدير الإدارة
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInstituteModal(false);
                  setSelectedComplaint(null);
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-700"
              >
                إلغاء
              </button>

              <button
                onClick={updateInstituteComplaint}
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ تحديث المعهد"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Modal */}
      {showAdminModal && selectedComplaint && (
        <Modal
          title="تدخل مدير الإدارة"
          onClose={() => {
            setShowAdminModal(false);
            setSelectedComplaint(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <ShieldCheck size={20} />
                شكوى تم تصعيدها رسميًا
              </div>

              <p className="mt-2 text-sm leading-6 text-red-800">
                {selectedComplaint.escalation_reason ||
                  "تم تصعيد الشكوى من المعهد."}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-900">
                {selectedComplaint.title}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {selectedComplaint.description}
              </p>
            </div>

            {selectedComplaint.institute_response && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="mb-2 font-bold text-indigo-900">
                  رد المعهد
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-indigo-800">
                  {selectedComplaint.institute_response}
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                الإجراء
              </label>

              <select
                value={adminStatus}
                onChange={(e) =>
                  setAdminStatus(
                    e.target.value as "admin_review" | "admin_resolved"
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-red-400"
              >
                <option value="admin_review">قيد مراجعة المدير</option>
                <option value="admin_resolved">تم الحل إداريًا</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                توجيه / رد مدير الإدارة
              </label>

              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={6}
                placeholder="اكتبي توجيه مدير الإدارة أو الإجراء الذي تم اتخاذه..."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-red-400"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setSelectedComplaint(null);
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-700"
              >
                إلغاء
              </button>

              <button
                onClick={updateAdminComplaint}
                disabled={saving}
                className="rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ إجراء المدير"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
          {number}
        </div>

        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>

      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
