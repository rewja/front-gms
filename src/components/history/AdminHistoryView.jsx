import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import HistoryFilters from "./HistoryFilters";
import HistoryTable from "./HistoryTable";
import HistoryStats from "./HistoryStats";
import HistoryExportModal from "./HistoryExportModal";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAllActivities,
  getSystemStats,
  exportAllActivities,
  clearOldLogs,
} from "../../services/activityService";

const AdminHistoryView = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_id: "",
    user_role: "all",
    action: "all",
    model_type: "",
    date_from: "",
    date_to: "",
    search: "",
    ip_address: "",
    page: 1,
    per_page: 50,
  });
  const [pagination, setPagination] = useState({});
  const [showClearModal, setShowClearModal] = useState(false);
  const [daysToKeep, setDaysToKeep] = useState(90);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadActivities();
    loadStats();
  }, [filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await getAllActivities(filters);
      setActivities(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getSystemStats();
      setStats(response.data.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleClearOldLogs = async () => {
    try {
      const response = await clearOldLogs({ days: daysToKeep });
      const deletedCount = response?.deleted_count ?? response?.data?.deleted_count ?? 0;
      alert(
        t("activities.admin.logs_cleared", {
          count: deletedCount,
        })
      );
      setShowClearModal(false);
      loadActivities();
      loadStats();
    } catch (error) {
      console.error("Error clearing old logs:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("activities.admin.title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t("activities.admin.description")}
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-6">
          <HistoryStats stats={stats} isAdmin={true} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <HistoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          isAdmin={true}
        />
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex justify-between">
        <button
          onClick={() => setShowClearModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          {t("activities.admin.clear_old_logs")}
        </button>

        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t("activities.export.button")}
        </button>
      </div>

      {/* Activities Table */}
      <HistoryTable
        activities={activities}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        isAdmin={true}
      />

      {showExportModal && (
        <HistoryExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          activities={activities}
          currentPage={pagination.current_page || 1}
          itemsPerPage={pagination.per_page || filters.per_page}
          isAdmin={true}
          user={user}
        />
      )}

      {/* Clear Old Logs Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("activities.admin.clear_old_logs")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {t("activities.admin.clear_old_logs_description")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {`Akan menghapus log yang lebih lama dari ${daysToKeep} hari (sebelum ${new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toLocaleString()}).`}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("activities.admin.days_to_keep")}
              </label>
              <input
                type="number"
                value={daysToKeep}
                onChange={(e) => setDaysToKeep(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="1"
                max="365"
              />
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {t("activities.admin.confirm_clear")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearOldLogs}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                {t("activities.admin.clear_old_logs")}
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHistoryView;
