import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, FileSpreadsheet, X } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format, isValid, parseISO } from "date-fns";
import { logExport } from "../services/activityService";
import { id as idLocale } from "date-fns/locale";

// Helper function to safely format dates
const safeFormatDate = (dateString, formatString = "dd/MM/yyyy HH:mm") => {
  if (!dateString || dateString === null || dateString === undefined)
    return "-";

  try {
    let date;
    if (typeof dateString === "string") {
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

    return format(date, formatString, { locale: idLocale });
  } catch (error) {
    console.warn("Date formatting error:", error, "for date:", dateString);
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
  const [filterOptions, setFilterOptions] = useState({
    status: "all",
    type: "all",
  });

  // Update custom range when todos change
  useEffect(() => {
    if (todos.length > 0) {
      setCustomRange({ from: 1, to: Math.min(todos.length, 10) });
    }
  }, [todos]);

  const applyFilters = (todos) => {
    return todos.filter((todo) => {
      const statusMatch =
        filterOptions.status === "all" || todo.status === filterOptions.status;
      const typeMatch =
        filterOptions.type === "all" || todo.todo_type === filterOptions.type;
      return statusMatch && typeMatch;
    });
  };

  const getExportData = () => {
    let dataToExport = [];
    const filteredTodos = applyFilters(todos);

    switch (exportScope) {
      case "page": {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        dataToExport = filteredTodos.slice(startIndex, endIndex);
        break;
      }
      case "selected": {
        dataToExport = filteredTodos.filter((todo) =>
          selectedTodos.includes(todo.id)
        );
        break;
      }
      case "custom": {
        const fromIndex = Math.max(0, customRange.from - 1);
        const toIndex = Math.min(filteredTodos.length, customRange.to);
        dataToExport = filteredTodos.slice(fromIndex, toIndex);
        break;
      }
      default: {
        dataToExport = filteredTodos;
        break;
      }
    }

    return dataToExport;
  };

  const formatTodoData = (todo, index) => {
    const data = {
      No: index + 1,
      ID: todo.id,
      Title: todo.title,
      Description: todo.description || "-",
      Status: todo.status,
      "Todo Type": todo.todo_type || "rutin",
      "Target Category": todo.target_category || "-",
      User: todo.user?.name || "Unknown User",
      "Scheduled Date": safeFormatDate(todo.scheduled_date, "dd/MM/yyyy"),
    };

    // Add duration fields if they exist
    if (todo.target_duration_formatted) {
      data["Target Duration"] = todo.target_duration_formatted;
    } else if (todo.target_duration_value && todo.target_duration_unit) {
      // Create formatted duration if not available
      const unit = todo.target_duration_unit === "hours" ? "jam" : "menit";
      data["Target Duration"] = `${todo.target_duration_value} ${unit}`;
    }

    if (todo.total_work_time_formatted) {
      data["Actual Duration"] = todo.total_work_time_formatted;
    }

    if (todo.rating) {
      data["Rating"] = todo.rating;
    }
    // Removed Created At, Submitted At, and Target Start Time columns as requested

    return data;
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
      pdf.text("Todo Management Report", pageWidth / 2, 20, {
        align: "center",
      });

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
          formatted["Target Duration"] || "-",
          formatted["Actual Duration"] || "-",
          formatted["Rating"] || "-",
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
        "Target Duration",
        "Actual Duration",
        "Rating",
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

      try {
        await logExport({ feature: "Todo", format: "pdf", menu_path: "Admin > Todo" });
      } catch (_) {}
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

      // Dynamic column widths based on actual data
      const allKeys = new Set();
      excelData.forEach((row) =>
        Object.keys(row).forEach((key) => allKeys.add(key))
      );
      const headers = Array.from(allKeys);

      // Set column widths dynamically
      const colWidths = headers.map((header) => {
        switch (header) {
          case "No":
            return { wch: 5 };
          case "ID":
            return { wch: 8 };
          case "Title":
            return { wch: 35 };
          case "Description":
            return { wch: 50 };
          case "Status":
            return { wch: 15 };
          case "Todo Type":
            return { wch: 15 };
          case "Target Category":
            return { wch: 20 };
          case "User":
            return { wch: 25 };
          case "Scheduled Date":
            return { wch: 18 };
          case "Target Duration":
            return { wch: 20 };
          case "Actual Duration":
            return { wch: 20 };
          case "Rating":
            return { wch: 10 };
          default:
            return { wch: 15 };
        }
      });
      ws["!cols"] = colWidths;

      // Set header row data
      headers.forEach((header, index) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!ws[cellAddress]) ws[cellAddress] = { v: header };
        ws[cellAddress].v = header;
      });

      // Add styling to header row
      if (!ws["!rows"]) ws["!rows"] = [];
      ws["!rows"][0] = { hpt: 35 }; // Header row height

      // Add borders and styling to all cells
      const range = XLSX.utils.decode_range(ws["!ref"]);

      // Find status column index dynamically
      const statusColIndex = headers.indexOf("Status");

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) ws[cellAddress] = { v: "" };

          // Determine cell background color
          let cellBgColor = "FFFFFF";
          let borderColor = "D0D7DE";
          let textColor = "24292F";

          if (R === 0) {
            // Header styling
            cellBgColor = "1F2937"; // Dark gray header
            textColor = "FFFFFF";
            borderColor = "374151";
          } else if (R % 2 === 0) {
            cellBgColor = "F8FAFC"; // Very light gray for even rows
          }

          // Status-based coloring
          if (R > 0 && C === statusColIndex) {
            const status = ws[cellAddress]?.v;
            if (status === "completed") {
              cellBgColor = "DCFCE7"; // Light green
              textColor = "166534"; // Dark green
            } else if (status === "in_progress") {
              cellBgColor = "FEF3C7"; // Light yellow
              textColor = "92400E"; // Dark yellow
            } else if (status === "not_started") {
              cellBgColor = "FEE2E2"; // Light red
              textColor = "991B1B"; // Dark red
            }
          }

          // Add cell styling
          ws[cellAddress].s = {
            border: {
              top: { style: "thin", color: { rgb: borderColor } },
              bottom: { style: "thin", color: { rgb: borderColor } },
              left: { style: "thin", color: { rgb: borderColor } },
              right: { style: "thin", color: { rgb: borderColor } },
            },
            alignment: {
              horizontal: R === 0 ? "center" : "left",
              vertical: "middle",
              wrapText: true,
              indent: R === 0 ? 0 : 1,
            },
            font: {
              bold: R === 0 || (R > 0 && C === statusColIndex),
              size: R === 0 ? 11 : 9,
              color: { rgb: textColor },
              name: "Segoe UI",
            },
            fill: {
              fgColor: { rgb: cellBgColor },
            },
          };
        }
      }

      // Add number formatting for specific columns
      for (let R = 1; R <= range.e.r; ++R) {
        const idColIndex = headers.indexOf("ID");
        const ratingColIndex = headers.indexOf("Rating");

        if (idColIndex >= 0) {
          const idCell = XLSX.utils.encode_cell({ r: R, c: idColIndex });
          if (ws[idCell]) {
            ws[idCell].s.numFmt = "0";
          }
        }

        if (ratingColIndex >= 0) {
          const ratingCell = XLSX.utils.encode_cell({
            r: R,
            c: ratingColIndex,
          });
          if (ws[ratingCell] && ws[ratingCell].v !== "-") {
            ws[ratingCell].s.numFmt = "0.0";
          }
        }
      }

      // Add freeze panes (freeze header row)
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };

      // Add auto-filter to header row
      ws["!autofilter"] = {
        ref: `A1:${XLSX.utils.encode_cell({ r: 0, c: headers.length - 1 })}`,
      };

      // Add summary statistics
      const summaryData = [
        { Field: "Total Todos", Value: dataToExport.length },
        {
          Field: "Completed",
          Value: dataToExport.filter((t) => t.status === "completed").length,
        },
        {
          Field: "In Progress",
          Value: dataToExport.filter((t) => t.status === "in_progress").length,
        },
        {
          Field: "Not Started",
          Value: dataToExport.filter((t) => t.status === "not_started").length,
        },
        {
          Field: "Completion Rate",
          Value: `${Math.round(
            (dataToExport.filter((t) => t.status === "completed").length /
              dataToExport.length) *
              100
          )}%`,
        },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Todos");

      // Add summary sheet
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs["!cols"] = [{ wch: 20 }, { wch: 15 }];

      // Style summary sheet
      const summaryRange = XLSX.utils.decode_range(summaryWs["!ref"]);
      for (let R = summaryRange.s.r; R <= summaryRange.e.r; ++R) {
        for (let C = summaryRange.s.c; C <= summaryRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (summaryWs[cellAddress]) {
            summaryWs[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "D0D7DE" } },
                bottom: { style: "thin", color: { rgb: "D0D7DE" } },
                left: { style: "thin", color: { rgb: "D0D7DE" } },
                right: { style: "thin", color: { rgb: "D0D7DE" } },
              },
              alignment: {
                horizontal: "left",
                vertical: "middle",
                wrapText: true,
              },
              font: {
                bold: R === 0,
                size: R === 0 ? 11 : 9,
                name: "Segoe UI",
                color: { rgb: R === 0 ? "FFFFFF" : "24292F" },
              },
              fill: {
                fgColor: { rgb: R === 0 ? "1F2937" : "FFFFFF" },
              },
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

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

      // Set column widths for metadata sheet
      metaWs["!cols"] = [
        { wch: 25 }, // Field column
        { wch: 40 }, // Value column
      ];

      // Style metadata sheet with modern design
      const metaRange = XLSX.utils.decode_range(metaWs["!ref"]);
      for (let R = metaRange.s.r; R <= metaRange.e.r; ++R) {
        for (let C = metaRange.s.c; C <= metaRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (metaWs[cellAddress]) {
            metaWs[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "D0D7DE" } },
                bottom: { style: "thin", color: { rgb: "D0D7DE" } },
                left: { style: "thin", color: { rgb: "D0D7DE" } },
                right: { style: "thin", color: { rgb: "D0D7DE" } },
              },
              alignment: {
                horizontal: "left",
                vertical: "middle",
                wrapText: true,
                indent: 1,
              },
              font: {
                bold: R === 0,
                size: R === 0 ? 11 : 9,
                name: "Segoe UI",
                color: { rgb: R === 0 ? "FFFFFF" : "24292F" },
              },
              fill: {
                fgColor: { rgb: R === 0 ? "1F2937" : "FFFFFF" },
              },
            };
          }
        }
      }

      // Set row height for metadata sheet
      if (!metaWs["!rows"]) metaWs["!rows"] = [];
      for (let R = metaRange.s.r; R <= metaRange.e.r; ++R) {
        metaWs["!rows"][R] = { hpt: 30 };
      }

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

      try {
        await logExport({ feature: "Todo", format: "excel", menu_path: "Admin > Todo" });
      } catch (_) {}
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
                  {t("common.selectedItems", {
                    defaultValue: "Selected Items",
                  })}{" "}
                  ({selectedTodos.length})
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
                <span className="text-sm">
                  {t("common.customRange", { defaultValue: "Custom Range" })}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={exportScope === "all"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <span className="text-sm">
                  {t("common.allItems", { defaultValue: "All Items" })} (
                  {totalTodos})
                </span>
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
                      to: Math.min(
                        totalTodos,
                        parseInt(e.target.value) || totalTodos
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t("common.filters", { defaultValue: "Filters" })}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={filterOptions.status}
                onChange={(e) =>
                  setFilterOptions({ ...filterOptions, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="all">
                  {t("common.allStatuses", { defaultValue: "All Statuses" })}
                </option>
                <option value="completed">
                  {t("common.completed", { defaultValue: "Completed" })}
                </option>
                <option value="in_progress">
                  {t("common.inProgress", { defaultValue: "In Progress" })}
                </option>
                <option value="not_started">
                  {t("common.notStarted", { defaultValue: "Not Started" })}
                </option>
              </select>
              <select
                value={filterOptions.type}
                onChange={(e) =>
                  setFilterOptions({ ...filterOptions, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="all">
                  {t("common.allTypes", { defaultValue: "All Types" })}
                </option>
                <option value="rutin">
                  {t("common.rutin", { defaultValue: "Rutin" })}
                </option>
                <option value="tambahan">
                  {t("common.tambahan", { defaultValue: "Tambahan" })}
                </option>
              </select>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>
                {t("common.willExport", { defaultValue: "Will export" })}:
              </strong>{" "}
              {getExportData().length}{" "}
              {t("common.items", { defaultValue: "items" })}{" "}
              {t("common.as", { defaultValue: "as" })}{" "}
              {exportType.toUpperCase()}
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
