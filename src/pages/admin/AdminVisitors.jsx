import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import {
  User,
  Clock,
  CheckCircle,
  Search,
  Plus,
  Edit,
  Trash,
  Building,
  X,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import Dropdown from "../../components/Dropdown";
import SimpleChart from "../../components/SimpleChart";
import SkeletonLoader from "../../components/SkeletonLoader";
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

const AdminVisitors = () => {
  const { t } = useTranslation();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "check_in", "checkout"
  const [chartDateRange, setChartDateRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 7 days ago
    end: new Date().toISOString().split("T")[0], // today
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    purpose: "",
    meet_with: "",
    origin: "",
    ktp_image: null,
    is_representative: false,
    group_size: "",
    represented_names: "",
    ktp_scan_source: "",
    ktp_device_id: "",
    ktp_number: "",
    priority: "regular",
    priority_detail: "",
    represented_names_list: [],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 15,
    total: 0,
  });
  const [chartData, setChartData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const formatStatusLabel = (status) => {
    if (!status) return "Unknown";

    switch (status) {
      case "in_building":
        return "Check In";
      case "checked_out":
        return "Checked Out";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "in_building":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "checked_out":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in_building":
        return "bg-blue-100 text-blue-800";
      case "checked_out":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      // Append only changed fields when editing
      const should = (key) =>
        !editingVisitor ||
        (formData[key] !== undefined &&
          formData[key] !== (editingVisitor[key] || ""));
      if (should("name")) fd.append("name", formData.name);
      if (should("meet_with")) fd.append("meet_with", formData.meet_with);
      if (should("purpose")) fd.append("purpose", formData.purpose);
      if (should("origin") && formData.origin)
        fd.append("origin", formData.origin);
      if (
        formData.ktp_scan_source === "upload" &&
        (!editingVisitor || formData.ktp_image)
      ) {
        fd.append("ktp_image", formData.ktp_image);
      }

      // Additional optional fields
      if (formData.is_representative) fd.append("is_representative", "1");
      if (formData.group_size)
        fd.append("group_size", String(formData.group_size));
      // Prefer list; fall back to string
      if (
        Array.isArray(formData.represented_names_list) &&
        formData.represented_names_list.length > 0
      ) {
        formData.represented_names_list.forEach((name, idx) => {
          if (name) fd.append(`represented_names[${idx}]`, name);
        });
      } else if (formData.represented_names) {
        fd.append("represented_names", formData.represented_names);
      }
      if (formData.ktp_scan_source)
        fd.append("ktp_scan_source", formData.ktp_scan_source);
      if (formData.ktp_device_id)
        fd.append("ktp_device_id", formData.ktp_device_id);
      if (formData.ktp_number) fd.append("ktp_number", formData.ktp_number);
      if (formData.priority) fd.append("priority", formData.priority);
      if (formData.priority_detail)
        fd.append("priority_detail", formData.priority_detail);

      if (editingVisitor) {
        // method spoofing for multipart
        fd.append("_method", "PATCH");
        await api.post(`/visitors/${editingVisitor.id}`, fd, { isForm: true });
      } else {
        await api.post("/visitors", fd, { isForm: true });
      }
      await loadVisitors(pagination.page);
      setFormData({
        name: "",
        purpose: "",
        meet_with: "",
        origin: "",
        ktp_image: null,
        is_representative: false,
        group_size: "",
        represented_names: "",
        ktp_scan_source: "",
        ktp_device_id: "",
        ktp_number: "",
        priority: "regular",
        priority_detail: "",
        represented_names_list: [],
      });
      setShowModal(false);
      setEditingVisitor(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to record visitor");
    }
  };

  const handleEdit = (visitor) => {
    setEditingVisitor(visitor);
    setFormData({
      name: visitor.name || "",
      purpose: visitor.purpose || "",
      meet_with: visitor.meet_with || visitor.person_to_meet || "",
      origin: visitor.origin || "",
      ktp_image: null,
      priority: visitor.priority || "regular",
      priority_detail: visitor.priority_detail || "",
      represented_names_list: Array.isArray(visitor.represented_names)
        ? visitor.represented_names
        : (visitor.represented_names || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    });
    setShowModal(true);
  };

  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor);
    setShowDetailModal(true);
  };

  const handleCheckOut = async (id) => {
    try {
      await api.post(`/visitors/${id}/check-out`);
      await loadVisitors(pagination.page);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to check out");
    }
  };

  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch =
      (visitor.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.origin || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.meet_with || visitor.person_to_meet || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesDate =
      !dateFilter ||
      new Date(visitor.check_in).toISOString().split("T")[0] === dateFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "check_in" && !visitor.check_out) ||
      (statusFilter === "checkout" && visitor.check_out);
    return matchesSearch && matchesDate && matchesStatus;
  });

  const inBuildingCount = visitors.filter((v) => !v.check_out).length;
  const checkoutCount = visitors.filter((v) => v.check_out).length;

  const loadVisitors = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/visitors?per_page=${pagination.per_page}&page=${page}`
      );
      // Laravel resource collection pagination shape
      const collection = res.data;
      const items = Array.isArray(collection?.data)
        ? collection.data
        : Array.isArray(collection)
        ? collection
        : [];
      setVisitors(items);
      if (collection?.meta) {
        setPagination({
          page: collection.meta.current_page,
          per_page: collection.meta.per_page,
          total: collection.meta.total,
        });
      } else if (collection?.current_page) {
        setPagination({
          page: collection.current_page,
          per_page: collection.per_page,
          total: collection.total,
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop camera when modal closes or scan source changes away from manual
  useEffect(() => {
    if (!showModal || formData.ktp_scan_source !== "manual") {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, formData.ktp_scan_source]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStream(stream);
    } catch {
      alert(t("notifications.cameraAccessDenied"));
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `ktp_capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setFormData((prev) => ({ ...prev, ktp_image: file }));
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Load trend chart - show visitor counts by date range
  useEffect(() => {
    if (visitors.length > 0) {
      // Group visitors by date
      const dateGroups = {};
      visitors.forEach((visitor) => {
        const date = new Date(visitor.check_in).toISOString().split("T")[0];
        if (!dateGroups[date]) {
          dateGroups[date] = 0;
        }
        dateGroups[date]++;
      });

      // Generate date range
      const startDate = new Date(chartDateRange.start);
      const endDate = new Date(chartDateRange.end);
      const dateRange = [];

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        dateRange.push({
          date: dateStr,
          count: dateGroups[dateStr] || 0,
        });
      }

      setChartData({
        labels: dateRange.map((d) => {
          const date = new Date(d.date);
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }),
        datasets: [
          {
            label: "Visitors",
            data: dateRange.map((d) => d.count),
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: "rgb(59, 130, 246)",
          },
        ],
      });
    }
  }, [visitors, chartDateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Visitor Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage visitor check-ins and check-outs
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Check In Visitor
        </button>
      </div>

      {/* Trend Chart */}
      <div className="card">
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-0">
              Visitor Trends
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">
                  {t("visitors.from")}:
                </label>
                <input
                  type="date"
                  value={chartDateRange.start}
                  onChange={(e) =>
                    setChartDateRange((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">To:</label>
                <input
                  type="date"
                  value={chartDateRange.end}
                  onChange={(e) =>
                    setChartDateRange((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="h-40">
            {loading ? (
              <div className="h-40 bg-gray-200 rounded-lg animate-pulse"></div>
            ) : chartData ? (
              <SimpleChart
                type="line"
                data={chartData}
                height={160}
                options={{
                  plugins: {
                    tooltip: {
                      enabled: true,
                      mode: "index",
                      intersect: false,
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      titleColor: "white",
                      bodyColor: "white",
                      borderColor: "rgb(59, 130, 246)",
                      borderWidth: 1,
                      displayColors: false,
                    },
                  },
                  hover: {
                    mode: "index",
                    intersect: false,
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: "rgba(0, 0, 0, 0.1)",
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                {t("meetings.noData")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("common.placeholders.searchVisitors")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            />
          </div>
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
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
                    <User className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Visitors
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {visitors.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                setStatusFilter(
                  statusFilter === "check_in" ? "all" : "check_in"
                )
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === "check_in"
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : ""
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Clock
                      className={`h-8 w-8 ${
                        statusFilter === "check_in"
                          ? "text-blue-500"
                          : "text-blue-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Check In
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {inBuildingCount}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                setStatusFilter(
                  statusFilter === "checkout" ? "all" : "checkout"
                )
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === "checkout"
                  ? "ring-2 ring-green-500 bg-green-50"
                  : ""
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <CheckCircle
                      className={`h-8 w-8 ${
                        statusFilter === "checkout"
                          ? "text-green-500"
                          : "text-green-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Checkout
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {checkoutCount}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Visitor List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {!loading &&
              !error &&
              filteredVisitors.map((visitor) => (
                <li
                  key={visitor.id}
                  className="px-3 sm:px-6 py-4 hover:bg-gray-50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 hover:shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(
                          visitor.check_out ? "checked_out" : "in_building"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                            {visitor.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              visitor.check_out ? "checked_out" : "in_building"
                            )}`}
                          >
                            {formatStatusLabel(
                              visitor.check_out ? "checked_out" : "in_building"
                            )}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            <span className="truncate">{visitor.origin}</span>
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span className="truncate">
                              Meet:{" "}
                              {visitor.meet_with || visitor.person_to_meet}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {visitor.purpose}
                        </p>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                          {visitor.check_in && (
                            <span>
                              Check-in:{" "}
                              {format(
                                new Date(visitor.check_in),
                                "MMM dd, yyyy HH:mm"
                              )}
                            </span>
                          )}
                          {visitor.check_out && (
                            <span>
                              Check-out:{" "}
                              {format(
                                new Date(visitor.check_out),
                                "MMM dd, yyyy HH:mm"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      {(visitor.status ||
                        (visitor.check_out ? "checked_out" : "checked_in")) ===
                        "checked_in" && (
                        <button
                          onClick={() => handleCheckOut(visitor.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Check Out
                        </button>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(visitor)}
                          className="text-blue-600 hover:text-blue-800"
                          title={t("common.viewDetails")}
                        >
                          <User className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleEdit(visitor)}
                          className="text-accent-600 hover:text-accent-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={async () => {
                            if (!confirm(t("common.deleteVisitor"))) return;
                            try {
                              await api.delete(`/visitors/${visitor.id}`);
                              await loadVisitors(pagination.page);
                            } catch (e) {
                              alert(
                                e?.response?.data?.message ||
                                  t("errors.deleteError")
                              );
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          style={{ margin: 0, padding: 0 }}
        >
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6">
            <div className="mt-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-5 text-center">
                {editingVisitor
                  ? t("common.editVisitor")
                  : t("common.checkInVisitor")}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Single / Multiple Toggle */}
                <div className="flex items-center justify-center">
                  <div className="w-full max-w-xs">
                    <div className="text-xs mb-1 text-gray-700">
                      {t("visitors.mode")}
                    </div>
                    <div className="grid grid-cols-2 bg-gray-200 rounded-full p-1 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_representative: false,
                            group_size: "",
                            represented_names: "",
                          }))
                        }
                        className={`py-1 rounded-full transition-all duration-300 ${
                          !formData.is_representative
                            ? "bg-accent-600 text-white shadow"
                            : "text-gray-700"
                        }`}
                      >
                        Single
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_representative: true,
                          }))
                        }
                        className={`py-1 rounded-full transition-all duration-300 ${
                          formData.is_representative
                            ? "bg-accent-600 text-white shadow"
                            : "text-gray-700"
                        }`}
                      >
                        Multiple
                      </button>
                    </div>
                  </div>
                </div>

                {/* DETAILS VISITOR */}
                <div className="pb-1">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Details Visitor
                  </h4>
                </div>
                {/* Two-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Visitor Name
                    </label>
                    <input
                      type="text"
                      required={!editingVisitor}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Origin
                    </label>
                    <input
                      type="text"
                      required={false}
                      value={formData.origin}
                      onChange={(e) =>
                        setFormData({ ...formData, origin: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Purpose
                    </label>
                    <textarea
                      rows={2}
                      required={!editingVisitor}
                      value={formData.purpose}
                      onChange={(e) => {
                        setFormData({ ...formData, purpose: e.target.value });
                        const el = e.target;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                      onInput={(e) => {
                        const el = e.target;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md resize-none overflow-hidden"
                      placeholder={t("common.placeholders.meetingPurpose")}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Meet With
                    </label>
                    <input
                      type="text"
                      required={!editingVisitor}
                      value={formData.meet_with}
                      onChange={(e) =>
                        setFormData({ ...formData, meet_with: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                      placeholder={t("common.placeholders.visitorName")}
                    />
                  </div>

                  {/* Separate section: Priority */}
                  <div className="md:col-span-2">
                    <hr className="my-1" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Priority
                    </h4>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Priority
                    </label>
                    <Dropdown
                      value={formData.priority}
                      onChange={(val) =>
                        setFormData({ ...formData, priority: val })
                      }
                      options={[
                        { value: "regular", label: "Regular" },
                        { value: "vip", label: "VIP" },
                        { value: "vvip", label: "VVIP" },
                      ]}
                      placeholder={t("common.placeholders.selectPriority")}
                      searchable={false}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Priority Detail
                    </label>
                    <input
                      type="text"
                      value={formData.priority_detail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority_detail: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                      placeholder={t("common.placeholders.originCompany")}
                    />
                  </div>

                  {/* Separate section: Group Check-in (only for Multiple) */}
                  {formData.is_representative && (
                    <>
                      <div className="md:col-span-2">
                        <hr className="my-1" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Group Check-in
                        </h4>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Group Size
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formData.group_size}
                          onChange={(e) => {
                            const newSize = Math.max(
                              1,
                              parseInt(e.target.value || "0", 10)
                            );
                            const list = Array.from(
                              { length: newSize },
                              (_, i) =>
                                formData.represented_names_list?.[i] || ""
                            );
                            setFormData({
                              ...formData,
                              group_size: String(newSize),
                              represented_names_list: list,
                            });
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Group Members
                        </label>
                        <div className="mt-1 space-y-2">
                          {Array.from({
                            length: Math.max(
                              1,
                              parseInt(formData.group_size || "1", 10)
                            ),
                          }).map((_, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={
                                formData.represented_names_list?.[idx] || ""
                              }
                              onChange={(e) => {
                                const list = [
                                  ...(formData.represented_names_list || []),
                                ];
                                list[idx] = e.target.value;
                                setFormData({
                                  ...formData,
                                  represented_names_list: list,
                                });
                              }}
                              className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                              placeholder={`Member ${idx + 1} name`}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Evidence */}
                  <div className="md:col-span-2">
                    <hr className="my-1" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Evidence
                    </h4>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      KTP
                    </label>
                    <Dropdown
                      value={formData.ktp_scan_source}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          ktp_scan_source: val,
                          ...(val !== "upload" ? { ktp_image: null } : {}),
                        })
                      }
                      placeholder={t("common.placeholders.selectSource")}
                      options={[
                        { value: "manual", label: "Manual" },
                        { value: "upload", label: "Upload" },
                        { value: "hardware", label: "Hardware (optional)" },
                      ]}
                      searchable={false}
                      className="mt-1"
                    />
                  </div>

                  {formData.ktp_scan_source === "manual" && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Manual Capture
                      </label>
                      <div className="mt-1 border border-dashed border-blue-300 bg-blue-50/30 rounded-md p-3">
                        {!cameraStream ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                          >
                            Open Camera
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <video ref={videoRef} className="w-full rounded" />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                              >
                                Capture
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (cameraStream) {
                                    cameraStream
                                      .getTracks()
                                      .forEach((t) => t.stop());
                                    setCameraStream(null);
                                  }
                                }}
                                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                              >
                                Close Camera
                              </button>
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                        )}
                        {formData.ktp_image && (
                          <p className="mt-2 text-xs text-gray-600 truncate">
                            Selected: {formData.ktp_image.name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.ktp_scan_source === "upload" && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        KTP Image
                      </label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const f = e.dataTransfer.files?.[0];
                          if (!f) return;
                          const isImage = f.type.startsWith("image/");
                          const under5mb = f.size <= 5 * 1024 * 1024;
                          if (!isImage) {
                            setUploadError(t("errors.mustBeImageFile"));
                            return;
                          }
                          if (!under5mb) {
                            setUploadError(t("errors.maxFileSize5MB"));
                            return;
                          }
                          setUploadError("");
                          setFormData({ ...formData, ktp_image: f });
                        }}
                        className={`mt-1 border-2 border-dashed rounded-lg p-5 text-center transition-colors duration-200 ${
                          isDragging
                            ? "border-blue-500 bg-blue-50"
                            : "border-blue-300 bg-blue-50/40"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-blue-500" />
                          <p className="text-sm font-medium text-gray-700">
                            Drop your image here
                          </p>
                          <p className="text-xs text-gray-500">
                            Format: JPG/PNG, Maks 5MB. Drag & drop atau klik
                            Browse
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-xs shadow-sm"
                          >
                            Choose Image
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const isImage = f.type.startsWith("image/");
                              const under5mb = f.size <= 5 * 1024 * 1024;
                              if (!isImage) {
                                setUploadError(t("errors.mustBeImageFile"));
                                return;
                              }
                              if (!under5mb) {
                                setUploadError(t("errors.maxFileSize5MB"));
                                return;
                              }
                              setUploadError("");
                              setFormData({ ...formData, ktp_image: f });
                            }}
                            className="hidden"
                          />
                          {formData.ktp_image && (
                            <p className="mt-2 text-xs text-gray-600 truncate">
                              Selected: {formData.ktp_image.name}
                            </p>
                          )}
                          {uploadError && (
                            <p className="mt-2 text-xs text-red-600">
                              {uploadError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.ktp_scan_source === "hardware" && (
                    <>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Device ID
                        </label>
                        <input
                          type="text"
                          value={formData.ktp_device_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ktp_device_id: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                          KTP Number (NIK)
                        </label>
                        <input
                          type="text"
                          value={formData.ktp_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ktp_number: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white transition-all duration-300 ease-in-out shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:shadow-md"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingVisitor(null);
                      setFormData({
                        name: "",
                        purpose: "",
                        meet_with: "",
                        origin: "",
                        ktp_image: null,
                        is_representative: false,
                        group_size: "",
                        represented_names: "",
                        ktp_scan_source: "",
                        ktp_device_id: "",
                        ktp_number: "",
                        priority: "regular",
                        priority_detail: "",
                        represented_names_list: [],
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary px-4 py-2">
                    {editingVisitor ? "Update" : "Check In"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Detail Modal */}
      {showDetailModal && selectedVisitor && (
        <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-sm rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Visitor Details
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Visitor Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.name || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Origin
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.origin || "Not specified"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Purpose
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.purpose || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority Detail
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.priority_detail || "-"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(selectedVisitor.priority || "regular")
                      .toString()
                      .toUpperCase()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Meet With
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.meet_with ||
                      selectedVisitor.person_to_meet ||
                      "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      selectedVisitor.check_out ? "checked_out" : "in_building"
                    )}`}
                  >
                    {formatStatusLabel(
                      selectedVisitor.check_out ? "checked_out" : "in_building"
                    )}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-in Time
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.check_in
                      ? format(
                          new Date(selectedVisitor.check_in),
                          "MMM dd, yyyy HH:mm"
                        )
                      : "Not available"}
                  </p>
                </div>

                {selectedVisitor.check_out && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Check-out Time
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(
                        new Date(selectedVisitor.check_out),
                        "MMM dd, yyyy HH:mm"
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Visit Duration
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.visit_time || "Not calculated"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Visitor ID
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    #{selectedVisitor.id || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sequence
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.sequence || "N/A"}
                  </p>
                </div>

                {selectedVisitor.ktp_ocr && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      KTP OCR Data
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedVisitor.ktp_ocr, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedVisitor.ktp_image &&
                  selectedVisitor.ktp_image.exists && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        KTP Image
                      </label>
                      <div className="mt-1">
                        <img
                          src={selectedVisitor.ktp_image.url}
                          alt="KTP"
                          className="h-32 w-auto object-contain border border-gray-300 rounded"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVisitor.created_at
                      ? format(
                          new Date(selectedVisitor.created_at),
                          "MMM dd, yyyy HH:mm"
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
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

export default AdminVisitors;
