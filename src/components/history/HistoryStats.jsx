import React from 'react';
import { useTranslation } from 'react-i18next';

const HistoryStats = ({ stats, isAdmin }) => {
  const { t } = useTranslation();

  const StatCard = ({ title, value, icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
    };

    return (
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`p-3 rounded-md ${colorClasses[color]}`}>
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {title}
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {value}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ChartBar = ({ label, value, maxValue, color = 'blue' }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
    };

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>{label}</span>
          <span>{value}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Aktivitas"
          value={stats.user_stats?.total_activities || stats.system_stats?.total_activities || 0}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="blue"
        />
        
        <StatCard
          title="Membuat Data"
          value={stats.user_stats?.creates || 0}
          icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
          color="green"
        />
        
        <StatCard
          title="Memperbarui Data"
          value={stats.user_stats?.updates || 0}
          icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          color="yellow"
        />
        
        <StatCard
          title="Masuk Sistem"
          value={stats.user_stats?.logins || stats.system_stats?.total_logins || 0}
          icon="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
          color="purple"
        />
      </div>

      {/* Admin-specific statistics */}
      {isAdmin && stats.system_stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Pengguna Aktif"
            value={stats.system_stats.active_users || 0}
            icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            color="indigo"
          />
          
          <StatCard
            title="Gagal Masuk"
            value={stats.system_stats.failed_logins || 0}
            icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            color="red"
          />
        </div>
      )}

      {/* Activities by Action Chart */}
      {stats.by_action && stats.by_action.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Aktivitas Berdasarkan Jenis
          </h3>
          <div className="space-y-3">
            {stats.by_action.map((item, index) => {
              const maxValue = Math.max(...stats.by_action.map(i => i.total));
              const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'indigo'];
              const actionLabels = {
                create: 'Membuat',
                update: 'Memperbarui',
                delete: 'Menghapus',
                login: 'Masuk',
                logout: 'Keluar',
                view: 'Melihat',
                export: 'Mengekspor',
                import: 'Mengimpor',
                failed_login: 'Gagal Masuk'
              };
              return (
                <ChartBar
                  key={item.action}
                  label={actionLabels[item.action] || item.action}
                  value={item.total}
                  maxValue={maxValue}
                  color={colors[index % colors.length]}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Activities by User Chart (Admin only) */}
      {isAdmin && stats.by_user && stats.by_user.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Aktivitas Berdasarkan Pengguna
          </h3>
          <div className="space-y-3">
            {stats.by_user.slice(0, 10).map((item, index) => {
              const maxValue = Math.max(...stats.by_user.map(i => i.total));
              const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'indigo'];
              return (
                <ChartBar
                  key={item.user_id}
                  label={item.user?.name || `User #${item.user_id}`}
                  value={item.total}
                  maxValue={maxValue}
                  color={colors[index % colors.length]}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Activities Chart */}
      {stats.daily && stats.daily.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Aktivitas Harian (30 Hari Terakhir)
          </h3>
          <div className="space-y-3">
            {stats.daily.slice(0, 7).map((item, index) => {
              const maxValue = Math.max(...stats.daily.map(i => i.total));
              return (
                <ChartBar
                  key={item.date}
                  label={new Date(item.date).toLocaleDateString()}
                  value={item.total}
                  maxValue={maxValue}
                  color="blue"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activities */}
      {stats.recent && stats.recent.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Aktivitas Terbaru
          </h3>
          <div className="space-y-3">
            {stats.recent.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.user?.name} • {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryStats;

