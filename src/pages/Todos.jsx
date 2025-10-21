import { useEffect, useState, useMemo } from "react";
import ModalPortal from "../components/ModalPortal";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../components/NotificationSystem";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { api } from "../lib/api";
import { getStorageUrl } from "../config/api";
import {
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Upload,
  Eye,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../components/SkeletonLoader";

const Todos = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const { handleApiError } = useErrorHandler();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [todoToHold, setTodoToHold] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]); // multiple files
  const [evidencePreviews, setEvidencePreviews] = useState([]); // { file, url }
  const [todoToSubmit, setTodoToSubmit] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    target_start_at: "",
    target_end_at: "",
    todo_type: "rutin",
    target_category: "all",
    target_user_id: "",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [statusSearchTerm, setStatusSearchTerm] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [statusPreselected, setStatusPreselected] = useState("all");
  const [datePreselected, setDatePreselected] = useState("today");
  const [todoTypeTab, setTodoTypeTab] = useState("all"); // all | rutin | tambahan
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadingStates, setLoadingStates] = useState({});
  const [todayNotStarted, setTodayNotStarted] = useState(0);

  // No need for getEffectiveDateFilter - use dateFilter directly

  const getStatusIcon = (status) => {
    switch (status) {
      case "not_started":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "checking":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "evaluating":
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "hold":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "not_started":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "checking":
        return "bg-orange-100 text-orange-800";
      case "evaluating":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "hold":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Logical task date helper (prefer scheduled_date when present)
  const getTaskDate = (todo) => {
    const dateStr = todo?.scheduled_date || todo?.created_at;
    return dateStr ? new Date(dateStr) : null;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to get date range based on filter
  const getDateRange = (filter) => {
    if (!filter || filter === "all" || filter === "") {
      return null; // No date filtering
    }

    const now = new Date();

    switch (filter) {
      case "today":
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { start: today, end: tomorrow };

      case "yesterday":
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const todayStart = new Date(yesterday);
        todayStart.setDate(todayStart.getDate() + 1);
        return { start: yesterday, end: todayStart };

      case "this_week":
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return { start: startOfWeek, end: null };

      case "this_month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth, end: null };

      case "this_year":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { start: startOfYear, end: null };

      default:
        // Custom date filter
        const selectedDate = new Date(filter);
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: endOfDay };
    }
  };

  // Calculate filtered stats based on date filter
  const getFilteredStats = () => {
    if (!todos || todos.length === 0) {
      return {
        notStarted: 0,
        inProgress: 0,
        hold: 0,
        checking: 0,
        evaluating: 0,
        completed: 0,
      };
    }

    const dateRange = getDateRange(dateFilter);
    let filteredTodosForStats = todos;

    if (dateRange) {
      filteredTodosForStats = todos.filter((todo) => {
        // Use getTaskDate for consistent date filtering (scheduled_date first, then created_at)
        const todoDate = getTaskDate(todo);
        if (!todoDate) return false;

        const isAfterStart = todoDate >= dateRange.start;
        const isBeforeEnd = !dateRange.end || todoDate < dateRange.end;
        return isAfterStart && isBeforeEnd;
      });
    }

    return {
      notStarted: filteredTodosForStats.filter(
        (t) => t.status === "not_started"
      ).length,
      inProgress: filteredTodosForStats.filter(
        (t) => t.status === "in_progress"
      ).length,
      hold: filteredTodosForStats.filter((t) => t.status === "hold").length,
      checking: filteredTodosForStats.filter((t) => t.status === "checking")
        .length,
      evaluating: filteredTodosForStats.filter((t) => t.status === "evaluating")
        .length,
      completed: filteredTodosForStats.filter((t) => t.status === "completed")
        .length,
    };
  };

  const filteredStats = getFilteredStats();

  const formatStatusLabel = (status) => {
    switch (status) {
      case "not_started":
        return t("todos.notStarted", { defaultValue: "Belum Dimulai" });
      case "in_progress":
        return t("todos.inProgress", { defaultValue: "Sedang Berlangsung" });
      case "hold":
        return t("todos.hold", { defaultValue: "Ditahan" });
      case "checking":
        return t("todos.checking", { defaultValue: "Pemeriksaan" });
      case "evaluating":
        return t("todos.evaluating", { defaultValue: "Evaluasi" });
      case "completed":
        return t("todos.completed", { defaultValue: "Selesai" });
      default:
        return String(status)
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);

    // Array nama hari dalam bahasa Indonesia
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];

    // Array nama bulan dalam bahasa Indonesia
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, "0");
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds}`;
  };

  const getDuration = (todo) => {
    // 1) Prefer formatted duration from backend (backwards compatible names)
    if (todo.total_work_time_formatted) return todo.total_work_time_formatted;
    if (todo.total_work_time && typeof todo.total_work_time === "string") return todo.total_work_time;

    // 2) Numeric minutes (new API field: total_work_time_minutes)
    const minutesVal =
      typeof todo.total_work_time_minutes === "number"
        ? todo.total_work_time_minutes
        : typeof todo.total_work_time === "number"
        ? todo.total_work_time
        : null;
    if (minutesVal !== null) {
      const hours = Math.floor(minutesVal / 60);
      const minutes = minutesVal % 60;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    // 3) Fallback: use raw ISO timestamps when available (started_at_raw / submitted_at_raw)
    const startIso = todo.started_at_raw || todo.started_at;
    const endIso = todo.submitted_at_raw || todo.submitted_at;
    if (startIso && endIso) {
      const start = new Date(startIso);
      const end = new Date(endIso);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMinutes}m`;
      }
    }

    // 4) If task is in progress but not completed, compute ongoing duration from started_at (raw preferred)
    const startOngoing = todo.started_at_raw || todo.started_at;
    if (startOngoing && todo.status === "in_progress") {
      const start = new Date(startOngoing);
      if (!isNaN(start.getTime())) {
        const now = new Date();
        const diffMs = now - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffHours > 0) return `${diffHours}h ${diffMinutes}m (ongoing)`;
        return `${diffMinutes}m (ongoing)`;
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
        // Fallback: try to extract HH:mm from formatted string "..., HH:mm:ss"
        const m = todo.target_start_at.match(/(\d{1,2}):(\d{2})/);
        if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
      }
    } catch {}
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTodo) {
        await api.patch(`/todos/${editingTodo.id}`, formData);
      } else {
        await api.post("/todos", formData);
      }
      const res = await api.get("/todos");
      setTodos(res.data.data || res.data);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        target_start_at: "",
        target_end_at: "",
        todo_type: "rutin",
        target_category: "all",
        target_user_id: "",
      });
      setShowModal(false);
      setEditingTodo(null);
    } catch (e) {
      alert(e?.response?.data?.message || t("todos.saveFailed"));
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      due_date: todo.due_date
        ? format(new Date(todo.due_date), "yyyy-MM-dd")
        : "",
      target_start_at: todo.target_start_at_raw
        ? new Date(todo.target_start_at_raw).toISOString().slice(0, 16)
        : "",
      target_end_at: todo.target_end_at_raw
        ? new Date(todo.target_end_at_raw).toISOString().slice(0, 16)
        : "",
      todo_type: todo.todo_type || "rutin",
      target_category: todo.target_category || "all",
      target_user_id: "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("todos.deleteConfirmation"))) return;
    try {
      await api.delete(`/todos/${id}`);
      const res = await api.get("/todos");
      setTodos(res.data.data || res.data);
    } catch (err) {
      handleApiError(err, "delete");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const loadingKey = `${id}-${newStatus}`;
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      if (newStatus === "in_progress") {
        await api.patch(`/todos/${id}/start`);
      } else if (newStatus === "hold") {
        await api.patch(`/todos/${id}/hold`);
      } else if (newStatus === "completed") {
        // Check if todo has evidence before allowing completion
        const todo = todos.find((t) => t.id === id);
        if (
          !todo.evidence_path &&
          (!todo.evidence_paths || todo.evidence_paths.length === 0)
        ) {
          notifyError(
            t("todos.uploadEvidenceFirst", {
              defaultValue:
                "Harap unggah bukti terlebih dahulu sebelum menyelesaikan tugas",
            })
          );
          return;
        }
        await api.patch(`/todos/${id}/complete`);
      } else if (newStatus === "checking") {
        // For checking status, evidence should be uploaded via submit button, not direct status change
        notifyError(
          t("todos.useSubmitButton", {
            defaultValue:
              "Gunakan tombol 'Submit Evidence' untuk mengirim bukti",
          })
        );
        return;
      } else {
        await api.patch(`/todos/${id}`, { status: newStatus });
      }
      const res = await api.get("/todos");
      setTodos(res.data.data || res.data);
      success(t("todos.todoUpdated"));
    } catch (err) {
      handleApiError(err, "update");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleFileUpload = async (id, file) => {
    const loadingKey = `${id}-upload`;
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const form = new FormData();
      form.append("evidence", file);

      // Find the todo to check its current status
      const todo = todos.find((t) => t.id === id);
      if (!todo) {
        notifyError(t("errors.notFound"));
        return;
      }

      if (todo.status === "in_progress") {
        // Submit for checking
        await api.post(`/todos/${id}/submit`, form, { isForm: true });
      } else if (todo.status === "checking") {
        // Update evidence during checking
        await api.patch(`/todos/${id}`, form, { isForm: true });
      } else if (todo.status === "evaluating") {
        // Update evidence during evaluating (GA review phase)
        await api.patch(`/todos/${id}`, form, { isForm: true });
      } else {
        notifyError(t("todos.cannotUploadEvidence"));
        return;
      }

      const res = await api.get("/todos");
      setTodos(res.data.data || res.data);
      success(t("notifications.fileUploaded"));
    } catch (err) {
      handleApiError(err, "upload");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleViewDetails = (todo) => {
    setSelectedTodo(todo);
    setShowDetailModal(true);
  };

  const handleHoldClick = (todo) => {
    setTodoToHold(todo);
    setHoldNote("");
    setShowHoldModal(true);
  };

  const handleSubmitEvidenceClick = (todo) => {
    setTodoToSubmit(todo);
    setEvidenceNote("");
    setEvidenceFiles([]);
    setShowEvidenceModal(true);
  };

  const handleHoldSubmit = async () => {
    if (!holdNote.trim()) {
      notifyError(
        t("todos.holdReasonRequired", {
          defaultValue: "Masukkan alasan untuk menahan tugas ini",
        })
      );
      return;
    }

    const loadingKey = `${todoToHold.id}-hold`;
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      await api.patch(`/todos/${todoToHold.id}/hold`, { hold_note: holdNote });
      const res = await api.get("/todos");
      setTodos(res.data.data || res.data);
      success(
        t("todos.taskPutOnHold", { defaultValue: "Tugas berhasil ditahan" })
      );
      setShowHoldModal(false);
      setHoldNote("");
      setTodoToHold(null);
    } catch (err) {
      handleApiError(err, "hold");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleSubmitEvidenceSubmit = async () => {
    if (!evidenceFiles || evidenceFiles.length === 0) {
      notifyError(
        t("todos.evidenceFormPhoto", { defaultValue: "Foto Bukti" }) +
          " " +
          t("common.required", { defaultValue: "wajib diisi" })
      );
      return;
    }

    const loadingKey = `${todoToSubmit.id}-submit-evidence`;
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const form = new FormData();
      // append multiple files as evidence[]
      evidenceFiles.forEach((file) => form.append("evidence[]", file));
      if (evidenceNote.trim()) {
        form.append("evidence_note", evidenceNote);
      }

      await api.post(`/todos/${todoToSubmit.id}/submit`, form, {
        isForm: true,
      });
      const res = await api.get("/todos");
      setTodos(res.data.data || res.data);
      success(
        t("todos.todoUpdated", { defaultValue: "Tugas berhasil diperbarui" })
      );
      setShowEvidenceModal(false);
      setEvidenceNote("");
      // revoke object URLs
      evidencePreviews.forEach((p) => URL.revokeObjectURL(p.url));
      setEvidencePreviews([]);
      setEvidenceFiles([]);
      setTodoToSubmit(null);
    } catch (err) {
      handleApiError(err, "submit");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Helpers for action enabling based on date filter
  const isDateInRange = (d, start, end) => d >= start && d <= end;

  const isRunnableInFilter = (todo) => {
    if (!todo) return true;

    // Use getTaskDate for consistent date handling
    const todoDate = getTaskDate(todo);
    if (!todoDate) return true;

    const dateRange = getDateRange(dateFilter);
    if (!dateRange) {
      return true; // No date filter, allow all
    }

    const isAfterStart = todoDate >= dateRange.start;
    const isBeforeEnd = !dateRange.end || todoDate < dateRange.end;
    return isAfterStart && isBeforeEnd;
  };

  // Check if task is runnable today (for grey out effect)
  const isRunnableToday = (todo) => {
    // If no scheduled_date, use created_at
    const dateStr = todo?.scheduled_date || todo?.created_at;
    if (!dateStr) return true;

    const today = new Date();
    const todoDate = new Date(dateStr);

    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    todoDate.setHours(0, 0, 0, 0);

    return todoDate.getTime() === today.getTime();
  };

  // Check if task can be started (10 minutes before target time)
  const canStartTask = (todo) => {
    // If no target time is set, allow starting
    if (!todo.target_start_at && !todo.target_start_at_raw) return true;

    // Prefer raw ISO if present
    let targetDateTime = null;
    try {
      if (
        todo.target_start_at_raw &&
        !isNaN(Date.parse(todo.target_start_at_raw))
      ) {
        targetDateTime = new Date(todo.target_start_at_raw);
      } else if (
        todo.scheduled_date &&
        typeof todo.target_start_at === "string"
      ) {
        // If target_start_at is like "HH:mm" or "HH:mm:ss", compose with scheduled_date
        const timeStr = todo.target_start_at.trim();
        // Accept both HH:mm and localized full strings; try simple HH:mm first
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
          const [hh, mm = "00", ss = "00"] = timeStr.split(":");
          const composed = `${todo.scheduled_date} ${String(hh).padStart(
            2,
            "0"
          )}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
          if (!isNaN(Date.parse(composed))) targetDateTime = new Date(composed);
        }
      }
    } catch {}

    // If we still can't determine a target time, allow starting
    if (!targetDateTime || isNaN(targetDateTime.getTime())) return true;

    const now = new Date();
    const tenMinutesBefore = new Date(
      targetDateTime.getTime() - 10 * 60 * 1000
    );
    return now >= tenMinutesBefore;
  };

  // Filter todos based on search, filters, and tab (rutin/tambahan)
  const filteredTodos = todos.filter((todo) => {
    // Tab filter by type
    if (todoTypeTab === "rutin" && (todo.todo_type || "rutin") !== "rutin")
      return false;
    if (
      todoTypeTab === "tambahan" &&
      (todo.todo_type || "rutin") !== "tambahan"
    )
      return false;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        todo.title.toLowerCase().includes(searchLower) ||
        todo.description?.toLowerCase().includes(searchLower) ||
        formatDate(todo.created_at).toLowerCase().includes(searchLower) ||
        formatDate(todo.due_date).toLowerCase().includes(searchLower) ||
        formatDate(todo.target_start_at).toLowerCase().includes(searchLower) ||
        formatDate(todo.target_end_at).toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && todo.status !== statusFilter) {
      return false;
    }

    // Date filter (based on scheduled_date when present, fallback to created_at)
    if (dateFilter && dateFilter !== "all" && dateFilter !== "") {
      const todoDate = getTaskDate(todo);
      if (!todoDate) return false;

      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        const isAfterStart = todoDate >= dateRange.start;
        const isBeforeEnd = !dateRange.end || todoDate < dateRange.end;
        if (!(isAfterStart && isBeforeEnd)) return false;
      }
    }

    return true;
  });

  // Calculate total todos for current date filter (before lazy slicing)
  const getTotalTodosForDateFilter = () => {
    const dateRange = getDateRange(dateFilter);
    if (!dateRange) {
      return todos.length;
    }

    return todos.filter((todo) => {
      // Use getTaskDate for consistent date filtering
      const todoDate = getTaskDate(todo);
      if (!todoDate) return false;

      const isAfterStart = todoDate >= dateRange.start;
      const isBeforeEnd = !dateRange.end || todoDate < dateRange.end;
      return isAfterStart && isBeforeEnd;
    }).length;
  };

  const totalTodosForCurrentDate = getTotalTodosForDateFilter();

  // Sort todos by scheduled_date first, then by created_at
  const sortedTodos = filteredTodos.sort((a, b) => {
    const getDateForSort = (todo) => {
      if (todo.scheduled_date && !isNaN(Date.parse(todo.scheduled_date))) {
        return new Date(todo.scheduled_date);
      }
      if (todo.created_at && !isNaN(Date.parse(todo.created_at))) {
        return new Date(todo.created_at);
      }
      return new Date(0); // fallback to epoch
    };

    const dateA = getDateForSort(a);
    const dateB = getDateForSort(b);

    return dateA - dateB; // ascending order (earliest first)
  });

  // Lazy slice for horizontal list
  const visibleTodos = sortedTodos.slice(0, Math.max(5, visibleCount));

  // Get active filter count
  const getActiveFilterCount = () => {
    const activeFilters = [
      searchTerm,
      statusFilter !== "all" ? statusFilter : "",
      dateFilter !== "" && dateFilter !== "all" ? dateFilter : "",
    ].filter(Boolean);
    return activeFilters.length;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("today");
  };

  // Personal statistics
  const averageDurationMinutes = (() => {
    const durations = todos
      .filter((t) => typeof t.total_work_time === "number")
      .map((t) => t.total_work_time);
    if (!durations.length) return 0;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  })();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-dropdown]")) {
        setShowStatusDropdown(false);
        setShowDateDropdown(false);
        setStatusSearchTerm("");
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
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        console.log("Loading todos for user:", user);
        const res = await api.get("/todos");
        console.log("Todos response:", res.data);
        if (!cancelled) {
          const list = res.data.data || res.data;
          setTodos(list);
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = (dateStr) => {
              if (!dateStr) return false;
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return false;
              const dd = new Date(d);
              dd.setHours(0, 0, 0, 0);
              return dd.getTime() === today.getTime();
            };
            const isRunnableToday = (t) => {
              if (!t || !t.scheduled_date) return true;
              return isToday(t.scheduled_date);
            };
            const count = (list || []).filter(
              (t) =>
                (t.status || "").toString() === "not_started" &&
                isRunnableToday(t)
            ).length;
            setTodayNotStarted(count);
          } catch {}
        }
      } catch (e) {
        console.error("Error loading todos:", e);
        if (!cancelled)
          setError(
            e?.response?.data?.message ||
              t("common.failedToLoad", { defaultValue: "Gagal memuat" })
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("nav.todos")}
            </h1>
            {todayNotStarted > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-[12px] font-semibold rounded-full bg-red-500 text-white">
                {todayNotStarted}
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t("todos.subtitle")}
          </p>
        </div>
        {user?.role === "admin_ga" && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary w-full sm:w-auto flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("todos.createNew")}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-4 sm:space-y-5">
        {/* Type Tabs - match Admin style */}
        {(() => {
          const totalRutin = todos.filter(
            (t) => (t.todo_type || "rutin") === "rutin"
          ).length;
          const totalTambahan = todos.filter(
            (t) => (t.todo_type || "rutin") === "tambahan"
          ).length;
          return (
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => {
                    setTodoTypeTab("all");
                    setVisibleCount(5);
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    todoTypeTab === "all"
                      ? "border-accent-500 text-accent-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {t("todos.allTodos")} ({todos.length})
                </button>
                <button
                  onClick={() => {
                    setTodoTypeTab("rutin");
                    setVisibleCount(5);
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    todoTypeTab === "rutin"
                      ? "border-accent-500 text-accent-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {t("todos.routine")} ({totalRutin})
                </button>
                <button
                  onClick={() => {
                    setTodoTypeTab("tambahan");
                    setVisibleCount(5);
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    todoTypeTab === "tambahan"
                      ? "border-accent-500 text-accent-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {t("todos.additional")} ({totalTambahan})
                </button>
              </nav>
            </div>
          );
        })()}

        {loading ? (
          <>
            {/* Status Cards Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <SkeletonLoader type="stats" />
              <SkeletonLoader type="stats" />
              <SkeletonLoader type="stats" />
              <SkeletonLoader type="stats" />
              <SkeletonLoader type="stats" />
            </div>

            {/* Second Row: Points Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <SkeletonLoader type="stats" />
              <SkeletonLoader type="stats" />
            </div>
          </>
        ) : (
          <>
            {/* Status Cards - 6 Statuses (Clickable for Filtering) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Not Started */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  statusFilter === "not_started"
                    ? "ring-2 ring-yellow-500 bg-yellow-50"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "not_started" ? "all" : "not_started"
                  )
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-2">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                    </div>
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("todos.notStarted")}
                      </dt>
                      <dd className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredStats.notStarted}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  statusFilter === "in_progress"
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "in_progress" ? "all" : "in_progress"
                  )
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-2">
                      <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    </div>
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("todos.inProgress")}
                      </dt>
                      <dd className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredStats.inProgress}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Hold */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  statusFilter === "hold"
                    ? "ring-2 ring-pink-500 bg-pink-50"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(statusFilter === "hold" ? "all" : "hold")
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-2">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />
                    </div>
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("todos.hold")}
                      </dt>
                      <dd className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredStats.hold || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Checking */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  statusFilter === "checking"
                    ? "ring-2 ring-orange-500 bg-orange-50"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "checking" ? "all" : "checking"
                  )
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-2">
                      <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                    </div>
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("todos.checking")}
                      </dt>
                      <dd className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredStats.checking}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Evaluating */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  statusFilter === "evaluating"
                    ? "ring-2 ring-purple-500 bg-purple-50"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "evaluating" ? "all" : "evaluating"
                  )
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-2">
                      <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                    </div>
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("todos.evaluating")}
                      </dt>
                      <dd className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredStats.evaluating}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Completed */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  statusFilter === "completed"
                    ? "ring-2 ring-green-500 bg-green-50"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "completed" ? "all" : "completed"
                  )
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-2">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                    </div>
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("todos.completed")}
                      </dt>
                      <dd className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredStats.completed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Personal Statistics */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <SkeletonLoader type="stats" />
        </div>
      ) : averageDurationMinutes > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-2 sm:mb-3">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("todos.avgCompletionDuration", {
                    defaultValue: "Rata-rata Durasi Penyelesaian",
                  })}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {averageDurationMinutes}
                  </span>{" "}
                  {t("common.minutes", { defaultValue: "menit" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Date Filter with Dropdown Options */}
          <div className="relative" data-dropdown="date">
            <div className="relative">
              <input
                type="text"
                placeholder=""
                value=""
                onChange={() => {}}
                onFocus={() => {
                  setDatePreselected(dateFilter);
                  setShowDateDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowDateDropdown(false);
                  }, 150);
                }}
                onKeyDown={(e) => {
                  if (showDateDropdown) {
                    const options = [
                      {
                        value: "today",
                        label: t("todos.today", { defaultValue: "Hari Ini" }),
                      },
                      {
                        value: "this_week",
                        label: t("todos.thisWeek", {
                          defaultValue: "Minggu Ini",
                        }),
                      },
                      {
                        value: "this_month",
                        label: t("todos.thisMonth", {
                          defaultValue: "Bulan Ini",
                        }),
                      },
                      {
                        value: "yesterday",
                        label: t("todos.yesterday", {
                          defaultValue: "Kemarin",
                        }),
                      },
                    ];

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const currentIndex = options.findIndex(
                        (opt) => opt.value === datePreselected
                      );
                      const nextIndex =
                        currentIndex < options.length - 1
                          ? currentIndex + 1
                          : 0;
                      setDatePreselected(options[nextIndex].value);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const currentIndex = options.findIndex(
                        (opt) => opt.value === datePreselected
                      );
                      const prevIndex =
                        currentIndex > 0
                          ? currentIndex - 1
                          : options.length - 1;
                      setDatePreselected(options[prevIndex].value);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      setDateFilter(datePreselected);
                      setShowDateDropdown(false);
                    }
                  }
                }}
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {/* Overlay text when not focused */}
              {!showDateDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {dateFilter === "today"
                      ? t("todos.today", { defaultValue: "Hari Ini" })
                      : dateFilter === "this_week"
                      ? t("todos.thisWeek", { defaultValue: "Minggu Ini" })
                      : dateFilter === "this_month"
                      ? t("todos.thisMonth", { defaultValue: "Bulan Ini" })
                      : dateFilter === "yesterday"
                      ? t("todos.yesterday", { defaultValue: "Kemarin" })
                      : dateFilter ||
                        t("todos.selectDate", {
                          defaultValue: "Pilih Tanggal",
                        })}
                  </span>
                </div>
              )}
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    showDateDropdown ? "rotate-180" : ""
                  }`}
                />
              </span>
            </div>
            {showDateDropdown && (
              <div className="absolute z-10 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none mt-1">
                {[
                  {
                    value: "today",
                    label: t("todos.today", { defaultValue: "Hari Ini" }),
                  },
                  {
                    value: "this_week",
                    label: t("todos.thisWeek", { defaultValue: "Minggu Ini" }),
                  },
                  {
                    value: "this_month",
                    label: t("todos.thisMonth", { defaultValue: "Bulan Ini" }),
                  },
                  {
                    value: "yesterday",
                    label: t("todos.yesterday", { defaultValue: "Kemarin" }),
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    data-value={option.value}
                    onClick={() => {
                      setDateFilter(option.value);
                      setShowDateDropdown(false);
                    }}
                    className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                      datePreselected === option.value
                        ? "bg-blue-50 text-blue-900"
                        : dateFilter === option.value
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

          {/* Custom Date Input */}
          <div className="relative">
            <input
              type="date"
              value={
                dateFilter &&
                !["today", "this_week", "this_month", "yesterday"].includes(
                  dateFilter
                )
                  ? dateFilter
                  : ""
              }
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              placeholder="Pilih tanggal khusus"
            />
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

      {/* Todo List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : sortedTodos.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-sm">{t("common.noData")}</div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleTodos.map((todo) => (
              <li
                key={todo.id}
                className={`px-3 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 hover:shadow-sm group ${
                  !isRunnableToday(todo) ? "opacity-60 bg-gray-50" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  {/* Todo Content */}
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusIcon(todo.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                          {todo.title}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${getStatusColor(
                              todo.status
                            )}`}
                          >
                            {formatStatusLabel(todo.status)}
                          </span>
                          {/* Priority badge removed */}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {(todo.todo_type || "rutin") === "rutin"
                              ? t("todos.routine")
                              : t("todos.additional")}
                          </span>
                          {!isRunnableToday(todo) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                              {t("common.notToday")}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {todo.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <span className="truncate">
                            {t("todos.scheduledDate", {
                              defaultValue: "Tanggal Terjadwal",
                            })}
                            :{" "}
                            {todo.scheduled_date
                              ? new Date(
                                  todo.scheduled_date
                                ).toLocaleDateString("id-ID", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : todo.formatted_created_at || "N/A"}
                          </span>
                        </div>
                        {(() => {
                          const hhmm = getTargetStartTime(todo);
                          return hhmm ? (
                            <div className="flex items-center">
                              <span className="truncate">
                                {t("todos.startTime", {
                                  defaultValue: "Jam Mulai",
                                })}
                                : {hhmm}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            {t("todos.duration", { defaultValue: "Durasi" })}:{" "}
                            {getDuration(todo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center justify-end sm:justify-start gap-2">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {(() => {
                        const canAct = isRunnableToday(todo);
                        const canStart = canStartTask(todo);
                        return (
                          <>
                            {/* Status-based Action Buttons */}
                            {todo.status === "not_started" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(todo.id, "in_progress")
                                }
                                className={`text-white text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                  canAct && canStart
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "bg-gray-400 cursor-not-allowed"
                                }`}
                                disabled={
                                  !canAct ||
                                  !canStart ||
                                  loadingStates[`${todo.id}-in_progress`]
                                }
                                title={
                                  !canStart
                                    ? t("todos.cannotStartYet", {
                                        defaultValue:
                                          "Belum bisa dimulai. Tunggu 10 menit sebelum waktu target.",
                                      })
                                    : ""
                                }
                              >
                                {loadingStates[`${todo.id}-in_progress`]
                                  ? "..."
                                  : t("common.start", {
                                      defaultValue: "Mulai",
                                    })}
                              </button>
                            )}

                            {todo.status === "hold" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(todo.id, "in_progress")
                                }
                                className={`text-white text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                  canAct
                                    ? "bg-blue-500 hover:bg-blue-600"
                                    : "bg-gray-400 cursor-not-allowed"
                                }`}
                                disabled={
                                  !canAct ||
                                  loadingStates[`${todo.id}-in_progress`]
                                }
                              >
                                {loadingStates[`${todo.id}-in_progress`]
                                  ? "..."
                                  : t("common.resume", {
                                      defaultValue: "Lanjutkan",
                                    })}
                              </button>
                            )}

                            {todo.status === "in_progress" && (
                              <>
                                <button
                                  onClick={() => handleHoldClick(todo)}
                                  className={`text-white text-xs px-3 py-1.5 rounded-lg transition-colors mr-2 ${
                                    canAct
                                      ? "bg-yellow-500 hover:bg-yellow-600"
                                      : "bg-gray-400 cursor-not-allowed"
                                  }`}
                                  disabled={
                                    !canAct || loadingStates[`${todo.id}-hold`]
                                  }
                                >
                                  {loadingStates[`${todo.id}-hold`]
                                    ? "..."
                                    : t("common.hold", {
                                        defaultValue: "Tahan",
                                      })}
                                </button>
                                <button
                                  onClick={() =>
                                    handleSubmitEvidenceClick(todo)
                                  }
                                  className={`text-white text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                    canAct
                                      ? "bg-blue-500 hover:bg-blue-600"
                                      : "bg-gray-400 cursor-not-allowed"
                                  }`}
                                  disabled={!canAct}
                                >
                                  {t("todos.submitEvidence", {
                                    defaultValue: "Bukti Menyelesaikan Tugas",
                                  })}
                                </button>
                              </>
                            )}

                            {todo.status === "evaluating" && (
                              <label
                                className={`${
                                  !loadingStates[`${todo.id}-upload`]
                                    ? "bg-purple-500 hover:bg-purple-600 cursor-pointer"
                                    : "bg-gray-400 cursor-not-allowed"
                                } text-white text-xs px-3 py-1.5 rounded-lg transition-colors`}
                              >
                                {loadingStates[`${todo.id}-upload`]
                                  ? t("common.loading", {
                                      defaultValue: "Mengunggah...",
                                    })
                                  : t("common.reuploadEvidence", {
                                      defaultValue: "Unggah Ulang Bukti",
                                    })}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (!loadingStates[`${todo.id}-upload`]) {
                                      handleFileUpload(
                                        todo.id,
                                        e.target.files[0]
                                      );
                                    }
                                  }}
                                  disabled={loadingStates[`${todo.id}-upload`]}
                                />
                              </label>
                            )}

                            {/* View Details - Always available */}
                            <button
                              onClick={() => handleViewDetails(todo)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t("common.viewDetails")}
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Edit - Admin only */}
                            {user?.role === "admin_ga" && (
                              <button
                                onClick={() => handleEdit(todo)}
                                className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                                title={t("common.editTodo", {
                                  defaultValue: "Edit Tugas",
                                })}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}

                            {/* Delete - Admin only */}
                            {user?.role === "admin_ga" && (
                              <button
                                onClick={() => handleDelete(todo.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title={t("common.deleteTodo", {
                                  defaultValue: "Hapus Tugas",
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {sortedTodos.length > 5 && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {visibleTodos.length > 5 && (
                  <button
                    className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50"
                    onClick={() => setVisibleCount(5)}
                  >
                    ←{" "}
                    {t("common.backToTop", { defaultValue: "Kembali ke atas" })}
                  </button>
                )}
                {sortedTodos.length > visibleTodos.length && (
                  <button
                    className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50"
                    onClick={() => setVisibleCount((c) => c + 5)}
                  >
                    {t("common.loadMore", { defaultValue: "Muat 5 lagi" })} →
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {visibleTodos.length}/{sortedTodos.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border border-gray-200 w-full max-w-lg shadow-sm rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTodo ? t("common.edit") : t("todos.createNew")}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("todos.targetUser", {
                        defaultValue: "Target Pengguna",
                      })}
                    </label>
                    <select
                      value={formData.target_category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_category: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="all">
                        {t("todos.allType", { defaultValue: "Semua Tipe" })}
                      </option>
                      <option value="ob">OB</option>
                      <option value="driver">Driver</option>
                      <option value="security">Security</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("todos.taskName", { defaultValue: "Nama Tugas" })}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("common.description")}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>

                  {/* Priority field removed intentionally */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("todos.todoType")}
                    </label>
                    <select
                      value={formData.todo_type}
                      onChange={(e) =>
                        setFormData({ ...formData, todo_type: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="rutin">{t("todos.routine")}</option>
                      <option value="tambahan">{t("todos.additional")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("todos.startDate")}
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("todos.startTime")}
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.target_start_at}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_start_at: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingTodo(null);
                        setFormData({
                          title: "",
                          description: "",
                          priority: "medium",
                          due_date: "",
                          target_start_at: "",
                          target_end_at: "",
                          todo_type: "rutin",
                          target_category: "all",
                          target_user_id: "",
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.cancel")}
                    </button>
                    <button type="submit" className="btn-primary px-4 py-2">
                      {editingTodo ? t("common.update") : t("common.create")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTodo && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border border-gray-200 w-full max-w-3xl shadow-sm rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Detail Tugas: {selectedTodo.title}
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.basicInformation", {
                        defaultValue: "Informasi Dasar",
                      })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.taskName", {
                              defaultValue: "Nama Tugas",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.title}
                        </p>
                        <p className="text-gray-600">
                          <strong>{t("common.description")}:</strong>{" "}
                          {selectedTodo.description || "N/A"}
                        </p>
                        {/* Priority info removed */}
                        <p className="text-gray-600">
                          <strong>
                            {t("common.statusLabel", {
                              defaultValue: "Status",
                            })}
                            :
                          </strong>
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              selectedTodo.status
                            )}`}
                          >
                            {formatStatusLabel(selectedTodo.status)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.scheduledDate", {
                              defaultValue: "Tanggal Terjadwal",
                            })}
                            :
                          </strong>{" "}
                          {selectedTodo.scheduled_date
                            ? new Date(
                                selectedTodo.scheduled_date
                              ).toLocaleDateString("id-ID", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : selectedTodo.formatted_created_at || "N/A"}
                        </p>
                        <p className="text-gray-600">
                          <strong>
                            {t("todos.submitted", { defaultValue: "Dikirim" })}:
                          </strong>{" "}
                          {selectedTodo.formatted_submitted_at ||
                            t("todos.taskNotCompleted", {
                              defaultValue: "Tugas belum selesai",
                            })}
                        </p>
                        {/* hold note moved to its own panel below to match admin UI */}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {t("todos.timelineDuration", {
                        defaultValue: "Jadwal & Durasi",
                      })}
                    </h4>
                    <div className="space-y-3">
                      {/* Target Information */}
                      <div className="bg-white p-3 rounded border">
                        <h5 className="font-medium text-gray-800 mb-2">
                          {t("todos.targetInfo", { defaultValue: "Target" })}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <strong>
                                {t("todos.scheduledStart", {
                                  defaultValue: "Jadwal Mulai",
                                })}
                                :
                              </strong>{" "}
                              {selectedTodo.target_start_at ||
                                t("common.notSet", {
                                  defaultValue: "Belum diatur",
                                })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <strong>
                                {t("todos.estimatedDuration", {
                                  defaultValue: "Perkiraan Durasi",
                                })}
                                :
                              </strong>{" "}
                              {selectedTodo.target_duration_value &&
                              selectedTodo.target_duration_unit
                                ? `${selectedTodo.target_duration_value} ${
                                    selectedTodo.target_duration_unit ===
                                    "hours"
                                      ? t("todos.hours", {
                                          defaultValue: "jam",
                                        })
                                      : t("todos.minutes", {
                                          defaultValue: "menit",
                                        })
                                  }`
                                : t("common.notSet", {
                                    defaultValue: "Belum diatur",
                                  })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actual Information */}
                      <div className="bg-white p-3 rounded border">
                        <h5 className="font-medium text-gray-800 mb-2">
                          {t("todos.actualInfo", { defaultValue: "Aktual" })}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <strong>
                                {t("todos.actualStartTime", {
                                  defaultValue: "Waktu Mulai",
                                })}
                                :
                              </strong>{" "}
                              {selectedTodo.started_at ||
                                t("todos.notStarted", {
                                  defaultValue: "Belum dimulai",
                                })}
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

                      {/* Last Updated */}
                      <div className="text-xs text-gray-500">
                        <strong>
                          {t("common.lastUpdated", {
                            defaultValue: "Terakhir diperbarui",
                          })}
                          :
                        </strong>{" "}
                        {selectedTodo.updated_at ||
                          t("common.unknown", {
                            defaultValue: "Tidak diketahui",
                          })}
                      </div>
                    </div>
                  </div>

                  {selectedTodo.hold_note && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-3">
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

                  {selectedTodo.rating !== null &&
                    selectedTodo.rating !== undefined && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {t("todos.automaticPerformanceRating", {
                            defaultValue: "Rating Kinerja Otomatis",
                          })}
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
                        <p className="text-xs text-gray-500 mt-2">
                          {t("todos.ratingCalculationNote", {
                            defaultValue:
                              "Rating dihitung otomatis berdasarkan waktu penyelesaian vs target durasi",
                          })}
                        </p>
                      </div>
                    )}

                  {selectedTodo.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {t("todos.adminNotes")}
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
                          {t("todos.evidenceFiles", {
                            defaultValue: "File Bukti",
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
                                <a
                                  href={file.full_url || file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={file.full_url || file.url}
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
                                </a>
                              ) : (
                                <div className="p-3 flex items-center space-x-2">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={file.full_url || file.url}
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

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.close", { defaultValue: "Tutup" })}
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
            <div className="relative mx-auto p-5 border border-gray-200 w-full max-w-4xl shadow-sm rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {t("todos.evidenceFor", { defaultValue: "Bukti untuk" })}:{" "}
                  {selectedTodo.title}
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t("todos.taskDetails", { defaultValue: "Detail Tugas" })}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedTodo.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>
                        {t("common.statusLabel", { defaultValue: "Status" })}:{" "}
                        {formatStatusLabel(selectedTodo.status)}
                      </p>
                      <p>
                        {t("todos.submitted", { defaultValue: "Dikirim" })}:{" "}
                        {selectedTodo.formatted_submitted_at || "N/A"}
                      </p>
                      <p>
                        {t("todos.duration", { defaultValue: "Durasi" })}:{" "}
                        {getDuration(selectedTodo)}
                      </p>
                      {selectedTodo.rating && (
                        <p>
                          {t("todos.rating", { defaultValue: "Rating" })}:{" "}
                          {selectedTodo.rating}/100 (
                          {t("todos.autoCalculated", {
                            defaultValue: "Otomatis",
                          })}
                          )
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedTodo.evidence_files &&
                    selectedTodo.evidence_files.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {t("todos.evidenceFiles", {
                            defaultValue: "File Bukti",
                          })}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedTodo.evidence_files.map((file, index) => (
                            <div
                              key={index}
                              className="border rounded-lg overflow-hidden bg-white"
                            >
                              {/\.(jpg|jpeg|png|gif)$/i.test(
                                file.path || file.url
                              ) ? (
                                <a
                                  href={file.full_url || file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={file.full_url || file.url}
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
                                </a>
                              ) : (
                                <div className="p-3 flex items-center space-x-2">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={file.full_url || file.url}
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
                          {t("todos.evidence")}
                        </h4>
                        {(() => {
                          const legacyUrl = getStorageUrl(`storage/${selectedTodo.evidence_path}`);
                          const fileUrl =
                            selectedTodo.evidence_files && selectedTodo.evidence_files.length > 0
                              ? (selectedTodo.evidence_files[0].full_url || selectedTodo.evidence_files[0].url)
                              : legacyUrl;
                          return /\.(jpg|jpeg|png|gif)$/i.test(fileUrl) ? (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={fileUrl}
                                alt="Evidence"
                                className="w-full max-h-64 object-contain rounded"
                                onError={(e) => {
                                  console.log("Legacy image failed to load:", {
                                    src: fileUrl,
                                    error: e
                                  });
                                  e.target.style.display = "none";
                                }}
                              />
                            </a>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Eye className="h-4 w-4 text-blue-500" />
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {t("todos.viewEvidenceFile", {
                                  defaultValue: "Lihat File Bukti",
                                })}
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowEvidenceModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.close", { defaultValue: "Tutup" })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Hold Modal */}
      {showHoldModal && todoToHold && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border border-gray-200 w-full max-w-md shadow-sm rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {t("todos.holdTask", { defaultValue: "Tahan Tugas" })}:{" "}
                  {todoToHold.title}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.holdReason", {
                        defaultValue: "Alasan Ditahan",
                      })}{" "}
                      *
                    </label>
                    <textarea
                      value={holdNote}
                      onChange={(e) => setHoldNote(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t("todos.holdPlaceholder", {
                        defaultValue:
                          "Masukkan alasan untuk menahan tugas ini...",
                      })}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowHoldModal(false);
                        setHoldNote("");
                        setTodoToHold(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.cancel", { defaultValue: "Batal" })}
                    </button>
                    <button
                      onClick={handleHoldSubmit}
                      disabled={
                        !holdNote.trim() ||
                        loadingStates[`${todoToHold.id}-hold`]
                      }
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm font-medium hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loadingStates[`${todoToHold.id}-hold`]
                        ? t("common.loading", { defaultValue: "Memproses..." })
                        : t("todos.holdTask", { defaultValue: "Tahan Tugas" })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Submit Evidence Modal */}
      {showEvidenceModal && todoToSubmit && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
            <div className="relative mx-auto p-6 border border-gray-200 w-full max-w-2xl shadow-sm rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {t("todos.submitEvidence", {
                    defaultValue: "Bukti Menyelesaikan Tugas",
                  })}
                  : {todoToSubmit.title}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.evidenceFormNote", {
                        defaultValue: "Catatan Bukti",
                      })}
                    </label>
                    <textarea
                      value={evidenceNote}
                      onChange={(e) => setEvidenceNote(e.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t("todos.evidenceFormNotePlaceholder", {
                        defaultValue:
                          "Masukkan catatan untuk pengiriman bukti...",
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.evidenceFormPhoto", {
                        defaultValue: "Foto Bukti",
                      })}{" "}
                      *
                    </label>

                    <div className="mb-2 text-xs text-gray-500">
                      {t("todos.evidenceMaxFiles", {
                        defaultValue:
                          "Maks 5 file. Anda dapat memilih beberapa foto sekaligus.",
                      })}
                    </div>

                    <label className="relative flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-accent-500">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(
                            0,
                            5
                          );
                          // create previews
                          const previews = files.map((f) => ({
                            file: f,
                            url: URL.createObjectURL(f),
                          }));
                          // revoke previous previews
                          evidencePreviews.forEach((p) =>
                            URL.revokeObjectURL(p.url)
                          );
                          setEvidenceFiles(files);
                          setEvidencePreviews(previews);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">
                          {t("todos.chooseFiles", {
                            defaultValue: "Pilih file atau seret ke sini",
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t("todos.dragDropHint", {
                            defaultValue:
                              "Tarik dan lepas atau klik untuk memilih gambar (maks 5)",
                          })}
                        </div>
                      </div>
                    </label>

                    {evidencePreviews && evidencePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                        {evidencePreviews.map((p, idx) => (
                          <div
                            key={idx}
                            className="relative border rounded overflow-hidden bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => window.open(p.url, "_blank")}
                              className="block w-full h-28 overflow-hidden"
                            >
                              <img
                                src={p.url}
                                alt={p.file.name}
                                className="w-full h-28 object-cover"
                              />
                            </button>
                            <div className="p-2 text-xs text-gray-700 truncate">
                              {p.file.name}
                            </div>
                            <div className="p-1 text-[11px] text-gray-500">
                              {Math.round(p.file.size / 1024)} KB
                            </div>
                            <button
                              type="button"
                              className="absolute top-1 right-1 text-white bg-red-500 rounded-full p-1 text-xs"
                              onClick={() => {
                                // revoke object URL and remove
                                URL.revokeObjectURL(p.url);
                                setEvidencePreviews((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                );
                                setEvidenceFiles((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                );
                              }}
                              title={t("common.delete", {
                                defaultValue: "Hapus",
                              })}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowEvidenceModal(false);
                        setEvidenceNote("");
                        setEvidenceFiles([]);
                        setTodoToSubmit(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.cancel", { defaultValue: "Batal" })}
                    </button>
                    <button
                      onClick={handleSubmitEvidenceSubmit}
                      disabled={
                        !evidenceFiles ||
                        evidenceFiles.length === 0 ||
                        loadingStates[`${todoToSubmit.id}-submit-evidence`]
                      }
                      className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loadingStates[`${todoToSubmit.id}-submit-evidence`]
                        ? t("common.loading", { defaultValue: "Memproses..." })
                        : t("todos.submitEvidence", {
                            defaultValue: "Bukti Menyelesaikan Tugas",
                          })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Todos;
