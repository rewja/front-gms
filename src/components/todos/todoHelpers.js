// Helper functions for todo management

export const formatTargetCategory = (category, t) => {
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

export const formatRoutinePattern = (routineData, t, i18n) => {
  if (!routineData || !t) return "";
  const interval = routineData.recurrence_interval || 1;
  const unit = routineData.recurrence_unit || "day";
  const unitId =
    unit === "day"
      ? t("todos.routinePattern.unitDay")
      : unit === "week"
      ? t("todos.routinePattern.unitWeek")
      : unit === "month"
      ? t("todos.routinePattern.unitMonth")
      : t("todos.routinePattern.unitYear");
  const startStr = (() => {
    const d = routineData.recurrence_start_date
      ? new Date(routineData.recurrence_start_date)
      : null;
    if (!d || isNaN(d.getTime())) return "";
    try {
      return d.toLocaleDateString(i18n.language === "id" ? "id-ID" : "en-US", {
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
    Array.isArray(routineData.days_of_week) &&
    routineData.days_of_week.length > 0
  ) {
    const days = [
      t("common.days.sunday"),
      t("common.days.monday"),
      t("common.days.tuesday"),
      t("common.days.wednesday"),
      t("common.days.thursday"),
      t("common.days.friday"),
      t("common.days.saturday"),
    ];
    const sorted = routineData.days_of_week.slice().sort((a, b) => a - b);
    const dayNames = sorted.map((d) => days[d] || d);
    if (dayNames.length === 1) {
      daysStr = dayNames[0];
    } else if (dayNames.length === 2) {
      daysStr = dayNames.join(` ${t("todos.routinePattern.and")} `);
    } else {
      daysStr =
        dayNames.slice(0, -1).join(", ") +
        ` ${t("todos.routinePattern.and")} ` +
        dayNames[dayNames.length - 1];
    }
  }
  const pattern = `${t("todos.routinePattern.every")} ${interval} ${unitId}`;
  if (unit === "week" && daysStr) {
    const dayLabel = i18n.language === "id" ? "hari" : "days";
    return startStr
      ? `${pattern} ${t("todos.routinePattern.on")} ${dayLabel} ${daysStr}, ${t("todos.routinePattern.effectiveStarting")} ${startStr}`
      : `${pattern} ${t("todos.routinePattern.on")} ${dayLabel} ${daysStr}`;
  }
  return startStr ? `${pattern}, ${t("todos.routinePattern.effectiveStarting")} ${startStr}` : pattern;
};

export const formatRoutinePatternShort = (routineData, t, i18n) => {
  if (!routineData || !t) return "";
  const interval = routineData.recurrence_interval || 1;
  const unit = routineData.recurrence_unit || "day";
  const unitShort =
    unit === "day"
      ? t("common.units.dayShort", { defaultValue: "D" })
      : unit === "week"
      ? t("common.units.weekShort", { defaultValue: "W" })
      : unit === "month"
      ? t("common.units.monthShort", { defaultValue: "M" })
      : t("common.units.yearShort", { defaultValue: "Y" });
  const startStr = (() => {
    const d = routineData.recurrence_start_date
      ? new Date(routineData.recurrence_start_date)
      : null;
    if (!d || isNaN(d.getTime())) return "";
    try {
      return d.toLocaleDateString(i18n.language === "id" ? "id-ID" : "en-US", {
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
    Array.isArray(routineData.days_of_week) &&
    routineData.days_of_week.length > 0
  ) {
    const daysShort = [
      t("common.days.sundayShort"),
      t("common.days.mondayShort"),
      t("common.days.tuesdayShort"),
      t("common.days.wednesdayShort"),
      t("common.days.thursdayShort"),
      t("common.days.fridayShort"),
      t("common.days.saturdayShort"),
    ];
    const sorted = routineData.days_of_week.slice().sort((a, b) => a - b);
    daysStr = sorted.map((d) => daysShort[d] || d).join("·");
  }
  const base = `${interval} ${unitShort}`;
  if (unit === "week" && daysStr) {
    return `${base} • ${daysStr} • ${startStr}`;
  }
  return `${base} • ${startStr}`;
};

export const getTaskDate = (todo) => {
  const dateStr = todo?.scheduled_date || todo?.created_at;
  return dateStr ? new Date(dateStr) : null;
};

export const formatStatusLabel = (status, t) => {
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

export const getDateRange = (dateFilter, dateFrom, dateTo) => {
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (!dateFilter || dateFilter === "all" || dateFilter === "") {
    return null;
  }

  const now = new Date();

  switch (dateFilter) {
    case "today":
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: tomorrow };

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
      const selectedDate = new Date(dateFilter);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      return { start: startOfDay, end: endOfDay };
  }
};

export const calculateAutomaticRating = (todo) => {
  // Calculate target duration
  let targetMinutes = null;
  if (todo.target_duration_value && todo.target_duration_unit) {
    targetMinutes = Number(todo.target_duration_value);
    if (isNaN(targetMinutes)) return null;
    if (todo.target_duration_unit === "hours")
      targetMinutes = targetMinutes * 60;
  } else if (todo.target_start_at_raw && todo.target_end_at_raw) {
    // Fallback: calculate from target_start_at to target_end_at
    const targetStart = Date.parse(todo.target_start_at_raw);
    const targetEnd = Date.parse(todo.target_end_at_raw);
    if (!isNaN(targetStart) && !isNaN(targetEnd) && targetEnd >= targetStart) {
      targetMinutes = (targetEnd - targetStart) / (1000 * 60);
    }
  }
  
  if (!targetMinutes || targetMinutes <= 0) return null;

  // Calculate total time from target_start to actual_end (considers late start time)
  let totalTimeFromTargetStart = null;
  
  if (todo.target_start_at_raw && todo.submitted_at_raw) {
    // Calculate from target start to actual end (includes delay in starting)
    const targetStart = Date.parse(todo.target_start_at_raw);
    const actualEnd = Date.parse(todo.submitted_at_raw);
    if (!isNaN(targetStart) && !isNaN(actualEnd) && actualEnd >= targetStart) {
      totalTimeFromTargetStart = (actualEnd - targetStart) / (1000 * 60); // in minutes with decimal precision
    }
  } else if (todo.target_duration_value && todo.target_duration_unit) {
    // Fallback: if no target_start_at, use actual duration (backward compatibility)
    if (typeof todo.total_work_time_minutes === "number") {
      totalTimeFromTargetStart = todo.total_work_time_minutes;
    } else if (typeof todo.total_work_time === "number") {
      totalTimeFromTargetStart = todo.total_work_time;
    } else if (typeof todo.total_work_time === "string") {
      const m = todo.total_work_time.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
      if (m) {
        const h = parseInt(m[1] || "0", 10);
        const mm = parseInt(m[2] || "0", 10);
        totalTimeFromTargetStart = h * 60 + mm;
      }
    } else if (todo.started_at_raw && todo.submitted_at_raw) {
      const s = Date.parse(todo.started_at_raw);
      const e = Date.parse(todo.submitted_at_raw);
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        totalTimeFromTargetStart = (e - s) / (1000 * 60);
      }
    }
  }

  if (totalTimeFromTargetStart === null || isNaN(totalTimeFromTargetStart) || totalTimeFromTargetStart <= 0) return null;

  // Calculate rating based on total time from target start vs target duration
  if (totalTimeFromTargetStart <= targetMinutes) return 5;
  
  const overtimeRatio = totalTimeFromTargetStart / targetMinutes;
  
  if (overtimeRatio <= 1.25) return 4;
  if (overtimeRatio <= 1.5) return 3;
  if (overtimeRatio <= 2.0) return 2;
  
  return 1;
};

export const getDuration = (todo) => {
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

export const getTargetStartTime = (todo) => {
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

