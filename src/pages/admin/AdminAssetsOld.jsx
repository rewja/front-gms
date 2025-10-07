import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { api, fileUrl } from "../../lib/api";
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
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../../components/SkeletonLoader";
import { createPortal } from "react-dom";

const AdminAssets = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [statusSearchTerm, setStatusSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [methodSearchTerm, setMethodSearchTerm] = useState("");
  const [statusPreselected, setStatusPreselected] = useState("all");
  const [categoryPreselected, setCategoryPreselected] = useState("all");
  const [methodPreselected, setMethodPreselected] = useState("all");
  const statusDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const methodDropdownRef = useRef(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    notes: "",
  });

  // Auto-scroll to pre-selected option
  useEffect(() => {
    if (showStatusDropdown && statusDropdownRef.current) {
      const selectedElement = statusDropdownRef.current.querySelector(
        `[data-value="${statusPreselected}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [statusPreselected, showStatusDropdown]);

  const formatStatusLabel = (status) => {
    switch (status) {
      case "all":
        return t("todos.allStatus");
      case "not_received":
        return t("common.status.notReceived");
      case "received":
        return t("common.status.received");
      case "needs_repair":
        return t("common.status.needsRepair");
      case "needs_replacement":
        return t("common.status.needsReplacement");
      case "repairing":
        return t("common.status.repairing");
      case "replacing":
        return t("common.status.replacing");
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatMethodLabel = (method) => {
    switch (method) {
      case "all":
        return t("common.allMethods");
      case "purchasing":
        return t("assets.tabs.requested");
      case "data_input":
        return t("assets.tabs.addition");
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case "purchasing":
        return "bg-blue-100 text-blue-800";
      case "data_input":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
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
      case "IT Equipment":
        return "bg-blue-100 text-blue-800";
      case "Office Furniture":
        return "bg-purple-100 text-purple-800";
      case "Office Supplies":
        return "bg-green-100 text-green-800";
      case "Maintenance":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // load assets on mount
  useEffect(() => {
    if (!user || user.role !== "admin_ga") return;
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
      notes: asset.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        purchase_cost: formData.purchase_cost
          ? parseFloat(formData.purchase_cost)
          : null,
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

  const handleApprove = async (id) => {
    try {
      await api.patch(`/assets/${id}/status`, { status: "repairing" });
      const res = await api.get("/assets");
      setAssets(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("common.failedToApprove"));
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/assets/${id}/status`, { status: "needs_replacement" });
      const res = await api.get("/assets");
      setAssets(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("common.failedToReject"));
    }
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

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      (asset.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.asset_code || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (asset.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.color || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.supplier || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || asset.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || asset.category === categoryFilter;
    const matchesMethod =
      methodFilter === "all" || asset.method === methodFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesMethod;
  });

  // Get unique categories and methods for filters
  const uniqueCategories = [
    ...new Set(assets.map((asset) => asset.category).filter(Boolean)),
  ];
  const uniqueMethods = [
    ...new Set(assets.map((asset) => asset.method).filter(Boolean)),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Asset Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage office assets and inventory
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t("assets.addNewAsset")}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("common.placeholders.searchAssets")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            />
          </div>
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
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const options = [
                      "all",
                      "procurement",
                      "not_received",
                      "received",
                      "needs_repair",
                      "needs_replacement",
                      "repairing",
                      "replacing",
                    ];
                    const currentIndex = options.indexOf(statusPreselected);
                    const nextIndex =
                      currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                    setStatusPreselected(options[nextIndex]);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const options = [
                      "all",
                      "procurement",
                      "not_received",
                      "received",
                      "needs_repair",
                      "needs_replacement",
                      "repairing",
                      "replacing",
                    ];
                    const currentIndex = options.indexOf(statusPreselected);
                    const prevIndex =
                      currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                    setStatusPreselected(options[prevIndex]);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setStatusFilter(statusPreselected);
                    setShowStatusDropdown(false);
                    setStatusSearchTerm("");
                  } else if (e.key === "Escape") {
                    setShowStatusDropdown(false);
                    setStatusSearchTerm("");
                  }
                }}
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {/* Overlay text when not focused and no search term */}
              {!statusSearchTerm && !showStatusDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {statusFilter === "all"
                      ? t("common.allStatus")
                      : formatStatusLabel(statusFilter)}
                  </span>
                </div>
              )}
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </span>
            </div>
            {showStatusDropdown && (
              <div
                ref={statusDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in-0"
              >
                {[
                  { value: "all", label: t("common.allStatus") },
                  {
                    value: "procurement",
                    label: t("common.status.inProcurement"),
                  },
                  {
                    value: "not_received",
                    label: t("common.status.notReceived"),
                  },
                  { value: "received", label: t("common.status.received") },
                  {
                    value: "needs_repair",
                    label: t("common.status.needsRepair"),
                  },
                  {
                    value: "needs_replacement",
                    label: t("common.status.needsReplacement"),
                  },
                  { value: "repairing", label: t("common.status.repairing") },
                  { value: "replacing", label: t("common.status.replacing") },
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
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const options = ["all", ...uniqueCategories];
                    const currentIndex = options.indexOf(categoryPreselected);
                    const nextIndex =
                      currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                    setCategoryPreselected(options[nextIndex]);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const options = ["all", ...uniqueCategories];
                    const currentIndex = options.indexOf(categoryPreselected);
                    const prevIndex =
                      currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                    setCategoryPreselected(options[prevIndex]);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setCategoryFilter(categoryPreselected);
                    setShowCategoryDropdown(false);
                    setCategorySearchTerm("");
                  } else if (e.key === "Escape") {
                    setShowCategoryDropdown(false);
                    setCategorySearchTerm("");
                  }
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
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </span>
            </div>
            {showCategoryDropdown && (
              <div
                ref={categoryDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in-0"
              >
                {[
                  { value: "all", label: t("common.allCategories") },
                  ...uniqueCategories.map((cat) => ({
                    value: cat,
                    label: cat,
                  })),
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

          {/* Method Filter */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder={
                  methodSearchTerm ? "Type to search methods..." : ""
                }
                value={methodSearchTerm}
                onChange={(e) => {
                  setMethodSearchTerm(e.target.value);
                  setShowMethodDropdown(true);
                }}
                onFocus={() => {
                  setMethodSearchTerm("");
                  setMethodPreselected(methodFilter);
                  setShowMethodDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowMethodDropdown(false);
                    setMethodSearchTerm("");
                  }, 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const options = ["all", ...uniqueMethods];
                    const currentIndex = options.indexOf(methodPreselected);
                    const nextIndex =
                      currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                    setMethodPreselected(options[nextIndex]);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const options = ["all", ...uniqueMethods];
                    const currentIndex = options.indexOf(methodPreselected);
                    const prevIndex =
                      currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                    setMethodPreselected(options[prevIndex]);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setMethodFilter(methodPreselected);
                    setShowMethodDropdown(false);
                    setMethodSearchTerm("");
                  } else if (e.key === "Escape") {
                    setShowMethodDropdown(false);
                    setMethodSearchTerm("");
                  }
                }}
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {!methodSearchTerm && !showMethodDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {methodFilter === "all"
                      ? t("common.allMethods")
                      : formatMethodLabel(methodFilter)}
                  </span>
                </div>
              )}
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </span>
            </div>
            {showMethodDropdown && (
              <div
                ref={methodDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in-0"
              >
                {[
                  { value: "all", label: t("common.allMethods") },
                  { value: "purchasing", label: t("assets.tabs.requested") },
                  { value: "data_input", label: t("assets.tabs.addition") },
                ]
                  .filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes((methodSearchTerm || "").toLowerCase())
                  )
                  .map((option) => (
                    <button
                      key={option.value}
                      data-value={option.value}
                      onClick={() => {
                        setMethodFilter(option.value);
                        setShowMethodDropdown(false);
                        setMethodSearchTerm("");
                      }}
                      className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                        methodPreselected === option.value
                          ? "bg-blue-50 text-blue-900"
                          : methodFilter === option.value
                          ? "bg-accent-50 text-accent-900"
                          : "text-gray-900"
                      }`}
                    >
                      <span className="block truncate">{option.label}</span>
                      {methodFilter === option.value && (
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
                        {getStatusIcon(asset.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                            {asset.name}
                          </h3>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                            {asset.asset_code}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              asset.status
                            )}`}
                          >
                            {formatStatusLabel(asset.status)}
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
                              asset.method
                            )}`}
                          >
                            {formatMethodLabel(asset.method)}
                          </span>
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
                        {asset.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                            <strong>Notes:</strong> {asset.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start space-x-2">
                      <button
                        onClick={() => handleViewDetails(asset)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t("common.viewDetails")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(asset)}
                        className="text-accent-600 hover:text-accent-800"
                        title={t("common.editAsset")}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 hover:text-red-900"
                        title={t("common.deleteAsset")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      {(asset.status === "needs_repair" ||
                        asset.status === "needs_replacement") && (
                        <>
                          <button
                            onClick={() => handleApprove(asset.id)}
                            className="text-green-600 hover:text-green-800"
                            title={t("common.approve")}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(asset.id)}
                            className="text-red-600 hover:text-red-800"
                            title={t("common.reject")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Create/Edit Asset Modal */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="relative w-full max-w-2xl p-6 border border-gray-200 shadow-lg rounded-lg bg-white transform transition-all duration-300 ease-out animate-in slide-in-from-top-4 fade-in-0 zoom-in-95">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
                    {editingAsset
                      ? t("common.editAsset")
                      : t("common.addNewAsset")}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Asset Name *
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
                          Category *
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        >
                          <option value="">{t("common.selectCategory")}</option>
                          <option value="IT Equipment">
                            {t("requests.categories.itEquipment")}
                          </option>
                          <option value="Office Furniture">
                            Office Furniture
                          </option>
                          <option value="Office Supplies">
                            Office Supplies
                          </option>
                          <option value="Maintenance">
                            {t("common.categories.maintenance")}
                          </option>
                          <option value="Other">
                            {t("common.categories.other")}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Color
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
                          Location
                        </label>
                        <input
                          type="text"
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
                          Status *
                        </label>
                        <select
                          required
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({ ...formData, status: e.target.value })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        >
                          <option value="not_received">
                            {t("common.status.notReceived")}
                          </option>
                          <option value="received">
                            {t("common.status.received")}
                          </option>
                          <option value="needs_repair">
                            {t("common.status.needsRepair")}
                          </option>
                          <option value="needs_replacement">
                            {t("common.status.needsReplacement")}
                          </option>
                          <option value="repairing">
                            {t("common.status.repairing")}
                          </option>
                          <option value="replacing">
                            {t("common.status.replacing")}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Supplier
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Purchase Cost (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.purchase_cost}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchase_cost: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Purchase Date
                        </label>
                        <input
                          type="date"
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
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

                    <div className="flex justify-end space-x-3 pt-4">
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
                            notes: "",
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {editingAsset
                          ? t("common.updateAsset")
                          : t("common.createAsset")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Asset Detail Modal */}
      {showDetailModal && selectedAsset && (
        <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]">
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white max-h-[85vh] overflow-y-auto shadow-xl border border-gray-200 p-5">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Asset Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asset Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAsset.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asset Code
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {selectedAsset.asset_code}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                      selectedAsset.category
                    )}`}
                  >
                    {selectedAsset.category}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      selectedAsset.status
                    )}`}
                  >
                    {formatStatusLabel(selectedAsset.status)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Method
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(
                      selectedAsset.method
                    )}`}
                  >
                    {formatMethodLabel(selectedAsset.method)}
                  </span>
                </div>

                {selectedAsset.color && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                      <p className="text-sm text-gray-900">
                        {selectedAsset.color}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAsset.supplier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Supplier
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAsset.supplier}
                    </p>
                  </div>
                )}

                {selectedAsset.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAsset.location}
                    </p>
                  </div>
                )}

                {selectedAsset.purchase_cost && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Purchase Cost
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      Rp {selectedAsset.purchase_cost.toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedAsset.purchase_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Purchase Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(
                        new Date(selectedAsset.purchase_date),
                        "MMM dd, yyyy"
                      )}
                    </p>
                  </div>
                )}

                {selectedAsset.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAsset.notes}
                    </p>
                  </div>
                )}

                {(selectedAsset.receipt_proof_path ||
                  selectedAsset.repair_proof_path) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Proof Images
                    </label>
                    <div className="mt-2 space-y-2">
                      {selectedAsset.receipt_proof_path && (
                        <img
                          src={fileUrl(selectedAsset.receipt_proof_path)}
                          alt="Receipt proof"
                          className="w-full rounded border"
                        />
                      )}
                      {selectedAsset.repair_proof_path && (
                        <img
                          src={fileUrl(selectedAsset.repair_proof_path)}
                          alt="Repair/Replacement proof"
                          className="w-full rounded border"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

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
      )}
    </div>
  );
};

export default AdminAssets;
