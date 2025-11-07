import React from "react";
import ModalPortal from "../../ModalPortal";

const CreateEditTodoModal = ({
  isOpen,
  editingTodo,
  formData,
  onFormDataChange,
  modalUserSearch,
  onModalUserSearchChange,
  assignAllInCategory,
  onAssignAllInCategoryChange,
  users,
  createRoutinePreviewCount,
  createRoutinePreviewPerUser,
  createRoutinePreviewUsers,
  onClose,
  onSubmit,
  notifyError,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/60 z-[1000] flex items-center justify-center p-4">
        <div className="relative mx-auto border border-gray-200 w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingTodo
                ? t("common.editTodo")
                : t("common.createNewTodo")}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
              className="space-y-8"
            >
              {/* Informasi Penugasan */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Informasi Penugasan
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.targetAssignment")}
                    </label>
                    <select
                      value={formData.target_category}
                      onChange={(e) => {
                        onFormDataChange({
                          ...formData,
                          target_category: e.target.value,
                          selected_user_ids: [],
                        });
                        onAssignAllInCategoryChange(false);
                      }}
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="all">{t("todos.allCategory")}</option>
                      <option value="ob">{t("todos.officeBoy")}</option>
                      <option value="driver">
                        {t("todos.driverEquipment")}
                      </option>
                      <option value="security">
                        {t("todos.securityEquipment")}
                      </option>
                      <option value="magang_pkl">
                        {t("common.employeeTypes.magang_pkl")}
                      </option>
                    </select>
                  </div>

                  {formData.target_category !== "all" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("todos.assignTo")} (Cari & Pilih Ganda)
                      </label>
                      <input
                        type="text"
                        placeholder={`Cari pengguna ${formData.target_category}...`}
                        value={modalUserSearch}
                        onChange={(e) => onModalUserSearchChange(e.target.value)}
                        className="mb-3 block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      />

                      {/* Assign to All Option */}
                      <div className="mb-3">
                        <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-blue-50">
                          <input
                            type="checkbox"
                            checked={assignAllInCategory}
                            onChange={(e) => {
                              onAssignAllInCategoryChange(e.target.checked);
                              if (e.target.checked) {
                                const allUserIds = users
                                  .filter(
                                    (u) =>
                                      u.category === formData.target_category
                                  )
                                  .map((u) => u.id);
                                onFormDataChange({
                                  ...formData,
                                  selected_user_ids: allUserIds,
                                });
                              } else {
                                onFormDataChange({
                                  ...formData,
                                  selected_user_ids: [],
                                });
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-blue-900">
                            {t("todos.assignToAll")}
                          </span>
                        </label>
                      </div>

                      <div className="max-h-40 overflow-auto border rounded-md">
                        {users
                          .filter(
                            (u) => u.category === formData.target_category
                          )
                          .filter(
                            (u) =>
                              !modalUserSearch ||
                              u.name
                                .toLowerCase()
                                .includes(modalUserSearch.toLowerCase())
                          )
                          .map((u) => (
                            <label
                              key={u.id}
                              className="flex items-center gap-2 px-3 py-3 border-b last:border-b-0 hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={formData.selected_user_ids.includes(
                                  u.id
                                )}
                                onChange={(e) => {
                                  const next = new Set(
                                    formData.selected_user_ids
                                  );
                                  if (e.target.checked) next.add(u.id);
                                  else next.delete(u.id);
                                  onFormDataChange({
                                    ...formData,
                                    selected_user_ids: Array.from(next),
                                  });
                                  onAssignAllInCategoryChange(false);
                                }}
                              />
                              <span className="text-sm">{u.name}</span>
                            </label>
                          ))}
                        {users.filter(
                          (u) =>
                            u.category === formData.target_category &&
                            (!modalUserSearch ||
                              u.name
                                .toLowerCase()
                                .includes(modalUserSearch.toLowerCase()))
                        ).length === 0 && (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            {t("common.noUsersFound")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informasi Tugas */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Informasi Tugas
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.taskName")}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        onFormDataChange({ ...formData, title: e.target.value })
                      }
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="Masukkan nama tugas..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.description")}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        onFormDataChange({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="Masukkan deskripsi tugas..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("todos.todoType")}
                    </label>
                    <select
                      value={formData.todo_type}
                      onChange={(e) =>
                        onFormDataChange({
                          ...formData,
                          todo_type: e.target.value,
                        })
                      }
                      className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="rutin">{t("todos.routine")}</option>
                      <option value="tambahan">
                        {t("todos.additional")}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Waktu */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Waktu
                </h3>
                <div className="space-y-6">
                  {formData.todo_type === "tambahan" && (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("todos.startDate")}
                        </label>
                        <input
                          type="date"
                          value={formData.scheduled_date || ""}
                          onChange={(e) =>
                            onFormDataChange({
                              ...formData,
                              scheduled_date: e.target.value,
                            })
                          }
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jam Mulai
                        </label>
                        <input
                          type="time"
                          value={formData.target_start_at || ""}
                          onChange={(e) => {
                            const selectedTime = e.target.value;
                            const now = new Date();
                            const today = now.toISOString().slice(0, 10);

                            // For today's date, prevent selecting past times
                            if (formData.scheduled_date === today) {
                              const selectedDateTime = new Date(
                                `${today}T${selectedTime}`
                              );
                              if (selectedDateTime < now) {
                                notifyError(
                                  "Waktu mulai tidak boleh lebih awal dari waktu saat ini"
                                );
                                return;
                              }
                            }

                            onFormDataChange({
                              ...formData,
                              target_start_at: selectedTime,
                            });
                          }}
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                      </div>

                      {/* Target Duration Fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Durasi
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.target_duration_value || ""}
                            onChange={(e) =>
                              onFormDataChange({
                                ...formData,
                                target_duration_value: e.target.value,
                              })
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            placeholder="Masukkan durasi target"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Satuan Durasi
                          </label>
                          <select
                            value={formData.target_duration_unit}
                            onChange={(e) =>
                              onFormDataChange({
                                ...formData,
                                target_duration_unit: e.target.value,
                              })
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          >
                            <option value="minutes">Menit</option>
                            <option value="hours">Jam</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.todo_type === "rutin" && (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("todos.startDate")}
                        </label>
                        <input
                          type="date"
                          value={formData.recurrence_start_date}
                          onChange={(e) =>
                            onFormDataChange({
                              ...formData,
                              recurrence_start_date: e.target.value,
                            })
                          }
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jam Mulai
                        </label>
                        <input
                          type="time"
                          value={formData.target_start_at || ""}
                          onChange={(e) => {
                            const selectedTime = e.target.value;
                            const now = new Date();
                            const today = now.toISOString().slice(0, 10);

                            // For today's date, prevent selecting past times
                            if (formData.recurrence_start_date === today) {
                              const selectedDateTime = new Date(
                                `${today}T${selectedTime}`
                              );
                              if (selectedDateTime < now) {
                                notifyError(
                                  "Waktu mulai tidak boleh lebih awal dari waktu saat ini"
                                );
                                return;
                              }
                            }

                            onFormDataChange({
                              ...formData,
                              target_start_at: selectedTime,
                            });
                          }}
                          className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("todos.every")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={formData.recurrence_interval}
                            onChange={(e) =>
                              onFormDataChange({
                                ...formData,
                                recurrence_interval: parseInt(
                                  e.target.value || "1"
                                ),
                              })
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("todos.unit")}
                          </label>
                          <select
                            value={formData.recurrence_unit}
                            onChange={(e) =>
                              onFormDataChange({
                                ...formData,
                                recurrence_unit: e.target.value,
                              })
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          >
                            <option value="day">{t("todos.day")}</option>
                            <option value="week">{t("todos.week")}</option>
                            <option value="month">{t("todos.month")}</option>
                          </select>
                        </div>
                      </div>

                      {formData.recurrence_unit === "week" && (
                        <div className="grid grid-cols-1 gap-3 mt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              {t("todos.days")}
                            </label>
                            <div className="grid grid-cols-4 gap-2 text-sm">
                              {[
                                { v: 1, l: "Sen" },
                                { v: 2, l: "Sel" },
                                { v: 3, l: "Rab" },
                                { v: 4, l: "Kam" },
                                { v: 5, l: "Jum" },
                                { v: 6, l: "Sab" },
                                { v: 0, l: "Min" },
                              ].map((d) => (
                                <label
                                  key={d.v}
                                  className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      Array.isArray(formData.days_of_week)
                                        ? formData.days_of_week
                                        : []
                                    ).includes(d.v)}
                                    onChange={(e) => {
                                      const base = Array.isArray(
                                        formData.days_of_week
                                      )
                                        ? formData.days_of_week
                                        : [];
                                      const next = new Set(base);
                                      if (e.target.checked) next.add(d.v);
                                      else next.delete(d.v);
                                      onFormDataChange({
                                        ...formData,
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

                      {/* Target Duration Fields for Routine */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Durasi
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.target_duration_value || ""}
                            onChange={(e) =>
                              onFormDataChange({
                                ...formData,
                                target_duration_value: e.target.value,
                              })
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            placeholder="Masukkan durasi target"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Satuan Durasi
                          </label>
                          <select
                            value={formData.target_duration_unit}
                            onChange={(e) =>
                              onFormDataChange({
                                ...formData,
                                target_duration_unit: e.target.value,
                              })
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          >
                            <option value="minutes">Menit</option>
                            <option value="hours">Jam</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 border border-blue-200">
                        <p className="font-medium mb-2">Perkiraan Tugas:</p>
                        <p>
                          Perkiraan 30 hari ke depan — sekitar{" "}
                          {createRoutinePreviewPerUser} tugas per orang ×{" "}
                          {createRoutinePreviewUsers} orang ={" "}
                          {createRoutinePreviewCount} tugas.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-3 text-sm font-medium"
                >
                  {editingTodo
                    ? t("common.update")
                    : t("common.create", { defaultValue: "Create" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreateEditTodoModal;

