import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  MessageSquare,
  Pencil,
  Trash2,
  User,
  DollarSign,
  ChevronDown,
  Check,
  ShoppingCart,
  Truck,
  PackageCheck,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../../components/SkeletonLoader";
import SimpleChart from "../../components/SimpleChart";
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

const AdminRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [nextAssetCode, setNextAssetCode] = useState("");
  const [note, setNote] = useState("");
  const [editForm, setEditForm] = useState({
    item_name: "",
    quantity: 1,
    estimated_cost: "",
    category: "",
    reason: "",
    ga_note: "",
  });
  const formatCurrencyId = (value) => {
    if (value === null || value === undefined) return "";
    const digits = String(value).replace(/[^0-9]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusSearchTerm, setStatusSearchTerm] = useState("");
  const [statusPreselected, setStatusPreselected] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [categoryPreselected, setCategoryPreselected] = useState("all");
  const statusDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const [chartPeriod, setChartPeriod] = useState("1M");
  const [periodPreselected, setPeriodPreselected] = useState("1M");
  const [openActionForId, setOpenActionForId] = useState(null);
  const [actionMenuDirection, setActionMenuDirection] = useState("down"); // 'down' | 'up'

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

  useEffect(() => {
    if (showCategoryDropdown && categoryDropdownRef.current) {
      const selectedElement = categoryDropdownRef.current.querySelector(
        `[data-value="${categoryPreselected}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [categoryPreselected, showCategoryDropdown]);

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  // Lock body scroll while any modal is open
  useEffect(() => {
    const anyOpen = showNoteModal || showDetailModal || showApproveModal;
    if (anyOpen) {
      const previous = document.body.style.overflow;
      document.body.dataset.prevOverflow = previous;
      document.body.style.overflow = "hidden";
    } else {
      if (document.body.dataset.prevOverflow !== undefined) {
        document.body.style.overflow = document.body.dataset.prevOverflow;
        delete document.body.dataset.prevOverflow;
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showNoteModal, showDetailModal, showApproveModal]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "approved":
        // Show as procurement icon for approved items
        return <ShoppingCart className="h-5 w-5 text-blue-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "procurement":
        return <ShoppingCart className="h-5 w-5 text-blue-500" />;
      case "not_received":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "purchased":
        return <Truck className="h-5 w-5 text-purple-500" />;
      case "completed":
        return <PackageCheck className="h-5 w-5 text-emerald-500" />;
      case "received":
        return <Package className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        // Style approved as procurement
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "procurement":
        return "bg-blue-100 text-blue-800";
      case "not_received":
        return "bg-orange-100 text-orange-800";
      case "purchased":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "received":
        return "bg-green-100 text-green-800";
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
      case "Other":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : `User ${userId}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return "Rp 0";
    return `Rp ${Number(amount).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "approved":
        // Display approved as In Procurement per flow
        return "In Procurement";
      case "rejected":
        return "Rejected";
      case "procurement":
        return "In Procurement";
      case "not_received":
        return "Not Received";
      case "purchased":
        return "Purchased";
      case "completed":
        return "Completed";
      case "received":
        return "Received";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-dropdown]")) {
        setShowStatusDropdown(false);
        setShowCategoryDropdown(false);
        setShowPeriodDropdown(false);
        setStatusSearchTerm("");
        setCategorySearchTerm("");
        setOpenActionForId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [requestsRes, usersRes] = await Promise.all([
          api.get("/requests"),
          api.get("/users"),
        ]);
        if (!cancelled) {
          setRequests(requestsRes.data || []);
          setUsers(usersRes.data || []);
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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

  const handleApprove = async (id) => {
    try {
      await api.patch(`/requests/${id}/approve`, {
        ga_note: note || undefined,
      });
      // Update the local state instead of refetching
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id
            ? { ...req, status: "approved", ga_note: note || undefined }
            : req
        )
      );
      alert("Request approved and asset created successfully!");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to approve");
    }
  };

  const handleApproveWithModal = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleSubmitApprove = async () => {
    if (selectedRequest) {
      await handleApprove(selectedRequest.id);
      setShowApproveModal(false);
      setSelectedRequest(null);
      setNote("");
    }
  };

  // Load next asset code preview when opening approve modal
  useEffect(() => {
    async function fetchNextCode() {
      try {
        if (showApproveModal && selectedRequest) {
          const res = await api.get(`/assets/next-code`, {
            params: {
              category: selectedRequest.category || "Other",
              context: "request",
            },
          });
          setNextAssetCode((res && res.data && res.data.asset_code) || "");
        } else {
          setNextAssetCode("");
        }
      } catch {
        setNextAssetCode("");
      }
    }
    fetchNextCode();
  }, [showApproveModal, selectedRequest]);

  const handleReject = async (id) => {
    try {
      await api.patch(`/requests/${id}/reject`, { ga_note: note || undefined });
      // Update the local state instead of refetching
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id
            ? { ...req, status: "rejected", ga_note: note || undefined }
            : req
        )
      );
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to reject");
    }
  };

  const handleAddNote = (request) => {
    setSelectedRequest(request);
    setNote(request.ga_note || "");
    setShowNoteModal(true);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setEditForm({
      item_name: request.item_name || "",
      quantity: request.quantity || 1,
      estimated_cost: request.estimated_cost || "",
      category: request.category || "",
      reason: request.reason || "",
      ga_note: request.ga_note || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest) return;
    try {
      const payload = {
        ...editForm,
        estimated_cost: editForm.estimated_cost
          ? parseFloat(String(editForm.estimated_cost).replace(/\./g, ""))
          : 0,
      };
      await api.patch(`/requests/${selectedRequest.id}`, payload);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id ? { ...r, ...payload } : r
        )
      );
      setShowEditModal(false);
      setSelectedRequest(null);
    } catch (e) {
      alert(
        (e && e.response && e.response.data && e.response.data.message) ||
          "Failed to save"
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    try {
      await api.delete(`/requests/${id}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(
        (e && e.response && e.response.data && e.response.data.message) ||
          "Failed to delete"
      );
    }
  };

  const handleSaveNote = async () => {
    if (!selectedRequest) return;
    try {
      // save note by reusing approve without changing status is not ideal; keeping modal for UX only
      await api.patch(
        `/requests/${selectedRequest.id}/${
          selectedRequest.status === "rejected" ? "reject" : "approve"
        }`,
        { ga_note: note }
      );
      // Update the local state instead of refetching
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id ? { ...req, ga_note: note } : req
        )
      );
      setShowNoteModal(false);
      setSelectedRequest(null);
      setNote("");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to save note");
    }
  };

  // Helper function to check if request matches period filter
  const matchesPeriod = useCallback(
    (request) => {
      if (!request.created_at) return true;

      const requestDate = new Date(request.created_at);
      const now = new Date();

      switch (chartPeriod) {
        case "7D": {
          const sevenDaysAgo = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
          );
          return requestDate >= sevenDaysAgo;
        }
        case "1M": {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return requestDate >= startOfMonth && requestDate <= endOfMonth;
        }
        case "1Y": {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31);
          return requestDate >= startOfYear && requestDate <= endOfYear;
        }
        case "custom": {
          if (!customDateRange.start || !customDateRange.end) return true;
          const startDate = new Date(customDateRange.start);
          const endDate = new Date(customDateRange.end);
          return requestDate >= startDate && requestDate <= endDate;
        }
        default:
          return true;
      }
    },
    [chartPeriod, customDateRange.start, customDateRange.end]
  );

  // Filter for statistics and chart (only period filter), memoized to avoid re-renders
  const periodFilteredRequests = useMemo(() => {
    return requests.filter((request) => matchesPeriod(request));
  }, [requests, matchesPeriod]);

  // Filter for request list (all filters)
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      (request.item_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(request.user_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" ||
      (request.category || "General") === categoryFilter;
    const matchesPeriodFilter = matchesPeriod(request);
    return (
      matchesSearch && matchesStatus && matchesCategory && matchesPeriodFilter
    );
  });

  const totalValue = periodFilteredRequests
    .filter(
      (req) =>
        req.status === "approved" ||
        req.status === "procurement" ||
        req.status === "purchased" ||
        req.status === "completed" ||
        req.status === "not_received" ||
        req.status === "received"
    )
    .reduce((sum, req) => sum + (Number(req.estimated_cost) || 0), 0);

  // Compute chart data via useMemo to prevent update loops
  const chartData = useMemo(() => {
    const generateChartData = (period) => {
      const currentDate = new Date();
      let periods = [];

      switch (period) {
        case "7D":
          // Last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            periods.push({
              date: new Date(date),
              label: format(date, "MMM dd"),
              value: 0,
              statusCounts: {
                pending: 0,
                approved: 0,
                rejected: 0,
                procurement: 0,
                not_received: 0,
                purchased: 0,
                completed: 0,
                received: 0,
              },
            });
          }
          break;

        case "1M": {
          // Current month (1st to last day of current month)
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          const daysInMonth = new Date(
            currentYear,
            currentMonth + 1,
            0
          ).getDate();

          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            periods.push({
              date: new Date(date),
              label: format(date, "MMM dd"),
              value: 0,
              statusCounts: {
                pending: 0,
                approved: 0,
                rejected: 0,
                procurement: 0,
                not_received: 0,
                purchased: 0,
                completed: 0,
                received: 0,
              },
            });
          }
          break;
        }

        case "1Y": {
          // Current year (January to December)
          const currentYear = currentDate.getFullYear();

          for (let month = 0; month < 12; month++) {
            const date = new Date(currentYear, month, 1);
            periods.push({
              date: new Date(date),
              label: format(date, "MMM yyyy"),
              value: 0,
              statusCounts: {
                pending: 0,
                approved: 0,
                rejected: 0,
                procurement: 0,
                not_received: 0,
                purchased: 0,
                completed: 0,
                received: 0,
              },
            });
          }
          break;
        }

        case "custom":
          if (customDateRange.start && customDateRange.end) {
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Limit to 30 days for performance
            const maxDays = Math.min(diffDays, 30);

            for (let i = maxDays - 1; i >= 0; i--) {
              const date = new Date(endDate);
              date.setDate(date.getDate() - i);
              periods.push({
                date: new Date(date),
                label: format(date, "MMM dd"),
                value: 0,
                statusCounts: {
                  pending: 0,
                  approved: 0,
                  rejected: 0,
                  procurement: 0,
                  not_received: 0,
                  purchased: 0,
                  completed: 0,
                  received: 0,
                },
              });
            }
          }
          break;

        default:
          return null;
      }

      // Calculate spending and status counts for each period
      periodFilteredRequests.forEach((request) => {
        const requestDate = new Date(request.created_at);

        periods.forEach((period) => {
          let isMatch = false;

          // Different matching logic based on period type
          if (chartPeriod === "1Y") {
            // For yearly view, match by month and year
            isMatch =
              period.date.getMonth() === requestDate.getMonth() &&
              period.date.getFullYear() === requestDate.getFullYear();
          } else {
            // For daily views (7D, 1M, custom), match by exact date
            isMatch = period.date.toDateString() === requestDate.toDateString();
          }

          if (isMatch) {
            // Count status as-is
            if (
              Object.prototype.hasOwnProperty.call(
                period.statusCounts,
                request.status
              )
            ) {
              period.statusCounts[request.status]++;
            }

            // Add to spending only for approved requests
            if (
              request.status === "approved" ||
              request.status === "procurement" ||
              request.status === "purchased" ||
              request.status === "completed" ||
              request.status === "not_received" ||
              request.status === "received"
            ) {
              period.value += Number(request.estimated_cost) || 0;
            }
          }
        });
      });

      return {
        labels: periods.map((p) => p.label),
        periods: periods, // Store full period data for tooltip
        datasets: [
          {
            data: periods.map((p) => p.value),
            borderColor: "rgb(239, 68, 68)", // Red color
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: "rgb(239, 68, 68)",
            pointBorderColor: "rgb(239, 68, 68)",
          },
        ],
      };
    };

    return generateChartData(chartPeriod);
  }, [
    periodFilteredRequests,
    chartPeriod,
    customDateRange.start,
    customDateRange.end,
  ]);

  return (
    <div className="space-y-6 pb-24 sm:pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {t('nav.adminRequests')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {t('requests.subtitle')}
        </p>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div className="card">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('requests.requestTrends')}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {periodFilteredRequests.length} {t('requests.totalRequests')}
                      </dd>
                    </dl>
                    <div className="mt-2 text-xs text-gray-500">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>
                          Pending:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "pending"
                            ).length
                          }
                        </p>
                        <p>
                          Approved:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "approved"
                            ).length
                          }
                        </p>
                        <p>
                          Rejected:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "rejected"
                            ).length
                          }
                        </p>
                        <p>
                          Procurement:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "procurement"
                            ).length
                          }
                        </p>
                        <p>
                          Purchased:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "purchased"
                            ).length
                          }
                        </p>
                        <p>
                          Completed:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "completed"
                            ).length
                          }
                        </p>
                        <p>
                          Received:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "received"
                            ).length
                          }
                        </p>
                        <p>
                          Not Received:{" "}
                          {
                            periodFilteredRequests.filter(
                              (r) => r.status === "not_received"
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-center mt-5">
                  <div className="flex-shrink-0 align-center">
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1 mt-3">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Value
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(totalValue)}
                      </dd>
                    </dl>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Based on approved requests only</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Period Filter */}
      <div className="card p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('requests.filterPeriod')}
          </h3>
          <div className="relative" data-dropdown="period">
            <button
              type="button"
              onClick={() => {
                setShowPeriodDropdown(!showPeriodDropdown);
                setShowStatusDropdown(false);
                setShowCategoryDropdown(false);
                setStatusSearchTerm("");
                setCategorySearchTerm("");
              }}
              onKeyDown={(e) => {
                if (showPeriodDropdown) {
                  const options = ["7D", "1M", "1Y", "custom"];

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const currentIndex = options.indexOf(periodPreselected);
                    const nextIndex =
                      currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                    setPeriodPreselected(options[nextIndex]);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const currentIndex = options.indexOf(periodPreselected);
                    const prevIndex =
                      currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                    setPeriodPreselected(options[prevIndex]);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setChartPeriod(periodPreselected);
                    setShowPeriodDropdown(false);
                  } else if (e.key === "Escape") {
                    setShowPeriodDropdown(false);
                  }
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all duration-200"
            >
              <span>
                {chartPeriod === "7D" && t('requests.last7Days')}
                {chartPeriod === "1M" && t('requests.last30Days', { defaultValue: 'Last 30 Days' })}
                {chartPeriod === "1Y" && (t('dashboard.title', { defaultValue: 'This Year' }))}
                {chartPeriod === "custom" && t('requests.customRange')}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showPeriodDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {[
                    { value: "7D", label: t('requests.last7Days') },
                    { value: "1M", label: t('requests.last30Days', { defaultValue: 'Last 30 Days' }) },
                    { value: "1Y", label: t('dashboard.title', { defaultValue: 'This Year' }) },
                    { value: "custom", label: t('requests.customRange') },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setChartPeriod(option.value);
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                        periodPreselected === option.value
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span>{option.label}</span>
                      {chartPeriod === option.value && (
                        <Check className="h-4 w-4 text-accent-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range Input */}
        {chartPeriod === "custom" && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) =>
                  setCustomDateRange((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) =>
                  setCustomDateRange((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Spending Chart */}
      <div className="card">
        <div className="p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('requests.requestTrends')}
            </h3>
          </div>

          <div className="h-32">
            {loading ? (
              <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
            ) : chartData ? (
              <SimpleChart
                type="line"
                data={chartData}
                height={128}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    intersect: false,
                    mode: "index",
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      enabled: true,
                      mode: "index",
                      intersect: false,
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      titleColor: "white",
                      bodyColor: "white",
                      borderColor: "rgb(239, 68, 68)",
                      borderWidth: 1,
                      cornerRadius: 6,
                      displayColors: false,
                      callbacks: {
                        title: function (context) {
                          return context[0].label;
                        },
                        label: function (context) {
                          const periodData =
                            chartData.periods[context.dataIndex];
                          const statusCounts = periodData.statusCounts;

                          const labels = [];

                          // Add spending info
                          labels.push(
                            `💰 Spending: ${formatCurrency(context.parsed.y)}`
                          );

                          // Add status breakdown (only show non-zero counts)
                          if (statusCounts.pending > 0) {
                            labels.push(`⏳ Pending: ${statusCounts.pending}`);
                          }
                          if (statusCounts.approved > 0) {
                            labels.push(
                              `✅ Approved: ${statusCounts.approved}`
                            );
                          }
                          if (statusCounts.rejected > 0) {
                            labels.push(
                              `❌ Rejected: ${statusCounts.rejected}`
                            );
                          }
                          if (statusCounts.procurement > 0) {
                            labels.push(
                              `🛒 In Procurement: ${statusCounts.procurement}`
                            );
                          }
                          if (statusCounts.purchased > 0) {
                            labels.push(
                              `💳 Purchased: ${statusCounts.purchased}`
                            );
                          }
                          if (statusCounts.completed > 0) {
                            labels.push(
                              `✅ Completed: ${statusCounts.completed}`
                            );
                          }
                          if (statusCounts.received > 0) {
                            labels.push(
                              `📦 Received: ${statusCounts.received}`
                            );
                          }
                          if (statusCounts.not_received > 0) {
                            labels.push(
                              `📭 Not Received: ${statusCounts.not_received}`
                            );
                          }

                          return labels;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      display: true,
                      grid: {
                        display: false,
                      },
                      ticks: {
                        maxTicksLimit: chartPeriod === "1Y" ? 12 : 8,
                      },
                    },
                    y: {
                      display: true,
                      grid: {
                        display: true,
                        color: "rgba(0, 0, 0, 0.05)",
                      },
                      ticks: {
                        callback: function (value) {
                          return formatCurrency(value);
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                {chartPeriod === "custom" &&
                (!customDateRange.start || !customDateRange.end)
                  ? t('requests.customRange')
                  : t('common.loading')}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('requests.basedOnApproved', { defaultValue: 'Based on approved requests only (excludes rejected)' })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('requests.searchRequests')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
            />
          </div>

          {/* Status Autocomplete */}
          <div className="relative" data-dropdown="status">
            <div className="relative">
              <input
                type="text"
                placeholder={statusSearchTerm ? t('todos.searchStatus') : ""}
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
                  setShowPeriodDropdown(false);
                  setCategorySearchTerm("");
                }}
                onBlur={() => {
                  // Delay to allow click on dropdown option
                  setTimeout(() => {
                    setShowStatusDropdown(false);
                    setStatusSearchTerm("");
                  }, 150);
                }}
                onKeyDown={(e) => {
                  if (showStatusDropdown) {
                    const options = [
                      { value: "all", label: "All Status" },
                      { value: "pending", label: "Pending" },
                      { value: "approved", label: "Approved" },
                      { value: "rejected", label: "Rejected" },
                      { value: "procurement", label: "In Procurement" },
                      { value: "not_received", label: "Not Received" },
                      { value: "purchased", label: "Purchased" },
                      { value: "completed", label: "Completed" },
                      { value: "received", label: "Received" },
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
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {/* Overlay text when not focused and no search term */}
              {!statusSearchTerm && !showStatusDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {statusFilter === "all"
                      ? t('todos.allStatus')
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
                  { value: "all", label: t('todos.allStatus') },
                  { value: "pending", label: t('requests.pending') },
                  { value: "approved", label: t('requests.approved') },
                  { value: "rejected", label: t('requests.rejected') },
                  { value: "procurement", label: t('common.status.inProcurement') },
                  { value: "not_received", label: t('common.status.notReceived') },
                  { value: "purchased", label: t('common.status.purchased', { defaultValue: 'Purchased' }) },
                  { value: "completed", label: t('common.completed') },
                  { value: "received", label: t('common.status.received') },
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

          {/* Category Autocomplete */}
          <div className="relative" data-dropdown="category">
            <div className="relative">
              <input
                type="text"
                placeholder={
                  categorySearchTerm ? t('todos.allCategories') : ""
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
                  setShowPeriodDropdown(false);
                  setStatusSearchTerm("");
                }}
                onBlur={() => {
                  // Delay to allow click on dropdown option
                  setTimeout(() => {
                    setShowCategoryDropdown(false);
                    setCategorySearchTerm("");
                  }, 150);
                }}
                onKeyDown={(e) => {
                  if (showCategoryDropdown) {
                    const options = [
                      { value: "all", label: "All Categories" },
                      { value: "IT Equipment", label: "IT Equipment" },
                      { value: "Office Furniture", label: "Office Furniture" },
                      { value: "Office Supplies", label: "Office Supplies" },
                      { value: "Maintenance", label: "Maintenance" },
                      { value: "General", label: "General" },
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
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {/* Overlay text when not focused and no search term */}
              {!categorySearchTerm && !showCategoryDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {categoryFilter === "all"
                      ? t('todos.allCategories')
                      : categoryFilter}
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
                  { value: "all", label: t('todos.allCategories') },
                  { value: "IT Equipment", label: "IT Equipment" },
                  { value: "Office Furniture", label: "Office Furniture" },
                  { value: "Office Supplies", label: "Office Supplies" },
                  { value: "Maintenance", label: "Maintenance" },
                  { value: "General", label: t('requests.general') },
                  { value: "Other", label: t('assets.others') },
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('requests.pending')}</p>
                    <p className="text-lg font-medium text-gray-900">
                      {
                        periodFilteredRequests.filter(
                          (r) => r.status === "pending"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('requests.completed')}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {
                        periodFilteredRequests.filter(
                          (r) => r.status === "received"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Package className="h-8 w-8 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('common.status.inProcurement')}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {
                        periodFilteredRequests.filter(
                          (r) => r.status === "approved"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow duration-200">
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('requests.rejected')}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {
                        periodFilteredRequests.filter(
                          (r) => r.status === "rejected"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Request List */}
      <div className="card">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && (
            <>
              <SkeletonLoader type="list" lines={3} />
            </>
          )}
          {error && (
            <li className="px-6 py-4 text-sm text-red-600 bg-red-50">
              {error}
            </li>
          )}
          {!loading && !error && filteredRequests.length === 0 && (
            <li className="px-6 py-4 text-sm text-gray-500 text-center">
              {t('common.noData')}
            </li>
          )}
          {!loading &&
            !error &&
            filteredRequests.map((request) => (
              <li
                key={request.id}
                className="px-3 sm:px-6 py-4 hover:bg-gray-50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 hover:shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  {/* Request Content */}
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusIcon(request.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                          {request.item_name && request.item_name.length > 50
                            ? `${request.item_name.substring(0, 50)}...`
                            : request.item_name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {formatStatusLabel(request.status)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                              request.category || "General"
                            )}`}
                          >
                            {request.category || "General"}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {request.reason && request.reason.length > 100
                          ? `${request.reason.substring(0, 100)}...`
                          : request.reason || "No reason provided"}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span className="truncate">
                            {getUserName(request.user_id)}
                          </span>
                        </div>
                        <span>Quantity: {request.quantity}</span>
                        {request.estimated_cost && (
                          <span>
                            Est. Cost: {formatCurrency(request.estimated_cost)}
                          </span>
                        )}
                        <span>
                          Created:{" "}
                          {format(new Date(request.created_at), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    {/* Approve/Reject (only for pending) */}
                    <div className="flex items-center gap-1 ml-auto justify-end w-full">
                      {request.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApproveWithModal(request)}
                            className="text-green-600 hover:text-green-900 text-xs px-2 py-1 border border-green-300 rounded"
                          >
                            {t('requests.approve')}
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="text-red-600 hover:text-red-900 text-xs px-2 py-1 border border-red-300 rounded"
                          >
                            {t('requests.reject')}
                          </button>
                        </>
                      )}

                      {/* Grouped Action Dropdown */}
                      <div className="relative" data-dropdown="actions">
                        <button
                          type="button"
                          onClick={(e) => {
                            const nextOpen =
                              openActionForId === request.id
                                ? null
                                : request.id;
                            if (nextOpen) {
                              const triggerRect =
                                e.currentTarget.getBoundingClientRect();
                              const spaceBelow =
                                window.innerHeight - triggerRect.bottom;
                              // approximate menu height; adjust as needed
                              const estimatedMenuHeight = 192; // ~4 items
                              setActionMenuDirection(
                                spaceBelow < estimatedMenuHeight ? "up" : "down"
                              );
                            }
                            setOpenActionForId(nextOpen);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                        >
                          {t('common.actions')}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              openActionForId === request.id ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {openActionForId === request.id && (
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
                                  handleViewDetails(request);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                                <span>{t('common.view')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenActionForId(null);
                                  handleAddNote(request);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                              >
                                <MessageSquare className="h-4 w-4 text-accent-600" />
                                <span>{t('common.notes')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenActionForId(null);
                                  handleEdit(request);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                              >
                                <Pencil className="h-4 w-4 text-gray-700" />
                                <span>{t('common.edit')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenActionForId(null);
                                  handleDelete(request.id);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-red-700"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <span>{t('common.delete')}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* Note Modal */}
      {showNoteModal &&
        createPortal(
          <div className="fixed inset-0 z-[1000]">
            <div
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]"
              onClick={() => {
                setShowNoteModal(false);
                setSelectedRequest(null);
                setNote("");
              }}
            />
            <div className="relative z-10 flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-xl bg-white shadow-xl ring-1 ring-black/5 max-h-[85vh] overflow-y-auto overscroll-contain">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {t('requests.addNote')}
                    {selectedRequest ? `: ${selectedRequest.item_name}` : ""}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    Write a brief note for admin reference. This does not change
                    status.
                  </p>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('requests.adminNotes')}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={5}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 placeholder:text-gray-400"
                    placeholder={t('common.notes')}
                  />
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteModal(false);
                      setSelectedRequest(null);
                      setNote("");
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 text-sm"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Detail Modal */}
      {showDetailModal &&
        selectedRequest &&
        createPortal(
          <div className="fixed inset-0 z-[1000]">
            <div
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]"
              onClick={() => {
                setShowDetailModal(false);
                setSelectedRequest(null);
              }}
            />
            <div className="relative z-10 flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl ring-1 ring-black/5 max-h-[85vh] overflow-y-auto overscroll-contain">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {t('requests.requestDetails')}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    Overview of the selected request including meta and costs.
                  </p>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {t('todos.basicInformation')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('requests.requestTitle')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.item_name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('common.quantity')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.quantity}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('common.category')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.category || "General"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('common.status')}
                        </label>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            selectedRequest.status
                          )}`}
                        >
                          {formatStatusLabel(selectedRequest.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {t('requests.requestDetails')}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('requests.notes')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.reason || "No reason provided"}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  {t('requests.requestedBy')}
                                </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {getUserName(selectedRequest.user_id)}
                          </p>
                        </div>
                        <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  {t('requests.requestDate')}
                                </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {format(
                              new Date(selectedRequest.created_at),
                              "MMM dd, yyyy HH:mm"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cost Information */}
                  {selectedRequest.estimated_cost && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {t('assets.purchasePrice')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t('requests.totalAmount')}
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {formatCurrency(selectedRequest.estimated_cost)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t('requests.totalAmount')}
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {formatCurrency(
                              selectedRequest.estimated_cost *
                                selectedRequest.quantity
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {selectedRequest.ga_note && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {t('requests.adminNotes')}
                      </h4>
                      <p className="text-sm text-gray-900">
                        {selectedRequest.ga_note}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 pt-2 flex justify-end gap-3 border-t border-gray-100">
                    <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedRequest(null);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 text-sm"
                    >
                    {t('common.close')}
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleAddNote(selectedRequest);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 text-sm"
                  >
                    {t('requests.addNote')}
                  </button>
                  {selectedRequest.status === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleApprove(selectedRequest.id);
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm"
                      >
                        {t('requests.approve')}
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleReject(selectedRequest.id);
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-sm"
                      >
                        {t('requests.reject')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Approve Modal */}
      {showApproveModal &&
        selectedRequest &&
        createPortal(
          <div className="fixed inset-0 z-[1000]">
            <div
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]"
              onClick={() => setShowApproveModal(false)}
            />
            <div className="relative z-10 flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md border border-gray-200 shadow-sm rounded-xl bg-white max-h-[85vh] overflow-y-auto overscroll-contain">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {t('requests.approveRequest')}
                    </h3>
                    {/* Close icon removed; use Cancel button below */}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('requests.requestTitle')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.item_name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('common.quantity')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.quantity}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('common.category')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.category || "General"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('requests.totalAmount')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatCurrency(selectedRequest.estimated_cost)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('requests.adminNotes')}
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        placeholder={t('common.notes')}
                      />
                    </div>

                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>{t('common.notes')}:</strong> {t('requests.approveConfirm', { defaultValue: 'Approving this request will' })}
                        create an asset with code{" "}
                        <span className="font-semibold">
                          {nextAssetCode || "..."}
                        </span>{" "}
                        {t('requests.approved', { defaultValue: 'and make it available for procurement. The asset category will follow the request\'s category automatically.' })}
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowApproveModal(false)}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSubmitApprove}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
                      >
                        {t('requests.approve')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Modal */}
      {showEditModal &&
        selectedRequest &&
        createPortal(
          <div className="fixed inset-0 z-[1000]">
            <div
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative z-10 flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md border border-gray-200 shadow-sm rounded-xl bg-white max-h-[85vh] overflow-y-auto overscroll-contain">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Edit Request
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Item Name
                      </label>
                      <input
                        value={editForm.item_name}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            item_name: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              quantity: Number(e.target.value),
                            }))
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Est. Cost
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCurrencyId(editForm.estimated_cost)}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              estimated_cost: e.target.value,
                            }))
                          }
                          placeholder="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Asset Category
                      </label>
                      <input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            category: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reason
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.reason}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, reason: e.target.value }))
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        GA Note
                      </label>
                      <textarea
                        rows={2}
                        value={editForm.ga_note}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            ga_note: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminRequests;
