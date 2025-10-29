import React, { useEffect, useState, useRef } from "react";
import ModalPortal from "../../components/ModalPortal";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../components/NotificationSystem";
import { getStorageUrl } from "../../config/api";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  Eye,
  User,
  RefreshCw,
  ChevronDown,
  Check,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Plus,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import SimpleChart from "../../components/SimpleChart";
import SkeletonLoader from "../../components/SkeletonLoader";
import TodoExportModal from "../../components/TodoExportModal";

const AdminTodos = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [todos, setTodos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [todoTab, setTodoTab] = useState("all"); // tabs retained for UI but list shows all
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  // removed status/user dropdown filters
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    todo_type: "rutin",
    target_category: "all",
    target_user_id: "",
    selected_user_ids: [],
    recurrence_start_date: "",
    recurrence_interval: 1,
    recurrence_unit: "day",
    recurrence_count: 0,
    occurrences_per_interval: 1,
    days_of_week: [],
    // for tambahan: custom date-time (single occurrence)
    scheduled_date: "",
    target_start_at: "",
    target_end_at: "",
    // New fields for duration calculation
    target_duration_value: "",
    target_duration_unit: "minutes",
  });
  // Time range filter: today | this_week | this_month | this_year | custom YYYY-MM-DD
  const [dateFilter, setDateFilter] = useState("all");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [statusSearchTerm, setStatusSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const statusDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const [evaluationData, setEvaluationData] = useState({
    action: "approve",
    notes: "",
    warningPoints: 0,
    warningNote: "",
    rating: 0,
  });
  // Create modal preview for routine
  const [createRoutinePreviewCount, setCreateRoutinePreviewCount] = useState(0); // total across users
  const [createRoutinePreviewPerUser, setCreateRoutinePreviewPerUser] =
    useState(0);
  const [createRoutinePreviewUsers, setCreateRoutinePreviewUsers] = useState(0);
  const [createRoutinePreviewHorizon, setCreateRoutinePreviewHorizon] =
    useState("");
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [createSummary, setCreateSummary] = useState(null);
  const [isCreating, setIsCreating] = useState(false); // prevent double submit
  const [showRoutineDetail, setShowRoutineDetail] = useState(false);
  const [routineDetail, setRoutineDetail] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal specific states for user selection
  const [modalUserSearch, setModalUserSearch] = useState("");
  const [assignAllInCategory, setAssignAllInCategory] = useState(false);

  // Helpers to display translated category labels instead of raw keys
  const formatTargetCategory = (category) => {
    switch (category) {
      case "ob":
        return t("todos.officeBoy", { defaultValue: "Office Boy" });
      case "driver":
        return t("todos.driverEquipment", { defaultValue: "Driver" });
      case "security":
        return t("todos.securityEquipment", { defaultValue: "Security" });
      case "magang_pkl":
        return t("common.employeeTypes.magang_pkl", {
          defaultValue: "Magang/PKL",
        });
      case "all":
        return t("common.allCategories", { defaultValue: "All Categories" });
      default:
        return category || t("common.unknown", { defaultValue: "Unknown" });
    }
  };

  const _formatRecurrence = (t) => {
    const interval = t?.recurrence_interval || 1;
    const unitRaw = t?.recurrence_unit || "day";
    const unit = unitRaw.charAt(0).toUpperCase() + unitRaw.slice(1);
    const countVal = t?.recurrence_count;
    const count =
      countVal === 0 || countVal === null || countVal === undefined
        ? "∞"
        : countVal;
    return `Every ${interval} ${unit}${interval > 1 ? "s" : ""} × ${count}`;
  };

  // Detailed routine pattern in Indonesian, including days and start date
  const formatRoutinePattern = (t) => {
    if (!t) return "";
    const interval = t.recurrence_interval || 1;
    const unit = t.recurrence_unit || "day";
    const unitId =
      unit === "day"
        ? "hari"
        : unit === "week"
        ? "minggu"
        : unit === "month"
        ? "bulan"
        : "tahun";
    const startStr = (() => {
      const d = t.recurrence_start_date
        ? new Date(t.recurrence_start_date)
        : null;
      if (!d || isNaN(d.getTime())) return "";
      try {
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch {
        const dd = String(d.getDate());
        const mm = String(d.getMonth() + 1);
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
      }
    })();
    let daysStr = "";
    if (
      unit === "week" &&
      Array.isArray(t.days_of_week) &&
      t.days_of_week.length > 0
    ) {
      const idDays = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      const sorted = t.days_of_week.slice().sort((a, b) => a - b);
      const dayNames = sorted.map((d) => idDays[d] || d);
      if (dayNames.length === 1) {
        daysStr = dayNames[0];
      } else if (dayNames.length === 2) {
        daysStr = dayNames.join(" dan ");
      } else {
        daysStr =
          dayNames.slice(0, -1).join(", ") +
          " dan " +
          dayNames[dayNames.length - 1];
      }
    }
    const pattern = `Setiap ${interval} ${unitId}`;
    if (unit === "week" && daysStr) {
      return startStr
        ? `${pattern} pada hari ${daysStr}, berlaku mulai ${startStr}`
        : `${pattern} pada hari ${daysStr}`;
    }
    return startStr ? `${pattern}, berlaku mulai ${startStr}` : pattern;
  };

  // Short, mobile-friendly routine label
  const formatRoutinePatternShort = (t) => {
    if (!t) return "";
    const interval = t.recurrence_interval || 1;
    const unit = t.recurrence_unit || "day";
    const unitShort =
      unit === "day"
        ? "H"
        : unit === "week"
        ? "Mgg"
        : unit === "month"
        ? "Bln"
        : "Thn";
    const startStr = (() => {
      const d = t.recurrence_start_date
        ? new Date(t.recurrence_start_date)
        : null;
      if (!d || isNaN(d.getTime())) return "";
      try {
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        const dd = String(d.getDate());
        const mm = String(d.getMonth() + 1);
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
      }
    })();
    let daysStr = "";
    if (
      unit === "week" &&
      Array.isArray(t.days_of_week) &&
      t.days_of_week.length > 0
    ) {
      const idDaysShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const sorted = t.days_of_week.slice().sort((a, b) => a - b);
      daysStr = sorted.map((d) => idDaysShort[d] || d).join("·");
    }
    // examples: "1 Mgg • Sen·Sel • 1 Okt 2025" or "1 H • 1 Okt 2025"
    const base = `${interval} ${unitShort}`;
    if (unit === "week" && daysStr) {
      return `${base} • ${daysStr} • ${startStr}`;
    }
    return `${base} • ${startStr}`;
  };

  // Filters for group user list inside cards
  const [_groupUserSearch, _setGroupUserSearch] = useState("");
  const [groupSearchByKey, setGroupSearchByKey] = useState({});
  const [groupCategoryFilter, setGroupCategoryFilter] = useState("all"); // all|ob|driver|security
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [evalFilter, setEvalFilter] = useState("all"); // all | to_evaluate | evaluated
  const PAGE_SIZE = 5;
  const [groupUserPageByKey, setGroupUserPageByKey] = useState({}); // { [groupKey]: page }
  const [groupTaskPageByKey, setGroupTaskPageByKey] = useState({}); // { [groupKey-userId]: page }

  // Edit Routine modal state
  const [showEditRoutineModal, setShowEditRoutineModal] = useState(false);
  const [routineGroupEdited, setRoutineGroupEdited] = useState(null); // holds group object
  const [routineForm, setRoutineForm] = useState({
    title: "",
    description: "",
    todo_type: "rutin",
    target_category: "all",
    selected_user_ids: [],
    recurrence_start_date: "",
    recurrence_interval: 1,
    recurrence_unit: "day",
    recurrence_count: 0,
    occurrences_per_interval: 1,
    days_of_week: [],
  });
  const [routineStrategy, setRoutineStrategy] = useState("future_only"); // future_only | delete_recreate
  const [routinePreviewCount, setRoutinePreviewCount] = useState(0);

  // Group routine todos by title + recurrence signature
  const routineGroups = React.useMemo(() => {
    const groups = new Map();
    for (const t of todos) {
      if ((t.todo_type || "rutin") !== "rutin") continue;
      const key = [
        t.title,
        t.recurrence_interval || 1,
        t.recurrence_unit || "day",
        t.recurrence_count ?? 0,
      ].join("|");
      if (!groups.has(key)) groups.set(key, { key, title: t.title, todos: [] });
      groups.get(key).todos.push(t);
    }
    return Array.from(groups.values()).map((g) => {
      const userIds = Array.from(new Set(g.todos.map((x) => x.user_id)));
      const enrichedUsers = userIds.map((id) => {
        const u = users.find((uu) => uu.id === id);
        return {
          id,
          name: u?.name || `User ${id}`,
          category: u?.category || "-",
        };
      });
      // Synthesize a consistent definition from the group's occurrences
      const withUnit = g.todos.find((x) => !!x.recurrence_unit);
      const withStart = g.todos.filter((x) => !!x.recurrence_start_date);
      const withDays = g.todos.filter(
        (x) => Array.isArray(x.days_of_week) && x.days_of_week.length > 0
      );
      const defUnit =
        withUnit?.recurrence_unit || (withDays.length > 0 ? "week" : "day");
      const defInterval = withUnit?.recurrence_interval || 1;
      let defStart = null;
      if (withStart.length > 0) {
        defStart = withStart
          .map((x) => new Date(x.recurrence_start_date))
          .sort((a, b) => a - b)[0];
      } else if (g.todos.length > 0) {
        // fallback to earliest scheduled_date
        const withSched = g.todos
          .filter((x) => !!x.scheduled_date)
          .map((x) => new Date(x.scheduled_date));
        if (withSched.length > 0) defStart = withSched.sort((a, b) => a - b)[0];
      }
      const defStartStr = defStart ? defStart.toISOString().slice(0, 10) : null;
      // union days_of_week
      const daysSet = new Set();
      for (const x of withDays) {
        x.days_of_week.forEach((d) => daysSet.add(d));
      }
      const defDays = Array.from(daysSet);
      const def = {
        title: g.title,
        recurrence_unit: defUnit,
        recurrence_interval: defInterval,
        recurrence_start_date: defStartStr,
        days_of_week: defDays,
      };
      const sample = g.todos[0] || null;
      return { ...g, users: enrichedUsers, def, sample };
    });
  }, [todos, users]);

  // Compute preview for create modal when routine
  useEffect(() => {
    if (!showCreateModal) return;
    if (formData.todo_type !== "rutin") {
      setCreateRoutinePreviewCount(0);
      return;
    }
    try {
      const start = formData.recurrence_start_date
        ? new Date(formData.recurrence_start_date)
        : new Date();
      const now = new Date();
      const startDate = isNaN(start.getTime()) ? now : start;
      const interval = Math.max(
        1,
        parseInt(formData.recurrence_interval || 1, 10)
      );
      const unit = formData.recurrence_unit || "day";
      // match backend horizon windows
      let endWindow = new Date(startDate);
      if (unit === "day") {
        endWindow.setDate(endWindow.getDate() + 30);
        setCreateRoutinePreviewHorizon("30 hari ke depan");
      } else if (unit === "week") {
        endWindow.setDate(endWindow.getDate() + 4 * 7);
        setCreateRoutinePreviewHorizon("4 minggu ke depan");
      } else if (unit === "month") {
        endWindow.setMonth(endWindow.getMonth() + 1);
        setCreateRoutinePreviewHorizon("1 bulan ke depan");
      } else {
        endWindow.setFullYear(endWindow.getFullYear() + 1);
        setCreateRoutinePreviewHorizon("1 tahun ke depan");
      }
      // per-user occurrences within window
      let perUser = 0;
      if (unit === "day") {
        let cursor = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
        while (cursor <= endWindow) {
          perUser++;
          cursor.setDate(cursor.getDate() + interval);
        }
      } else if (unit === "week") {
        const chosen = Array.isArray(formData.days_of_week)
          ? formData.days_of_week.slice().sort((a, b) => a - b)
          : [];
        // if no chosen days, default to start day
        const days = chosen.length ? chosen : [startDate.getDay()];
        // iterate day by day across window and count matches respecting interval weeks
        // compute the week-index relative to start-of-week of startDate
        const refWeekStart = new Date(startDate);
        refWeekStart.setDate(refWeekStart.getDate() - refWeekStart.getDay());
        let cursor = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
        while (cursor <= endWindow) {
          const weeksFromRef = Math.floor(
            (cursor - refWeekStart) / (7 * 24 * 3600 * 1000)
          );
          if (weeksFromRef % interval === 0) {
            if (days.includes(cursor.getDay())) perUser++;
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      } else if (unit === "month") {
        let cursor = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
        while (cursor <= endWindow) {
          perUser++;
          cursor.setMonth(cursor.getMonth() + interval);
        }
      } else {
        // year
        let cursor = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
        while (cursor <= endWindow) {
          perUser++;
          cursor.setFullYear(cursor.getFullYear() + interval);
        }
      }

      // user multiplier
      let userCount = 0;
      if (formData.target_category === "all") {
        userCount = users.filter((u) => u.role === "user").length;
      } else {
        const candidates = users.filter(
          (u) => u.role === "user" && u.category === formData.target_category
        );
        userCount =
          formData.selected_user_ids && formData.selected_user_ids.length > 0
            ? candidates.filter((u) =>
                formData.selected_user_ids.includes(u.id)
              ).length
            : candidates.length;
      }
      const total = perUser * Math.max(1, userCount);
      setCreateRoutinePreviewPerUser(perUser);
      setCreateRoutinePreviewUsers(Math.max(1, userCount));
      setCreateRoutinePreviewCount(total);
    } catch {
      setCreateRoutinePreviewCount(0);
      setCreateRoutinePreviewPerUser(0);
      setCreateRoutinePreviewUsers(0);
      setCreateRoutinePreviewHorizon("");
    }
  }, [showCreateModal, formData, users]);

  // Recompute preview count when routineForm changes
  useEffect(() => {
    if (!showEditRoutineModal) return;
    const computeOccurrences = () => {
      try {
        const start = routineForm.recurrence_start_date
          ? new Date(routineForm.recurrence_start_date)
          : new Date();
        const now = new Date();
        const startDate = isNaN(start.getTime()) ? now : start;
        const endOfMonth = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        );
        const interval = Math.max(
          1,
          parseInt(routineForm.recurrence_interval || 1, 10)
        );
        const unit = routineForm.recurrence_unit || "day";
        let perUser = 0;
        if (unit === "day") {
          let cursor = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          while (cursor <= endOfMonth) {
            perUser++;
            cursor.setDate(cursor.getDate() + interval);
          }
        } else if (unit === "week") {
          const chosen = Array.isArray(routineForm.days_of_week)
            ? routineForm.days_of_week.slice().sort((a, b) => a - b)
            : [];
          const days = chosen.length ? chosen : [startDate.getDay()];
          const refWeekStart = new Date(startDate);
          refWeekStart.setDate(refWeekStart.getDate() - refWeekStart.getDay());
          let cursor = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          while (cursor <= endOfMonth) {
            const weeksFromRef = Math.floor(
              (cursor - refWeekStart) / (7 * 24 * 3600 * 1000)
            );
            if (weeksFromRef % interval === 0) {
              if (days.includes(cursor.getDay())) perUser++;
            }
            cursor.setDate(cursor.getDate() + 1);
          }
        } else if (unit === "month") {
          let cursor = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          while (cursor <= endOfMonth) {
            perUser++;
            cursor.setMonth(cursor.getMonth() + interval);
          }
        } else {
          // year
          let cursor = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          while (cursor <= endOfMonth) {
            perUser++;
            cursor.setFullYear(cursor.getFullYear() + interval);
          }
        }
        // user multiplier
        let userCount = 0;
        if (routineForm.target_category === "all") {
          userCount = users.filter((u) => u.role === "user").length;
        } else {
          const candidates = users.filter(
            (u) =>
              u.role === "user" && u.category === routineForm.target_category
          );
          userCount =
            routineForm.selected_user_ids &&
            routineForm.selected_user_ids.length > 0
              ? candidates.filter((u) =>
                  routineForm.selected_user_ids.includes(u.id)
                ).length
              : candidates.length;
        }
        setRoutinePreviewCount(perUser * Math.max(1, userCount));
      } catch {
        setRoutinePreviewCount(0);
      }
    };
    computeOccurrences();
  }, [showEditRoutineModal, routineForm, users]);

  // removed status/user dropdown auto-scroll effects

  const getStatusIcon = (status, reworked = false) => {
    switch (status) {
      case "not_started":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "hold":
        return <Pause className="h-4 w-4 text-pink-500" />;
      case "checking":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "evaluating":
        return (
          <CheckCircle
            className={`h-4 w-4 ${
              reworked ? "text-orange-500" : "text-purple-500"
            }`}
          />
        );

      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "not_started":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "hold":
        return "bg-pink-100 text-pink-800 border border-pink-200";
      case "checking":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "evaluating":
        return "bg-purple-100 text-purple-800 border border-purple-200";

      case "completed":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : `User ${userId}`;
  };

  // Logical task date helper (prefer scheduled_date when present)
  const getTaskDate = (todo) => {
    const dateStr = todo?.scheduled_date || todo?.created_at;
    return dateStr ? new Date(dateStr) : null;
  };

  const formatStatusLabel = (status) => {
    if (!status) return t("common.unknown", { defaultValue: "Unknown" });

    switch (status) {
      case "not_started":
        return t("todos.notStarted");
      case "in_progress":
        return t("todos.inProgress");
      case "hold":
        return t("todos.hold");
      case "checking":
        return t("todos.checking");
      case "evaluating":
        return t("todos.evaluating");
      case "reworked":
        return t("todos.reworked");
      case "completed":
        return t("todos.completed");
      default:
        return status
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      todo_type: todo.todo_type || "rutin",
      target_category: todo.target_category || "all",
      target_user_id: "",
      selected_user_ids: [],
      recurrence_start_date: todo.recurrence_start_date || "",
      recurrence_interval: todo.recurrence_interval || 1,
      recurrence_unit: todo.recurrence_unit || "day",
      recurrence_count: todo.recurrence_count || 0,
      days_of_week: todo.days_of_week || [],
      scheduled_date: todo.scheduled_date || "",
      target_start_at: todo.target_start_at || "",
      target_end_at: todo.target_end_at || "",
      target_duration_value: todo.target_duration_value || "",
      target_duration_unit: todo.target_duration_unit || "minutes",
    });
    setShowCreateModal(true);
  };

  const _handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTodo) {
        await api.patch(`/todos/${editingTodo.id}`, formData);
      } else {
        // Compose payload with selected_user_ids or category
        const payload = { ...formData };
        if (assignAllInCategory) {
          payload.selected_user_ids = [];
        }
        // For tambahan, strip recurrence fields and send one-off schedule
        if (payload.todo_type === "tambahan") {
          delete payload.recurrence_start_date;
          delete payload.recurrence_interval;
          delete payload.recurrence_unit;
          delete payload.recurrence_count;
          delete payload.days_of_week;
        }
        await api.post("/todos", payload);
      }
      const res = await api.get("/todos/all");
      setTodos(res.data.data || res.data);
      setFormData({
        title: "",
        description: "",
        todo_type: "rutin",
        target_category: "all",
        target_user_id: "",
        selected_user_ids: [],
        recurrence_start_date: "",
        recurrence_interval: 1,
        recurrence_unit: "day",
        recurrence_count: 0,
        days_of_week: [],
        scheduled_date: "",
        target_start_at: "",
        target_end_at: "",
        target_duration_value: "",
        target_duration_unit: "minutes",
      });
      setAssignAllInCategory(false);
      setShowCreateModal(false);
      setEditingTodo(null);
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          t("todos.saveFailed", { defaultValue: "Failed to save" })
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("todos.deleteConfirmation"))) return;
    try {
      await api.delete(`/todos/${id}`);
      // Optimistic remove from local state to avoid clearing the whole list
      setTodos((prev) => prev.filter((t) => t.id !== id));
      alert(t("notifications.todoDeletedSuccess"));
    } catch (error) {
      console.error("Kesalahan menghapus tugas", error);
      if (error?.response?.status === 404) {
        // Todo already deleted, remove from local state
        setTodos((prev) => prev.filter((t) => t.id !== id));
        alert(
          t("notifications.failedDeleteTodo", {
            defaultValue: "Failed to delete todo",
          })
        );
      } else {
        alert(t("notifications.failedDeleteTodo"));
      }
    }
  };

  const handleViewDetails = (todo) => {
    setSelectedTodo(todo);
    setShowDetailModal(true);
  };

  const handleEvaluate = (todo) => {
    setSelectedTodo(todo);
    setEvaluationData({
      action: "approve",
      notes: "",
      warningPoints: 0,
      warningNote: "",
      // prefer automatic rating based on target vs actual; fallback to stored rating
      rating: calculateAutomaticRating(todo) ?? todo.rating ?? 0,
    });
    setShowEvaluationModal(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedTodo) return;
    try {
      // Send only action/type/notes - rating and warnings are calculated server-side
      await api.post(`/todos/${selectedTodo.id}/evaluate`, {
        action: evaluationData.action,
        type: "individual",
        notes: evaluationData.notes,
      });
      const [todosRes, usersRes] = await Promise.all([
        api.get("/todos/all"),
        api.get("/users"),
      ]);
      setTodos(todosRes.data.data || todosRes.data);
      setUsers(usersRes.data || []);
      setShowEvaluationModal(false);
      setSelectedTodo(null);
      setEvaluationData({
        action: "approve",
        notes: "",
        warningPoints: 0,
        warningNote: "",
        rating: 0,
      });
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          t("todos.evaluateFailed", { defaultValue: "Failed to evaluate" })
      );
    }
  };

  const getDateRange = () => {
    if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(dateFrom) : null;
      const end = dateTo ? new Date(dateTo) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      if (!start && !end) return null;
      return { start: start || new Date(0), end };
    }

    const filter = dateFilter;
    if (!filter || filter === "") return null;
    const now = new Date();
    switch (filter) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
      }
      case "this_week": {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { start, end: null };
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: null };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: null };
      }
      default: {
        return null;
      }
    }
  };

  const filteredTodos = todos.filter((todo) => {
    const titleLc = (todo.title || "").toLowerCase();
    const descLc = (todo.description || "").toLowerCase();
    const userNameLc = getUserName(todo.user_id).toLowerCase();
    const searchLc = (searchTerm || "").toLowerCase();
    const matchesSearch =
      titleLc.includes(searchLc) ||
      descLc.includes(searchLc) ||
      userNameLc.includes(searchLc);
    const matchesStatus =
      statusFilter === "all" || (todo.status || "").toString() === statusFilter;
    // user filter removed

    // Date filter - use getTaskDate for consistent date handling
    // date filter: supports ranges
    const matchesDate = (() => {
      const range = getDateRange();
      if (!range) return true;
      const todoDate = getTaskDate(todo);
      if (!todoDate) return false;
      const after = todoDate >= range.start;
      const before = !range.end || todoDate < range.end;
      return after && before;
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getDuration = (todo) => {
    // Prefer formatted duration from backend
    if (todo.total_work_time_formatted) {
      return todo.total_work_time_formatted;
    }

    // Prefer explicit minutes field provided by the API
    const minutesField =
      typeof todo.total_work_time_minutes === "number"
        ? todo.total_work_time_minutes
        : typeof todo.total_work_time === "number"
        ? todo.total_work_time
        : null;

    if (typeof minutesField === "number") {
      const hours = Math.floor(minutesField / 60);
      const minutes = Math.floor(minutesField % 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    // Try to parse formatted string like "2h 30m"
    if (typeof todo.total_work_time === "string") {
      const m = todo.total_work_time.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
      if (m) {
        const h = parseInt(m[1] || "0", 10);
        const mm = parseInt(m[2] || "0", 10);
        if (!isNaN(h) || !isNaN(mm)) return `${h}h ${mm}m`;
      }
    }

    // Fallback to calculating from raw timestamps (api may provide _raw iso fields)
    const startRaw = todo.started_at_raw || todo.started_at;
    const endRaw = todo.submitted_at_raw || todo.submitted_at;
    if (
      startRaw &&
      endRaw &&
      !isNaN(Date.parse(startRaw)) &&
      !isNaN(Date.parse(endRaw))
    ) {
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      const diffMs = end - start;
      if (diffMs >= 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(
          (diffMs % (1000 * 60 * 60)) / (1000 * 60)
        );
        return `${diffHours}h ${diffMinutes}m`;
      }
    }

    return "-";
  };

  // Format target start time as HH:mm using raw ISO when available
  const getTargetStartTime = (todo) => {
    try {
      if (
        todo?.target_start_at_raw &&
        !isNaN(Date.parse(todo.target_start_at_raw))
      ) {
        const d = new Date(todo.target_start_at_raw);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
      if (
        typeof todo?.target_start_at === "string" &&
        todo.target_start_at.trim()
      ) {
        const m = todo.target_start_at.match(/(\d{1,2}):(\d{2})/);
        if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
      }
    } catch {}
    return null;
  };

  // Helper function to calculate automatic rating based on duration
  const calculateAutomaticRating = (todo) => {
    if (!todo.target_duration_value || !todo.target_duration_unit) return null;

    // Convert target duration to minutes
    let targetMinutes = Number(todo.target_duration_value);
    if (isNaN(targetMinutes)) return null;
    if (todo.target_duration_unit === "hours")
      targetMinutes = targetMinutes * 60;

    // Determine actual minutes: prefer explicit minutes field, then numeric, then try parse
    let actualMinutes = null;
    if (typeof todo.total_work_time_minutes === "number") {
      actualMinutes = todo.total_work_time_minutes;
    } else if (typeof todo.total_work_time === "number") {
      actualMinutes = todo.total_work_time;
    } else if (typeof todo.total_work_time === "string") {
      const m = todo.total_work_time.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
      if (m) {
        const h = parseInt(m[1] || "0", 10);
        const mm = parseInt(m[2] || "0", 10);
        actualMinutes = h * 60 + mm;
      }
    } else if (todo.started_at_raw && todo.submitted_at_raw) {
      const s = Date.parse(todo.started_at_raw);
      const e = Date.parse(todo.submitted_at_raw);
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        actualMinutes = Math.round((e - s) / (1000 * 60));
      }
    }

    if (actualMinutes === null || isNaN(actualMinutes)) return null;

    // Calculate rating (100% for on-time or early, decreases for overtime)
    if (actualMinutes <= targetMinutes) return 100;
    const overtimeRatio = actualMinutes / targetMinutes;
    const penalty = Math.min((overtimeRatio - 1) * 50, 50);
    return Math.max(Math.round(100 - penalty), 0);
  };

  const distribution = React.useMemo(
    () => ({
      not_started: filteredTodos.filter((t) => t.status === "not_started")
        .length,
      in_progress: filteredTodos.filter((t) => t.status === "in_progress")
        .length,
      hold: filteredTodos.filter((t) => t.status === "hold").length,
      checking: filteredTodos.filter((t) => t.status === "checking").length,
      evaluating: filteredTodos.filter((t) => t.status === "evaluating").length,
      completed: filteredTodos.filter((t) => t.status === "completed").length,
    }),
    [filteredTodos]
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-dropdown]")) {
        setShowStatusDropdown(false);
        setShowUserDropdown(false);
        setStatusSearchTerm("");
        setUserSearchTerm("");
        setAssignAllInCategory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (
        !user ||
        !["admin_ga", "admin_ga_manager", "super_admin"].includes(user.role)
      ) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [todosRes, usersRes] = await Promise.all([
          api.get("/todos/all"),
          api.get("/users"),
        ]);
        if (!cancelled) {
          setTodos(todosRes.data.data || todosRes.data);
          setUsers(usersRes.data || []);
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || t("errors.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  // Show loading or unauthorized message if not admin
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!["admin_ga", "admin_ga_manager", "super_admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("errors.unauthorized")}
          </h2>
          <p className="text-gray-600">{t("errors.adminOnly")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("todos.title")}
          </h1>
          <p className="text-gray-600">{t("todos.subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary w-full sm:w-auto flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("todos.exportTodos", { defaultValue: "Export Todos" })}
          </button>
          {/* Create New Todo Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary w-full sm:w-auto flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("todos.createNew")}
          </button>
        </div>
      </div>

      {/* Tabs: All / Rutin / Tambahan (match Asset Management style) */}
      {(() => {
        const tambahanCount = filteredTodos.filter(
          (t) => (t.todo_type || "rutin") !== "rutin"
        ).length;
        const rutinCount = filteredTodos.filter(
          (t) => (t.todo_type || "rutin") === "rutin"
        ).length;
        return (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setTodoTab("all")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  todoTab === "all"
                    ? "border-accent-500 text-accent-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t("todos.allTodos")} ({filteredTodos.length})
              </button>
              <button
                onClick={() => setTodoTab("rutin")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  todoTab === "rutin"
                    ? "border-accent-500 text-accent-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t("todos.routine")} ({rutinCount})
              </button>
              <button
                onClick={() => setTodoTab("tambahan")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  todoTab === "tambahan"
                    ? "border-accent-500 text-accent-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t("todos.additional")} ({tambahanCount})
              </button>
            </nav>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div
              className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                statusFilter === "not_started"
                  ? "ring-2 ring-yellow-500 bg-yellow-50"
                  : ""
              }`}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "not_started" ? "all" : "not_started"
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("todos.notStarted")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {distribution.not_started}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                statusFilter === "in_progress"
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : ""
              }`}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "in_progress" ? "all" : "in_progress"
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Play className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("todos.inProgress")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {distribution.in_progress}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                statusFilter === "hold" ? "ring-2 ring-pink-500 bg-pink-50" : ""
              }`}
              onClick={() =>
                setStatusFilter(statusFilter === "hold" ? "all" : "hold")
              }
              role="button"
              tabIndex={0}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Pause className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("todos.hold")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {distribution.hold}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                statusFilter === "checking"
                  ? "ring-2 ring-orange-500 bg-orange-50"
                  : ""
              }`}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "checking" ? "all" : "checking"
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("todos.checking")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {distribution.checking}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                statusFilter === "evaluating"
                  ? "ring-2 ring-purple-500 bg-purple-50"
                  : ""
              }`}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "evaluating" ? "all" : "evaluating"
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("todos.evaluating")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {distribution.evaluating}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                statusFilter === "completed"
                  ? "ring-2 ring-green-500 bg-green-50"
                  : ""
              }`}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "completed" ? "all" : "completed"
                )
              }
              role="button"
              tabIndex={0}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("todos.completed")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {distribution.completed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Time range filter */}
          <div className="relative" data-dropdown="date">
            <button
              type="button"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900 text-left"
            >
              <span className="text-gray-900 text-sm sm:text-base">
                {dateFrom || dateTo
                  ? `${dateFrom || '-'} → ${dateTo || '-'}`
                  : dateFilter === "all"
                  ? t("common.dateFilter.allDates")
                  : dateFilter === "today"
                  ? t("common.dateFilter.today")
                  : dateFilter === "this_week"
                  ? t("common.dateFilter.thisWeek")
                  : dateFilter === "this_month"
                  ? t("common.dateFilter.thisMonth")
                  : t("common.dateFilter.thisYear")}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className={`h-4 w-4 text-gray-400`} />
              </span>
            </button>
            {showDateDropdown && (
              <div className="absolute z-10 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none mt-1">
                {[
                  {
                    value: "all",
                    label: t("common.dateFilter.allDates"),
                  },
                  {
                    value: "today",
                    label: t("common.dateFilter.today"),
                  },
                  {
                    value: "this_week",
                    label: t("common.dateFilter.thisWeek"),
                  },
                  {
                    value: "this_month",
                    label: t("common.dateFilter.thisMonth"),
                  },
                  {
                    value: "this_year",
                    label: t("common.dateFilter.thisYear"),
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateFilter(option.value);
                      setShowDateDropdown(false);
                    }}
                    className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                      dateFilter === option.value
                        ? "bg-accent-50 text-accent-900"
                        : "text-gray-900"
                    }`}
                  >
                    <span className="block truncate">{option.label}</span>
                    {dateFilter === option.value && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <Check className="h-4 w-4 text-accent-600" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom date range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder={t("meetings.from")}
                className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder={t("meetings.to")}
                className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
            </div>
          </div>

          {/* Total count for current range */}
          <div className="flex items-center text-sm text-gray-700">
            <span>
              {t("common.total", { defaultValue: "Total" })}:{" "}
              {(() => {
                const range = getDateRange();
                if (!range) return todos.length;
                return todos.filter((t) => {
                  const d = getTaskDate(t);
                  if (!d) return false;
                  const after = d >= range.start;
                  const before = !range.end || d < range.end;
                  return after && before;
                }).length;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("todos.searchTodos")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* Routine Groups */}
      {/* Routine list cards */}
      {routineGroups.length > 0 &&
        todoTab === "rutin" &&
        statusFilter === "all" && (
          <div className="flex flex-col gap-3">
            {routineGroups.map((g) => (
              <div key={g.key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mx-1 sm:mx-2 my-2 group">
                {/* Header behaves like list item and is clickable (div to allow inner button) */}
                <div
                  onClick={() => {
                    setExpandedGroupKey(
                      expandedGroupKey === g.key ? null : g.key
                    );
                    setExpandedUserId(null);
                  }}
                  className="w-full cursor-pointer px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedGroupKey(
                        expandedGroupKey === g.key ? null : g.key
                      );
                      setExpandedUserId(null);
                    }
                  }}
                >
                  <div>
                    <div className="font-semibold text-gray-900">{g.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded-full border border-blue-200">
                        {formatRoutinePatternShort(g.def || g.sample)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={t("common.detail")}
                      onClick={(e) => {
                        e.stopPropagation();
                        const s = g.def || g.sample || {};
                        setRoutineDetail({
                          title: g.title,
                          description: s.description,
                          target_category: s.target_category,
                          start:
                            s.recurrence_start_date ||
                            new Date().toISOString().slice(0, 10),
                          pattern: formatRoutinePattern(s),
                          days:
                            Array.isArray(s.days_of_week) &&
                            s.days_of_week.length
                              ? s.days_of_week
                                  .slice()
                                  .sort((a, b) => a - b)
                                  .map(
                                    (d) =>
                                      [
                                        "Minggu",
                                        "Senin",
                                        "Selasa",
                                        "Rabu",
                                        "Kamis",
                                        "Jumat",
                                        "Sabtu",
                                      ][d] || d
                                  )
                                  .join(" dan ")
                              : "",
                        });
                        setShowRoutineDetail(true);
                      }}
                      className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={t("common.editRoutine")}
                      onClick={(e) => {
                        e.stopPropagation();
                        // open edit modal, prefill form with sample
                        const sample = g.sample || {};
                        setRoutineGroupEdited(g);
                        setRoutineForm({
                          title: g.title || "",
                          description: sample.description || "",
                          todo_type: "rutin",
                          target_category: sample.target_category || "all",
                          selected_user_ids: [],
                          recurrence_start_date:
                            sample.recurrence_start_date ||
                            new Date().toISOString().slice(0, 10),
                          recurrence_interval: sample.recurrence_interval || 1,
                          recurrence_unit: sample.recurrence_unit || "day",
                          recurrence_count: sample.recurrence_count ?? 0,
                          occurrences_per_interval:
                            sample.occurrences_per_interval || 1,
                          days_of_week: Array.isArray(sample.days_of_week)
                            ? sample.days_of_week
                            : [],
                        });
                        setRoutineStrategy("future_only");
                        setShowEditRoutineModal(true);
                      }}
                      className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={t("common.deleteAll")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!window.confirm(t("common.deleteAllConfirm")))
                          return;
                        (async () => {
                          try {
                            const payload = {
                              title: g.title,
                              recurrence_interval:
                                g.sample?.recurrence_interval || 1,
                              recurrence_unit:
                                g.sample?.recurrence_unit || "day",
                              target_category:
                                g.sample?.target_category || undefined,
                              recurrence_count: g.sample?.recurrence_count ?? 0,
                              user_id:
                                g.users.length === 1
                                  ? g.users[0].id
                                  : undefined,
                            };
                            const res = await api.post(
                              "/todos/routine-group/delete",
                              payload
                            );
                            if (!res?.data || res?.data?.deleted === 0) {
                              console.warn(
                                "No rows deleted for routine group. Payload used:",
                                payload
                              );
                            }
                            // Optimistically remove all todos belonging to this group from local state
                            setTodos((prev) =>
                              prev.filter((t) => {
                                if ((t.todo_type || "rutin") !== "rutin")
                                  return true;
                                const sameTitle = t.title === g.title;
                                const sameInterval =
                                  (t.recurrence_interval || 1) ===
                                  (g.sample?.recurrence_interval || 1);
                                const sameUnit =
                                  (t.recurrence_unit || "day") ===
                                  (g.sample?.recurrence_unit || "day");
                                const sameCount =
                                  (t.recurrence_count ?? 0) ===
                                  (g.sample?.recurrence_count ?? 0);
                                const sameCategory = g.sample?.target_category
                                  ? t.target_category ===
                                    g.sample.target_category
                                  : true;
                                return !(
                                  sameTitle &&
                                  sameInterval &&
                                  sameUnit &&
                                  sameCount &&
                                  sameCategory
                                );
                              })
                            );
                            setExpandedGroupKey(null);
                            setExpandedUserId(null);
                          } catch (er) {
                            alert(
                              er?.response?.data?.message ||
                                t("errors.deleteError")
                            );
                          }
                        })();
                      }}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] text-gray-400 hidden sm:inline">
                      {t("todos.expandToView")}
                    </span>
                  </div>
                </div>

                {expandedGroupKey === g.key && (
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-xs text-gray-600">
                        {t("common.filter")}:
                      </span>
                      {/* Evaluate filter always */}
                      <select
                        value={evalFilter}
                        onChange={(e) => setEvalFilter(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                      >
                        <option value="all">{t("todos.all")}</option>
                        <option value="to_evaluate">{t("todos.toEvaluate")}</option>
                        <option value="evaluated">{t("todos.evaluated")}</option>
                      </select>
                      {/* Show category filter only if target_category === 'all' and there are multiple categories */}
                      {g.sample?.target_category === "all" && (
                        <select
                          value={groupCategoryFilter}
                          onChange={(e) => {
                            setGroupCategoryFilter(e.target.value);
                            setGroupUserPageByKey((p) => ({
                              ...p,
                              [g.key]: 1,
                            }));
                          }}
                          className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                        >
                          <option value="all">{t("todos.allCategory")}</option>
                          <option value="ob">
                            {t("common.categories.obEquipment")}
                          </option>
                          <option value="driver">
                            {t("common.categories.driverEquipment")}
                          </option>
                          <option value="security">
                            {t("common.categories.securityEquipment")}
                          </option>
                        </select>
                      )}
                      {/* Show search unless this routine targets only one specific user */}
                      {g.users.length > 1 && (
                        <input
                          type="text"
                          value={groupSearchByKey[g.key] || ""}
                          onChange={(e) => {
                            setGroupSearchByKey((prev) => ({
                              ...prev,
                              [g.key]: e.target.value,
                            }));
                            setGroupUserPageByKey((p) => ({
                              ...p,
                              [g.key]: 1,
                            }));
                          }}
                          placeholder={t("common.placeholders.searchEmployee")}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-xs"
                        />
                      )}
                    </div>

                    {/* Assignee list (click to open user's long routine list). If only one user, auto expand. */}
                    {g.users.length > 1 && (
                      <>
                        <div className="text-xs text-gray-600 mb-2">
                          {t("common.assignees")}
                        </div>
                        {(() => {
                          const usersFiltered = g.users
                            .filter(
                              (u) =>
                                groupCategoryFilter === "all" ||
                                u.category === groupCategoryFilter
                            )
                            .filter(
                              (u) =>
                                !groupSearchByKey[g.key] ||
                                u.name
                                  .toLowerCase()
                                  .includes(
                                    (
                                      groupSearchByKey[g.key] || ""
                                    ).toLowerCase()
                                  )
                            );
                          const totalPages = Math.max(
                            1,
                            Math.ceil(usersFiltered.length / PAGE_SIZE)
                          );
                          const page = Math.min(
                            groupUserPageByKey[g.key] || 1,
                            totalPages
                          );
                          const start = (page - 1) * PAGE_SIZE;
                          const pageItems = usersFiltered.slice(
                            start,
                            start + PAGE_SIZE
                          );
                          return (
                            <>
                              <div className="max-h-40 overflow-auto divide-y">
                                {pageItems.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setExpandedUserId(
                                        expandedUserId === u.id ? null : u.id
                                      );
                                      setGroupTaskPageByKey((p) => ({
                                        ...p,
                                        [`${g.key}-${u.id}`]: 1,
                                      }));
                                    }}
                                    className="w-full flex items-center justify-between py-2 hover:bg-gray-50 px-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">
                                        {u.name.substring(0, 1).toUpperCase()}
                                      </span>
                                      <div className="text-sm text-gray-800">
                                        {u.name}
                                      </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
                                      {u.category || "-"}
                                    </span>
                                  </button>
                                ))}
                                {usersFiltered.length === 0 && (
                                  <div className="py-4 text-center text-xs text-gray-400">
                                    {t("noUsers")}
                                  </div>
                                )}
                              </div>
                              {usersFiltered.length > PAGE_SIZE && (
                                <div className="flex items-center justify-end gap-2 px-3 py-2">
                                  <button
                                    className="text-xs px-2 py-1 border rounded"
                                    disabled={page <= 1}
                                    onClick={() =>
                                      setGroupUserPageByKey((p) => ({
                                        ...p,
                                        [g.key]: Math.max(1, page - 1),
                                      }))
                                    }
                                  >
                                    {t("common.previous")}
                                  </button>
                                  <span className="text-[11px] text-gray-500">
                                    {page}/{totalPages}
                                  </span>
                                  <button
                                    className="text-xs px-2 py-1 border rounded"
                                    disabled={page >= totalPages}
                                    onClick={() =>
                                      setGroupUserPageByKey((p) => ({
                                        ...p,
                                        [g.key]: Math.min(totalPages, page + 1),
                                      }))
                                    }
                                  >
                                    {t("common.next")}
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}

                    {/* If only one user, show their list by default */}
                    {(g.users.length === 1
                      ? g.users[0].id
                      : expandedUserId) && (
                      <div className="mt-3 border rounded-lg">
                        <div className="px-3 py-2 text-xs text-gray-600 bg-gray-50 rounded-t-lg">
                          {t("todos.routineTasks")}
                        </div>
                        {(() => {
                          const uid =
                            g.users.length === 1
                              ? g.users[0].id
                              : expandedUserId;
                          const tasksFiltered = todos
                            .filter((t) => (t.todo_type || "rutin") === "rutin")
                            .filter((t) => t.user_id === uid)
                            .filter(
                              (t) =>
                                t.title === g.title &&
                                (t.recurrence_interval || 1) ===
                                  (g.sample.recurrence_interval || 1) &&
                                (t.recurrence_unit || "day") ===
                                  (g.sample.recurrence_unit || "day")
                            )
                            .filter((t) =>
                              evalFilter === "all"
                                ? true
                                : evalFilter === "to_evaluate"
                                ? t.status === "checking"
                                : t.status === "completed"
                            )
                            .sort((a, b) => {
                              // Sort by scheduled_date first, then by created_at
                              const getDateForSort = (todo) => {
                                if (
                                  todo.scheduled_date &&
                                  !isNaN(Date.parse(todo.scheduled_date))
                                ) {
                                  return new Date(todo.scheduled_date);
                                }
                                if (
                                  todo.created_at &&
                                  !isNaN(Date.parse(todo.created_at))
                                ) {
                                  return new Date(todo.created_at);
                                }
                                return new Date(0); // fallback to epoch
                              };

                              const dateA = getDateForSort(a);
                              const dateB = getDateForSort(b);

                              return dateA - dateB; // ascending order (earliest first)
                            });
                          const taskKey = `${g.key}-${uid}`;
                          const totalPages = Math.max(
                            1,
                            Math.ceil(tasksFiltered.length / PAGE_SIZE)
                          );
                          const page = Math.min(
                            groupTaskPageByKey[taskKey] || 1,
                            totalPages
                          );
                          const start = (page - 1) * PAGE_SIZE;
                          const pageItems = tasksFiltered.slice(
                            start,
                            start + PAGE_SIZE
                          );
                          return (
                            <>
                              <ul className="divide-y">
                                {pageItems.map((todoItem) => (
                                  <li
                                    key={todoItem.id}
                                    onClick={() => handleViewDetails(todoItem)}
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mx-1 sm:mx-2 my-2 group cursor-pointer"
                                  >
                                    <div className="p-4 sm:p-5">
                                      {/* Left content */}
                                      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                          {getStatusIcon(todoItem.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                            <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                                              {todoItem.title}
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                              <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(
                                                  todoItem.status
                                                )}`}
                                              >
                                                {formatStatusLabel(
                                                  todoItem.status
                                                )}
                                              </span>
                                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                {t("todos.routine")}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                              <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2 text-blue-500" />
                                                <span className="font-medium">{getUserName(todoItem.user_id)}</span>
                                              </div>
                                              <div className="truncate">
                                                {t("todos.scheduledDate")}:{" "}
                                                {(() => {
                                                  const dateText =
                                                    todoItem.scheduled_date
                                                      ? new Date(
                                                          todoItem.scheduled_date
                                                        ).toLocaleDateString(
                                                          "id-ID",
                                                          {
                                                            weekday: "long",
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                          }
                                                        )
                                                      : todoItem.formatted_created_at ||
                                                        format(
                                                          new Date(
                                                            todoItem.created_at
                                                          ),
                                                          "MMM dd, yyyy"
                                                        );
                                                  const hhmm = getTargetStartTime(todoItem);
                                                  return hhmm ? `${dateText}, ${hhmm}` : dateText;
                                                })()}
                                              </div>
                                              <div className="flex items-center sm:col-span-2 lg:col-span-1">
                                                <AlertCircle className="h-4 w-4 mr-2 text-purple-500" />
                                                <span className="font-medium">{t("todos.duration")}:</span>
                                                <span className="ml-2 text-gray-900 dark:text-white">{getDuration(todoItem)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right actions */}
                                      <div className="flex items-center justify-end sm:justify-start gap-1 mt-3">
                                        {todoItem.status === "checking" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEvaluate(todoItem);
                                            }}
                                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                            title={t("common.evaluate")}
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDetails(todoItem);
                                          }}
                                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                          title={t("common.detail")}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(todoItem);
                                          }}
                                          className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                                          title={t("common.edit")}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(todoItem.id);
                                          }}
                                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                          title={t("common.delete")}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              {tasksFiltered.length > PAGE_SIZE && (
                                <div className="flex items-center justify-end gap-2 px-3 py-2">
                                  <button
                                    className="text-xs px-2 py-1 border rounded"
                                    disabled={page <= 1}
                                    onClick={() =>
                                      setGroupTaskPageByKey((p) => ({
                                        ...p,
                                        [taskKey]: Math.max(1, page - 1),
                                      }))
                                    }
                                  >
                                    {t("common.previous")}
                                  </button>
                                  <span className="text-[11px] text-gray-500">
                                    {page}/{totalPages}
                                  </span>
                                  <button
                                    className="text-xs px-2 py-1 border rounded"
                                    disabled={page >= totalPages}
                                    onClick={() =>
                                      setGroupTaskPageByKey((p) => ({
                                        ...p,
                                        [taskKey]: Math.min(
                                          totalPages,
                                          page + 1
                                        ),
                                      }))
                                    }
                                  >
                                    {t("common.next")}
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* Todo List - show only tambahan when tab is tambahan, rutin when tab is rutin, all when tab is all */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTodos
              .filter((t) => {
                // Filter by tab selection
                if (todoTab === "rutin") {
                  // Show routine tasks as list (groups shown separately when statusFilter is "all")
                  return (t.todo_type || "rutin") === "rutin";
                } else if (todoTab === "tambahan") {
                  return (t.todo_type || "rutin") !== "rutin";
                }
                // For "all" tab: if routine groups are showing (when statusFilter is "all"), show only tambahan
                // Otherwise, show all tasks
                if (statusFilter === "all") {
                  return (t.todo_type || "rutin") !== "rutin";
                }
                return true;
              })
              .map((todo) => (
                <li
                  key={todo.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mx-1 sm:mx-2 my-2 group"
                >
                  <div className="p-4 sm:p-5">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(todo.status, todo.reworked)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors duration-200">
                            {todo.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {todo.description && todo.description.length > 100
                              ? `${todo.description.substring(0, 100)}...`
                              : todo.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status and Type Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${getStatusColor(
                          todo.status
                        )}`}
                      >
                        {formatStatusLabel(todo.status)}
                      </span>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                        {(todo.todo_type || "rutin") === "rutin"
                          ? t("todos.routine")
                          : t("todos.additional")}
                      </span>
                      {(todo.todo_type || "rutin") === "rutin" && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                          {formatRoutinePattern(todo)}
                        </span>
                      )}
                    </div>

                    {/* Info Section */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium">Assigned to:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {getUserName(todo.user_id)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2 text-green-500" />
                          <span className="font-medium">Tanggal Terjadwal:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {(() => {
                              const dateText = todo.scheduled_date
                                ? new Date(todo.scheduled_date).toLocaleDateString("id-ID", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : todo.formatted_created_at ||
                                  format(new Date(todo.created_at), "MMM dd, yyyy");
                              const hhmm = getTargetStartTime(todo);
                              return hhmm ? `${dateText}, ${hhmm}` : dateText;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 sm:col-span-2 lg:col-span-1">
                          <AlertCircle className="h-4 w-4 mr-2 text-purple-500" />
                          <span className="font-medium">{t("todos.duration")}:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {getDuration(todo)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {todo.admin_notes && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{t("todos.adminNotes")}:</span>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{todo.admin_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        {todo.status === "checking" && (
                          <button
                            onClick={() => handleEvaluate(todo)}
                            className="text-green-600 hover:text-green-900 text-xs px-3 py-2 border border-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                            title={t("todos.evaluateTask")}
                          >
                            Evaluate
                          </button>
                        )}

                        <button
                          onClick={() => handleViewDetails(todo)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                          title={t("common.viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Edit - Admin can edit all todos */}
                        <button
                          onClick={() => handleEdit(todo)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors duration-200"
                          title={t("common.editTodo")}
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete - Admin can delete all todos */}
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          title={t("common.deleteTodo")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTodo && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  {t("todos.taskDetails")}: {selectedTodo.title}
                </h3>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.basicInformation")}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <strong>{t("todos.taskName")}:</strong>{" "}
                          {selectedTodo.title}
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("todos.description")}:</strong>{" "}
                          {selectedTodo.description || "N/A"}
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("todos.status")}:</strong>
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              selectedTodo.status
                            )}`}
                          >
                            {formatStatusLabel(selectedTodo.status)}
                          </span>
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("todos.todoType")}:</strong>{" "}
                          {(selectedTodo.todo_type || "rutin") === "rutin"
                            ? t("todos.routine", { defaultValue: "Routine" })
                            : t("todos.additional", {
                                defaultValue: "Additional",
                              })}
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("todos.targetCategory")}:</strong>{" "}
                          {formatTargetCategory(selectedTodo.target_category)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <strong>{t("todos.user")}:</strong>{" "}
                          {getUserName(selectedTodo.user_id)}
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("todos.scheduledDate")}:</strong>{" "}
                          {(() => {
                            const dateText = selectedTodo.scheduled_date
                              ? new Date(
                                  selectedTodo.scheduled_date
                                ).toLocaleDateString("id-ID", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : selectedTodo.formatted_created_at || "N/A";
                            const hhmm = getTargetStartTime(selectedTodo);
                            return hhmm ? `${dateText}, ${hhmm}` : dateText;
                          })()}
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("todos.created")}:</strong>{" "}
                          {selectedTodo.formatted_created_at || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Target Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.targetInfo", {
                        defaultValue: "Informasi Target",
                      })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.targetStartTime", {
                              defaultValue: "Waktu Mulai Target",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.target_start_at || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.targetDuration", {
                              defaultValue: "Durasi Target",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.target_duration_formatted ||
                            (selectedTodo.target_duration_value &&
                            selectedTodo.target_duration_unit
                              ? `${selectedTodo.target_duration_value} ${
                                  selectedTodo.target_duration_unit === "hours"
                                    ? "jam"
                                    : "menit"
                                }`
                              : "N/A")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actual Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.actualInfo", {
                        defaultValue: "Informasi Aktual",
                      })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.actualStartTime", {
                              defaultValue: "Waktu Mulai Aktual",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.started_at || "Belum dimulai"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.actualDuration", {
                              defaultValue: "Durasi Aktual",
                            })}
                            :
                          </strong>{" "}
                          {getDuration(selectedTodo)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.duration")}
                    </h4>
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Work Duration:</strong>{" "}
                        {getDuration(selectedTodo)}
                      </p>
                    </div>
                  </div>

                  {selectedTodo.rating !== null &&
                    selectedTodo.rating !== undefined && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Performance Rating
                        </h4>
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedTodo.rating}/100
                          </div>
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${selectedTodo.rating}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {selectedTodo.warnings &&
                    selectedTodo.warnings.report &&
                    selectedTodo.warnings.report.points && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Warning Report
                        </h4>
                        <div className="text-sm">
                          <p className="text-gray-600">
                            <strong>Points:</strong>{" "}
                            {selectedTodo.warnings.report.points}
                          </p>
                          <p className="text-gray-600">
                            <strong>Level:</strong>{" "}
                            {selectedTodo.warnings.report.level}
                          </p>
                          <p className="text-gray-600">
                            <strong>Note:</strong>{" "}
                            {selectedTodo.warnings.report.note || "N/A"}
                          </p>
                          <p className="text-gray-600">
                            <strong>Published:</strong>{" "}
                            {selectedTodo.warnings.report.published_at || "N/A"}
                          </p>
                        </div>
                      </div>
                    )}

                  {selectedTodo.hold_note && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {t("todos.holdInfo", {
                          defaultValue: "Informasi Hold",
                        })}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>
                          <strong>
                            {t("todos.holdReason", {
                              defaultValue: "Alasan Hold",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.hold_note}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedTodo.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Admin Notes
                      </h4>
                      <p className="text-sm text-gray-600">
                        {selectedTodo.notes}
                      </p>
                    </div>
                  )}

                  {selectedTodo.evidence_files &&
                    selectedTodo.evidence_files.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {t("todos.evidenceFiles")}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedTodo.evidence_files.map((file, index) => (
                            <div
                              key={index}
                              className="border rounded-lg overflow-hidden bg-white"
                            >
                              {/\.(jpg|jpeg|png|gif)$/i.test(
                                file.path || file.url || file.full_url
                              ) ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    window.open(
                                      file.full_url ||
                                        file.url ||
                                        getStorageUrl(`storage/${file.path}`),
                                      "_blank"
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      window.open(
                                        file.full_url ||
                                          file.url ||
                                          getStorageUrl(`storage/${file.path}`),
                                        "_blank"
                                      );
                                  }}
                                  className="cursor-pointer"
                                >
                                  <img
                                    src={
                                      file.full_url ||
                                      file.url ||
                                      getStorageUrl(`storage/${file.path}`)
                                    }
                                    alt={file.name || `Evidence ${index + 1}`}
                                    className="w-full h-40 object-cover"
                                    onError={(e) => {
                                      console.log("Image failed to load:", {
                                        src: file.full_url || file.url,
                                        file: file,
                                        error: e
                                      });
                                      // Try fallback URL with correct backend port
                                      const fallbackUrl = getStorageUrl(`storage/${file.path}`);
                                      if (e.target.src !== fallbackUrl) {
                                        e.target.src = fallbackUrl;
                                      } else {
                                        e.target.style.display = "none";
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="p-3 flex items-center space-x-2">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={
                                      file.full_url ||
                                      file.url ||
                                      getStorageUrl(`storage/${file.path}`)
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    {file.name || `Evidence File ${index + 1}`}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Evidence Modal */}
      {showEvidenceModal && selectedTodo && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  {t("todos.evidence")} untuk: {selectedTodo.title}
                </h3>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.taskDetails")}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedTodo.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>
                        {t("todos.user")}: {getUserName(selectedTodo.user_id)}
                      </p>
                      <p>
                        {t("todos.submitted")}:{" "}
                        {selectedTodo.formatted_submitted_at || "N/A"}
                      </p>
                      <p>
                        {t("todos.duration")}: {getDuration(selectedTodo)}
                      </p>
                      <p>
                        {t("todos.created")}:{" "}
                        {selectedTodo.formatted_created_at || "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedTodo.evidence_files &&
                    selectedTodo.evidence_files.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {t("todos.evidenceFiles")}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedTodo.evidence_files.map((file, index) => (
                            <div
                              key={index}
                              className="border rounded-lg overflow-hidden bg-white"
                            >
                              {/\.(jpg|jpeg|png|gif)$/i.test(
                                file.path || file.url || file.full_url
                              ) ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    window.open(
                                      file.full_url ||
                                        file.url ||
                                        getStorageUrl(`storage/${file.path}`),
                                      "_blank"
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      window.open(
                                        file.full_url ||
                                          file.url ||
                                          getStorageUrl(`storage/${file.path}`),
                                        "_blank"
                                      );
                                  }}
                                  className="cursor-pointer"
                                >
                                  <img
                                    src={
                                      file.full_url ||
                                      file.url ||
                                      getStorageUrl(`storage/${file.path}`)
                                    }
                                    alt={file.name || `Evidence ${index + 1}`}
                                    className="w-full h-40 object-cover"
                                    onError={(e) => {
                                      console.log("Image failed to load:", {
                                        src: file.full_url || file.url,
                                        file: file,
                                        error: e
                                      });
                                      // Try fallback URL with correct backend port
                                      const fallbackUrl = getStorageUrl(`storage/${file.path}`);
                                      if (e.target.src !== fallbackUrl) {
                                        e.target.src = fallbackUrl;
                                      } else {
                                        e.target.style.display = "none";
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="p-3 flex items-center space-x-2">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={
                                      file.full_url ||
                                      file.url ||
                                      getStorageUrl(`storage/${file.path}`)
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    {file.name || `Evidence File ${index + 1}`}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedTodo.evidence_path &&
                    !selectedTodo.evidence_files && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Evidence File
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <a
                            href={`/storage/${selectedTodo.evidence_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Evidence File
                          </a>
                        </div>
                      </div>
                    )}

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEvidenceModal(false);
                        setSelectedTodo(null);
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowEvidenceModal(false);
                        handleEvaluate(selectedTodo);
                      }}
                      className="btn-primary px-6 py-3 text-sm font-medium"
                    >
                      Evaluate Task
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Evaluation Modal */}
      {showEvaluationModal && selectedTodo && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  {t("todos.evaluateTask")}: {selectedTodo.title}
                </h3>
                <div className="space-y-6">
                  {/* Evidence Review Section */}
                  {selectedTodo.evidence_files &&
                    selectedTodo.evidence_files.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {t("todos.evidenceReview", {
                            defaultValue: "Review Bukti Pengerjaan",
                          })}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedTodo.evidence_files.map((file, index) => (
                            <div
                              key={index}
                              className="border rounded-lg overflow-hidden bg-white"
                            >
                              {/\.(jpg|jpeg|png|gif)$/i.test(
                                file.path || file.url || file.full_url
                              ) ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    window.open(
                                      file.full_url ||
                                        file.url ||
                                        getStorageUrl(`storage/${file.path}`),
                                      "_blank"
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      window.open(
                                        file.full_url ||
                                          file.url ||
                                          getStorageUrl(`storage/${file.path}`),
                                        "_blank"
                                      );
                                  }}
                                  className="cursor-pointer"
                                >
                                  <img
                                    src={
                                      file.full_url ||
                                      file.url ||
                                      getStorageUrl(`storage/${file.path}`)
                                    }
                                    alt={file.name || `Evidence ${index + 1}`}
                                    className="w-full h-32 object-cover"
                                    onError={(e) => {
                                      console.log("Image failed to load:", {
                                        src: file.full_url || file.url,
                                        file: file,
                                        error: e
                                      });
                                      // Try fallback URL with correct backend port
                                      const fallbackUrl = getStorageUrl(`storage/${file.path}`);
                                      if (e.target.src !== fallbackUrl) {
                                        e.target.src = fallbackUrl;
                                      } else {
                                        e.target.style.display = "none";
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="p-3 flex items-center space-x-2">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={
                                      file.full_url ||
                                      file.url ||
                                      getStorageUrl(`storage/${file.path}`)
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                                  >
                                    {file.name || `Evidence File ${index + 1}`}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Task Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.taskInfo", { defaultValue: "Informasi Tugas" })}
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>{t("todos.user")}:</strong>{" "}
                        {getUserName(selectedTodo.user_id)}
                      </p>
                      <p>
                        <strong>{t("todos.duration")}:</strong>{" "}
                        {getDuration(selectedTodo)}
                      </p>
                      <p>
                        <strong>{t("todos.targetDuration")}:</strong>{" "}
                        {selectedTodo.target_duration_formatted || "N/A"}
                      </p>
                      {selectedTodo.evidence_note && (
                        <p>
                          <strong>
                            {t("todos.userNote", {
                              defaultValue: "Catatan User",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.evidence_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("common.notes")}
                    </label>
                    <textarea
                      value={evaluationData.notes}
                      onChange={(e) =>
                        setEvaluationData({
                          ...evaluationData,
                          notes: e.target.value,
                        })
                      }
                      rows={4}
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder={t("todos.evaluationPlaceholder")}
                    />
                  </div>

                  <div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Performance Rating (otomatis)
                      </label>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {evaluationData.rating ?? "-"}/100
                        </div>
                        <div className="text-sm text-gray-500">
                          Nilai dihitung otomatis dari perbandingan waktu
                          pengerjaan aktual dan target.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEvaluationModal(false);
                        setSelectedTodo(null);
                        setEvaluationData({
                          action: "approve",
                          notes: "",
                          warningPoints: 0,
                          warningNote: "",
                          rating: 0,
                        });
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t("todos.cancel")}
                    </button>
                    <button
                      onClick={handleSubmitEvaluation}
                      className="btn-primary px-6 py-3 text-sm font-medium"
                    >
                      {t("todos.evaluate")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  {editingTodo
                    ? t("common.editTodo")
                    : t("common.createNewTodo")}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (formData.todo_type === "tambahan") {
                      const dateStr = formData.scheduled_date || "";
                      const startTime = formData.target_start_at || "";
                      const endTime = formData.target_end_at || "";
                      setCreateSummary({
                        type: "tambahan",
                        title: formData.title,
                        description: formData.description,
                        priority: formData.priority,
                        target_category: formData.target_category,
                        selected_users: formData.selected_user_ids?.length || 0,
                        date: dateStr,
                        start_time: startTime,
                        end_time: endTime,
                      });
                    } else {
                      const unit = formData.recurrence_unit;
                      const interval = formData.recurrence_interval;
                      const days =
                        Array.isArray(formData.days_of_week) &&
                        formData.days_of_week.length
                          ? formData.days_of_week
                              .slice()
                              .sort((a, b) => a - b)
                              .map(
                                (d) =>
                                  [
                                    "Sun",
                                    "Mon",
                                    "Tue",
                                    "Wed",
                                    "Thu",
                                    "Fri",
                                    "Sat",
                                  ][d]
                              )
                              .join(", ")
                          : unit === "week"
                          ? "-"
                          : "";
                      setCreateSummary({
                        type: "rutin",
                        title: formData.title,
                        description: formData.description,
                        priority: formData.priority,
                        target_category: formData.target_category,
                        selected_users: formData.selected_user_ids?.length || 0,
                        start:
                          formData.recurrence_start_date ||
                          new Date().toISOString().slice(0, 10),
                        pattern: `Every ${interval} ${unit}${
                          interval > 1 ? "s" : ""
                        }`,
                        days,
                        preview: createRoutinePreviewCount,
                      });
                    }
                    setShowCreateConfirm(true);
                  }}
                  className="space-y-8"
                >
                  {/* Informasi Penugasan */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Informasi Penugasan
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("todos.targetAssignment")}
                        </label>
                        <select
                          value={formData.target_category}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              target_category: e.target.value,
                              selected_user_ids: [],
                            });
                            setAssignAllInCategory(false);
                          }}
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        >
                          <option value="all">{t("todos.allCategory")}</option>
                          <option value="ob">{t("todos.officeBoy")}</option>
                          <option value="driver">
                            {t("todos.driverEquipment")}
                          </option>
                          <option value="security">
                            {t("todos.securityEquipment")}
                          </option>
                          <option value="magang_pkl">
                            {t("common.employeeTypes.magang_pkl")}
                          </option>
                        </select>
                      </div>

                      {formData.target_category !== "all" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("todos.assignTo")} (Cari & Pilih Ganda)
                          </label>
                          <input
                            type="text"
                            placeholder={`Cari pengguna ${formData.target_category}...`}
                            value={modalUserSearch}
                            onChange={(e) => setModalUserSearch(e.target.value)}
                            className="mb-3 block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          />

                          {/* Assign to All Option */}
                          <div className="mb-3">
                            <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-blue-50">
                              <input
                                type="checkbox"
                                checked={assignAllInCategory}
                                onChange={(e) => {
                                  setAssignAllInCategory(e.target.checked);
                                  if (e.target.checked) {
                                    const allUserIds = users
                                      .filter(
                                        (u) =>
                                          u.category ===
                                          formData.target_category
                                      )
                                      .map((u) => u.id);
                                    setFormData({
                                      ...formData,
                                      selected_user_ids: allUserIds,
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selected_user_ids: [],
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm font-medium text-blue-900">
                                {t("todos.assignToAll")}
                              </span>
                            </label>
                          </div>

                          <div className="max-h-40 overflow-auto border rounded-md">
                            {users
                              .filter(
                                (u) => u.category === formData.target_category
                              )
                              .filter(
                                (u) =>
                                  !modalUserSearch ||
                                  u.name
                                    .toLowerCase()
                                    .includes(modalUserSearch.toLowerCase())
                              )
                              .map((u) => (
                                <label
                                  key={u.id}
                                  className="flex items-center gap-2 px-3 py-3 border-b last:border-b-0 hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.selected_user_ids.includes(
                                      u.id
                                    )}
                                    onChange={(e) => {
                                      const next = new Set(
                                        formData.selected_user_ids
                                      );
                                      if (e.target.checked) next.add(u.id);
                                      else next.delete(u.id);
                                      setFormData({
                                        ...formData,
                                        selected_user_ids: Array.from(next),
                                      });
                                      setAssignAllInCategory(false);
                                    }}
                                  />
                                  <span className="text-sm">{u.name}</span>
                                </label>
                              ))}
                            {users.filter(
                              (u) =>
                                u.category === formData.target_category &&
                                (!modalUserSearch ||
                                  u.name
                                    .toLowerCase()
                                    .includes(modalUserSearch.toLowerCase()))
                            ).length === 0 && (
                              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                {t("common.noUsersFound")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informasi Tugas */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Informasi Tugas
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("todos.taskName")}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          placeholder="Masukkan nama tugas..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("todos.description")}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          rows={4}
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          placeholder="Masukkan deskripsi tugas..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("todos.todoType")}
                        </label>
                        <select
                          value={formData.todo_type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              todo_type: e.target.value,
                            })
                          }
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        >
                          <option value="rutin">{t("todos.routine")}</option>
                          <option value="tambahan">
                            {t("todos.additional")}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Waktu */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Waktu
                    </h3>
                    <div className="space-y-6">
                      {formData.todo_type === "tambahan" && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t("todos.startDate")}
                            </label>
                            <input
                              type="date"
                              value={formData.scheduled_date || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  scheduled_date: e.target.value,
                                })
                              }
                              className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Jam Mulai
                            </label>
                            <input
                              type="time"
                              value={formData.target_start_at || ""}
                              onChange={(e) => {
                                const selectedTime = e.target.value;
                                const now = new Date();
                                const today = now.toISOString().slice(0, 10);

                                // For today's date, prevent selecting past times
                                if (formData.scheduled_date === today) {
                                  const selectedDateTime = new Date(
                                    `${today}T${selectedTime}`
                                  );
                                  if (selectedDateTime < now) {
                                    notifyError(
                                      "Waktu mulai tidak boleh lebih awal dari waktu saat ini"
                                    );
                                    return;
                                  }
                                }

                                setFormData({
                                  ...formData,
                                  target_start_at: selectedTime,
                                });
                              }}
                              className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            />
                          </div>

                          {/* Target Duration Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Durasi
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formData.target_duration_value || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    target_duration_value: e.target.value,
                                  })
                                }
                                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                                placeholder="Masukkan durasi target"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Satuan Durasi
                              </label>
                              <select
                                value={formData.target_duration_unit}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    target_duration_unit: e.target.value,
                                  })
                                }
                                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                              >
                                <option value="minutes">Menit</option>
                                <option value="hours">Jam</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.todo_type === "rutin" && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t("todos.startDate")}
                            </label>
                            <input
                              type="date"
                              value={formData.recurrence_start_date}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  recurrence_start_date: e.target.value,
                                })
                              }
                              className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Jam Mulai
                            </label>
                            <input
                              type="time"
                              value={formData.target_start_at || ""}
                              onChange={(e) => {
                                const selectedTime = e.target.value;
                                const now = new Date();
                                const today = now.toISOString().slice(0, 10);

                                // For today's date, prevent selecting past times
                                if (formData.recurrence_start_date === today) {
                                  const selectedDateTime = new Date(
                                    `${today}T${selectedTime}`
                                  );
                                  if (selectedDateTime < now) {
                                    notifyError(
                                      "Waktu mulai tidak boleh lebih awal dari waktu saat ini"
                                    );
                                    return;
                                  }
                                }

                                setFormData({
                                  ...formData,
                                  target_start_at: selectedTime,
                                });
                              }}
                              className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t("todos.every")}
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={formData.recurrence_interval}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    recurrence_interval: parseInt(
                                      e.target.value || "1"
                                    ),
                                  })
                                }
                                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t("todos.unit")}
                              </label>
                              <select
                                value={formData.recurrence_unit}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    recurrence_unit: e.target.value,
                                  })
                                }
                                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                              >
                                <option value="day">{t("todos.day")}</option>
                                <option value="week">{t("todos.week")}</option>
                                <option value="month">
                                  {t("todos.month")}
                                </option>
                              </select>
                            </div>
                          </div>

                          {formData.recurrence_unit === "week" && (
                            <div className="grid grid-cols-1 gap-3 mt-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                  {t("todos.days")}
                                </label>
                                <div className="grid grid-cols-4 gap-2 text-sm">
                                  {[
                                    { v: 1, l: "Sen" },
                                    { v: 2, l: "Sel" },
                                    { v: 3, l: "Rab" },
                                    { v: 4, l: "Kam" },
                                    { v: 5, l: "Jum" },
                                    { v: 6, l: "Sab" },
                                    { v: 0, l: "Min" },
                                  ].map((d) => (
                                    <label
                                      key={d.v}
                                      className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={(Array.isArray(
                                          formData.days_of_week
                                        )
                                          ? formData.days_of_week
                                          : []
                                        ).includes(d.v)}
                                        onChange={(e) => {
                                          const base = Array.isArray(
                                            formData.days_of_week
                                          )
                                            ? formData.days_of_week
                                            : [];
                                          const next = new Set(base);
                                          if (e.target.checked) next.add(d.v);
                                          else next.delete(d.v);
                                          setFormData({
                                            ...formData,
                                            days_of_week: Array.from(next),
                                          });
                                        }}
                                      />
                                      <span>{d.l}</span>
                                    </label>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Pilih hari-hari dalam minggu untuk
                                  penjadwalan.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Target Duration Fields for Routine */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Durasi
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formData.target_duration_value || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    target_duration_value: e.target.value,
                                  })
                                }
                                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                                placeholder="Masukkan durasi target"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Satuan Durasi
                              </label>
                              <select
                                value={formData.target_duration_unit}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    target_duration_unit: e.target.value,
                                  })
                                }
                                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                              >
                                <option value="minutes">Menit</option>
                                <option value="hours">Jam</option>
                              </select>
                            </div>
                          </div>

                          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 border border-blue-200">
                            <p className="font-medium mb-2">Perkiraan Tugas:</p>
                            <p>
                              Perkiraan 30 hari ke depan — sekitar{" "}
                              {createRoutinePreviewPerUser} tugas per orang ×{" "}
                              {createRoutinePreviewUsers} orang ={" "}
                              {createRoutinePreviewCount} tugas.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingTodo(null);
                        setAssignAllInCategory(false);
                        setFormData({
                          title: "",
                          description: "",
                          todo_type: "rutin",
                          target_category: "all",
                          target_user_id: "",
                          selected_user_ids: [],
                          recurrence_start_date: "",
                          recurrence_interval: 1,
                          recurrence_unit: "day",
                          recurrence_count: 0,
                          days_of_week: [],
                          scheduled_date: "",
                          target_start_at: "",
                          target_end_at: "",
                          target_duration_value: "",
                          target_duration_unit: "minutes",
                        });
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t("todos.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-6 py-3 text-sm font-medium"
                    >
                      {editingTodo ? t("common.update") : t("todos.create")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit Routine Modal */}
      {showEditRoutineModal && routineGroupEdited && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border border-gray-200 w-full max-w-2xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("todos.editRoutine")}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Group: {routineGroupEdited.title}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    // Confirmation summary
                    const summary = `Title: ${routineForm.title}\nCategory: ${
                      routineForm.target_category
                    }${
                      routineForm.selected_user_ids?.length
                        ? ` (selected ${routineForm.selected_user_ids.length})`
                        : ""
                    }\nRecurrence: Every ${routineForm.recurrence_interval} ${
                      routineForm.recurrence_unit
                    }${routineForm.recurrence_interval > 1 ? "s" : ""} × ${
                      (routineForm.recurrence_count ?? 0) || "∞"
                    }\nStart: ${
                      routineForm.recurrence_start_date || "(today)"
                    }\nWill create approximately ${routinePreviewCount} tasks this month.`;
                    if (!window.confirm(`Apply routine changes?\n\n${summary}`))
                      return;

                    // If delete & recreate current month
                    if (routineStrategy === "delete_recreate") {
                      const delPayload = {
                        title: routineGroupEdited.title,
                        recurrence_interval:
                          routineGroupEdited.sample?.recurrence_interval || 1,
                        recurrence_unit:
                          routineGroupEdited.sample?.recurrence_unit || "day",
                        target_category:
                          routineGroupEdited.sample?.target_category ||
                          undefined,
                        recurrence_count:
                          routineGroupEdited.sample?.recurrence_count ?? 0,
                        user_id:
                          routineGroupEdited.users.length === 1
                            ? routineGroupEdited.users[0].id
                            : undefined,
                      };
                      await api.post("/todos/routine-group/delete", delPayload);
                    }

                    // Create new routine occurrences
                    const createPayload = { ...routineForm };
                    // if target_category !== all and no selected users, assign to all in that category
                    if (
                      createPayload.target_category !== "all" &&
                      (!createPayload.selected_user_ids ||
                        createPayload.selected_user_ids.length === 0)
                    ) {
                      const ids = users
                        .filter(
                          (u) =>
                            u.role === "user" &&
                            u.category === createPayload.target_category
                        )
                        .map((u) => u.id);
                      createPayload.selected_user_ids = ids;
                    }
                    await api.post("/todos", createPayload);

                    const [todosRes, usersRes] = await Promise.all([
                      api.get("/todos/all"),
                      api.get("/users"),
                    ]);
                    setTodos(todosRes.data.data || todosRes.data);
                    setUsers(usersRes.data || []);
                    setShowEditRoutineModal(false);
                    setRoutineGroupEdited(null);
                  } catch (er) {
                    alert(
                      er?.response?.data?.message || "Failed to update routine"
                    );
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("todos.taskName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={routineForm.title}
                    onChange={(e) =>
                      setRoutineForm({ ...routineForm, title: e.target.value })
                    }
                    className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={routineForm.priority}
                    onChange={(e) =>
                      setRoutineForm({
                        ...routineForm,
                        priority: e.target.value,
                      })
                    }
                    className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("todos.targetAssignment")}
                  </label>
                  <select
                    value={routineForm.target_category}
                    onChange={(e) =>
                      setRoutineForm({
                        ...routineForm,
                        target_category: e.target.value,
                        selected_user_ids: [],
                      })
                    }
                    className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="all">{t("todos.allCategory")}</option>
                    <option value="ob">
                      {t("common.categories.obEquipment")}
                    </option>
                    <option value="driver">
                      {t("common.categories.driverEquipment")}
                    </option>
                    <option value="security">
                      {t("common.categories.securityEquipment")}
                    </option>
                    <option value="magang_pkl">
                      {t("common.employeeTypes.magang_pkl")}
                    </option>
                  </select>
                </div>
                {routineForm.target_category !== "all" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To (optional)
                    </label>
                    <div className="max-h-32 overflow-auto border rounded-md">
                      {users
                        .filter(
                          (u) =>
                            u.role === "user" &&
                            u.category === routineForm.target_category
                        )
                        .map((u) => (
                          <label
                            key={u.id}
                            className="flex items-center gap-2 px-3 py-3 border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={routineForm.selected_user_ids.includes(
                                u.id
                              )}
                              onChange={(e) => {
                                const next = new Set(
                                  routineForm.selected_user_ids
                                );
                                if (e.target.checked) next.add(u.id);
                                else next.delete(u.id);
                                setRoutineForm({
                                  ...routineForm,
                                  selected_user_ids: Array.from(next),
                                });
                              }}
                            />
                            <span className="text-sm text-gray-700">
                              {u.name}
                            </span>
                          </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Biarkan kosong untuk assign ke semua user di kategori ini.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("common.startDate")}
                  </label>
                  <input
                    type="date"
                    value={routineForm.recurrence_start_date}
                    onChange={(e) =>
                      setRoutineForm({
                        ...routineForm,
                        recurrence_start_date: e.target.value,
                      })
                    }
                    className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("common.every")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={routineForm.recurrence_interval}
                      onChange={(e) =>
                        setRoutineForm({
                          ...routineForm,
                          recurrence_interval: parseInt(
                            e.target.value || "1",
                            10
                          ),
                        })
                      }
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("common.unit")}
                    </label>
                    <select
                      value={routineForm.recurrence_unit}
                      onChange={(e) =>
                        setRoutineForm({
                          ...routineForm,
                          recurrence_unit: e.target.value,
                        })
                      }
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                  {/* Repeat count removed for clarity in edit as well */}
                </div>

                {routineForm.recurrence_unit === "week" && (
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Days of week
                      </label>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        {[
                          { v: 1, l: "Mon" },
                          { v: 2, l: "Tue" },
                          { v: 3, l: "Wed" },
                          { v: 4, l: "Thu" },
                          { v: 5, l: "Fri" },
                          { v: 6, l: "Sat" },
                          { v: 0, l: "Sun" },
                        ].map((d) => (
                          <label
                            key={d.v}
                            className="flex items-center gap-2 border rounded px-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={(Array.isArray(routineForm.days_of_week)
                                ? routineForm.days_of_week
                                : []
                              ).includes(d.v)}
                              onChange={(e) => {
                                const base = Array.isArray(
                                  routineForm.days_of_week
                                )
                                  ? routineForm.days_of_week
                                  : [];
                                const next = new Set(base);
                                if (e.target.checked) next.add(d.v);
                                else next.delete(d.v);
                                setRoutineForm({
                                  ...routineForm,
                                  days_of_week: Array.from(next),
                                });
                              }}
                            />
                            <span>{d.l}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Pilih hari-hari dalam minggu untuk penjadwalan.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t("common.applyStrategy")}
                  </label>
                  <div className="space-y-1 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="routineStrategy"
                        checked={routineStrategy === "future_only"}
                        onChange={() => setRoutineStrategy("future_only")}
                      />
                      <span>
                        Apply to future only (create new from start date)
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="routineStrategy"
                        checked={routineStrategy === "delete_recreate"}
                        onChange={() => setRoutineStrategy("delete_recreate")}
                      />
                      <span>{t("todos.deleteRecreate")}</span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 border border-gray-200">
                  <p className="font-medium mb-1">Preview:</p>
                  <p>
                    Sekitar <strong>{routinePreviewCount}</strong> tugas akan
                    dibuat bulan ini.
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditRoutineModal(false);
                      setRoutineGroupEdited(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-6 py-3 text-sm font-medium"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Create Routine Modal */}
      {showCreateConfirm && createSummary && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1100] flex items-center justify-center p-4">
            <div className="relative mx-auto border border-gray-200 w-full max-w-md shadow-lg rounded-xl bg-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("common.confirmDetails")}
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <div>
                    <span className="text-gray-500">
                      {t("todos.taskName")}:
                    </span>{" "}
                    {createSummary.title}
                  </div>
                  {createSummary.description && (
                    <div>
                      <span className="text-gray-500">Description:</span>{" "}
                      {createSummary.description}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">
                      {t("todos.targetAssignment")}:
                    </span>{" "}
                    {formatTargetCategory(createSummary.target_category)}
                    {createSummary.selected_users
                      ? ` (${createSummary.selected_users} selected)`
                      : ""}
                  </div>
                  {createSummary.type === "tambahan" ? (
                    <>
                      <div>
                        <span className="text-gray-500">Date:</span>{" "}
                        {createSummary.date || "-"}
                      </div>
                      <div>
                        <span className="text-gray-500">Start Time:</span>{" "}
                        {createSummary.start_time || "-"}
                      </div>
                      <div>
                        <span className="text-gray-500">End Time:</span>{" "}
                        {createSummary.end_time || "-"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-500">Start:</span>{" "}
                        {createSummary.start}
                      </div>
                      <div>
                        <span className="text-gray-500">Pattern:</span>{" "}
                        {createSummary.pattern}
                      </div>
                      {createSummary.days && (
                        <div>
                          <span className="text-gray-500">Days:</span>{" "}
                          {createSummary.days}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Akan membuat sekitar <b>{createSummary.preview}</b>{" "}
                        tugas bulan ini.
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateConfirm(false);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("common.back")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (isCreating) return; // guard against double clicks
                      setIsCreating(true);
                      try {
                        if (editingTodo) {
                          await api.patch(`/todos/${editingTodo.id}`, formData);
                        } else {
                          const payload = { ...formData };
                          if (assignAllInCategory)
                            payload.selected_user_ids = [];
                          if (payload.todo_type === "tambahan") {
                            // compose MySQL-friendly datetimes (local) YYYY-MM-DD HH:mm:ss
                            const dateStr = payload.scheduled_date || "";
                            const fmt = (d, t) => {
                              if (!d || !t) return null;
                              const [hh = "00", mm = "00"] =
                                String(t).split(":");
                              return `${d} ${hh.padStart(2, "0")}:${mm.padStart(
                                2,
                                "0"
                              )}:00`;
                            };
                            payload.target_start_at = fmt(
                              dateStr,
                              payload.target_start_at
                            );
                            payload.target_end_at = fmt(
                              dateStr,
                              payload.target_end_at
                            );
                            // Normalize empties to null for backend validator compatibility
                            // TODO: review this merge decision — ensure empty strings are not sent for date fields
                            if (!payload.target_start_at)
                              payload.target_start_at = null;
                            if (!payload.target_end_at)
                              payload.target_end_at = null;
                            if (!payload.scheduled_date)
                              payload.scheduled_date = null;
                            delete payload.recurrence_start_date;
                            delete payload.recurrence_interval;
                            delete payload.recurrence_unit;
                            delete payload.recurrence_count;
                            delete payload.days_of_week;
                          } else {
                            // Routine: avoid sending stray time-only values
                            if (
                              payload.target_start_at &&
                              payload.target_start_at.length <= 5
                            ) {
                              payload.target_start_at = null;
                            }
                            if (
                              payload.target_end_at &&
                              payload.target_end_at.length <= 5
                            ) {
                              payload.target_end_at = null;
                            }
                            if (!payload.recurrence_start_date)
                              payload.recurrence_start_date = null;
                          }
                          // Common: convert empty string dates to null
                          if (!payload.due_date) payload.due_date = null;
                          await api.post("/todos", payload);
                        }
                        const res = await api.get("/todos/all");
                        setTodos(res.data.data || res.data);
                        setShowCreateConfirm(false);
                        setShowCreateModal(false);
                        setEditingTodo(null);
                      } catch (e) {
                        alert(e?.response?.data?.message || "Failed to save");
                      } finally {
                        setIsCreating(false);
                      }
                    }}
                    className="btn-primary px-6 py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isCreating}
                  >
                    {t("todos.create")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Routine Group Detail Modal (read-only) */}
      {showRoutineDetail && routineDetail && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1100] flex items-center justify-center p-4">
            <div className="relative mx-auto border border-gray-200 w-full max-w-md shadow-lg rounded-xl bg-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("todos.routineDetails")}
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <div>
                    <span className="text-gray-500">
                      {t("todos.taskName")}:
                    </span>{" "}
                    {routineDetail.title}
                  </div>
                  {routineDetail.description && (
                    <div>
                      <span className="text-gray-500">Description:</span>{" "}
                      {routineDetail.description}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">
                      {t("todos.targetAssignment")}:
                    </span>{" "}
                    {formatTargetCategory(routineDetail.target_category)}
                  </div>
                  <div>
                    <span className="text-gray-500">{t("todos.start")}:</span>{" "}
                    {routineDetail.start}
                  </div>
                  <div>
                    <span className="text-gray-500">Pengulangan:</span>{" "}
                    {routineDetail.pattern}
                  </div>
                  {routineDetail.days && (
                    <div>
                      <span className="text-gray-500">{t("todos.days")}:</span>{" "}
                      {routineDetail.days}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoutineDetail(false);
                      setRoutineDetail(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("common.close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Todo Export Modal */}
      <TodoExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        todos={todos}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        selectedTodos={[]}
        user={user}
      />
    </div>
  );
};

export default AdminTodos;
