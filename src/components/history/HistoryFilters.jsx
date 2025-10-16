import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const HistoryFilters = ({ filters, onFilterChange, isAdmin }) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      action: '',
      date_from: '',
      date_to: '',
      search: '',
      page: 1,
      per_page: 50
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const actions = [
    { value: '', label: t('activities.filters.all_actions') },
    { value: 'create', label: t('activities.actions.create') },
    { value: 'update', label: t('activities.actions.update') },
    { value: 'delete', label: t('activities.actions.delete') },
    { value: 'login', label: t('activities.actions.login') },
    { value: 'logout', label: t('activities.actions.logout') },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('activities.filters.title')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Action Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Jenis Aktivitas
          </label>
          <select
            value={localFilters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {actions.map(action => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={localFilters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={localFilters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cari Aktivitas
          </label>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Cari aktivitas..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Quick Date Filters */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter Cepat
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              handleFilterChange('date_from', today);
              handleFilterChange('date_to', today);
            }}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
          >
            Hari Ini
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              handleFilterChange('date_from', weekAgo.toISOString().split('T')[0]);
              handleFilterChange('date_to', today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
          >
            Seminggu Terakhir
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              handleFilterChange('date_from', monthAgo.toISOString().split('T')[0]);
              handleFilterChange('date_to', today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300"
          >
            Sebulan Terakhir
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleApplyFilters}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Terapkan Filter
        </button>
        <button
          onClick={handleClearFilters}
          className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
        >
          Hapus Filter
        </button>
      </div>
    </div>
  );
};

export default HistoryFilters;
