import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../components/NotificationSystem";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { api } from "../../lib/api";
import { getStorageUrl } from "../../config/api";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  QrCode,
  Calendar,
  MapPin,
  Building,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  ChevronDown,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../../components/SkeletonLoader";

const AdminVisitors = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const { handleApiError } = useErrorHandler();
  
  // State management
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalToday: 0,
    checkedIn: 0,
    checkedOut: 0,
    pending: 0,
    urgent: 0
  });
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Loading states for actions
  const [loadingStates, setLoadingStates] = useState({});

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "checked_in":
        return "bg-green-100 text-green-800 border-green-200";
      case "checked_out":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get location color
  const getLocationColor = (location) => {
    switch (location) {
      case "Cikunir":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Naradata":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rumah Valortek":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Sauciko":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Tebet":
        return "bg-red-100 text-red-800 border-red-200";
      case "TTM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "checked_in":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "checked_out":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy, HH:mm");
  };

  // Format status label
  const formatStatusLabel = (status) => {
    switch (status) {
      case "checked_in":
        return t("visitors.checkedIn", { defaultValue: "Sudah Check-in" });
      case "checked_out":
        return t("visitors.checkedOut", { defaultValue: "Sudah Check-out" });
      case "pending":
        return t("visitors.pending", { defaultValue: "Menunggu" });
      default:
        return status;
    }
  };

  // Format location label
  const formatLocationLabel = (location) => {
    return location || t("visitors.noLocation", { defaultValue: "Tidak ada lokasi" });
  };

  // Load visitors data
  const loadVisitors = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/visitors", {
        params: {
          search: searchTerm,
          status: statusFilter !== "all" ? statusFilter : undefined,
          location: locationFilter !== "all" ? locationFilter : undefined,
          date: dateFilter
        }
      });
      
      setVisitors(response.data.data || response.data);
    } catch (err) {
      handleApiError(err, "load");
      setError(t("visitors.loadError", { defaultValue: "Gagal memuat data pengunjung" }));
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await api.get("/admin/dashboard");
      setStats(response.data.stats || {
        totalToday: 0,
        checkedIn: 0,
        checkedOut: 0,
        pending: 0,
        urgent: 0
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  // Handle visitor actions
  const handleCheckIn = async (visitorId) => {
    const loadingKey = `checkin-${visitorId}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      await api.post(`/admin/visitors/${visitorId}/checkin`);
      await loadVisitors();
      await loadStats();
      success(t("visitors.checkInSuccess", { defaultValue: "Check-in berhasil" }));
    } catch (err) {
      handleApiError(err, "checkin");
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleCheckOut = async (visitorId) => {
    const loadingKey = `checkout-${visitorId}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      await api.post(`/admin/visitors/${visitorId}/checkout`);
      await loadVisitors();
      await loadStats();
      success(t("visitors.checkOutSuccess", { defaultValue: "Check-out berhasil" }));
    } catch (err) {
      handleApiError(err, "checkout");
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDelete = async (visitorId) => {
    if (!window.confirm(t("visitors.deleteConfirmation", { defaultValue: "Hapus data pengunjung ini?" }))) {
      return;
    }
    
    const loadingKey = `delete-${visitorId}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      await api.delete(`/admin/visitors/${visitorId}`);
      await loadVisitors();
      await loadStats();
      success(t("visitors.deleteSuccess", { defaultValue: "Data pengunjung berhasil dihapus" }));
    } catch (err) {
      handleApiError(err, "delete");
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // View visitor details
  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor);
    setShowDetailModal(true);
  };

  // View QR code
  const handleViewQR = (visitor) => {
    setSelectedVisitor(visitor);
    setShowQRModal(true);
  };

  // Filter visitors
  const filteredVisitors = visitors.filter(visitor => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        visitor.name?.toLowerCase().includes(searchLower) ||
        visitor.meet_with?.toLowerCase().includes(searchLower) ||
        visitor.origin?.toLowerCase().includes(searchLower) ||
        visitor.purpose?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && visitor.status !== statusFilter) {
      return false;
    }

    // Priority filter
    if (locationFilter !== "all" && visitor.location !== locationFilter) {
      return false;
    }

    return true;
  });

  // Load data on component mount
  useEffect(() => {
    loadVisitors();
    loadStats();
  }, []);

  // Reload when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadVisitors();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, locationFilter, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("visitors.title", { defaultValue: "Manajemen Pengunjung" })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("visitors.subtitle", { defaultValue: "Kelola dan pantau pengunjung PT. Solusi Intek" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadVisitors();
              loadStats();
            }}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t("common.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Today */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("visitors.totalToday", { defaultValue: "Total Hari Ini" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalToday}
              </p>
            </div>
          </div>
        </div>

        {/* Checked In */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("visitors.checkedIn", { defaultValue: "Sudah Check-in" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.checkedIn}
              </p>
            </div>
          </div>
        </div>

        {/* Checked Out */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserX className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("visitors.checkedOut", { defaultValue: "Sudah Check-out" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.checkedOut}
              </p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("visitors.pending", { defaultValue: "Menunggu" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.pending}
              </p>
            </div>
          </div>
        </div>

        {/* Urgent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("visitors.urgent", { defaultValue: "Mendesak" })}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.urgent}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t("visitors.searchPlaceholder", { defaultValue: "Cari pengunjung..." })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t("common.filters", { defaultValue: "Filter" })}
            </button>
            
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setDateFilter("today");
              }}
              className="btn-secondary"
            >
              {t("common.clear", { defaultValue: "Bersihkan" })}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("visitors.status", { defaultValue: "Status" })}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{t("common.all", { defaultValue: "Semua" })}</option>
                  <option value="pending">{t("visitors.pending", { defaultValue: "Menunggu" })}</option>
                  <option value="checked_in">{t("visitors.checkedIn", { defaultValue: "Sudah Check-in" })}</option>
                  <option value="checked_out">{t("visitors.checkedOut", { defaultValue: "Sudah Check-out" })}</option>
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("visitors.location", { defaultValue: "Lokasi" })}
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{t("visitors.allLocations", { defaultValue: "Semua Lokasi" })}</option>
                  <option value="Cikunir">Cikunir</option>
                  <option value="Naradata">Naradata</option>
                  <option value="Rumah Valortek">Rumah Valortek</option>
                  <option value="Sauciko">Sauciko</option>
                  <option value="Tebet">Tebet</option>
                  <option value="TTM">TTM</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("visitors.date", { defaultValue: "Tanggal" })}
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="today">{t("common.today", { defaultValue: "Hari Ini" })}</option>
                  <option value="yesterday">{t("common.yesterday", { defaultValue: "Kemarin" })}</option>
                  <option value="this_week">{t("common.thisWeek", { defaultValue: "Minggu Ini" })}</option>
                  <option value="this_month">{t("common.thisMonth", { defaultValue: "Bulan Ini" })}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visitors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader type="table" rows={5} />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadVisitors}
              className="mt-4 btn-primary"
            >
              {t("common.retry", { defaultValue: "Coba Lagi" })}
            </button>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t("visitors.noVisitors", { defaultValue: "Tidak ada pengunjung" })}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("visitors.name", { defaultValue: "Nama" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("visitors.purpose", { defaultValue: "Tujuan" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("visitors.meetWith", { defaultValue: "Bertemu Dengan" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("visitors.status", { defaultValue: "Status" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("visitors.location", { defaultValue: "Lokasi" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("visitors.time", { defaultValue: "Waktu" })}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("common.actions", { defaultValue: "Aksi" })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {visitor.face_image ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={getStorageUrl(`storage/${visitor.face_image}`)}
                              alt={visitor.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {visitor.name}
                          </div>
                          {visitor.origin && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {visitor.origin}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                        {visitor.purpose}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {visitor.meet_with}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(visitor.status)}`}>
                        {getStatusIcon(visitor.status)}
                        <span className="ml-1">{formatStatusLabel(visitor.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLocationColor(visitor.location)}`}>
                        {formatLocationLabel(visitor.location)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        <div>{formatDate(visitor.created_at)}</div>
                        {visitor.check_in_time && (
                          <div className="text-green-600">
                            {t("visitors.checkInTime", { defaultValue: "Check-in" })}: {formatDate(visitor.check_in_time)}
                          </div>
                        )}
                        {visitor.check_out_time && (
                          <div className="text-gray-600">
                            {t("visitors.checkOutTime", { defaultValue: "Check-out" })}: {formatDate(visitor.check_out_time)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => handleViewDetails(visitor)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title={t("common.viewDetails", { defaultValue: "Lihat Detail" })}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* View QR Code */}
                        <button
                          onClick={() => handleViewQR(visitor)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title={t("visitors.viewQR", { defaultValue: "Lihat QR Code" })}
                        >
                          <QrCode className="h-4 w-4" />
                        </button>

                        {/* Check-in/Check-out Actions */}
                        {visitor.status === "pending" && (
                          <button
                            onClick={() => handleCheckIn(visitor.id)}
                            disabled={loadingStates[`checkin-${visitor.id}`]}
                            className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50"
                            title={t("visitors.checkIn", { defaultValue: "Check-in" })}
                          >
                            {loadingStates[`checkin-${visitor.id}`] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {visitor.status === "checked_in" && (
                          <button
                            onClick={() => handleCheckOut(visitor.id)}
                            disabled={loadingStates[`checkout-${visitor.id}`]}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded disabled:opacity-50"
                            title={t("visitors.checkOut", { defaultValue: "Check-out" })}
                          >
                            {loadingStates[`checkout-${visitor.id}`] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(visitor.id)}
                          disabled={loadingStates[`delete-${visitor.id}`]}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                          title={t("common.delete", { defaultValue: "Hapus" })}
                        >
                          {loadingStates[`delete-${visitor.id}`] ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visitor Detail Modal */}
      {showDetailModal && selectedVisitor && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("visitors.visitorDetails", { defaultValue: "Detail Pengunjung" })}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {t("visitors.personalInfo", { defaultValue: "Informasi Pribadi" })}
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("visitors.name", { defaultValue: "Nama" })}
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedVisitor.name}</p>
                    </div>

                    {selectedVisitor.origin && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          {t("visitors.origin", { defaultValue: "Asal" })}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{selectedVisitor.origin}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("visitors.meetWith", { defaultValue: "Bertemu Dengan" })}
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedVisitor.meet_with}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("visitors.purpose", { defaultValue: "Tujuan" })}
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedVisitor.purpose}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Priority */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {t("visitors.statusInfo", { defaultValue: "Status & Prioritas" })}
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("visitors.status", { defaultValue: "Status" })}
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedVisitor.status)}`}>
                        {getStatusIcon(selectedVisitor.status)}
                        <span className="ml-1">{formatStatusLabel(selectedVisitor.status)}</span>
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("visitors.location", { defaultValue: "Lokasi" })}
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLocationColor(selectedVisitor.location)}`}>
                        {formatLocationLabel(selectedVisitor.location)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Information */}
                {selectedVisitor.is_representative && (
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {t("visitors.groupInfo", { defaultValue: "Informasi Grup" })}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          {t("visitors.groupSize", { defaultValue: "Jumlah Grup" })}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{selectedVisitor.group_size}</p>
                      </div>

                      {selectedVisitor.represented_names && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                            {t("visitors.groupMembers", { defaultValue: "Anggota Grup" })}
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{selectedVisitor.represented_names}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {t("visitors.timestamps", { defaultValue: "Waktu" })}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("visitors.registered", { defaultValue: "Terdaftar" })}
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedVisitor.created_at)}</p>
                    </div>

                    {selectedVisitor.check_in_time && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          {t("visitors.checkInTime", { defaultValue: "Check-in" })}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedVisitor.check_in_time)}</p>
                      </div>
                    )}

                    {selectedVisitor.check_out_time && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          {t("visitors.checkOutTime", { defaultValue: "Check-out" })}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedVisitor.check_out_time)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* KTP Image */}
                {selectedVisitor.ktp_image && (
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {t("visitors.ktpImage", { defaultValue: "Foto KTP" })}
                    </h4>
                    <div className="flex justify-center">
                      <img
                        src={getStorageUrl(`storage/${selectedVisitor.ktp_image}`)}
                        alt="KTP"
                        className="max-w-full h-auto max-h-96 rounded-lg border"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-secondary"
                >
                  {t("common.close", { defaultValue: "Tutup" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedVisitor && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("visitors.qrCode", { defaultValue: "QR Code" })}
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="text-center">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("visitors.qrCodeFor", { defaultValue: "QR Code untuk" })}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedVisitor.name}</p>
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                  <QrCode className="h-32 w-32 mx-auto text-gray-400" />
                  <p className="text-xs text-gray-500 mt-2">{selectedVisitor.qr_code}</p>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>{t("visitors.qrCodeInstructions", { defaultValue: "Gunakan QR Code ini untuk check-in/check-out" })}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="btn-secondary"
                >
                  {t("common.close", { defaultValue: "Tutup" })}
                </button>
                <button
                  onClick={() => {
                    // Print QR Code functionality
                    window.print();
                  }}
                  className="btn-primary"
                >
                  {t("common.print", { defaultValue: "Cetak" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVisitors;