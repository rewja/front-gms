import React from "react";
import ModalPortal from "../../ModalPortal";
import { Eye } from "lucide-react";
import { getStorageUrl } from "../../../config/api";
import { getDuration } from "../todoHelpers";

const TodoEvidenceModal = ({
  isOpen,
  todo,
  onClose,
  onEvaluate,
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
              {t("todos.evidence")} untuk: {todo.title}
            </h3>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("todos.taskDetails")}
                </h4>
                <p className="text-sm text-gray-600 mb-2">{todo.description}</p>
                <div className="text-xs text-gray-500">
                  <p>
                    {t("todos.user")}: {getUserName(todo.user_id)}
                  </p>
                  <p>
                    {t("todos.submitted")}:{" "}
                    {todo.formatted_submitted_at || "N/A"}
                  </p>
                  <p>
                    {t("todos.duration")}: {getDuration(todo)}
                  </p>
                  <p>
                    {t("todos.created")}:{" "}
                    {todo.formatted_created_at || "N/A"}
                  </p>
                </div>
              </div>

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

              {todo.evidence_path && !todo.evidence_files && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Evidence File
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <a
                      href={`/storage/${todo.evidence_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Evidence File
                    </a>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t("common.close")}
                </button>
                {onEvaluate && (
                  <button
                    onClick={() => {
                      onClose();
                      onEvaluate(todo);
                    }}
                    className="btn-primary px-6 py-3 text-sm font-medium"
                  >
                    Evaluate Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TodoEvidenceModal;

