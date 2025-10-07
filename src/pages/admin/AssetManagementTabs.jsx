import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import {
  FormModal,
  DetailModal,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  DetailField,
  DetailGrid,
} from "../../components/Modal";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  Wrench,
  RotateCcw,
  ChevronDown,
  Save,
  ShoppingCart,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../../components/SkeletonLoader";
import { createPortal } from "react-dom";
import MaintenanceActionMenu from "../../components/MaintenanceActionMenu";

const AssetManagementTabs = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [statusSearchTerm, setStatusSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [statusPreselected, setStatusPreselected] = useState("all");
  const [categoryPreselected, setCategoryPreselected] = useState("all");
  const statusDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showProcActionModal, setShowProcActionModal] = useState(false);
  const [procAsset, setProcAsset] = useState(null);
  const [openActionForId, setOpenActionForId] = useState(null);
  const [actionMenuDirection, setActionMenuDirection] = useState("down");
  const [procForm, setProcForm] = useState({
    name: "",
    purchase_type: "",
    purchase_link: "",
    purchase_app: "",
    store_name: "",
    store_location: "",
    purchase_date: "",
    amount: "",
    notes: "",
  });
  // Maintenance completion modal (admin/procurement)
  const [maintCompleteTarget, setMaintCompleteTarget] = useState(null);
  const [showMaintCompleteModal, setShowMaintCompleteModal] = useState(false);
  const [maintCompletionNotes, setMaintCompletionNotes] = useState("");
  const [maintCompletionError, setMaintCompletionError] = useState("");
  const [maintCompletionLoading, setMaintCompletionLoading] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    color: "",
    location: "",
    status: "not_received",
    supplier: "",
    purchase_cost: "",
    purchase_date: "",
    quantity: 1,
    notes: "",
  });

  const handleMaintenanceUpdate = (updatedAsset) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === updatedAsset.id ? { ...asset, ...updatedAsset } : asset
      )
    );
  };

  const handleStartMaintenance = async (asset) => {
    try {
      const res = await api.post(`/assets/${asset.id}/maintenance/start`);
      if (res.data?.asset) {
        const updated = res.data.asset;
        setAssets((prev) =>
          prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
        );
        alert(res.data?.message || t("maintenance.startSuccess"));
      }
    } catch (err) {
      alert(err?.response?.data?.message || t("maintenance.startError"));
    }
  };

  const canRequestMaintenance = (asset) => {
    if (!asset) return false;
    if (asset.maintenance_status === "in_progress") return false;
    // Allow maintenance for assets that need repair or replacement
    if (
      asset.status === "needs_repair" ||
      asset.status === "needs_replacement"
    ) {
      return true;
    }
    if (asset.request) {
      return asset.request.status === "completed";
    }
    return true;
  };

  const shouldShowMaintenanceMenu = (asset) => {
    if (!asset) return false;
    if (!user?.role || !["admin_ga", "ga"].includes(user.role)) return false;
    return canRequestMaintenance(asset);
  };

  // Lock body scroll when any modal is open to ensure backdrop fully covers viewport
  useEffect(() => {
    const anyOpen = showModal || showDetailModal;
    if (anyOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [showModal, showDetailModal, showProcActionModal]);

  // Close action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (
        !target.closest ||
        !target.closest('[data-dropdown="asset-actions"]')
      ) {
        if (openActionForId !== null) setOpenActionForId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openActionForId]);

  // Load assets on mount (admin and procurement can read)
  useEffect(() => {
    if (!user || (user.role !== "admin_ga" && user.role !== "procurement")) {
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const assetsRes = await api.get("/assets");
        if (!cancelled) {
          setAssets(assetsRes.data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || t("errors.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  const isProcurementRelevant = (asset) => {
    if (!asset) return false;
    // Exclude completed maintenance items from procurement
    if (asset.maintenance_status === "completed") return false;
    return (
      asset.status === "shipping" ||
      asset.status === "procurement" ||
      asset.status === "repairing" ||
      asset.status === "replacing" ||
      asset.status === "needs_repair" ||
      asset.status === "needs_replacement" ||
      asset.maintenance_status === "pending" ||
      asset.maintenance_status === "in_progress"
    );
  };

  // Filter assets based on active tab
  const getFilteredAssets = () => {
    let filtered = assets;

    // Filter by tab
    if (activeTab === "requested") {
      filtered = filtered.filter((asset) => !!asset.request_items_id);
    } else if (activeTab === "addition") {
      filtered = filtered.filter((asset) => !asset.request_items_id);
    } else if (activeTab === "procurement") {
      filtered = filtered.filter((asset) => isProcurementRelevant(asset));
    }

    // Apply other filters
    return filtered.filter((asset) => {
      const matchesSearch =
        (asset.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.asset_code || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (asset.category || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (asset.color || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.location || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (asset.supplier || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || asset.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || asset.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  };

  // Get stats for current tab
  const getTabStats = () => {
    let filtered = assets;

    if (activeTab === "requested") {
      filtered = filtered.filter((asset) => !!asset.request_items_id);
    } else if (activeTab === "addition") {
      filtered = filtered.filter((asset) => !asset.request_items_id);
    } else if (activeTab === "procurement") {
      filtered = filtered.filter((asset) => isProcurementRelevant(asset));
    }

    const total = filtered.length;
    const received = filtered.filter(
      (asset) => asset.status === "received"
    ).length;
    const notReceived = filtered.filter(
      (asset) => asset.status === "not_received"
    ).length;
    const needsRepair = filtered.filter(
      (asset) => asset.status === "needs_repair"
    ).length;
    const needsReplacement = filtered.filter(
      (asset) => asset.status === "needs_replacement"
    ).length;
    const repairing = filtered.filter(
      (asset) => asset.status === "repairing"
    ).length;
    const replacing = filtered.filter(
      (asset) => asset.status === "replacing"
    ).length;

    return {
      total,
      received,
      notReceived,
      needsRepair,
      needsReplacement,
      repairing,
      replacing,
    };
  };

  const statsGridClass =
    activeTab === "all" || activeTab === "addition"
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4"
      : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-4";

  const formatStatusLabel = (status) => {
    if (status === "all") return t("todos.allStatus");
    const map = {
      procurement: t("common.status.inProcurement"),
      shipping: t("assets.status.shipping", { defaultValue: "Shipping" }),
      not_received: t("common.status.notReceived"),
      received: t("common.status.received"),
      needs_repair: t("common.status.needsRepair"),
      needs_replacement: t("common.status.needsReplacement"),
      repairing: t("common.status.repairing"),
      replacing: t("common.status.replacing"),
    };
    return map[status] || status;
  };

  const formatMethodLabel = (asset) => {
    // Derive label from linkage: has request_items_id => Requested; otherwise Addition
    return asset?.request_items_id
      ? t("assets.tabs.requested")
      : t("assets.tabs.addition");
  };

  const formatCategoryLabel = (category) => {
    switch (category) {
      case "OB Equipment":
        return t("common.categories.obEquipment");
      case "Driver Equipment":
        return t("common.categories.driverEquipment");
      case "Security Equipment":
        return t("common.categories.securityEquipment");
      case "Maintenance":
        return t("common.categories.maintenance");
      case "Other":
        return t("common.categories.other");
      default:
        return category;
    }
  };

  const getMethodColor = (asset) => {
    return asset?.request_items_id
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  };

  const formatCurrencyId = (value) => {
    if (value === null || value === undefined) return "";
    const digits = String(value).replace(/[^0-9]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Parse procurement notes saved during purchase to structured fields
  const parseProcurementNotes = (notes) => {
    if (!notes || typeof notes !== "string") return {};
    const obj = {};
    try {
      const typeMatch = notes.match(/Type:\s*(Online|Offline)/i);
      if (typeMatch) obj.purchase_type = typeMatch[1].toLowerCase();
      const appMatch = notes.match(/App:\s*([^\n]+)/i);
      if (appMatch) obj.purchase_app = appMatch[1].trim();
      const linkMatch = notes.match(/Link:\s*([^\n]+)/i);
      if (linkMatch) obj.purchase_link = linkMatch[1].trim();
      const storeMatch = notes.match(/Store:\s*([^\n]+)/i);
      if (storeMatch) obj.store_name = storeMatch[1].trim();
      const locMatch = notes.match(/Location:\s*([^\n]+)/i);
      if (locMatch) obj.store_location = locMatch[1].trim();
    } catch {
      // ignore parse errors; show raw notes below
    }
    return obj;
  };

  // Remove structured purchase metadata lines from a raw notes string
  const stripPurchaseMeta = (notes) => {
    if (!notes || typeof notes !== "string") return "";
    try {
      const cleaned = notes
        .replace(/^\s*Type:\s*.*$/gim, "")
        .replace(/^\s*App:\s*.*$/gim, "")
        .replace(/^\s*Link:\s*.*$/gim, "")
        .replace(/^\s*Store:\s*.*$/gim, "")
        .replace(/^\s*Location:\s*.*$/gim, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return cleaned;
    } catch {
      return notes;
    }
  };

  // Prefer structured fields on asset; fallback to parsing notes
  const getPurchaseDetails = (assetLike) => {
    const details = {
      purchase_type: assetLike?.purchase_type || "",
      purchase_app: assetLike?.purchase_app || "",
      purchase_link: assetLike?.purchase_link || "",
      store_name: assetLike?.store_name || "",
      store_location: assetLike?.store_location || "",
    };
    const hasStructured =
      details.purchase_type ||
      details.purchase_app ||
      details.purchase_link ||
      details.store_name ||
      details.store_location;
    if (hasStructured) {
      return details;
    }
    // fallback to parse notes
    return parseProcurementNotes(assetLike?.notes || "");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "shipping":
        return <ShoppingCart className="h-4 w-4 text-purple-500" />;
      case "not_received":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "received":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "needs_repair":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "needs_replacement":
        return <RefreshCw className="h-4 w-4 text-red-500" />;
      case "repairing":
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case "replacing":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "shipping":
        return "bg-purple-100 text-purple-800";
      case "not_received":
        return "bg-yellow-100 text-yellow-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "needs_repair":
        return "bg-orange-100 text-orange-800";
      case "needs_replacement":
        return "bg-red-100 text-red-800";
      case "repairing":
        return "bg-orange-100 text-orange-800";
      case "replacing":
        return "bg-blue-100 text-blue-800";
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setEditingAsset(null);
    setFormData({
      name: "",
      category: "",
      color: "",
      location: "",
      status: "not_received",
      supplier: "",
      purchase_cost: "",
      purchase_date: "",
      quantity: 1,
      notes: "",
    });
    setShowModal(true);
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || "",
      category: asset.category || "",
      color: asset.color || "",
      location: asset.location || "",
      status: asset.status || "not_received",
      supplier: asset.supplier || "",
      purchase_cost: asset.purchase_cost || "",
      purchase_date: asset.purchase_date
        ? asset.purchase_date.split("T")[0]
        : "",
      quantity: asset.quantity || 1,
      notes: asset.notes || "",
    });
    setShowModal(true);
  };

  const openProcAction = (asset) => {
    setProcAsset(asset);
    setProcForm({
      name: asset?.name || "",
      purchase_type: "",
      purchase_link: "",
      purchase_app: "",
      store_name: "",
      store_location: "",
      purchase_date: "",
      amount: "",
      notes: "",
    });
    setShowProcActionModal(true);
  };

  const handleMarkReceived = async (asset) => {
    try {
      await api.patch(`/assets/${asset.id}/status`, { status: "received" });
      const res = await api.get("/assets");
      setAssets(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("common.failedToSave"));
    }
  };

  const handleProcActionSubmit = async (e) => {
    e.preventDefault();
    if (!procAsset?.request_items_id) {
      alert(t("notifications.assetNotLinkedToRequest"));
      return;
    }
    if (!procForm.purchase_type) {
      alert(t("notifications.choosePurchaseType"));
      return;
    }
    if (!procForm.purchase_date) {
      alert(t("notifications.enterPurchaseDate"));
      return;
    }
    try {
      const purchaseApp = capitalizeFirst(procForm.purchase_app);
      const storeName = capitalizeFirst(procForm.store_name);
      const storeLocation = capitalizeFirst(procForm.store_location);
      const noteText = capitalizeFirst(procForm.notes);

      const payload = {
        request_items_id: procAsset.request_items_id,
        purchase_date: new Date(procForm.purchase_date)
          .toISOString()
          .slice(0, 10),
        amount: procForm.amount
          ? parseFloat(String(procForm.amount).replace(/\./g, ""))
          : 0,
        notes: noteText?.trim() || "",
        purchase_type: procForm.purchase_type,
        purchase_app: purchaseApp,
        purchase_link: procForm.purchase_link,
        store_name: storeName,
        store_location: storeLocation,
      };

      await api.post("/procurements", payload);
      const res = await api.get("/assets");
      setAssets(res.data || []);
      setShowProcActionModal(false);
      setProcAsset(null);
    } catch (err) {
      const msg = err?.response?.data?.message || t("common.failedToSave");
      const detail = err?.response?.data?.error;
      alert(detail ? `${msg}: ${detail}` : msg);
    }
  };

  // Normalize: capitalize first letter for name, color, location, supplier, notes
  const capitalizeFirst = (value) => {
    if (!value || typeof value !== "string") return value;
    const trimmed = value.trimStart();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        name: capitalizeFirst(formData.name),
        color: capitalizeFirst(formData.color),
        location: capitalizeFirst(formData.location),
        supplier: capitalizeFirst(formData.supplier),
        notes: capitalizeFirst(formData.notes),
        purchase_cost: formData.purchase_cost
          ? parseFloat(String(formData.purchase_cost).replace(/\./g, ""))
          : null,
        purchase_date: formData.purchase_date
          ? new Date(formData.purchase_date).toISOString().slice(0, 10)
          : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : 1,
      };

      if (editingAsset) {
        await api.put(`/assets/${editingAsset.id}`, payload);
      } else {
        await api.post("/assets", payload);
      }

      const res = await api.get("/assets");
      setAssets(res.data || []);
      setShowModal(false);
      setEditingAsset(null);
      setFormData({
        name: "",
        category: "",
        color: "",
        location: "",
        status: "not_received",
        supplier: "",
        purchase_cost: "",
        purchase_date: "",
        quantity: 1,
        notes: "",
      });
    } catch (e) {
      alert(e?.response?.data?.message || t("common.failedToSaveAsset"));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("assets.deleteConfirm"))) {
      try {
        await api.delete(`/assets/${id}`);
        const res = await api.get("/assets");
        setAssets(res.data || []);
      } catch (e) {
        alert(e?.response?.data?.message || t("errors.deleteError"));
      }
    }
  };

  const filteredAssets = getFilteredAssets();
  const stats = getTabStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t("assets.title")}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {t("assets.subtitle")}
          </p>
        </div>
        {user?.role === "admin_ga" && (
          <button
            onClick={handleCreate}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("assets.addNewAsset", { defaultValue: "Add New Asset" })}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-2 sm:gap-0 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "all"
                ? "border-accent-500 text-accent-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Package className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {t("assets.tabs.all", { defaultValue: "All Assets" })}
            </span>
            <span className="sm:hidden">
              {t("common.all", { defaultValue: "All" })}
            </span>
            <span className="ml-1">({stats.total})</span>
          </button>
          <button
            onClick={() => setActiveTab("requested")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "requested"
                ? "border-accent-500 text-accent-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {t("assets.tabs.requested", { defaultValue: "Requested" })}
            </span>
            <span className="sm:hidden">
              {t("assets.tabs.reqShort", { defaultValue: "Req" })}
            </span>
            <span className="ml-1">
              ({assets.filter((a) => !!a.request_items_id).length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("addition")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "addition"
                ? "border-accent-500 text-accent-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {t("assets.tabs.addition", { defaultValue: "Addition" })}
            </span>
            <span className="sm:hidden">
              {t("assets.tabs.addShort", { defaultValue: "Add" })}
            </span>
            <span className="ml-1">
              ({assets.filter((a) => !a.request_items_id).length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("procurement")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "procurement"
                ? "border-accent-500 text-accent-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t("nav.procurement")}</span>
            <span className="sm:hidden">
              {t("assets.tabs.procShort", { defaultValue: "Proc" })}
            </span>
            <span className="ml-1">
              ({assets.filter((a) => isProcurementRelevant(a)).length})
            </span>
          </button>
        </nav>
      </div>

      {/* Stats Cards */}
      <div className={statsGridClass}>
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div className="card p-2 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-1 sm:mb-3">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    {t("assets.stats.total")}
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>
            {!(activeTab === "all" || activeTab === "addition") && (
              <>
                <div className="card p-2 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-1 sm:mb-3">
                      <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500">
                        {t("assets.stats.received")}
                      </p>
                      <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {stats.received}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card p-2 sm:p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex-shrink-0 mb-1 sm:mb-3">
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500">
                        {t("assets.stats.notReceived")}
                      </p>
                      <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {stats.notReceived}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="card p-2 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-1 sm:mb-3">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    {t("assets.stats.needsRepair")}
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {stats.needsRepair}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-2 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-1 sm:mb-3">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    {t("assets.stats.needsReplacement")}
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {stats.needsReplacement}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-2 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-1 sm:mb-3">
                  <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    {t("assets.stats.repairing")}
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {stats.repairing}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-2 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex-shrink-0 mb-1 sm:mb-3">
                  <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    {t("assets.stats.replacing")}
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {stats.replacing}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("assets.searchAssets")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-8 sm:pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder={statusSearchTerm ? "Type to search status..." : ""}
                value={statusSearchTerm}
                onChange={(e) => {
                  setStatusSearchTerm(e.target.value);
                  setShowStatusDropdown(true);
                }}
                onFocus={() => {
                  setStatusSearchTerm("");
                  setStatusPreselected(statusFilter);
                  setShowStatusDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowStatusDropdown(false);
                    setStatusSearchTerm("");
                  }, 150);
                }}
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {!statusSearchTerm && !showStatusDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {statusFilter === "all"
                      ? t("todos.allStatus")
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
              <div
                ref={statusDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in-0"
              >
                {[
                  { value: "all", label: t("todos.allStatus") },
                  { value: "shipping", label: formatStatusLabel("shipping") },
                  {
                    value: "not_received",
                    label: formatStatusLabel("not_received"),
                  },
                  { value: "received", label: formatStatusLabel("received") },
                  {
                    value: "needs_repair",
                    label: formatStatusLabel("needs_repair"),
                  },
                  {
                    value: "needs_replacement",
                    label: formatStatusLabel("needs_replacement"),
                  },
                  { value: "repairing", label: formatStatusLabel("repairing") },
                  { value: "replacing", label: formatStatusLabel("replacing") },
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
                      className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                        statusPreselected === option.value
                          ? "bg-blue-50 text-blue-900"
                          : statusFilter === option.value
                          ? "bg-accent-50 text-accent-900"
                          : "text-gray-900"
                      }`}
                    >
                      <span className="block truncate">{option.label}</span>
                      {statusFilter === option.value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <Check className="h-4 w-4 text-accent-600" />
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder={
                  categorySearchTerm ? "Type to search categories..." : ""
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
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowCategoryDropdown(false);
                    setCategorySearchTerm("");
                  }, 150);
                }}
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {!categorySearchTerm && !showCategoryDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {categoryFilter === "all"
                      ? t("common.allCategories")
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
              <div
                ref={categoryDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in-0"
              >
                {[
                  { value: "all", label: t("common.allCategories") },
                  {
                    value: "OB Equipment",
                    label: t("common.categories.obEquipment"),
                  },
                  {
                    value: "Driver Equipment",
                    label: t("common.categories.driverEquipment"),
                  },
                  {
                    value: "Security Equipment",
                    label: t("common.categories.securityEquipment"),
                  },
                  {
                    value: "Maintenance",
                    label: t("common.categories.maintenance"),
                  },
                  { value: "Other", label: t("common.categories.other") },
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
                      className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                        categoryPreselected === option.value
                          ? "bg-blue-50 text-blue-900"
                          : categoryFilter === option.value
                          ? "bg-accent-50 text-accent-900"
                          : "text-gray-900"
                      }`}
                    >
                      <span className="block truncate">{option.label}</span>
                      {categoryFilter === option.value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <Check className="h-4 w-4 text-accent-600" />
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600 bg-red-50">
            {error}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {!loading && !error && filteredAssets.length === 0 && (
              <li className="px-6 py-4 text-sm text-gray-500 text-center">
                No assets found
              </li>
            )}
            {!loading &&
              !error &&
              filteredAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="px-3 sm:px-6 py-4 hover:bg-gray-50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 hover:shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        {asset.maintenance_status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          getStatusIcon(asset.status)
                        )}
                      </div>

                      {/* Purchase Details removed from list items to avoid layout issues; shown in modal only */}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                            {asset.name}
                          </h3>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                            {asset.asset_code}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              asset.maintenance_status === "completed" &&
                              asset.maintenance_type
                                ? "bg-emerald-100 text-emerald-700"
                                : asset.maintenance_status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : getStatusColor(asset.status)
                            }`}
                          >
                            {asset.maintenance_status === "completed" &&
                            asset.maintenance_type
                              ? asset.maintenance_type === "repair"
                                ? t("maintenance.status.completedRepair")
                                : t("maintenance.status.completedReplacement")
                              : asset.maintenance_status === "pending"
                              ? t("maintenance.status.pending")
                              : formatStatusLabel(asset.status)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                              asset.category
                            )}`}
                          >
                            {asset.category}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(
                              asset
                            )}`}
                          >
                            {formatMethodLabel(asset)}
                          </span>
                          {asset.maintenance_status === "in_progress" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {t("maintenance.status.inProgress")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {asset.color && (
                            <span className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                              {asset.color}
                            </span>
                          )}
                          {asset.location && <span>📍 {asset.location}</span>}
                          {asset.supplier && <span>🏢 {asset.supplier}</span>}
                          {asset.quantity && (
                            <span>📦 Qty: {asset.quantity}</span>
                          )}
                          {typeof asset.purchase_cost === "number" && (
                            <span>
                              💰 Rp {asset.purchase_cost.toLocaleString()}
                            </span>
                          )}
                          {asset.purchase_date && (
                            <span>
                              📅{" "}
                              {format(
                                new Date(asset.purchase_date),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          )}
                        </div>
                        {asset.notes && stripPurchaseMeta(asset.notes) && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                            <strong>Notes:</strong>{" "}
                            {stripPurchaseMeta(asset.notes)}
                          </div>
                        )}
                        {asset.maintenance_status === "in_progress" &&
                          asset.maintenance_reason && (
                            <div className="mt-2 text-xs text-amber-600">
                              <span className="font-semibold">
                                {t("maintenance.notes.userReason")}:
                              </span>{" "}
                              {asset.maintenance_reason}
                            </div>
                          )}
                        {asset.maintenance_status === "completed" &&
                          asset.maintenance_completion_notes && (
                            <div className="mt-2 text-xs text-emerald-600">
                              <span className="font-semibold">
                                {t("maintenance.notes.completionNotes")}:
                              </span>{" "}
                              {asset.maintenance_completion_notes}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start gap-2">
                      {(asset.maintenance_status === "approved" ||
                        asset.maintenance_status === "procurement") &&
                        activeTab === "procurement" && (
                          <button
                            onClick={() => handleStartMaintenance(asset)}
                            className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium shadow-sm"
                            title={t("maintenance.actions.startMaintenance")}
                          >
                            {t("maintenance.actions.startMaintenance")}
                          </button>
                        )}
                      {asset.maintenance_status === "in_progress" &&
                        activeTab === "procurement" && (
                          <button
                            onClick={() => {
                              setMaintCompleteTarget(asset);
                              setMaintCompletionNotes("");
                              setMaintCompletionError("");
                              setShowMaintCompleteModal(true);
                            }}
                            className="px-2 py-1 rounded-md text-white bg-orange-600 hover:bg-orange-700 text-xs font-medium shadow-sm"
                            title={
                              asset.maintenance_type === "repair"
                                ? t("maintenance.actions.markRepaired")
                                : t("maintenance.actions.markReplaced")
                            }
                          >
                            {asset.maintenance_type === "repair"
                              ? t("maintenance.actions.markRepaired")
                              : t("maintenance.actions.markReplaced")}
                          </button>
                        )}
                      <MaintenanceActionMenu
                        entityType="asset"
                        item={asset}
                        onUpdated={handleMaintenanceUpdate}
                        isVisible={shouldShowMaintenanceMenu(asset)}
                      />
                      {user?.role === "procurement" &&
                        activeTab === "procurement" && (
                          <>
                            {asset.status === "procurement" && (
                              <button
                                onClick={() => openProcAction(asset)}
                                className="px-2 py-1 rounded-md text-white bg-accent-600 hover:bg-accent-700 text-xs font-medium shadow-sm"
                                title={t("common.purchase")}
                              >
                                Purchase
                              </button>
                            )}
                            {asset.status === "shipping" && (
                              <button
                                onClick={() => handleMarkReceived(asset)}
                                className="px-2 py-1 rounded-md text-white bg-green-600 hover:bg-green-700 text-xs font-medium shadow-sm"
                                title={t("common.markAsReceived")}
                              >
                                Received
                              </button>
                            )}
                          </>
                        )}
                      {(activeTab === "procurement" ||
                        user?.role === "admin_ga") && (
                        <div className="relative" data-dropdown="asset-actions">
                          <button
                            type="button"
                            onClick={(e) => {
                              const nextOpen =
                                openActionForId === asset.id ? null : asset.id;
                              if (nextOpen) {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const spaceBelow =
                                  window.innerHeight - rect.bottom;
                                const estimatedMenuHeight = 192;
                                setActionMenuDirection(
                                  spaceBelow < estimatedMenuHeight
                                    ? "up"
                                    : "down"
                                );
                              }
                              setOpenActionForId(nextOpen);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                          >
                            {t("common.actions")}
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                openActionForId === asset.id ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {openActionForId === asset.id && (
                            <div
                              className={`absolute right-0 ${
                                actionMenuDirection === "down"
                                  ? "top-full mt-2"
                                  : "bottom-full mb-2"
                              } w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10`}
                            >
                              <div className="py-1 text-sm">
                                <button
                                  onClick={() => {
                                    setOpenActionForId(null);
                                    handleViewDetails(asset);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-blue-700"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>{t("common.view")}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionForId(null);
                                    handleEdit(asset);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>{t("common.edit")}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionForId(null);
                                    handleDelete(asset.id);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>{t("common.delete")}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Create/Edit Asset Modal (refreshed layout) */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="relative z-10 flex min-h-full items-center justify-center p-2 sm:p-4">
              <div className="relative w-full max-w-2xl p-4 sm:p-6 border border-gray-200 shadow-lg rounded-lg bg-white transform transition-all duration-300 ease-out animate-in slide-in-from-top-4 fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="mt-3">
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingAsset
                        ? editingAsset.request_items_id
                          ? t("assets.editRequestedAsset")
                          : t("assets.editAddition")
                        : t("assets.createNewAsset")}
                    </h3>
                    {editingAsset && editingAsset.request_items_id && (
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {editingAsset.asset_code}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                            editingAsset.status
                          )}`}
                        >
                          {formatStatusLabel(editingAsset.status)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                            editingAsset.category
                          )}`}
                        >
                          {editingAsset.category}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(
                            editingAsset
                          )}`}
                        >
                          {formatMethodLabel(editingAsset)}
                        </span>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.assetName")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.category")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <FormSelect
                          required
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          options={[
                            { value: "", label: t("assets.selectCategory") },
                            {
                              value: "OB Equipment",
                              label: t("common.categories.obEquipment"),
                            },
                            {
                              value: "Driver Equipment",
                              label: t("common.categories.driverEquipment"),
                            },
                            {
                              value: "Security Equipment",
                              label: t("common.categories.securityEquipment"),
                            },
                            {
                              value: "Maintenance",
                              label: t("common.categories.maintenance"),
                            },
                            {
                              value: "Other",
                              label: t("common.categories.other"),
                            },
                          ]}
                          placeholder={t("assets.selectCategory")}
                        />
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("common.color", { defaultValue: "Color" })}
                        </label>
                        <input
                          type="text"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.location")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={
                            !editingAsset || !editingAsset.request_items_id
                          }
                          value={formData.location}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              location: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.supplier")}
                        </label>
                        <input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              supplier: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Purchase Info (optional for additions) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.purchasePrice")} (Rp)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCurrencyId(formData.purchase_cost)}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchase_cost: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.purchaseDate")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required={
                            !editingAsset || !editingAsset.request_items_id
                          }
                          value={formData.purchase_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchase_date: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Procurement fields (read-only parsed from notes when available) */}
                    {editingAsset &&
                      editingAsset.request_items_id &&
                      (() => {
                        const p = getPurchaseDetails(editingAsset);
                        const type = p.purchase_type;
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                {t("assets.acquisitionMethod")}
                              </label>
                              <input
                                type="text"
                                value={
                                  type
                                    ? type.charAt(0).toUpperCase() +
                                      type.slice(1)
                                    : "-"
                                }
                                readOnly
                                className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700"
                              />
                            </div>
                            {type === "online" ? (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    {t("assets.purchase", {
                                      defaultValue: "Purchase",
                                    })}{" "}
                                    App
                                  </label>
                                  <input
                                    type="text"
                                    value={p.purchase_app || "-"}
                                    readOnly
                                    className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    {t("assets.purchase", {
                                      defaultValue: "Purchase",
                                    })}{" "}
                                    Link
                                  </label>
                                  <input
                                    type="text"
                                    value={p.purchase_link || "-"}
                                    readOnly
                                    className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700"
                                  />
                                </div>
                              </>
                            ) : type === "offline" ? (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    {t("assets.supplier")}
                                  </label>
                                  <input
                                    type="text"
                                    value={p.store_name || "-"}
                                    readOnly
                                    className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    {t("common.address")}
                                  </label>
                                  <input
                                    type="text"
                                    value={p.store_location || "-"}
                                    readOnly
                                    className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700"
                                  />
                                </div>
                              </>
                            ) : null}
                          </div>
                        );
                      })()}

                    {/* Inventory */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("common.quantity")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required={
                          !editingAsset || !editingAsset.request_items_id
                        }
                        value={
                          formData.quantity === 0
                            ? "0"
                            : String(formData.quantity ?? "")
                        }
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(
                            /[^0-9]/g,
                            ""
                          );
                          setFormData({
                            ...formData,
                            quantity:
                              digitsOnly === "" ? "" : parseInt(digitsOnly, 10),
                          });
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("common.notes")}
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingAsset(null);
                          setFormData({
                            name: "",
                            category: "",
                            color: "",
                            location: "",
                            status: "not_received",
                            supplier: "",
                            purchase_cost: "",
                            purchase_date: "",
                            quantity: 1,
                            notes: "",
                          });
                        }}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 flex items-center justify-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {editingAsset
                          ? t("common.update")
                          : t("assets.createAsset")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Purchase Modal */}
      {showProcActionModal &&
        createPortal(
          <div
            className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowProcActionModal(false);
            }}
          >
            <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
              <div className="relative w-full max-w-xl p-4 sm:p-6 border border-gray-200 shadow-lg rounded-lg bg-white transform transition-all duration-300 ease-out animate-in slide-in-from-top-4 fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="mt-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
                    {t("assets.purchase")}
                  </h3>
                  <form onSubmit={handleProcActionSubmit} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("assets.assetName")}
                      </label>
                      <input
                        type="text"
                        value={procForm.name}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("assets.purchaseDate")} *
                        </label>
                        <input
                          type="date"
                          required
                          value={procForm.purchase_date}
                          onChange={(e) =>
                            setProcForm({
                              ...procForm,
                              purchase_date: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("common.amount")} (Rp)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCurrencyId(procForm.amount)}
                          onChange={(e) =>
                            setProcForm({ ...procForm, amount: e.target.value })
                          }
                          placeholder="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("assets.acquisitionMethod")} *
                      </label>
                      <FormSelect
                        required
                        value={procForm.purchase_type}
                        onChange={(e) =>
                          setProcForm({
                            ...procForm,
                            purchase_type: e.target.value,
                          })
                        }
                        options={[
                          { value: "", label: t("common.selectOption") },
                          { value: "online", label: "Online" },
                          { value: "offline", label: "Offline" },
                        ]}
                        placeholder={t("common.selectOption")}
                      />
                    </div>

                    {procForm.purchase_type === "online" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t("assets.purchase", { defaultValue: "Purchase" })}{" "}
                            App
                          </label>
                          <input
                            type="text"
                            value={procForm.purchase_app}
                            onChange={(e) =>
                              setProcForm({
                                ...procForm,
                                purchase_app: e.target.value,
                              })
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t("assets.purchase", { defaultValue: "Purchase" })}{" "}
                            Link
                          </label>
                          <input
                            type="url"
                            value={procForm.purchase_link}
                            onChange={(e) =>
                              setProcForm({
                                ...procForm,
                                purchase_link: e.target.value,
                              })
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          />
                        </div>
                      </div>
                    )}

                    {procForm.purchase_type === "offline" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t("assets.supplier")}
                          </label>
                          <input
                            type="text"
                            value={procForm.store_name}
                            onChange={(e) =>
                              setProcForm({
                                ...procForm,
                                store_name: e.target.value,
                              })
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t("common.address")}
                          </label>
                          <input
                            type="text"
                            value={procForm.store_location}
                            onChange={(e) =>
                              setProcForm({
                                ...procForm,
                                store_location: e.target.value,
                              })
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("common.notes")}
                      </label>
                      <textarea
                        value={procForm.notes}
                        onChange={(e) =>
                          setProcForm({ ...procForm, notes: e.target.value })
                        }
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowProcActionModal(false)}
                        className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm rounded-md bg-accent-600 text-white hover:bg-accent-700 shadow"
                      >
                        {t("common.save")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Asset Detail Modal (refreshed layout) */}
      {showDetailModal &&
        selectedAsset &&
        createPortal(
          <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]">
            <div
              className="absolute inset-0"
              onClick={() => {
                setShowDetailModal(false);
                setSelectedAsset(null);
              }}
            />
            <div className="absolute inset-0 flex items-start sm:items-center justify-center p-3 sm:p-4">
              <div className="w-full max-w-md border border-gray-200 shadow-sm rounded-xl bg-white max-h-[90vh] overflow-y-auto">
                <div className="mt-3 p-4 sm:p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedAsset.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {selectedAsset.asset_code}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                            selectedAsset.status
                          )}`}
                        >
                          {formatStatusLabel(selectedAsset.status)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                            selectedAsset.category
                          )}`}
                        >
                          {selectedAsset.category}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(
                            selectedAsset
                          )}`}
                        >
                          {formatMethodLabel(selectedAsset)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sections */}
                  {selectedAsset.request_items_id ? (
                    <div className="mt-4 space-y-4">
                      {/* Request Section */}
                      <div className="rounded border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Request
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">
                            {t("assets.linkedRequestId")}
                          </div>
                          <div className="text-gray-900">
                            #{selectedAsset.request_items_id}
                          </div>
                          <div className="text-gray-500">
                            {t("assets.stage")}
                          </div>
                          <div className="text-gray-900">
                            {selectedAsset.status === "procurement"
                              ? "Waiting purchase"
                              : selectedAsset.status === "shipping"
                              ? "Purchased & shipping"
                              : formatStatusLabel(selectedAsset.status)}
                          </div>
                        </div>
                      </div>

                      {/* Procurement Section */}
                      <div className="rounded border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Procurement
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">
                            {t("procurement.purchaseDate")}
                          </div>
                          <div className="text-gray-900">
                            {selectedAsset.purchase_date
                              ? format(
                                  new Date(selectedAsset.purchase_date),
                                  "MMM dd, yyyy"
                                )
                              : selectedAsset.procurement?.purchase_date
                              ? format(
                                  new Date(
                                    selectedAsset.procurement.purchase_date
                                  ),
                                  "MMM dd, yyyy"
                                )
                              : selectedAsset.status === "procurement"
                              ? "— pending"
                              : "—"}
                          </div>
                          <div className="text-gray-500">
                            {t("common.amount")}
                          </div>
                          <div className="text-gray-900">
                            {selectedAsset.purchase_cost != null
                              ? `Rp ${Number(
                                  selectedAsset.purchase_cost
                                ).toLocaleString()}`
                              : selectedAsset.procurement?.amount != null
                              ? `Rp ${Number(
                                  selectedAsset.procurement.amount
                                ).toLocaleString()}`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {/* Purchase Details Section (structured fields first) */}
                      {(() => {
                        const p = getPurchaseDetails(selectedAsset);
                        const type = p.purchase_type;
                        if (!type) return null;
                        return (
                          <div className="rounded border border-gray-100 p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Purchase Details
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div className="text-gray-500">
                                {t("common.purchaseType")}
                              </div>
                              <div className="text-gray-900">
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </div>
                              {type === "online" ? (
                                <>
                                  <div className="text-gray-500">
                                    Purchase App
                                  </div>
                                  <div className="text-gray-900">
                                    {p.purchase_app || "-"}
                                  </div>
                                  <div className="text-gray-500">
                                    Purchase Link
                                  </div>
                                  <div className="text-gray-900 break-all">
                                    {p.purchase_link || "-"}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-gray-500">
                                    Store Name
                                  </div>
                                  <div className="text-gray-900">
                                    {p.store_name || "-"}
                                  </div>
                                  <div className="text-gray-500">
                                    Store Location
                                  </div>
                                  <div className="text-gray-900">
                                    {p.store_location || "-"}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Inventory Section */}
                      <div className="rounded border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Inventory
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          {selectedAsset.color && (
                            <>
                              <div className="text-gray-500">
                                {t("common.color")}
                              </div>
                              <div className="text-gray-900">
                                {selectedAsset.color}
                              </div>
                            </>
                          )}
                          {selectedAsset.location && (
                            <>
                              <div className="text-gray-500">
                                {t("common.location")}
                              </div>
                              <div className="text-gray-900">
                                {selectedAsset.location}
                              </div>
                            </>
                          )}
                          {selectedAsset.supplier && (
                            <>
                              <div className="text-gray-500">
                                {t("common.supplier")}
                              </div>
                              <div className="text-gray-900">
                                {selectedAsset.supplier}
                              </div>
                            </>
                          )}
                          {selectedAsset.quantity && (
                            <>
                              <div className="text-gray-500">Quantity</div>
                              <div className="text-gray-900">
                                {selectedAsset.quantity}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedAsset.notes && (
                        <div className="rounded border border-gray-100 p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Notes
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">
                            {stripPurchaseMeta(selectedAsset.notes)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 text-sm">
                      {selectedAsset.color && (
                        <div>
                          <span className="text-gray-500">Color: </span>
                          <span className="text-gray-900">
                            {selectedAsset.color}
                          </span>
                        </div>
                      )}
                      {selectedAsset.location && (
                        <div>
                          <span className="text-gray-500">Location: </span>
                          <span className="text-gray-900">
                            {selectedAsset.location}
                          </span>
                        </div>
                      )}
                      {selectedAsset.supplier && (
                        <div>
                          <span className="text-gray-500">Supplier: </span>
                          <span className="text-gray-900">
                            {selectedAsset.supplier}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">
                          {t("common.quantity")}:{" "}
                        </span>
                        <span className="text-gray-900">
                          {selectedAsset.quantity || 1}
                        </span>
                      </div>
                      {selectedAsset.purchase_cost != null && (
                        <div>
                          <span className="text-gray-500">Purchase Cost: </span>
                          <span className="text-gray-900">
                            Rp{" "}
                            {Number(
                              selectedAsset.purchase_cost
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedAsset.purchase_date && (
                        <div>
                          <span className="text-gray-500">Purchase Date: </span>
                          <span className="text-gray-900">
                            {format(
                              new Date(selectedAsset.purchase_date),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                      {selectedAsset.notes && (
                        <div className="pt-2">
                          <span className="text-gray-500">Notes: </span>
                          <span className="text-gray-900 whitespace-pre-wrap">
                            {selectedAsset.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Maintenance Section */}
                  {selectedAsset.maintenance_status &&
                    selectedAsset.maintenance_status !== "idle" &&
                    selectedAsset.maintenance_status !== "none" &&
                    selectedAsset.maintenance_status !== "not_requested" && (
                      <div className="rounded border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Maintenance
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">Status</div>
                          <div className="text-gray-900">
                            {selectedAsset.maintenance_status ===
                            "maintenance_pending"
                              ? t("maintenance.status.pendingApproval")
                              : selectedAsset.maintenance_status === "approved"
                              ? t("common.status.approved")
                              : selectedAsset.maintenance_status ===
                                "procurement"
                              ? t("maintenance.status.pending")
                              : selectedAsset.maintenance_status ===
                                "in_progress"
                              ? t("maintenance.status.inProgress")
                              : selectedAsset.maintenance_status === "completed"
                              ? selectedAsset.maintenance_type === "repair"
                                ? t("maintenance.status.completedRepair")
                                : t("maintenance.status.completedReplacement")
                              : selectedAsset.maintenance_status === "rejected"
                              ? t("common.status.rejected")
                              : selectedAsset.maintenance_status}
                          </div>
                          {selectedAsset.maintenance_type && (
                            <>
                              <div className="text-gray-500">Type</div>
                              <div className="text-gray-900">
                                {selectedAsset.maintenance_type === "repair"
                                  ? "Repair"
                                  : "Replacement"}
                              </div>
                            </>
                          )}
                          {selectedAsset.maintenance_reason && (
                            <>
                              <div className="text-gray-500">Reason</div>
                              <div className="text-gray-900">
                                {selectedAsset.maintenance_reason}
                              </div>
                            </>
                          )}
                          {selectedAsset.maintenance_completion_notes && (
                            <>
                              <div className="text-gray-500">
                                Completion Notes
                              </div>
                              <div className="text-gray-900">
                                {selectedAsset.maintenance_completion_notes}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedAsset(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Maintenance Completion Modal */}
      {showMaintCompleteModal &&
        maintCompleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
            onClick={(e) => {
              if (e.target === e.currentTarget)
                setShowMaintCompleteModal(false);
            }}
          >
            <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
              <div className="relative w-full max-w-md p-4 sm:p-6 border border-gray-200 shadow-lg rounded-lg bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
                  {maintCompleteTarget.maintenance_type === "repair"
                    ? t("maintenance.actions.markRepaired")
                    : t("maintenance.actions.markReplaced")}
                </h3>
                {maintCompletionError && (
                  <div className="mb-2 text-sm text-red-600">
                    {maintCompletionError}
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setMaintCompletionLoading(true);
                      const payload = maintCompletionNotes.trim()
                        ? { notes: maintCompletionNotes.trim() }
                        : {};
                      const res = await api.post(
                        `/assets/${maintCompleteTarget.id}/maintenance/complete`,
                        payload
                      );
                      // refresh list with updated asset
                      if (res.data?.asset) {
                        const updated = res.data.asset;
                        setAssets((prev) =>
                          prev.map((a) =>
                            a.id === updated.id ? { ...a, ...updated } : a
                          )
                        );
                      }
                      alert(
                        res.data?.message || t("maintenance.completeSuccess")
                      );
                      setShowMaintCompleteModal(false);
                      setMaintCompleteTarget(null);
                      setMaintCompletionNotes("");
                      setMaintCompletionError("");
                    } catch (err) {
                      const msg =
                        err?.response?.data?.message ||
                        t("maintenance.completeError");
                      setMaintCompletionError(msg);
                    } finally {
                      setMaintCompletionLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <FormField label={t("maintenance.notesLabel")}>
                    <FormTextarea
                      rows={3}
                      value={maintCompletionNotes}
                      onChange={(e) => setMaintCompletionNotes(e.target.value)}
                      placeholder={t("maintenance.notesPlaceholder")}
                    />
                  </FormField>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMaintCompleteModal(false)}
                      className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={maintCompletionLoading}
                      className="px-4 py-2 text-sm rounded-md bg-accent-600 text-white hover:bg-accent-700 shadow disabled:opacity-60"
                    >
                      {maintCompleteTarget.maintenance_type === "repair"
                        ? t("maintenance.actions.markRepaired")
                        : t("maintenance.actions.markReplaced")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AssetManagementTabs;
