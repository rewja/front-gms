import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useTranslatedLabels } from '../../hooks/useTranslatedLabels';
import { useNotification } from '../../components/NotificationSystem';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Power,
  Play,
  Eye,
  Building,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import SkeletonLoader from '../../components/SkeletonLoader';
 
import {
  DetailModal,
} from '../../components/Modal';

const AdminMeetings = () => {
  const { t } = useTranslation();
  const { formatStatusLabel } = useTranslatedLabels();
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkingMeeting, setCheckingMeeting] = useState(null);
  const [checkType, setCheckType] = useState(''); // 'ga' or 'ga_manager'
  const [checkNotes, setCheckNotes] = useState('');
  
  // Track notified meetings to avoid duplicate notifications
  const notifiedMeetingsRef = useRef(new Set());

  const formatDateTime = (value) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value || '');
      return format(d, 'MMM dd, yyyy HH:mm');
    } catch {
      return String(value || '');
    }
  };

  const formatDateOnly = (value) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value || '');
      return format(d, 'yyyy-MM-dd');
    } catch {
      return String(value || '');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return t('meetings.status.scheduled');
      case 'ongoing':
        return t('meetings.status.ongoing');
      case 'ended':
        return t('meetings.status.ended');
      case 'canceled':
        return t('meetings.status.canceled');
      default:
        return status;
    }
  };

  const deriveCluster = (roomName) => {
    if (!roomName) return 'N/A';
    const s = roomName.toLowerCase();
    if (s.includes('(08)') || s.includes(' 08')) return '08';
    if (s.includes('689')) return '689';
    if (s.includes(' 04') || s.includes('(04)')) return '04';
    if (s.includes('command centre') || s.includes('kantin vip') || s.includes('meeting 1') || s.includes('meeting 2')) return '08';
    return '-';
  };

  const getUserName = (userId, user) => {
    if (user && user.name) {
      return user.name;
    }
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.name : `User ${userId}`;
  };

  const handleForceStart = async (id) => {
    if (!window.confirm(t('meetings.forceStartConfirm', { defaultValue: 'Are you sure you want to force start this meeting?' })))
      return;
    try {
      await api.patch(`/meetings/${id}/force-start`);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || t('meetings.forceStartFailed', { defaultValue: 'Failed to force start meeting' }));
    }
  };

  const handleForceEnd = async (id) => {
    if (!window.confirm(t('meetings.forceEndConfirm', { defaultValue: 'Are you sure you want to force end this meeting?' })))
      return;
    try {
      await api.patch(`/meetings/${id}/force-end`);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || t('meetings.forceEndFailed', { defaultValue: 'Failed to force end meeting' }));
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const handleCheckMeeting = (meeting, type) => {
    setCheckingMeeting(meeting);
    setCheckType(type);
    setCheckNotes('');
    setShowCheckModal(true);
  };

  const handleSubmitCheck = async (status) => {
    if (!checkingMeeting) return;
    
    try {
      const endpoint = checkType === 'ga' ? 'ga-check' : 'ga-manager-check';
      await api.patch(`/meetings/${checkingMeeting.id}/${endpoint}`, {
        status,
        notes: checkNotes
      });
      
      setShowCheckModal(false);
      setCheckingMeeting(null);
      setCheckNotes('');
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || t('meetings.checkFailed'));
    }
  };

  const handleCancelMeeting = async (id) => {
    if (!window.confirm(t('meetings.cancelConfirmMessage'))) return;
    
    try {
      await api.patch(`/meetings/${id}/cancel`);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || t('meetings.cancelFailed'));
    }
  };

  const updateStatusAutomatically = async () => {
    try {
      await api.patch('/meetings/update-status-automatically');
      await loadData();
    } catch (e) {
      console.error('Failed to update status automatically:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [meetingsRes, usersRes, roomsRes] = await Promise.all([
        api.get('/meeting-room/bookings'),
        api.get('/users'),
        api.get('/meeting-room/rooms'),
      ]);
      setMeetings(meetingsRes.data || []);
      setUsers(usersRes.data || []);
      setRooms(roomsRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || t('errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const normalizePriority = (value) => {
    const v = (value || '').toString().trim().toLowerCase();
    if (v === 'reguler' || v === 'regular') return 'reguler';
    if (v === 'vip') return 'vip';
    return v;
  };

  const filteredMeetings = meetings
    .filter((meeting) => {
      const matchesSearch =
        meeting.agenda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getUserName(meeting.user_id, meeting.user)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        meeting.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRoom = !roomFilter || meeting.room_name === roomFilter;
      const matchesStatus = !statusFilter || meeting.status === statusFilter;
      const matchesBookingType = !bookingTypeFilter || meeting.booking_type === bookingTypeFilter || (bookingTypeFilter === 'external' && meeting.booking_type === 'public');
      const matchesPriority = !priorityFilter || normalizePriority(meeting.prioritas) === priorityFilter;
      const matchesDate = !dateFilter || 
        new Date(meeting.start_time).toISOString().split('T')[0] === dateFilter;
      
      return matchesSearch && matchesRoom && matchesStatus && matchesBookingType && matchesPriority && matchesDate;
    })
    .sort((a, b) => {
      // Sort by created_at (terbaru di atas), fallback ke id (auto increment)
      // Prioritas: created_at > id > start_time
      let dateA, dateB;
      
      if (a.created_at) {
        dateA = new Date(a.created_at).getTime();
      } else if (a.id) {
        dateA = a.id; // ID biasanya auto increment, jadi lebih besar = lebih baru
      } else if (a.start_time) {
        dateA = new Date(a.start_time).getTime();
      } else {
        dateA = 0;
      }
      
      if (b.created_at) {
        dateB = new Date(b.created_at).getTime();
      } else if (b.id) {
        dateB = b.id;
      } else if (b.start_time) {
        dateB = new Date(b.start_time).getTime();
      } else {
        dateB = 0;
      }
      
      // Descending order (terbaru di atas)
      return dateB - dateA;
    });

  const getDateFilteredMeetings = (meetings) => {
    return meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.start_time)
        .toISOString()
        .split('T')[0];
      return !dateFilter || meetingDate === dateFilter;
    });
  };

  const dateFilteredMeetings = getDateFilteredMeetings(meetings);
  const ongoingMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === 'ongoing'
  );
  const scheduledMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === 'scheduled'
  );
  const endedMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === 'ended'
  );
  const canceledMeetings = dateFilteredMeetings.filter(
    (meeting) => meeting.status === 'canceled'
  );

  const fixedRoomOptions = [
    { value: '', label: t('meetings.allRoomsOption') },
    { value: 'R. Meeting 1', label: '08 - R. Meeting 1' },
    { value: 'R. Meeting 2', label: '08 - R. Meeting 2' },
    { value: 'R. Meeting Command Centre', label: '08 - R. Meeting Command Centre' },
    { value: 'Kantin VIP', label: '08 - Kantin VIP' },
    { value: 'R. Meeting 689', label: '689 - R. Meeting 689' },
    { value: 'R. Meeting 04', label: '04 - R. Meeting 04' },
  ];

  useEffect(() => {
    loadData();
    
    // Auto update status every 30 seconds
    const interval = setInterval(() => {
      updateStatusAutomatically();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [t, refreshKey]);

  // Listen for refresh events from Layout (soft refresh)
  useEffect(() => {
    const handleRefreshData = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener('refreshData', handleRefreshData);
    return () => {
      window.removeEventListener('refreshData', handleRefreshData);
    };
  }, []);

  // Check for today's meetings and send notifications
  // Only show notifications for meetings that are fully approved (both GA and GA Manager)
  useEffect(() => {
    if (loading || meetings.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if user already visited this page today (notifications should only show once per day)
    const todayKey = `meetings_notified_${new Date().toDateString()}`;
    const hasNotifiedToday = localStorage.getItem(todayKey) === 'true';
    
    // Check meetings that are scheduled or ongoing for today AND fully approved
    const todayMeetings = meetings.filter((meeting) => {
      if (!meeting.start_time) return false;
      const meetingDate = new Date(meeting.start_time);
      const meetingDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
      
      const isToday = meetingDay.getTime() === today.getTime();
      const isApproved = meeting.ga_check_status === 'approved' && 
                         meeting.ga_manager_check_status === 'approved';
      const isActive = meeting.status === 'scheduled' || meeting.status === 'ongoing';
      
      return isToday && isApproved && isActive;
    });
    
    // Mark as notified when user opens this page
    if (!hasNotifiedToday && todayMeetings.length > 0) {
      localStorage.setItem(todayKey, 'true');
    }
    
    // Don't show notifications if user already visited today
    if (hasNotifiedToday) return;

    // Check for meetings that just started (status changed to ongoing within last 5 minutes)
    todayMeetings.forEach((meeting) => {
      if (meeting.status === 'ongoing') {
        const notificationKey = `started_${meeting.id}`;
        if (notifiedMeetingsRef.current.has(notificationKey)) return;
        
        const startTime = new Date(meeting.start_time);
        const timeDiff = now.getTime() - startTime.getTime();
        const minutesDiff = timeDiff / (1000 * 60);
        
        // Notify if meeting started within last 5 minutes
        if (minutesDiff >= 0 && minutesDiff <= 5) {
          notifiedMeetingsRef.current.add(notificationKey);
          addNotification({
            type: 'info',
            title: `Meeting "${meeting.agenda || 'Meeting'}" sudah dimulai`,
            message: `Meeting di ${meeting.room_name} mulai pada ${new Date(meeting.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
            duration: 10000,
          });
        }
      }
    });

    // Check for scheduled meetings that will start soon (within next 15 minutes)
    todayMeetings.forEach((meeting) => {
      if (meeting.status === 'scheduled') {
        const notificationKey = `upcoming_${meeting.id}`;
        if (notifiedMeetingsRef.current.has(notificationKey)) return;
        
        const startTime = new Date(meeting.start_time);
        const timeDiff = startTime.getTime() - now.getTime();
        const minutesDiff = timeDiff / (1000 * 60);
        
        // Notify if meeting will start in 15 minutes or less
        if (minutesDiff > 0 && minutesDiff <= 15) {
          notifiedMeetingsRef.current.add(notificationKey);
          addNotification({
            type: 'warning',
            title: `Meeting "${meeting.agenda || 'Meeting'}" akan dimulai segera`,
            message: `Meeting di ${meeting.room_name} akan mulai pada ${new Date(meeting.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
            duration: 10000,
          });
        }
      }
    });
  }, [meetings, loading, addNotification]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {t('meetings.title', { defaultValue: 'Meeting Management' })}
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {t('meetings.subtitle', { defaultValue: 'Monitor and manage all meetings' })}
        </p>
      </div>

      {/* Stats Dashboard */}
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
                  statusFilter === 'scheduled' ? '' : 'scheduled'
                )
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === 'scheduled'
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : ''
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('meetings.status.scheduled')}
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
                setStatusFilter(statusFilter === 'ongoing' ? '' : 'ongoing')
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === 'ongoing'
                  ? 'ring-2 ring-green-500 bg-green-50'
                  : ''
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('meetings.status.ongoing')}
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
                setStatusFilter(statusFilter === 'ended' ? '' : 'ended')
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === 'ended'
                  ? 'ring-2 ring-gray-500 bg-gray-50'
                  : ''
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <CheckCircle className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('meetings.status.ended')}
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
                  statusFilter === 'canceled' ? '' : 'canceled'
                )
              }
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                statusFilter === 'canceled'
                  ? 'ring-2 ring-red-500 bg-red-50'
                  : ''
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-3">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('meetings.status.canceled')}
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

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            {t('meetings.filterSchedule')}
          </h2>
          <button
            onClick={updateStatusAutomatically}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Clock className="h-4 w-4 mr-2" />
            Update Status
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('meetings.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            />
          </div>
          
          <div className="relative">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              {fixedRoomOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <select
              value={bookingTypeFilter}
              onChange={(e) => setBookingTypeFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              <option value="">{t('meetings.allTypesOption')}</option>
              <option value="internal">{t('meetings.internal')}</option>
              <option value="external">{t('meetings.external')}</option>
            </select>
          </div>
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              <option value="">{t('meetings.allPrioritiesOption')}</option>
              <option value="reguler">{t('meetings.regular')}</option>
              <option value="vip">{t('meetings.vip')}</option>
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

      {/* Ongoing Meetings Alert */}
      {ongoingMeetings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {t('meetings.activeMeetingsAlert')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {t('meetings.activeMeetingsMessage', { count: ongoingMeetings.length })}
                </p>
                <ul className="mt-1 list-disc list-inside">
                  {ongoingMeetings.map((meeting) => (
                    <li key={meeting.id}>
                      {meeting.agenda} di {meeting.room_name} oleh{' '}
                      {meeting.organizer_name || getUserName(meeting.user_id, meeting.user)}
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
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div key={meeting.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <div className="p-5">
                  {/* Header Section */}
                  <div className="mb-4">
                    {/* Date & Time Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
                        <div className="flex items-center text-sm text-gray-600 mb-2 sm:mb-0">
                          <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-semibold">{formatDateOnly(meeting.start_time)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-green-500" />
                          <span className="font-semibold">
                            {new Date(meeting.start_time).toLocaleTimeString('id-ID', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(meeting.end_time).toLocaleTimeString('id-ID', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Status Tags */}
                      <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(meeting.status)}`}>
                          {getStatusText(meeting.status)}
                        </span>
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          {meeting.booking_type === 'internal' ? t('meetings.internal') : (meeting.booking_type === 'public' || meeting.booking_type === 'external') ? t('meetings.external') : (meeting.booking_type || '-')}
                        </span>
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-800">
                          {normalizePriority(meeting.prioritas) === 'vip' ? t('meetings.vip') : t('meetings.regular')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="mb-4">
                    {/* Room & Organizer */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center text-sm mb-2">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-semibold text-gray-900">{meeting.room_name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{t('meetings.applicant')}:</span> {meeting.organizer_name || getUserName(meeting.user_id, meeting.user)}
                      </div>
                    </div>

                    {/* Approval Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                        <span className="text-sm font-medium text-gray-700">GA Approval</span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          meeting.ga_check_status === 'approved' ? 'bg-green-100 text-green-800' :
                          meeting.ga_check_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {meeting.ga_check_status === 'approved' ? 'Approved' :
                           meeting.ga_check_status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                        <span className="text-sm font-medium text-gray-700">GA Manager</span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          meeting.ga_manager_check_status === 'approved' ? 'bg-green-100 text-green-800' :
                          meeting.ga_manager_check_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {meeting.ga_manager_check_status === 'approved' ? 'Approved' :
                           meeting.ga_manager_check_status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Primary Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 flex-1">
                        <button
                          onClick={() => handleViewDetails(meeting)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t('meetings.detail')}
                        </button>

                        {meeting.ga_check_status === 'pending' && (
                          <button
                            onClick={() => handleCheckMeeting(meeting, 'ga')}
                            disabled={user?.role !== 'admin_ga' && user?.role !== 'super_admin'}
                            className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors ${
                              user?.role !== 'admin_ga' && user?.role !== 'super_admin'
                                ? 'text-blue-400 bg-blue-50 cursor-not-allowed opacity-50'
                                : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            GA Check
                          </button>
                        )}

                        {meeting.ga_manager_check_status === 'pending' && (
                          <button
                            onClick={() => handleCheckMeeting(meeting, 'ga_manager')}
                            disabled={user?.role !== 'admin_ga_manager' && user?.role !== 'super_admin'}
                            className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors ${
                              user?.role !== 'admin_ga_manager' && user?.role !== 'super_admin'
                                ? 'text-purple-400 bg-purple-50 cursor-not-allowed opacity-50'
                                : 'text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            GA Manager Check
                          </button>
                        )}
                      </div>

                      {/* Secondary Actions */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        {meeting.status !== 'canceled' && meeting.status !== 'ended' && (
                          <button
                            onClick={() => handleCancelMeeting(meeting.id)}
                            disabled={meeting.ga_check_status !== 'approved' || meeting.ga_manager_check_status !== 'approved'}
                            className={`flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors ${
                              meeting.ga_check_status !== 'approved' || meeting.ga_manager_check_status !== 'approved'
                                ? 'text-red-400 bg-red-50 cursor-not-allowed opacity-50'
                                : 'text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                            }`}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {t('meetings.cancel', { defaultValue: 'Cancel' })}
                          </button>
                        )}

                        {meeting.status === 'scheduled' && (
                          <button
                            onClick={() => handleForceStart(meeting.id)}
                            disabled={meeting.ga_check_status !== 'approved' || meeting.ga_manager_check_status !== 'approved'}
                            className={`flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors ${
                              meeting.ga_check_status !== 'approved' || meeting.ga_manager_check_status !== 'approved'
                                ? 'text-blue-400 bg-blue-50 cursor-not-allowed opacity-50'
                                : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {t('meetings.forceStart', { defaultValue: 'Force Start' })}
                          </button>
                        )}

                        {meeting.status === 'ongoing' && (
                          <button
                            onClick={() => handleForceEnd(meeting.id)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {t('meetings.forceEnd', { defaultValue: 'Force End' })}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredMeetings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">{t('meetings.noMatchingBookings')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('meetings.meetingDetail')}
        size="md"
      >
        <div className="space-y-4">
          {/* Informasi Umum - Grid 2 Kolom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Booking ID</span>
                <span className="text-gray-900 font-mono">#{selectedMeeting?.booking_id || selectedMeeting?.id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('meetings.meetingRoom')}</span>
                <span className="text-gray-900">{selectedMeeting?.room_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('meetings.agenda')}</span>
                <span className="text-gray-900">{selectedMeeting?.agenda || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('meetings.date')}</span>
                <span className="text-gray-900">{selectedMeeting?.start_time ? formatDateOnly(selectedMeeting.start_time) : 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('meetings.time')}</span>
                <span className="text-gray-900">{selectedMeeting?.start_time ? new Date(selectedMeeting.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'} - {selectedMeeting?.end_time ? new Date(selectedMeeting.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('meetings.applicantName')}</span>
                <span className="text-gray-900">{selectedMeeting?.organizer_name || (selectedMeeting?.user ? selectedMeeting.user.name : `User ${selectedMeeting?.user_id || 'N/A'}`)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('common.statusLabel')}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(selectedMeeting?.status)}`}>{getStatusText(selectedMeeting?.status) || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">{t('meetings.bookingType')}</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">{selectedMeeting?.booking_type === 'internal' ? t('meetings.internal') : (selectedMeeting?.booking_type === 'public' || selectedMeeting?.booking_type === 'external') ? t('meetings.external') : (selectedMeeting?.booking_type || 'N/A')}</span>
              </div>
            {selectedMeeting?.prioritas && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                  <span className="text-gray-600 font-medium">{t('meetings.priority')}</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">{normalizePriority(selectedMeeting?.prioritas) === 'vip' ? t('meetings.vip') : t('meetings.regular')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kebutuhan Lainnya */}
          {selectedMeeting?.lainnya_detail && (
            <div className="mt-2 border-t border-gray-300 pt-3">
              <div className="text-sm font-medium text-gray-700">{t('meetings.otherNeeds')}</div>
              <div className="text-sm text-gray-900 mt-1">{selectedMeeting.lainnya_detail}</div>
            </div>
          )}

          {/* Detail Tambahan */}
          {(selectedMeeting?.kebutuhan?.length > 0 || selectedMeeting?.makanan_detail || selectedMeeting?.minuman_detail || selectedMeeting?.lainnya_detail) && (
            <div className="mt-2">
              <div className="bg-gray-50 border border-gray-300 rounded-md">
                <div className="px-3 py-2 border-b border-gray-300 text-sm font-semibold text-gray-900">{t('meetings.additionalDetails')}</div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">{t('meetings.additionalNeeds')}</div>
                    <div className="mt-1 text-sm text-gray-900">{(selectedMeeting.kebutuhan || []).join(', ') || '-'}</div>
                  </div>
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">{t('meetings.foodDetails')}</div>
                    <div className="mt-1 text-sm text-gray-900">{selectedMeeting?.makanan_detail || '-'}</div>
                  </div>
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">{t('meetings.drinkDetails')}</div>
                    <div className="mt-1 text-sm text-gray-900">{selectedMeeting?.minuman_detail || '-'}</div>
                  </div>
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">{t('meetings.otherNeeds')}</div>
                    <div className="mt-1 text-sm text-gray-900">{selectedMeeting?.lainnya_detail || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dokumen SPK */}
          {(selectedMeeting?.spk_file || selectedMeeting?.spk_file_path) && (
            <div className="mt-2 border-t border-gray-300 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('meetings.spkDocument')}</span>
                <div className="flex items-center gap-3">
                  {(() => {
                    const url = typeof selectedMeeting.spk_file === 'string' ? selectedMeeting.spk_file : (selectedMeeting.spk_file_path ? `http://localhost:8000/storage/${selectedMeeting.spk_file_path}` : null);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 rounded text-white text-sm bg-[#b71c1c] hover:bg-[#a31616]"
                      >
                        {t('meetings.viewSPK')}
                      </a>
                    ) : null;
                  })()}
                  {(() => {
                    const url = typeof selectedMeeting.spk_file === 'string' ? selectedMeeting.spk_file : (selectedMeeting.spk_file_path ? `http://localhost:8000/storage/${selectedMeeting.spk_file_path}` : null);
                    return url && /(png|jpg|jpeg|webp)$/i.test(url) ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="SPK" className="h-12 w-auto rounded border border-gray-200 object-contain" />
                      </a>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </DetailModal>

      {/* Check Modal */}
      <DetailModal
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        title={`${checkType === 'ga' ? 'GA' : 'GA Manager'} Check`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Meeting Details</h3>
            <div className="text-sm text-gray-600">
              <p><strong>Room:</strong> {checkingMeeting?.room_name}</p>
              <p><strong>Agenda:</strong> {checkingMeeting?.agenda}</p>
              <p><strong>Date:</strong> {checkingMeeting?.start_time ? formatDateOnly(checkingMeeting.start_time) : 'N/A'}</p>
              <p><strong>Time:</strong> {checkingMeeting?.start_time ? new Date(checkingMeeting.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'} - {checkingMeeting?.end_time ? new Date(checkingMeeting.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={checkNotes}
              onChange={(e) => setCheckNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes for this check..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleSubmitCheck('rejected')}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reject
            </button>
            <button
              onClick={() => handleSubmitCheck('approved')}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Approve
            </button>
          </div>
        </div>
      </DetailModal>
    </div>
  );
};

export default AdminMeetings;


