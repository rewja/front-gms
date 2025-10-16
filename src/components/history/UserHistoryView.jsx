import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HistoryFilters from './HistoryFilters';
import HistoryTable from './HistoryTable';
import HistoryStats from './HistoryStats';
import { getPersonalActivities, getPersonalStats, exportPersonalActivities } from '../../services/activityService';

const UserHistoryView = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    per_page: 50
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    loadActivities();
    loadStats();
  }, [filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await getPersonalActivities(filters);
      setActivities(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getPersonalStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleExport = async () => {
    try {
      const response = await exportPersonalActivities(filters);
      // Create download link
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-activities-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting activities:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('activities.user.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('activities.user.description')}
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-6">
          <HistoryStats stats={stats} isAdmin={false} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <HistoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          isAdmin={false}
        />
      </div>

      {/* Export Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('activities.export.button')}
        </button>
      </div>

      {/* Activities Table */}
      <HistoryTable
        activities={activities}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        isAdmin={false}
      />
    </div>
  );
};

export default UserHistoryView;


