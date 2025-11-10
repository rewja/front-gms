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
import AdminTodoStats from "../../components/todos/AdminTodoStats";
import AdminTodoFilters from "../../components/todos/AdminTodoFilters";
import {
  formatTargetCategory,
  formatRoutinePattern,
  formatRoutinePatternShort,
  getTaskDate,
  formatStatusLabel,
  getDateRange,
  calculateAutomaticRating,
  getDuration,
  getTargetStartTime,
} from "../../components/todos/todoHelpers";
import { getStatusColor } from "../../components/todos/TodoStatusIcon";
import AdminTodoTabs from "../../components/todos/AdminTodoTabs";
import TodoDetailModal from "../../components/todos/modals/TodoDetailModal";
import TodoEvidenceModal from "../../components/todos/modals/TodoEvidenceModal";
import TodoEvaluationModal from "../../components/todos/modals/TodoEvaluationModal";
import RoutineDetailModal from "../../components/todos/modals/RoutineDetailModal";
import CreateConfirmModal from "../../components/todos/modals/CreateConfirmModal";
import CreateEditTodoModal from "../../components/todos/modals/CreateEditTodoModal";
import EditRoutineModal from "../../components/todos/modals/EditRoutineModal";

const AdminTodos = () => {
  const { t, i18n } = useTranslation();
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

  // Helper function wrapped for translation
  const formatTargetCategoryLocal = (category) => formatTargetCategory(category, t);

  // Helper functions wrapped for i18n
  const formatRoutinePatternLocal = (routineData) => formatRoutinePattern(routineData, t, i18n);
  const formatRoutinePatternShortLocal = (routineData) => formatRoutinePatternShort(routineData, t, i18n);

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


  // Memoize user names map untuk performa lebih baik
  const userNamesMap = React.useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      map.set(u.id, u.name || `User ${u.id}`);
    });
    return map;
  }, [users]);

  const getUserName = (userId) => {
    return userNamesMap.get(userId) || `User ${userId}`;
  };

  // Helper functions wrapped for translation
  const formatStatusLabelLocal = (status) => formatStatusLabel(status, t);

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

  // Use imported getDateRange helper
  const getDateRangeLocal = () => getDateRange(dateFilter, dateFrom, dateTo);

  // Optimized search: pre-compute user names untuk performa lebih baik
  const filteredTodos = React.useMemo(() => {
    if (!searchTerm && statusFilter === "all" && !dateFilter && !dateFrom && !dateTo) {
      return todos;
    }

    const searchLc = (searchTerm || "").toLowerCase().trim();
    const range = getDateRange();

    return todos.filter((todo) => {
      // Search matching: cek title, description, dan user name
      let matchesSearch = true;
      if (searchLc) {
        const titleLc = (todo.title || "").toLowerCase();
        const descLc = (todo.description || "").toLowerCase();
        const userNameLc = getUserName(todo.user_id).toLowerCase();
        matchesSearch =
          titleLc.includes(searchLc) ||
          descLc.includes(searchLc) ||
          userNameLc.includes(searchLc);
      }

      // Status filter
      const matchesStatus =
        statusFilter === "all" || (todo.status || "").toString() === statusFilter;

      // Date filter
      const matchesDate = (() => {
        if (!range) return true;
        const todoDate = getTaskDate(todo);
        if (!todoDate) return false;
        const after = todoDate >= range.start;
        const before = !range.end || todoDate < range.end;
        return after && before;
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [todos, searchTerm, statusFilter, dateFilter, dateFrom, dateTo, userNamesMap]);

  // Reset page when filters/search change to avoid empty pages
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, dateFrom, dateTo, todoTab]);

  // Build the list actually shown in the list section (respect tab rules used below)
  const listForDisplayBase = React.useMemo(() => {
    const base = filteredTodos
      .filter((t) => {
        if (todoTab === "rutin" && statusFilter === "all") return false; // groups shown above
        if (todoTab === "rutin") return (t.todo_type || "rutin") === "rutin";
        if (todoTab === "tambahan") return (t.todo_type || "rutin") !== "rutin";
        if (statusFilter === "all") return (t.todo_type || "rutin") !== "rutin"; // in "all" tab suppress routine list when groups shown
        return true;
      })
      .sort((a, b) => {
        const dateA = getTaskDate(a) || new Date(0);
        const dateB = getTaskDate(b) || new Date(0);
        return dateB - dateA; // newest first
      });
    return base;
  }, [filteredTodos, todoTab, statusFilter]);

  // Pagination math for list display
  const totalItems = listForDisplayBase.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const listForDisplay = listForDisplayBase.slice(startIndex, startIndex + itemsPerPage);



  const distribution = React.useMemo(() => {
    // Compute status counts ignoring the current statusFilter,
    // but honoring search/date filters
    const searchLc = (searchTerm || "").toLowerCase().trim();
    const range = getDateRange();

    const base = todos.filter((todo) => {
      let matchesSearch = true;
      if (searchLc) {
        const titleLc = (todo.title || "").toLowerCase();
        const descLc = (todo.description || "").toLowerCase();
        const userNameLc = getUserName(todo.user_id).toLowerCase();
        matchesSearch =
          titleLc.includes(searchLc) ||
          descLc.includes(searchLc) ||
          userNameLc.includes(searchLc);
      }

      const matchesDate = (() => {
        if (!range) return true;
        const todoDate = getTaskDate(todo);
        if (!todoDate) return false;
        const after = todoDate >= range.start;
        const before = !range.end || todoDate < range.end;
        return after && before;
      })();

      return matchesSearch && matchesDate;
    });

    return {
      not_started: base.filter((t) => t.status === "not_started").length,
      in_progress: base.filter((t) => t.status === "in_progress").length,
      hold: base.filter((t) => t.status === "hold").length,
      checking: base.filter((t) => t.status === "checking").length,
      evaluating: base.filter((t) => t.status === "evaluating").length,
      completed: base.filter((t) => t.status === "completed").length,
    };
  }, [todos, searchTerm, dateFilter, dateFrom, dateTo, userNamesMap]);

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

      {/* Tabs: All / Rutin / Tambahan */}
      <AdminTodoTabs
        todoTab={todoTab}
        onTabChange={setTodoTab}
        filteredTodos={filteredTodos}
        t={t}
      />

      {/* Stats */}
      <AdminTodoStats
        distribution={distribution}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        loading={loading}
        t={t}
      />

      {/* Filters */}
      <AdminTodoFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        showDateDropdown={showDateDropdown}
        onToggleDateDropdown={setShowDateDropdown}
        todos={todos}
        getTaskDate={getTaskDate}
        t={t}
      />

      {/* Routine Groups */}
      {/* Routine list cards */}
      {routineGroups.length > 0 &&
        (todoTab === "all" || todoTab === "rutin") &&
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
                        {formatRoutinePatternShortLocal(g.def || g.sample)}
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
                          pattern: formatRoutinePatternLocal(s),
                          days:
                            Array.isArray(s.days_of_week) &&
                            s.days_of_week.length
                              ? s.days_of_week
                                  .slice()
                                  .sort((a, b) => a - b)
                                  .map(
                                    (d) =>
                                      [
                                        t("common.days.sunday"),
                                        t("common.days.monday"),
                                        t("common.days.tuesday"),
                                        t("common.days.wednesday"),
                                        t("common.days.thursday"),
                                        t("common.days.friday"),
                                        t("common.days.saturday"),
                                      ][d] || d
                                  )
                                  .join(` ${t("todos.routinePattern.and")} `)
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
                                                {formatStatusLabelLocal(
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
                                                  const localeTag = i18n.language === "id" ? "id-ID" : "en-US";
                                                  const dateText =
                                                    todoItem.scheduled_date
                                                      ? new Date(
                                                          todoItem.scheduled_date
                                                        ).toLocaleDateString(
                                                          localeTag,
                                                          {
                                                            weekday: "long",
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                          }
                                                        )
                                                      : todoItem.formatted_created_at ||
                                                        new Date(todoItem.created_at).toLocaleDateString(localeTag, {
                                                          year: "numeric",
                                                          month: "short",
                                                          day: "numeric",
                                                        });
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

      {/* Todo List - paginated; show only tambahan when tab is tambahan, rutin when tab is rutin, all when tab is all */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {listForDisplay.map((todo) => (
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
                        {formatStatusLabelLocal(todo.status)}
                      </span>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                        {(todo.todo_type || "rutin") === "rutin"
                          ? t("todos.routine")
                          : t("todos.additional")}
                      </span>
                      {(todo.todo_type || "rutin") === "rutin" && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                          {formatRoutinePatternLocal(todo)}
                        </span>
                      )}
                    </div>

                    {/* Info Section */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium">
                            {t("todos.assignedTo", {
                              defaultValue:
                                i18n.language === "id"
                                  ? "Ditugaskan kepada"
                                  : "Assigned to",
                            })}:
                          </span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {getUserName(todo.user_id)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2 text-green-500" />
                          <span className="font-medium">{t("todos.scheduledDate", { defaultValue: "Scheduled Date" })}:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                          {(() => {
                            const localeTag = i18n.language === "id" ? "id-ID" : "en-US";
                            const dateText = todo.scheduled_date
                              ? new Date(todo.scheduled_date).toLocaleDateString(localeTag, {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : todo.formatted_created_at ||
                                new Date(todo.created_at).toLocaleDateString(localeTag, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                });
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

      {/* Pagination controls */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{t("common.itemsPerPage")}:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value, 10));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>
            {t("common.showingItems", {
              start: startIndex + 1,
              end: Math.min(startIndex + itemsPerPage, totalItems),
              total: totalItems,
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            {t("common.previous")}
          </button>
          <span className="text-sm text-gray-600">
            {t("common.pageInfo", { current: safePage, total: totalPages })}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      <TodoDetailModal
        isOpen={showDetailModal}
        todo={selectedTodo}
        onClose={() => setShowDetailModal(false)}
        getUserName={getUserName}
        formatTargetCategoryLocal={formatTargetCategoryLocal}
        formatStatusLabelLocal={formatStatusLabelLocal}
        i18n={i18n}
        t={t}
      />

      {/* Evidence Modal */}
      <TodoEvidenceModal
        isOpen={showEvidenceModal}
        todo={selectedTodo}
        onClose={() => {
          setShowEvidenceModal(false);
          setSelectedTodo(null);
        }}
        onEvaluate={handleEvaluate}
        getUserName={getUserName}
        t={t}
      />

      {/* Evaluation Modal */}
      <TodoEvaluationModal
        isOpen={showEvaluationModal}
        todo={selectedTodo}
        evaluationData={evaluationData}
        onEvaluationDataChange={setEvaluationData}
        onClose={() => {
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
        onSubmit={handleSubmitEvaluation}
        getUserName={getUserName}
        t={t}
      />

      {/* Create/Edit Modal */}
      <CreateEditTodoModal
        isOpen={showCreateModal}
        editingTodo={editingTodo}
        formData={formData}
        onFormDataChange={setFormData}
        modalUserSearch={modalUserSearch}
        onModalUserSearchChange={setModalUserSearch}
        assignAllInCategory={assignAllInCategory}
        onAssignAllInCategoryChange={setAssignAllInCategory}
        users={users}
        createRoutinePreviewCount={createRoutinePreviewCount}
        createRoutinePreviewPerUser={createRoutinePreviewPerUser}
        createRoutinePreviewUsers={createRoutinePreviewUsers}
        onClose={() => {
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
        onSubmit={() => {
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
            // Format days using translation
            const days =
              Array.isArray(formData.days_of_week) &&
              formData.days_of_week.length
                ? formData.days_of_week
                    .slice()
                    .sort((a, b) => a - b)
                    .map(
                      (d) =>
                        [
                          t("common.days.sundayShort"),
                          t("common.days.mondayShort"),
                          t("common.days.tuesdayShort"),
                          t("common.days.wednesdayShort"),
                          t("common.days.thursdayShort"),
                          t("common.days.fridayShort"),
                          t("common.days.saturdayShort"),
                        ][d]
                    )
                    .join(", ")
                : unit === "week"
                ? "-"
                : "";
            // Create routine data object for formatRoutinePattern
            const routineData = {
              recurrence_unit: unit,
              recurrence_interval: interval,
              recurrence_start_date: formData.recurrence_start_date || new Date().toISOString().slice(0, 10),
              days_of_week: formData.days_of_week || [],
            };
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
              pattern: formatRoutinePatternLocal(routineData),
              days,
              preview: createRoutinePreviewCount,
            });
          }
          setShowCreateConfirm(true);
        }}
        notifyError={notifyError}
        t={t}
      />

      {/* Edit Routine Modal */}
      <EditRoutineModal
        isOpen={showEditRoutineModal}
        routineGroupEdited={routineGroupEdited}
        routineForm={routineForm}
        onRoutineFormChange={setRoutineForm}
        routineStrategy={routineStrategy}
        onRoutineStrategyChange={setRoutineStrategy}
        routinePreviewCount={routinePreviewCount}
        users={users}
        onClose={() => {
          setShowEditRoutineModal(false);
          setRoutineGroupEdited(null);
        }}
        onSubmit={async () => {
          // Handler is inside EditRoutineModal component
        }}
        onSuccess={(todosRes, usersRes) => {
          setTodos(todosRes.data.data || todosRes.data);
          setUsers(usersRes.data || []);
          setShowEditRoutineModal(false);
          setRoutineGroupEdited(null);
        }}
        t={t}
      />

      {/* Confirm Create Routine Modal */}
      <CreateConfirmModal
        isOpen={showCreateConfirm}
        createSummary={createSummary}
        onClose={() => setShowCreateConfirm(false)}
        onConfirm={async () => {
          if (isCreating) return; // guard against double clicks
          setIsCreating(true);
          try {
            if (editingTodo) {
              await api.patch(`/todos/${editingTodo.id}`, formData);
            } else {
              const payload = { ...formData };
              if (assignAllInCategory) payload.selected_user_ids = [];
              if (payload.todo_type === "tambahan") {
                // compose MySQL-friendly datetimes (local) YYYY-MM-DD HH:mm:ss
                const dateStr = payload.scheduled_date || "";
                const fmt = (d, t) => {
                  if (!d || !t) return null;
                  const [hh = "00", mm = "00"] = String(t).split(":");
                  return `${d} ${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`;
                };
                payload.target_start_at = fmt(dateStr, payload.target_start_at);
                payload.target_end_at = fmt(dateStr, payload.target_end_at);
                // Normalize empties to null for backend validator compatibility
                if (!payload.target_start_at) payload.target_start_at = null;
                if (!payload.target_end_at) payload.target_end_at = null;
                if (!payload.scheduled_date) payload.scheduled_date = null;
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
                if (payload.target_end_at && payload.target_end_at.length <= 5) {
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
        isCreating={isCreating}
        formatTargetCategoryLocal={formatTargetCategoryLocal}
        t={t}
      />

      {/* Routine Group Detail Modal (read-only) */}
      <RoutineDetailModal
        isOpen={showRoutineDetail}
        routineDetail={routineDetail}
        onClose={() => {
          setShowRoutineDetail(false);
          setRoutineDetail(null);
        }}
        formatTargetCategoryLocal={formatTargetCategoryLocal}
        t={t}
      />

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
