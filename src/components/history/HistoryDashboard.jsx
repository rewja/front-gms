import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import HistoryFilters from './HistoryFilters';
import HistoryTable from './HistoryTable';
import HistoryStats from './HistoryStats';
import AdminHistoryView from './AdminHistoryView';
import UserHistoryView from './UserHistoryView';

const HistoryDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const adminRoles = ['admin_ga', 'admin_ga_manager', 'super_admin'];
    setIsAdmin(adminRoles.includes(user?.role));
  }, [user]);

  if (isAdmin) {
    return <AdminHistoryView />;
  }

  return <UserHistoryView />;
};

export default HistoryDashboard;


