import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import {
  Plus,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  DollarSign,
  Filter,
  Search,
  X,
  ChevronDown,
  Check,
  Eye,
  Truck,
  Wrench,
  RotateCcw,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../components/SkeletonLoader";
import MaintenanceActionMenu from "../components/MaintenanceActionMenu";
import {
  FormModal,
  DetailModal,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  DetailField,
  DetailGrid,
} from "../components/Modal";

// Capitalize only the first letter of the string, keep the rest as-is
const capitalizeFirst = (value) => {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trimStart();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const Requests = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    quantity: 1,
    unit_price: "",
    estimated_cost: "",
    color: "",
    location: "",
  });

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusSearchTerm, setStatusSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [statusPreselected, setStatusPreselected] = useState("all");
  const [categoryPreselected, setCategoryPreselected] = useState("all");
  const [datePreselected, setDatePreselected] = useState("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showMaintenanceFlow, setShowMaintenanceFlow] = useState(false);
  const [showNormalFlow, setShowNormalFlow] = useState(false);

  // Reset toggle state ketika modal ditutup
  useEffect(() => {
    if (!selectedRequest) {
      console.log("Resetting both flows to false");
      setShowMaintenanceFlow(false);
      setShowNormalFlow(false);
    }
  }, [selectedRequest]);

  // Reset toggle state ketika modal dibuka
  const handleViewDetail = (request) => {
    console.log("Opening detail for request:", request);
    setSelectedRequest(request);
    setShowDetail(true);

    // Set toggle state langsung berdasarkan status request
    const hasMaintenance =
      (request?.maintenance_status && request.maintenance_status !== "idle") ||
      (request?.assets &&
        request.assets.some(
          (a) => a.maintenance_status && a.maintenance_status !== "idle"
        ));

    console.log("HandleViewDetail Debug:", {
      hasMaintenance,
      requestStatus: request?.status,
      category: request?.category,
      maintenance_status: request?.maintenance_status,
      assets: request?.assets,
    });

    // Untuk request yang ditolak, selalu tampilkan request flow
    if (request?.status === "rejected") {
      console.log("Request is rejected, setting normal flow to true");
      setShowNormalFlow(true);
      setShowMaintenanceFlow(false);
    } else if (hasMaintenance) {
      console.log("Setting maintenance flow to true immediately");
      setShowMaintenanceFlow(true);
      setShowNormalFlow(false);
    } else {
      console.log(
        "Setting normal flow to true immediately for status:",
        request?.status
      );
      setShowNormalFlow(true);
      setShowMaintenanceFlow(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "procurement":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "shipping":
        return <Truck className="h-4 w-4 text-blue-600" />;
      case "received":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "maintenance_pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "maintenance_in_progress":
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case "repairing":
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case "replacing":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case "repaired":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "replaced":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Unified lifecycle order to mirror admin flow
  const STATUS_FLOW = [
    "pending",
    "approved",
    "procurement",
    "shipping",
    "received",
    "maintenance_pending",
    "repairing",
    "replacing",
    "repaired",
    "replaced",
  ];

  // Derive user-visible stage from related asset statuses - sync with Procurement
  const deriveStage = (request) => {
    const assets = Array.isArray(request?.assets) ? request.assets : [];
    const has = (s) => assets.some((a) => a.status === s);
    const hasMaintenance = (status) =>
      assets.some((a) => a.maintenance_status === status);

    // Check maintenance status first - priority over normal status
    if (hasMaintenance("in_progress")) {
      return "maintenance_in_progress";
    }

    if (hasMaintenance("completed")) {
      const maintenanceAsset = assets.find(
        (a) => a.maintenance_status === "completed"
      );
      const maintenanceType = maintenanceAsset?.maintenance_type || "repair";
      return maintenanceType === "repair" ? "repaired" : "replaced";
    }

    if (hasMaintenance("maintenance_pending")) {
      return "maintenance_pending";
    }

    // Normal status flow - check assets first, then fallback to request status
    if (has("received")) return "received";
    if (has("shipping")) return "shipping";
    if (has("procurement")) return "procurement";
    if (has("repairing")) return "repairing";
    if (has("replacing")) return "replacing";

    // Fallback to request status - this is important for rejected status
    return request.status; // pending/approved/rejected fallback
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "procurement":
        return "bg-blue-100 text-blue-800";
      case "shipping":
        return "bg-blue-100 text-blue-800";
      case "received":
        return "bg-emerald-100 text-emerald-700";
      case "repairing":
        return "bg-orange-100 text-orange-800";
      case "replacing":
        return "bg-blue-100 text-blue-800";
      case "repaired":
        return "bg-green-100 text-green-800";
      case "replaced":
        return "bg-green-100 text-green-800";
      case "maintenance_pending":
        return "bg-yellow-100 text-yellow-800";
      case "maintenance_in_progress":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "OB Equipment":
        return "bg-blue-100 text-blue-800";
      case "Driver Equipment":
        return "bg-purple-100 text-purple-800";
      case "Security Equipment":
        return "bg-green-100 text-green-800";
      case "Other":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMaintenanceStatusLabel = (request) => {
    const status = request?.maintenance_status;
    if (!status) return t("maintenance.dropdown");
    if (status === "maintenance_pending") {
      return t("maintenance.status.pendingApproval");
    }
    if (status === "in_progress") {
      return t("maintenance.status.inProgress");
    }
    if (status === "completed") {
      if (request?.maintenance_type === "repair") {
        return t("maintenance.status.completedRepair");
      }
      if (request?.maintenance_type === "replacement") {
        return t("maintenance.status.completedReplacement");
      }
      return t("maintenance.status.completedRepair");
    }
    return t("maintenance.dropdown");
  };

  const getMaintenanceTypeLabel = (type) => {
    if (type === "repair") return t("maintenance.types.repair");
    if (type === "replacement") return t("maintenance.types.replacement");
    return t("maintenance.dropdown");
  };

  const canRequestMaintenance = (request) => {
    if (!request) return false;
    if (
      request.maintenance_status === "in_progress" ||
      request.maintenance_status === "completed"
    ) {
      return false;
    }
    const assets = Array.isArray(request.assets) ? request.assets : [];
    if (assets.length === 0) return false;
    const stage = deriveStage(request);
    return stage === "received" || request.status === "completed";
  };

  // removed unused formatStatus helper

  const formatStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return t("common.status.pendingRequest");
      case "approved":
        return t("common.status.approved");
      case "rejected":
        return t("common.status.rejected");
      case "procurement":
        return t("common.status.inProcurement");
      case "shipping":
        return t("common.status.shipping");
      case "received":
        return t("common.status.received");
      case "not_received":
        return t("common.status.notReceived");
      case "repairing":
        return t("common.statusMap.repairing", { defaultValue: "Repairing" });
      case "replacing":
        return t("common.statusMap.replacing", { defaultValue: "Replacing" });
      case "repaired":
        return t("maintenance.status.completedRepair");
      case "replaced":
        return t("maintenance.status.completedReplacement");
      case "maintenance_pending":
        return t("maintenance.status.pendingApproval");
      case "maintenance_in_progress":
        return t("maintenance.status.inProgress");
      case "in_progress":
        return t("maintenance.status.inProgress");
      case "completed":
        return t("common.status.completed");
      default:
        return t(`common.statusMap.${status}`, {
          defaultValue: status.charAt(0).toUpperCase() + status.slice(1),
        });
    }
  };

  const formatCategoryLabel = (category) => {
    switch (category) {
      case "OB Equipment":
        return t("requests.categories.obEquipment");
      case "Driver Equipment":
        return t("requests.categories.driverEquipment");
      case "Security Equipment":
        return t("requests.categories.securityEquipment");
      case "Maintenance":
        return t("requests.categories.maintenance");
      case "Other":
        return t("requests.categories.other");
      default:
        return category || t("requests.general", { defaultValue: "General" });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
    setStatusSearchTerm("");
    setCategorySearchTerm("");
    setStatusPreselected("all");
    setCategoryPreselected("all");
    setDatePreselected("all");
    setShowStatusDropdown(false);
    setShowCategoryDropdown(false);
    setShowDateDropdown(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    return count;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-dropdown]")) {
        setShowStatusDropdown(false);
        setShowCategoryDropdown(false);
        setShowDateDropdown(false);
        setStatusSearchTerm("");
        setCategorySearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (submitLoading) return;

    // Validation for required fields
    if (!formData.title || formData.title.trim() === "") {
      alert(t("requests.validation.titleRequired", { defaultValue: "Judul permintaan wajib diisi" }));
      return;
    }

    if (!formData.category || formData.category === "") {
      alert(t("requests.validation.categoryRequired", { defaultValue: "Kategori wajib diisi" }));
      return;
    }

    if (
      !formData.quantity ||
      formData.quantity === "" ||
      parseInt(formData.quantity) < 1
    ) {
      alert(t("requests.validation.quantityRequired", { defaultValue: "Kuantitas wajib diisi (minimal 1)" }));
      return;
    }

    if (
      !formData.unit_price ||
      formData.unit_price === "" ||
      parseFloat(formData.unit_price.replace(/\./g, "")) <= 0
    ) {
      alert(t("requests.validation.unitPriceRequired", { defaultValue: "Harga satuan wajib diisi" }));
      return;
    }

    if (!formData.location || formData.location === "") {
      alert(t("requests.validation.locationRequired", { defaultValue: "Lokasi wajib diisi" }));
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        item_name: capitalizeFirst(formData.title),
        quantity: formData.quantity,
        reason: capitalizeFirst(formData.description),
        estimated_cost: formData.estimated_cost
          ? parseFloat(String(formData.estimated_cost).replace(/\./g, ""))
          : null,
        category: formData.category,
        color: formData.color || null,
        location: formData.location,
      };
      if (editingRequest) {
        await api.patch(`/requests/${editingRequest.id}`, payload);
      } else {
        await api.post("/requests", payload);
      }
      const res = await api.get("/requests/mine");
      setRequests(res.data || []);
      setFormData({
        title: "",
        description: "",
        category: "",
        quantity: 1,
        unit_price: "",
        estimated_cost: "",
        color: "",
        location: "",
      });
      setShowModal(false);
      setEditingRequest(null);
    } catch (e) {
      alert(e?.response?.data?.message || t("requests.saveFailed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    
    // Calculate unit_price from estimated_cost and quantity if available
    const qty = request.quantity || 1;
    const totalCost = request.estimated_cost ? parseFloat(request.estimated_cost) : 0;
    const unitPrice = qty > 0 ? totalCost / qty : 0;
    
    setFormData({
      title: request.item_name || "",
      description: request.reason || "",
      category: request.category || "",
      quantity: qty,
      unit_price: unitPrice > 0 ? String(unitPrice) : "",
      estimated_cost: request.estimated_cost
        ? String(request.estimated_cost)
        : "",
      color: request.color || "",
      location: request.location || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("requests.deleteConfirm"))) return;
    try {
      await api.delete(`/requests/${id}`);
      const res = await api.get("/requests/mine");
      setRequests(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("requests.deleteFailed"));
    }
  };

  const handleMaintenanceUpdated = (updatedRequest) => {
    if (!updatedRequest) return;
    setRequests((prev) =>
      Array.isArray(prev)
        ? prev.map((req) =>
            req.id === updatedRequest.id ? updatedRequest : req
          )
        : prev
    );
    setSelectedRequest((prev) =>
      prev?.id === updatedRequest.id ? updatedRequest : prev
    );
  };
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        console.log("Loading requests for user:", user);
        const res = await api.get("/requests/mine");
        console.log("Requests response:", res.data);
        if (!cancelled) setRequests(res.data || []);
      } catch (e) {
        console.error("Error loading requests:", e);
        if (!cancelled)
          setError(e?.response?.data?.message || t("requests.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
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

  const filteredRequests = requests.filter((request) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        request.item_name?.toLowerCase().includes(searchLower) ||
        request.reason?.toLowerCase().includes(searchLower) ||
        request.category?.toLowerCase().includes(searchLower) ||
        format(new Date(request.created_at), "MMM dd, yyyy")
          .toLowerCase()
          .includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter - include maintenance status
    if (statusFilter !== "all") {
      const derivedStatus = deriveStage(request);
      if (derivedStatus !== statusFilter) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== "all" && request.category !== categoryFilter) {
      return false;
    }

    // Date filter
    if (dateFilter && dateFilter !== "all") {
      const requestDate = new Date(request.created_at);
      const today = new Date();

      if (dateFilter === "today") {
        if (requestDate.toDateString() !== today.toDateString()) {
          return false;
        }
      } else if (dateFilter === "this_week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (requestDate < weekAgo) {
          return false;
        }
      } else if (dateFilter === "this_month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (requestDate < monthAgo) {
          return false;
        }
      } else if (dateFilter === "this_year") {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        if (requestDate < yearAgo) {
          return false;
        }
      }
    }

    return true;
  });

  // Format number with dots instead of commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatCurrencyId = (value) => {
    if (value === null || value === undefined) return "";
    const digits = String(value).replace(/[^0-9]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Truncate description to a maximum number of words
  const truncateWords = (text, maxWords = 100) => {
    if (!text) return { text: "", truncated: false };
    const words = String(text).trim().split(/\s+/);
    if (words.length <= maxWords) {
      return { text: text, truncated: false };
    }
    const sliced = words.slice(0, maxWords).join(" ");
    return { text: sliced, truncated: true };
  };

  // Calculate stats based on derived stage to sync with list/detail
  const getFilteredStats = () => {
    const filteredData = filteredRequests;

    let pending = 0;
    let completed = 0; // received
    let inProcurement = 0; // procurement + shipping
    let rejected = 0;

    for (const r of filteredData) {
      const stage = deriveStage(r);
      if (stage === "received" || stage === "repaired" || stage === "replaced")
        completed += 1;
      else if (stage === "shipping" || stage === "procurement")
        inProcurement += 1;
      else if (stage === "pending" || stage === "approved") pending += 1;
      else if (stage === "rejected") rejected += 1;
    }

    const totalValue = filteredData
      .filter((r) => r.status !== "rejected")
      .reduce((sum, req) => sum + (Number(req.estimated_cost) || 0), 0);

    return { pending, completed, inProcurement, rejected, totalValue };
  };

  const stats = getFilteredStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t("requests.myRequests")}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {t("requests.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("requests.createNewRequest")}
        </button>
      </div>

      {/* Stats aligned with derived stages */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:gap-4">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            {/* Pending */}
            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5 flex flex-col items-center text-center gap-2">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {t("requests.pending")}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.pending}
                  </div>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5 flex flex-col items-center text-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {t("requests.completed")}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.completed}
                  </div>
                </div>
              </div>
            </div>

            {/* In Procurement */}
            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5 flex flex-col items-center text-center gap-2">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {t("common.status.inProcurement")}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.inProcurement}
                  </div>
                </div>
              </div>
            </div>

            {/* Rejected */}
            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5 flex flex-col items-center text-center gap-2">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {t("requests.rejected")}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.rejected}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status Breakdown and Total Estimated Cost panels removed per request */}

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFilters
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Filter className="h-4 w-4" />
                {t("common.filter")}
                {(() => {
                  const activeFilters = [
                    searchTerm,
                    statusFilter !== "all" ? statusFilter : "",
                    categoryFilter !== "all" ? categoryFilter : "",
                    dateFilter !== "all" ? dateFilter : "",
                  ].filter(Boolean);
                  return activeFilters.length > 0 ? (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                      {activeFilters.length}
                    </span>
                  ) : null;
                })()}
              </button>
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                  {t("requests.clearFilters")}
                </button>
              )}
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("requests.listSummary", {
                shown: filteredRequests.length,
                total: requests.length,
              })}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("requests.searchRequests")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative" data-dropdown="status">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        statusSearchTerm ? t("todos.searchStatus") : ""
                      }
                      value={statusSearchTerm}
                      onChange={(e) => {
                        setStatusSearchTerm(e.target.value);
                        setShowStatusDropdown(true);
                      }}
                      onFocus={() => {
                        setStatusSearchTerm("");
                        setStatusPreselected(statusFilter);
                        setShowStatusDropdown(true);
                        setShowCategoryDropdown(false);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowStatusDropdown(false);
                          setStatusSearchTerm("");
                        }, 150);
                      }}
                      onKeyDown={(e) => {
                        if (showStatusDropdown) {
                          const options = [
                            { value: "all", label: t("todos.allStatus") },
                            { value: "pending", label: t("requests.pending") },
                            {
                              value: "approved",
                              label: t("requests.approved"),
                            },
                            {
                              value: "rejected",
                              label: t("requests.rejected"),
                            },
                            {
                              value: "procurement",
                              label: t("common.status.inProcurement"),
                            },
                            {
                              value: "received",
                              label: t("common.status.received"),
                            },
                            {
                              value: "not_received",
                              label: t("common.status.notReceived"),
                            },
                          ].filter((option) =>
                            option.label
                              .toLowerCase()
                              .includes(statusSearchTerm.toLowerCase())
                          );

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            const currentIndex = options.findIndex(
                              (opt) => opt.value === statusPreselected
                            );
                            const nextIndex =
                              currentIndex < options.length - 1
                                ? currentIndex + 1
                                : 0;
                            setStatusPreselected(options[nextIndex].value);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            const currentIndex = options.findIndex(
                              (opt) => opt.value === statusPreselected
                            );
                            const prevIndex =
                              currentIndex > 0
                                ? currentIndex - 1
                                : options.length - 1;
                            setStatusPreselected(options[prevIndex].value);
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            setStatusFilter(statusPreselected);
                            setShowStatusDropdown(false);
                            setStatusSearchTerm("");
                          }
                        }
                      }}
                      className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100"
                    />
                    {!statusSearchTerm && !showStatusDropdown && (
                      <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                        <span className="text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {statusFilter === "all"
                            ? t("common.allStatus")
                            : formatStatusLabel(statusFilter)}
                        </span>
                      </div>
                    )}
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          showStatusDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </div>
                  {showStatusDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out">
                      {[
                        { value: "all", label: t("common.allStatus") },
                        {
                          value: "pending",
                          label: t("common.status.pendingRequest"),
                        },
                        {
                          value: "approved",
                          label: t("common.status.approved"),
                        },
                        {
                          value: "rejected",
                          label: t("common.status.rejected"),
                        },
                        {
                          value: "procurement",
                          label: t("common.status.inProcurement"),
                        },
                        {
                          value: "received",
                          label: t("common.status.received"),
                        },
                        {
                          value: "not_received",
                          label: t("common.status.notReceived"),
                        },
                      ]
                        .filter((option) =>
                          option.label
                            .toLowerCase()
                            .includes((statusSearchTerm || "").toLowerCase())
                        )
                        .map((option) => (
                          <button
                            key={option.value}
                            data-value={option.value}
                            onClick={() => {
                              setStatusFilter(option.value);
                              setShowStatusDropdown(false);
                              setStatusSearchTerm("");
                            }}
                            className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              statusPreselected === option.value
                                ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                                : statusFilter === option.value
                                ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            <span className="block truncate">
                              {option.label}
                            </span>
                            {statusFilter === option.value && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                                <Check className="h-4 w-4 text-blue-600" />
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <div className="relative" data-dropdown="category">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        categorySearchTerm ? t("todos.allCategories") : ""
                      }
                      value={categorySearchTerm}
                      onChange={(e) => {
                        setCategorySearchTerm(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => {
                        setCategorySearchTerm("");
                        setCategoryPreselected(categoryFilter);
                        setShowCategoryDropdown(true);
                        setShowStatusDropdown(false);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowCategoryDropdown(false);
                          setCategorySearchTerm("");
                        }, 150);
                      }}
                      onKeyDown={(e) => {
                        if (showCategoryDropdown) {
                          const options = [
                            { value: "all", label: t("common.allCategories") },
                            { value: "OB Equipment", label: "OB Equipment" },
                            {
                              value: "Driver Equipment",
                              label: "Driver Equipment",
                            },
                            {
                              value: "Security Equipment",
                              label: "Security Equipment",
                            },
                            { value: "Other", label: "Other" },
                          ].filter((option) =>
                            option.label
                              .toLowerCase()
                              .includes(categorySearchTerm.toLowerCase())
                          );

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            const currentIndex = options.findIndex(
                              (opt) => opt.value === categoryPreselected
                            );
                            const nextIndex =
                              currentIndex < options.length - 1
                                ? currentIndex + 1
                                : 0;
                            setCategoryPreselected(options[nextIndex].value);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            const currentIndex = options.findIndex(
                              (opt) => opt.value === categoryPreselected
                            );
                            const prevIndex =
                              currentIndex > 0
                                ? currentIndex - 1
                                : options.length - 1;
                            setCategoryPreselected(options[prevIndex].value);
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            setCategoryFilter(categoryPreselected);
                            setShowCategoryDropdown(false);
                            setCategorySearchTerm("");
                          }
                        }
                      }}
                      className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100"
                    />
                    {!categorySearchTerm && !showCategoryDropdown && (
                      <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                        <span className="text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {categoryFilter === "all"
                            ? t("todos.allCategories")
                            : formatCategoryLabel(categoryFilter)}
                        </span>
                      </div>
                    )}
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          showCategoryDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </div>
                  {showCategoryDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out">
                      {[
                        { value: "all", label: t("common.allCategories") },
                        {
                          value: "OB Equipment",
                          label: t("requests.categories.obEquipment"),
                        },
                        {
                          value: "Driver Equipment",
                          label: t("requests.categories.driverEquipment"),
                        },
                        {
                          value: "Security Equipment",
                          label: t("requests.categories.securityEquipment"),
                        },
                        {
                          value: "Other",
                          label: t("requests.categories.other"),
                        },
                      ]
                        .filter((option) =>
                          option.label
                            .toLowerCase()
                            .includes((categorySearchTerm || "").toLowerCase())
                        )
                        .map((option) => (
                          <button
                            key={option.value}
                            data-value={option.value}
                            onClick={() => {
                              setCategoryFilter(option.value);
                              setShowCategoryDropdown(false);
                              setCategorySearchTerm("");
                            }}
                            className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              categoryPreselected === option.value
                                ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                                : categoryFilter === option.value
                                ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            <span className="block truncate">
                              {option.label}
                            </span>
                            {categoryFilter === option.value && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                                <Check className="h-4 w-4 text-blue-600" />
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Date Filter */}
                <div className="relative" data-dropdown="date">
                  <button
                    onClick={() => {
                      setDatePreselected(dateFilter);
                      setShowDateDropdown(!showDateDropdown);
                      setShowStatusDropdown(false);
                      setShowCategoryDropdown(false);
                      setStatusSearchTerm("");
                      setCategorySearchTerm("");
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowDateDropdown(false);
                      }, 100);
                    }}
                    onKeyDown={(e) => {
                      if (showDateDropdown) {
                        const options = [
                          {
                            value: "all",
                            label: t("common.dateFilter.allDates"),
                          },
                          {
                            value: "today",
                            label: t("common.dateFilter.today"),
                          },
                          {
                            value: "this_week",
                            label: t("common.dateFilter.thisWeek"),
                          },
                          {
                            value: "this_month",
                            label: t("common.dateFilter.thisMonth"),
                          },
                          {
                            value: "this_year",
                            label: t("common.dateFilter.thisYear"),
                          },
                        ];

                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const currentIndex = options.findIndex(
                            (opt) => opt.value === datePreselected
                          );
                          const nextIndex =
                            currentIndex < options.length - 1
                              ? currentIndex + 1
                              : 0;
                          setDatePreselected(options[nextIndex].value);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const currentIndex = options.findIndex(
                            (opt) => opt.value === datePreselected
                          );
                          const prevIndex =
                            currentIndex > 0
                              ? currentIndex - 1
                              : options.length - 1;
                          setDatePreselected(options[prevIndex].value);
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          setDateFilter(datePreselected);
                          setShowDateDropdown(false);
                        }
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <span>
                      {dateFilter === "all"
                        ? t("common.dateFilter.allDates")
                        : dateFilter === "today"
                        ? t("common.dateFilter.today")
                        : dateFilter === "this_week"
                        ? t("common.dateFilter.thisWeek")
                        : dateFilter === "this_month"
                        ? t("common.dateFilter.thisMonth")
                        : dateFilter === "this_year"
                        ? t("common.dateFilter.thisYear")
                        : t("common.dateFilter.allDates")}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        showDateDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showDateDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out">
                      {[
                        {
                          value: "all",
                          label: t("common.dateFilter.allDates"),
                        },
                        { value: "today", label: t("common.dateFilter.today") },
                        {
                          value: "this_week",
                          label: t("common.dateFilter.thisWeek"),
                        },
                        {
                          value: "this_month",
                          label: t("common.dateFilter.thisMonth"),
                        },
                        {
                          value: "this_year",
                          label: t("common.dateFilter.thisYear"),
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          data-value={option.value}
                          onClick={() => {
                            setDateFilter(option.value);
                            setShowDateDropdown(false);
                          }}
                          className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            datePreselected === option.value
                              ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                              : dateFilter === option.value
                              ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          <span className="block truncate">{option.label}</span>
                          {dateFilter === option.value && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                              <Check className="h-4 w-4 text-blue-600" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-sm">{t("common.noData")}</div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRequests.map((request) => {
              const maintenanceAvailable = canRequestMaintenance(request);
              return (
                <li key={request.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 lg:items-center">
                    <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                      <div className="flex-shrink-0 mt-1 sm:mt-0">
                        {getStatusIcon(deriveStage(request))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate sm:text-sm sm:font-medium">
                            {request.item_name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(() => {
                              const assets = Array.isArray(request?.assets)
                                ? request.assets
                                : [];
                              const maintenanceAsset = assets.find(
                                (a) => a.maintenance_status
                              );
                              const maintenanceStatus =
                                maintenanceAsset?.maintenance_status ||
                                request.maintenance_status;
                              const maintenanceType =
                                maintenanceAsset?.maintenance_type ||
                                request.maintenance_type;

                              if (
                                maintenanceStatus === "completed" &&
                                maintenanceType
                              ) {
                                return "bg-emerald-100 text-emerald-700";
                              }
                              return getStatusColor(deriveStage(request));
                            })()}`}
                          >
                            {(() => {
                              const assets = Array.isArray(request?.assets)
                                ? request.assets
                                : [];
                              const maintenanceAsset = assets.find(
                                (a) => a.maintenance_status
                              );
                              const maintenanceStatus =
                                maintenanceAsset?.maintenance_status ||
                                request.maintenance_status;
                              const maintenanceType =
                                maintenanceAsset?.maintenance_type ||
                                request.maintenance_type;

                              if (
                                maintenanceStatus === "completed" &&
                                maintenanceType
                              ) {
                                return maintenanceType === "repair"
                                  ? t("maintenance.status.completedRepair")
                                  : t(
                                      "maintenance.status.completedReplacement"
                                    );
                              }
                              return formatStatusLabel(deriveStage(request));
                            })()}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                              request.category
                            )}`}
                          >
                            {formatCategoryLabel(request.category || "General")}
                          </span>
                        </div>
                        {(() => {
                          const { text, truncated } = truncateWords(
                            request.reason,
                            100
                          );
                          return (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 sm:mt-1">
                              {text}
                              {truncated && (
                                <button
                                  onClick={() => {
                                    handleViewDetail(request);
                                  }}
                                  className="ml-1 text-blue-600 hover:text-blue-800 underline"
                                  title={t("common.viewFull")}
                                >
                                  ...
                                </button>
                              )}
                            </p>
                          );
                        })()}
                        {/* inline timeline removed to save space */}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 sm:mt-2 sm:text-sm">
                          <span>
                            {t("common.quantity")}: {request.quantity}
                          </span>
                          <span>
                            {t("requests.totalAmount")}: Rp{" "}
                            {formatNumber(Number(request.estimated_cost) || 0)}
                          </span>
                          <span>
                            {t("common.createdAt")}:{" "}
                            {format(
                              new Date(request.created_at),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        </div>
                        {(() => {
                          const assets = Array.isArray(request?.assets)
                            ? request.assets
                            : [];
                          const maintenanceAsset = assets.find(
                            (a) => a.maintenance_status
                          );
                          const maintenanceStatus =
                            maintenanceAsset?.maintenance_status ||
                            request.maintenance_status;
                          const maintenanceType =
                            maintenanceAsset?.maintenance_type ||
                            request.maintenance_type;

                          if (
                            maintenanceStatus === "in_progress" &&
                            maintenanceType
                          ) {
                            return (
                              <div className="mt-2">
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                                  {maintenanceType === "repair"
                                    ? t("maintenance.types.repair")
                                    : t("maintenance.types.replacement")}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {request.admin_notes && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-300">
                            <strong>Admin Note:</strong> {request.admin_notes}
                          </div>
                        )}
                        {request.procurement_notes && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs text-green-800 dark:text-green-300">
                            <strong>Procurement Note:</strong>{" "}
                            {request.procurement_notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex w-full items-center justify-end gap-3 self-end border-t border-gray-100 pt-3 dark:border-gray-700 sm:mt-0 sm:w-auto sm:self-auto sm:border-none sm:pt-0">
                      {maintenanceAvailable && (
                        <MaintenanceActionMenu
                          entityType="request"
                          item={request}
                          onUpdated={handleMaintenanceUpdated}
                          className="inline-block"
                        />
                      )}
                      <button
                        onClick={() => {
                          handleViewDetail(request);
                        }}
                        className="inline-flex items-center justify-center rounded-full p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:p-1 sm:hover:bg-transparent sm:focus:ring-offset-0"
                        title={t("common.view")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {request.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleEdit(request)}
                            className="inline-flex items-center justify-center rounded-full p-2 text-accent-600 hover:bg-gray-100 hover:text-accent-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:p-1 sm:hover:bg-transparent sm:focus:ring-offset-0"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(request.id)}
                            className="inline-flex items-center justify-center rounded-full p-2 text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:p-1 sm:hover:bg-transparent sm:focus:ring-offset-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRequest(null);
          setFormData({
            title: "",
            description: "",
            category: "",
            quantity: 1,
            unit_price: "",
            estimated_cost: "",
            color: "",
            location: "",
          });
        }}
        title={
          editingRequest
            ? t("requests.editRequest")
            : t("requests.createNewRequest")
        }
        onSubmit={handleSubmit}
        submitText={editingRequest ? t("common.update") : t("common.submit")}
        isLoading={submitLoading}
        size="md"
      >
        <FormField label={t("requests.requestTitle")} required>
          <FormInput
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder={t("requests.requestTitle")}
          />
        </FormField>

        <FormField label={t("requests.notes")}>
          <FormTextarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            placeholder={t("requests.notes")}
          />
        </FormField>

        <FormField label={t("common.category")} required>
          <FormSelect
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            options={[
              {
                value: "OB Equipment",
                label: t("requests.categories.obEquipment"),
              },
              {
                value: "Driver Equipment",
                label: t("requests.categories.driverEquipment"),
              },
              {
                value: "Security Equipment",
                label: t("requests.categories.securityEquipment"),
              },
              { value: "Other", label: t("requests.categories.other") },
            ]}
            placeholder={t("todos.allCategories")}
          />
        </FormField>

        <DetailGrid cols={2}>
          <FormField label={t("common.color")}>
            <FormSelect
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              options={[
                { value: "", label: t("assets.selectColor", { defaultValue: "Pilih Warna" }) },
                { value: "merah", label: t("assets.colors.merah", { defaultValue: "Merah" }) },
                { value: "biru", label: t("assets.colors.biru", { defaultValue: "Biru" }) },
                { value: "hijau", label: t("assets.colors.hijau", { defaultValue: "Hijau" }) },
                { value: "kuning", label: t("assets.colors.kuning", { defaultValue: "Kuning" }) },
                { value: "hitam", label: t("assets.colors.hitam", { defaultValue: "Hitam" }) },
                { value: "putih", label: t("assets.colors.putih", { defaultValue: "Putih" }) },
                { value: "abu-abu", label: t("assets.colors.abu_abu", { defaultValue: "Abu-abu" }) },
                { value: "coklat", label: t("assets.colors.coklat", { defaultValue: "Coklat" }) },
                { value: "orange", label: t("assets.colors.orange", { defaultValue: "Orange" }) },
                { value: "ungu", label: t("assets.colors.ungu", { defaultValue: "Ungu" }) },
                { value: "pink", label: t("assets.colors.pink", { defaultValue: "Pink" }) },
                { value: "emas", label: t("assets.colors.emas", { defaultValue: "Emas" }) },
                { value: "perak", label: t("assets.colors.perak", { defaultValue: "Perak" }) },
                { value: "bronze", label: t("assets.colors.bronze", { defaultValue: "Bronze" }) },
                { value: "navy", label: t("assets.colors.navy", { defaultValue: "Navy" }) },
                { value: "tosca", label: t("assets.colors.tosca", { defaultValue: "Tosca" }) },
                { value: "lavender", label: t("assets.colors.lavender", { defaultValue: "Lavender" }) },
                { value: "maroon", label: t("assets.colors.maroon", { defaultValue: "Maroon" }) },
                { value: "krem", label: t("assets.colors.krem", { defaultValue: "Krem" }) },
                { value: "lainnya", label: t("assets.colors.other", { defaultValue: "Lainnya" }) },
              ]}
              placeholder={t("assets.selectColor", { defaultValue: "Pilih Warna" })}
            />
          </FormField>

          <FormField label={t("common.location")} required>
            <FormSelect
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              options={[
                { value: "", label: t("assets.selectAllocation", { defaultValue: "Pilih Lokasi" }) },
                { value: "Cikunir 08", label: "Cikunir 08" },
                { value: "Cikunir 689", label: "Cikunir 689" },
                { value: "Cikunir 04", label: "Cikunir 04" },
                { value: "Cikunir 71", label: "Cikunir 71" },
                { value: "Cikunir 10A", label: "Cikunir 10A" },
                { value: "TTM", label: "TTM" },
                { value: "Sauciko", label: "Sauciko" },
                { value: "Tebet 31", label: "Tebet 31" },
                { value: "Tebet 08", label: "Tebet 08" },
                { value: "Rumah Valortek", label: "Rumah Valortek" },
              ]}
              placeholder={t("assets.selectAllocation", { defaultValue: "Pilih Lokasi" })}
            />
          </FormField>
        </DetailGrid>

        <DetailGrid cols={2}>
          <FormField label={t("common.quantity")} required>
            <FormInput
              type="text"
              inputMode="numeric"
              value={formData.quantity}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Allow empty input for clearing
                if (inputValue === "") {
                  setFormData({
                    ...formData,
                    quantity: "",
                    estimated_cost: "0",
                  });
                  return;
                }
                // Only allow numbers
                const numericValue = inputValue.replace(/[^0-9]/g, "");
                if (numericValue === "") {
                  setFormData({
                    ...formData,
                    quantity: "",
                    estimated_cost: "0",
                  });
                  return;
                }
                const newQuantity = parseInt(numericValue) || 1;
                const unitPrice =
                  parseFloat(formData.unit_price.replace(/\./g, "")) || 0;
                const newTotal = newQuantity * unitPrice;
                setFormData({
                  ...formData,
                  quantity: newQuantity.toString(),
                  estimated_cost: newTotal.toString(),
                });
              }}
              onBlur={() => {
                // Ensure minimum value of 1 when field loses focus
                if (
                  !formData.quantity ||
                  formData.quantity === "" ||
                  parseInt(formData.quantity) < 1
                ) {
                  const unitPrice =
                    parseFloat(formData.unit_price.replace(/\./g, "")) || 0;
                  const newTotal = 1 * unitPrice;
                  setFormData({
                    ...formData,
                    quantity: "1",
                    estimated_cost: newTotal.toString(),
                  });
                }
              }}
              placeholder="1"
            />
          </FormField>

          <FormField
            label={t("requests.estimatedUnitPrice", {
              defaultValue: "Perkiraan Harga Satuan",
            })}
            required
          >
            <FormInput
              type="text"
              inputMode="numeric"
              value={`Rp ${formatCurrencyId(formData.unit_price)}`}
              onChange={(e) => {
                const newUnitPrice = String(e.target.value).replace(
                  /Rp\s*|\./g,
                  ""
                );
                const quantity = formData.quantity || 1;
                const newTotal = parseFloat(newUnitPrice) * quantity;
                setFormData({
                  ...formData,
                  unit_price: newUnitPrice,
                  estimated_cost: newTotal.toString(),
                });
              }}
              placeholder="Rp 0"
            />
          </FormField>
        </DetailGrid>

        <FormField
          label={t("requests.estimatedTotalPrice", {
            defaultValue: "Perkiraan Total Harga",
          })}
        >
          <FormInput
            type="text"
            value={`Rp ${formatCurrencyId(formData.estimated_cost)}`}
            placeholder="Rp 0"
            readOnly
            className="bg-gray-50 select-text"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("requests.autoCalculated", { defaultValue: "Dihitung otomatis dari Kuantitas × Harga Satuan" })}
          </p>
        </FormField>
      </FormModal>

      {/* Detail Modal with timeline */}
      {showDetail && selectedRequest && (
        <DetailModal
          isOpen={showDetail}
          onClose={() => {
            setShowDetail(false);
            setSelectedRequest(null);
          }}
          title={t("requests.requestDetails")}
          size="md"
        >
          <div className="space-y-6">
            {/* Request Flow - untuk SEMUA items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("requests.requestFlow")}
                </h3>
                <button
                  onClick={() => setShowNormalFlow(!showNormalFlow)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showNormalFlow ? (
                    <>
                      <span>{t("common.hide")}</span>
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>{t("common.show")}</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

              {(() => {
                const hasMaintenance =
                  (selectedRequest?.maintenance_status &&
                    selectedRequest.maintenance_status !== "idle") ||
                  (selectedRequest?.assets &&
                    selectedRequest.assets.some(
                      (a) =>
                        a.maintenance_status && a.maintenance_status !== "idle"
                    ));

                // Debug: log untuk debugging
                console.log("Request Flow Debug:", {
                  hasMaintenance,
                  showNormalFlow,
                  requestStatus: selectedRequest?.status,
                  category: selectedRequest?.category,
                  selectedRequest: selectedRequest,
                });

                // Tampilkan request flow jika showNormalFlow true
                const shouldShow = showNormalFlow;
                console.log("Request Flow shouldShow:", shouldShow);

                // Debug tambahan untuk melihat state
                console.log("State Debug:", {
                  showNormalFlow,
                  showMaintenanceFlow,
                  selectedRequestId: selectedRequest?.id,
                });

                return (
                  shouldShow && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {(() => {
                        const currentStage = deriveStage(selectedRequest);

                        // Debug: log status untuk debugging
                        console.log("Request Flow Stage Debug:", {
                          currentStage,
                          requestStatus: selectedRequest.status,
                          assets: selectedRequest.assets,
                          hasAssets: selectedRequest.assets?.length > 0,
                        });

                        // Tampilkan tahapan berdasarkan status request yang sebenarnya
                        let normalStatuses = [];

                        // Flow request hanya muncul lengkap setelah di-approve
                        // Jika ditolak, berhenti di rejected
                        if (selectedRequest.status === "rejected") {
                          // Jika ditolak, tampilkan flow yang berakhir di "rejected"
                          normalStatuses = ["pending", "rejected"];
                        } else if (selectedRequest.status === "pending") {
                          // Jika masih pending, hanya tampilkan pending
                          normalStatuses = ["pending"];
                        } else {
                          // Jika sudah approved atau lebih, tampilkan flow lengkap
                          normalStatuses = [
                            "pending",
                            "approved",
                            "procurement",
                            "shipping",
                            "received",
                          ];
                        }

                        return normalStatuses.map((s, i) => {
                          // Flow request tidak terpengaruh oleh maintenance
                          // Maintenance adalah flow terpisah
                          const isActive = s === currentStage;
                          return (
                            <div key={s} className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full border ${
                                  isActive
                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                    : "bg-gray-50 border-gray-200 text-gray-400"
                                }`}
                              >
                                {formatStatusLabel(s)}
                              </span>
                              {i < normalStatuses.length - 1 && (
                                <span className="text-gray-300">→</span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )
                );
              })()}
            </div>

            <DetailGrid cols={2}>
              <DetailField
                label={t("common.category")}
                value={selectedRequest.category || t("requests.general")}
              />
              <DetailField
                label={t("common.quantity")}
                value={String(selectedRequest.quantity)}
              />
              <DetailField
                label={`${t("requests.totalAmount")} (Rp)`}
                value={`Rp ${formatNumber(
                  Number(selectedRequest.estimated_cost) || 0
                )}`}
              />
              <DetailField
                label={t("user.created") || "Created"}
                value={format(
                  new Date(selectedRequest.created_at),
                  "MMM dd, yyyy"
                )}
              />
            </DetailGrid>

            {selectedRequest.reason && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t("requests.notes")}
                </h4>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedRequest.reason}
                </p>
              </div>
            )}

            {/* Maintenance Details - Hanya muncul jika sudah ada maintenance request */}
            {((selectedRequest?.maintenance_status &&
              selectedRequest.maintenance_status !== "idle" &&
              selectedRequest.maintenance_status !== "none" &&
              selectedRequest.maintenance_status !== "not_requested") ||
              (selectedRequest?.assets &&
                selectedRequest.assets.some(
                  (a) =>
                    a.maintenance_status &&
                    a.maintenance_status !== "idle" &&
                    a.maintenance_status !== "none" &&
                    a.maintenance_status !== "not_requested"
                ))) && (
              <div className="border-t border-gray-100 pt-6 mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  {t("maintenance.sectionTitle")}
                </h4>
                <DetailGrid cols={2}>
                  {selectedRequest.maintenance_status && (
                    <DetailField
                      label={t("maintenance.statusLabel")}
                      value={getMaintenanceStatusLabel(selectedRequest)}
                    />
                  )}
                  {selectedRequest.maintenance_type && (
                    <DetailField
                      label={t("maintenance.typeLabel")}
                      value={getMaintenanceTypeLabel(
                        selectedRequest.maintenance_type
                      )}
                    />
                  )}
                  {selectedRequest.maintenance_requested_at && (
                    <DetailField
                      label={t("maintenance.requestedAt", {
                        defaultValue: "Requested At",
                      })}
                      value={format(
                        new Date(selectedRequest.maintenance_requested_at),
                        "MMM dd, yyyy"
                      )}
                    />
                  )}
                  {selectedRequest.maintenance_completed_at && (
                    <DetailField
                      label={t("maintenance.completedAt", {
                        defaultValue: "Completed At",
                      })}
                      value={format(
                        new Date(selectedRequest.maintenance_completed_at),
                        "MMM dd, yyyy"
                      )}
                    />
                  )}
                </DetailGrid>
                {selectedRequest.maintenance_reason && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("maintenance.notes.userReason")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedRequest.maintenance_reason}
                    </p>
                  </div>
                )}
                {selectedRequest.maintenance_completion_notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                      {t("maintenance.notes.completionNotes")}
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {selectedRequest.maintenance_completion_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Flow - hanya muncul setelah di-approve GA */}
            {selectedRequest?.status !== "rejected" &&
              (selectedRequest?.maintenance_status === "maintenance_pending" ||
                selectedRequest?.maintenance_status === "approved" ||
                selectedRequest?.maintenance_status === "procurement" ||
                selectedRequest?.maintenance_status === "in_progress" ||
                selectedRequest?.maintenance_status === "completed" ||
                (selectedRequest?.assets &&
                  selectedRequest.assets.some(
                    (a) =>
                      a.maintenance_status &&
                      a.maintenance_status !== "idle" &&
                      a.maintenance_status !== "none" &&
                      a.maintenance_status !== "not_requested"
                  ))) && (
                <div className="space-y-3 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("requests.maintenanceFlow")}
                    </h3>
                    <button
                      onClick={() =>
                        setShowMaintenanceFlow(!showMaintenanceFlow)
                      }
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showMaintenanceFlow ? (
                        <>
                          <span>{t("common.hide")}</span>
                          <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <span>{t("common.show")}</span>
                          <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>

                  {(() => {
                    const hasMaintenance =
                      selectedRequest?.maintenance_status ||
                      (selectedRequest?.assets &&
                        selectedRequest.assets.some(
                          (a) => a.maintenance_status
                        ));

                    // Debug: log untuk debugging
                    console.log("Maintenance Flow Debug:", {
                      hasMaintenance,
                      showMaintenanceFlow,
                      requestStatus: selectedRequest?.status,
                      category: selectedRequest?.category,
                    });

                    // Tampilkan maintenance flow jika showMaintenanceFlow true
                    const shouldShow = showMaintenanceFlow;

                    return (
                      shouldShow && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {(() => {
                            const assets = Array.isArray(
                              selectedRequest?.assets
                            )
                              ? selectedRequest.assets
                              : [];
                            const maintenanceAsset = assets.find(
                              (a) => a.maintenance_status
                            );
                            const maintenanceStatus =
                              maintenanceAsset?.maintenance_status ||
                              selectedRequest.maintenance_status;
                            const maintenanceType =
                              maintenanceAsset?.maintenance_type ||
                              selectedRequest.maintenance_type;

                            // Debug: log status untuk debugging
                            console.log(
                              "Maintenance Status:",
                              maintenanceStatus
                            );
                            console.log("Maintenance Type:", maintenanceType);
                            console.log("Selected Request:", selectedRequest);

                            // Tampilkan tahapan berdasarkan status maintenance yang sebenarnya
                            let maintenanceStatuses = [];

                            // Maintenance Flow - tampilkan flow lengkap setelah di-approve
                            if (
                              !maintenanceStatus ||
                              maintenanceStatus === "pending" ||
                              maintenanceStatus === "maintenance_pending"
                            ) {
                              // Jika belum ada maintenance status atau masih pending
                              maintenanceStatuses = ["pending"];
                            } else {
                              // Jika sudah approved atau lebih, tampilkan flow lengkap
                              maintenanceStatuses = [
                                "pending",
                                "approved",
                                "procurement",
                                "in_progress",
                                "completed",
                              ];
                            }

                            return maintenanceStatuses.map((s, i) => {
                              // Cek apakah status ini aktif berdasarkan maintenance status yang sebenarnya
                              let isActive = false;

                              // Debug: log untuk setiap status
                              console.log(
                                `Checking status: ${s}, maintenanceStatus: ${maintenanceStatus}, isActive: ${
                                  s === maintenanceStatus
                                }`
                              );

                              // Tentukan status aktif berdasarkan maintenance status
                              if (
                                maintenanceStatus === "maintenance_pending" ||
                                maintenanceStatus === "pending"
                              ) {
                                isActive = s === "pending";
                              } else if (maintenanceStatus === "approved") {
                                isActive = s === "approved";
                              } else if (maintenanceStatus === "procurement") {
                                isActive = s === "procurement";
                              } else if (maintenanceStatus === "in_progress") {
                                isActive = s === "in_progress";
                              } else if (maintenanceStatus === "completed") {
                                isActive = s === "completed";
                              } else {
                                // Default: highlight pending jika tidak ada status
                                isActive = s === "pending";
                              }
                              return (
                                <div
                                  key={s}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className={`px-2 py-0.5 rounded-full border ${
                                      isActive
                                        ? "bg-orange-50 border-orange-200 text-orange-700"
                                        : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                  >
                                    {s === "pending"
                                      ? t("maintenance.status.pendingApproval")
                                      : s === "procurement"
                                      ? t("maintenance.status.pending")
                                      : formatStatusLabel(s)}
                                  </span>
                                  {i < maintenanceStatuses.length - 1 && (
                                    <span className="text-gray-300">→</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )
                    );
                  })()}
                </div>
              )}
          </div>
        </DetailModal>
      )}
    </div>
  );
};

export default Requests;
