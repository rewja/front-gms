import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, FileSpreadsheet, X } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { logExport } from "../../services/activityService";

const safeFormatDate = (dateString, formatFn = (d) => d.toLocaleString()) => {
  if (!dateString) return "-";
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(date?.getTime?.())) return "-";
    return formatFn(date);
  } catch {
    return "-";
  }
};

const HistoryExportModal = ({
  isOpen,
  onClose,
  activities,
  currentPage,
  itemsPerPage,
  isAdmin = true,
  user,
}) => {
  const { t } = useTranslation();
  const [exportType, setExportType] = useState("pdf");
  const [exportScope, setExportScope] = useState("page");
  const [customRange, setCustomRange] = useState({ from: 1, to: 10 });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (activities?.length > 0) {
      setCustomRange({ from: 1, to: Math.min(activities.length, 10) });
    }
  }, [activities]);

  if (!isOpen) return null;

  const totalItems = activities?.length || 0;

  const getExportSlice = () => {
    if (!Array.isArray(activities)) return [];
    switch (exportScope) {
      case "page": {
        const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
        const endIndex = Math.min(totalItems, startIndex + itemsPerPage);
        return activities.slice(startIndex, endIndex);
      }
      case "custom": {
        const fromIndex = Math.max(0, (customRange.from || 1) - 1);
        const toIndex = Math.min(totalItems, customRange.to || totalItems);
        return activities.slice(fromIndex, toIndex);
      }
      case "all":
      default:
        return activities;
    }
  };

  const mapRow = (activity, index) => {
    const base = {
      No: index + 1,
      Action: activity.action,
      Description: activity.description || "-",
      Model: activity.model_type
        ? `${String(activity.model_type).split("\\").pop()}#${activity.model_id ?? "-"}`
        : "-",
      Time: safeFormatDate(activity.created_at),
    };
    if (isAdmin) {
      return {
        ...base,
        User: activity.user?.name || "-",
        Email: activity.user?.email || "-",
      };
    }
    return base;
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      const { autoTable } = await import("jspdf-autotable");
      const slice = getExportSlice();
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;

      pdf.setFontSize(16);
      pdf.text(
        isAdmin ? "System Activities Report" : "My Activities Report",
        pageWidth / 2,
        20,
        { align: "center" }
      );
      pdf.setFontSize(10);
      pdf.text(`Export Date: ${safeFormatDate(new Date())}`, 14, 30);
      if (user?.name) pdf.text(`Exported by: ${user.name}`, 14, 35);
      pdf.text(`Total Items: ${slice.length}`, 14, 40);

      const head = isAdmin
        ? [["No", "Action", "Description", "User", "Email", "Model", "Time"]]
        : [["No", "Action", "Description", "Model", "Time"]];

      const body = slice.map((a, i) => {
        const row = mapRow(a, i);
        return isAdmin
          ? [row.No, row.Action, row.Description, row.User, row.Email, row.Model, row.Time]
          : [row.No, row.Action, row.Description, row.Model, row.Time];
      });

      autoTable(pdf, {
        head,
        body,
        startY: 50,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 10, right: 10 },
      });

      const fileName = `activities_${isAdmin ? "admin" : "user"}_${new Date()
        .toISOString()
        .replace(/[:T]/g, "-")
        .slice(0, 16)}.pdf`;
      pdf.save(fileName);

      try {
        await logExport({
          feature: "Riwayat Aktivitas",
          format: "pdf",
          menu_path: isAdmin ? "Admin > Riwayat Aktivitas" : "User > Riwayat Aktivitas",
        });
      } catch (_) {}
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const slice = getExportSlice();
      const data = slice.map(mapRow);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Activities");

      const metaData = [
        { Field: "Export Date", Value: safeFormatDate(new Date()) },
        { Field: "Exported by", Value: user?.name || "-" },
        { Field: "Total Items", Value: data.length },
        { Field: "Export Scope", Value: exportScope },
      ];
      if (exportScope === "custom") {
        metaData.push({ Field: "Custom Range", Value: `${customRange.from} - ${customRange.to}` });
      }
      const metaWs = XLSX.utils.json_to_sheet(metaData);
      XLSX.utils.book_append_sheet(wb, metaWs, "Export Info");

      const fileName = `activities_${isAdmin ? "admin" : "user"}_${new Date()
        .toISOString()
        .replace(/[:T]/g, "-")
        .slice(0, 16)}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, fileName);

      try {
        await logExport({
          feature: "Riwayat Aktivitas",
          format: "excel",
          menu_path: isAdmin ? "Admin > Riwayat Aktivitas" : "User > Riwayat Aktivitas",
        });
      } catch (_) {}
    } catch (e) {
      console.error("Excel Export Error:", e);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportType === "pdf") return exportToPDF();
    return exportToExcel();
  };

  return (
    <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto m-4 sm:m-6">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center w-full">
            {isAdmin ? t("activities.admin.export_title", { defaultValue: "Export System Activities" }) : t("activities.user.export_title", { defaultValue: "Export My Activities" })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t("common.exportType", { defaultValue: "Export Type" })}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportType("pdf")}
                className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                  exportType === "pdf" ? "border-accent-500 bg-accent-50 text-accent-700" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <FileText className="h-5 w-5 mr-2" />
                PDF
              </button>
              <button
                onClick={() => setExportType("excel")}
                className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                  exportType === "excel" ? "border-accent-500 bg-accent-50 text-accent-700" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Excel
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t("common.exportScope", { defaultValue: "Export Scope" })}</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="radio" value="page" checked={exportScope === "page"} onChange={(e) => setExportScope(e.target.value)} className="mr-3" />
                <span className="text-sm">{t("common.currentPage", { defaultValue: "Current Page" })}</span>
              </label>
              <label className="flex items-center">
                <input type="radio" value="custom" checked={exportScope === "custom"} onChange={(e) => setExportScope(e.target.value)} className="mr-3" />
                <span className="text-sm">{t("common.customRange", { defaultValue: "Custom Range" })}</span>
              </label>
              <label className="flex items-center">
                <input type="radio" value="all" checked={exportScope === "all"} onChange={(e) => setExportScope(e.target.value)} className="mr-3" />
                <span className="text-sm">{t("common.allItems", { defaultValue: "All Items" })} ({totalItems})</span>
              </label>
            </div>
          </div>

          {exportScope === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.from", { defaultValue: "From" })}</label>
                <input
                  type="number"
                  min="1"
                  max={totalItems}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.to", { defaultValue: "To" })}</label>
                <input
                  type="number"
                  min="1"
                  max={totalItems}
                  value={customRange.to}
                  onChange={(e) =>
                    setCustomRange({
                      ...customRange,
                      to: Math.min(totalItems, parseInt(e.target.value) || totalItems),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{t("common.willExport", { defaultValue: "Will export" })}:</strong> {getExportSlice().length} {t("common.items", { defaultValue: "items" })} {t("common.as", { defaultValue: "as" })} {exportType.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4 border-t border-gray-200 px-4 sm:px-6 pb-4 sm:pb-6">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors" disabled={isExporting}>
            {t("common.cancel")}
          </button>
          <button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
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

export default HistoryExportModal;


