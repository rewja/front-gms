import React from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { X, Check, AlertCircle } from "lucide-react";
import Dropdown from "./Dropdown";

// Standardized Modal Component
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md", // 'sm', 'md', 'lg', 'xl'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "w-full max-w-sm",
    md: "w-full max-w-2xl",
    lg: "w-full max-w-4xl",
    xl: "w-full max-w-6xl",
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && typeof onClose === "function") {
      onClose(event);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
      style={{ margin: 0, padding: 0 }}
      onMouseDown={handleOverlayClick}
    >
      <div className="relative z-10 flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-xl shadow-xl border border-gray-200 ${sizeClasses[size]} max-h-[90vh] overflow-y-auto m-4 sm:m-6`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center">
              {title}
            </h3>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Standardized Form Modal Component
export const FormModal = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  children,
  submitText,
  cancelText,
  size = "md",
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const resolvedCancelText = cancelText || t("common.cancel");
  const resolvedSubmitText = isLoading
    ? t("common.loading")
    : submitText || t("common.save");
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
        {children}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            {resolvedCancelText}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resolvedSubmitText}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Standardized Detail Modal Component
export const DetailModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showEditButton = false,
  onEdit = null,
  editText,
}) => {
  const { t } = useTranslation();
  const resolvedEditText = editText || t("common.edit");
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-5 sm:space-y-6">
        {children}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4 border-t border-gray-200">
          {showEditButton && onEdit && (
            <button
              onClick={onEdit}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {resolvedEditText}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Form Field Components
export const FormField = ({
  label,
  required = false,
  children,
  error = null,
  className = "",
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export const FormInput = ({
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  className = "",
  ...props
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={`block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  );
};

export const FormSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  required = false,
  className = "",
  searchable = false,
  disabled = false,
  error = false,
  ...props
}) => {
  const handleChange = (selectedValue) => {
    const event = {
      target: {
        value: selectedValue,
        name: props.name || "",
      },
    };
    onChange(event);
  };

  return (
    <Dropdown
      value={value}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      required={required}
      className={className}
      searchable={searchable}
      disabled={disabled}
      error={error}
      {...props}
    />
  );
};

export const FormTextarea = ({
  value,
  onChange,
  rows = 3,
  placeholder = "",
  required = false,
  className = "",
  ...props
}) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      required={required}
      className={`block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  );
};

// Detail Display Components
export const DetailField = ({ label, value, className = "" }) => {
  return (
    <div className={`${className}`}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "N/A"}</dd>
    </div>
  );
};

export const DetailGrid = ({ children, cols = 2, className = "" }) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[cols]} gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default Modal;
