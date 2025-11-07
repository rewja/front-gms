import React from "react";
import ModalPortal from "../../ModalPortal";
import { formatTargetCategory } from "../todoHelpers";

const RoutineDetailModal = ({
  isOpen,
  routineDetail,
  onClose,
  formatTargetCategoryLocal,
  t,
}) => {
  if (!isOpen || !routineDetail) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/60 z-[1100] flex items-center justify-center p-4">
        <div className="relative mx-auto border border-gray-200 w-full max-w-md shadow-lg rounded-xl bg-white">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("todos.routineDetails")}
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <div>
                <span className="text-gray-500">{t("todos.taskName")}:</span>{" "}
                {routineDetail.title}
              </div>
              {routineDetail.description && (
                <div>
                  <span className="text-gray-500">{t("todos.description")}:</span>{" "}
                  {routineDetail.description}
                </div>
              )}
              <div>
                <span className="text-gray-500">
                  {t("todos.targetAssignment")}:
                </span>{" "}
                {formatTargetCategoryLocal(routineDetail.target_category)}
              </div>
              <div>
                <span className="text-gray-500">{t("todos.start")}:</span>{" "}
                {routineDetail.start}
              </div>
              <div>
                <span className="text-gray-500">{t("todos.pattern")}:</span>{" "}
                {routineDetail.pattern}
              </div>
              {routineDetail.days && (
                <div>
                  <span className="text-gray-500">{t("todos.days")}:</span>{" "}
                  {routineDetail.days}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default RoutineDetailModal;

