import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Home,
  CheckSquare,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ShoppingCart,
  Building,
  Clock,
  RotateCcw,
  ChevronDown,
  Check,
  History,
  UserCheck,
  Bell,
} from "lucide-react";
import Logo from "./Logo";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langWrapRef = useRef(null);
  const [todayNotStarted, setTodayNotStarted] = useState(0);
  const [pendingMeetingCount, setPendingMeetingCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [refreshKey, setRefreshKey] = useState(0);

  const handleReload = () => {
    setRefreshKey((prev) => prev + 1);
    window.dispatchEvent(
      new CustomEvent("refreshData", { detail: { refreshKey: refreshKey + 1 } })
    );
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Compute today's not started todos count for badge
  useEffect(() => {
    let cancelled = false;
    async function loadTodosCount() {
      try {
        if (!user) return;
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
        // silent fail for badge
      }
    }
    loadTodosCount();
    // refresh on route change to reflect updates
    // and periodically every minute
    const interval = setInterval(loadTodosCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, location.pathname]);

  // Load pending meeting count for GA and GA Manager
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
        // silent fail for badge
        if (!cancelled) setPendingMeetingCount(0);
      }
    }
    loadPendingMeetingCount();
    // Refresh every minute
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
  }, [user, location.pathname]);

  // Format time for Asia/Jakarta timezone
  const formatJakartaTime = () => {
    const locale = i18n.language === "id" ? "id-ID" : "en-US";
    return currentTime.toLocaleString(locale, {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getNavigationItems = () => {
    const baseItems = [
      { name: t("nav.dashboard"), href: "/dashboard", icon: Home },
    ];

    if (user?.role === "user") {
      return [
        ...baseItems,
        { name: t("nav.todos"), href: "/todos", icon: CheckSquare },
        { name: t("nav.requestItem"), href: "/requests", icon: Package },
        { name: t("nav.history"), href: "/history", icon: History },
      ];
    }

    if (["admin_ga", "admin_ga_manager", "super_admin"].includes(user?.role)) {
      return [
        ...baseItems,
        { name: t("nav.adminUsers"), href: "/admin/users", icon: Users },
        { name: t("nav.adminTodos"), href: "/admin/todos", icon: CheckSquare },
        {
          name: t("nav.adminRequests"),
          href: "/admin/requests",
          icon: Package,
        },
        {
          name: t("nav.assetManagement"),
          href: "/admin/asset-management",
          icon: Building,
        },
        { name: t("nav.meetingManagement"), href: "/admin/meetings", icon: Clock },
        { name: t("nav.visitors"), href: "/admin/visitors", icon: UserCheck },
        { name: t("nav.history"), href: "/history", icon: History },
      ];
    }

    if (user?.role === "procurement") {
      return [
        ...baseItems,
        {
          name: t("nav.procurement"),
          href: "/procurement",
          icon: ShoppingCart,
        },
        {
          name: t("nav.assetManagement"),
          href: "/admin/asset-management",
          icon: Building,
        },
        { name: t("nav.history"), href: "/history", icon: History },
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showLangDropdown &&
        langWrapRef.current &&
        !langWrapRef.current.contains(e.target)
      ) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLangDropdown]);

  const LangSelector = () => (
    <div className="relative" ref={langWrapRef}>
      <button
        type="button"
        onClick={() => setShowLangDropdown((v) => !v)}
        onBlur={() => {
          setTimeout(() => setShowLangDropdown(false), 100);
        }}
        className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        title={t("lang.language", { defaultValue: "Language" })}
      >
        <span className="flex items-center gap-2">
          {/* Font Awesome Language icon (inline SVG) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            className="h-4 w-4 text-gray-500"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M192 64C209.7 64 224 78.3 224 96L224 128L352 128C369.7 128 384 142.3 384 160C384 177.7 369.7 192 352 192L342.4 192L334 215.1C317.6 260.3 292.9 301.6 261.8 337.1C276 345.9 290.8 353.7 306.2 360.6L356.6 383L418.8 243C423.9 231.4 435.4 224 448 224C460.6 224 472.1 231.4 477.2 243L605.2 531C612.4 547.2 605.1 566.1 589 573.2C572.9 580.3 553.9 573.1 546.8 557L526.8 512L369.3 512L349.3 557C342.1 573.2 323.2 580.4 307.1 573.2C291 566 283.7 547.1 290.9 531L330.7 441.5L280.3 419.1C257.3 408.9 235.3 396.7 214.5 382.7C193.2 399.9 169.9 414.9 145 427.4L110.3 444.6C94.5 452.5 75.3 446.1 67.4 430.3C59.5 414.5 65.9 395.3 81.7 387.4L116.2 370.1C132.5 361.9 148 352.4 162.6 341.8C148.8 329.1 135.8 315.4 123.7 300.9L113.6 288.7C102.3 275.1 104.1 254.9 117.7 243.6C131.3 232.3 151.5 234.1 162.8 247.7L173 259.9C184.5 273.8 197.1 286.7 210.4 298.6C237.9 268.2 259.6 232.5 273.9 193.2L274.4 192L64.1 192C46.3 192 32 177.7 32 160C32 142.3 46.3 128 64 128L160 128L160 96C160 78.3 174.3 64 192 64zM448 334.8L397.7 448L498.3 448L448 334.8z" />
          </svg>
          <span className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
          <span>{i18n.language === "id" ? t("lang.id") : t("lang.en")}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${
            showLangDropdown ? "rotate-180" : ""
          }`}
        />
      </button>
      {showLangDropdown && (
        <div className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-1 text-sm ring-1 ring-black ring-opacity-5">
          {[
            { value: "id", label: t("lang.id") },
            { value: "en", label: t("lang.en") },
          ].map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={i18n.language === opt.value}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                i18n.language === opt.value
                  ? "bg-primary-50 dark:bg-primary-900/20"
                  : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                i18n.changeLanguage(opt.value);
                localStorage.setItem("lang", opt.value);
                setShowLangDropdown(false);
              }}
            >
              <span>{opt.label}</span>
              {i18n.language === opt.value && (
                <Check className="h-4 w-4 text-primary-600" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Function to check if a navigation item is active
  const isItemActive = (href) => {
    return location.pathname === href;
  };

  // Function to get navigation item styles
  const getNavItemStyles = (href) => {
    const isActive = isItemActive(href);

    const baseClasses =
      "mb-2 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out transform";

    if (isActive) {
      return `${baseClasses} bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 shadow-sm translate-x-2`;
    } else {
      return `${baseClasses} text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 translate-x-0 hover:translate-x-1`;
    }
  };

  return (
    <div className="min-h-screen bg-light-gradient dark:bg-dark-gradient transition-colors duration-300">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600/75 dark:bg-gray-900/75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-900 shadow-xl border-r border-gray-200 dark:border-gray-800">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Logo size="medium" className="object-contain" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("app.title")}
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Time display in mobile sidebar */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatJakartaTime()}</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigationItems.map((item) => {
              const isTodos = (item.href || "").includes("/todos");
              const isMeetings = (item.href || "").includes("/admin/meetings");
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={getNavItemStyles(item.href)}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex items-center gap-2">
                    {item.name}
                    {isTodos && todayNotStarted > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold rounded-full bg-red-500 text-white">
                        {todayNotStarted}
                      </span>
                    )}
                    {isMeetings && pendingMeetingCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold rounded-full bg-red-500 text-white">
                        {pendingMeetingCount > 99 ? '99+' : pendingMeetingCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
            <LangSelector />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-800">
          <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Logo size="medium" className="object-contain" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("app.title")}
              </h1>
            </div>
          </div>

          {/* Time display in desktop sidebar */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatJakartaTime()}</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigationItems.map((item) => {
              const isTodos = (item.href || "").includes("/todos");
              const isMeetings = (item.href || "").includes("/admin/meetings");
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={getNavItemStyles(item.href)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex items-center gap-2">
                    {item.name}
                    {isTodos && todayNotStarted > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold rounded-full bg-red-500 text-white">
                        {todayNotStarted}
                      </span>
                    )}
                    {isMeetings && pendingMeetingCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold rounded-full bg-red-500 text-white">
                        {pendingMeetingCount > 99 ? '99+' : pendingMeetingCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
            <LangSelector />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur px-3 sm:px-4 lg:px-6 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <div className="flex items-center justify-between w-full">
            {/* Left side - User info with custom gap */}
            <div className="flex items-center ml-3">
              {" "}
              {/* Adjust ml-2 to ml-4, ml-6, etc. for more left spacing */}
              <div className="text-xs sm:text-sm">
                <p className="font-medium text-gray-900 dark:text-white truncate max-w-24 sm:max-w-none mb-1.5">
                  {user?.name}
                </p>
                <p className="text-gray-500 dark:text-gray-400 capitalize text-xs">
                  {user?.role}
                </p>
              </div>
            </div>

            {/* Right side - Notifications, Reload and Logout buttons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Meeting Notification Bell for GA and GA Manager */}
              {(user?.role === 'admin_ga' || user?.role === 'admin_ga_manager') && (
                <Link
                  to="/admin/meetings"
                  className="relative flex items-center rounded-lg px-2 py-2 sm:px-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                  title={pendingMeetingCount > 0 ? `${pendingMeetingCount} meeting requests pending` : 'No pending requests'}
                >
                  <Bell className="h-5 w-5" />
                  {pendingMeetingCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {pendingMeetingCount > 99 ? '99+' : pendingMeetingCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={handleReload}
                className="flex items-center rounded-lg px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                title={t("app.reload")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center rounded-lg px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium text-primary-700 hover:bg-primary-50 hover:text-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-200 transition-colors duration-200"
              >
                <LogOut className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t("app.logout")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-3 sm:p-4 lg:p-6 bg-transparent min-h-screen transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
