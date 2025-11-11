import React, { useState, useEffect, useMemo } from "react";
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
      date = parseISO(dateString);
      if (!isValid(date)) {
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
    console.warn('Date formatting error:', error, 'for date:', dateString);
    return "-";
  }
};

const MeetingExportModal = ({
  isOpen,
  onClose,
  meetings,
  currentPage,
  itemsPerPage,
  selectedMeetings = [],
  user,
}) => {
  const { t } = useTranslation();
  const [exportType, setExportType] = useState("pdf");
  const [exportScope, setExportScope] = useState("page");
  const [customRange, setCustomRange] = useState({ from: 1, to: 10 });
  const [isExporting, setIsExporting] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    priority: "all",
    bookingType: "all",
    room: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Get unique rooms from meetings
  const uniqueRooms = [...new Set(meetings.map(m => m.room_name).filter(Boolean))].sort();

  const normalizePriority = (value) => {
    const v = (value || '').toString().trim().toLowerCase();
    if (v === 'reguler' || v === 'regular') return 'reguler';
    if (v === 'vip') return 'vip';
    return v;
  };

  // Calculate filtered meetings
  const filteredMeetingsForDisplay = useMemo(() => {
    return meetings.filter((meeting) => {
      // Priority filter
      const priorityMatch = 
        filterOptions.priority === "all" || 
        normalizePriority(meeting.prioritas) === filterOptions.priority;

      // Booking type filter
      const bookingTypeMatch = 
        filterOptions.bookingType === "all" || 
        (filterOptions.bookingType === "internal" && meeting.booking_type === "internal") ||
        (filterOptions.bookingType === "external" && (meeting.booking_type === "external" || meeting.booking_type === "public"));

      // Room filter
      const roomMatch = 
        filterOptions.room === "all" || 
        meeting.room_name === filterOptions.room;

      // Date range filter
      let dateMatch = true;
      if (filterOptions.dateFrom || filterOptions.dateTo) {
        const meetingDate = meeting.start_time ? new Date(meeting.start_time).toISOString().split('T')[0] : null;
        if (filterOptions.dateFrom && meetingDate < filterOptions.dateFrom) {
          dateMatch = false;
        }
        if (filterOptions.dateTo && meetingDate > filterOptions.dateTo) {
          dateMatch = false;
        }
      }

      return priorityMatch && bookingTypeMatch && roomMatch && dateMatch;
    });
  }, [meetings, filterOptions.priority, filterOptions.bookingType, filterOptions.room, filterOptions.dateFrom, filterOptions.dateTo]);

  // Update custom range when filtered meetings change
  useEffect(() => {
    if (filteredMeetingsForDisplay.length > 0) {
      const newMax = filteredMeetingsForDisplay.length;
      setCustomRange(prev => ({ 
        from: Math.min(prev.from, newMax), 
        to: Math.min(prev.to, newMax) 
      }));
    }
  }, [filteredMeetingsForDisplay.length]);

  const getExportData = () => {
    let dataToExport = [];
    const filteredMeetings = filteredMeetingsForDisplay;

    switch (exportScope) {
      case "page": {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        dataToExport = filteredMeetings.slice(startIndex, endIndex);
        break;
      }
      case "selected": {
        dataToExport = filteredMeetings.filter((meeting) =>
          selectedMeetings.includes(meeting.id)
        );
        break;
      }
      case "custom": {
        const fromIndex = Math.max(0, customRange.from - 1);
        const toIndex = Math.min(filteredMeetings.length, customRange.to);
        dataToExport = filteredMeetings.slice(fromIndex, toIndex);
        break;
      }
      default: {
        dataToExport = filteredMeetings;
        break;
      }
    }

    return dataToExport;
  };

  const formatMeetingData = (meeting, index) => {
    const getStatusText = (status) => {
      switch (status) {
        case 'scheduled': return 'Dijadwalkan';
        case 'ongoing': return 'Berlangsung';
        case 'ended': return 'Selesai';
        case 'force_ended': return 'Selesai';
        case 'canceled': return 'Dibatalkan';
        default: return status;
      }
    };

    const getApprovalStatus = (gaStatus, managerStatus) => {
      if (gaStatus === 'approved' && managerStatus === 'approved') return 'Disetujui';
      if (gaStatus === 'rejected' || managerStatus === 'rejected') return 'Ditolak';
      return 'Pending';
    };

    return {
      "No": index + 1,
      "ID": meeting.id || meeting.booking_id || "-",
      "Ruangan": meeting.room_name || "-",
      "Agenda": meeting.agenda || "-",
      "Tanggal": safeFormatDate(meeting.start_time, "dd/MM/yyyy"),
      "Waktu Mulai": safeFormatDate(meeting.start_time, "HH:mm"),
      "Waktu Selesai": safeFormatDate(meeting.end_time, "HH:mm"),
      "Pemohon": meeting.organizer_name || "-",
      "Status": getStatusText(meeting.status),
      "Tipe Booking": meeting.booking_type === 'internal' ? 'Internal' : (meeting.booking_type === 'external' || meeting.booking_type === 'public') ? 'Eksternal' : "-",
      "Prioritas": meeting.prioritas === 'vip' ? 'VIP' : 'Reguler',
      "GA Approval": meeting.ga_check_status === 'approved' ? 'Disetujui' : meeting.ga_check_status === 'rejected' ? 'Ditolak' : 'Pending',
      "GA Manager Approval": meeting.ga_manager_check_status === 'approved' ? 'Disetujui' : meeting.ga_manager_check_status === 'rejected' ? 'Ditolak' : 'Pending',
      "Status Approval": getApprovalStatus(meeting.ga_check_status, meeting.ga_manager_check_status),
      "Dibuat": safeFormatDate(meeting.created_at, "dd/MM/yyyy HH:mm"),
    };
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);

      // Ensure autoTable is available
      const { autoTable } = await import("jspdf-autotable");

      const dataToExport = getExportData();

      const pdf = new jsPDF("landscape", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Laporan Manajemen Rapat", pageWidth / 2, 20, { align: "center" });

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Dibuat oleh: ${user?.name || "-"}`, 14, 30);
      pdf.text(`Tanggal Export: ${safeFormatDate(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 30, { align: "right" });
      
      // Build scope text with filters
      let scopeText = exportScope === "page" 
        ? "Halaman Saat Ini" 
        : exportScope === "selected" 
        ? "Terpilih" 
        : exportScope === "custom" 
        ? `Custom (${customRange.from}-${customRange.to})` 
        : "Semua";
      
      // Add filter info
      const filterParts = [];
      if (filterOptions.priority !== "all") {
        filterParts.push(`Prioritas: ${filterOptions.priority === "vip" ? "VIP" : "Reguler"}`);
      }
      if (filterOptions.bookingType !== "all") {
        filterParts.push(`Tipe: ${filterOptions.bookingType === "internal" ? "Internal" : "Eksternal"}`);
      }
      if (filterOptions.room !== "all") {
        filterParts.push(`Ruangan: ${filterOptions.room}`);
      }
      if (filterOptions.dateFrom || filterOptions.dateTo) {
        const fromDate = filterOptions.dateFrom ? safeFormatDate(filterOptions.dateFrom, "dd/MM/yyyy") : "";
        const toDate = filterOptions.dateTo ? safeFormatDate(filterOptions.dateTo, "dd/MM/yyyy") : "";
        filterParts.push(`Tanggal: ${fromDate}${fromDate && toDate ? " - " : ""}${toDate}`);
      }
      
      if (filterParts.length > 0) {
        scopeText += ` | Filter: ${filterParts.join(", ")}`;
      }
      
      pdf.text(`Total Data: ${dataToExport.length} | Scope: ${scopeText}`, 14, 37);

      const startY = 50;

      // Table data
      const tableData = dataToExport.map((meeting, index) => {
        const formatted = formatMeetingData(meeting, index);
        return [
          formatted["No"],
          formatted["ID"],
          formatted["Ruangan"],
          formatted["Agenda"],
          formatted["Tanggal"],
          `${formatted["Waktu Mulai"]} - ${formatted["Waktu Selesai"]}`,
          formatted["Pemohon"],
          formatted["Status"],
          formatted["Status Approval"],
        ];
      });

      // Table headers
      const headers = [
        "No",
        "ID",
        "Ruangan",
        "Agenda",
        "Tanggal",
        "Waktu",
        "Pemohon",
        "Status",
        "Approval",
      ];

      autoTable(pdf, {
        head: [headers],
        body: tableData,
        startY: startY,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { 
          fillColor: [249, 250, 251] 
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // No
          1: { cellWidth: 20, halign: 'center' }, // ID
          2: { cellWidth: 35 }, // Ruangan
          3: { cellWidth: 50 }, // Agenda
          4: { cellWidth: 25, halign: 'center' }, // Tanggal
          5: { cellWidth: 35, halign: 'center' }, // Waktu
          6: { cellWidth: 40 }, // Pemohon
          7: { cellWidth: 30, halign: 'center' }, // Status
          8: { cellWidth: 30, halign: 'center' }, // Approval
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });

      const fileName = `meeting_management_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.pdf`;
      pdf.save(fileName);

      try {
        await logExport({ feature: "Manajemen Rapat", format: "pdf", menu_path: "Admin > Manajemen Rapat" });
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

      const excelData = dataToExport.map((meeting, index) =>
        formatMeetingData(meeting, index)
      );

      // Define headers
      const headers = [
        "No",
        "ID",
        "Ruangan",
        "Agenda",
        "Tanggal",
        "Waktu Mulai",
        "Waktu Selesai",
        "Pemohon",
        "Status",
        "Tipe Booking",
        "Prioritas",
        "GA Approval",
        "GA Manager Approval",
        "Status Approval",
        "Dibuat",
      ];

      // Create worksheet with headers
      const ws = XLSX.utils.json_to_sheet(excelData, { header: headers });

      // Set column widths
      ws["!cols"] = [
        { wch: 5 }, // No
        { wch: 8 }, // ID
        { wch: 25 }, // Ruangan
        { wch: 35 }, // Agenda
        { wch: 15 }, // Tanggal
        { wch: 12 }, // Waktu Mulai
        { wch: 12 }, // Waktu Selesai
        { wch: 25 }, // Pemohon
        { wch: 18 }, // Status
        { wch: 15 }, // Tipe Booking
        { wch: 12 }, // Prioritas
        { wch: 15 }, // GA Approval
        { wch: 18 }, // GA Manager Approval
        { wch: 18 }, // Status Approval
        { wch: 20 }, // Dibuat
      ];

      // Set header row data explicitly
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

      // Find column indices for styling
      const statusColIndex = headers.indexOf("Status");
      const noColIndex = headers.indexOf("No");
      const idColIndex = headers.indexOf("ID");
      const tanggalColIndex = headers.indexOf("Tanggal");
      const waktuMulaiColIndex = headers.indexOf("Waktu Mulai");
      const waktuSelesaiColIndex = headers.indexOf("Waktu Selesai");

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) ws[cellAddress] = { v: "" };

          // Determine cell background color
          let cellBgColor = "FFFFFF";
          let borderColor = "D0D7DE";
          let textColor = "24292F";
          let horizontalAlign = "left";

          if (R === 0) {
            // Header styling
            cellBgColor = "3B82F6"; // Blue header (matching PDF)
            textColor = "FFFFFF";
            borderColor = "2563EB";
            horizontalAlign = "center";
          } else if (R % 2 === 0) {
            cellBgColor = "F9FAFB"; // Very light gray for even rows
          }

          // Status-based coloring
          if (R > 0 && C === statusColIndex) {
            const status = ws[cellAddress]?.v?.toString().toLowerCase() || "";
            if (status.includes("selesai") || status.includes("ended")) {
              cellBgColor = "DCFCE7"; // Light green
              textColor = "166534"; // Dark green
            } else if (status.includes("berlangsung") || status.includes("ongoing")) {
              cellBgColor = "FEF3C7"; // Light yellow
              textColor = "92400E"; // Dark yellow
            } else if (status.includes("dijadwalkan") || status.includes("scheduled")) {
              cellBgColor = "DBEAFE"; // Light blue
              textColor = "1E40AF"; // Dark blue
            } else if (status.includes("dibatalkan") || status.includes("canceled")) {
              cellBgColor = "FEE2E2"; // Light red
              textColor = "991B1B"; // Dark red
            }
          }

          // Center alignment for No, ID, Tanggal, Waktu columns
          if (C === noColIndex || C === idColIndex || C === tanggalColIndex || 
              C === waktuMulaiColIndex || C === waktuSelesaiColIndex) {
            horizontalAlign = "center";
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
              horizontal: horizontalAlign,
              vertical: "middle",
              wrapText: true,
              indent: R === 0 ? 0 : (horizontalAlign === "left" ? 1 : 0),
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
        if (noColIndex >= 0) {
          const noCell = XLSX.utils.encode_cell({ r: R, c: noColIndex });
          if (ws[noCell]) {
            ws[noCell].s = ws[noCell].s || {};
            ws[noCell].s.numFmt = "0";
          }
        }

        if (idColIndex >= 0) {
          const idCell = XLSX.utils.encode_cell({ r: R, c: idColIndex });
          if (ws[idCell]) {
            ws[idCell].s = ws[idCell].s || {};
            ws[idCell].s.numFmt = "0";
          }
        }
      }

      // Add freeze panes (freeze header row)
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };

      // Add auto-filter to header row
      ws["!autofilter"] = {
        ref: `A1:${XLSX.utils.encode_cell({ r: 0, c: headers.length - 1 })}`,
      };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Meetings");

      // Add metadata sheet
      let scopeText = exportScope === "page" 
        ? "Halaman Saat Ini" 
        : exportScope === "selected" 
        ? "Terpilih" 
        : exportScope === "custom" 
        ? `Custom (${customRange.from}-${customRange.to})` 
        : "Semua";
      
      // Add filter info
      const filterParts = [];
      if (filterOptions.priority !== "all") {
        filterParts.push(`Prioritas: ${filterOptions.priority === "vip" ? "VIP" : "Reguler"}`);
      }
      if (filterOptions.bookingType !== "all") {
        filterParts.push(`Tipe: ${filterOptions.bookingType === "internal" ? "Internal" : "Eksternal"}`);
      }
      if (filterOptions.room !== "all") {
        filterParts.push(`Ruangan: ${filterOptions.room}`);
      }
      if (filterOptions.dateFrom || filterOptions.dateTo) {
        const fromDate = filterOptions.dateFrom ? safeFormatDate(filterOptions.dateFrom, "dd/MM/yyyy") : "";
        const toDate = filterOptions.dateTo ? safeFormatDate(filterOptions.dateTo, "dd/MM/yyyy") : "";
        filterParts.push(`Tanggal: ${fromDate}${fromDate && toDate ? " - " : ""}${toDate}`);
      }
      
      if (filterParts.length > 0) {
        scopeText += ` | Filter: ${filterParts.join(", ")}`;
      }

      const metaData = [
        { Field: "Export Date", Value: safeFormatDate(new Date()) },
        { Field: "Exported by", Value: user?.name },
        { Field: "Total Meetings", Value: dataToExport.length },
        { Field: "Export Scope", Value: scopeText },
      ];

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
                fgColor: { rgb: R === 0 ? "3B82F6" : "FFFFFF" },
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

      const fileName = `meeting_management_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(data, fileName);

      try {
        await logExport({ feature: "Manajemen Rapat", format: "excel", menu_path: "Admin > Manajemen Rapat" });
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

  const canExportSelected = selectedMeetings.length > 0;
  const totalMeetings = filteredMeetingsForDisplay.length;
  
  // Calculate actual items in current page after filtering
  const currentPageStartIndex = (currentPage - 1) * itemsPerPage;
  const currentPageEndIndex = Math.min(currentPageStartIndex + itemsPerPage, totalMeetings);
  const currentPageItemsCount = Math.max(0, currentPageEndIndex - currentPageStartIndex);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto m-4 sm:m-6">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('meetings.export', { defaultValue: 'Export Meetings' })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('meetings.exportType', { defaultValue: 'Export Format' })}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportType("pdf")}
                className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg transition-all ${
                  exportType === "pdf"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <FileText className="h-5 w-5 mr-2" />
                PDF
              </button>
              <button
                onClick={() => setExportType("excel")}
                className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg transition-all ${
                  exportType === "excel"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
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
              {t('meetings.exportScope', { defaultValue: 'Export Scope' })}
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="exportScope"
                  value="page"
                  checked={exportScope === "page"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {t('meetings.currentPage', { defaultValue: 'Current Page' })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentPageItemsCount} {t('meetings.items', { defaultValue: 'items' })}
                  </div>
                </div>
              </label>

              {canExportSelected && (
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportScope"
                    value="selected"
                    checked={exportScope === "selected"}
                    onChange={(e) => setExportScope(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {t('meetings.selectedItems', { defaultValue: 'Selected Items' })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedMeetings.length} {t('meetings.items', { defaultValue: 'items' })}
                    </div>
                  </div>
                </label>
              )}

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="exportScope"
                  value="custom"
                  checked={exportScope === "custom"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {t('meetings.customRange', { defaultValue: 'Custom Range' })}
                  </div>
                  {exportScope === "custom" && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={totalMeetings}
                        value={customRange.from}
                        onChange={(e) =>
                          setCustomRange({ ...customRange, from: parseInt(e.target.value) || 1 })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        min="1"
                        max={totalMeetings}
                        value={customRange.to}
                        onChange={(e) =>
                          setCustomRange({ ...customRange, to: parseInt(e.target.value) || totalMeetings })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="exportScope"
                  value="all"
                  checked={exportScope === "all"}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {t('meetings.allItems', { defaultValue: 'All Items' })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {totalMeetings} {t('meetings.items', { defaultValue: 'items' })}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('meetings.customFilters', { defaultValue: 'Custom Filters (Optional)' })}
            </label>
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('meetings.priority', { defaultValue: 'Prioritas' })}
                  </label>
                  <select
                    value={filterOptions.priority}
                    onChange={(e) => setFilterOptions({ ...filterOptions, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua</option>
                    <option value="vip">VIP</option>
                    <option value="reguler">Reguler</option>
                  </select>
                </div>

                {/* Booking Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('meetings.bookingType', { defaultValue: 'Tipe Booking' })}
                  </label>
                  <select
                    value={filterOptions.bookingType}
                    onChange={(e) => setFilterOptions({ ...filterOptions, bookingType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua</option>
                    <option value="internal">Internal</option>
                    <option value="external">Eksternal</option>
                  </select>
                </div>

                {/* Room Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('meetings.room', { defaultValue: 'Ruangan' })}
                  </label>
                  <select
                    value={filterOptions.room}
                    onChange={(e) => setFilterOptions({ ...filterOptions, room: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Ruangan</option>
                    {uniqueRooms.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range - From */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('meetings.dateFrom', { defaultValue: 'Tanggal Dari' })}
                  </label>
                  <input
                    type="date"
                    value={filterOptions.dateFrom}
                    onChange={(e) => setFilterOptions({ ...filterOptions, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date Range - To */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('meetings.dateTo', { defaultValue: 'Tanggal Sampai' })}
                  </label>
                  <input
                    type="date"
                    value={filterOptions.dateTo}
                    onChange={(e) => setFilterOptions({ ...filterOptions, dateTo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filter Summary */}
              {(filterOptions.priority !== "all" || 
                filterOptions.bookingType !== "all" || 
                filterOptions.room !== "all" || 
                filterOptions.dateFrom || 
                filterOptions.dateTo) && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => setFilterOptions({
                      priority: "all",
                      bookingType: "all",
                      room: "all",
                      dateFrom: "",
                      dateTo: "",
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {t('meetings.clearFilters', { defaultValue: 'Hapus Semua Filter' })}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t('meetings.exporting', { defaultValue: 'Exporting...' })}
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                {t('meetings.export', { defaultValue: 'Export' })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingExportModal;

