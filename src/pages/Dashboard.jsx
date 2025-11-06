import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import {
  CheckSquare,
  Package,
  Calendar,
  Users,
  Building,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import SimpleChart from "../components/SimpleChart";
import SkeletonLoader from "../components/SkeletonLoader";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      
      // Simple cache: don't refetch if data was loaded within last 60 seconds
      const now = Date.now();
      if (lastFetchTime && (now - lastFetchTime) < 60000 && stats.length > 0) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError("");

      try {
        console.log("Dashboard loading for user role:", user.role);
        if (user.role === "user") {
          const [todoStats, myReqs] = await Promise.all([
            api.get("/todos/stats"),
            api.get("/requests/mine"),
          ]);
          const cards = [
            {
              name: t("dashboard.myTasks", { defaultValue: "My To-Dos" }),
              value: `${todoStats.data?.daily?.[0]?.total ?? 0}`,
              icon: CheckSquare,
              color: "bg-blue-500",
              description: t("dashboard.completedToday", { defaultValue: "Completed Today" }),
            },
            {
              name: t("dashboard.avgDuration", {
                defaultValue: "Avg Duration",
              }),
              value: `${
                todoStats.data?.avg_duration_minutes
                  ? Math.round(todoStats.data.avg_duration_minutes)
                  : 0
              } ${t('common.minutes', { defaultValue: 'minutes' })}`,
              icon: TrendingUp,
              color: "bg-yellow-500",
              description: t("dashboard.avgCompletionTime", {
                defaultValue: "Average completion time",
              }),
            },
            {
              name: t("dashboard.myRequests", { defaultValue: "My Requests" }),
              value: myReqs.data?.length ?? 0,
              icon: Package,
              color: "bg-green-500",
              description: t("dashboard.totalRequests", {
                defaultValue: "Total requests",
              }),
            },
          ];
          if (!cancelled) {
            setStats(cards);
            setLastFetchTime(Date.now());
            setLoading(false);
          }
        } else if (user.role === "admin_ga" || user.role === "admin_ga_manager" || user.role === "super_admin") {
          console.log("Loading admin dashboard data...");
          
          // Load all stats in parallel with individual error handling
          const [userStats, todoStats, assetStats] = await Promise.all([
            api.get("/users/stats/global").catch(err => {
              console.error("Users stats error:", err);
              return { data: { monthly: [], yearly: [] } };
            }),
            api.get("/todos/stats/global").catch(err => {
              console.error("Todos stats error:", err);
              return { data: { daily: [], monthly: [], yearly: [], status: [] } };
            }),
            api.get("/assets/stats").catch(err => {
              console.error("Assets stats error:", err);
              return { data: { by_status: [] } };
            }),
          ]);
          const cards = [
            {
              name: t("dashboard.newUsersThisMonth"),
              value: userStats.data?.monthly?.[0]?.total ?? 0,
              icon: Users,
              color: "bg-blue-500",
              description: t("common.thisMonth", {
                defaultValue: "This month",
              }),
            },
            {
              name: t("dashboard.todosCompletedThisMonth"),
              value: todoStats.data?.monthly?.[0]?.completed ?? 0,
              icon: AlertCircle,
              color: "bg-yellow-500",
              description: t("common.thisMonth", {
                defaultValue: "This month",
              }),
            },
            {
              name: t("assets.title", { defaultValue: "Assets" }),
              value:
                assetStats.data?.by_status?.reduce(
                  (a, c) => a + Number(c.total || 0),
                  0
                ) || 0,
              icon: Building,
              color: "bg-green-500",
              description: t("assets.allAssets", {
                defaultValue: "All assets",
              }),
            },
          ];
          if (!cancelled) {
            console.log("Admin dashboard data loaded:", cards);
            setStats(cards);
            setLastFetchTime(Date.now());
            setLoading(false);
          }
        } else if (user.role === "procurement") {
          console.log("Loading procurement dashboard data...");
          const [procStats, assetStats] = await Promise.all([
            api.get("/procurements/stats").catch(err => {
              console.error("Procurements stats error:", err);
              return { data: { monthly: { count: [], amount: [] } } };
            }),
            api.get("/assets/stats").catch(err => {
              console.error("Assets stats error:", err);
              return { data: { by_status: [] } };
            }),
          ]);
          const cards = [
            {
              name: t("dashboard.procurementsThisMonth"),
              value: procStats.data?.monthly?.count?.[0]?.total ?? 0,
              icon: Package,
              color: "bg-blue-500",
              description: t("common.thisMonth", {
                defaultValue: "This month",
              }),
            },
            {
              name: t("dashboard.spendThisMonth"),
              value: procStats.data?.monthly?.amount?.[0]?.total_amount ?? 0,
              icon: TrendingUp,
              color: "bg-purple-500",
              description: t("common.totalAmount", {
                defaultValue: "Total amount",
              }),
            },
            {
              name: t("dashboard.assetManagement"),
              value:
                assetStats.data?.by_status?.reduce(
                  (a, c) => a + Number(c.total || 0),
                  0
                ) || 0,
              icon: Building,
              color: "bg-green-500",
              description: t("assets.managedAssets", {
                defaultValue: "Managed assets",
              }),
            },
          ];
          if (!cancelled) {
            setStats(cards);
            setLastFetchTime(Date.now());
            setLoading(false);
          }
        } else {
          // Unknown role - set empty stats and stop loading
          if (!cancelled) {
            setStats([]);
            setLoading(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Dashboard loading error:", e);
          setError(
            e?.response?.data?.message ||
              t("common.failedToLoad", { defaultValue: "Failed to load" })
          );
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, t, refreshKey]);

  // Listen for refresh events from Layout (soft refresh)
  useEffect(() => {
    const handleRefreshData = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("refreshData", handleRefreshData);
    return () => {
      window.removeEventListener("refreshData", handleRefreshData);
    };
  }, []);


  const handleQuickAction = (action) => {
    switch (action) {
      case "create-todo":
        navigate("/todos");
        break;
      case "request-item":
        navigate("/requests");
        break;
      case "my-assets":
        navigate("/assets");
        break;
      case "manage-users":
        navigate("/admin/users");
        break;
      case "manage-assets":
        navigate("/admin/assets");
        break;
      case "manage-requests":
        navigate("/admin/requests");
        break;
      case "manage-todos":
        navigate("/admin/todos");
        break;
      case "manage-meetings":
        navigate("/admin/meetings");
        break;
      // case "manage-visitors": // Hidden during development
      //   navigate("/admin/visitors");
      //   break;
      case "procurement-requests":
        navigate("/procurement");
        break;
      case "procurement-assets":
        navigate("/procurement");
        break;
      default:
        break;
    }
  };

  const [chartData, setChartData] = useState(null);
  const [todayNotStarted, setTodayNotStarted] = useState(0);
  const [pendingMeetingCount, setPendingMeetingCount] = useState(0);

  // Load today's not started count for badge on quick action
  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      try {
        if (!user) return;
        // Only load todos badge for users with 'user' role (todos endpoint requires 'user' role)
        if (user.role !== "user") return;
        const res = await api.get("/todos");
        const list = res?.data?.data || res?.data || [];
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
        const count = list.filter(
          (t) => (t.status || "").toString() === "not_started" && isRunnableToday(t)
        ).length;
        if (!cancelled) setTodayNotStarted(count);
      } catch (e) {
        // Silent fail for badge - 403 is expected for non-user roles
      }
    }
    loadBadge();
    const interval = setInterval(loadBadge, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  // Load pending meeting count for GA and GA Manager badge
  useEffect(() => {
    let cancelled = false;
    async function loadPendingMeetingCount() {
      try {
        if (!user) return;
        if (user.role !== 'admin_ga' && user.role !== 'admin_ga_manager') {
          setPendingMeetingCount(0);
          return;
        }
        const res = await api.get("/meetings/pending-count");
        if (!cancelled && res?.data?.count !== undefined) {
          setPendingMeetingCount(res.data.count);
        }
      } catch (e) {
        if (!cancelled) setPendingMeetingCount(0);
      }
    }
    loadPendingMeetingCount();
    const interval = setInterval(loadPendingMeetingCount, 60000);
    
    // Listen for refresh events
    const handleRefresh = () => {
      loadPendingMeetingCount();
    };
    window.addEventListener('refreshData', handleRefresh);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('refreshData', handleRefresh);
    };
  }, [user]);

  // Generate chart data based on user role and stats
  useEffect(() => {
    if (stats.length > 0) {
      const labels = stats.map((stat) => stat.name);
      const values = stats.map((stat) => {
        // Extract numeric value from stat.value
        const match = stat.value.toString().match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      });

      setChartData({
        labels,
        datasets: [
          {
            label: t("dashboard.overview"),
            data: values,
            backgroundColor: [
              "rgba(59, 130, 246, 0.5)",
              "rgba(16, 185, 129, 0.5)",
              "rgba(245, 158, 11, 0.5)",
              "rgba(139, 92, 246, 0.5)",
            ],
            borderColor: [
              "rgba(59, 130, 246, 1)",
              "rgba(16, 185, 129, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(139, 92, 246, 1)",
            ],
            borderWidth: 1,
          },
        ],
      });
    }
  }, [stats, t]);

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6">
      {/* Welcome Message for all users */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t("dashboard.welcomeBack")}, {user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Quick Actions - moved right after welcome message */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-2 py-6 sm:px-4 lg:px-6">
          <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-white mb-6">
            {t("dashboard.quickActions")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2">
            {loading ? (
              <>
                <div className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-gray-600 h-full">
                  <SkeletonLoader type="card" lines={2} />
                </div>
                <div className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-gray-600 h-full">
                  <SkeletonLoader type="card" lines={2} />
                </div>
              </>
            ) : (
              <>
                {user?.role === "user" && (
                  <>
                    <button
                      onClick={() => handleQuickAction("create-todo")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-4 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <CheckSquare className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          <span className="inline-flex items-center gap-2">
                            {t("todos.title")}
                            {todayNotStarted > 0 && (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold rounded-full bg-red-500 text-white">
                                {todayNotStarted}
                              </span>
                            )}
                          </span>
                        </h3>
                        <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                          {t("dashboard.myTasks")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("request-item")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-4 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Package className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.requestItem")}
                        </h3>
                        <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                          {t("requests.subtitle")}
                        </p>
                      </div>
                    </button>
                  </>
                )}
                {(user?.role === "admin_ga" || user?.role === "admin_ga_manager" || user?.role === "super_admin") && (
                  <>
                    <button
                      onClick={() => handleQuickAction("manage-users")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Users className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.adminUsers")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("users.subtitle")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("manage-assets")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Building className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.assetManagement")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("assets.subtitle")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("manage-requests")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Package className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.adminRequests")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("requests.subtitle")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("manage-todos")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <CheckSquare className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.adminTodos")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("todos.subtitle")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("manage-meetings")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div className="relative">
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Calendar className="h-5 w-5" />
                        </span>
                        {pendingMeetingCount > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                            {pendingMeetingCount > 99 ? '99+' : pendingMeetingCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.meetingManagement")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("meetings.subtitle")}
                        </p>
                      </div>
                    </button>
                  </>
                )}
                {user?.role === "procurement" && (
                  <>
                    <button
                      onClick={() => handleQuickAction("procurement-requests")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Building className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("nav.assetManagement")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("assets.subtitle")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("procurement-assets")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Package className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("procurement.title")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("procurement.subtitle")}
                        </p>
                      </div>
                    </button>
                  </>
                )}
                {user?.role === "admin_ga" && (
                  <>
                    <button
                      onClick={() => handleQuickAction("procurement-requests")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Building className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("assets.title")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("assets.subtitle")}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickAction("procurement-assets")}
                      className="relative group bg-gray-50 dark:bg-gray-700 p-6 sm:p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md cursor-pointer h-full"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          <Package className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          {t("procurement.title")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {t("procurement.subtitle")}
                        </p>
                      </div>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid - hidden for regular user */}
      {(user?.role === "admin_ga" || user?.role === "admin_ga_manager" || user?.role === "super_admin") && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 w-full">
          {loading && (
            <>
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                <SkeletonLoader type="stats" />
              </div>
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                <SkeletonLoader type="stats" />
              </div>
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                <SkeletonLoader type="stats" />
              </div>
            </>
          )}
          {error && (
            <div className="col-span-full text-sm text-red-600 bg-red-50 p-4 rounded-lg">
              {error}
            </div>
          )}
          {!loading && !error && stats.length === 0 && (
            <div className="col-span-full text-sm text-gray-600 bg-gray-50 p-4 rounded-lg text-center">
              {t("dashboard.noDataSelectedPeriod")}
            </div>
          )}
          {!loading &&
            !error &&
            stats.length > 0 &&
            stats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 rounded-lg bg-primary-50 dark:bg-blue-900/30">
                        <stat.icon className="h-5 w-5 text-primary-700 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </dd>
                        <dd className="text-sm text-gray-600 dark:text-gray-400">
                          {stat.description}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Overview Chart - hidden for user */}
      {(user?.role === "admin_ga" || user?.role === "admin_ga_manager" || user?.role === "super_admin") && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("dashboard.title")}
              </h3>
            </div>
            <div className="h-48">
              {loading ? (
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              ) : chartData ? (
                <SimpleChart type="bar" data={chartData} height={192} />
              ) : (
                <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <span className="text-sm">{t("common.noData")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
