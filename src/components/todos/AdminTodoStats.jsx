import React from "react";
import {
  Clock,
  Play,
  Pause,
  Eye,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import SkeletonLoader from "../SkeletonLoader";

const AdminTodoStats = ({ distribution, statusFilter, onStatusFilterChange, loading, t }) => {
  if (loading) {
    return (
      <>
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="stats" />
      </>
    );
  }

  const stats = [
    {
      key: "not_started",
      icon: Clock,
      color: "yellow",
      count: distribution.not_started,
      label: t("todos.notStarted"),
    },
    {
      key: "in_progress",
      icon: Play,
      color: "blue",
      count: distribution.in_progress,
      label: t("todos.inProgress"),
    },
    {
      key: "hold",
      icon: Pause,
      color: "pink",
      count: distribution.hold,
      label: t("todos.hold"),
    },
    {
      key: "checking",
      icon: Eye,
      color: "orange",
      count: distribution.checking,
      label: t("todos.checking"),
    },
    {
      key: "evaluating",
      icon: AlertCircle,
      color: "purple",
      count: distribution.evaluating,
      label: t("todos.evaluating"),
    },
    {
      key: "completed",
      icon: CheckCircle2,
      color: "green",
      count: distribution.completed,
      label: t("todos.completed"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = statusFilter === stat.key;
        const colorClasses = {
          yellow: "ring-yellow-500 bg-yellow-50",
          blue: "ring-blue-500 bg-blue-50",
          pink: "ring-pink-500 bg-pink-50",
          orange: "ring-orange-500 bg-orange-50",
          purple: "ring-purple-500 bg-purple-50",
          green: "ring-green-500 bg-green-50",
        };
        const iconColors = {
          yellow: "text-yellow-500",
          blue: "text-blue-500",
          pink: "text-pink-500",
          orange: "text-orange-500",
          purple: "text-purple-500",
          green: "text-green-500",
        };

        return (
          <div
            key={stat.key}
            className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${
              isActive ? `ring-2 ${colorClasses[stat.color]}` : ""
            }`}
            onClick={() =>
              onStatusFilterChange(
                statusFilter === stat.key ? "all" : stat.key
              )
            }
            role="button"
            tabIndex={0}
          >
            <div className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconColors[stat.color]}`} />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">
                      {stat.count}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminTodoStats;

