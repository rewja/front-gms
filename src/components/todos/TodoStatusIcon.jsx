import React from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Pause,
} from "lucide-react";

export const getStatusIcon = (status, reworked = false) => {
  switch (status) {
    case "not_started":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "in_progress":
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    case "hold":
      return <Pause className="h-4 w-4 text-pink-500" />;
    case "checking":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case "evaluating":
      return (
        <CheckCircle
          className={`h-4 w-4 ${
            reworked ? "text-orange-500" : "text-purple-500"
          }`}
        />
      );
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case "not_started":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "hold":
      return "bg-pink-100 text-pink-800 border border-pink-200";
    case "checking":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    case "evaluating":
      return "bg-purple-100 text-purple-800 border border-purple-200";
    case "completed":
      return "bg-green-100 text-green-800 border border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

export default getStatusIcon;

