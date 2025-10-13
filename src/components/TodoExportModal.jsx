import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, FileSpreadsheet, X } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format, isValid, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// Helper function to safely format dates
const safeFormatDate = (dateString, formatString = "dd/MM/yyyy HH:mm") => {
  if (!dateString) return "-";
  
  try {
    let date;
    if (typeof dateString === 'string') {
      // Try parsing ISO string first
      date = parseISO(dateString);
      if (!isValid(date)) {
        // Fallback to regular Date constructor
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    if (!isValid(date)) {
      return "-";
    }
    
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error, 'for date:', dateString);
    return "-";
  }
};

const TodoExportModal = ({
  isOpen,
  onClose,
  todos,
  currentPage,
  itemsPerPage,
  selectedTodos = [],
  user,
}) => {
  const { t } = useTranslation();
  const [exportType, setExportType] = useState("pdf");
  const [exportScope, setExportScope] = useState("page");
  const [customRange, setCustomRange] = useState({ from: 1, to: 10 });
  const [isExporting, setIsExporting] = useState(false);

  // Update custom range when todos change
  useEffect(() => {
    if (todos.length > 0) {
      setCustomRange({ from: 1, to: Math.min(todos.length, 10) });
    }
  }, [todos]);

  const getExportData = () => {
    let dataToExport = [];

    switch (exportScope) {
      case "page": {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        dataToExport = todos.slice(startIndex, endIndex);
        break;
      }
      case "selected": {
        dataToExport = todos.filter((todo) =>
          selectedTodos.includes(todo.id)
        );
        break;
      }
      case "custom": {
        const fromIndex = Math.max(0, customRange.from - 1);
        const toIndex = Math.min(todos.length, customRange.to);
        dataToExport = todos.slice(fromIndex, toIndex);
        break;
      }
      default: {
        dataToExport = todos;
        break;
      }
    }

    return dataToExport;
  };

  const formatTodoData = (todo, index) => {
    return {
      "No": index + 1,
      "ID": todo.id,
      "Title": todo.title,
      "Description": todo.description || "-",
      "Status": todo.status,
      "Todo Type": todo.todo_type || "rutin",
      "Target Category": todo.target_category || "-",
      "User": todo.user?.name || "Unknown User",
      "Scheduled Date": safeFormatDate(todo.scheduled_date, "dd/MM/yyyy"),
      "Target Start Time": todo.target_start_at || "-",
      "Target Duration": todo.target_duration_formatted || "-",
      "Actual Duration": todo.total_work_time_formatted || "-",
      "Rating": todo.rating || "-",
      "Created At": safeFormatDate(todo.created_at),
      "Submitted At": safeFormatDate(todo.submitted_at),
    };
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);

      const { autoTable } = await import("jspdf-autotable");

      const dataToExport = getExportData();

      const pdf = new jsPDF("landscape", "mm", "a3");
      const pageWidth = pdf.internal.pageSize.width;

      // Header
      pdf.setFontSize(16);
      pdf.text("Todo Management Report", pageWidth / 2, 20, { align: "center" });

      pdf.setFontSize(10);
      pdf.text(`Export Date: ${safeFormatDate(new Date())}`, 14, 30);
      pdf.text(`Exported by: ${user?.name}`, 14, 35);
      pdf.text(`Total Todos: ${dataToExport.length}`, 14, 40);

      const startY = 50;

      // Table data
      const tableData = dataToExport.map((todo, index) => {
        const formatted = formatTodoData(todo, index);
        return [
          formatted["No"],
          formatted["ID"],
          formatted["Title"],
          formatted["Status"],
          formatted["Todo Type"],
          formatted["Target Category"],
          formatted["User"],
          formatted["Scheduled Date"],
          formatted["Target Start Time"],
          formatted["Actual Duration"],
          formatted["Rating"],
          formatted["Created At"],
        ];
      });

      // Table headers
      const headers = [
        "No",
        "ID",
        "Title",
        "Status",
        "Type",
        "Category",
        "User",
        "Scheduled Date",
        "Start Time",
        "Duration",
        "Rating",
        "Created At",
      ];

      autoTable(pdf, {
        head: [headers],
        body: tableData,
        startY: startY,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 },
      });

      const fileName = `todo_management_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const dataToExport = getExportData();

      const excelData = dataToExport.map((todo, index) =>
        formatTodoData(todo, index)
      );

      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws["!cols"] = [
        { wch: 5 }, // No
        { wch: 8 }, // ID
        { wch: 30 }, // Title
        { wch: 40 }, // Description
        { wch: 15 }, // Status
        { wch: 15 }, // Todo Type
        { wch: 20 }, // Target Category
        { wch: 25 }, // User
        { wch: 15 }, // Scheduled Date
        { wch: 15 }, // Target Start Time
        { wch: 20 }, // Target Duration
        { wch: 20 }, // Actual Duration
        { wch: 10 }, // Rating
        { wch: 20 }, // Created At
        { wch: 20 }, // Submitted At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Todos");

      // Add metadata sheet
      const metaData = [
        { Field: "Export Date", Value: safeFormatDate(new Date()) },
        { Field: "Exported by", Value: user?.name },
        { Field: "Total Todos", Value: dataToExport.length },
        { Field: "Export Scope", Value: exportScope },
      ];

      if (exportScope === "custom") {
        metaData.push({
          Field: "Custom Range",
          Value: `${customRange.from} - ${customRange.to}`,
        });
      }

      const metaWs = XLSX.utils.json_to_sheet(metaData);
      XLSX.utils.book_append_sheet(wb, metaWs, "Export Info");

      const fileName = `todo_management_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(data, fileName);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportType === "pdf") {
      exportToPDF();
    } else {
      exportToExcel();
    }
  };

  const canExportSelected = selectedTodos.length > 0;
  const totalTodos = todos.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto m-4 sm:m-6">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center w-full">
            {t("todos.exportTodos", { defaultValue: "Export Todos" })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t("common.exportType", { defaultValue: "Export Type" })}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportType("pdf")}
                className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                  exportType === "pdf"
                    ? "border-accent-500 bg-accent-50 text-accent-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <FileText className="h-5 w-5 mr-2" />
                PDF
              </button>
              <button
                onClick={() => setExportType("excel")}
                className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                  exportType === "excel"
                    ? "border-accent-500 bg-accent-50 text-accent-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Excel
              </button>
            </div>
          </div>

          {/* Export Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t("common.exportScope", { defaultValue: "Export Scope" })}
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="page"
                  checked={exportScope === "page"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <span className="text-sm">
                  {t("common.currentPage", { defaultValue: "Current Page" })}
                </span>
              </label>
              <label
                className={`flex items-center ${
                  !canExportSelected ? "opacity-50" : ""
                }`}
              >
                <input
                  type="radio"
                  value="selected"
                  checked={exportScope === "selected"}
                  onChange={(e) => setExportScope(e.target.value)}
                  disabled={!canExportSelected}
                  className="mr-3"
                />
                <span className="text-sm">
                  {t("common.selectedItems", { defaultValue: "Selected Items" })} ({selectedTodos.length})
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="custom"
                  checked={exportScope === "custom"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <span className="text-sm">{t("common.customRange", { defaultValue: "Custom Range" })}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={exportScope === "all"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <span className="text-sm">{t("common.allItems", { defaultValue: "All Items" })} ({totalTodos})</span>
              </label>
            </div>
          </div>

          {/* Custom Range Input */}
          {exportScope === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("common.from", { defaultValue: "From" })}
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalTodos}
                  value={customRange.from}
                  onChange={(e) =>
                    setCustomRange({
                      ...customRange,
                      from: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("common.to", { defaultValue: "To" })}
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalTodos}
                  value={customRange.to}
                  onChange={(e) =>
                    setCustomRange({
                      ...customRange,
                      to: Math.min(totalTodos, parseInt(e.target.value) || totalTodos),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{t("common.willExport", { defaultValue: "Will export" })}:</strong> {getExportData().length} {t("common.items", { defaultValue: "items" })} {t("common.as", { defaultValue: "as" })} {exportType.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4 border-t border-gray-200 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            disabled={isExporting}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("common.exporting", { defaultValue: "Exporting" })}...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("common.export", { defaultValue: "Export" })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoExportModal;
