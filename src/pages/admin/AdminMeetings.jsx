import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useTranslatedLabels } from '../../hooks/useTranslatedLabels';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Power,
  Eye,
  Building,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import SkeletonLoader from '../../components/SkeletonLoader';
 
import {
  DetailModal,
} from '../../components/Modal';

const AdminMeetings = () => {
  const { t } = useTranslation();
  const { formatStatusLabel } = useTranslatedLabels();
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

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
        return 'Terjadwal';
      case 'ongoing':
        return 'Berlangsung';
      case 'ended':
        return 'Selesai';
      case 'canceled':
        return 'Dibatalkan';
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

  const handleForceEnd = async (id) => {
    if (!window.confirm('Are you sure you want to force end this meeting?'))
      return;
    try {
      await api.patch(`/meetings/${id}/force-end`);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || t('common.failedToForceEnd'));
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
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

  const filteredMeetings = meetings.filter((meeting) => {
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
    { value: '', label: 'Semua Ruang' },
    { value: 'R. Meeting 1', label: '08 - R. Meeting 1' },
    { value: 'R. Meeting 2', label: '08 - R. Meeting 2' },
    { value: 'R. Meeting Command Centre', label: '08 - R. Meeting Command Centre' },
    { value: 'Kantin VIP', label: '08 - Kantin VIP' },
    { value: 'R. Meeting 689', label: '689 - R. Meeting 689' },
    { value: 'R. Meeting 04', label: '04 - R. Meeting 04' },
  ];

  useEffect(() => {
    loadData();
  }, [t]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Manajemen Meeting Room
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Kelola dan pantau semua booking ruang meeting - internal dan publik
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
                      Terjadwal
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
                      Berlangsung
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
                      Selesai
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
                      Dibatalkan
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
            Filter Jadwal
          </h2>
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari agenda, ruang, atau pemohon..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              <option value="">Semua Status</option>
              <option value="scheduled">Terjadwal</option>
              <option value="ongoing">Berlangsung</option>
              <option value="ended">Selesai</option>
              <option value="canceled">Dibatalkan</option>
            </select>
          </div>
          
          <div className="relative">
            <select
              value={bookingTypeFilter}
              onChange={(e) => setBookingTypeFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              <option value="">Semua Tipe</option>
              <option value="internal">Internal</option>
              <option value="external">Eksternal</option>
            </select>
          </div>
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
            >
              <option value="">Semua Prioritas</option>
              <option value="reguler">Reguler</option>
              <option value="vip">VIP</option>
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
                Meeting Aktif
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Ada {ongoingMeetings.length} meeting yang sedang berlangsung:
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pemohon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioritas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateOnly(meeting.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(meeting.start_time).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {new Date(meeting.end_time).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        {meeting.room_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {meeting.organizer_name || getUserName(meeting.user_id, meeting.user)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(meeting.status)}`}>
                        {getStatusText(meeting.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {meeting.booking_type === 'internal' ? 'Internal' : (meeting.booking_type === 'public' || meeting.booking_type === 'external') ? 'Eksternal' : (meeting.booking_type || '-')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {normalizePriority(meeting.prioritas) === 'vip' ? 'VIP' : 'Reguler'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {meeting.status === 'ongoing' && (
                          <button
                            onClick={() => handleForceEnd(meeting.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <Power className="h-3 w-3 mr-1" />
                            Force End
                          </button>
                        )}

                        <button
                          onClick={() => handleViewDetails(meeting)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredMeetings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada data booking yang sesuai dengan filter</p>
                    </div>
            )}
                  </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detail Meeting"
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
                <span className="text-gray-600 font-medium">Ruang Meeting</span>
                <span className="text-gray-900">{selectedMeeting?.room_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Agenda</span>
                <span className="text-gray-900">{selectedMeeting?.agenda || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Tanggal</span>
                <span className="text-gray-900">{selectedMeeting?.start_time ? formatDateOnly(selectedMeeting.start_time) : 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Waktu</span>
                <span className="text-gray-900">{selectedMeeting?.start_time ? new Date(selectedMeeting.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'} - {selectedMeeting?.end_time ? new Date(selectedMeeting.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Nama Pemohon</span>
                <span className="text-gray-900">{selectedMeeting?.organizer_name || (selectedMeeting?.user ? selectedMeeting.user.name : `User ${selectedMeeting?.user_id || 'N/A'}`)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Status</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(selectedMeeting?.status)}`}>{getStatusText(selectedMeeting?.status) || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="text-gray-600 font-medium">Tipe Booking</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">{selectedMeeting?.booking_type === 'internal' ? 'Internal' : (selectedMeeting?.booking_type === 'public' || selectedMeeting?.booking_type === 'external') ? 'Eksternal' : (selectedMeeting?.booking_type || 'N/A')}</span>
              </div>
            {selectedMeeting?.prioritas && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm">
                  <span className="text-gray-600 font-medium">Prioritas</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">{normalizePriority(selectedMeeting?.prioritas) === 'vip' ? 'VIP' : 'Reguler'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kebutuhan Lainnya */}
          {selectedMeeting?.lainnya_detail && (
            <div className="mt-2 border-t border-gray-300 pt-3">
              <div className="text-sm font-medium text-gray-700">Kebutuhan Lainnya</div>
              <div className="text-sm text-gray-900 mt-1">{selectedMeeting.lainnya_detail}</div>
            </div>
          )}

          {/* Detail Tambahan */}
          {(selectedMeeting?.kebutuhan?.length > 0 || selectedMeeting?.makanan_detail || selectedMeeting?.minuman_detail || selectedMeeting?.lainnya_detail) && (
            <div className="mt-2">
              <div className="bg-gray-50 border border-gray-300 rounded-md">
                <div className="px-3 py-2 border-b border-gray-300 text-sm font-semibold text-gray-900">Detail Tambahan</div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">Kebutuhan Tambahan</div>
                    <div className="mt-1 text-sm text-gray-900">{(selectedMeeting.kebutuhan || []).join(', ') || '-'}</div>
                  </div>
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">Detail Makanan</div>
                    <div className="mt-1 text-sm text-gray-900">{selectedMeeting?.makanan_detail || '-'}</div>
                  </div>
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">Detail Minuman</div>
                    <div className="mt-1 text-sm text-gray-900">{selectedMeeting?.minuman_detail || '-'}</div>
                  </div>
                  <div>
                    <div className="block text-xs font-medium text-gray-600 uppercase tracking-wider">Kebutuhan Lainnya</div>
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
                <span className="text-sm font-medium text-gray-700">Dokumen SPK</span>
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
                        Lihat SPK
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
    </div>
  );
};

export default AdminMeetings;


