import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useTranslatedLabels } from "../../hooks/useTranslatedLabels";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Users,
  User,
  Power,
  Eye,
  X,
  ChevronDown,
  Check,
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

const AdminMeetings = () => {
  const { t } = useTranslation();
  const { formatStatusLabel } = useTranslatedLabels();
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [roomPreselected, setRoomPreselected] = useState("all");
  const roomDropdownRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [chartDateRange, setChartDateRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 7 days ago
    end: new Date().toISOString().split("T")[0], // today
  });
  const [chartData, setChartData] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Auto-scroll to pre-selected option
  useEffect(() => {
    if (showRoomDropdown && roomDropdownRef.current) {
      const selectedElement = roomDropdownRef.current.querySelector(
        `[data-value="${roomPreselected}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [roomPreselected, showRoomDropdown]);

  const formatDateTime = (value) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value || "");
      return format(d, "MMM dd, yyyy HH:mm");
    } catch {
      return String(value || "");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "ongoing":
        return <Clock className="h-4 w-4 text-green-500" />;
      case "ending":
        return <CheckCircle className="h-4 w-4 text-orange-500" />;
      case "ended":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case "canceled":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "ending":
        return "bg-orange-100 text-orange-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatRoomLabel = (room) => {
    switch (room) {
      case "all":
        return t("common.allRooms");
      default:
        return room || t("common.unknown");
    }
  };

  const getUserName = (userId, user) => {
    if (user && user.name) {
      return user.name;
    }
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.name : `User ${userId}`;
  };

  const handleForceEnd = async (id) => {
    if (!window.confirm("Are you sure you want to force end this meeting?"))
      return;
    try {
      await api.patch(`/meetings/${id}/force-end`);
      const [meetingsRes, usersRes] = await Promise.all([
        api.get("/meetings"),
        api.get("/users"),
      ]);
      setMeetings(meetingsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("common.failedToForceEnd"));
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.agenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(meeting.user_id, meeting.user)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesRoom =
      roomFilter === "all" || meeting.room_name === roomFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "scheduled" && meeting.status === "scheduled") ||
      (statusFilter === "ongoing" && meeting.status === "ongoing") ||
      (statusFilter === "ended" && meeting.status === "ended") ||
      (statusFilter === "canceled" && meeting.status === "canceled");
    const matchesBookingType =
      bookingTypeFilter === "all" ||
      meeting.booking_type === bookingTypeFilter;
    const matchesDate =
      !dateFilter ||
      new Date(meeting.start_time).toISOString().split("T")[0] === dateFilter;
    return matchesSearch && matchesRoom && matchesStatus && matchesBookingType && matchesDate;
  });

  // Filter meetings by date for stats
  const getDateFilteredMeetings = (meetings) => {
    return meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.start_time)
        .toISOString()
        .split("T")[0];
      return !dateFilter || meetingDate === dateFilter;
    });
  };

  const dateFilteredMeetings = getDateFilteredMeetings(meetings);
  const ongoingMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "ongoing"
  );
  const scheduledMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "scheduled"
  );
  const endedMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "ended"
  );
  const canceledMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "canceled"
  );

  // Predefined room options - fixed list only
  const uniqueRooms = [
    "Meeting Room A (08)",
    "Meeting Room B (08)",
    "Meeting Room A (689)",
    "Meeting Room B (689)",
  ];

  // Chart data for meetings by date
  useEffect(() => {
    if (meetings.length > 0) {
      // Group meetings by date
      const dateGroups = {};
      meetings.forEach((meeting) => {
        const date = new Date(meeting.start_time).toISOString().split("T")[0];
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
            label: "Meetings",
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
  }, [meetings, chartDateRange]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [meetingsRes, usersRes, roomsRes] = await Promise.all([
          api.get("/meeting-room/bookings"), // Get all bookings (internal + public)
          api.get("/users"),
          api.get("/meeting-room/rooms"),
        ]);
        if (!cancelled) {
          setMeetings(meetingsRes.data || []);
          setUsers(usersRes.data || []);
          setRooms(roomsRes.data || []);
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || t("errors.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Meeting Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage all meetings - internal and public bookings
        </p>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div className="card">
              <div className="p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  {t("meetings.summaryMeetings")}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Overall Stats */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      {t("meetings.overall")}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          {t("meetings.totalMeetings")}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {dateFilteredMeetings.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          {t("meetings.avgDuration")}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {(() => {
                            const endedMeetings = dateFilteredMeetings.filter(
                              (m) => m.status === "ended"
                            );
                            const durations = endedMeetings.map(
                              (m) =>
                                (new Date(m.end_time) -
                                  new Date(m.start_time)) /
                                (1000 * 60)
                            );
                            if (!durations.length) return "0";
                            return Math.round(
                              durations.reduce((a, b) => a + b, 0) /
                                durations.length
                            );
                          })()}{" "}
                          min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Room Stats */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      By Room
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(() => {
                        const roomStats = {};
                        dateFilteredMeetings.forEach((meeting) => {
                          if (!roomStats[meeting.room_name]) {
                            roomStats[meeting.room_name] = {
                              count: 0,
                              durations: [],
                            };
                          }
                          roomStats[meeting.room_name].count++;
                          if (meeting.status === "ended" && meeting.end_time) {
                            const duration =
                              (new Date(meeting.end_time) -
                                new Date(meeting.start_time)) /
                              (1000 * 60);
                            roomStats[meeting.room_name].durations.push(
                              duration
                            );
                          }
                        });

                        // Always show all 4 predefined rooms
                        return uniqueRooms.map((roomName) => {
                          const stats = roomStats[roomName] || {
                            count: 0,
                            durations: [],
                          };
                          return (
                            <div
                              key={roomName}
                              className="flex justify-between items-center text-xs"
                            >
                              <span className="text-gray-600 truncate mr-2">
                                {roomName}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-900">
                                  {stats.count}
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className="font-semibold text-gray-900">
                                  {stats.durations.length > 0
                                    ? Math.round(
                                        stats.durations.reduce(
                                          (a, b) => a + b,
                                          0
                                        ) / stats.durations.length
                                      )
                                    : "0"}
                                  m
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Meeting Trends
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
          <div className="h-32 sm:h-40">
            {loading ? (
              <div className="h-32 sm:h-40 bg-gray-200 rounded-lg animate-pulse"></div>
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
                      callbacks: {
                        title: function (context) {
                          // Only show the date, not "Meetings: X"
                          return context[0].label;
                        },
                        label: function () {
                          // Hide the default label line that shows "Meetings: X"
                          return null;
                        },
                        afterBody: function (context) {
                          const dataIndex = context[0].dataIndex;
                          const totalMeetings = context[0].parsed.y;

                          if (totalMeetings === 0)
                            return [t("meetings.noMeetings")];

                          // Get the actual date from the dateRange
                          const dateRange = [];
                          const startDate = new Date(chartDateRange.start);
                          const endDate = new Date(chartDateRange.end);

                          for (
                            let d = new Date(startDate);
                            d <= endDate;
                            d.setDate(d.getDate() + 1)
                          ) {
                            const dateStr = d.toISOString().split("T")[0];
                            dateRange.push({
                              date: dateStr,
                              count: 0,
                            });
                          }

                          const targetDate = dateRange[dataIndex]?.date;
                          if (!targetDate) return [t("meetings.noData")];

                          // Get meetings for this specific date
                          const meetingsOnDate = meetings.filter((meeting) => {
                            const meetingDate = new Date(meeting.start_time)
                              .toISOString()
                              .split("T")[0];
                            return meetingDate === targetDate;
                          });

                          // Count meetings by status (combine ended and force_ended as completed)
                          const statusCounts = {};
                          meetingsOnDate.forEach((meeting) => {
                            let displayStatus = meeting.status;

                            // Combine ended and force_ended as "completed"
                            if (
                              meeting.status === "ended" ||
                              meeting.status === "force_ended"
                            ) {
                              displayStatus = "completed";
                            }

                            statusCounts[displayStatus] =
                              (statusCounts[displayStatus] || 0) + 1;
                          });

                          // Format status information - each status on separate line
                          const statusInfo = Object.entries(statusCounts).map(
                            ([status, count]) => {
                              const statusLabel = formatStatusLabel(status);
                              return `Meeting ${statusLabel}: ${count}`;
                            }
                          );

                          return statusInfo.length > 0
                            ? statusInfo
                            : [t("meetings.noMeetings")];
                        },
                      },
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
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("meetings.searchMeetings")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            />
          </div>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder={roomSearchTerm ? "Type to search rooms..." : ""}
                value={roomSearchTerm}
                onChange={(e) => {
                  setRoomSearchTerm(e.target.value);
                  setShowRoomDropdown(true);
                }}
                onFocus={() => {
                  setRoomSearchTerm("");
                  setRoomPreselected(roomFilter);
                  setShowRoomDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowRoomDropdown(false);
                    setRoomSearchTerm("");
                  }, 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const options = ["all", ...uniqueRooms];
                    const currentIndex = options.indexOf(roomPreselected);
                    const nextIndex =
                      currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                    setRoomPreselected(options[nextIndex]);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const options = ["all", ...uniqueRooms];
                    const currentIndex = options.indexOf(roomPreselected);
                    const prevIndex =
                      currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                    setRoomPreselected(options[prevIndex]);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setRoomFilter(roomPreselected);
                    setShowRoomDropdown(false);
                    setRoomSearchTerm("");
                  } else if (e.key === "Escape") {
                    setShowRoomDropdown(false);
                    setRoomSearchTerm("");
                  }
                }}
                className="w-full pl-3 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
              />
              {/* Overlay text when not focused and no search term */}
              {!roomSearchTerm && !showRoomDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {formatRoomLabel(roomFilter)}
                  </span>
                </div>
              )}
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    showRoomDropdown ? "rotate-180" : ""
                  }`}
                />
              </span>
            </div>
            {showRoomDropdown && (
              <div
                ref={roomDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in-0"
              >
                {[
                  { value: "all", label: t("meetings.allRooms") },
                  ...uniqueRooms.map((room) => ({ value: room, label: room })),
                ]
                  .filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes((roomSearchTerm || "").toLowerCase())
                  )
                  .map((option) => (
                    <button
                      key={option.value}
                      data-value={option.value}
                      onClick={() => {
                        setRoomFilter(option.value);
                        setShowRoomDropdown(false);
                        setRoomSearchTerm("");
                      }}
                      className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                        roomPreselected === option.value
                          ? "bg-blue-50 text-blue-900"
                          : roomFilter === option.value
                          ? "bg-accent-50 text-accent-900"
                          : "text-gray-900"
                      }`}
                    >
                      <span className="block truncate">{option.label}</span>
                      {roomFilter === option.value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <Check className="h-4 w-4 text-accent-600" />
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="relative">
            <select
              value={bookingTypeFilter}
              onChange={(e) => setBookingTypeFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </select>
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
            <button
              onClick={() =>
                setStatusFilter(
                  statusFilter === "scheduled" ? "all" : "scheduled"
                )
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === "scheduled"
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : ""
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Calendar
                      className={`h-8 w-8 ${
                        statusFilter === "scheduled"
                          ? "text-blue-500"
                          : "text-blue-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t("meetings.status.scheduled")}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {scheduledMeetings.length}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                setStatusFilter(statusFilter === "ongoing" ? "all" : "ongoing")
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === "ongoing"
                  ? "ring-2 ring-green-500 bg-green-50"
                  : ""
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Clock
                      className={`h-8 w-8 ${
                        statusFilter === "ongoing"
                          ? "text-green-500"
                          : "text-green-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t("common.ongoing")}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {ongoingMeetings.length}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                setStatusFilter(statusFilter === "ended" ? "all" : "ended")
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === "ended"
                  ? "ring-2 ring-gray-500 bg-gray-50"
                  : ""
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <CheckCircle
                      className={`h-8 w-8 ${
                        statusFilter === "ended"
                          ? "text-gray-500"
                          : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t("common.ended")}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {endedMeetings.length}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                setStatusFilter(
                  statusFilter === "canceled" ? "all" : "canceled"
                )
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === "canceled"
                  ? "ring-2 ring-red-500 bg-red-50"
                  : ""
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <AlertCircle
                      className={`h-8 w-8 ${
                        statusFilter === "canceled"
                          ? "text-red-500"
                          : "text-red-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t("meetings.status.canceled")}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {canceledMeetings.length}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Ongoing Meetings Alert */}
      {ongoingMeetings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Active Meetings
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  There are {ongoingMeetings.length} meeting(s) currently in
                  progress:
                </p>
                <ul className="mt-1 list-disc list-inside">
                  {ongoingMeetings.map((meeting) => (
                    <li key={meeting.id}>
                      {meeting.agenda} in {meeting.room_name} by{" "}
                      {getUserName(meeting.user_id, meeting.user)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting List */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {!loading &&
              !error &&
              filteredMeetings.map((meeting) => (
                <li
                  key={meeting.id}
                  className="px-3 sm:px-6 py-4 hover:bg-gray-50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 hover:shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    {/* Meeting Content */}
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(meeting.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                            {meeting.agenda && meeting.agenda.length > 50
                              ? `${meeting.agenda.substring(0, 50)}...`
                              : meeting.agenda}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              meeting.status
                            )}`}
                          >
                            {formatStatusLabel(meeting.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="truncate">
                              {meeting.room_name}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span className="truncate">
                              {getUserName(meeting.user_id, meeting.user)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="truncate">
                              {format(
                                new Date(meeting.start_time),
                                "MMM dd, yyyy HH:mm"
                              )}{" "}
                              - {format(new Date(meeting.end_time), "HH:mm")}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {t("common.created")}:{" "}
                          {format(new Date(meeting.created_at), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {meeting.status === "ongoing" && (
                          <button
                            onClick={() => handleForceEnd(meeting.id)}
                            className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <Power className="h-3 w-3 mr-1" />
                            Force End
                          </button>
                        )}

                        <button
                          onClick={() => handleViewDetails(meeting)}
                          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Meeting Detail Modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t("meetings.meetingDetails")}
        size="md"
      >
        <div className="space-y-6">
          <DetailGrid cols={2}>
            <DetailField
              label="Agenda"
              value={selectedMeeting?.agenda || "N/A"}
            />
            <DetailField
              label="Room"
              value={selectedMeeting?.room_name || "N/A"}
            />
            <DetailField
              label="Start Time"
              value={
                selectedMeeting?.start_time
                  ? formatDateTime(selectedMeeting.start_time)
                  : "N/A"
              }
            />
            <DetailField
              label="End Time"
              value={
                selectedMeeting?.end_time
                  ? formatDateTime(selectedMeeting.end_time)
                  : "N/A"
              }
            />
            <DetailField
              label="Status"
              value={
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    selectedMeeting?.status
                  )}`}
                >
                  {selectedMeeting?.status || "N/A"}
                </span>
              }
            />
            <DetailField
              label="Organizer"
              value={
                selectedMeeting?.user
                  ? selectedMeeting.user.name
                  : `User ${selectedMeeting?.user_id || "N/A"}`
              }
            />
            <DetailField
              label="Created"
              value={
                selectedMeeting?.created_at
                  ? formatDateTime(selectedMeeting.created_at)
                  : "N/A"
              }
            />
            <DetailField
              label="Last Updated"
              value={
                selectedMeeting?.updated_at
                  ? formatDateTime(selectedMeeting.updated_at)
                  : "N/A"
              }
            />
            <DetailField
              label="Meeting ID"
              value={`#${selectedMeeting?.id || "N/A"}`}
            />
          </DetailGrid>
        </div>
      </DetailModal>
    </div>
  );
};

export default AdminMeetings;
