import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import {
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Eye,
  Trash2,
  Clock,
  Shield,
  Building,
} from "lucide-react";
import SkeletonLoader from "../../components/SkeletonLoader";

const ActivityLogs = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isAdminView, setIsAdminView] = useState(true);

  const getActionIcon = (action) => {
    switch (action) {
      case "login":
        return <Shield className="h-4 w-4 text-green-500" />;
      case "logout":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "create":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "update":
        return <Activity className="h-4 w-4 text-yellow-500" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case "approve":
        return <Shield className="h-4 w-4 text-green-500" />;
      case "reject":
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "login":
        return "bg-green-100 text-green-800";
      case "logout":
        return "bg-red-100 text-red-800";
      case "create":
        return "bg-blue-100 text-blue-800";
      case "update":
        return "bg-yellow-100 text-yellow-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "approve":
        return "bg-green-100 text-green-800";
      case "reject":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatActionLabel = (action) => {
    const actionMap = {
      login: "Login",
      logout: "Logout",
      create: "Create",
      update: "Update",
      delete: "Delete",
      approve: "Approve",
      reject: "Reject",
    };
    return actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
  };

  const loadActivities = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (userFilter !== "all") params.append("user_id", userFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      // Try self endpoint first; if forbidden (e.g., admin context), fallback to admin endpoint
      try {
        const resMine = await api.get(`/activities/mine?${params.toString()}`);
        setActivities(resMine.data.data || resMine.data || []);
        setIsAdminView(false);
      } catch (eMine) {
        const isForbiddenMine = eMine?.response?.status === 403 || (typeof eMine?.message === "string" && eMine.message.includes("HTTP 403"));
        if (isForbiddenMine) {
          const res = await api.get(`/activities?${params.toString()}`);
          setActivities(res.data.data || []);
          setIsAdminView(true);
        } else {
          throw eMine;
        }
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const clearOldActivities = async () => {
    if (!window.confirm("Are you sure you want to clear old activity logs? This action cannot be undone.")) {
      return;
    }

    try {
      await api.delete("/activities/clear-old");
      await loadActivities();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to clear old activities");
    }
  };

  useEffect(() => {
    loadActivities();
  }, [searchTerm, actionFilter, userFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-600">Monitor user activities and system events</p>
      </div>

      {/* Stats removed */}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {isAdminView && (
            <div>
              <button
                onClick={clearOldActivities}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Clear Old Logs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activities List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={10} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity) => (
              <li key={activity.id} className="px-6 py-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                            activity.action
                          )}`}
                        >
                          {formatActionLabel(activity.action)}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {activity.user?.name || "Unknown User"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.formatted_created_at}
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      {activity.ip_address && (
                        <p className="text-xs text-gray-500 mt-1">
                          IP: {activity.ip_address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {activities.length === 0 && (
              <li className="px-6 py-4 text-center text-gray-500">
                No activities found
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
