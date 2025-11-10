import React from "react";
import ModalPortal from "../../ModalPortal";
import { api } from "../../../lib/api";

const CreateConfirmModal = ({
  isOpen,
  createSummary,
  onClose,
  onConfirm,
  isCreating,
  formatTargetCategoryLocal,
  t,
}) => {
  if (!isOpen || !createSummary) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/60 z-[1100] flex items-center justify-center p-4">
        <div className="relative mx-auto border border-gray-200 w-full max-w-md shadow-lg rounded-xl bg-white">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("common.confirmDetails", { defaultValue: "Confirm Details" })}
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <div>
                <span className="text-gray-500">{t("todos.taskName")}:</span>{" "}
                {createSummary.title}
              </div>
              {createSummary.description && (
                <div>
                  <span className="text-gray-500">{t("todos.description")}:</span>{" "}
                  {createSummary.description}
                </div>
              )}
              <div>
                <span className="text-gray-500">
                  {t("todos.targetAssignment")}:
                </span>{" "}
                {formatTargetCategoryLocal(createSummary.target_category)}
                {createSummary.selected_users
                  ? ` (${createSummary.selected_users} ${t("common.selected", { defaultValue: "selected" })})`
                  : ""}
              </div>
              {createSummary.type === "tambahan" ? (
                <>
                  <div>
                    <span className="text-gray-500">{t("common.date")}:</span>{" "}
                    {createSummary.date || "-"}
                  </div>
                  <div>
                    <span className="text-gray-500">{t("todos.startTime")}:</span>{" "}
                    {createSummary.start_time || "-"}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-gray-500">{t("todos.start")}:</span>{" "}
                    {createSummary.start}
                  </div>
                  <div>
                    <span className="text-gray-500">{t("todos.pattern")}:</span>{" "}
                    {createSummary.pattern}
                  </div>
                  {createSummary.days && (
                    <div>
                      <span className="text-gray-500">{t("todos.days")}:</span>{" "}
                      {createSummary.days}
                    </div>
                  )}
                  {createSummary.preview !== undefined && createSummary.preview !== null && (
                    <div className="text-xs text-gray-500 mt-2">
                      {t("todos.willCreateTasksThisMonth", { count: createSummary.preview })}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-primary px-6 py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isCreating}
              >
                {isCreating
                  ? t("common.processing", { defaultValue: "Processing..." })
                  : t("common.create", { defaultValue: "Create" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreateConfirmModal;

