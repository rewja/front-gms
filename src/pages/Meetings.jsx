import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Users,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import SkeletonLoader from "../components/SkeletonLoader";
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

const Meetings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState({
    room_name: "",
    agenda: "",
    start_time: "",
    end_time: "",
  });
  const [timeConflict, setTimeConflict] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [roomPreselected, setRoomPreselected] = useState("all");
  const roomDropdownRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );

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

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-dropdown]")) {
        setShowRoomDropdown(false);
        setRoomSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatStatusLabel = (status) => {
    if (!status) return t("common.unknown", { defaultValue: "Unknown" });

    switch (status) {
      case "scheduled":
        return t("meetings.status.scheduled");
      case "ongoing":
        return t("meetings.status.ongoing");
      case "ending":
        return t("meetings.status.ending");
      case "ended":
        return t("meetings.status.ended");
      case "canceled":
        return t("meetings.status.canceled");
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

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

  // Predefined room options - fixed list only
  const uniqueRooms = [
    "Meeting Room A (08)",
    "Meeting Room B (08)",
    "Meeting Room A (689)",
    "Meeting Room B (689)",
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const checkTimeConflict = (
    newStartTime,
    newEndTime,
    roomName,
    excludeId = null
  ) => {
    const newStart = new Date(newStartTime);
    const newEnd = new Date(newEndTime);

    // Check if new meeting times are valid
    if (newStart >= newEnd) {
      return {
        hasConflict: true,
        message: t("meetings.errors.endTimeAfterStart"),
      };
    }

    // Check for conflicts with existing meetings
    const conflicts = meetings.filter((meeting) => {
      // Skip the meeting being edited
      if (excludeId && meeting.id === excludeId) return false;

      // Only check meetings in the same room
      if (meeting.room_name !== roomName) return false;

      // Skip canceled meetings
      if (meeting.status === "canceled") return false;

      const existingStart = new Date(meeting.start_time);
      const existingEnd = new Date(meeting.end_time);

      // Check for time overlap
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (conflicts.length > 0) {
      const conflictMeeting = conflicts[0];
      const conflictStart = new Date(conflictMeeting.start_time);
      const conflictEnd = new Date(conflictMeeting.end_time);

      return {
        hasConflict: true,
        message: `Time conflict with "${
          conflictMeeting.agenda
        }" (${formatDateTime(conflictStart)} - ${formatDateTime(conflictEnd)})`,
      };
    }

    return { hasConflict: false };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeConflict?.hasConflict) return;

    try {
      const meetingData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      };

      if (editingMeeting) {
        await api.put(`/meetings/${editingMeeting.id}`, meetingData);
      } else {
        await api.post("/meetings", meetingData);
      }

      const res = await api.get("/meetings");
      setMeetings(res.data || []);
      setShowModal(false);
      setFormData({
        room_name: "",
        agenda: "",
        start_time: "",
        end_time: "",
      });
      setEditingMeeting(null);
      setTimeConflict(null);
    } catch (e) {
      alert(e?.response?.data?.message || t("meetings.loadFailed"));
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      room_name: meeting.room_name || "",
      agenda: meeting.agenda || "",
      start_time: meeting.start_time
        ? new Date(meeting.start_time).toISOString().slice(0, 16)
        : "",
      end_time: meeting.end_time
        ? new Date(meeting.end_time).toISOString().slice(0, 16)
        : "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("meetings.deleteConfirm"))) return;
    try {
      await api.delete(`/meetings/${id}`);
      const res = await api.get("/meetings");
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("meetings.loadFailed"));
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/meetings/${id}/status`, { status });
      const res = await api.get("/meetings");
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("meetings.loadFailed"));
    }
  };

  const handleCancelMeeting = async (id) => {
    if (!confirm(t("meetings.cancelConfirm"))) return;
    try {
      await api.put(`/meetings/${id}/status`, { status: "canceled" });
      const res = await api.get("/meetings");
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("meetings.loadFailed"));
    }
  };

  const handleEndMeeting = async (id) => {
    if (!confirm(t("meetings.endConfirm"))) return;
    try {
      await api.put(`/meetings/${id}/status`, { status: "ended" });
      const res = await api.get("/meetings");
      setMeetings(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("meetings.loadFailed"));
    }
  };

  // Filter meetings based on search and filter criteria
  const filteredMeetings = meetings.filter((meeting) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        meeting.agenda?.toLowerCase().includes(searchLower) ||
        meeting.room_name?.toLowerCase().includes(searchLower) ||
        meeting.user?.name?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Room filter
    if (roomFilter !== "all" && meeting.room_name !== roomFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all" && meeting.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter) {
      const meetingDate = new Date(meeting.start_time)
        .toISOString()
        .split("T")[0];
      if (meetingDate !== dateFilter) {
        return false;
      }
    }

    return true;
  });

  // Filter meetings by date for stats
  const dateFilteredMeetings = meetings.filter((meeting) => {
    if (dateFilter) {
      const meetingDate = new Date(meeting.start_time)
        .toISOString()
        .split("T")[0];
      return meetingDate === dateFilter;
    }
    return true;
  });

  // Status counts for filtered meetings
  const scheduledMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "scheduled"
  );
  const ongoingMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "ongoing"
  );
  const endedMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "ended"
  );
  const canceledMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === "canceled"
  );

  const upcomingMeetings = meetings.filter(
    (meeting) =>
      new Date(meeting.start_time) > new Date() &&
      meeting.status === "scheduled"
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/meetings");
        if (!cancelled) setMeetings(res.data || []);
      } catch (e) {
        if (!cancelled)
          setError(
            e?.response?.data?.message ||
              t("common.failedToLoad", { defaultValue: "Failed to load" })
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t("nav.meetingRoom")}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Schedule and manage your meetings
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("dashboard.bookMeeting")}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="relative" data-dropdown="room">
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
              {!roomSearchTerm && !showRoomDropdown && (
                <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
                  <span className="text-gray-900 text-sm sm:text-base">
                    {roomFilter === "all" ? t("meetings.allRooms") : roomFilter}
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
                className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none transform transition-all duration-200 ease-out"
              >
                {["all", ...uniqueRooms]
                  .filter((room) =>
                    room.toLowerCase().includes(roomSearchTerm.toLowerCase())
                  )
                  .map((room) => (
                    <button
                      key={room}
                      data-value={room}
                      onClick={() => {
                        setRoomFilter(room);
                        setShowRoomDropdown(false);
                        setRoomSearchTerm("");
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                        roomPreselected === room ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900">
                          {room === "all" ? t("meetings.allRooms") : room}
                        </span>
                        {roomPreselected === room && (
                          <span className="text-accent-600">
                            <Check className="h-4 w-4 text-accent-600" />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
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
                      {t("meetings.status.ongoing")}
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
                      {t("meetings.status.ended")}
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

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="card">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upcoming Meetings
            </h3>
            <div className="space-y-3">
              {upcomingMeetings.slice(0, 3).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-3 bg-accent-50 dark:bg-accent-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {meeting.agenda}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {meeting.room_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDateTime(meeting.start_time)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {formatDateTime(meeting.end_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Meeting List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {!loading &&
              !error &&
              filteredMeetings.map((meeting) => (
                <li
                  key={meeting.id}
                  className="px-3 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 hover:shadow-sm group"
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
                            {meeting.agenda}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              meeting.status
                            )}`}
                          >
                            {formatStatusLabel(meeting.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{meeting.room_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTime(meeting.start_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(meeting.end_time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2 sm:ml-4">
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* Status-specific Action Buttons */}
                        {meeting.status === "scheduled" && (
                          <button
                            onClick={() => handleCancelMeeting(meeting.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            {t("meetings.canceled")}
                          </button>
                        )}

                        {meeting.status === "ongoing" && (
                          <button
                            onClick={() => handleEndMeeting(meeting.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            {t("meetings.ended")}
                          </button>
                        )}

                        {/* View Details - Always available */}
                        <button
                          onClick={() => handleViewDetails(meeting)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t("common.view") + " " + t("common.details")}
                        >
                          <Users className="h-4 w-4" />
                        </button>

                        {/* Edit - Available for scheduled and ongoing */}
                        {(meeting.status === "scheduled" ||
                          meeting.status === "ongoing") && (
                          <button
                            onClick={() => handleEdit(meeting)}
                            className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                            title={t("common.edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {/* Delete - Only available for scheduled */}
                        {meeting.status === "scheduled" && (
                          <button
                            onClick={() => handleDelete(meeting.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({
            room_name: "",
            agenda: "",
            start_time: "",
            end_time: "",
          });
          setEditingMeeting(null);
          setTimeConflict(null);
        }}
        title={
          editingMeeting ? t("meetings.title") : t("dashboard.bookMeeting")
        }
        onSubmit={handleSubmit}
        submitText={editingMeeting ? t("common.update") : t("common.book")}
        size="md"
      >
        <FormField label={t("meetings.room")} required>
          <FormSelect
            value={formData.room_name}
            onChange={(e) => {
              setFormData({ ...formData, room_name: e.target.value });
              setTimeConflict(null);
            }}
            options={uniqueRooms.map((room) => ({
              value: room,
              label: room,
            }))}
            placeholder={t("meetings.room")}
          />
        </FormField>

        <FormField label={t("meetings.agenda")} required>
          <FormInput
            type="text"
            value={formData.agenda}
            onChange={(e) =>
              setFormData({ ...formData, agenda: e.target.value })
            }
            placeholder={t("meetings.agenda")}
          />
        </FormField>

        <DetailGrid cols={2}>
          <FormField label={t("meetings.startTime")} required>
            <FormInput
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => {
                setFormData({ ...formData, start_time: e.target.value });
                if (formData.end_time && formData.room_name) {
                  const conflict = checkTimeConflict(
                    e.target.value,
                    formData.end_time,
                    formData.room_name,
                    editingMeeting?.id
                  );
                  setTimeConflict(conflict);
                }
              }}
              disabled={editingMeeting?.status === "ongoing"}
            />
          </FormField>

          <FormField label={t("meetings.endTime")} required>
            <FormInput
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => {
                setFormData({ ...formData, end_time: e.target.value });
                if (formData.start_time && formData.room_name) {
                  const conflict = checkTimeConflict(
                    formData.start_time,
                    e.target.value,
                    formData.room_name,
                    editingMeeting?.id
                  );
                  setTimeConflict(conflict);
                }
              }}
              disabled={editingMeeting?.status === "ongoing"}
            />
          </FormField>
        </DetailGrid>

        {editingMeeting?.status === "ongoing" && (
          <div className="text-blue-600 text-sm bg-blue-50 p-3 rounded-lg">
            <strong>{t("todos.note")}:</strong> {t("meetings.subtitle")}
          </div>
        )}

        {timeConflict?.hasConflict && (
          <div className="text-red-600 text-sm">{timeConflict.message}</div>
        )}
      </FormModal>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t("meetings.meetingDetails")}
        size="md"
      >
        <div className="space-y-6">
          <DetailGrid cols={2}>
            <DetailField
              label={t("meetings.agenda")}
              value={selectedMeeting?.agenda}
            />
            <DetailField
              label={t("meetings.room")}
              value={selectedMeeting?.room_name}
            />
            <DetailField
              label={t("meetings.startTime")}
              value={formatDateTime(selectedMeeting?.start_time)}
            />
            <DetailField
              label={t("meetings.endTime")}
              value={formatDateTime(selectedMeeting?.end_time)}
            />
            <DetailField
              label={t("common.status")}
              value={
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    selectedMeeting?.status
                  )}`}
                >
                  {formatStatusLabel(selectedMeeting?.status)}
                </span>
              }
            />
          </DetailGrid>
        </div>
      </DetailModal>
    </div>
  );
};

export default Meetings;
