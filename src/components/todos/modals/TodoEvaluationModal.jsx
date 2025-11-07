import React from "react";
import ModalPortal from "../../ModalPortal";
import { Eye } from "lucide-react";
import { getStorageUrl } from "../../../config/api";
import { getDuration, calculateAutomaticRating } from "../todoHelpers";

const TodoEvaluationModal = ({
  isOpen,
  todo,
  evaluationData,
  onEvaluationDataChange,
  onClose,
  onSubmit,
  getUserName,
  t,
}) => {
  if (!isOpen || !todo) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
        <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {t("todos.evaluateTask")}: {todo.title}
            </h3>
            <div className="space-y-6">
              {/* Evidence Review Section */}
              {todo.evidence_files && todo.evidence_files.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {t("todos.evidenceReview", {
                      defaultValue: "Review Bukti Pengerjaan",
                    })}
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
                              className="w-full h-32 object-cover"
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
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
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

              {/* Task Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("todos.taskInfo", { defaultValue: "Informasi Tugas" })}
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>{t("todos.user")}:</strong> {getUserName(todo.user_id)}
                  </p>
                  <p>
                    <strong>{t("todos.duration")}:</strong> {getDuration(todo)}
                  </p>
                  <p>
                    <strong>{t("todos.targetDuration")}:</strong>{" "}
                    {todo.target_duration_formatted || "N/A"}
                  </p>
                  {todo.evidence_note && (
                    <p>
                      <strong>
                        {t("todos.userNote", {
                          defaultValue: "Catatan User",
                        })}
                        :
                      </strong>{" "}
                      {todo.evidence_note}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.notes")}
                </label>
                <textarea
                  value={evaluationData.notes}
                  onChange={(e) =>
                    onEvaluationDataChange({
                      ...evaluationData,
                      notes: e.target.value,
                    })
                  }
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder={t("todos.evaluationPlaceholder")}
                />
              </div>

              {/* Rating */}
              <div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Performance Rating (otomatis)
                  </label>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {evaluationData.rating ?? "-"}/5
                    </div>
                    <div className="text-sm text-gray-500">
                      Nilai dihitung otomatis dari perbandingan waktu pengerjaan
                      aktual dan target.
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  onClick={onSubmit}
                  className="btn-primary px-6 py-3 text-sm font-medium"
                >
                  {t("todos.evaluate")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TodoEvaluationModal;

