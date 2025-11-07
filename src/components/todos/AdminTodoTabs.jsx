import React from "react";

const AdminTodoTabs = ({ todoTab, onTabChange, filteredTodos, t }) => {
  const tambahanCount = filteredTodos.filter(
    (t) => (t.todo_type || "rutin") !== "rutin"
  ).length;
  const rutinCount = filteredTodos.filter(
    (t) => (t.todo_type || "rutin") === "rutin"
  ).length;

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange("all")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            todoTab === "all"
              ? "border-accent-500 text-accent-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {t("todos.allTodos")} ({filteredTodos.length})
        </button>
        <button
          onClick={() => onTabChange("rutin")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            todoTab === "rutin"
              ? "border-accent-500 text-accent-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {t("todos.routine")} ({rutinCount})
        </button>
        <button
          onClick={() => onTabChange("tambahan")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            todoTab === "tambahan"
              ? "border-accent-500 text-accent-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {t("todos.additional")} ({tambahanCount})
        </button>
      </nav>
    </div>
  );
};

export default AdminTodoTabs;

