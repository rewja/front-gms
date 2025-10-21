import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import {
  Search,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import SkeletonLoader from "../components/SkeletonLoader";
import MaintenanceActionMenu from "../components/MaintenanceActionMenu";

const UserAssets = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAssetUpdated = (updatedAsset) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === updatedAsset.id ? { ...asset, ...updatedAsset } : asset
      )
    );
  };

  const canRequestMaintenance = (asset) => {
    if (!asset) return false;
    if (asset.maintenance_status === "in_progress") return false;
    if (asset.request) {
      return asset.request.status === "completed";
    }
    return true;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "maintenance":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "needs_repair":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Building className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "needs_repair":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatusLabel = (status) => {
    const map = {
      active: t("common.status.active"),
      maintenance: t("common.status.maintenance"),
      needs_repair: t("common.status.needsRepair"),
      procurement: t("common.status.inProcurement"),
      not_received: t("common.status.notReceived"),
      received: t("common.status.received"),
      needs_replacement: t("common.status.needsReplacement"),
      repairing: t("common.status.repairing"),
      replacing: t("common.status.replacing"),
    };
    return map[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        console.log("Loading assets for user:", user);
        const res = await api.get("/assets/mine");
        console.log("Assets response:", res.data);
        if (!cancelled) setAssets(res.data || []);
      } catch (e) {
        console.error("Error loading assets:", e);
        if (!cancelled)
          setError(
            e?.response?.data?.message ||
              t("common.failedToLoad", {
                defaultValue: "Failed to load assets",
              })
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("assets.myAssets")}
        </h1>
        <p className="text-gray-600">{t("assets.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("assets.searchAssets")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">{t("todos.allStatus")}</option>
              <option value="active">{t("assets.status.active")}</option>
              <option value="maintenance">
                {t("assets.status.maintenance")}
              </option>
              <option value="needs_repair">
                {t("assets.status.needsRepair")}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Assets List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {!loading &&
              !error &&
              filteredAssets.map((asset) => (
                <li key={asset.id} className="px-3 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(asset.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {asset.name}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                asset.status
                              )}`}
                            >
                              {formatStatusLabel(asset.status)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {asset.asset_code}
                            </span>
                            {asset.maintenance_status === "in_progress" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                {t("maintenance.status.inProgress")}
                              </span>
                            )}
                            {asset.maintenance_status === "completed" &&
                              asset.maintenance_type && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                  {asset.maintenance_type === "repair"
                                    ? t("maintenance.status.completedRepair")
                                    : t(
                                        "maintenance.status.completedReplacement"
                                      )}
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          <p>
                            <span className="font-medium">
                              {t("common.category")}:
                            </span>{" "}
                            {asset.category}
                          </p>
                          <p>
                            <span className="font-medium">
                              {t("assets.location")}:
                            </span>{" "}
                            {asset.location}
                          </p>
                          {asset.maintenance_status === "in_progress" &&
                            asset.maintenance_reason && (
                              <p className="text-xs text-amber-600 mt-1">
                                <span className="font-medium">
                                  {t("maintenance.reasonLabel")}:
                                </span>{" "}
                                {asset.maintenance_reason}
                              </p>
                            )}
                          {asset.maintenance_status === "completed" &&
                            asset.maintenance_completion_notes && (
                              <p className="text-xs text-emerald-600 mt-1">
                                <span className="font-medium">
                                  {t("maintenance.notesLabel")}:
                                </span>{" "}
                                {asset.maintenance_completion_notes}
                              </p>
                            )}
                          {asset.purchase_date && (
                            <p>
                              <span className="font-medium">
                                Purchase Date:
                              </span>{" "}
                              {new Date(
                                asset.purchase_date
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MaintenanceActionMenu
                        entityType="asset"
                        item={asset}
                        onUpdated={handleAssetUpdated}
                        isVisible={canRequestMaintenance(asset)}
                      />
                      <span className="text-sm text-gray-500">
                        Rp {parseInt(asset.purchase_cost).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            {!loading && !error && filteredAssets.length === 0 && (
              <li className="px-6 py-4 text-center text-gray-500">
                {t("assets.noAssets")}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserAssets;
