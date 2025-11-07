import React from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { getDateRange } from "./todoHelpers";

const AdminTodoFilters = ({
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  showDateDropdown,
  onToggleDateDropdown,
  todos,
  getTaskDate,
  t,
}) => {
  const getDateRangeForCount = () => {
    if (dateFrom && dateTo) {
      const start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return getDateRange(dateFilter, dateFrom, dateTo);
  };

  const getTotalCount = () => {
    const range = getDateRangeForCount();
    if (!range) return todos.length;
    return todos.filter((t) => {
      const d = getTaskDate(t);
      if (!d) return false;
      const after = d >= range.start;
      const before = !range.end || d < range.end;
      return after && before;
    }).length;
  };

  return (
    <>
      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Time range filter */}
          <div className="relative" data-dropdown="date">
            <button
              type="button"
              onClick={() => onToggleDateDropdown(!showDateDropdown)}
              className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900 text-left"
            >
              <span className="text-gray-900 text-sm sm:text-base">
                {dateFrom || dateTo
                  ? `${dateFrom || "-"} → ${dateTo || "-"}`
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
                      onDateFilterChange(option.value);
                      onDateFromChange("");
                      onDateToChange("");
                      onToggleDateDropdown(false);
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
                onChange={(e) => onDateFromChange(e.target.value)}
                placeholder={t("meetings.from")}
                className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                placeholder={t("meetings.to")}
                className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
            </div>
          </div>

          {/* Total count for current range */}
          <div className="flex items-center text-sm text-gray-700">
            <span>
              {t("common.total", { defaultValue: "Total" })}: {getTotalCount()}
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
            title={t("todos.searchTodosHint")}
          />
        </div>
      </div>
    </>
  );
};

export default AdminTodoFilters;

