import React from "react";
import { api } from "../../../lib/api";

const EditRoutineModal = ({
  isOpen,
  routineGroupEdited,
  routineForm,
  onRoutineFormChange,
  routineStrategy,
  onRoutineStrategyChange,
  routinePreviewCount,
  users,
  onClose,
  onSubmit,
  onSuccess,
  t,
}) => {
  if (!isOpen || !routineGroupEdited) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/40 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto border border-gray-200 w-full max-w-2xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t("todos.editRoutine")}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Group: {routineGroupEdited.title}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Confirmation summary
                const summary = `Title: ${routineForm.title}\nCategory: ${
                  routineForm.target_category
                }${
                  routineForm.selected_user_ids?.length
                    ? ` (selected ${routineForm.selected_user_ids.length})`
                    : ""
                }\nRecurrence: Every ${routineForm.recurrence_interval} ${
                  routineForm.recurrence_unit
                }${routineForm.recurrence_interval > 1 ? "s" : ""} × ${
                  (routineForm.recurrence_count ?? 0) || "∞"
                }\nStart: ${
                  routineForm.recurrence_start_date || "(today)"
                }\nWill create approximately ${routinePreviewCount} tasks this month.`;
                if (!window.confirm(`Apply routine changes?\n\n${summary}`))
                  return;

                // If delete & recreate current month
                if (routineStrategy === "delete_recreate") {
                  const delPayload = {
                    title: routineGroupEdited.title,
                    recurrence_interval:
                      routineGroupEdited.sample?.recurrence_interval || 1,
                    recurrence_unit:
                      routineGroupEdited.sample?.recurrence_unit || "day",
                    target_category:
                      routineGroupEdited.sample?.target_category || undefined,
                    recurrence_count:
                      routineGroupEdited.sample?.recurrence_count ?? 0,
                    user_id:
                      routineGroupEdited.users.length === 1
                        ? routineGroupEdited.users[0].id
                        : undefined,
                  };
                  await api.post("/todos/routine-group/delete", delPayload);
                }

                // Create new routine occurrences
                const createPayload = { ...routineForm };
                // if target_category !== all and no selected users, assign to all in that category
                if (
                  createPayload.target_category !== "all" &&
                  (!createPayload.selected_user_ids ||
                    createPayload.selected_user_ids.length === 0)
                ) {
                  const ids = users
                    .filter(
                      (u) =>
                        u.role === "user" &&
                        u.category === createPayload.target_category
                    )
                    .map((u) => u.id);
                  createPayload.selected_user_ids = ids;
                }
                await api.post("/todos", createPayload);

                const [todosRes, usersRes] = await Promise.all([
                  api.get("/todos/all"),
                  api.get("/users"),
                ]);
                onSuccess(todosRes, usersRes);
                onClose();
              } catch (er) {
                alert(
                  er?.response?.data?.message || "Failed to update routine"
                );
              }
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("todos.taskName")}
              </label>
              <input
                type="text"
                required
                value={routineForm.title}
                onChange={(e) =>
                  onRoutineFormChange({ ...routineForm, title: e.target.value })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={routineForm.priority}
                onChange={(e) =>
                  onRoutineFormChange({
                    ...routineForm,
                    priority: e.target.value,
                  })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("todos.targetAssignment")}
              </label>
              <select
                value={routineForm.target_category}
                onChange={(e) =>
                  onRoutineFormChange({
                    ...routineForm,
                    target_category: e.target.value,
                    selected_user_ids: [],
                  })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="all">{t("todos.allCategory")}</option>
                <option value="ob">
                  {t("common.categories.obEquipment")}
                </option>
                <option value="driver">
                  {t("common.categories.driverEquipment")}
                </option>
                <option value="security">
                  {t("common.categories.securityEquipment")}
                </option>
                <option value="magang_pkl">
                  {t("common.employeeTypes.magang_pkl")}
                </option>
              </select>
            </div>
            {routineForm.target_category !== "all" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To (optional)
                </label>
                <div className="max-h-32 overflow-auto border rounded-md">
                  {users
                    .filter(
                      (u) =>
                        u.role === "user" &&
                        u.category === routineForm.target_category
                    )
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={routineForm.selected_user_ids.includes(
                            u.id
                          )}
                          onChange={(e) => {
                            const next = new Set(routineForm.selected_user_ids);
                            if (e.target.checked) next.add(u.id);
                            else next.delete(u.id);
                            onRoutineFormChange({
                              ...routineForm,
                              selected_user_ids: Array.from(next),
                            });
                          }}
                        />
                        <span className="text-sm text-gray-700">{u.name}</span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Biarkan kosong untuk assign ke semua user di kategori ini.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("common.startDate")}
              </label>
              <input
                type="date"
                value={routineForm.recurrence_start_date}
                onChange={(e) =>
                  onRoutineFormChange({
                    ...routineForm,
                    recurrence_start_date: e.target.value,
                  })
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.every")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={routineForm.recurrence_interval}
                  onChange={(e) =>
                    onRoutineFormChange({
                      ...routineForm,
                      recurrence_interval: parseInt(
                        e.target.value || "1",
                        10
                      ),
                    })
                  }
                  className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.unit")}
                </label>
                <select
                  value={routineForm.recurrence_unit}
                  onChange={(e) =>
                    onRoutineFormChange({
                      ...routineForm,
                      recurrence_unit: e.target.value,
                    })
                  }
                  className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>

            {routineForm.recurrence_unit === "week" && (
              <div className="grid grid-cols-1 gap-3 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Days of week
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    {[
                      { v: 1, l: "Mon" },
                      { v: 2, l: "Tue" },
                      { v: 3, l: "Wed" },
                      { v: 4, l: "Thu" },
                      { v: 5, l: "Fri" },
                      { v: 6, l: "Sat" },
                      { v: 0, l: "Sun" },
                    ].map((d) => (
                      <label
                        key={d.v}
                        className="flex items-center gap-2 border rounded px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={(
                            Array.isArray(routineForm.days_of_week)
                              ? routineForm.days_of_week
                              : []
                          ).includes(d.v)}
                          onChange={(e) => {
                            const base = Array.isArray(routineForm.days_of_week)
                              ? routineForm.days_of_week
                              : [];
                            const next = new Set(base);
                            if (e.target.checked) next.add(d.v);
                            else next.delete(d.v);
                            onRoutineFormChange({
                              ...routineForm,
                              days_of_week: Array.from(next),
                            });
                          }}
                        />
                        <span>{d.l}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pilih hari-hari dalam minggu untuk penjadwalan.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("common.applyStrategy")}
              </label>
              <div className="space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="routineStrategy"
                    checked={routineStrategy === "future_only"}
                    onChange={() => onRoutineStrategyChange("future_only")}
                  />
                  <span>
                    Apply to future only (create new from start date)
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="routineStrategy"
                    checked={routineStrategy === "delete_recreate"}
                    onChange={() => onRoutineStrategyChange("delete_recreate")}
                  />
                  <span>{t("todos.deleteRecreate")}</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 border border-gray-200">
              <p className="font-medium mb-1">Preview:</p>
              <p>
                Sekitar <strong>{routinePreviewCount}</strong> tugas akan dibuat
                bulan ini.
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-3 text-sm font-medium"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRoutineModal;

