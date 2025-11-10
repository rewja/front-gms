import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Download, FileSpreadsheet, X, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const UserImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    try {
      // Create template data with headers only
      const headers = [
        "Nama",
        "Email",
        "Password",
        "Role",
        "Kategori",
      ];

      // Create worksheet with headers only (no example row)
      const wsData = [headers];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws["!cols"] = [
        { wch: 25 }, // Nama
        { wch: 30 }, // Email
        { wch: 25 }, // Password
        { wch: 15 }, // Role
        { wch: 15 }, // Kategori
      ];

      // Style header row (bold)
      const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1:E1");
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) continue;
        if (!ws[cellAddress].s) ws[cellAddress].s = {};
        ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" } };
        ws[cellAddress].s.fill = { fgColor: { rgb: "4472C4" } };
        ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Import Pengguna");

      // Add instruction sheet
      const instructionData = [
        ["PETUNJUK PENGISIAN TEMPLATE"],
        [""],
        ["KOLOM YANG WAJIB DIISI:"],
        [""],
        ["1. NAMA"],
        ["   - Nama lengkap pengguna"],
        ["   - Contoh: John Doe, Budi Santoso"],
        [""],
        ["2. EMAIL"],
        ["   - Email unik (tidak boleh duplikat)"],
        ["   - Format email yang valid: contoh@email.com"],
        ["   - Contoh: john.doe@company.com"],
        [""],
        ["3. PASSWORD"],
        ["   - Minimal 8 karakter"],
        ["   - Harus ada HURUF BESAR (A-Z)"],
        ["   - Harus ada huruf kecil (a-z)"],
        ["   - Harus ada ANGKA (0-9)"],
        ["   - Contoh yang BENAR: Password123, User2024"],
        ["   - Contoh yang SALAH: password123, PASSWORD123, Pass123"],
        [""],
        ["KOLOM OPSIONAL:"],
        [""],
        ["4. ROLE"],
        ["   Pilihan yang tersedia:"],
        ["   - user (untuk karyawan biasa)"],
        ["   - admin_ga (untuk admin GA)"],
        ["   - admin_ga_manager (untuk GA Manager)"],
        ["   - procurement (untuk Procurement)"],
        ["   - Jika dikosongkan, default: user"],
        [""],
        ["5. KATEGORI"],
        ["   Pilihan yang tersedia (hanya untuk role 'user'):"],
        ["   - ob (Office Boy)"],
        ["   - driver (Driver/Supir)"],
        ["   - security (Security/Satpam)"],
        ["   - magang_pkl (Magang/PKL)"],
        ["   - Jika dikosongkan, default: ob"],
        [""],
        ["CATATAN PENTING:"],
        ["- Pastikan email tidak duplikat dengan data yang sudah ada"],
        ["- Password harus memenuhi semua kriteria keamanan"],
        ["- Kategori hanya berlaku untuk role 'user'"],
        ["- Pastikan format penulisan sesuai dengan pilihan yang tersedia"],
      ];

      const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
      
      // Set column width for instruction sheet
      instructionWs["!cols"] = [{ wch: 80 }];
      
      // Style instruction header
      if (instructionWs["A1"]) {
        if (!instructionWs["A1"].s) instructionWs["A1"].s = {};
        instructionWs["A1"].s.font = { bold: true, size: 14 };
      }

      XLSX.utils.book_append_sheet(wb, instructionWs, "Petunjuk");

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, "template_import_pengguna.xlsx");
    } catch (err) {
      console.error("Download error:", err);
      alert("Gagal mengunduh template: " + err.message);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError("File harus berupa Excel (.xlsx atau .xls)");
      setFile(null);
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10MB");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setImportResult(null);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!file) {
      setError("Pilih file Excel terlebih dahulu");
      return;
    }

    setIsUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Don't set Content-Type header for FormData - browser will set it automatically with boundary
      const response = await api.post("/users/import", formData, {
        isForm: true, // This tells api.js to not set Content-Type header
      });

      setImportResult(response.data);
      
      if (response.data.success_count > 0 && onImportSuccess) {
        // Call success callback after a short delay to allow user to see the result
        setTimeout(() => {
          onImportSuccess();
        }, 2000);
      }
    } catch (err) {
      console.error('Import error:', err);
      console.error('Error response:', err?.response);
      console.error('Error data:', err?.response?.data);
      
      let errorMessage = "Gagal mengimport data. Pastikan format file sesuai dengan template.";
      
      // Try to get error data from response
      const errorData = err?.response?.data || err?.data || null;
      
      if (errorData) {
        // If there are failures with details, show them
        if (errorData.failures && Array.isArray(errorData.failures) && errorData.failures.length > 0) {
          console.log('Failures data:', errorData.failures);
          
          const failureMessages = errorData.failures.slice(0, 5).map((failure) => {
            console.log('Processing failure:', failure);
            
            const row = failure.row || '?';
            let errors = 'Data tidak valid';
            
            // Try to get error messages
            if (Array.isArray(failure.errors)) {
              errors = failure.errors.filter(e => e && e.trim()).join(', ') || 'Data tidak valid';
            } else if (typeof failure.errors === 'object' && failure.errors !== null) {
              // Handle object errors (Laravel validation format)
              const errorValues = Object.values(failure.errors).flat();
              errors = errorValues.filter(e => e && e.trim()).join(', ') || 'Data tidak valid';
            } else if (failure.errors) {
              errors = String(failure.errors).trim() || 'Data tidak valid';
            }
            
            // If still generic, try to get from message field
            if (errors === 'Data tidak valid' && failure.message) {
              errors = String(failure.message).trim();
            }
            
            // Show attribute (field name) if available
            const attribute = failure.attribute ? ` (kolom: ${failure.attribute})` : '';
            
            // Show values if available for debugging
            let valuesInfo = '';
            if (failure.values && typeof failure.values === 'object') {
              const valueList = Object.entries(failure.values)
                .filter(([key, val]) => val !== null && val !== undefined && val !== '')
                .map(([key, val]) => `${key}: ${val}`)
                .join(', ');
              if (valueList) {
                valuesInfo = ` [Data: ${valueList}]`;
              }
            }
            
            const message = `Baris ${row}${attribute}: ${errors}${valuesInfo}`;
            console.log('Generated message:', message);
            return message;
          });
          
          errorMessage = `Validasi gagal:\n${failureMessages.join('\n')}`;
          if (errorData.failures.length > 5) {
            errorMessage += `\n... dan ${errorData.failures.length - 5} baris lainnya`;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
          // If there's a debug error, append it
          if (errorData.error && import.meta.env.DEV) {
            errorMessage += `\n\nDetail: ${errorData.error}`;
          }
        } else if (errorData.errors) {
          // Handle Laravel validation errors format
          const errorList = Object.entries(errorData.errors).map(([key, value]) => {
            const messages = Array.isArray(value) ? value : [value];
            return `${key}: ${messages.join(', ')}`;
          });
          errorMessage = `Validasi gagal:\n${errorList.join('\n')}`;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto m-4 sm:m-6">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center w-full">
            {t("users.importUsers", { defaultValue: "Import Pengguna" })}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Petunjuk Import:
            </h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download template Excel terlebih dahulu</li>
              <li>Isi data pengguna sesuai template</li>
              <li>Upload file Excel yang sudah diisi</li>
              <li>Pastikan format email unik dan password minimal 8 karakter</li>
            </ol>
          </div>

          {/* Download Template Button */}
          <div>
            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("users.downloadTemplate", { defaultValue: "Download Template Excel" })}
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("users.selectFile", { defaultValue: "Pilih File Excel" })}
            </label>
            <div
              onClick={handleAreaClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <div className="space-y-1 text-center">
                <FileSpreadsheet className={`mx-auto h-12 w-12 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
                <div className="flex text-sm text-gray-600 justify-center items-center">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    {t("users.uploadFile", { defaultValue: "Upload file" })}
                  </span>
                  <span className="pl-1">atau drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">
                  {t("users.supportedFormats", { defaultValue: "XLSX, XLS (maks 10MB)" })}
                </p>
              </div>
            </div>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={handleFileSelect}
            />
            {file && (
              <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center">
                  <FileSpreadsheet className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-900 mb-2">
                    Import Selesai
                  </h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>
                      <strong>{importResult.success_count}</strong> dari{" "}
                      <strong>{importResult.total_rows}</strong> pengguna berhasil diimport
                    </p>
                    {importResult.failures && importResult.failures.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Baris yang gagal:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {importResult.failures.slice(0, 5).map((failure, idx) => {
                            const row = failure.row || '?';
                            let errorMessages = 'Data tidak valid';
                            
                            // Try to get error messages
                            if (Array.isArray(failure.errors)) {
                              errorMessages = failure.errors.filter(e => e && e.trim()).join(', ') || 'Data tidak valid';
                            } else if (typeof failure.errors === 'object' && failure.errors !== null) {
                              // Handle object errors (Laravel validation format)
                              const errorValues = Object.values(failure.errors).flat();
                              errorMessages = errorValues.filter(e => e && e.trim()).join(', ') || 'Data tidak valid';
                            } else if (failure.errors) {
                              errorMessages = String(failure.errors).trim() || 'Data tidak valid';
                            }
                            
                            // Show attribute (field name) if available
                            const attribute = failure.attribute ? ` (kolom: ${failure.attribute})` : '';
                            
                            // Show values if available for debugging
                            let valuesInfo = '';
                            if (failure.values && typeof failure.values === 'object') {
                              const valueList = Object.entries(failure.values)
                                .filter(([key, val]) => val !== null && val !== undefined && val !== '')
                                .map(([key, val]) => `${key}: ${val}`)
                                .join(', ');
                              if (valueList) {
                                valuesInfo = ` [Data: ${valueList}]`;
                              }
                            }
                            
                            return (
                              <li key={idx} className="text-sm">
                                <span className="font-medium">Baris {row}{attribute}:</span> {errorMessages}{valuesInfo}
                              </li>
                            );
                          })}
                          {importResult.failures.length > 5 && (
                            <li className="text-sm">... dan {importResult.failures.length - 5} baris lainnya</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4 border-t border-gray-200 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            disabled={isUploading}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleImport}
            disabled={isUploading || !file}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("users.importing", { defaultValue: "Mengimport" })}...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("users.import", { defaultValue: "Import" })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserImportModal;

