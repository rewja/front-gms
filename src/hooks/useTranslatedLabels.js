import { useTranslation } from "react-i18next";

export const useTranslatedLabels = () => {
  const { t } = useTranslation();

  const formatStatusLabel = (status) => {
    if (!status) return t('common.unknown');

    switch (status) {
      case "not_started":
        return t('todos.notStarted');
      case "in_progress":
        return t('todos.inProgress');
      case "hold":
        return t('todos.hold');
      case "checking":
        return t('todos.checking');
      case "evaluating":
        return t('todos.evaluating');
      case "completed":
        return t('todos.completed');
      case "scheduled":
        return t('meetings.scheduled');
      case "ongoing":
        return t('meetings.ongoing');
      case "ending":
        return t('meetings.ending');
      case "ended":
        return t('meetings.ended');
      case "canceled":
        return t('meetings.canceled');
      case "pending":
        return t('common.pending');
      case "approved":
        return t('common.approved');
      case "rejected":
        return t('common.rejected');
      case "active":
        return t('common.active');
      case "inactive":
        return t('common.inactive');
      case "damaged":
        return t('assets.damaged');
      case "maintenance":
        return t('assets.maintenance');
      case "disposed":
        return t('assets.disposed');
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatPriorityLabel = (priority) => {
    switch (priority) {
      case "high":
        return t('common.high');
      case "medium":
        return t('common.medium');
      case "low":
        return t('common.low');
      default:
        return priority?.charAt(0).toUpperCase() + priority?.slice(1);
    }
  };

  const formatCategoryLabel = (category) => {
    switch (category) {
      case "general":
        return t('requests.general');
      case "equipment":
        return t('requests.equipment');
      case "maintenance":
        return t('requests.maintenance');
      case "software":
        return t('requests.software');
      case "office":
        return t('requests.office');
      case "electronics":
        return t('assets.electronics');
      case "furniture":
        return t('assets.furniture');
      case "vehicles":
        return t('assets.vehicles');
      case "tools":
        return t('assets.tools');
      case "others":
        return t('assets.others');
      default:
        return category || t('requests.general');
    }
  };

  const formatRoleLabel = (role) => {
    switch (role) {
      case "user":
        return t('users.employee');
      case "admin_ga":
        return t('users.admin');
      case "procurement":
        return t('users.procurement');
      default:
        return role;
    }
  };

  const formatConditionLabel = (condition) => {
    switch (condition) {
      case "excellent":
        return t('assets.excellent');
      case "good":
        return t('assets.good');
      case "fair":
        return t('assets.fair');
      case "poor":
        return t('assets.poor');
      default:
        return condition;
    }
  };

  const formatMethodLabel = (method) => {
    switch (method) {
      case "purchase":
        return t('assets.purchase');
      case "donation":
        return t('assets.donation');
      case "lease":
        return t('assets.lease');
      case "manufactured":
        return t('assets.manufactured');
      default:
        return method;
    }
  };

  return {
    formatStatusLabel,
    formatPriorityLabel,
    formatCategoryLabel,
    formatRoleLabel,
    formatConditionLabel,
    formatMethodLabel,
  };
};





