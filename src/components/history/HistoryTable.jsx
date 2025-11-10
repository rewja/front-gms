import React from 'react';
import { useTranslation } from 'react-i18next';

const HistoryTable = ({ activities, loading, pagination, onPageChange, isAdmin }) => {
  const { t } = useTranslation();

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return t('activities.time.just_now', { defaultValue: 'Just now' });
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('activities.time.minutes_ago', { count: minutes, defaultValue: `${minutes} minutes ago` });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('activities.time.hours_ago', { count: hours, defaultValue: `${hours} hours ago` });
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return t('activities.time.days_ago', { count: days, defaultValue: `${days} days ago` });
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return t('activities.time.weeks_ago', { count: weeks, defaultValue: `${weeks} weeks ago` });
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return t('activities.time.months_ago', { count: months, defaultValue: `${months} months ago` });
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return t('activities.time.years_ago', { count: years, defaultValue: `${years} years ago` });
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      create: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
      update: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
      logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
      view: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      export: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      import: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
      failed_login: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z',
      start_todo: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      hold_todo: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      complete_todo: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      evaluate: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      create_routine_batch: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      purchase: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'
    };

    return icons[action] || icons.view;
  };

  const getActionColor = (action) => {
    const colors = {
      create: 'text-green-600 bg-green-100',
      create_routine_batch: 'text-green-700 bg-green-100',
      update: 'text-blue-600 bg-blue-100',
      delete: 'text-red-600 bg-red-100',
      login: 'text-green-600 bg-green-100',
      logout: 'text-gray-600 bg-gray-100',
      view: 'text-purple-600 bg-purple-100',
      export: 'text-indigo-600 bg-indigo-100',
      import: 'text-orange-600 bg-orange-100',
      failed_login: 'text-red-600 bg-red-100',
      start_todo: 'text-emerald-600 bg-emerald-100',
      hold_todo: 'text-yellow-600 bg-yellow-100',
      complete_todo: 'text-green-600 bg-green-100',
      evaluate: 'text-purple-600 bg-purple-100',
      purchase: 'text-teal-600 bg-teal-100'
    };

    return colors[action] || 'text-gray-600 bg-gray-100';
  };

  const renderTypeBadge = (activity) => {
    const newValues = activity.new_values || {};
    const todoType = newValues.todo_type;
    if (!todoType) return null;
    const label = todoType === 'rutin' 
      ? t('activities.todoTypes.routine', { defaultValue: 'Routine' })
      : t('activities.todoTypes.additional', { defaultValue: 'Additional' });
    const color = todoType === 'rutin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${color} ml-2`}>
        {label}
      </span>
    );
  };

  const renderBatchSummaryChips = (activity) => {
    const nv = activity.new_values || {};
    if (activity.action !== 'create_routine_batch') return null;
    const chips = [];
    if (nv.user_count != null) {
      const userLabel = nv.user_count === 1 
        ? t('activities.batchSummary.user', { defaultValue: 'user' })
        : t('activities.batchSummary.users', { defaultValue: 'users' });
      chips.push(`${nv.user_count} ${userLabel}`);
    }
    if (nv.occurrence_count != null) {
      const occurrenceLabel = nv.occurrence_count === 1
        ? t('activities.batchSummary.occurrence', { defaultValue: 'occurrence' })
        : t('activities.batchSummary.occurrences', { defaultValue: 'occurrences' });
      chips.push(`${nv.occurrence_count} ${occurrenceLabel}`);
    }
    if (nv.recurrence_interval && nv.recurrence_unit) {
      const unitMap = {
        day: t('todos.routinePattern.unitDay', { defaultValue: 'day' }),
        week: t('todos.routinePattern.unitWeek', { defaultValue: 'week' }),
        month: t('todos.routinePattern.unitMonth', { defaultValue: 'month' }),
        year: t('todos.routinePattern.unitYear', { defaultValue: 'year' }),
      };
      const unitLabel = unitMap[nv.recurrence_unit] || nv.recurrence_unit;
      chips.push(`${nv.recurrence_interval} ${unitLabel}`);
    }
    if (Array.isArray(nv.days_of_week) && nv.days_of_week.length) {
      const daysShort = [
        t('common.days.sundayShort', { defaultValue: 'Sun' }),
        t('common.days.mondayShort', { defaultValue: 'Mon' }),
        t('common.days.tuesdayShort', { defaultValue: 'Tue' }),
        t('common.days.wednesdayShort', { defaultValue: 'Wed' }),
        t('common.days.thursdayShort', { defaultValue: 'Thu' }),
        t('common.days.fridayShort', { defaultValue: 'Fri' }),
        t('common.days.saturdayShort', { defaultValue: 'Sat' })
      ];
      const days = nv.days_of_week.slice().sort((a,b)=>a-b).map(d=>daysShort[d]||d).join('·');
      chips.push(days);
    }
    if (!chips.length) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {chips.map((c, idx) => (
          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">{c}</span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('activities.loading')}</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('activities.no_activities')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('activities.table.activityType')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('activities.table.description')}
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activities.table.user')}
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('activities.table.time')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getActionIcon(activity.action)} />
                      </svg>
                      {t(`activities.actions.${activity.action}`, { defaultValue: activity.action })}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {activity.description}
                    {renderTypeBadge(activity)}
                  </div>
                  {renderBatchSummaryChips(activity)}
                  {activity.model_type && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t(`activities.models.${activity.model_type.split('\\').pop().toLowerCase()}`, { defaultValue: activity.model_type.split('\\').pop() })} #{activity.model_id}
                    </div>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {activity.user?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.user?.email}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(activity.created_at)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('activities.pagination.previous')}
            </button>
            <button
              onClick={() => onPageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('activities.pagination.next')}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('activities.pagination.showing')}{' '}
                <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span>
                {' '}{t('activities.pagination.to')}{' '}
                <span className="font-medium">
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
                </span>
                {' '}{t('activities.pagination.of')}{' '}
                <span className="font-medium">{pagination.total}</span>
                {' '}{t('activities.pagination.results')}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">{t('activities.pagination.previous')}</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.current_page - 2) + i;
                  if (pageNum > pagination.last_page) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.current_page
                          ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">{t('activities.pagination.next')}</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;

