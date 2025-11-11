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

const AssetExportModal = ({
  isOpen,
  onClose,
  assets,
  currentPage,
  itemsPerPage,
  selectedAssets = [],
  activeTab,
  user,
}) => {
  const { t } = useTranslation();
  const [exportType, setExportType] = useState("pdf");
  const [exportScope, setExportScope] = useState("page");
  const [customRange, setCustomRange] = useState({ from: 1, to: 10 });
  const [isExporting, setIsExporting] = useState(false);

  // Update custom range when assets change
  useEffect(() => {
    if (assets.length > 0) {
      setCustomRange({ from: 1, to: Math.min(assets.length, 10) });
    }
  }, [assets]);

  const getExportData = () => {
    let dataToExport = [];

    switch (exportScope) {
      case "page": {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        dataToExport = assets.slice(startIndex, endIndex);
        break;
      }
      case "selected": {
        dataToExport = assets.filter((asset) =>
          selectedAssets.includes(asset.id)
        );
        break;
      }
      case "custom": {
        const fromIndex = Math.max(0, customRange.from - 1); // Convert 1-based to 0-based indexing
        const toIndex = Math.min(assets.length, customRange.to); // Inclusive end
        dataToExport = assets.slice(fromIndex, toIndex);
        break;
      }
      default: {
        dataToExport = assets;
        break;
      }
    }

    return dataToExport;
  };

  const formatAssetData = (asset, index) => {
    // Format status with proper case
    const formatStatus = (status) => {
      const statusMap = {
        not_received: t("common.status.notReceived"),
        received: t("common.status.received"),
        complete: t("common.status.completed"),
        pending: t("common.status.pending"),
        approved: t("common.status.approved"),
        rejected: t("common.status.rejected"),
        cancelled: t("common.status.cancelled"),
      };
      return statusMap[status] || status;
    };

    // Format category names
    const formatCategory = (category) => {
      const categoryMap = {
        it_equipment: t("common.categories.itEquipment"),
        furniture: t("common.categories.furniture"),
        office_furniture: t("common.categories.officeFurniture"),
        office_supplies: t("common.categories.officeSupplies"),
        electronics: t("common.categories.electronics"),
        tools: t("common.categories.tools"),
        machinery: t("common.categories.machinery"),
        vehicles: t("common.categories.vehicles"),
        security_equipment: t("common.categories.securityEquipment"),
        other: t("common.categories.other"),
      };
      return categoryMap[category] || category;
    };

    // Format condition with proper case
    const formatCondition = (condition) => {
      const conditionMap = {
        good: t("common.conditionLabels.good"),
        fair: t("common.conditionLabels.fair"),
        poor: t("common.conditionLabels.poor"),
        excellent: t("common.conditionLabels.excellent"),
        damaged: t("common.conditionLabels.damaged"),
      };
      return conditionMap[condition] || condition;
    };

    // Format maintenance status with proper case
    const formatMaintenanceStatus = (status) => {
      if (!status || ["idle", "null", "", null, undefined].includes(status)) {
        return "-";
      }
      const maintenanceMap = {
        scheduled: t("maintenance.status.scheduled"),
        in_progress: t("maintenance.status.in_progress"),
        maintenance_pending: t("maintenance.status.maintenancePending"),
        pending: t("common.status.pending"),
        approved: t("common.status.approved"),
        completed: t("common.status.completed"),
        overdue: t("maintenance.status.overdue"),
        cancelled: t("maintenance.status.cancelled"),
        repair: t("maintenance.types.repair"),
        repairing: t("common.status.repairing"),
        done: t("maintenance.status.done"),
        finished: t("maintenance.status.finished"),
      };
      return maintenanceMap[status] || status;
    };

    return {
      No: index + 1, // Row number starting from 1
      ID: asset.id,
      Name: asset.name,
      Category: formatCategory(asset.category),
      Status: formatStatus(asset.status),
      Condition: formatCondition(asset.condition),
      Location: asset.location || "-",
      Supplier: asset.supplier || "-",
      Quantity: asset.quantity || 1,
      "Purchase Cost Per Item": asset.purchase_cost
        ? `Rp ${parseInt(asset.purchase_cost).toLocaleString("id-ID")}`
        : "-",
      "Total Purchase Cost":
        asset.purchase_cost && asset.quantity
          ? `Rp ${(
              parseInt(asset.purchase_cost) * (asset.quantity || 1)
            ).toLocaleString("id-ID")}`
          : asset.purchase_cost
          ? `Rp ${parseInt(asset.purchase_cost).toLocaleString("id-ID")}`
          : "-",
      "Asset Type":
        asset.source === "addition" || asset.source === "seed"
          ? "Addition"
          : asset.source === "request"
          ? "Request"
          : "Request",
      "Purchase/Added Date": safeFormatDate(asset.purchase_date, "dd/MM/yyyy"),
      "Maintenance Status": formatMaintenanceStatus(asset.maintenance_status),
      "Created At": safeFormatDate(asset.created_at, "dd/MM/yyyy HH:mm"),
    };
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);

      // Ensure autoTable is available
      const { autoTable } = await import("jspdf-autotable");

      const dataToExport = getExportData();

      const pdf = new jsPDF("landscape", "mm", "a3"); // Use A3 landscape for more columns
      const pageWidth = pdf.internal.pageSize.width;

      // Header
      pdf.setFontSize(16);
      pdf.text("Asset Management Report", pageWidth / 2, 20, {
        align: "center",
      });

      pdf.setFontSize(10);
      pdf.text(`Tab: ${t(`assets.tabs.${activeTab}`)}`, 14, 30);
      pdf.text(
        `Export Date: ${safeFormatDate(new Date())}`,
        14,
        35
      );
      pdf.text(
        `Language: ${
          t("common.language") === "id" ? "Bahasa Indonesia" : "English"
        }`,
        14,
        40
      );
      pdf.text(`Exported by: ${user?.name}`, 14, 45);
      pdf.text(`Total Items: ${dataToExport.length}`, 14, 50);

      // Update startY since we added more header info
      const startY = 55;

      // Table data
      const tableData = dataToExport.map((asset, index) => {
        const formatted = formatAssetData(asset, index);
        return [
          formatted["No"],
          formatted["ID"],
          formatted["Name"],
          formatted["Category"],
          formatted["Status"],
          formatted["Condition"],
          formatted["Location"],
          formatted["Supplier"],
          formatted["Quantity"],
          formatted["Purchase Cost Per Item"],
          formatted["Total Purchase Cost"],
          formatted["Asset Type"],
          formatted["Purchase/Added Date"],
          formatted["Maintenance Status"],
          formatted["Created At"],
        ];
      });

      const tableHeaders = [
        [
          "No",
          "ID",
          "Name",
          "Category",
          "Status",
          "Condition",
          "Location",
          "Supplier",
          "Quantity",
          "Purchase Cost Per Item",
          "Total Purchase Cost",
          "Asset Type",
          "Purchase/Added Date",
          "Maintenance Status",
          "Created At",
        ],
      ];

      autoTable(pdf, {
        head: tableHeaders,
        body: tableData,
        startY: startY,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          halign: "center",
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 15 }, // ID
          1: { cellWidth: 35 }, // Name
          2: { cellWidth: 25 }, // Category
          3: { cellWidth: 25 }, // Status
          4: { cellWidth: 20 }, // Condition
          5: { cellWidth: 25 }, // Location
          6: { cellWidth: 25 }, // Cost
          7: { cellWidth: 25 }, // Purchase Date
        },
        margin: { top: 55, left: 5, right: 5 },
      });

      // Save PDF
      const fileName = `asset_management_${activeTab}_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.pdf`;
      pdf.save(fileName);

      // Log export activity
      try {
        await logExport({
          feature: "Manajemen Aset",
          format: "pdf",
          menu_path: "Admin > Manajemen Aset",
        });
      } catch (e) {
        // Non-blocking: ignore logging errors
      }
    } catch (error) {
      console.error("PDF Export Error:", error);
      console.error("Error details:", error.message, error.stack);
      alert(`Failed to export PDF: ${error.message}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const dataToExport = getExportData();

      // Prepare data for Excel with numbering
      const excelData = dataToExport.map((asset, index) =>
        formatAssetData(asset, index)
      );

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();

      // Set column widths
      ws["!cols"] = [
        { wch: 5 }, // No (row number)
        { wch: 8 }, // ID
        { wch: 30 }, // Name
        { wch: 20 }, // Category
        { wch: 20 }, // Status
        { wch: 15 }, // Condition
        { wch: 20 }, // Location
        { wch: 20 }, // Supplier
        { wch: 10 }, // Quantity
        { wch: 25 }, // Purchase Cost Per Item
        { wch: 25 }, // Total Purchase Cost
        { wch: 20 }, // Asset Type
        { wch: 20 }, // Purchase/Added Date
        { wch: 20 }, // Maintenance Status
        { wch: 30 }, // Created At (ticker untuk include hari)
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, `Assets_${activeTab}`);

      // Add metadata sheet
      const metaData = [
        { Field: "Tab", Value: t(`assets.tabs.${activeTab}`) },
        { Field: "Export Date", Value: safeFormatDate(new Date()) },
        { Field: "Exported by", Value: user?.name },
        { Field: "Total Items", Value: dataToExport.length },
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

      // Save Excel file
      const fileName = `asset_management_${activeTab}_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(data, fileName);

      // Log export activity
      try {
        await logExport({
          feature: "Manajemen Aset",
          format: "excel",
          menu_path: "Admin > Manajemen Aset",
        });
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

  const canExportSelected = selectedAssets.length > 0;
  const totalAssets = assets.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto m-4 sm:m-6">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center w-full">
            {t("assets.exportAssets")}
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
              {t("assets.exportType")}
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
              {t("assets.exportScope")}
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
                  {t("assets.currentPage")} ({itemsPerPage} {t("assets.items")})
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
                  {t("assets.selectedItems")} ({selectedAssets.length} {t("assets.selected")})
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
                <span className="text-sm">{t("assets.customRange")}</span>
              </label>
            </div>
          </div>

          {/* Custom Range Inputs */}
          {exportScope === "custom" && (
            <div className="ml-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {t("assets.from")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalAssets}
                    value={customRange.from}
                    onChange={(e) => {
                      const newFrom = Math.max(
                        1,
                        Math.min(totalAssets, parseInt(e.target.value) || 1)
                      );
                      setCustomRange((prev) => ({
                        from: newFrom,
                        to: Math.max(newFrom, prev.to), // Ensure 'to' is always >= 'from'
                      }));
                    }}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="pt-5">
                  <span className="text-gray-500">-</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {t("assets.to")}
                  </label>
                  <input
                    type="number"
                    min={customRange.from}
                    max={totalAssets}
                    value={customRange.to}
                    onChange={(e) => {
                      const newTo = Math.max(
                        customRange.from,
                        Math.min(
                          totalAssets,
                          parseInt(e.target.value) || customRange.from
                        )
                      );
                      setCustomRange((prev) => ({
                        ...prev,
                        to: newTo,
                      }));
                    }}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {t("assets.totalAvailable")}: {totalAssets} {t("assets.items")}
              </p>
              <p className="text-xs text-blue-600 font-medium">
                📊 Range preview: {customRange.to - customRange.from + 1} items will be exported
                {customRange.from !== customRange.to
                  ? ` (items ${customRange.from} - ${customRange.to})`
                  : ` (only item ${customRange.from})`}
              </p>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{t("assets.willExport")}:</strong> {getExportData().length} {t("assets.items")} {t("assets.as")} {exportType.toUpperCase()}
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
                {t("assets.exporting")}...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("assets.export")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetExportModal;



