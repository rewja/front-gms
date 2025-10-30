import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

const HistoryFilters = ({ filters, onFilterChange, isAdmin }) => {
  const { t } = useTranslation();

  const actions = useMemo(
    () => [
      { value: "all", label: t("activities.filters.all_actions") },
      { value: "create", label: t("activities.actions.create") },
      { value: "update", label: t("activities.actions.update") },
      { value: "delete", label: t("activities.actions.delete") },
      { value: "start_todo", label: t("activities.actions.start_todo") },
      { value: "hold_todo", label: t("activities.actions.hold_todo") },
      { value: "complete_todo", label: t("activities.actions.complete_todo") },
      { value: "evaluate", label: t("activities.actions.evaluate") },
      {
        value: "create_routine_batch",
        label: t("activities.actions.create_routine_batch"),
      },
      { value: "export", label: t("activities.actions.export") },
      { value: "import", label: t("activities.actions.import") },
      { value: "login", label: t("activities.actions.login") },
      { value: "logout", label: t("activities.actions.logout") },
    ],
    [t]
  );

  const roles = useMemo(
    () => [
      { value: "all", label: "Semua Jenis User" },
      { value: "user", label: "User" },
      { value: "admin_ga", label: "Admin GA" },
      { value: "admin_ga_manager", label: "Admin GA Manager" },
      { value: "super_admin", label: "Super Admin" },
    ],
    []
  );

  const timeRanges = useMemo(
    () => [
      { value: "all", label: "Semua Waktu" },
      { value: "today", label: "Hari Ini" },
      { value: "7d", label: "7 Hari Terakhir" },
      { value: "30d", label: "30 Hari Terakhir" },
      { value: "this_month", label: "Bulan Ini" },
      { value: "this_year", label: "Tahun Ini" },
    ],
    []
  );

  const applyTimeRange = (rangeValue) => {
    if (rangeValue === "all") {
      onFilterChange({ ...filters, date_from: "", date_to: "" });
      return;
    }

    const now = new Date();
    let from = "";
    let to = now.toISOString().split("T")[0];

    switch (rangeValue) {
      case "today": {
        const d = now.toISOString().split("T")[0];
        onFilterChange({ ...filters, date_from: d, date_to: d });
        return;
      }
      case "7d": {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        from = start.toISOString().split("T")[0];
        break;
      }
      case "30d": {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        from = start.toISOString().split("T")[0];
        break;
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        from = start.toISOString().split("T")[0];
        break;
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        from = start.toISOString().split("T")[0];
        break;
      }
      default:
        break;
    }

    onFilterChange({ ...filters, date_from: from, date_to: to });
  };

  const currentRangeValue = (() => {
    const df = filters.date_from;
    const dt = filters.date_to;
    if (!df && !dt) return "all";
    // If both are today
    const today = new Date().toISOString().split("T")[0];
    if (df === today && dt === today) return "today";
    return "custom";
  })();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Jenis Aktivitas
          </label>
          <select
            value={filters.action}
            onChange={(e) =>
              onFilterChange({ ...filters, action: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {actions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Waktu
          </label>
          <select
            value={currentRangeValue}
            onChange={(e) => applyTimeRange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {timeRanges.map((tr) => (
              <option key={tr.value} value={tr.value}>
                {tr.label}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jenis User
            </label>
            <select
              value={filters.user_role || ""}
              onChange={(e) =>
                onFilterChange({ ...filters, user_role: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Cari
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value })
          }
          placeholder="Cari aktivitas..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>
    </div>
  );
};

export default HistoryFilters;
