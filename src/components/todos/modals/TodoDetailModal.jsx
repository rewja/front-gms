import React from "react";
import ModalPortal from "../../ModalPortal";
import { Eye } from "lucide-react";
import { getStorageUrl } from "../../../config/api";
import { getStatusColor } from "../TodoStatusIcon";
import {
  formatTargetCategory,
  formatStatusLabel,
  getDuration,
  getTargetStartTime,
} from "../todoHelpers";

const TodoDetailModal = ({
  isOpen,
  todo,
  onClose,
  getUserName,
  formatTargetCategoryLocal,
  formatStatusLabelLocal,
  i18n,
  t,
}) => {
  if (!isOpen || !todo) return null;

  const localeTag = i18n.language === "id" ? "id-ID" : "en-US";
  const dateText = todo.scheduled_date
    ? new Date(todo.scheduled_date).toLocaleDateString(localeTag, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : todo.formatted_created_at ||
      new Date(todo.created_at).toLocaleDateString(localeTag, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  const hhmm = getTargetStartTime(todo);
  const formattedDate = hhmm ? `${dateText}, ${hhmm}` : dateText;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
        <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {t("todos.taskDetails")}: {todo.title}
            </h3>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("todos.basicInformation")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">
                      <strong>{t("todos.taskName")}:</strong> {todo.title}
                    </p>
                    <p className="text-gray-600">
                      <strong>{t("todos.description")}:</strong>{" "}
                      {todo.description || "N/A"}
                    </p>
                    <p className="text-gray-600">
                      <strong>{t("todos.status")}:</strong>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          todo.status
                        )}`}
                      >
                        {formatStatusLabelLocal(todo.status)}
                      </span>
                    </p>
                    <p className="text-gray-600">
                      <strong>{t("todos.todoType")}:</strong>{" "}
                      {(todo.todo_type || "rutin") === "rutin"
                        ? t("todos.routine", { defaultValue: "Routine" })
                        : t("todos.additional", { defaultValue: "Additional" })}
                    </p>
                    <p className="text-gray-600">
                      <strong>{t("todos.targetCategory")}:</strong>{" "}
                      {formatTargetCategoryLocal(todo.target_category)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      <strong>{t("todos.user")}:</strong>{" "}
                      {getUserName(todo.user_id)}
                    </p>
                    <p className="text-gray-600">
                      <strong>{t("todos.scheduledDate")}:</strong> {formattedDate}
                    </p>
                    <p className="text-gray-600">
                      <strong>{t("todos.created")}:</strong>{" "}
                      {todo.formatted_created_at || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("todos.targetInfo", { defaultValue: "Informasi Target" })}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">
                      <strong>
                        {t("todos.targetStartTime", {
                          defaultValue: "Waktu Mulai Target",
                        })}
                        :
                      </strong>{" "}
                      {todo.target_start_at || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      <strong>
                        {t("todos.targetDuration", {
                          defaultValue: "Durasi Target",
                        })}
                        :
                      </strong>{" "}
                      {todo.target_duration_formatted ||
                        (todo.target_duration_value &&
                        todo.target_duration_unit
                          ? `${todo.target_duration_value} ${
                              todo.target_duration_unit === "hours"
                                ? "jam"
                                : "menit"
                            }`
                          : "N/A")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actual Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("todos.actualInfo", {
                    defaultValue: "Informasi Aktual",
                  })}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">
                      <strong>
                        {t("todos.actualStartTime", {
                          defaultValue: "Waktu Mulai Aktual",
                        })}
                        :
                      </strong>{" "}
                      {todo.started_at || "Belum dimulai"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      <strong>
                        {t("todos.actualDuration", {
                          defaultValue: "Durasi Aktual",
                        })}
                        :
                      </strong>{" "}
                      {getDuration(todo)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("todos.duration")}
                </h4>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>{t("todos.workDuration")}:</strong>{" "}
                    {getDuration(todo)}
                  </p>
                </div>
              </div>

              {/* Rating */}
              {todo.rating !== null && todo.rating !== undefined && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Performance Rating
                  </h4>
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {todo.rating}/5
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(todo.rating / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {todo.warnings?.report?.points && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Warning Report
                  </h4>
                  <div className="text-sm">
                    <p className="text-gray-600">
                      <strong>Points:</strong> {todo.warnings.report.points}
                    </p>
                    <p className="text-gray-600">
                      <strong>Level:</strong> {todo.warnings.report.level}
                    </p>
                    <p className="text-gray-600">
                      <strong>Note:</strong>{" "}
                      {todo.warnings.report.note || "N/A"}
                    </p>
                    <p className="text-gray-600">
                      <strong>Published:</strong>{" "}
                      {todo.warnings.report.published_at || "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Hold Note */}
              {todo.hold_note && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {t("todos.holdInfo", { defaultValue: "Informasi Hold" })}
                  </h4>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>
                        {t("todos.holdReason", {
                          defaultValue: "Alasan Hold",
                        })}
                        :
                      </strong>{" "}
                      {todo.hold_note}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {todo.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Admin Notes
                  </h4>
                  <p className="text-sm text-gray-600">{todo.notes}</p>
                </div>
              )}

              {/* Evidence Files */}
              {todo.evidence_files && todo.evidence_files.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {t("todos.evidenceFiles")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {todo.evidence_files.map((file, index) => (
                      <div
                        key={index}
                        className="border rounded-lg overflow-hidden bg-white"
                      >
                        {/\.(jpg|jpeg|png|gif)$/i.test(
                          file.path || file.url || file.full_url
                        ) ? (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              window.open(
                                file.full_url ||
                                  file.url ||
                                  getStorageUrl(`storage/${file.path}`),
                                "_blank"
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                window.open(
                                  file.full_url ||
                                    file.url ||
                                    getStorageUrl(`storage/${file.path}`),
                                  "_blank"
                                );
                            }}
                            className="cursor-pointer"
                          >
                            <img
                              src={
                                file.full_url ||
                                file.url ||
                                getStorageUrl(`storage/${file.path}`)
                              }
                              alt={file.name || `Evidence ${index + 1}`}
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                console.log("Image failed to load:", {
                                  src: file.full_url || file.url,
                                  file: file,
                                  error: e,
                                });
                                const fallbackUrl = getStorageUrl(
                                  `storage/${file.path}`
                                );
                                if (e.target.src !== fallbackUrl) {
                                  e.target.src = fallbackUrl;
                                } else {
                                  e.target.style.display = "none";
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="p-3 flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <a
                              href={
                                file.full_url ||
                                file.url ||
                                getStorageUrl(`storage/${file.path}`)
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {file.name || `Evidence File ${index + 1}`}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TodoDetailModal;

